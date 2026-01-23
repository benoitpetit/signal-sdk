/**
 * Tests for MultiAccountManager
 */

import { MultiAccountManager } from '../MultiAccountManager';
import { SignalCli } from '../SignalCli';

// Mock SignalCli
jest.mock('../SignalCli');

describe('MultiAccountManager', () => {
    let manager: MultiAccountManager;

    beforeEach(() => {
        jest.clearAllMocks();
        manager = new MultiAccountManager({
            dataPath: '/tmp/test-data',
            verbose: false
        });
    });

    afterEach(async () => {
        if (manager) {
            await manager.shutdown();
        }
    });

    describe('Account Management', () => {
        it('should add an account', async () => {
            const instance = await manager.addAccount('+33123456789');

            expect(instance).toBeInstanceOf(SignalCli);
            expect(manager.hasAccount('+33123456789')).toBe(true);
            expect(manager.getAccounts()).toContain('+33123456789');
        });

        it('should emit accountAdded event', async () => {
            const spy = jest.fn();
            manager.on('accountAdded', spy);

            await manager.addAccount('+33123456789');

            expect(spy).toHaveBeenCalledWith('+33123456789');
        });

        it('should throw error when adding duplicate account', async () => {
            await manager.addAccount('+33123456789');

            await expect(
                manager.addAccount('+33123456789')
            ).rejects.toThrow('Account +33123456789 already exists');
        });

        it('should remove an account', async () => {
            await manager.addAccount('+33123456789');
            await manager.removeAccount('+33123456789');

            expect(manager.hasAccount('+33123456789')).toBe(false);
            expect(manager.getAccounts()).not.toContain('+33123456789');
        });

        it('should emit accountRemoved event', async () => {
            const spy = jest.fn();
            await manager.addAccount('+33123456789');
            manager.on('accountRemoved', spy);

            await manager.removeAccount('+33123456789');

            expect(spy).toHaveBeenCalledWith('+33123456789');
        });

        it('should throw error when removing non-existent account', async () => {
            await expect(
                manager.removeAccount('+33123456789')
            ).rejects.toThrow('Account +33123456789 not found');
        });

        it('should get specific account instance', async () => {
            await manager.addAccount('+33123456789');
            const instance = manager.getAccount('+33123456789');

            expect(instance).toBeInstanceOf(SignalCli);
        });

        it('should return undefined for non-existent account', () => {
            const instance = manager.getAccount('+33999999999');

            expect(instance).toBeUndefined();
        });

        it('should get all account numbers', async () => {
            await manager.addAccount('+33123456789');
            await manager.addAccount('+33987654321');

            const accounts = manager.getAccounts();

            expect(accounts).toHaveLength(2);
            expect(accounts).toContain('+33123456789');
            expect(accounts).toContain('+33987654321');
        });
    });

    describe('Connection Management', () => {
        it('should connect a specific account', async () => {
            const instance = await manager.addAccount('+33123456789');
            (instance.connect as jest.Mock) = jest.fn().mockResolvedValue(undefined);

            await manager.connect('+33123456789');

            expect(instance.connect).toHaveBeenCalled();
        });

        it('should emit accountConnected event', async () => {
            const instance = await manager.addAccount('+33123456789');
            (instance.connect as jest.Mock) = jest.fn().mockResolvedValue(undefined);
            const spy = jest.fn();
            manager.on('accountConnected', spy);

            await manager.connect('+33123456789');

            expect(spy).toHaveBeenCalledWith('+33123456789');
        });

        it('should disconnect a specific account', async () => {
            const instance = await manager.addAccount('+33123456789');
            (instance.connect as jest.Mock) = jest.fn().mockResolvedValue(undefined);
            (instance.disconnect as jest.Mock) = jest.fn().mockResolvedValue(undefined);

            await manager.connect('+33123456789');
            await manager.disconnect('+33123456789');

            expect(instance.disconnect).toHaveBeenCalled();
        });

        it('should emit accountDisconnected event', async () => {
            const instance = await manager.addAccount('+33123456789');
            (instance.connect as jest.Mock) = jest.fn().mockResolvedValue(undefined);
            (instance.disconnect as jest.Mock) = jest.fn().mockResolvedValue(undefined);
            const spy = jest.fn();

            await manager.connect('+33123456789');
            manager.on('accountDisconnected', spy);
            await manager.disconnect('+33123456789');

            expect(spy).toHaveBeenCalledWith('+33123456789');
        });

        it('should connect all accounts', async () => {
            const instance1 = await manager.addAccount('+33123456789');
            const instance2 = await manager.addAccount('+33987654321');
            
            (instance1.connect as jest.Mock) = jest.fn().mockResolvedValue(undefined);
            (instance2.connect as jest.Mock) = jest.fn().mockResolvedValue(undefined);

            await manager.connectAll();

            expect(instance1.connect).toHaveBeenCalled();
            expect(instance2.connect).toHaveBeenCalled();
        });

        it('should disconnect all accounts', async () => {
            const instance1 = await manager.addAccount('+33123456789');
            const instance2 = await manager.addAccount('+33987654321');
            
            (instance1.connect as jest.Mock) = jest.fn().mockResolvedValue(undefined);
            (instance2.connect as jest.Mock) = jest.fn().mockResolvedValue(undefined);
            (instance1.disconnect as jest.Mock) = jest.fn().mockResolvedValue(undefined);
            (instance2.disconnect as jest.Mock) = jest.fn().mockResolvedValue(undefined);

            await manager.connectAll();
            await manager.disconnectAll();

            expect(instance1.disconnect).toHaveBeenCalled();
            expect(instance2.disconnect).toHaveBeenCalled();
        });

        it('should handle connection errors gracefully', async () => {
            const instance = await manager.addAccount('+33123456789');
            (instance.connect as jest.Mock) = jest.fn().mockRejectedValue(new Error('Connection failed'));

            await expect(manager.connect('+33123456789')).rejects.toThrow('Connection failed');
        });
    });

    describe('Message Sending', () => {
        it('should send message from specific account', async () => {
            const instance = await manager.addAccount('+33123456789');
            (instance.sendMessage as jest.Mock) = jest.fn().mockResolvedValue({ 
                timestamp: Date.now(), 
                results: [] 
            });

            await manager.sendMessage('+33123456789', '+33111111111', 'Hello!');

            expect(instance.sendMessage).toHaveBeenCalledWith('+33111111111', 'Hello!', {});
        });

        it('should throw error when sending from non-existent account', async () => {
            await expect(
                manager.sendMessage('+33999999999', '+33111111111', 'Hello!')
            ).rejects.toThrow('Account +33999999999 not found');
        });

        it('should send message with options', async () => {
            const instance = await manager.addAccount('+33123456789');
            (instance.sendMessage as jest.Mock) = jest.fn().mockResolvedValue({ 
                timestamp: Date.now(), 
                results: [] 
            });

            const options = { attachments: ['file.jpg'] };
            await manager.sendMessage('+33123456789', '+33111111111', 'Hello!', options);

            expect(instance.sendMessage).toHaveBeenCalledWith('+33111111111', 'Hello!', options);
        });
    });

    describe('Event Forwarding', () => {
        it('should setup event forwarding on account addition', async () => {
            const instance = await manager.addAccount('+33123456789');
            
            // Verify instance was created
            expect(instance).toBeDefined();
            expect(manager.hasAccount('+33123456789')).toBe(true);
        });
    });

    describe('Status Information', () => {
        it('should get status for specific account', async () => {
            await manager.addAccount('+33123456789');
            
            const status = manager.getStatus('+33123456789');

            expect(status).toHaveProperty('account', '+33123456789');
            expect(status).toHaveProperty('connected', false);
            expect(status).toHaveProperty('lastActivity');
            expect(status).toHaveProperty('uptime');
        });

        it('should return null for non-existent account status', () => {
            const status = manager.getStatus('+33999999999');

            expect(status).toBeNull();
        });

        it('should get status for all accounts', async () => {
            await manager.addAccount('+33123456789');
            await manager.addAccount('+33987654321');

            const status = manager.getStatus();

            expect(status.totalAccounts).toBe(2);
            expect(status.connectedAccounts).toBe(0);
            expect(status.accounts).toHaveLength(2);
        });

        it('should update connected count in status', async () => {
            const instance = await manager.addAccount('+33123456789');
            jest.spyOn(instance, 'connect').mockResolvedValue();

            await manager.connect('+33123456789');
            const status = manager.getStatus();

            expect(status.connectedAccounts).toBe(1);
        });
    });

    describe('Shutdown', () => {
        it('should shutdown and cleanup all accounts', async () => {
            const instance1 = await manager.addAccount('+33123456789');
            const instance2 = await manager.addAccount('+33987654321');
            
            (instance1.connect as jest.Mock) = jest.fn().mockResolvedValue(undefined);
            (instance2.connect as jest.Mock) = jest.fn().mockResolvedValue(undefined);
            (instance1.disconnect as jest.Mock) = jest.fn().mockResolvedValue(undefined);
            (instance2.disconnect as jest.Mock) = jest.fn().mockResolvedValue(undefined);

            await manager.connectAll();
            await manager.shutdown();

            expect(manager.getAccounts()).toHaveLength(0);
        });
    });
});
