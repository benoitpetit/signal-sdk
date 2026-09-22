/**
 * Resilience and runtime-safety tests:
 * - Circuit breaker
 * - Retry jitter
 * - Rate limiter introspection
 * - JSON-RPC falsy id handling
 * - Runtime metrics
 * - Logger redaction and structured context
 * - URL and byte-size validation
 */

import { CircuitBreaker, RateLimiter, withRetry } from '../retry';
import { SignalCli } from '../SignalCli';
import { validateHttpUrl, validateByteSize } from '../validators';
import { Logger, validateConfig } from '../config';

describe('Resilience and runtime safety', () => {
    describe('CircuitBreaker', () => {
        it('should allow requests when closed', async () => {
            const breaker = new CircuitBreaker();
            const result = await breaker.execute(() => Promise.resolve('ok'));

            expect(result).toBe('ok');
            expect(breaker.getState()).toBe('closed');
        });

        it('should open after consecutive failures and fail fast', async () => {
            const breaker = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 10000 });

            await expect(breaker.execute(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
            await expect(breaker.execute(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');

            expect(breaker.getState()).toBe('open');

            // Fail fast: the operation must not even run
            const operation = jest.fn().mockResolvedValue('ok');
            await expect(breaker.execute(operation)).rejects.toThrow('Circuit breaker is open');
            expect(operation).not.toHaveBeenCalled();
        });

        it('should transition to half-open after reset timeout and close on success', async () => {
            const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 50 });

            await expect(breaker.execute(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
            expect(breaker.getState()).toBe('open');

            await new Promise((resolve) => setTimeout(resolve, 70));

            expect(breaker.getState()).toBe('half-open');

            const result = await breaker.execute(() => Promise.resolve('recovered'));
            expect(result).toBe('recovered');
            expect(breaker.getState()).toBe('closed');
        });

        it('should re-open when a half-open probe fails', async () => {
            const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 50 });

            await expect(breaker.execute(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
            await new Promise((resolve) => setTimeout(resolve, 70));

            await expect(breaker.execute(() => Promise.reject(new Error('still down')))).rejects.toThrow(
                'still down',
            );
            expect(breaker.getState()).toBe('open');
        });

        it('should reset failure count on success', async () => {
            const breaker = new CircuitBreaker({ failureThreshold: 3 });

            await expect(breaker.execute(() => Promise.reject(new Error('x')))).rejects.toThrow('x');
            await breaker.execute(() => Promise.resolve('ok'));

            expect(breaker.getConsecutiveFailures()).toBe(0);
        });

        it('should notify on state changes', async () => {
            const onStateChange = jest.fn();
            const breaker = new CircuitBreaker({ failureThreshold: 1, onStateChange });

            await expect(breaker.execute(() => Promise.reject(new Error('x')))).rejects.toThrow('x');

            expect(onStateChange).toHaveBeenCalledWith('open', 'closed');
        });

        it('should reset manually', async () => {
            const breaker = new CircuitBreaker({ failureThreshold: 1 });

            await expect(breaker.execute(() => Promise.reject(new Error('x')))).rejects.toThrow('x');
            expect(breaker.getState()).toBe('open');

            breaker.reset();
            expect(breaker.getState()).toBe('closed');
            expect(breaker.getConsecutiveFailures()).toBe(0);
        });
    });

    describe('withRetry jitter', () => {
        it('should still retry successfully with jitter enabled (default)', async () => {
            const operation = jest
                .fn()
                .mockRejectedValueOnce(new Error('Connection failed'))
                .mockResolvedValue('success');

            const result = await withRetry(operation, { maxAttempts: 2, initialDelay: 10 });

            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(2);
        });

        it('should support disabling jitter', async () => {
            const operation = jest
                .fn()
                .mockRejectedValueOnce(new Error('Connection failed'))
                .mockResolvedValue('success');

            const result = await withRetry(operation, { maxAttempts: 2, initialDelay: 10, jitter: false });

            expect(result).toBe('success');
        });
    });

    describe('RateLimiter introspection', () => {
        it('should expose queue depth and active requests', async () => {
            const limiter = new RateLimiter(1, 10);
            let releaseFirst!: () => void;
            const blocker = new Promise<void>((resolve) => {
                releaseFirst = resolve;
            });

            const first = limiter.execute(() => blocker);
            const second = limiter.execute(() => Promise.resolve('done'));

            // Give the event loop a tick so the second request is queued
            await new Promise((resolve) => setImmediate(resolve));

            expect(limiter.getActiveRequests()).toBe(1);
            expect(limiter.getQueueDepth()).toBe(1);
            expect(limiter.getMaxConcurrent()).toBe(1);

            releaseFirst();
            await first;
            await second;

            expect(limiter.getQueueDepth()).toBe(0);
            expect(limiter.getActiveRequests()).toBe(0);
        });
    });

    describe('SignalCli JSON-RPC falsy id handling', () => {
        it('should resolve responses with id = 0', async () => {
            const cli = new SignalCli('+33123456789') as unknown as {
                requestPromises: Map<string, { resolve: (v: unknown) => void; reject: (e?: unknown) => void }>;
                processSingleRpcResponse: (response: unknown) => void;
            };

            const promise = new Promise((resolve, reject) => {
                cli.requestPromises.set('0', { resolve, reject });
            });

            cli.processSingleRpcResponse({ jsonrpc: '2.0', id: 0, result: 'ok' });

            await expect(promise).resolves.toBe('ok');
        });

        it('should still treat missing id as notification', () => {
            const cli = new SignalCli('+33123456789');
            const notificationHandler = jest.fn();
            cli.on('notification', notificationHandler);

            (
                cli as unknown as { processSingleRpcResponse: (response: unknown) => void }
            ).processSingleRpcResponse({ jsonrpc: '2.0', method: 'someEvent', params: {} });

            expect(notificationHandler).toHaveBeenCalled();
        });
    });

    describe('SignalCli metrics', () => {
        it('should expose initial metrics', () => {
            const cli = new SignalCli('+33123456789');
            const metrics = cli.getMetrics();

            expect(metrics).toMatchObject({
                requestsSent: 0,
                requestsSucceeded: 0,
                requestsFailed: 0,
                requestTimeouts: 0,
                reconnects: 0,
                averageLatencyMs: 0,
                queueDepth: 0,
                activeRequests: 0,
                circuitBreakerState: null,
            });
        });

        it('should reset metrics', () => {
            const cli = new SignalCli('+33123456789') as unknown as {
                metrics: { requestsSent: number };
                getMetrics: () => { requestsSent: number };
                resetMetrics: () => void;
            };

            cli.metrics.requestsSent = 42;
            cli.resetMetrics();

            expect(cli.getMetrics().requestsSent).toBe(0);
        });

        it('should report circuit breaker state when enabled', () => {
            const cli = new SignalCli('+33123456789', undefined, { circuitBreakerEnabled: true });
            expect(cli.getMetrics().circuitBreakerState).toBe('closed');
        });
    });

    describe('Circuit breaker configuration', () => {
        it('should accept circuit breaker options', () => {
            const config = validateConfig({
                circuitBreakerEnabled: true,
                circuitBreakerFailureThreshold: 3,
                circuitBreakerResetTimeout: 5000,
            });

            expect(config.circuitBreakerEnabled).toBe(true);
            expect(config.circuitBreakerFailureThreshold).toBe(3);
            expect(config.circuitBreakerResetTimeout).toBe(5000);
        });

        it('should default to disabled circuit breaker', () => {
            const config = validateConfig();

            expect(config.circuitBreakerEnabled).toBe(false);
            expect(config.circuitBreakerFailureThreshold).toBe(5);
            expect(config.circuitBreakerResetTimeout).toBe(30000);
        });

        it('should reject invalid circuit breaker threshold', () => {
            expect(() => validateConfig({ circuitBreakerFailureThreshold: 0 })).toThrow(
                'circuitBreakerFailureThreshold must be at least 1',
            );
        });

        it('should reject negative circuit breaker reset timeout', () => {
            expect(() => validateConfig({ circuitBreakerResetTimeout: -1 })).toThrow(
                'circuitBreakerResetTimeout must be non-negative',
            );
        });
    });

    describe('Logger redaction and context', () => {
        it('should redact phone numbers when enabled', () => {
            const spy = jest.spyOn(console, 'info').mockImplementation(() => {});
            const logger = new Logger({ redactSensitiveData: true });

            logger.info('Sending message to +33123456789');

            expect(spy).toHaveBeenCalledTimes(1);
            const output = spy.mock.calls[0][0] as string;
            expect(output).not.toContain('+33123456789');
            expect(output).toContain('+3');

            spy.mockRestore();
        });

        it('should not redact by default', () => {
            const spy = jest.spyOn(console, 'info').mockImplementation(() => {});
            const logger = new Logger();

            logger.info('Sending message to +33123456789');

            const output = spy.mock.calls[0][0] as string;
            expect(output).toContain('+33123456789');

            spy.mockRestore();
        });

        it('should include structured context from child loggers', () => {
            const spy = jest.spyOn(console, 'info').mockImplementation(() => {});
            const logger = new Logger({ context: { component: 'core' } });
            const child = logger.child({ account: '+33123456789' });

            child.info('hello');

            const output = spy.mock.calls[0][0] as string;
            expect(output).toContain('component=core');
            expect(output).toContain('account=+33123456789');

            spy.mockRestore();
        });
    });

    describe('validateHttpUrl', () => {
        it('should accept http and https URLs', () => {
            expect(() => validateHttpUrl('https://example.com/image.jpg')).not.toThrow();
            expect(() => validateHttpUrl('http://example.com/image.jpg')).not.toThrow();
        });

        it('should reject non-http protocols', () => {
            expect(() => validateHttpUrl('file:///etc/passwd')).toThrow('must use the http or https protocol');
            expect(() => validateHttpUrl('javascript:alert(1)')).toThrow();
            expect(() => validateHttpUrl('ftp://example.com/file')).toThrow('must use the http or https protocol');
        });

        it('should reject URLs with credentials', () => {
            expect(() => validateHttpUrl('https://user:pass@example.com/')).toThrow('must not contain credentials');
        });

        it('should reject invalid URLs', () => {
            expect(() => validateHttpUrl('not-a-url')).toThrow('must be a valid URL');
            expect(() => validateHttpUrl('')).toThrow('is required');
        });
    });

    describe('validateByteSize', () => {
        it('should accept sizes within the limit', () => {
            expect(() => validateByteSize(1024, 2048)).not.toThrow();
            expect(() => validateByteSize(0, 2048)).not.toThrow();
        });

        it('should reject sizes above the limit', () => {
            expect(() => validateByteSize(4096, 2048, 'payload')).toThrow(
                'payload exceeds the maximum allowed size of 2048 bytes',
            );
        });

        it('should reject invalid sizes', () => {
            expect(() => validateByteSize(-1, 2048)).toThrow('must be a non-negative finite number');
            expect(() => validateByteSize(NaN, 2048)).toThrow('must be a non-negative finite number');
        });
    });
});
