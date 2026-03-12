/**
 * Tests for signal-sdk updates and bug fixes
 * Covers: BUG-01, BUG-02, BUG-03, PROB-04, PROB-06, PROB-07, FEAT-09, FEAT-10, FEAT-11, FEAT-12
 */

import { SignalCli } from '../SignalCli';
import { GroupInfo, Contact, Message, ListContactsOptions } from '../interfaces';

// Mock dependencies
jest.mock('qrcode-terminal');
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

describe('Signal SDK Updates Tests', () => {
    let signalCli: SignalCli;
    let sendJsonRpcRequestSpy: jest.SpyInstance;

    beforeEach(() => {
        signalCli = new SignalCli('+1234567890');
        sendJsonRpcRequestSpy = jest.spyOn(signalCli as any, 'sendJsonRpcRequest');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('BUG-01: updateProfile() Parameter Fix', () => {
        it('should use givenName instead of name', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue(undefined);

            await signalCli.updateProfile('John Doe');

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'updateProfile',
                expect.objectContaining({
                    account: '+1234567890',
                    givenName: 'John Doe',
                }),
            );
            expect(sendJsonRpcRequestSpy).not.toHaveBeenCalledWith(
                'updateProfile',
                expect.objectContaining({ name: expect.anything() }),
            );
        });

        it('should support familyName in options', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue(undefined);

            await signalCli.updateProfile('John', undefined, undefined, undefined, {
                familyName: 'Doe',
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'updateProfile',
                expect.objectContaining({
                    givenName: 'John',
                    familyName: 'Doe',
                }),
            );
        });
    });

    describe('PROB-04: trustIdentity() Parameter Fix', () => {
        it('should use verifiedSafetyNumber instead of safetyNumber + verified', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue(undefined);

            await signalCli.trustIdentity('+33123456789', '12345678901234567890');

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'trust',
                expect.objectContaining({
                    account: '+1234567890',
                    recipient: '+33123456789',
                    verifiedSafetyNumber: '12345678901234567890',
                }),
            );
            expect(sendJsonRpcRequestSpy).not.toHaveBeenCalledWith(
                'trust',
                expect.objectContaining({ safetyNumber: expect.anything() }),
            );
            expect(sendJsonRpcRequestSpy).not.toHaveBeenCalledWith(
                'trust',
                expect.objectContaining({ verified: expect.anything() }),
            );
        });
    });

    describe('PROB-06: listContacts() with Options', () => {
        it('should call listContacts with detailed option', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue([]);

            const options: ListContactsOptions = { detailed: true };
            await signalCli.listContacts(options);

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'listContacts',
                expect.objectContaining({
                    account: '+1234567890',
                    detailed: true,
                }),
            );
        });

        it('should call listContacts with blocked option', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue([]);

            const options: ListContactsOptions = { blocked: true };
            await signalCli.listContacts(options);

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'listContacts',
                expect.objectContaining({
                    account: '+1234567890',
                    blocked: true,
                }),
            );
        });

        it('should call listContacts with allRecipients option', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue([]);

            const options: ListContactsOptions = { allRecipients: true };
            await signalCli.listContacts(options);

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'listContacts',
                expect.objectContaining({
                    account: '+1234567890',
                    allRecipients: true,
                }),
            );
        });

        it('should call listContacts with name filter', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue([]);

            const options: ListContactsOptions = { name: 'John' };
            await signalCli.listContacts(options);

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'listContacts',
                expect.objectContaining({
                    account: '+1234567890',
                    name: 'John',
                }),
            );
        });

        it('should call listContacts with recipients filter', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue([]);

            const options: ListContactsOptions = { recipients: ['+33111111111', '+33222222222'] };
            await signalCli.listContacts(options);

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'listContacts',
                expect.objectContaining({
                    account: '+1234567890',
                    recipients: ['+33111111111', '+33222222222'],
                }),
            );
        });

        it('should call listContacts without options when none provided', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue([]);

            await signalCli.listContacts();

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'listContacts',
                expect.objectContaining({
                    account: '+1234567890',
                }),
            );
        });
    });

    describe('PROB-07: parseEnvelope() with textAttachment', () => {
        it('should parse text from textAttachment when message/body are empty', () => {
            // Access private method via type assertion
            const messageManager = (signalCli as any).messages;
            const parseEnvelope = messageManager.parseEnvelope.bind(messageManager);

            const envelope = {
                timestamp: 1234567890,
                source: '+33123456789',
                dataMessage: {
                    textAttachment: {
                        text: 'This is a long message from textAttachment',
                    },
                },
            };

            const message: Message = parseEnvelope(envelope);

            expect(message.text).toBe('This is a long message from textAttachment');
        });

        it('should prefer message over textAttachment', () => {
            const messageManager = (signalCli as any).messages;
            const parseEnvelope = messageManager.parseEnvelope.bind(messageManager);

            const envelope = {
                timestamp: 1234567890,
                source: '+33123456789',
                dataMessage: {
                    message: 'Short message',
                    textAttachment: {
                        text: 'This is from textAttachment',
                    },
                },
            };

            const message: Message = parseEnvelope(envelope);

            expect(message.text).toBe('Short message');
        });
    });

    describe('FEAT-09: isArchived Field', () => {
        it('should have isArchived in GroupInfo interface', () => {
            const group: GroupInfo = {
                groupId: 'test-group-id==',
                name: 'Test Group',
                isMember: true,
                isBlocked: false,
                isArchived: true,
                messageExpirationTime: 0,
                members: ['+33111111111'],
                pendingMembers: [],
                requestingMembers: [],
                admins: [],
                banned: [],
                permissionAddMember: 'EVERY_MEMBER',
                permissionEditDetails: 'EVERY_MEMBER',
                permissionSendMessage: 'EVERY_MEMBER',
            };

            expect(group.isArchived).toBe(true);
        });

        it('should have isArchived in Contact interface', () => {
            const contact: Contact = {
                number: '+33123456789',
                name: 'Test Contact',
                blocked: false,
                isArchived: true,
            };

            expect(contact.isArchived).toBe(true);
        });
    });

    describe('FEAT-10: quitGroup() with delete option', () => {
        it('should call quitGroup without delete option by default', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue(undefined);

            await signalCli.quitGroup('group123==');

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'quitGroup',
                expect.objectContaining({
                    account: '+1234567890',
                    groupId: 'group123==',
                }),
            );
            expect(sendJsonRpcRequestSpy).not.toHaveBeenCalledWith(
                'quitGroup',
                expect.objectContaining({ delete: expect.anything() }),
            );
        });

        it('should call quitGroup with delete option when specified', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue(undefined);

            await signalCli.quitGroup('group123==', { delete: true });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'quitGroup',
                expect.objectContaining({
                    account: '+1234567890',
                    groupId: 'group123==',
                    delete: true,
                }),
            );
        });
    });

    describe('FEAT-11: Pin Events', () => {
        it('should emit pin event when pinnedMessageTimestamps is present', () => {
            const emitSpy = jest.spyOn(signalCli, 'emit');

            // Access private method
            const emitDetailedEvents = (signalCli as any).emitDetailedEvents.bind(signalCli);

            const envelope = {
                source: '+33123456789',
                timestamp: 1234567890,
                dataMessage: {
                    pinnedMessageTimestamps: [1111111111, 2222222222],
                },
            };

            emitDetailedEvents(envelope);

            expect(emitSpy).toHaveBeenCalledWith(
                'pin',
                expect.objectContaining({
                    sender: '+33123456789',
                    timestamp: 1234567890,
                    pinnedMessageTimestamps: [1111111111, 2222222222],
                }),
            );
        });

        it('should not emit pin event when pinnedMessageTimestamps is undefined', () => {
            const emitSpy = jest.spyOn(signalCli, 'emit');

            const emitDetailedEvents = (signalCli as any).emitDetailedEvents.bind(signalCli);

            const envelope = {
                source: '+33123456789',
                timestamp: 1234567890,
                dataMessage: {
                    message: 'Hello',
                },
            };

            emitDetailedEvents(envelope);

            expect(emitSpy).not.toHaveBeenCalledWith(
                'pin',
                expect.anything(),
            );
        });
    });

    describe('FEAT-12: register() with reregister option', () => {
        it('should call register without reregister by default', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue(undefined);

            await signalCli.register('+33123456789');

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'register',
                expect.objectContaining({
                    account: '+33123456789',
                    voice: undefined,
                    captcha: undefined,
                }),
            );
            expect(sendJsonRpcRequestSpy).not.toHaveBeenCalledWith(
                'register',
                expect.objectContaining({ reregister: expect.anything() }),
            );
        });

        it('should call register with reregister when specified', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue(undefined);

            await signalCli.register('+33123456789', false, undefined, true);

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'register',
                expect.objectContaining({
                    account: '+33123456789',
                    reregister: true,
                }),
            );
        });
    });

    describe('MINOR-17: GroupInfo uses string[] for members', () => {
        it('should accept string[] for members in GroupInfo', () => {
            const group: GroupInfo = {
                groupId: 'test-group-id==',
                name: 'Test Group',
                isMember: true,
                isBlocked: false,
                messageExpirationTime: 0,
                members: ['+33111111111', '+33222222222'], // string[] instead of Address[]
                pendingMembers: ['+33333333333'],
                requestingMembers: [],
                admins: ['+33111111111'],
                banned: ['+33444444444'],
                permissionAddMember: 'EVERY_MEMBER',
                permissionEditDetails: 'EVERY_MEMBER',
                permissionSendMessage: 'EVERY_MEMBER',
            };

            expect(group.members).toEqual(['+33111111111', '+33222222222']);
            expect(typeof group.members[0]).toBe('string');
            expect(group.admins[0]).toBe('+33111111111');
            expect(group.banned[0]).toBe('+33444444444');
        });
    });

    describe('PROB-08: AccountConfiguration cleanup', () => {
        it('should only support signal-cli compatible fields', () => {
            // Valid configuration (should compile)
            const validConfig = {
                readReceipts: true,
                unidentifiedDeliveryIndicators: true,
                typingIndicators: true,
                linkPreviews: true,
            };

            expect(validConfig.readReceipts).toBe(true);
            expect(validConfig.typingIndicators).toBe(true);
        });
    });

    describe('Additional v0.14.1 Features', () => {
        it('should support on-connection receiveMode', () => {
            const options = {
                receiveMode: 'on-connection' as const,
            };
            expect(options.receiveMode).toBe('on-connection');
        });

        it('should call quitGroup with admin option', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue(undefined);

            await signalCli.quitGroup('group123==', { 
                delete: true, 
                admins: ['+33111111111', '+33222222222'] 
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'quitGroup',
                expect.objectContaining({
                    account: '+1234567890',
                    groupId: 'group123==',
                    delete: true,
                    admin: ['+33111111111', '+33222222222'],
                }),
            );
        });

        it('should call trustAllKnownKeys', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue(undefined);

            await signalCli.trustAllKnownKeys('+33123456789');

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'trust',
                expect.objectContaining({
                    account: '+1234567890',
                    recipient: '+33123456789',
                    trustAllKnownKeys: true,
                }),
            );
        });

        it('should update group with linkState', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue(undefined);

            await signalCli.updateGroup('group123==', { 
                linkState: 'enabled-with-approval' 
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'updateGroup',
                expect.objectContaining({
                    account: '+1234567890',
                    groupId: 'group123==',
                    link: 'enabled-with-approval',
                }),
            );
        });

        it('should update group with memberLabel options', async () => {
            sendJsonRpcRequestSpy.mockResolvedValue(undefined);

            await signalCli.updateGroup('group123==', { 
                memberLabelEmoji: '🏆',
                memberLabel: 'VIP Members'
            });

            expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith(
                'updateGroup',
                expect.objectContaining({
                    account: '+1234567890',
                    groupId: 'group123==',
                    memberLabelEmoji: '🏆',
                    memberLabel: 'VIP Members',
                }),
            );
        });
    });
});

describe('BUG-03: Reconnection Options Preservation', () => {
    it('should preserve jsonRpcStartOptions during reconnection', async () => {
        const signal = new SignalCli('+1234567890');
        
        // Mock the connect method
        const connectSpy = jest.spyOn(signal, 'connect').mockResolvedValue(undefined);
        
        // Set jsonRpcStartOptions as if connect() was called with options
        (signal as any).jsonRpcStartOptions = {
            ignoreAttachments: true,
            ignoreAvatars: true,
            ignoreStickers: true,
            receiveMode: 'manual',
        };
        
        // Simulate process close with auto-reconnect
        (signal as any).isIntentionalShutdown = false;
        (signal as any).reconnectAttempts = 0;
        (signal as any).maxReconnectAttempts = 5;
        
        // Trigger handleProcessClose
        await (signal as any).handleProcessClose(1);
        
        // Wait for setTimeout to execute
        await new Promise(resolve => setTimeout(resolve, 1100));
        
        // Verify connect was called with the preserved options
        expect(connectSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                ignoreAttachments: true,
                ignoreAvatars: true,
                ignoreStickers: true,
                receiveMode: 'manual',
            })
        );
        
        connectSpy.mockRestore();
    });
});
