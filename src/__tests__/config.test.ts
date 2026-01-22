/**
 * Additional tests for config.ts
 * Tests configuration validation and logger functionality
 */

import { validateConfig, Logger, DEFAULT_CONFIG } from '../config';

describe('Config Additional Tests', () => {
    describe('validateConfig', () => {
        test('should return default config when no user config provided', () => {
            const config = validateConfig();

            expect(config).toEqual(DEFAULT_CONFIG);
        });

        test('should merge user config with defaults', () => {
            const userConfig = {
                verbose: true,
                maxRetries: 5
            };

            const config = validateConfig(userConfig);

            expect(config.verbose).toBe(true);
            expect(config.maxRetries).toBe(5);
            expect(config.connectionTimeout).toBe(DEFAULT_CONFIG.connectionTimeout);
        });

        test('should throw error for negative connectionTimeout', () => {
            expect(() => validateConfig({ connectionTimeout: -1 }))
                .toThrow('connectionTimeout must be non-negative');
        });

        test('should throw error for negative requestTimeout', () => {
            expect(() => validateConfig({ requestTimeout: -100 }))
                .toThrow('requestTimeout must be non-negative');
        });

        test('should throw error for negative maxRetries', () => {
            expect(() => validateConfig({ maxRetries: -5 }))
                .toThrow('maxRetries must be non-negative');
        });

        test('should throw error for negative retryDelay', () => {
            expect(() => validateConfig({ retryDelay: -1000 }))
                .toThrow('retryDelay must be non-negative');
        });

        test('should throw error for maxConcurrentRequests less than 1', () => {
            expect(() => validateConfig({ maxConcurrentRequests: 0 }))
                .toThrow('maxConcurrentRequests must be at least 1');

            expect(() => validateConfig({ maxConcurrentRequests: -1 }))
                .toThrow('maxConcurrentRequests must be at least 1');
        });

        test('should throw error for negative minRequestInterval', () => {
            expect(() => validateConfig({ minRequestInterval: -50 }))
                .toThrow('minRequestInterval must be non-negative');
        });

        test('should accept all valid trustNewIdentities values', () => {
            expect(() => validateConfig({ trustNewIdentities: 'on-first-use' }))
                .not.toThrow();
            expect(() => validateConfig({ trustNewIdentities: 'always' }))
                .not.toThrow();
            expect(() => validateConfig({ trustNewIdentities: 'never' }))
                .not.toThrow();
        });

        test('should accept zero values for valid fields', () => {
            const config = validateConfig({
                connectionTimeout: 0,
                requestTimeout: 0,
                maxRetries: 0,
                retryDelay: 0,
                minRequestInterval: 0
            });

            expect(config.connectionTimeout).toBe(0);
            expect(config.requestTimeout).toBe(0);
            expect(config.maxRetries).toBe(0);
            expect(config.retryDelay).toBe(0);
            expect(config.minRequestInterval).toBe(0);
        });

        test('should handle all configuration options', () => {
            const fullConfig = {
                signalCliPath: '/custom/path/signal-cli',
                account: '+1234567890',
                connectionTimeout: 60000,
                requestTimeout: 120000,
                enableRetry: false,
                maxRetries: 10,
                retryDelay: 2000,
                verbose: true,
                logFile: '/var/log/signal.log',
                maxConcurrentRequests: 10,
                minRequestInterval: 200,
                autoReconnect: false,
                trustNewIdentities: 'never' as const,
                disableSendLog: true
            };

            const config = validateConfig(fullConfig);

            expect(config).toMatchObject(fullConfig);
        });
    });

    describe('Logger', () => {
        let logger: Logger;

        beforeEach(() => {
            logger = new Logger({
                level: 'debug',
                enableConsole: true,
                enableFile: false,
                includeTimestamp: true,
                includeLevel: true
            });
        });

        test('should create logger with default config', () => {
            const defaultLogger = new Logger();
            expect(defaultLogger).toBeDefined();
        });

        test('should log debug messages', () => {
            const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

            logger.debug('Test debug message');

            expect(consoleSpy).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Test debug message')
            );

            consoleSpy.mockRestore();
        });

        test('should log info messages', () => {
            const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

            logger.info('Test info message');

            expect(consoleSpy).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Test info message')
            );

            consoleSpy.mockRestore();
        });

        test('should log warn messages', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            logger.warn('Test warning message');

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('WARN')
            );

            consoleSpy.mockRestore();
        });

        test('should log error messages', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            logger.error('Test error message');

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('ERROR')
            );

            consoleSpy.mockRestore();
        });

        test('should include timestamp when configured', () => {
            const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

            logger.info('Timestamped message');

            expect(consoleSpy).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/)
            );

            consoleSpy.mockRestore();
        });

        test('should not log when console is disabled', () => {
            const consoleLogger = new Logger({
                level: 'info',
                enableConsole: false,
                enableFile: false,
                includeTimestamp: true,
                includeLevel: true
            });

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            consoleLogger.info('Should not appear in console');

            expect(consoleSpy).not.toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        test('should respect log level', () => {
            const infoLogger = new Logger({
                level: 'info',
                enableConsole: true,
                enableFile: false,
                includeTimestamp: false,
                includeLevel: true
            });

            const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
            const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();

            infoLogger.debug('Debug message'); // Should not log
            infoLogger.info('Info message');   // Should log

            expect(consoleDebugSpy).not.toHaveBeenCalled();
            expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
            expect(consoleInfoSpy).toHaveBeenCalledWith(
                expect.stringContaining('Info message')
            );

            consoleDebugSpy.mockRestore();
            consoleInfoSpy.mockRestore();
        });

        test('should log with additional data', () => {
            const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

            logger.info('Message with data', { key: 'value', number: 42 });

            expect(consoleSpy).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('key')
            );

            consoleSpy.mockRestore();
        });

        test('should handle error log level hierarchy', () => {
            const errorLogger = new Logger({
                level: 'error',
                enableConsole: true,
                enableFile: false,
                includeTimestamp: false,
                includeLevel: true
            });

            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            errorLogger.debug('Debug'); // Should not log
            errorLogger.info('Info');   // Should not log
            errorLogger.warn('Warn');   // Should not log
            errorLogger.error('Error'); // Should log

            expect(consoleLogSpy).not.toHaveBeenCalled();
            expect(consoleWarnSpy).not.toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

            consoleLogSpy.mockRestore();
            consoleWarnSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        });

        test('should format messages without timestamp', () => {
            const noTimestampLogger = new Logger({
                level: 'info',
                enableConsole: true,
                enableFile: false,
                includeTimestamp: false,
                includeLevel: true
            });

            const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

            noTimestampLogger.info('No timestamp');

            expect(consoleSpy).toHaveBeenCalled();
            const calls = consoleSpy.mock.calls[0][0];
            expect(calls).not.toMatch(/\[\d{4}-\d{2}-\d{2}T/);

            consoleSpy.mockRestore();
        });

        test('should format messages without level', () => {
            const noLevelLogger = new Logger({
                level: 'info',
                enableConsole: true,
                enableFile: false,
                includeTimestamp: false,
                includeLevel: false
            });

            const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

            noLevelLogger.info('No level');

            expect(consoleSpy).toHaveBeenCalled();
            const calls = consoleSpy.mock.calls[0][0];
            expect(calls).not.toContain('[INFO]');

            consoleSpy.mockRestore();
        });
    });

    describe('DEFAULT_CONFIG', () => {
        test('should have sensible defaults', () => {
            expect(DEFAULT_CONFIG.connectionTimeout).toBe(30000);
            expect(DEFAULT_CONFIG.requestTimeout).toBe(60000);
            expect(DEFAULT_CONFIG.enableRetry).toBe(true);
            expect(DEFAULT_CONFIG.maxRetries).toBe(3);
            expect(DEFAULT_CONFIG.retryDelay).toBe(1000);
            expect(DEFAULT_CONFIG.verbose).toBe(false);
            expect(DEFAULT_CONFIG.maxConcurrentRequests).toBe(5);
            expect(DEFAULT_CONFIG.minRequestInterval).toBe(100);
            expect(DEFAULT_CONFIG.autoReconnect).toBe(true);
            expect(DEFAULT_CONFIG.trustNewIdentities).toBe('on-first-use');
            expect(DEFAULT_CONFIG.disableSendLog).toBe(false);
        });

        test('should have empty strings for optional paths', () => {
            expect(DEFAULT_CONFIG.signalCliPath).toBe('');
            expect(DEFAULT_CONFIG.account).toBe('');
            expect(DEFAULT_CONFIG.logFile).toBe('');
        });
    });
});
