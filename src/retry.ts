/**
 * Retry utilities with exponential backoff
 * Provides robust retry mechanisms for operations
 */

import { TimeoutError } from './errors';

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
    isRetryable?: (error: any) => boolean;
    /** Callback for each retry attempt */
    onRetry?: (attempt: number, error: any) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    timeout: 60000,
    isRetryable: (error: any) => {
        // Retry on connection errors, timeouts, and certain server errors
        if (!error) return false;
        
        const errorMessage = error.message?.toLowerCase() || '';
        const isConnectionError = errorMessage.includes('connection') ||
                                 errorMessage.includes('timeout') ||
                                 errorMessage.includes('econnrefused') ||
                                 errorMessage.includes('econnreset');
        
        const isServerError = error.code === 500 || error.code === 502 || error.code === 503;
        
        // Don't retry on authentication or validation errors
        const isClientError = error.code === 401 || error.code === 403 || error.code === 400;
        
        return (isConnectionError || isServerError) && !isClientError;
    },
    onRetry: () => {}
};

/**
 * Executes an operation with retry logic and exponential backoff
 * @param operation Function to execute
 * @param options Retry configuration options
 * @returns Result of the operation
 */
export async function withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: any;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
        try {
            // Execute with timeout
            const result = await withTimeout(operation(), config.timeout);
            return result;
        } catch (error) {
            lastError = error;
            
            // Check if we should retry
            const shouldRetry = attempt < config.maxAttempts && config.isRetryable(error);
            
            if (!shouldRetry) {
                throw error;
            }
            
            // Calculate delay with exponential backoff
            const delay = Math.min(
                config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1),
                config.maxDelay
            );
            
            // Notify about retry
            config.onRetry(attempt, error);
            
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
export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            setTimeout(() => {
                reject(new TimeoutError(`Operation timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        })
    ]);
}

/**
 * Sleep for a specified duration
 * @param ms Duration in milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Rate limiter to prevent exceeding API limits
 */
export class RateLimiter {
    private queue: Array<() => void> = [];
    private activeRequests = 0;
    
    constructor(
        private maxConcurrent: number = 5,
        private minInterval: number = 100
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
        
        return new Promise(resolve => {
            this.queue.push(() => {
                this.activeRequests++;
                resolve();
            });
        });
    }
}
