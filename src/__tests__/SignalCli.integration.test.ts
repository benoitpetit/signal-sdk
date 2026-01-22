/**
 * Integration tests for SignalCli
 * Tests complex scenarios and edge cases
 */

import { SignalCli } from '../SignalCli';
import { spawn } from 'child_process';
import { ValidationError } from '../errors';

jest.mock('child_process');

describe('SignalCli Integration Tests', () => {
    let signalCli: SignalCli;
    let mockProcess: any;

    beforeEach(() => {
        mockProcess = {
            stdout: {
                on: jest.fn(),
                once: jest.fn(),
            },
            stderr: {
                on: jest.fn(),
            },
            stdin: {
                write: jest.fn(),
            },
            on: jest.fn(),
            once: jest.fn(),
            kill: jest.fn(),
            killed: false,
        };

        const spawnMock = spawn as jest.MockedFunction<typeof spawn>;
        spawnMock.mockReturnValue(mockProcess);

        signalCli = new SignalCli('signal-cli', '+1234567890');
    });

    afterEach(() => {
        if (signalCli) {
            signalCli.disconnect();
        }
    });

    describe('Connection Lifecycle', () => {
        it('should handle multiple connect/disconnect cycles', async () => {
            mockProcess.stdout.once.mockImplementation((event: string, callback: () => void) => {
                if (event === 'data') callback();
            });

            await signalCli.connect();
            signalCli.disconnect();

            await signalCli.connect();
            signalCli.disconnect();

            expect(mockProcess.kill).toHaveBeenCalledTimes(2);
        });

        it('should handle graceful shutdown timeout', async () => {
            mockProcess.stdout.once.mockImplementation((event: string, callback: () => void) => {
                if (event === 'data') callback();
            });

            await signalCli.connect();

            // Don't emit close event to simulate hanging process
            let closeCallback: any;
            mockProcess.once.mockImplementation((event: string, callback: (code: number) => void) => {
                if (event === 'close') {
                    closeCallback = callback;
                }
            });

            const shutdownPromise = signalCli.gracefulShutdown();

            // Simulate timeout and force kill
            setTimeout(() => {
                if (closeCallback) closeCallback(0);
            }, 100);

            await expect(shutdownPromise).resolves.toBeUndefined();
        }, 10000); // Increase timeout to 10 seconds

        it('should handle stderr data with different log levels', async () => {
            const handleStderrData = (signalCli as any).handleStderrData.bind(signalCli);
            const errorHandler = jest.fn();
            const logHandler = jest.fn();

            signalCli.on('error', errorHandler);
            signalCli.on('log', logHandler);

            handleStderrData('ERROR  Component - Critical error');
            expect(errorHandler).toHaveBeenCalled();

            handleStderrData('WARN   Component - Warning message');
            expect(logHandler).toHaveBeenCalledWith(
                expect.objectContaining({ level: 'warn' })
            );

            handleStderrData('INFO   Component - Info message');
            expect(logHandler).toHaveBeenCalledWith(
                expect.objectContaining({ level: 'info' })
            );

            handleStderrData('DEBUG  Component - Debug message');
            expect(logHandler).toHaveBeenCalledWith(
                expect.objectContaining({ level: 'debug' })
            );
        });

        it('should filter out informational WARN messages', async () => {
            const handleStderrData = (signalCli as any).handleStderrData.bind(signalCli);
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            handleStderrData('WARN   Component - Failed to get sender certificate');
            handleStderrData('WARN   Component - ignoring: java.lang.InterruptedException');
            handleStderrData('WARN   Component - Request was interrupted');

            expect(consoleSpy).not.toHaveBeenCalled();

            handleStderrData('WARN   Component - Real warning message');
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });

    describe('JSON-RPC Response Handling', () => {
        it('should handle multi-line JSON-RPC responses', () => {
            const handleRpcResponse = (signalCli as any).handleRpcResponse.bind(signalCli);
            const mockPromise = {
                resolve: jest.fn(),
                reject: jest.fn(),
            };

            (signalCli as any).requestPromises.set('test-id', mockPromise);

            const multiLineData = `{"jsonrpc":"2.0","id":"test-id","result":{"success":true}}\n{"jsonrpc":"2.0","method":"receive","params":{"data":"test"}}`;

            handleRpcResponse(multiLineData);

            expect(mockPromise.resolve).toHaveBeenCalledWith({ success: true });
        });

        it('should handle malformed JSON gracefully', () => {
            const handleRpcResponse = (signalCli as any).handleRpcResponse.bind(signalCli);
            const errorHandler = jest.fn();

            signalCli.on('error', errorHandler);

            handleRpcResponse('not valid json');

            expect(errorHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('Failed to parse JSON-RPC response')
                })
            );
        });

        it('should emit notifications correctly', () => {
            const handleRpcResponse = (signalCli as any).handleRpcResponse.bind(signalCli);
            const notificationHandler = jest.fn();
            const messageHandler = jest.fn();

            signalCli.on('notification', notificationHandler);
            signalCli.on('message', messageHandler);

            const notification = '{"jsonrpc":"2.0","method":"receive","params":{"envelope":{"dataMessage":"test"}}}';

            handleRpcResponse(notification);

            expect(notificationHandler).toHaveBeenCalled();
            expect(messageHandler).toHaveBeenCalled();
        });
    });

    describe('Validation Edge Cases', () => {
        it('should validate recipients (phone, UUID, username)', async () => {
            // Connect first
            mockProcess.stdout.once.mockImplementation((event: string, callback: () => void) => {
                if (event === 'data') callback();
            });
            await signalCli.connect();
            
            jest.spyOn(signalCli as any, 'sendJsonRpcRequest').mockResolvedValue({});
            
            // Valid phone
            await expect(
                signalCli.sendMessage('+1234567890', 'test')
            ).resolves.toBeDefined();

            // Valid UUID
            await expect(
                signalCli.sendMessage('12345678-1234-1234-1234-123456789012', 'test')
            ).resolves.toBeDefined();

            // Valid username
            await expect(
                signalCli.sendMessage('u:username.123', 'test')
            ).resolves.toBeDefined();
        });
    });

    describe('Group Detection', () => {
        it('should correctly identify group IDs', () => {
            const isGroupId = (signalCli as any).isGroupId.bind(signalCli);

            expect(isGroupId('base64groupid==')).toBe(true);
            expect(isGroupId('group/with/slash')).toBe(true);
            expect(isGroupId('multiple+signs+notphone')).toBe(true);
            expect(isGroupId('+1234567890')).toBe(false);
        });
    });

    describe('Deprecated Methods', () => {
        it('should warn about deprecated receiveMessages', async () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            await signalCli.receiveMessages();

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('deprecated')
            );

            consoleSpy.mockRestore();
        });

        it('should warn about deprecated startDaemon', async () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            mockProcess.stdout.once.mockImplementation((event: string, callback: () => void) => {
                if (event === 'data') callback();
            });

            await signalCli.startDaemon();

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('deprecated')
            );

            consoleSpy.mockRestore();
        });

        it('should warn about deprecated stopDaemon', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            signalCli.stopDaemon();

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('deprecated')
            );

            consoleSpy.mockRestore();
        });
    });

    describe('Complex Scenarios', () => {
        beforeEach(() => {
            jest.spyOn(signalCli as any, 'sendJsonRpcRequest').mockResolvedValue({});
        });

        it('should handle group message with options', async () => {
            const sendJsonRpcRequestSpy = jest.spyOn(signalCli as any, 'sendJsonRpcRequest')
                .mockResolvedValue({ results: [{ type: 'SUCCESS' }], timestamp: 123456 });

            await signalCli.sendMessage('groupId==', 'Group message', {
                mentions: [{ start: 0, length: 4, number: '+1111111111' }]
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalled();
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('send', 
                expect.objectContaining({
                    message: 'Group message',
                    groupId: 'groupId=='
                })
            );
        });
    });

    describe('Error Handling', () => {
        it('should reject when not connected', async () => {
            const disconnectedSignal = new SignalCli('signal-cli', '+1234567890');

            await expect(
                disconnectedSignal.sendMessage('+0987654321', 'test')
            ).rejects.toThrow('Not connected');
        });

        it('should handle JSON-RPC errors correctly', () => {
            const handleRpcResponse = (signalCli as any).handleRpcResponse.bind(signalCli);
            const mockPromise = {
                resolve: jest.fn(),
                reject: jest.fn(),
            };

            (signalCli as any).requestPromises.set('error-id', mockPromise);

            const errorResponse = '{"jsonrpc":"2.0","id":"error-id","error":{"code":-32600,"message":"Invalid Request"}}';

            handleRpcResponse(errorResponse);

            expect(mockPromise.reject).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('Invalid Request')
                })
            );
        });
    });
});
