import { SignalCli } from '../SignalCli';
import { ConnectionError } from '../errors';

// Mock dependencies
jest.mock('child_process');
jest.mock('../config', () => ({
    Logger: jest.fn().mockImplementation(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    })),
    validateConfig: jest.fn().mockImplementation((config) => ({
        verbose: false,
        requestTimeout: config.requestTimeout || 1000,
        maxConcurrentRequests: 10,
        minRequestInterval: 100,
    })),
}));

describe('SignalCli - Robustness', () => {
    let signalCli: SignalCli;
    const mockAccount = '+1234567890';

    beforeEach(() => {
        jest.clearAllMocks();
        // Set a short timeout for tests
        signalCli = new SignalCli(mockAccount, undefined, { requestTimeout: 100 } as any);
    });

    describe('RPC Timeouts', () => {
        it('should throw ConnectionError when RPC request times out', async () => {
            // Mock cliProcess to simulate a slow response
            (signalCli as any).cliProcess = {
                stdin: { write: jest.fn() },
                killed: false,
            };

            // We don't call handleRpcResponse, so the promise will never resolve
            // but the timeout should trigger
            await expect(signalCli.getVersion()).rejects.toThrow(ConnectionError);

            await expect(signalCli.getVersion()).rejects.toThrow(/RPC request timeout/);
        });
    });

    describe('Exponential Backoff Reconnection', () => {
        it('should attempt reconnection when process closes', async () => {
            // Spy on connect
            const connectSpy = jest.spyOn(signalCli, 'connect').mockResolvedValue(undefined);
            const loggerSpy = jest.spyOn((signalCli as any).logger, 'warn');

            jest.useFakeTimers();

            // Simulate process close
            (signalCli as any).handleProcessClose(1);

            expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Reconnecting in 1000ms'));

            // Advance timers by 1s
            jest.advanceTimersByTime(1000);

            // Wait for any microtasks to clear
            await Promise.resolve();

            expect(connectSpy).toHaveBeenCalled();

            jest.useRealTimers();
        });
    });
});
