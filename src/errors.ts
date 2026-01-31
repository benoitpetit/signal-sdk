/**
 * Custom error classes for Signal SDK
 * Provides typed errors for better error handling
 */

export class SignalError extends Error {
    constructor(
        message: string,
        public code?: string,
    ) {
        super(message);
        this.name = 'SignalError';
        Object.setPrototypeOf(this, SignalError.prototype);
    }
}

export class ConnectionError extends SignalError {
    constructor(message: string) {
        super(message, 'CONNECTION_ERROR');
        this.name = 'ConnectionError';
        Object.setPrototypeOf(this, ConnectionError.prototype);
    }
}

export class AuthenticationError extends SignalError {
    constructor(message: string) {
        super(message, 'AUTH_ERROR');
        this.name = 'AuthenticationError';
        Object.setPrototypeOf(this, AuthenticationError.prototype);
    }
}

export class RateLimitError extends SignalError {
    constructor(
        message: string,
        public retryAfter?: number,
        public challenge?: string,
    ) {
        super(message, 'RATE_LIMIT');
        this.name = 'RateLimitError';
        Object.setPrototypeOf(this, RateLimitError.prototype);
    }
}

export class ValidationError extends SignalError {
    constructor(
        message: string,
        public field?: string,
    ) {
        super(message, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

export class TimeoutError extends SignalError {
    constructor(message: string = 'Operation timed out') {
        super(message, 'TIMEOUT');
        this.name = 'TimeoutError';
        Object.setPrototypeOf(this, TimeoutError.prototype);
    }
}

export class GroupError extends SignalError {
    constructor(message: string) {
        super(message, 'GROUP_ERROR');
        this.name = 'GroupError';
        Object.setPrototypeOf(this, GroupError.prototype);
    }
}

export class MessageError extends SignalError {
    constructor(message: string) {
        super(message, 'MESSAGE_ERROR');
        this.name = 'MessageError';
        Object.setPrototypeOf(this, MessageError.prototype);
    }
}
