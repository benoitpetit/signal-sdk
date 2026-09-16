/**
 * Tests for MultiAccountManager reconnect deduplication and timer lifecycle
 */

import { MultiAccountManager } from '../MultiAccountManager';
import { SignalCli } from '../SignalCli';
import { EventEmitter } from 'events';

jest.mock('../SignalCli');

describe('MultiAccountManager reconnect lifecycle', () => {
    let manager: MultiAccountManager;
    let mockInstance: EventEmitter & {
        connect: jest.Mock;
        disconnect: jest.Mock;
        removeAllListeners: jest.Mock;
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        const emitter = new EventEmitter();
        mockInstance = Object.assign(emitter, {
            connect: jest.fn().mockRejectedValue(new Error('connection failed')),
            disconnect: jest.fn().mockResolvedValue(undefined),
            removeAllListeners: jest.fn(),
        });

        (SignalCli as unknown as jest.Mock).mockImplementation(() => mockInstance);

        manager = new MultiAccountManager({ autoReconnect: true, verbose: false });
    });

    afterEach(async () => {
        await manager.shutdown();
        jest.useRealTimers();
    });

    it('should not stack multiple reconnect timers for the same account', async () => {
        await manager.addAccount('+33123456789');

        // Simulate multiple disconnect events in quick succession
        mockInstance.emit('disconnected');
        mockInstance.emit('disconnected');
        mockInstance.emit('disconnected');

        await jest.advanceTimersByTimeAsync(5000);

        // Only one reconnect attempt should have fired despite 3 events
        expect(mockInstance.connect).toHaveBeenCalledTimes(1);
    });

    it('should cancel pending reconnect on user-initiated disconnect', async () => {
        mockInstance.connect.mockResolvedValueOnce(undefined);
        await manager.addAccount('+33123456789');
        await manager.connect('+33123456789');

        // Trigger an auto-reconnect schedule
        mockInstance.emit('disconnected');

        // User disconnects before the timer fires
        await manager.disconnect('+33123456789');

        mockInstance.connect.mockClear();
        await jest.advanceTimersByTimeAsync(10000);

        expect(mockInstance.connect).not.toHaveBeenCalled();
    });

    it('should cancel pending reconnect on shutdown', async () => {
        await manager.addAccount('+33123456789');

        mockInstance.emit('disconnected');

        await manager.shutdown();

        mockInstance.connect.mockClear();
        await jest.advanceTimersByTimeAsync(10000);

        expect(mockInstance.connect).not.toHaveBeenCalled();
    });

    it('should cancel pending reconnect when account is removed', async () => {
        await manager.addAccount('+33123456789');

        mockInstance.emit('disconnected');

        await manager.removeAccount('+33123456789');

        mockInstance.connect.mockClear();
        await jest.advanceTimersByTimeAsync(10000);

        expect(mockInstance.connect).not.toHaveBeenCalled();
    });
});
