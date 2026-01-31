import { DeviceManager } from '../managers/DeviceManager';
import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import * as qrcodeTerminal from 'qrcode-terminal';

jest.mock('child_process');
jest.mock('qrcode-terminal');

describe('DeviceManager', () => {
    let deviceManager: DeviceManager;
    let mockSendRequest: jest.Mock;
    let mockLogger: any;
    let mockConfig: any;
    let mockProcess: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSendRequest = jest.fn();
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };
        mockConfig = {
            requestTimeout: 1000
        };
        deviceManager = new DeviceManager(mockSendRequest, '+1234567890', mockLogger, mockConfig, 'signal-cli');

        mockProcess = {
            stdout: new EventEmitter(),
            stderr: new EventEmitter(),
            on: jest.fn(),
        };
        (spawn as jest.Mock).mockReturnValue(mockProcess);
    });

    it('should list devices', async () => {
        const mockDevices = [{ id: 1, name: 'Device 1' }];
        mockSendRequest.mockResolvedValue(mockDevices);

        const result = await deviceManager.listDevices();
        expect(result).toBe(mockDevices);
        expect(mockSendRequest).toHaveBeenCalledWith('listDevices', { account: '+1234567890' });
    });

    it('should add device', async () => {
        await deviceManager.addDevice('sgnl://link', 'New Device');
        expect(mockSendRequest).toHaveBeenCalledWith('addDevice', {
            account: '+1234567890',
            uri: 'sgnl://link',
            deviceName: 'New Device'
        });
    });

    it('should remove device', async () => {
        await deviceManager.removeDevice(2);
        expect(mockSendRequest).toHaveBeenCalledWith('removeDevice', {
            account: '+1234567890',
            deviceId: 2
        });
    });

    it('should update device', async () => {
        await deviceManager.updateDevice({ deviceId: 2, deviceName: 'Updated' });
        expect(mockSendRequest).toHaveBeenCalledWith('updateDevice', {
            account: '+1234567890',
            deviceId: 2,
            deviceName: 'Updated'
        });
    });

    describe('deviceLink', () => {
        it('should handle successful linking', async () => {
            const linkPromise = deviceManager.deviceLink({ name: 'Test Link' });

            // Simulate stdout output
            mockProcess.stdout.emit('data', Buffer.from('sgnl://link-uri\n'));
            mockProcess.stdout.emit('data', Buffer.from('Device registered\n'));
            
            // Simulate process exit
            const closeCallback = (spawn as jest.Mock).mock.calls[0] ? (spawn as jest.Mock).mock.results[0].value.on.mock.calls.find((c: any) => c[0] === 'close')[1] : null;
            
            // Actually we need to capture the 'close' event handler
            const closeHandler = (mockProcess.on as jest.Mock).mock.calls.find(call => call[0] === 'close')[1];
            closeHandler(0);

            const result = await linkPromise;
            expect(result.success).toBe(true);
            expect(result.isLinked).toBe(true);
            expect(result.qrCode?.uri).toBe('sgnl://link-uri');
        });

        it('should handle QR code display in console', async () => {
            const linkPromise = deviceManager.deviceLink({
                name: 'Test Link',
                qrCodeOutput: 'console'
            });

            mockProcess.stdout.emit('data', Buffer.from('sgnl://link-uri\n'));
            
            expect(qrcodeTerminal.generate).toHaveBeenCalledWith('sgnl://link-uri', { small: true });
            
            const closeHandler = (mockProcess.on as jest.Mock).mock.calls.find(call => call[0] === 'close')[1];
            closeHandler(0);
            await linkPromise;
        });

        it('should handle linking failure', async () => {
            const linkPromise = deviceManager.deviceLink({ name: 'Fail' });

            mockProcess.stderr.emit('data', Buffer.from('ERROR: Something went wrong\n'));
            
            const closeHandler = (mockProcess.on as jest.Mock).mock.calls.find(call => call[0] === 'close')[1];
            closeHandler(1);

            const result = await linkPromise;
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });
});
