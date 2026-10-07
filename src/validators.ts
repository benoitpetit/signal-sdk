/**
 * Input validation utilities for Signal SDK
 * Provides strict validation for all inputs
 */

import { ValidationError } from './errors';

/**
 * Validates a phone number format (E.164)
 * @param phoneNumber Phone number to validate
 * @throws ValidationError if invalid
 */
export function validatePhoneNumber(phoneNumber: string): void {
    if (!phoneNumber) {
        throw new ValidationError('Phone number is required', 'phoneNumber');
    }

    if (typeof phoneNumber !== 'string') {
        throw new ValidationError('Phone number must be a string', 'phoneNumber');
    }

    // E.164 format: + followed by 1-15 digits
    const e164Regex = /^\+[1-9]\d{0,14}$/;
    if (!e164Regex.test(phoneNumber)) {
        throw new ValidationError('Phone number must be in E.164 format (e.g., +33123456789)', 'phoneNumber');
    }
}

/**
 * Returns true when a value can identify a local signal-cli account.
 * Account identifiers are E.164 phone numbers or Signal UUIDs.
 */
export function isAccountIdentifier(value: string): boolean {
    return /^\+[1-9]\d{0,14}$/.test(value) || /^(PNI:)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Validates a signal-cli account identifier.
 */
export function validateAccountIdentifier(account: string): void {
    if (!account || typeof account !== 'string' || !isAccountIdentifier(account)) {
        throw new ValidationError('Account must be an E.164 phone number or Signal UUID', 'account');
    }
}

/**
 * Validates a group ID format
 * @param groupId Group ID to validate
 * @throws ValidationError if invalid
 */
export function validateGroupId(groupId: string): void {
    if (!groupId) {
        throw new ValidationError('Group ID is required', 'groupId');
    }

    if (typeof groupId !== 'string') {
        throw new ValidationError('Group ID must be a string', 'groupId');
    }
}

/**
 * Validates a recipient (phone number, UUID, or username)
 * @param recipient Recipient to validate
 * @throws ValidationError if invalid
 */
export function validateRecipient(recipient: string): void {
    if (!recipient) {
        throw new ValidationError('Recipient is required', 'recipient');
    }

    if (typeof recipient !== 'string') {
        throw new ValidationError('Recipient must be a string', 'recipient');
    }

    // Check if it's a username (starts with u:)
    if (recipient.startsWith('u:')) {
        validateUsername(recipient);
        return;
    }

    // Check if it's a UUID (PNI: prefix or plain UUID)
    const uuidRegex = /^(PNI:)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(recipient)) {
        return;
    }

    // Otherwise, validate as phone number
    validatePhoneNumber(recipient);
}

/**
 * Validates a Signal username (u:username.format)
 * @param username Username to validate
 * @throws ValidationError if invalid
 */
export function validateUsername(username: string): void {
    if (!username) {
        throw new ValidationError('Username is required', 'username');
    }

    if (typeof username !== 'string') {
        throw new ValidationError('Username must be a string', 'username');
    }

    // Username format: u:username.000 or u:username.discriminator
    const usernameRegex = /^u:[a-zA-Z0-9._-]{3,50}$/;
    if (!usernameRegex.test(username)) {
        throw new ValidationError('Username must be in format u:username.000', 'username');
    }
}

/**
 * Validates a message text
 * @param message Message to validate
 * @param maxLength Maximum message length
 * @throws ValidationError if invalid
 */
export function validateMessage(message: string, maxLength: number = 10000): void {
    if (message === undefined || message === null) {
        throw new ValidationError('Message is required', 'message');
    }

    if (typeof message !== 'string') {
        throw new ValidationError('Message must be a string', 'message');
    }

    if (message.length > maxLength) {
        throw new ValidationError(`Message exceeds maximum length of ${maxLength} characters`, 'message');
    }
}

/**
 * Validates file attachments
 * @param attachments Array of attachment paths
 * @throws ValidationError if invalid
 */
export function validateAttachments(attachments: string[]): void {
    if (!Array.isArray(attachments)) {
        throw new ValidationError('Attachments must be an array', 'attachments');
    }

    for (const attachment of attachments) {
        if (typeof attachment !== 'string') {
            throw new ValidationError('Each attachment must be a file path string', 'attachments');
        }

        if (attachment.length === 0) {
            throw new ValidationError('Attachment path cannot be empty', 'attachments');
        }
    }
}

/**
 * Base64url variant used by BlurHash, as accepted by signal-cli v0.14.9.
 */
const BLURHASH_DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~';

/** signal-cli's own dimension syntax: 'WIDTHxHEIGHT', both strictly positive. */
const ATTACHMENT_DIMENSION_PATTERN = /^([1-9]\d*)x([1-9]\d*)$/;

/**
 * Validates per-attachment dimensions (signal-cli v0.14.9).
 *
 * The array is positional against the attachment list: an empty string skips that
 * attachment and leaves its dimensions to signal-cli's automatic detection.
 *
 * @param dimensions Array of 'WIDTHxHEIGHT' strings, with '' to skip one
 * @param attachmentCount Number of attachments the array applies to
 * @throws ValidationError if invalid
 */
