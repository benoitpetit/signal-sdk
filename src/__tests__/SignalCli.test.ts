import { SignalCli } from '../SignalCli';
import { spawn } from 'child_process';

jest.mock('child_process');

describe('SignalCli', () => {
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
        };

        const spawnMock = spawn as jest.MockedFunction<typeof spawn>;
        spawnMock.mockReturnValue(mockProcess);

        signalCli = new SignalCli('signal-cli', '+1234567890');
    });

    it('should be defined', () => {
        expect(SignalCli).toBeDefined();
    });

    it('should connect to JSON-RPC mode', async () => {
        // Mock the stdout data event to resolve connect
        mockProcess.stdout.once.mockImplementation((event: string, callback: () => void) => {
            if (event === 'data') {
                callback();
            }
        });

        await signalCli.connect();

        // On Windows, spawn may use cmd.exe /c, so we check the arguments more flexibly
        const spawnCalls = (spawn as jest.MockedFunction<typeof spawn>).mock.calls;
        expect(spawnCalls).toHaveLength(1);

        const [command, args] = spawnCalls[0];
        if (process.platform === 'win32') {
            // On Windows, expect cmd.exe with /c and the actual command
            expect(command).toBe('cmd.exe');
            expect(args).toEqual(['/c', 'signal-cli', '-a', '+1234567890', 'jsonRpc']);
        } else {
            // On Unix-like systems, expect direct command
            expect(command).toBe('signal-cli');
            expect(args).toEqual(['-a', '+1234567890', 'jsonRpc']);
        }
    });

    it('should send JSON-RPC request for sendMessage', async () => {
        // Mock sendJsonRpcRequest directly
        const sendJsonRpcRequestSpy = jest
            .spyOn(signalCli as any, 'sendJsonRpcRequest')
            .mockResolvedValue({ results: [{ type: 'SUCCESS' }], timestamp: 123456 });

        await signalCli.sendMessage('+10987654321', 'Hello, world!');

        expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('send', {
            message: 'Hello, world!',
            account: '+1234567890',
            recipients: ['+10987654321'],
        });
    });

    it('should disconnect properly', async () => {
        // Connect first
        mockProcess.stdout.once.mockImplementation((event: string, callback: () => void) => {
            if (event === 'data') {
                setTimeout(callback, 0);
            }
        });
        await signalCli.connect();

        // Now disconnect
        signalCli.disconnect();
        expect(mockProcess.kill).toHaveBeenCalled();
    });

    it('should not reconnect if shutdown was intentional', async () => {
        // Mock logger to verify it's NOT calling warn about reconnecting
        const loggerWarnSpy = jest.spyOn((signalCli as any).logger, 'warn');
        const loggerDebugSpy = jest.spyOn((signalCli as any).logger, 'debug');

        // Connect first
        mockProcess.stdout.once.mockImplementation((event: string, callback: () => void) => {
            if (event === 'data') setTimeout(callback, 0);
        });
        await signalCli.connect();

        // Now disconnect intentionally
        signalCli.disconnect();

        // Manually trigger process close event (which happens after kill)
        // Extract the close handler from mockProcess.on calls
        const closeHandler = mockProcess.on.mock.calls.find((call: any) => call[0] === 'close')[1];
        await closeHandler(0);

        // Verify it didn't try to reconnect
        expect(loggerWarnSpy).not.toHaveBeenCalledWith(expect.stringContaining('Reconnecting'));
        expect(loggerDebugSpy).toHaveBeenCalledWith(expect.stringContaining('closed intentionally'));
    });

    // Test new features
    describe('New Features', () => {
        beforeEach(() => {
            // Mock sendJsonRpcRequest for all tests
            jest.spyOn(signalCli as any, 'sendJsonRpcRequest').mockResolvedValue({});
        });

        it('should remove contact', async () => {
            const sendJsonRpcRequestSpy = jest.spyOn(signalCli as any, 'sendJsonRpcRequest').mockResolvedValue({});

            await signalCli.removeContact('+1234567890', { forget: true });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('removeContact', {
                account: '+1234567890',
                recipient: '+1234567890',
                forget: true,
            });
        });

        it('should get user status', async () => {
            const mockResponse = {
                recipients: [{ number: '+1234567890', isRegistered: true, uuid: 'test-uuid' }],
            };

            const sendJsonRpcRequestSpy = jest
                .spyOn(signalCli as any, 'sendJsonRpcRequest')
                .mockResolvedValue(mockResponse);

            const result = await signalCli.getUserStatus(['+1234567890']);

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('getUserStatus', {
                account: '+1234567890',
                recipients: ['+1234567890'],
            });

            expect(result).toEqual([
                { number: '+1234567890', isRegistered: true, uuid: 'test-uuid', username: undefined },
            ]);
        });

        it('should send payment notification', async () => {
            const sendJsonRpcRequestSpy = jest
                .spyOn(signalCli as any, 'sendJsonRpcRequest')
                .mockResolvedValue({ timestamp: 123456 });

            await signalCli.sendPaymentNotification('+1234567890', {
                receipt: 'base64-receipt',
                note: 'Payment for coffee',
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('sendPaymentNotification', {
                account: '+1234567890',
                recipient: '+1234567890',
                receipt: 'base64-receipt',
                note: 'Payment for coffee',
            });
        });

        it('should upload sticker pack', async () => {
            const mockResponse = {
                packId: 'pack-id',
                packKey: 'pack-key',
                installUrl: 'https://signal.org/stickers/pack-id',
            };

            const sendJsonRpcRequestSpy = jest
                .spyOn(signalCli as any, 'sendJsonRpcRequest')
                .mockResolvedValue(mockResponse);

            const result = await signalCli.uploadStickerPack({
                path: '/path/to/manifest.json',
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('uploadStickerPack', {
                account: '+1234567890',
                path: '/path/to/manifest.json',
            });

            expect(result).toEqual(mockResponse);
        });

        it('should submit rate limit challenge', async () => {
            const mockResponse = {
                success: true,
                message: 'Challenge accepted',
            };

            const sendJsonRpcRequestSpy = jest
                .spyOn(signalCli as any, 'sendJsonRpcRequest')
                .mockResolvedValue(mockResponse);

            const result = await signalCli.submitRateLimitChallenge('challenge-token', 'captcha-token');

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('submitRateLimitChallenge', {
                account: '+1234567890',
                challenge: 'challenge-token',
                captcha: 'captcha-token',
            });

            expect(result).toEqual(mockResponse);
        });

        it('should start change number', async () => {
            const sendJsonRpcRequestSpy = jest.spyOn(signalCli as any, 'sendJsonRpcRequest').mockResolvedValue({});

            await signalCli.startChangeNumber('+1987654321');

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('startChangeNumber', {
                account: '+1234567890',
                number: '+1987654321',
                voice: false,
            });
        });

        it('should finish change number', async () => {
            const sendJsonRpcRequestSpy = jest.spyOn(signalCli as any, 'sendJsonRpcRequest').mockResolvedValue({});

            await signalCli.finishChangeNumber('+1987654321', '123456', 'pin-code');

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('finishChangeNumber', {
                account: '+1234567890',
                number: '+1987654321',
                verificationCode: '123456',
                pin: 'pin-code',
            });
        });
    });

    // Test cross-platform path detection
    describe('Cross-platform compatibility', () => {
        it('should use correct executable path based on platform', () => {
            // Test Windows path
            const originalPlatform = process.platform;

            // Mock Windows
            Object.defineProperty(process, 'platform', { value: 'win32' });
            const windowsSignal = new SignalCli('+1234567890');
            expect((windowsSignal as any).signalCliPath).toContain('signal-cli.bat');

            // Mock Linux
            Object.defineProperty(process, 'platform', { value: 'linux' });
            const linuxSignal = new SignalCli('+1234567890');
            expect((linuxSignal as any).signalCliPath).toContain('signal-cli');
            expect((linuxSignal as any).signalCliPath).not.toContain('.bat');

            // Mock macOS
            Object.defineProperty(process, 'platform', { value: 'darwin' });
            const macSignal = new SignalCli('+1234567890');
            expect((macSignal as any).signalCliPath).toContain('signal-cli');
            expect((macSignal as any).signalCliPath).not.toContain('.bat');

            // Restore original platform
            Object.defineProperty(process, 'platform', { value: originalPlatform });
        });

        it('should spawn correct command based on platform', async () => {
            const originalPlatform = process.platform;

            // Test Windows spawning
            Object.defineProperty(process, 'platform', { value: 'win32' });
            const windowsSignal = new SignalCli('test-path.bat', '+1234567890');

            mockProcess.stdout.once.mockImplementation((event: string, callback: () => void) => {
                if (event === 'data') callback();
            });

            await windowsSignal.connect();

            const windowsCalls = (spawn as jest.MockedFunction<typeof spawn>).mock.calls;
            const lastCall = windowsCalls[windowsCalls.length - 1];
            expect(lastCall[0]).toBe('cmd.exe');
            expect(lastCall[1]).toEqual(['/c', '"test-path.bat"', '-a', '+1234567890', 'jsonRpc']);

            // Test Unix spawning
            Object.defineProperty(process, 'platform', { value: 'linux' });
            const linuxSignal = new SignalCli('test-path', '+1234567890');

            await linuxSignal.connect();

            const linuxCalls = (spawn as jest.MockedFunction<typeof spawn>).mock.calls;
            const lastLinuxCall = linuxCalls[linuxCalls.length - 1];
            expect(lastLinuxCall[0]).toBe('test-path');
            expect(lastLinuxCall[1]).toEqual(['-a', '+1234567890', 'jsonRpc']);

            // Restore original platform
            Object.defineProperty(process, 'platform', { value: originalPlatform });
        });
    });

    // Test v0.1.0 features: Polls
    describe('Poll Management', () => {
        beforeEach(() => {
            jest.spyOn(signalCli as any, 'sendJsonRpcRequest').mockResolvedValue({});
        });

        it('should create a poll', async () => {
            const mockResponse = { timestamp: 123456789 };
            const sendJsonRpcRequestSpy = jest
                .spyOn(signalCli as any, 'sendJsonRpcRequest')
                .mockResolvedValue(mockResponse);

            const result = await signalCli.sendPollCreate({
                recipients: ['+1234567890'],
                question: 'What is your favorite color?',
                options: ['Red', 'Blue', 'Green'],
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('sendPollCreate', {
                account: '+1234567890',
                recipients: ['+1234567890'],
                question: 'What is your favorite color?',
                options: ['Red', 'Blue', 'Green'],
            });
            expect(result).toEqual(mockResponse);
        });

        it('should create a group poll', async () => {
            const mockResponse = { timestamp: 123456789 };
            const sendJsonRpcRequestSpy = jest
                .spyOn(signalCli as any, 'sendJsonRpcRequest')
                .mockResolvedValue(mockResponse);

            const result = await signalCli.sendPollCreate({
                groupId: 'group-123',
                question: 'Best meeting time?',
                options: ['9 AM', '2 PM', '4 PM'],
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('sendPollCreate', {
                account: '+1234567890',
                groupId: 'group-123',
                question: 'Best meeting time?',
                options: ['9 AM', '2 PM', '4 PM'],
            });
            expect(result).toEqual(mockResponse);
        });

        it('should vote on a poll', async () => {
            const mockResponse = { timestamp: 123456790 };
            const sendJsonRpcRequestSpy = jest
                .spyOn(signalCli as any, 'sendJsonRpcRequest')
                .mockResolvedValue(mockResponse);

            const result = await signalCli.sendPollVote('+1234567890', {
                pollAuthor: '+9876543210',
                pollTimestamp: 123456789,
                optionIndexes: [0, 1],
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('sendPollVote', {
                account: '+1234567890',
                recipient: '+1234567890',
                pollAuthor: '+9876543210',
                pollTimestamp: 123456789,
                options: [0, 1],
            });
            expect(result).toEqual(mockResponse);
        });

        it('should terminate a poll', async () => {
            const mockResponse = { timestamp: 123456791 };
            const sendJsonRpcRequestSpy = jest
                .spyOn(signalCli as any, 'sendJsonRpcRequest')
                .mockResolvedValue(mockResponse);

            const result = await signalCli.sendPollTerminate('+1234567890', {
                pollTimestamp: 123456789,
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('sendPollTerminate', {
                account: '+1234567890',
                recipient: '+1234567890',
                pollTimestamp: 123456789,
            });
            expect(result).toEqual(mockResponse);
        });
    });

    // Test v0.1.0 features: Attachment Retrieval
    describe('Attachment Retrieval', () => {
        beforeEach(() => {
            jest.spyOn(signalCli as any, 'sendJsonRpcRequest').mockResolvedValue({});
        });

        it('should get attachment by ID', async () => {
            const mockBase64 = 'base64-encoded-data';
            const sendJsonRpcRequestSpy = jest
                .spyOn(signalCli as any, 'sendJsonRpcRequest')
                .mockResolvedValue(mockBase64);

            const result = await signalCli.getAttachment({
                id: 'attachment-123',
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('getAttachment', {
                account: '+1234567890',
                id: 'attachment-123',
            });
            expect(result).toBe(mockBase64);
        });

        it('should get contact avatar', async () => {
            const mockBase64 = 'base64-avatar-data';
            const sendJsonRpcRequestSpy = jest
                .spyOn(signalCli as any, 'sendJsonRpcRequest')
                .mockResolvedValue(mockBase64);

            const result = await signalCli.getAvatar({
                contact: '+9876543210',
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('getAvatar', {
                account: '+1234567890',
                contact: '+9876543210',
            });
            expect(result).toBe(mockBase64);
        });

        it('should get profile avatar', async () => {
            const mockBase64 = 'base64-profile-avatar';
            const sendJsonRpcRequestSpy = jest
                .spyOn(signalCli as any, 'sendJsonRpcRequest')
                .mockResolvedValue(mockBase64);

            const result = await signalCli.getAvatar({
                profile: '+1234567890',
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('getAvatar', {
                account: '+1234567890',
                profile: '+1234567890',
            });
            expect(result).toBe(mockBase64);
        });

        it('should get group avatar', async () => {
            const mockBase64 = 'base64-group-avatar';
            const sendJsonRpcRequestSpy = jest
                .spyOn(signalCli as any, 'sendJsonRpcRequest')
                .mockResolvedValue(mockBase64);

            const result = await signalCli.getAvatar({
                groupId: 'group-123',
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('getAvatar', {
                account: '+1234567890',
                groupId: 'group-123',
            });
            expect(result).toBe(mockBase64);
        });

        it('should get sticker data', async () => {
            const mockBase64 = 'base64-sticker-data';
            const sendJsonRpcRequestSpy = jest
                .spyOn(signalCli as any, 'sendJsonRpcRequest')
                .mockResolvedValue(mockBase64);

            const result = await signalCli.getSticker({
                packId: 'pack-123',
                stickerId: 5,
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('getSticker', {
                account: '+1234567890',
                packId: 'pack-123',
                stickerId: 5,
            });
            expect(result).toBe(mockBase64);
        });
    });

    // Test v0.1.0 features: Account Management
    describe('Account Management', () => {
        beforeEach(() => {
            jest.spyOn(signalCli as any, 'sendJsonRpcRequest').mockResolvedValue({});
        });

        it('should update account settings', async () => {
            const mockResponse = {
                username: 'myusername',
                usernameLink: 'https://signal.me/#myusername',
            };
            const sendJsonRpcRequestSpy = jest
                .spyOn(signalCli as any, 'sendJsonRpcRequest')
                .mockResolvedValue(mockResponse);

            const result = await signalCli.updateAccount({
                deviceName: 'My Device',
                username: 'myusername',
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('updateAccount', {
                account: '+1234567890',
                deviceName: 'My Device',
                username: 'myusername',
            });
            expect(result.success).toBe(true);
            expect(result.username).toBe('myusername');
        });

        it('should list accounts with details', async () => {
            const mockResponse = {
                accounts: [
                    { number: '+1234567890', name: 'Account 1', uuid: 'uuid-1' },
                    { number: '+9876543210', name: 'Account 2', uuid: 'uuid-2' },
                ],
            };
            const sendJsonRpcRequestSpy = jest
                .spyOn(signalCli as any, 'sendJsonRpcRequest')
                .mockResolvedValue(mockResponse);

            const result = await signalCli.listAccountsDetailed();

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('listAccounts');
            expect(result).toEqual(mockResponse.accounts);
        });
    });

    // Test device management (v0.13.23+)
    describe('Device Management', () => {
        beforeEach(() => {
            jest.spyOn(signalCli as any, 'sendJsonRpcRequest').mockResolvedValue({});
        });

        it('should list devices', async () => {
            const mockDevices = [
                { id: 1, name: 'Device 1' },
                { id: 2, name: 'Device 2' },
            ];
            const sendJsonRpcRequestSpy = jest
                .spyOn(signalCli as any, 'sendJsonRpcRequest')
                .mockResolvedValue(mockDevices);

            const result = await signalCli.listDevices();

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('listDevices', {
                account: '+1234567890',
            });
            expect(result).toEqual(mockDevices);
        });

        it('should update device name', async () => {
            const sendJsonRpcRequestSpy = jest
                .spyOn(signalCli as any, 'sendJsonRpcRequest')
                .mockResolvedValue(undefined);

            await signalCli.updateDevice({
                deviceId: 2,
                deviceName: 'My Updated Device',
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('updateDevice', {
                account: '+1234567890',
                deviceId: 2,
                deviceName: 'My Updated Device',
            });
        });

        it('should validate device ID when updating', async () => {
            await expect(
                signalCli.updateDevice({
                    deviceId: -1,
                    deviceName: 'Invalid',
                }),
            ).rejects.toThrow();
        });

        it('should validate device name length', async () => {
            const longName = 'a'.repeat(201);
            await expect(
                signalCli.updateDevice({
                    deviceId: 2,
                    deviceName: longName,
                }),
            ).rejects.toThrow();
        });
    });

    // Test v0.1.0 features: Synchronization
    describe('Synchronization', () => {
        beforeEach(() => {
            jest.spyOn(signalCli as any, 'sendJsonRpcRequest').mockResolvedValue({});
        });

        it('should send contacts to linked devices', async () => {
            const sendJsonRpcRequestSpy = jest.spyOn(signalCli as any, 'sendJsonRpcRequest').mockResolvedValue({});

            await signalCli.sendContacts();

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('sendContacts', {
                account: '+1234567890',
            });
        });

        it('should list groups with detailed information', async () => {
            const mockGroups = [
                {
                    id: 'group-1',
                    name: 'Test Group 1',
                    members: ['+1111111111', '+2222222222'],
                    groupType: 'GROUP_V2',
                },
                {
                    id: 'group-2',
                    name: 'Test Group 2',
                    members: ['+3333333333'],
                    groupType: 'GROUP_V2',
                },
            ];
            const sendJsonRpcRequestSpy = jest
                .spyOn(signalCli as any, 'sendJsonRpcRequest')
                .mockResolvedValue(mockGroups);

            const result = await signalCli.listGroupsDetailed({
                detailed: true,
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('listGroups', {
                account: '+1234567890',
                detailed: true,
            });
            expect(result).toEqual(mockGroups);
        });

        it('should filter groups by ID', async () => {
            const mockGroups = [
                {
                    id: 'group-1',
                    name: 'Specific Group',
                    members: ['+1111111111'],
                },
            ];
            const sendJsonRpcRequestSpy = jest
                .spyOn(signalCli as any, 'sendJsonRpcRequest')
                .mockResolvedValue(mockGroups);

            const result = await signalCli.listGroupsDetailed({
                groupIds: ['group-1'],
                detailed: true,
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('listGroups', {
                account: '+1234567890',
                detailed: true,
                groupId: ['group-1'],
            });
            expect(result).toEqual(mockGroups);
        });
    });
});
