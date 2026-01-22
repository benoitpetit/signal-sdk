/**
 * Additional tests for errors.ts
 * Tests all error classes and their properties
 */

import {
    SignalError,
    ConnectionError,
    AuthenticationError,
    RateLimitError,
    ValidationError,
    TimeoutError,
    GroupError,
    MessageError
} from '../errors';

describe('Error Classes Additional Tests', () => {
    describe('SignalError', () => {
        test('should create basic SignalError', () => {
            const error = new SignalError('Test error');

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(SignalError);
            expect(error.message).toBe('Test error');
            expect(error.name).toBe('SignalError');
            expect(error.code).toBeUndefined();
        });

        test('should create SignalError with code', () => {
            const error = new SignalError('Test error', 'TEST_CODE');

            expect(error.message).toBe('Test error');
            expect(error.code).toBe('TEST_CODE');
        });

        test('should have proper prototype chain', () => {
            const error = new SignalError('Test');

            expect(error instanceof SignalError).toBe(true);
            expect(error instanceof Error).toBe(true);
            expect(Object.getPrototypeOf(error)).toBe(SignalError.prototype);
        });
    });

    describe('ConnectionError', () => {
        test('should create ConnectionError', () => {
            const error = new ConnectionError('Connection failed');

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(SignalError);
            expect(error).toBeInstanceOf(ConnectionError);
            expect(error.message).toBe('Connection failed');
            expect(error.name).toBe('ConnectionError');
            expect(error.code).toBe('CONNECTION_ERROR');
        });

        test('should have proper prototype chain', () => {
            const error = new ConnectionError('Test');

            expect(error instanceof ConnectionError).toBe(true);
            expect(error instanceof SignalError).toBe(true);
            expect(error instanceof Error).toBe(true);
        });
    });

    describe('AuthenticationError', () => {
        test('should create AuthenticationError', () => {
            const error = new AuthenticationError('Authentication failed');

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(SignalError);
            expect(error).toBeInstanceOf(AuthenticationError);
            expect(error.message).toBe('Authentication failed');
            expect(error.name).toBe('AuthenticationError');
            expect(error.code).toBe('AUTH_ERROR');
        });

        test('should have proper prototype chain', () => {
            const error = new AuthenticationError('Test');

            expect(error instanceof AuthenticationError).toBe(true);
            expect(error instanceof SignalError).toBe(true);
        });
    });

    describe('RateLimitError', () => {
        test('should create RateLimitError without retry info', () => {
            const error = new RateLimitError('Rate limit exceeded');

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(SignalError);
            expect(error).toBeInstanceOf(RateLimitError);
            expect(error.message).toBe('Rate limit exceeded');
            expect(error.name).toBe('RateLimitError');
            expect(error.code).toBe('RATE_LIMIT');
            expect(error.retryAfter).toBeUndefined();
            expect(error.challenge).toBeUndefined();
        });

        test('should create RateLimitError with retryAfter', () => {
            const error = new RateLimitError('Rate limit exceeded', 60);

            expect(error.message).toBe('Rate limit exceeded');
            expect(error.retryAfter).toBe(60);
            expect(error.challenge).toBeUndefined();
        });

        test('should create RateLimitError with challenge', () => {
            const error = new RateLimitError('Rate limit exceeded', 60, 'challenge-token');

            expect(error.message).toBe('Rate limit exceeded');
            expect(error.retryAfter).toBe(60);
            expect(error.challenge).toBe('challenge-token');
        });

        test('should have proper prototype chain', () => {
            const error = new RateLimitError('Test');

            expect(error instanceof RateLimitError).toBe(true);
            expect(error instanceof SignalError).toBe(true);
        });
    });

    describe('ValidationError', () => {
        test('should create ValidationError without field', () => {
            const error = new ValidationError('Invalid input');

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(SignalError);
            expect(error).toBeInstanceOf(ValidationError);
            expect(error.message).toBe('Invalid input');
            expect(error.name).toBe('ValidationError');
            expect(error.code).toBe('VALIDATION_ERROR');
            expect(error.field).toBeUndefined();
        });

        test('should create ValidationError with field', () => {
            const error = new ValidationError('Invalid phone number', 'phoneNumber');

            expect(error.message).toBe('Invalid phone number');
            expect(error.field).toBe('phoneNumber');
        });

        test('should have proper prototype chain', () => {
            const error = new ValidationError('Test');

            expect(error instanceof ValidationError).toBe(true);
            expect(error instanceof SignalError).toBe(true);
        });
    });

    describe('TimeoutError', () => {
        test('should create TimeoutError with default message', () => {
            const error = new TimeoutError();

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(SignalError);
            expect(error).toBeInstanceOf(TimeoutError);
            expect(error.message).toBe('Operation timed out');
            expect(error.name).toBe('TimeoutError');
            expect(error.code).toBe('TIMEOUT');
        });

        test('should create TimeoutError with custom message', () => {
            const error = new TimeoutError('Request timed out after 30s');

            expect(error.message).toBe('Request timed out after 30s');
        });

        test('should have proper prototype chain', () => {
            const error = new TimeoutError();

            expect(error instanceof TimeoutError).toBe(true);
            expect(error instanceof SignalError).toBe(true);
        });
    });

    describe('GroupError', () => {
        test('should create GroupError', () => {
            const error = new GroupError('Group not found');

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(SignalError);
            expect(error).toBeInstanceOf(GroupError);
            expect(error.message).toBe('Group not found');
            expect(error.name).toBe('GroupError');
            expect(error.code).toBe('GROUP_ERROR');
        });

        test('should have proper prototype chain', () => {
            const error = new GroupError('Test');

            expect(error instanceof GroupError).toBe(true);
            expect(error instanceof SignalError).toBe(true);
        });
    });

    describe('MessageError', () => {
        test('should create MessageError', () => {
            const error = new MessageError('Failed to send message');

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(SignalError);
            expect(error).toBeInstanceOf(MessageError);
            expect(error.message).toBe('Failed to send message');
            expect(error.name).toBe('MessageError');
            expect(error.code).toBe('MESSAGE_ERROR');
        });

        test('should have proper prototype chain', () => {
            const error = new MessageError('Test');

            expect(error instanceof MessageError).toBe(true);
            expect(error instanceof SignalError).toBe(true);
        });
    });

    describe('Error Instanceof Checks', () => {
        test('should correctly identify error types', () => {
            const connection = new ConnectionError('test');
            const auth = new AuthenticationError('test');
            const rateLimit = new RateLimitError('test');
            const validation = new ValidationError('test');
            const timeout = new TimeoutError('test');
            const group = new GroupError('test');
            const message = new MessageError('test');

            // Each should be instance of itself
            expect(connection instanceof ConnectionError).toBe(true);
            expect(auth instanceof AuthenticationError).toBe(true);
            expect(rateLimit instanceof RateLimitError).toBe(true);
            expect(validation instanceof ValidationError).toBe(true);
            expect(timeout instanceof TimeoutError).toBe(true);
            expect(group instanceof GroupError).toBe(true);
            expect(message instanceof MessageError).toBe(true);

            // All should be instances of SignalError
            expect(connection instanceof SignalError).toBe(true);
            expect(auth instanceof SignalError).toBe(true);
            expect(rateLimit instanceof SignalError).toBe(true);
            expect(validation instanceof SignalError).toBe(true);
            expect(timeout instanceof SignalError).toBe(true);
            expect(group instanceof SignalError).toBe(true);
            expect(message instanceof SignalError).toBe(true);

            // All should be instances of Error
            expect(connection instanceof Error).toBe(true);
            expect(auth instanceof Error).toBe(true);
            expect(rateLimit instanceof Error).toBe(true);
            expect(validation instanceof Error).toBe(true);
            expect(timeout instanceof Error).toBe(true);
            expect(group instanceof Error).toBe(true);
            expect(message instanceof Error).toBe(true);
        });

        test('should not confuse different error types', () => {
            const connection = new ConnectionError('test');

            expect(connection instanceof AuthenticationError).toBe(false);
            expect(connection instanceof RateLimitError).toBe(false);
            expect(connection instanceof ValidationError).toBe(false);
            expect(connection instanceof TimeoutError).toBe(false);
            expect(connection instanceof GroupError).toBe(false);
            expect(connection instanceof MessageError).toBe(false);
        });
    });

    describe('Error Stack Traces', () => {
        test('should have stack traces', () => {
            const error = new ConnectionError('Test error');

            expect(error.stack).toBeDefined();
            expect(typeof error.stack).toBe('string');
            expect(error.stack).toContain('ConnectionError');
        });

        test('should have meaningful stack traces for all error types', () => {
            const errors = [
                new SignalError('test'),
                new ConnectionError('test'),
                new AuthenticationError('test'),
                new RateLimitError('test'),
                new ValidationError('test'),
                new TimeoutError('test'),
                new GroupError('test'),
                new MessageError('test')
            ];

            errors.forEach(error => {
                expect(error.stack).toBeDefined();
                expect(error.stack?.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Error Serialization', () => {
        test('should serialize to JSON with custom properties', () => {
            const rateLimit = new RateLimitError('Rate limited', 60, 'challenge');
            const validation = new ValidationError('Invalid', 'testField');

            // These errors have additional properties
            expect(rateLimit.retryAfter).toBe(60);
            expect(rateLimit.challenge).toBe('challenge');
            expect(validation.field).toBe('testField');
        });

        test('should have toString method', () => {
            const error = new ConnectionError('Connection failed');

            expect(error.toString()).toContain('ConnectionError');
            expect(error.toString()).toContain('Connection failed');
        });
    });

    describe('Error Throwing and Catching', () => {
        test('should be catchable in try-catch', () => {
            try {
                throw new ConnectionError('Test');
            } catch (error) {
                expect(error).toBeInstanceOf(ConnectionError);
                expect(error).toBeInstanceOf(SignalError);
                expect(error).toBeInstanceOf(Error);
            }
        });

        test('should work with instanceof in catch', () => {
            try {
                throw new ValidationError('Invalid input', 'field');
            } catch (error) {
                if (error instanceof ValidationError) {
                    expect(error.field).toBe('field');
                    expect(error.code).toBe('VALIDATION_ERROR');
                } else {
                    fail('Should be ValidationError');
                }
            }
        });
    });
});