export function validateAttachmentDimensions(dimensions: string[], attachmentCount: number): void {
    if (!Array.isArray(dimensions)) {
        throw new ValidationError('Attachment dimensions must be an array', 'attachmentDimensions');
    }

    if (dimensions.length > attachmentCount) {
        throw new ValidationError(
            `Attachment dimensions must not be longer than the attachment list (${dimensions.length} > ${attachmentCount})`,
            'attachmentDimensions',
        );
    }

    for (const dimension of dimensions) {
        if (typeof dimension !== 'string') {
            throw new ValidationError('Each attachment dimension must be a string', 'attachmentDimensions');
        }

        if (dimension.length > 0 && !ATTACHMENT_DIMENSION_PATTERN.test(dimension)) {
            throw new ValidationError(
                `Invalid attachment dimensions syntax (${dimension}) expected 'WIDTHxHEIGHT'`,
                'attachmentDimensions',
            );
        }
    }
}

/**
 * Validates per-attachment BlurHashes (signal-cli v0.14.9).
 *
 * The array is positional against the attachment list: an empty string skips that
 * attachment. Mirrors signal-cli's own check, where the first character fixes the
 * expected length: 4 + 2 * (sizeFlag % 9 + 1) * (sizeFlag / 9 + 1).
 *
 * @param blurHashes Array of BlurHash strings, with '' to skip one
 * @param attachmentCount Number of attachments the array applies to
 * @throws ValidationError if invalid
 */
export function validateAttachmentBlurhash(blurHashes: string[], attachmentCount: number): void {
    if (!Array.isArray(blurHashes)) {
        throw new ValidationError('Attachment BlurHashes must be an array', 'attachmentBlurhash');
    }

    if (blurHashes.length > attachmentCount) {
        throw new ValidationError(
            `Attachment BlurHashes must not be longer than the attachment list (${blurHashes.length} > ${attachmentCount})`,
            'attachmentBlurhash',
        );
    }

    for (const blurHash of blurHashes) {
        if (typeof blurHash !== 'string') {
            throw new ValidationError('Each attachment BlurHash must be a string', 'attachmentBlurhash');
        }

        if (blurHash.length === 0) {
            continue;
        }

        if (!isValidBlurhash(blurHash)) {
            throw new ValidationError(`Invalid attachment BlurHash (${blurHash})`, 'attachmentBlurhash');
        }
    }
}

/**
 * Returns true when a string is a structurally valid BlurHash.
 * The first character encodes the component count, which fixes the total length.
 */
function isValidBlurhash(blurHash: string): boolean {
    if (blurHash.length < 6) {
        return false;
    }

    const sizeFlag = BLURHASH_DIGITS.indexOf(blurHash.charAt(0));
    if (sizeFlag < 0) {
        return false;
    }

    return blurHash.length === 4 + 2 * ((sizeFlag % 9) + 1) * (Math.floor(sizeFlag / 9) + 1);
}

/**
 * Validates a Recovery Key (signal-cli v0.14.9): the 64-character key shown by Signal Android.
 * @throws ValidationError if invalid
 */
export function validateRecoveryKey(recoveryKey: string): void {
    if (typeof recoveryKey !== 'string' || !/^[0-9a-fA-F]{64}$/.test(recoveryKey)) {
        throw new ValidationError('Recovery key must be 64 hexadecimal characters', 'recoveryKey');
    }
}

/**
 * Validates a TOTP token (signal-cli v0.14.9): six digits.
 * @throws ValidationError if invalid
 */
export function validateTotpToken(totp: string): void {
    if (typeof totp !== 'string' || !/^\d{6}$/.test(totp)) {
        throw new ValidationError('TOTP token must be six digits', 'totp');
    }
}

/**
 * Validates a timestamp
 * @param timestamp Timestamp to validate
 * @throws ValidationError if invalid
 */
export function validateTimestamp(timestamp: number): void {
    if (typeof timestamp !== 'number') {
        throw new ValidationError('Timestamp must be a number', 'timestamp');
    }

    if (timestamp <= 0) {
        throw new ValidationError('Timestamp must be positive', 'timestamp');
    }

    if (!Number.isFinite(timestamp)) {
        throw new ValidationError('Timestamp must be finite', 'timestamp');
    }
}

/**
 * Validates an emoji string
 * @param emoji Emoji to validate
 * @throws ValidationError if invalid
 */
export function validateEmoji(emoji: string): void {
    if (!emoji) {
        throw new ValidationError('Emoji is required', 'emoji');
    }

    if (typeof emoji !== 'string') {
        throw new ValidationError('Emoji must be a string', 'emoji');
    }

    // Basic emoji validation - should be a single grapheme cluster
    if (emoji.length === 0 || emoji.length > 10) {
        throw new ValidationError('Invalid emoji format', 'emoji');
    }
}

