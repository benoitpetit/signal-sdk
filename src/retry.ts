/**
 * Retry utilities with exponential backoff
 * Provides robust retry mechanisms for operations
 */

import { TimeoutError } from './errors';

export type RetryableError = Error & { code?: number };

export interface RetryOptions {
    /** Maximum number of retry attempts */
    maxAttempts?: number;
    /** Initial delay in milliseconds */
    initialDelay?: number;
    /** Maximum delay in milliseconds */
    maxDelay?: number;
    /** Multiplier for exponential backoff */
    backoffMultiplier?: number;
    /** Timeout for each attempt in milliseconds */
    timeout?: number;
    /** Function to determine if error is retryable */
    isRetryable?: (error: RetryableError) => boolean;
    /** Callback for each retry attempt */
    onRetry?: (attempt: number, error: RetryableError, retryAfterMs?: number) => void;
    /** Whether retry is enabled (defaults to true) */
    enabled?: boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'enabled'>> & { enabled: boolean } = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    timeout: 60000,
    isRetryable: (error: RetryableError) => {
        // Retry on connection errors, timeouts, and certain server errors
        if (!error) return false;

        const errorMessage = error.message?.toLowerCase() || '';
        const isConnectionError =
            errorMessage.includes('connection') ||
            errorMessage.includes('timeout') ||
            errorMessage.includes('econnrefused') ||
            errorMessage.includes('econnreset');

        // signal-cli exit codes: 1=user error, 2=unexpected, 3=server/io, 4=untrusted key, 5=rate limit, 6=captcha rejected
        const isServerError = error.code === 500 || error.code === 502 || error.code === 503;
        const isRateLimitError = error.code === 5 || errorMessage.includes('rate limit');

        // Don't retry on authentication, validation, captcha errors
        const isClientError = error.code === 401 || error.code === 403 || error.code === 400 || error.code === 6;

        return (isConnectionError || isServerError || isRateLimitError) && !isClientError;
    },
    onRetry: () => {},
    enabled: true,
};

/**
 * Executes an operation with retry logic and exponential backoff
 * @param operation Function to execute
 * @param options Retry configuration options
 * @returns Result of the operation
 */
export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
    const config = { ...DEFAULT_RETRY_OPTIONS, ...options };

    if (!config.enabled) {
        return operation();
    }

    let lastError: RetryableError | undefined;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
        try {
            // Execute with timeout
            const result = await withTimeout(operation(), config.timeout);
            return result;
        } catch (error) {
            const retryableError = error as RetryableError;
            lastError = retryableError;

            // Check if we should retry
            const shouldRetry = attempt < config.maxAttempts && config.isRetryable(retryableError);

            if (!shouldRetry) {
                throw retryableError;
            }

            // Calculate delay with exponential backoff
            let delay = Math.min(
                config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1),
                config.maxDelay,
            );

            const retryAfterMs = (lastError as RetryableError & { retryAfter?: number })?.retryAfter;
            if (retryAfterMs && retryAfterMs > 0) {
                delay = Math.min(retryAfterMs, config.maxDelay);
            }

            // Notify about retry
            config.onRetry(attempt, lastError, retryAfterMs);

            // Wait before retrying
            await sleep(delay);
        }
    }

    throw lastError;
}

/**
 * Executes an operation with a timeout
 * @param promise Promise to execute
 * @param timeoutMs Timeout in milliseconds
 * @returns Result of the promise
 */
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | null = null;

    const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => {
            reject(new TimeoutError(`Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        // Use unref() to prevent this timer from keeping the process alive
        if (timeoutHandle.unref) {
            timeoutHandle.unref();
        }
    });

    try {
        const result = await Promise.race([promise, timeoutPromise]);
        // Clear the timeout if the promise resolves first
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
        }
        return result;
    } catch (error) {
        // Clear the timeout if the promise rejects
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
        }
        throw error;
    }
}

/**
 * Sleep for a specified duration
 * @param ms Duration in milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Rate limiter to prevent exceeding API limits
 */
export class RateLimiter {
    private queue: Array<() => void> = [];
    private activeRequests = 0;

    constructor(
        private maxConcurrent: number = 5,
        private minInterval: number = 100,
    ) {}

    /**
     * Execute an operation with rate limiting
     * @param operation Function to execute
     * @returns Result of the operation
     */
    async execute<T>(operation: () => Promise<T>): Promise<T> {
        // Wait for slot and reserve it
        await this.reserveSlot();

        try {
            const result = await operation();
            return result;
        } finally {
            // Wait minimum interval before allowing next request
            await sleep(this.minInterval);

            // Release slot
            this.activeRequests--;

            const next = this.queue.shift();
            if (next) {
                next();
            }
        }
    }

    private reserveSlot(): Promise<void> {
        if (this.activeRequests < this.maxConcurrent) {
            this.activeRequests++;
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            this.queue.push(() => {
                this.activeRequests++;
                resolve();
            });
        });
    }
}
