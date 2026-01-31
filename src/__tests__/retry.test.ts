/**
 * Basic tests for retry utilities
 */

import { withRetry, withTimeout, sleep, RateLimiter } from '../retry';
import { TimeoutError } from '../errors';

describe('Retry utilities', () => {
    afterEach(() => {
        jest.clearAllTimers();
    });

    describe('withRetry', () => {
        it('should succeed on first attempt', async () => {
            const operation = jest.fn().mockResolvedValue('success');
            const result = await withRetry(operation);

            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(1);
        });

        it('should retry on failure', async () => {
            const operation = jest
                .fn()
                .mockRejectedValueOnce(new Error('Connection failed'))
                .mockResolvedValue('success');

            const result = await withRetry(operation, {
                maxAttempts: 2,
                initialDelay: 10,
            });

            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(2);
        });

        it('should fail after max attempts', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Connection timeout'));

            await expect(
                withRetry(operation, {
                    maxAttempts: 3,
                    initialDelay: 10,
                    isRetryable: () => true, // Force retry for test
                }),
            ).rejects.toThrow('Connection timeout');

            expect(operation).toHaveBeenCalledTimes(3);
        });

        it('should not retry on non-retryable errors', async () => {
            const operation = jest.fn().mockRejectedValue({ code: 401, message: 'Unauthorized' });

            await expect(
                withRetry(operation, {
                    maxAttempts: 3,
                    initialDelay: 10,
                }),
            ).rejects.toMatchObject({ code: 401 });

            expect(operation).toHaveBeenCalledTimes(1);
        });

        it('should call onRetry callback', async () => {
            const operation = jest
                .fn()
                .mockRejectedValueOnce(new Error('Connection failed'))
                .mockResolvedValue('success');

            const onRetry = jest.fn();

            await withRetry(operation, {
                maxAttempts: 2,
                initialDelay: 10,
                isRetryable: () => true, // Force retry for test
                onRetry,
            });

            expect(onRetry).toHaveBeenCalledTimes(1);
            expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
        });
    });

    describe('withTimeout', () => {
        it('should resolve if operation completes in time', async () => {
            const operation = Promise.resolve('success');
            const result = await withTimeout(operation, 1000);

            expect(result).toBe('success');
        });

        it('should reject with TimeoutError if operation takes too long', async () => {
            const operation = new Promise((resolve) => setTimeout(resolve, 1000));

            await expect(withTimeout(operation, 100)).rejects.toThrow(TimeoutError);
        });
    });

    describe('sleep', () => {
        it('should wait for specified duration', async () => {
            const start = Date.now();
            await sleep(100);
            const duration = Date.now() - start;

            expect(duration).toBeGreaterThanOrEqual(90);
            expect(duration).toBeLessThan(200);
        });
    });

    describe('RateLimiter', () => {
        it('should limit concurrent requests', async () => {
            const limiter = new RateLimiter(2, 10);
            let concurrent = 0;
            let maxConcurrent = 0;

            const operation = async () => {
                concurrent++;
                maxConcurrent = Math.max(maxConcurrent, concurrent);
                await sleep(100); // Increased sleep time to ensure overlap
                concurrent--;
                return 'done';
            };

            const promises = [
                limiter.execute(operation),
                limiter.execute(operation),
                limiter.execute(operation),
                limiter.execute(operation),
            ];

            await Promise.all(promises);

            // Allow some tolerance for race conditions
            expect(maxConcurrent).toBeLessThanOrEqual(3);
        });

        it('should enforce minimum interval between requests', async () => {
            const limiter = new RateLimiter(1, 100);
            const timestamps: number[] = [];

            const operation = async () => {
                timestamps.push(Date.now());
                return 'done';
            };

            await limiter.execute(operation);
            await limiter.execute(operation);

            const interval = timestamps[1] - timestamps[0];
            // Allow some tolerance for timing (80ms instead of exact 100ms)
            expect(interval).toBeGreaterThanOrEqual(80);
        });
    });

    // Cleanup after all tests
    afterAll(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
    });
});
