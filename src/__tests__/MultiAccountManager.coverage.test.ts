import { MultiAccountManager } from '../MultiAccountManager';
import { SignalCli } from '../SignalCli';
import { EventEmitter } from 'events';

jest.mock('../SignalCli');

describe('MultiAccountManager Coverage', () => {
    let manager: MultiAccountManager;
    let mockSignalCli: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSignalCli = new EventEmitter();
        mockSignalCli.connect = jest.fn().mockResolvedValue(undefined);
        mockSignalCli.disconnect = jest.fn();
        mockSignalCli.removeAllListeners = jest.fn();
        (SignalCli as any).mockImplementation(() => mockSignalCli);
        
        manager = new MultiAccountManager();
    });

    it('should handle account events and bubbling', async () => {
        await manager.addAccount('+1234567890');
        const msgSpy = jest.fn();
        manager.on('message', msgSpy);

        mockSignalCli.emit('message', { envelope: { source: '+someone' } });
        expect(msgSpy).toHaveBeenCalledWith(
            '+1234567890',
            expect.objectContaining({ envelope: { source: '+someone' } })
        );
    });

    it('should handle account disconnection bubbling', async () => {
        await manager.addAccount('+1234567890');
        const discSpy = jest.fn();
        manager.on('disconnected', discSpy);

        mockSignalCli.emit('disconnected');
        expect(discSpy).toHaveBeenCalledWith('+1234567890');
    });

    it('should forward group and call events with account context', async () => {
        await manager.addAccount('+1234567890');
        const groupSpy = jest.fn();
        const callSpy = jest.fn();
        manager.on('groupUpdate', groupSpy);
        manager.on('callEnded', callSpy);

        mockSignalCli.emit('groupUpdate', { groupId: 'group-1', type: 'UPDATE' });
        mockSignalCli.emit('callEnded', { callId: 42 });

        expect(groupSpy).toHaveBeenCalledWith('+1234567890', { groupId: 'group-1', type: 'UPDATE' });
        expect(callSpy).toHaveBeenCalledWith('+1234567890', { callId: 42 });
    });

    it('should track connected state from forwarded lifecycle events', async () => {
        await manager.addAccount('+1234567890');

        mockSignalCli.emit('connected');
        expect((manager.getStatus('+1234567890') as { connected: boolean }).connected).toBe(true);

        mockSignalCli.emit('disconnected');
        expect((manager.getStatus('+1234567890') as { connected: boolean }).connected).toBe(false);
    });
});