/**
 * Validates device ID
 * @param deviceId Device ID to validate
 * @throws ValidationError if invalid
 */
export function validateDeviceId(deviceId: number): void {
    if (typeof deviceId !== 'number') {
        throw new ValidationError('Device ID must be a number', 'deviceId');
    }

    if (!Number.isInteger(deviceId)) {
        throw new ValidationError('Device ID must be an integer', 'deviceId');
    }

    if (deviceId <= 0) {
        throw new ValidationError('Device ID must be positive', 'deviceId');
    }
}

/**
 * Validates a device name
 * @param deviceName Device name to validate
 * @throws ValidationError if invalid
 */
export function validateDeviceName(deviceName: string): void {
    if (deviceName === undefined || deviceName === null) {
        throw new ValidationError('Device name is required', 'deviceName');
    }

    if (typeof deviceName !== 'string') {
        throw new ValidationError('Device name must be a string', 'deviceName');
    }

    if (deviceName.length === 0 || deviceName.length > 200) {
        throw new ValidationError('Device name must be between 1 and 200 characters', 'deviceName');
    }

    validateSanitizedString(deviceName, 'deviceName');
}

/**
 * Sanitizes user input to prevent injection attacks
 * @param input Input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
        return '';
    }

    // Remove null bytes
    return input.replace(/\0/g, '');
}

/**
 * Validates a string to ensure it contains no shell-unsafe characters.
 * Used for inputs that might be passed to shell commands (like device names).
 *
 * @param input String to validate
 * @param fieldName Name of the field for error message
 * @throws ValidationError if input contains unsafe characters
 */
export function validateSanitizedString(input: string, fieldName: string = 'input'): void {
    if (!input) {
        throw new ValidationError(`${fieldName} is required`, fieldName);
    }

    // Reject characters that have special meaning in shells:
    // & | ; $ > < ` \ ! " ' ( ) [ ] { }
    // Also reject newlines and control characters
    const unsafeRegex = /[&|;$><`\\!"'()[\]{}\n\r\t]/;

    if (unsafeRegex.test(input)) {
        throw new ValidationError(
            `${fieldName} contains unsafe characters. Only alphanumeric and basic punctuation (.,-_) are allowed.`,
            fieldName,
        );
    }
}

/**
 * Validates that a string is a safe HTTP(S) URL.
 * Rejects non-http(s) protocols (file:, javascript:, data:, etc.) and credentials in URLs.
 *
 * @param input URL string to validate
 * @param fieldName Name of the field for error message
 * @throws ValidationError if invalid
 */
export function validateHttpUrl(input: string, fieldName: string = 'url'): void {
    if (!input) {
        throw new ValidationError(`${fieldName} is required`, fieldName);
    }

    if (typeof input !== 'string') {
        throw new ValidationError(`${fieldName} must be a string`, fieldName);
    }

    let parsed: URL;
    try {
        parsed = new URL(input);
    } catch {
        throw new ValidationError(`${fieldName} must be a valid URL`, fieldName);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new ValidationError(`${fieldName} must use the http or https protocol`, fieldName);
    }

    if (parsed.username || parsed.password) {
        throw new ValidationError(`${fieldName} must not contain credentials`, fieldName);
    }
}

/**
 * Validates an external HTTP(S) URL intended for server-side downloading.
 * Literal loopback, link-local and private-network addresses are rejected to
 * avoid turning URL-based convenience features into an SSRF primitive.
 *
 * Host names are not resolved here; deployments should still apply egress
 * controls to defend against DNS rebinding.
 */
export function validatePublicHttpUrl(input: string, fieldName: string = 'url'): void {
    validateHttpUrl(input, fieldName);

    const hostname = new URL(input).hostname.toLowerCase().replace(/^\[|\]$/g, '');
    const isPrivateIpv4 = /^(?:10\.|127\.|169\.254\.|192\.168\.|0\.)/.test(hostname)
        || /^172\.(?:1[6-9]|2\d|3[0-1])\./.test(hostname);
    const isPrivateIpv6 = hostname === '::1'
        || hostname.startsWith('fc')
        || hostname.startsWith('fd')
        || hostname.startsWith('fe80:');

    if (hostname === 'localhost' || hostname.endsWith('.localhost') || isPrivateIpv4 || isPrivateIpv6) {
        throw new ValidationError(`${fieldName} must not target a private network address`, fieldName);
    }
}

/**
 * Validates a byte size against a maximum limit.
 *
 * @param size Size in bytes
 * @param maxBytes Maximum allowed size in bytes
 * @param fieldName Name of the field for error message
 * @throws ValidationError if size exceeds the limit
 */
export function validateByteSize(size: number, maxBytes: number, fieldName: string = 'size'): void {
    if (typeof size !== 'number' || !Number.isFinite(size) || size < 0) {
        throw new ValidationError(`${fieldName} must be a non-negative finite number`, fieldName);
    }

    if (size > maxBytes) {
        throw new ValidationError(`${fieldName} exceeds the maximum allowed size of ${maxBytes} bytes`, fieldName);
    }
}
