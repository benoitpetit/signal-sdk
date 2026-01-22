/**
 * Tests for SignalCli methods
 * Covers additional methods not tested in SignalCli.test.ts
 */

import { SignalCli } from '../SignalCli';
import { spawn } from 'child_process';

jest.mock('child_process');

describe('SignalCli Methods Tests', () => {
    let signalCli: SignalCli;
    let mockProcess: any;
    let sendJsonRpcRequestSpy: jest.SpyInstance;

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
        
        // Mock sendJsonRpcRequest to avoid needing actual connection
        sendJsonRpcRequestSpy = jest.spyOn(signalCli as any, 'sendJsonRpcRequest').mockResolvedValue({});
    });

    afterEach(() => {
        if (signalCli) {
            signalCli.disconnect();
        }
        jest.clearAllMocks();
    });

    describe('Message Methods', () => {
        it('should send message to individual', async () => {
            await signalCli.sendMessage('+1234567890', 'Hello');
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('send', expect.objectContaining({
                message: 'Hello',
                recipients: ['+1234567890'],
                account: '+1234567890'
            }));
        });

        it('should send message to group', async () => {
            await signalCli.sendMessage('group123==', 'Hello group');
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('send', expect.objectContaining({
                message: 'Hello group',
                groupId: 'group123=='
            }));
        });

        it('should send message with attachments', async () => {
            await signalCli.sendMessage('+1234567890', 'Check this', { attachments: ['/path/to/file.jpg'] });
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('send', expect.objectContaining({
                attachments: ['/path/to/file.jpg']
            }));
        });

        it('should send message with expiration', async () => {
            await signalCli.sendMessage('+1234567890', 'Secret', { expiresInSeconds: 3600 });
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('send', expect.objectContaining({
                expiresInSeconds: 3600
            }));
        });

        it('should send view-once message', async () => {
            await signalCli.sendMessage('+1234567890', 'View once', { isViewOnce: true });
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('send', expect.objectContaining({
                isViewOnce: true
            }));
        });

        it('should send reaction', async () => {
            await signalCli.sendReaction('+1234567890', '+0987654321', 123456, '👍');
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('sendReaction', expect.objectContaining({
                emoji: '👍',
                targetAuthor: '+0987654321',
                targetTimestamp: 123456,
                remove: false,
                account: '+1234567890'
            }));
        });

        it('should send reaction with remove flag', async () => {
            await signalCli.sendReaction('+1234567890', '+0987654321', 123456, '👍', true);
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('sendReaction', expect.objectContaining({
                remove: true
            }));
        });

        it('should send reaction to group', async () => {
            await signalCli.sendReaction('group123==', '+0987654321', 123456, '👍');
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('sendReaction', expect.objectContaining({
                groupId: 'group123=='
            }));
        });

        it('should send typing indicator', async () => {
            await signalCli.sendTyping('+1234567890');
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('sendTyping', expect.objectContaining({
                when: true,
                recipients: ['+1234567890']
            }));
        });

        it('should stop typing indicator', async () => {
            await signalCli.sendTyping('+1234567890', true);
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('sendTyping', expect.objectContaining({
                when: false
            }));
        });

        it('should remote delete message', async () => {
            await signalCli.remoteDeleteMessage('+1234567890', 123456);
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('remoteDelete', expect.objectContaining({
                targetTimestamp: 123456,
                recipients: ['+1234567890']
            }));
        });
    });

    describe('Contact Methods', () => {
        it('should update contact', async () => {
            await signalCli.updateContact('+1234567890', 'John Doe');
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('updateContact', expect.objectContaining({
                recipient: '+1234567890',
                name: 'John Doe'
            }));
        });

        it('should update contact with options', async () => {
            await signalCli.updateContact('+1234567890', 'John Doe', { color: 'blue', muted: true });
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('updateContact', expect.objectContaining({
                name: 'John Doe',
                color: 'blue',
                muted: true
            }));
        });

        it('should block recipients', async () => {
            await signalCli.block(['+1111111111', '+2222222222']);
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('block', expect.objectContaining({
                recipient: ['+1111111111', '+2222222222']
            }));
        });

        it('should block group', async () => {
            await signalCli.block([], 'group123==');
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('block', expect.objectContaining({
                groupId: 'group123=='
            }));
        });

        it('should unblock recipients', async () => {
            await signalCli.unblock(['+1111111111']);
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('unblock', expect.objectContaining({
                recipient: ['+1111111111']
            }));
        });
    });

    describe('Group Methods', () => {
        it('should quit group', async () => {
            await signalCli.quitGroup('group123==');
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('quitGroup', expect.objectContaining({
                groupId: 'group123=='
            }));
        });

        it('should join group', async () => {
            await signalCli.joinGroup('https://signal.group/...');
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('joinGroup', expect.objectContaining({
                uri: 'https://signal.group/...'
            }));
        });
    });

    describe('Profile Methods', () => {
        it('should update profile with name only', async () => {
            await signalCli.updateProfile('John Doe');
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('updateProfile', expect.objectContaining({
                name: 'John Doe'
            }));
        });

        it('should update profile with all fields', async () => {
            await signalCli.updateProfile('John Doe', 'Hello!', '👋', '/path/to/avatar.jpg');
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('updateProfile', expect.objectContaining({
                name: 'John Doe',
                about: 'Hello!',
                aboutEmoji: '👋',
                avatar: '/path/to/avatar.jpg'
            }));
        });
    });

    describe('Receipt Methods', () => {
        it('should send read receipt', async () => {
            await signalCli.sendReceipt('+1234567890', 123456);
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('sendReceipt', expect.objectContaining({
                recipient: '+1234567890',
                targetTimestamp: 123456,
                type: 'read'
            }));
        });

        it('should send viewed receipt', async () => {
            await signalCli.sendReceipt('+1234567890', 123456, 'viewed');
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('sendReceipt', expect.objectContaining({
                type: 'viewed'
            }));
        });
    });

    describe('Sticker Methods', () => {
        it('should list sticker packs', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue([{ id: 'pack1', title: 'Pack 1' }]);
            
            const packs = await signalCli.listStickerPacks();
            
            expect(packs).toHaveLength(1);
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('listStickerPacks', expect.objectContaining({
                account: '+1234567890'
            }));
        });

        it('should add sticker pack', async () => {
            await signalCli.addStickerPack('packId123', 'packKey456');
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('addStickerPack', expect.objectContaining({
                packId: 'packId123',
                packKey: 'packKey456'
            }));
        });
    });

    describe('Account Methods', () => {
        it('should register account', async () => {
            await signalCli.register('+1234567890');
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('register', expect.objectContaining({
                account: '+1234567890'
            }));
        });

        it('should register with voice and captcha', async () => {
            await signalCli.register('+1234567890', true, 'captcha123');
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('register', expect.objectContaining({
                account: '+1234567890',
                voice: true,
                captcha: 'captcha123'
            }));
        });

        it('should verify account', async () => {
            await signalCli.verify('+1234567890', 'token123');
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('verify', expect.objectContaining({
                account: '+1234567890',
                token: 'token123'
            }));
        });

        it('should verify with PIN', async () => {
            await signalCli.verify('+1234567890', 'token123', '1234');
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('verify', expect.objectContaining({
                pin: '1234'
            }));
        });

        it('should unregister account', async () => {
            await signalCli.unregister();
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('unregister', expect.objectContaining({
                account: '+1234567890'
            }));
        });

        it('should delete local account data', async () => {
            await signalCli.deleteLocalAccountData();
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('deleteLocalAccountData', expect.objectContaining({
                account: '+1234567890'
            }));
        });

        it('should update account configuration', async () => {
            const config = { readReceipts: true, typingIndicators: true };
            await signalCli.updateAccountConfiguration(config);
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('updateConfiguration', expect.objectContaining({
                readReceipts: true,
                typingIndicators: true
            }));
        });
    });

    describe('Device Methods', () => {
        it('should remove device', async () => {
            await signalCli.removeDevice(2);
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('removeDevice', expect.objectContaining({
                deviceId: 2
            }));
        });
    });

    describe('PIN Methods', () => {
        it('should set PIN', async () => {
            await signalCli.setPin('1234');
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('setPin', expect.objectContaining({
                pin: '1234'
            }));
        });

        it('should remove PIN', async () => {
            await signalCli.removePin();
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('removePin', expect.objectContaining({
                account: '+1234567890'
            }));
        });
    });

    describe('Identity Methods', () => {
        it('should list all identities', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue([{ number: '+1111111111' }]);
            
            const identities = await signalCli.listIdentities();
            
            expect(identities).toHaveLength(1);
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('listIdentities', expect.objectContaining({
                account: '+1234567890'
            }));
        });

        it('should list identities for specific number', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue([{ number: '+1111111111' }]);
            
            await signalCli.listIdentities('+1111111111');
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('listIdentities', expect.objectContaining({
                number: '+1111111111'
            }));
        });

        it('should trust identity', async () => {
            await signalCli.trustIdentity('+1111111111', 'fingerprint123');
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('trust', expect.objectContaining({
                recipient: '+1111111111',
                safetyNumber: 'fingerprint123',
                verified: true
            }));
        });

        it('should trust identity with verified flag', async () => {
            await signalCli.trustIdentity('+1111111111', 'fingerprint123', false);
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('trust', expect.objectContaining({
                verified: false
            }));
        });
    });

    describe('Link Methods', () => {
        it('should initiate device link', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue({ uri: 'sgnl://link?...' });
            
            const uri = await signalCli.link('MyDevice');
            
            expect(uri).toBe('sgnl://link?...');
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('link', {
                deviceName: 'MyDevice'
            });
        });

        it('should link without device name', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue({ uri: 'sgnl://link?...' });
            
            await signalCli.link();
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('link', {
                deviceName: undefined
            });
        });
    });

    describe('Poll Methods', () => {
        it('should send poll create to group', async () => {
            await signalCli.sendPollCreate({
                question: 'What is your favorite color?',
                options: ['Red', 'Blue', 'Green'],
                groupId: 'group123=='
            });
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('sendPollCreate', expect.objectContaining({
                question: 'What is your favorite color?',
                options: ['Red', 'Blue', 'Green'],
                groupId: 'group123=='
            }));
        });

        it('should send poll create to recipients', async () => {
            await signalCli.sendPollCreate({
                question: 'What is your favorite color?',
                options: ['Red', 'Blue'],
                recipients: ['+1111111111', '+2222222222']
            });
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('sendPollCreate', expect.objectContaining({
                recipients: ['+1111111111', '+2222222222']
            }));
        });

        it('should send poll create with multiSelect', async () => {
            await signalCli.sendPollCreate({
                question: 'Select options',
                options: ['A', 'B', 'C'],
                groupId: 'group123==',
                multiSelect: true
            });
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('sendPollCreate', expect.objectContaining({
                multiSelect: true
            }));
        });

        it('should send poll vote to individual', async () => {
            await signalCli.sendPollVote('+1234567890', {
                pollAuthor: '+9876543210',
                pollTimestamp: 123456,
                optionIndexes: [0, 2]
            });
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('sendPollVote', expect.objectContaining({
                pollAuthor: '+9876543210',
                pollTimestamp: 123456,
                options: [0, 2],
                recipient: '+1234567890'
            }));
        });

        it('should send poll vote to group', async () => {
            await signalCli.sendPollVote('group123==', {
                pollAuthor: '+9876543210',
                pollTimestamp: 123456,
                optionIndexes: [1]
            });
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('sendPollVote', expect.objectContaining({
                groupId: 'group123=='
            }));
        });

        it('should send poll terminate', async () => {
            await signalCli.sendPollTerminate('+1234567890', {
                pollTimestamp: 123456
            });
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('sendPollTerminate', expect.objectContaining({
                pollTimestamp: 123456
            }));
        });
    });

    describe('Update Account Methods', () => {
        it('should update account with device name', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue({ username: 'user.123' });
            
            const result = await signalCli.updateAccount({ deviceName: 'New Device' });
            
            expect(result.success).toBe(true);
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('updateAccount', expect.objectContaining({
                deviceName: 'New Device'
            }));
        });

        it('should update account with username', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue({ username: 'newuser.456', usernameLink: 'link' });
            
            const result = await signalCli.updateAccount({ username: 'newuser.456' });
            
            expect(result.success).toBe(true);
            expect(result.username).toBe('newuser.456');
        });

        it('should delete username', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue({});
            
            await signalCli.updateAccount({ deleteUsername: true });
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('updateAccount', expect.objectContaining({
                deleteUsername: true
            }));
        });

        it('should update privacy settings', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue({});
            
            await signalCli.updateAccount({
                unrestrictedUnidentifiedSender: true,
                discoverableByNumber: false,
                numberSharing: false
            });
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('updateAccount', expect.objectContaining({
                unrestrictedUnidentifiedSender: true,
                discoverableByNumber: false,
                numberSharing: false
            }));
        });

        it('should handle update account error', async () => {
            sendJsonRpcRequestSpy.mockRejectedValue(new Error('Update failed'));
            
            const result = await signalCli.updateAccount({ deviceName: 'Device' });
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Update failed');
        });
    });

    describe('Attachment Methods', () => {
        it('should get attachment by ID', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue({ data: 'base64data...' });
            
            const data = await signalCli.getAttachment({ id: 'attachment123' });
            
            expect(data).toBe('base64data...');
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('getAttachment', expect.objectContaining({
                id: 'attachment123'
            }));
        });

        it('should get attachment with groupId', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue('base64data');
            
            await signalCli.getAttachment({ id: 'att1', groupId: 'group123==' });
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('getAttachment', expect.objectContaining({
                groupId: 'group123=='
            }));
        });

        it('should get attachment with recipient', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue('base64data');
            
            await signalCli.getAttachment({ id: 'att1', recipient: '+1111111111' });
            
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('getAttachment', expect.objectContaining({
                recipient: '+1111111111'
            }));
        });
    });
});
