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
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(phoneNumber)) {
        throw new ValidationError(
            'Phone number must be in E.164 format (e.g., +33123456789)',
            'phoneNumber'
        );
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
        if (recipient.length < 3) {
            throw new ValidationError('Username is too short', 'recipient');
        }
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
        throw new ValidationError(
            `Message exceeds maximum length of ${maxLength} characters`,
            'message'
        );
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
