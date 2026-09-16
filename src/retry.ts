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
    /** Whether to apply jitter to retry delays (defaults to true). Prevents retry storms. */
    jitter?: boolean;
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
    jitter: true,
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
            } else if (config.jitter) {
                // Apply jitter to decorrelate retry bursts from concurrent clients.
                // The effective delay stays within [50%, 100%] of the computed backoff.
                delay = Math.round(delay * (0.5 + Math.random() * 0.5));
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

export interface CircuitBreakerOptions {
    /** Number of consecutive failures before the circuit opens (default: 5) */
    failureThreshold?: number;
    /** Time in milliseconds before an open circuit transitions to half-open (default: 30000) */
    resetTimeoutMs?: number;
    /** Max number of probe attempts allowed while half-open (default: 1) */
    halfOpenMaxAttempts?: number;
    /** Callback when the circuit changes state */
    onStateChange?: (state: CircuitBreakerState, previousState: CircuitBreakerState) => void;
}

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

/**
 * Circuit breaker to fail fast when a downstream service is unavailable.
 *
 * States:
 * - `closed`: requests flow normally; consecutive failures are counted.
 * - `open`: requests are rejected immediately until `resetTimeoutMs` has elapsed.
 * - `half-open`: a limited number of probe requests are allowed through;
 *   a success closes the circuit, a failure re-opens it.
 */
export class CircuitBreaker {
    private state: CircuitBreakerState = 'closed';
    private consecutiveFailures = 0;
    private openedAt = 0;
    private halfOpenAttempts = 0;

    private readonly failureThreshold: number;
    private readonly resetTimeoutMs: number;
    private readonly halfOpenMaxAttempts: number;
    private readonly onStateChange?: (state: CircuitBreakerState, previousState: CircuitBreakerState) => void;

    constructor(options: CircuitBreakerOptions = {}) {
        this.failureThreshold = options.failureThreshold ?? 5;
        this.resetTimeoutMs = options.resetTimeoutMs ?? 30000;
        this.halfOpenMaxAttempts = options.halfOpenMaxAttempts ?? 1;
        this.onStateChange = options.onStateChange;
    }

    getState(): CircuitBreakerState {
        if (this.state === 'open' && Date.now() - this.openedAt >= this.resetTimeoutMs) {
            this.transitionTo('half-open');
        }
        return this.state;
    }

    getConsecutiveFailures(): number {
        return this.consecutiveFailures;
    }

    private transitionTo(next: CircuitBreakerState): void {
        if (this.state === next) return;
        const previous = this.state;
        this.state = next;
        if (next === 'half-open') {
            this.halfOpenAttempts = 0;
        }
        if (next === 'closed') {
            this.consecutiveFailures = 0;
        }
        this.onStateChange?.(next, previous);
    }

    /**
     * Execute an operation through the circuit breaker.
     * @param operation Function to execute
     * @throws Error when the circuit is open
     */
    async execute<T>(operation: () => Promise<T>): Promise<T> {
        const currentState = this.getState();

        if (currentState === 'open') {
            throw new Error(
                `Circuit breaker is open. Failing fast. Retry in ${Math.max(0, this.resetTimeoutMs - (Date.now() - this.openedAt))}ms.`,
            );
        }

        if (currentState === 'half-open') {
            if (this.halfOpenAttempts >= this.halfOpenMaxAttempts) {
                throw new Error('Circuit breaker is half-open and probe limit reached.');
            }
            this.halfOpenAttempts++;
        }

        try {
            const result = await operation();
            this.recordSuccess();
            return result;
        } catch (error) {
            this.recordFailure();
            throw error;
        }
    }

    private recordSuccess(): void {
        this.consecutiveFailures = 0;
        if (this.state === 'half-open') {
            this.transitionTo('closed');
        }
    }

    private recordFailure(): void {
        this.consecutiveFailures++;
        if (this.state === 'half-open') {
            this.openedAt = Date.now();
            this.transitionTo('open');
            return;
        }
        if (this.state === 'closed' && this.consecutiveFailures >= this.failureThreshold) {
            this.openedAt = Date.now();
            this.transitionTo('open');
        }
    }

    /** Manually reset the circuit breaker to the closed state. */
    reset(): void {
        this.consecutiveFailures = 0;
        this.halfOpenAttempts = 0;
        this.transitionTo('closed');
    }
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

    /** Current number of requests waiting for a slot. */
    getQueueDepth(): number {
        return this.queue.length;
    }

    /** Current number of in-flight requests. */
    getActiveRequests(): number {
        return this.activeRequests;
    }

    /** Maximum number of concurrent requests allowed. */
    getMaxConcurrent(): number {
        return this.maxConcurrent;
    }
}
