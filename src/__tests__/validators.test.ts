/**
 * Basic tests for validators
 */

import {
    validatePhoneNumber,
    validateGroupId,
    validateRecipient,
    validateMessage,
    validateAttachments,
    validateTimestamp,
    validateEmoji,
    validateDeviceId,
    sanitizeInput,
} from '../validators';
import { ValidationError } from '../errors';

describe('Validators', () => {
    describe('validatePhoneNumber', () => {
        it('should accept valid E.164 phone numbers', () => {
            expect(() => validatePhoneNumber('+33123456789')).not.toThrow();
            expect(() => validatePhoneNumber('+1234567890')).not.toThrow();
            expect(() => validatePhoneNumber('+49123456789012')).not.toThrow();
        });

        it('should reject invalid phone numbers', () => {
            expect(() => validatePhoneNumber('123456789')).toThrow(ValidationError);
            expect(() => validatePhoneNumber('+0123456789')).toThrow(ValidationError);
            expect(() => validatePhoneNumber('invalid')).toThrow(ValidationError);
            expect(() => validatePhoneNumber('')).toThrow(ValidationError);
        });

        it('should reject non-string inputs', () => {
            expect(() => validatePhoneNumber(null as any)).toThrow(ValidationError);
            expect(() => validatePhoneNumber(undefined as any)).toThrow(ValidationError);
            expect(() => validatePhoneNumber(123 as any)).toThrow(ValidationError);
        });
    });

    describe('validateGroupId', () => {
        it('should accept non-empty strings', () => {
            expect(() => validateGroupId('abc123==')).not.toThrow();
            expect(() => validateGroupId('groupId')).not.toThrow();
        });

        it('should reject empty or invalid group IDs', () => {
            expect(() => validateGroupId('')).toThrow(ValidationError);
            expect(() => validateGroupId(null as any)).toThrow(ValidationError);
            expect(() => validateGroupId(undefined as any)).toThrow(ValidationError);
        });

        it('should reject non-string group IDs', () => {
            expect(() => validateGroupId(123 as any)).toThrow(ValidationError);
            expect(() => validateGroupId({} as any)).toThrow(ValidationError);
        });
    });

    describe('validateRecipient', () => {
        it('should accept valid phone numbers', () => {
            expect(() => validateRecipient('+33123456789')).not.toThrow();
        });

        it('should accept usernames', () => {
            expect(() => validateRecipient('u:username.001')).not.toThrow();
        });

        it('should accept UUIDs', () => {
            expect(() => validateRecipient('12345678-1234-1234-1234-123456789012')).not.toThrow();
            expect(() => validateRecipient('PNI:12345678-1234-1234-1234-123456789012')).not.toThrow();
        });

        it('should reject invalid recipients', () => {
            expect(() => validateRecipient('')).toThrow(ValidationError);
            expect(() => validateRecipient('u:')).toThrow(ValidationError);
        });

        it('should reject non-string recipients', () => {
            expect(() => validateRecipient(null as any)).toThrow(ValidationError);
            expect(() => validateRecipient(123 as any)).toThrow(ValidationError);
        });
    });

    describe('validateMessage', () => {
        it('should accept valid messages', () => {
            expect(() => validateMessage('Hello')).not.toThrow();
            expect(() => validateMessage('', 10)).not.toThrow();
        });

        it('should reject messages exceeding max length', () => {
            expect(() => validateMessage('Hello World', 5)).toThrow(ValidationError);
        });

        it('should reject non-string messages', () => {
            expect(() => validateMessage(null as any)).toThrow(ValidationError);
            expect(() => validateMessage(undefined as any)).toThrow(ValidationError);
            expect(() => validateMessage(123 as any)).toThrow(ValidationError);
        });
    });

    describe('validateAttachments', () => {
        it('should accept valid attachment arrays', () => {
            expect(() => validateAttachments(['file1.txt', 'file2.jpg'])).not.toThrow();
            expect(() => validateAttachments([])).not.toThrow();
        });

        it('should reject non-array inputs', () => {
            expect(() => validateAttachments('not-an-array' as any)).toThrow(ValidationError);
            expect(() => validateAttachments(null as any)).toThrow(ValidationError);
        });

        it('should reject non-string attachment paths', () => {
            expect(() => validateAttachments([123] as any)).toThrow(ValidationError);
            expect(() => validateAttachments([null] as any)).toThrow(ValidationError);
        });

        it('should reject empty attachment paths', () => {
            expect(() => validateAttachments([''])).toThrow(ValidationError);
            expect(() => validateAttachments(['file1.txt', ''])).toThrow(ValidationError);
        });
    });

    describe('validateTimestamp', () => {
        it('should accept valid timestamps', () => {
            expect(() => validateTimestamp(Date.now())).not.toThrow();
            expect(() => validateTimestamp(1234567890)).not.toThrow();
        });

        it('should reject invalid timestamps', () => {
            expect(() => validateTimestamp(0)).toThrow(ValidationError);
            expect(() => validateTimestamp(-1)).toThrow(ValidationError);
            expect(() => validateTimestamp(Infinity)).toThrow(ValidationError);
            expect(() => validateTimestamp('123' as any)).toThrow(ValidationError);
        });
    });

    describe('validateEmoji', () => {
        it('should accept valid emojis', () => {
            expect(() => validateEmoji('👍')).not.toThrow();
            expect(() => validateEmoji('❤️')).not.toThrow();
            expect(() => validateEmoji('😀')).not.toThrow();
        });

        it('should reject invalid emojis', () => {
            expect(() => validateEmoji('')).toThrow(ValidationError);
            expect(() => validateEmoji('this is too long')).toThrow(ValidationError);
        });

        it('should reject non-string emojis', () => {
            expect(() => validateEmoji(null as any)).toThrow(ValidationError);
            expect(() => validateEmoji(123 as any)).toThrow(ValidationError);
        });
    });

    describe('validateDeviceId', () => {
        it('should accept valid device IDs', () => {
            expect(() => validateDeviceId(1)).not.toThrow();
            expect(() => validateDeviceId(123)).not.toThrow();
        });

        it('should reject invalid device IDs', () => {
            expect(() => validateDeviceId(0)).toThrow(ValidationError);
            expect(() => validateDeviceId(-1)).toThrow(ValidationError);
            expect(() => validateDeviceId(1.5)).toThrow(ValidationError);
            expect(() => validateDeviceId('1' as any)).toThrow(ValidationError);
        });
    });

    describe('sanitizeInput', () => {
        it('should remove null bytes', () => {
            expect(sanitizeInput('hello\0world')).toBe('helloworld');
            expect(sanitizeInput('test\0\0test')).toBe('testtest');
        });

        it('should handle non-string inputs', () => {
            expect(sanitizeInput(null as any)).toBe('');
            expect(sanitizeInput(undefined as any)).toBe('');
            expect(sanitizeInput(123 as any)).toBe('');
        });

        it('should preserve normal strings', () => {
            expect(sanitizeInput('hello world')).toBe('hello world');
        });
    });
});
