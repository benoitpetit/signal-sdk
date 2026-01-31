/**
 * Advanced Features Tests for SignalCli
 * Tests for new features added for 100% signal-cli coverage
 */

import { SignalCli } from '../SignalCli';
import { ReceiveOptions, SendMessageOptions } from '../interfaces';

describe('SignalCli Advanced Features', () => {
    let signalCli: SignalCli;
    let sendJsonRpcRequestSpy: jest.SpyInstance;

    beforeEach(() => {
        signalCli = new SignalCli('+1234567890');
        sendJsonRpcRequestSpy = jest
            .spyOn(signalCli as any, 'sendJsonRpcRequest')
            .mockResolvedValue({ timestamp: Date.now(), results: [] });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Advanced sendMessage Options', () => {
        it('should send message with text styles', async () => {
            await signalCli.sendMessage('+33123456789', 'Hello *bold* text', {
                textStyles: [{ start: 6, length: 6, style: 'BOLD' }],
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'send',
                expect.objectContaining({
                    message: 'Hello *bold* text',
                    textStyles: [{ start: 6, length: 6, style: 'BOLD' }],
                }),
            );
        });

        it('should send message with mentions', async () => {
            await signalCli.sendMessage('+33123456789', 'Hello @John', {
                mentions: [{ start: 6, length: 5, number: '+33111111111' }],
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'send',
                expect.objectContaining({
                    message: 'Hello @John',
                    mentions: [{ start: 6, length: 5, number: '+33111111111' }],
                }),
            );
        });

        it('should send message with preview URL', async () => {
            await signalCli.sendMessage('+33123456789', 'Check this out', {
                previewUrl: 'https://example.com',
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'send',
                expect.objectContaining({
                    message: 'Check this out',
                    previewUrl: 'https://example.com',
                }),
            );
        });

        it('should send message with quote and advanced fields', async () => {
            await signalCli.sendMessage('+33123456789', 'I agree!', {
                quote: {
                    timestamp: 123456789,
                    author: '+33111111111',
                    text: 'Original message',
                    mentions: [{ start: 0, length: 5, number: '+33222222222' }],
                    textStyles: [{ start: 0, length: 8, style: 'BOLD' }],
                },
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'send',
                expect.objectContaining({
                    message: 'I agree!',
                    quoteTimestamp: 123456789,
                    quoteAuthor: '+33111111111',
                    quoteMessage: 'Original message',
                    quoteMentions: [{ start: 0, length: 5, number: '+33222222222' }],
                    quoteTextStyles: [{ start: 0, length: 8, style: 'BOLD' }],
                }),
            );
        });

        it('should send message edit', async () => {
            await signalCli.sendMessage('+33123456789', 'Corrected text', {
                editTimestamp: 123456789,
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'send',
                expect.objectContaining({
                    message: 'Corrected text',
                    editTimestamp: 123456789,
                }),
            );
        });

        it('should send reply to story', async () => {
            await signalCli.sendMessage('+33123456789', 'Nice story!', {
                storyTimestamp: 123456789,
                storyAuthor: '+33111111111',
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'send',
                expect.objectContaining({
                    message: 'Nice story!',
                    storyTimestamp: 123456789,
                    storyAuthor: '+33111111111',
                }),
            );
        });

        it('should send message with noteToSelf flag', async () => {
            await signalCli.sendMessage('+1234567890', 'Note to myself', {
                noteToSelf: true,
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'send',
                expect.objectContaining({
                    message: 'Note to myself',
                    noteToSelf: true,
                }),
            );
        });

        it('should send message with endSession flag', async () => {
            await signalCli.sendMessage('+33123456789', 'Goodbye', {
                endSession: true,
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'send',
                expect.objectContaining({
                    message: 'Goodbye',
                    endSession: true,
                }),
            );
        });
    });

    describe('receive() Method', () => {
        it('should receive messages with default options', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue([
                {
                    timestamp: 123456789,
                    source: '+33123456789',
                    dataMessage: { message: 'Hello!' },
                },
            ]);

            const messages = await signalCli.receive();

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'receive',
                expect.objectContaining({
                    account: '+1234567890',
                }),
            );
            expect(messages).toHaveLength(1);
            expect(messages[0].text).toBe('Hello!');
        });

        it('should receive messages with custom timeout', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue([]);

            await signalCli.receive({ timeout: 10 });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'receive',
                expect.objectContaining({
                    timeout: 10,
                }),
            );
        });

        it('should receive messages with maxMessages limit', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue([]);

            await signalCli.receive({ maxMessages: 5 });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'receive',
                expect.objectContaining({
                    maxMessages: 5,
                }),
            );
        });

        it('should receive messages with ignoreAttachments', async () => {
            await signalCli.receive({ ignoreAttachments: true });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'receive',
                expect.objectContaining({
                    ignoreAttachments: true,
                }),
            );
        });

        it('should receive messages with ignoreStories', async () => {
            await signalCli.receive({ ignoreStories: true });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'receive',
                expect.objectContaining({
                    ignoreStories: true,
                }),
            );
        });

        it('should receive messages with sendReadReceipts', async () => {
            await signalCli.receive({ sendReadReceipts: true });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'receive',
                expect.objectContaining({
                    sendReadReceipts: true,
                }),
            );
        });

        it('should handle empty message array', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue([]);

            const messages = await signalCli.receive();

            expect(messages).toEqual([]);
        });
    });

    describe('Username Management Helpers', () => {
        it('should set username', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue({
                username: 'myuser.123',
                usernameLink: 'https://signal.me/#myuser.123',
            });

            const result = await signalCli.setUsername('myuser');

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'updateAccount',
                expect.objectContaining({
                    username: 'myuser',
                }),
            );
            expect(result.success).toBe(true);
            expect(result.username).toBe('myuser.123');
        });

        it('should delete username', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue({});

            const result = await signalCli.deleteUsername();

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'updateAccount',
                expect.objectContaining({
                    deleteUsername: true,
                }),
            );
            expect(result.success).toBe(true);
        });
    });

    describe('Advanced Identity Management', () => {
        it('should get safety number', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue([
                {
                    number: '+33123456789',
                    safetyNumber: '12345 67890 12345 67890 12345 67890',
                    trustLevel: 'TRUSTED',
                },
            ]);

            const safetyNumber = await signalCli.getSafetyNumber('+33123456789');

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'listIdentities',
                expect.objectContaining({
                    number: '+33123456789',
                }),
            );
            expect(safetyNumber).toBe('12345 67890 12345 67890 12345 67890');
        });

        it('should return null when safety number not found', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue([]);

            const safetyNumber = await signalCli.getSafetyNumber('+33123456789');

            expect(safetyNumber).toBeNull();
        });

        it('should verify safety number successfully', async () => {
            // Mock listIdentities response
            sendJsonRpcRequestSpy.mockResolvedValueOnce([
                {
                    number: '+33123456789',
                    safetyNumber: '12345 67890 12345 67890 12345 67890',
                    trustLevel: 'TRUSTED',
                },
            ]);
            // Mock trustIdentity response
            sendJsonRpcRequestSpy.mockResolvedValueOnce({});

            const verified = await signalCli.verifySafetyNumber('+33123456789', '12345 67890 12345 67890 12345 67890');

            expect(verified).toBe(true);
            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'trust',
                expect.objectContaining({
                    recipient: '+33123456789',
                }),
            );
        });

        it('should fail to verify incorrect safety number', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue([
                {
                    number: '+33123456789',
                    safetyNumber: '12345 67890 12345 67890 12345 67890',
                    trustLevel: 'TRUSTED',
                },
            ]);

            const verified = await signalCli.verifySafetyNumber('+33123456789', '99999 99999 99999 99999 99999 99999');

            expect(verified).toBe(false);
        });

        it('should list untrusted identities', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue([
                { number: '+33111111111', trustLevel: 'TRUSTED' },
                { number: '+33222222222', trustLevel: 'UNTRUSTED' },
                { number: '+33333333333', trustLevel: 'TRUST_ON_FIRST_USE' },
                { number: '+33444444444' },
            ]);

            const untrusted = await signalCli.listUntrustedIdentities();

            expect(untrusted).toHaveLength(3);
            expect(untrusted.map((i) => i.number)).toEqual(['+33222222222', '+33333333333', '+33444444444']);
        });
    });

    describe('Advanced Group Management', () => {
        it('should send group invite link', async () => {
            // Mock listGroups response
            sendJsonRpcRequestSpy.mockResolvedValueOnce([
                {
                    groupId: 'group123==',
                    name: 'Test Group',
                    groupInviteLink: 'https://signal.group/...',
                },
            ]);
            // Mock sendMessage response
            sendJsonRpcRequestSpy.mockResolvedValueOnce({ timestamp: Date.now() });

            await signalCli.sendGroupInviteLink('group123==', '+33123456789');

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'send',
                expect.objectContaining({
                    message: expect.stringContaining('https://signal.group/'),
                    recipients: ['+33123456789'],
                }),
            );
        });

        it('should throw error when group has no invite link', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue([
                {
                    groupId: 'group123==',
                    name: 'Test Group',
                },
            ]);

            await expect(signalCli.sendGroupInviteLink('group123==', '+33123456789')).rejects.toThrow(
                'Group not found or does not have an invite link',
            );
        });

        it('should set banned members', async () => {
            await signalCli.setBannedMembers('group123==', ['+33111111111', '+33222222222']);

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'updateGroup',
                expect.objectContaining({
                    groupId: 'group123==',
                    banMembers: ['+33111111111', '+33222222222'],
                }),
            );
        });

        it('should reset group link', async () => {
            await signalCli.resetGroupLink('group123==');

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'updateGroup',
                expect.objectContaining({
                    groupId: 'group123==',
                    resetLink: true,
                }),
            );
        });
    });
});
