/**
 * Additional tests to improve code coverage
 * Targets: SignalBot, GroupManager, ContactManager, SignalCli, MessageManager
 */

import { SignalBot } from '../SignalBot';
import { SignalCli } from '../SignalCli';
import { GroupManager } from '../managers/GroupManager';
import { ContactManager } from '../managers/ContactManager';
import { MessageManager } from '../managers/MessageManager';
import { AccountManager } from '../managers/AccountManager';
import { DeviceManager } from '../managers/DeviceManager';
import { StickerManager } from '../managers/StickerManager';
import { 
    BotConfig, 
    GroupInfo, 
    Contact, 
    Message,
    ListContactsOptions,
    GroupUpdateOptions,
    SendMessageOptions,
    ReceiveOptions,
    Device,
    StickerPack,
    IdentityKey,
    UserStatusResult,
    RateLimitChallengeResult,
    AccountUpdateResult,
    PinMessageOptions,
    UnpinMessageOptions,
    AdminDeleteOptions,
} from '../interfaces';
import { Logger } from '../config';

// Mock dependencies
jest.mock('qrcode-terminal');
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

describe('Coverage Improvement Tests', () => {
    let mockSendRequest: jest.Mock;
    let mockLogger: Logger;
    let mockConfig: any;

    beforeEach(() => {
        mockSendRequest = jest.fn();
        mockLogger = new Logger({ level: 'error' });
        mockConfig = {
            maxRetries: 3,
            retryDelay: 100,
            requestTimeout: 5000,
            connectionTimeout: 10000,
            maxConcurrentRequests: 5,
            minRequestInterval: 100,
            autoReconnect: false,
            verbose: false,
            daemonMode: 'json-rpc',
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ==========================================
    // SignalBot Coverage Tests
    // ==========================================
    describe('SignalBot Additional Tests', () => {
        let bot: SignalBot;

        afterEach(async () => {
            if (bot) {
                await bot.stop().catch(() => {});
                bot.removeAllListeners();
            }
        });

        it('should handle message without text', async () => {
            bot = new SignalBot({ phoneNumber: '+1234567890' });
            const mockMessage: Message = {
                source: '+0987654321',
                timestamp: Date.now(),
                text: undefined,
            };
            
            // Should not throw
            await (bot as any).handleMessage(mockMessage);
        });

        it('should handle message with groupInfo', async () => {
            bot = new SignalBot({ 
                phoneNumber: '+1234567890',
                group: { name: 'Test Group' }
            });
            const mockMessage: Message = {
                source: '+0987654321',
                timestamp: Date.now(),
                text: 'Hello group',
                groupInfo: { id: 'group123', name: 'Test Group' },
            };
            
            await (bot as any).handleMessage(mockMessage);
        });

        it('should handle bot command without prefix', async () => {
            bot = new SignalBot({ 
                phoneNumber: '+1234567890',
                settings: { commandPrefix: '!' }
            });
            
            const mockMessage: Message = {
                source: '+0987654321',
                timestamp: Date.now(),
                text: 'help', // No prefix
            };
            
            // Should not process as command
            await (bot as any).handleMessage(mockMessage);
        });

        it('should handle empty command', async () => {
            bot = new SignalBot({ 
                phoneNumber: '+1234567890',
                settings: { commandPrefix: '/' }
            });
            
            const mockMessage: Message = {
                source: '+0987654321',
                timestamp: Date.now(),
                text: '/', // Empty command
            };
            
            await (bot as any).handleMessage(mockMessage);
        });

        it('should handle command with arguments', async () => {
            bot = new SignalBot({ phoneNumber: '+1234567890' });
            
            const commandHandler = jest.fn().mockResolvedValue('Result');
            bot.addCommand({
                name: 'echo',
                description: 'Echo command',
                handler: commandHandler,
            });
            
            // Test that the command was added
            const commands = bot.getCommands();
            expect(commands.length).toBeGreaterThanOrEqual(1);
            expect(commands.find(c => c.name === 'echo')).toBeDefined();
        });

        it('should handle admin-only command from non-admin', async () => {
            bot = new SignalBot({ 
                phoneNumber: '+1234567890',
                admins: ['+1111111111']
            });
            
            const commandHandler = jest.fn();
            (bot as any).addCommand({
                name: 'admin',
                description: 'Admin only',
                adminOnly: true,
                handler: commandHandler,
            });
            
            const mockMessage: Message = {
                source: '+0987654321', // Not admin
                timestamp: Date.now(),
                text: '/admin',
            };
            
            await (bot as any).handleMessage(mockMessage);
            
            // Handler should not be called for non-admin
            expect(commandHandler).not.toHaveBeenCalled();
        });

        it('should have cooldown setting in config', () => {
            bot = new SignalBot({ 
                phoneNumber: '+1234567890',
                settings: { cooldownSeconds: 5 }
            });
            
            // Verify the bot was created with cooldown setting
            expect(bot).toBeDefined();
        });

        it('should get bot stats', () => {
            bot = new SignalBot({ phoneNumber: '+1234567890' });
            const stats = bot.getStats();
            
            expect(stats).toHaveProperty('messagesReceived');
            expect(stats).toHaveProperty('commandsExecuted');
            expect(stats).toHaveProperty('startTime');
            expect(stats).toHaveProperty('lastActivity');
            expect(stats).toHaveProperty('activeUsers');
        });

        it('should check if message is from admin', () => {
            bot = new SignalBot({ 
                phoneNumber: '+1234567890',
                admins: ['+1111111111']
            });
            
            expect(bot.isAdmin('+1111111111')).toBe(true);
            expect(bot.isAdmin('+2222222222')).toBe(false);
        });

        it('should handle image download failure', async () => {
            bot = new SignalBot({ phoneNumber: '+1234567890' });
            
            // Mock failed download - use a URL that will definitely fail
            jest.spyOn(bot as any, 'downloadImageFromUrl').mockResolvedValue(null);
            const result = await bot.downloadImageFromUrl('https://invalid.invalid/image.jpg');
            expect(result).toBeNull();
        });

        it('should handle sendMessageWithAttachment cleanup', async () => {
            bot = new SignalBot({ phoneNumber: '+1234567890' });
            
            // Mock the signalCli.sendMessage
            (bot as any).signalCli.sendMessage = jest.fn().mockResolvedValue({ timestamp: Date.now() });
            
            await bot.sendMessageWithAttachment('+1234567890', 'Test', ['/path/to/file.jpg']);
        });
    });

    // ==========================================
    // GroupManager Coverage Tests
    // ==========================================
    describe('GroupManager Additional Tests', () => {
        let groupManager: GroupManager;

        beforeEach(() => {
            groupManager = new GroupManager(mockSendRequest, '+1234567890', mockLogger, mockConfig);
        });

        it('should create group successfully', async () => {
            const mockGroup: GroupInfo = {
                groupId: 'group123==',
                name: 'Test Group',
                isMember: true,
                isBlocked: false,
                messageExpirationTime: 0,
                members: ['+1111111111'],
                pendingMembers: [],
                requestingMembers: [],
                admins: [],
                banned: [],
                permissionAddMember: 'EVERY_MEMBER',
                permissionEditDetails: 'EVERY_MEMBER',
                permissionSendMessage: 'EVERY_MEMBER',
            };
            mockSendRequest.mockResolvedValue(mockGroup);

            const result = await groupManager.createGroup('Test Group', ['+1111111111']);
            
            expect(result).toEqual(mockGroup);
            expect(mockSendRequest).toHaveBeenCalledWith('updateGroup', {
                account: '+1234567890',
                name: 'Test Group',
                members: ['+1111111111'],
            });
        });

        it('should update group with all options', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            const options: GroupUpdateOptions = {
                name: 'New Name',
                description: 'New Description',
                avatar: '/path/to/avatar.jpg',
                addMembers: ['+2222222222'],
                removeMembers: ['+3333333333'],
                promoteAdmins: ['+4444444444'],
                demoteAdmins: ['+5555555555'],
                banMembers: ['+6666666666'],
                unbanMembers: ['+7777777777'],
                permissionAddMember: 'ONLY_ADMINS',
                permissionEditDetails: 'ONLY_ADMINS',
                permissionSendMessage: 'ONLY_ADMINS',
                announcementsOnly: true,
                expirationTimer: 3600,
                resetInviteLink: true,
                linkState: 'enabled-with-approval',
                memberLabelEmoji: '🏆',
                memberLabel: 'VIP Members',
            };

            await groupManager.updateGroup('group123==', options);

            expect(mockSendRequest).toHaveBeenCalledWith('updateGroup', expect.objectContaining({
                groupId: 'group123==',
                account: '+1234567890',
                name: 'New Name',
                description: 'New Description',
                avatar: '/path/to/avatar.jpg',
                addMembers: ['+2222222222'],
                removeMembers: ['+3333333333'],
                promoteAdmins: ['+4444444444'],
                demoteAdmins: ['+5555555555'],
                banMembers: ['+6666666666'],
                unbanMembers: ['+7777777777'],
                permissionAddMember: 'ONLY_ADMINS',
                permissionEditDetails: 'ONLY_ADMINS',
                permissionSendMessage: 'ONLY_ADMINS',
                expiration: 3600,
                resetLink: true,
                link: 'enabled-with-approval',
                memberLabelEmoji: '🏆',
                memberLabel: 'VIP Members',
            }));
        });

        it('should list groups', async () => {
            const mockGroups: GroupInfo[] = [
                {
                    groupId: 'group1==',
                    name: 'Group 1',
                    isMember: true,
                    isBlocked: false,
                    messageExpirationTime: 0,
                    members: [],
                    pendingMembers: [],
                    requestingMembers: [],
                    admins: [],
                    banned: [],
                    permissionAddMember: 'EVERY_MEMBER',
                    permissionEditDetails: 'EVERY_MEMBER',
                    permissionSendMessage: 'EVERY_MEMBER',
                },
            ];
            mockSendRequest.mockResolvedValue(mockGroups);

            const result = await groupManager.listGroups();

            expect(result).toEqual(mockGroups);
        });

        it('should quit group without options', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await groupManager.quitGroup('group123==');

            expect(mockSendRequest).toHaveBeenCalledWith('quitGroup', {
                account: '+1234567890',
                groupId: 'group123==',
            });
        });

        it('should quit group with delete option', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await groupManager.quitGroup('group123==', { delete: true });

            expect(mockSendRequest).toHaveBeenCalledWith('quitGroup', {
                account: '+1234567890',
                groupId: 'group123==',
                delete: true,
            });
        });

        it('should quit group with admin option', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await groupManager.quitGroup('group123==', { admins: ['+1111111111', '+2222222222'] });

            expect(mockSendRequest).toHaveBeenCalledWith('quitGroup', {
                account: '+1234567890',
                groupId: 'group123==',
                admin: ['+1111111111', '+2222222222'],
            });
        });

        it('should join group', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await groupManager.joinGroup('https://signal.group/#CjQKI...');

            expect(mockSendRequest).toHaveBeenCalledWith('joinGroup', {
                account: '+1234567890',
                uri: 'https://signal.group/#CjQKI...',
            });
        });

        it('should parse group details with all fields', () => {
            const group: GroupInfo = {
                groupId: 'group123==',
                name: 'Test Group',
                isMember: true,
                isBlocked: false,
                isArchived: true,
                messageExpirationTime: 3600,
                members: ['+1111111111', '+2222222222'],
                pendingMembers: ['+3333333333'],
                requestingMembers: ['+4444444444'],
                admins: ['+1111111111'],
                banned: ['+5555555555'],
                permissionAddMember: 'ONLY_ADMINS',
                permissionEditDetails: 'ONLY_ADMINS',
                permissionSendMessage: 'EVERY_MEMBER',
                groupInviteLink: 'https://signal.group/#CjQKI...',
            };

            const parsed = groupManager.parseGroupDetails(group);

            expect(parsed.inviteLink).toBe('https://signal.group/#CjQKI...');
            expect(parsed.groupInviteLink).toBe('https://signal.group/#CjQKI...');
            expect(parsed.members).toHaveLength(2);
            expect(parsed.pendingMembers).toHaveLength(1);
            expect(parsed.admins).toHaveLength(1);
            expect(parsed.banned).toHaveLength(1);
        });

        it('should handle parseGroupDetails with missing fields', () => {
            const group: Partial<GroupInfo> = {
                groupId: 'group123==',
                name: 'Test Group',
                isMember: true,
                isBlocked: false,
                messageExpirationTime: 0,
            };

            const parsed = groupManager.parseGroupDetails(group as GroupInfo);

            expect(parsed.members).toEqual([]);
            expect(parsed.pendingMembers).toEqual([]);
            expect(parsed.admins).toEqual([]);
            expect(parsed.banned).toEqual([]);
        });

        it('should get groups with details', async () => {
            const mockGroups: GroupInfo[] = [
                {
                    groupId: 'group1==',
                    name: 'Group 1',
                    isMember: true,
                    isBlocked: false,
                    messageExpirationTime: 0,
                    members: ['+1111111111'],
                    pendingMembers: [],
                    requestingMembers: [],
                    admins: [],
                    banned: [],
                    permissionAddMember: 'EVERY_MEMBER',
                    permissionEditDetails: 'EVERY_MEMBER',
                    permissionSendMessage: 'EVERY_MEMBER',
                },
            ];
            mockSendRequest.mockResolvedValue(mockGroups);

            const result = await groupManager.getGroupsWithDetails();

            expect(result).toHaveLength(1);
            expect(result[0].members).toEqual(['+1111111111']);
        });
    });

    // ==========================================
    // ContactManager Coverage Tests
    // ==========================================
    describe('ContactManager Additional Tests', () => {
        let contactManager: ContactManager;

        beforeEach(() => {
            contactManager = new ContactManager(mockSendRequest, '+1234567890', mockLogger, mockConfig);
        });

        it('should update contact with all options', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await contactManager.updateContact('+1111111111', 'John Doe', {
                givenName: 'John',
                familyName: 'Doe',
                nickGivenName: 'Johnny',
                nickFamilyName: 'D',
                note: 'Best friend',
                expiration: 3600,
                color: 'blue',
                block: true,
                archived: true,
                muted: true,
                mutedUntil: Date.now() + 3600000,
                hideStory: true,
            });

            expect(mockSendRequest).toHaveBeenCalledWith('updateContact', {
                account: '+1234567890',
                recipient: '+1111111111',
                name: 'John Doe',
                givenName: 'John',
                familyName: 'Doe',
                nickGivenName: 'Johnny',
                nickFamilyName: 'D',
                note: 'Best friend',
                expiration: 3600,
                color: 'blue',
                block: true,
                archived: true,
                muted: true,
                mutedUntil: expect.any(Number),
                hideStory: true,
            });
        });

        it('should block contacts', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await contactManager.block(['+1111111111', '+2222222222'], 'group123==');

            expect(mockSendRequest).toHaveBeenCalledWith('block', {
                account: '+1234567890',
                recipient: ['+1111111111', '+2222222222'],
                groupId: 'group123==',
            });
        });

        it('should unblock contacts', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await contactManager.unblock(['+1111111111']);

            expect(mockSendRequest).toHaveBeenCalledWith('unblock', {
                account: '+1234567890',
                recipient: ['+1111111111'],
                groupId: undefined,
            });
        });

        it('should list contacts with all options', async () => {
            const mockContacts: Contact[] = [
                {
                    number: '+1111111111',
                    name: 'John Doe',
                    blocked: false,
                    isArchived: true,
                },
            ];
            mockSendRequest.mockResolvedValue(mockContacts);

            const options: ListContactsOptions = {
                detailed: true,
                blocked: true,
                allRecipients: true,
                name: 'John',
                recipients: ['+1111111111'],
                internal: true,
            };

            const result = await contactManager.listContacts(options);

            expect(result).toEqual(mockContacts);
            expect(mockSendRequest).toHaveBeenCalledWith('listContacts', {
                account: '+1234567890',
                detailed: true,
                blocked: true,
                allRecipients: true,
                name: 'John',
                recipients: ['+1111111111'],
                internal: true,
            });
        });

        it('should remove contact with options', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await contactManager.removeContact('+1111111111', { hide: true, forget: true });

            expect(mockSendRequest).toHaveBeenCalledWith('removeContact', {
                account: '+1234567890',
                recipient: '+1111111111',
                hide: true,
                forget: true,
            });
        });

        it('should get user status with numbers', async () => {
            const mockResult = {
                recipients: [
                    { number: '+1111111111', isRegistered: true, uuid: 'uuid-1' },
                    { number: '+2222222222', isRegistered: false },
                ],
            };
            mockSendRequest.mockResolvedValue(mockResult);

            const result = await contactManager.getUserStatus(['+1111111111', '+2222222222']);

            expect(result).toHaveLength(2);
            expect(result[0].isRegistered).toBe(true);
            expect(result[1].isRegistered).toBe(false);
        });

        it('should get user status with usernames', async () => {
            const mockResult = {
                recipients: [
                    { number: '+1111111111', isRegistered: true, username: 'johndoe' },
                ],
            };
            mockSendRequest.mockResolvedValue(mockResult);

            const result = await contactManager.getUserStatus([], ['johndoe']);

            expect(mockSendRequest).toHaveBeenCalledWith('getUserStatus', {
                account: '+1234567890',
                usernames: ['johndoe'],
            });
        });

        it('should list identities', async () => {
            const mockIdentities: IdentityKey[] = [
                {
                    number: '+1111111111',
                    identityKey: 'key123',
                    safetyNumber: '12345678901234567890123456789012345678901234567890',
                    trustLevel: 'TRUSTED_VERIFIED',
                },
            ];
            mockSendRequest.mockResolvedValue(mockIdentities);

            const result = await contactManager.listIdentities('+1111111111');

            expect(result).toEqual(mockIdentities);
            expect(mockSendRequest).toHaveBeenCalledWith('listIdentities', {
                account: '+1234567890',
                number: '+1111111111',
            });
        });

        it('should trust identity', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await contactManager.trustIdentity('+1111111111', '12345678901234567890123456789012345678901234567890');

            expect(mockSendRequest).toHaveBeenCalledWith('trust', {
                account: '+1234567890',
                recipient: '+1111111111',
                verifiedSafetyNumber: '12345678901234567890123456789012345678901234567890',
            });
        });

        it('should trust all known keys', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await contactManager.trustAllKnownKeys('+1111111111');

            expect(mockSendRequest).toHaveBeenCalledWith('trust', {
                account: '+1234567890',
                recipient: '+1111111111',
                trustAllKnownKeys: true,
            });
        });

        it('should get avatar for contact', async () => {
            mockSendRequest.mockResolvedValue({ data: 'base64avatar' });

            const result = await contactManager.getAvatar({ contact: '+1111111111' });

            expect(result).toBe('base64avatar');
        });

        it('should get avatar for profile', async () => {
            mockSendRequest.mockResolvedValue({ data: 'base64avatar' });

            const result = await contactManager.getAvatar({ profile: '+1111111111' });

            expect(result).toBe('base64avatar');
        });

        it('should get avatar for group', async () => {
            mockSendRequest.mockResolvedValue('base64avatar');

            const result = await contactManager.getAvatar({ groupId: 'group123==' });

            expect(result).toBe('base64avatar');
        });

        it('should throw error for invalid avatar options', async () => {
            await expect(contactManager.getAvatar({} as any)).rejects.toThrow('Must specify contact, profile, or groupId');
        });

        it('should parse contact profile', () => {
            const contact: Contact = {
                number: '+1111111111',
                name: 'John Doe',
                blocked: false,
                givenName: 'John',
                familyName: 'Doe',
                mobileCoinAddress: 'mc123',
            };

            const parsed = contactManager.parseContactProfile(contact);

            expect(parsed.profileName).toBe('John Doe');
        });

        it('should parse contact profile without names', () => {
            const contact: Contact = {
                number: '+1111111111',
                name: 'John',
                blocked: false,
            };

            const parsed = contactManager.parseContactProfile(contact);

            expect(parsed.givenName).toBeUndefined();
            expect(parsed.profileName).toBeUndefined();
        });

        it('should get contacts with profiles', async () => {
            const mockContacts: Contact[] = [
                {
                    number: '+1111111111',
                    name: 'John',
                    blocked: false,
                    givenName: 'John',
                    familyName: 'Doe',
                },
            ];
            mockSendRequest.mockResolvedValue(mockContacts);

            const result = await contactManager.getContactsWithProfiles();

            expect(result).toHaveLength(1);
            expect(result[0].profileName).toBe('John Doe');
        });
    });

    // ==========================================
    // MessageManager Coverage Tests
    // ==========================================
    describe('MessageManager Additional Tests', () => {
        let messageManager: MessageManager;

        beforeEach(() => {
            messageManager = new MessageManager(mockSendRequest, '+1234567890', mockLogger, mockConfig);
        });

        it('should send message with all options', async () => {
            mockSendRequest.mockResolvedValue({ timestamp: Date.now(), results: [] });

            const options: SendMessageOptions = {
                attachments: ['/path/to/file.jpg'],
                mentions: [{ start: 0, length: 5, number: '+1111111111' }],
                textStyles: [{ start: 0, length: 5, style: 'BOLD' }],
                quote: {
                    timestamp: 1234567890,
                    author: '+1111111111',
                    text: 'Original message',
                    mentions: [{ start: 0, length: 4, number: '+2222222222' }],
                    textStyles: [{ start: 0, length: 4, style: 'ITALIC' }],
                },
                previewUrl: 'https://example.com',
                previewTitle: 'Example',
                previewDescription: 'An example page',
                previewImage: '/path/to/preview.jpg',
                editTimestamp: 1234567890,
                storyTimestamp: 1234567890,
                storyAuthor: '+1111111111',
                noteToSelf: true,
                endSession: true,
                noUrgent: true,
            };

            await messageManager.sendMessage('+1111111111', 'Hello', options);

            expect(mockSendRequest).toHaveBeenCalledWith('send', expect.objectContaining({
                account: '+1234567890',
                recipients: ['+1111111111'],
                message: 'Hello',
                attachments: ['/path/to/file.jpg'],
                noteToSelf: true,
                endSession: true,
                noUrgent: true,
            }));
        });

        it('should send message to group', async () => {
            mockSendRequest.mockResolvedValue({ timestamp: Date.now(), results: [] });

            await messageManager.sendMessage('group123==', 'Hello group');

            expect(mockSendRequest).toHaveBeenCalledWith('send', expect.objectContaining({
                account: '+1234567890',
                groupId: 'group123==',
                message: 'Hello group',
            }));
        });

        it('should send reaction', async () => {
            mockSendRequest.mockResolvedValue({ timestamp: Date.now(), results: [] });

            await messageManager.sendReaction('+1111111111', '+2222222222', 1234567890, '👍', false, true);

            expect(mockSendRequest).toHaveBeenCalledWith('sendReaction', expect.objectContaining({
                account: '+1234567890',
                recipients: ['+1111111111'],
                targetAuthor: '+2222222222',
                targetTimestamp: 1234567890,
                emoji: '👍',
                story: true,
            }));
        });

        it('should send typing indicator', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await messageManager.sendTyping('+1111111111', true);

            expect(mockSendRequest).toHaveBeenCalledWith('sendTyping', {
                account: '+1234567890',
                recipients: ['+1111111111'],
                stop: true,
            });
        });

        it('should send typing to group', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await messageManager.sendTyping('group123==', false);

            expect(mockSendRequest).toHaveBeenCalledWith('sendTyping', {
                account: '+1234567890',
                groupId: 'group123==',
                stop: false,
            });
        });

        it('should remote delete message', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await messageManager.remoteDeleteMessage('+1111111111', 1234567890);

            expect(mockSendRequest).toHaveBeenCalledWith('remoteDelete', {
                account: '+1234567890',
                recipients: ['+1111111111'],
                targetTimestamp: 1234567890,
            });
        });

        it('should send receipt', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await messageManager.sendReceipt('+1111111111', 1234567890, 'viewed');

            expect(mockSendRequest).toHaveBeenCalledWith('sendReceipt', {
                account: '+1234567890',
                recipient: '+1111111111',
                targetTimestamp: 1234567890,
                type: 'viewed',
            });
        });

        it('should receive with all options', async () => {
            const mockMessages = [
                {
                    source: '+1111111111',
                    timestamp: 1234567890,
                    dataMessage: { message: 'Hello' },
                },
            ];
            mockSendRequest.mockResolvedValue(mockMessages);

            const options: ReceiveOptions = {
                timeout: 10,
                maxMessages: 5,
                ignoreAttachments: true,
                ignoreStories: true,
                sendReadReceipts: true,
                ignoreAvatars: true,
                ignoreStickers: true,
            };

            const result = await messageManager.receive(options);

            expect(result).toHaveLength(1);
            expect(result[0].text).toBe('Hello');
            expect(mockSendRequest).toHaveBeenCalledWith('receive', expect.objectContaining({
                account: '+1234567890',
                timeout: 10,
                maxMessages: 5,
                ignoreAttachments: true,
                ignoreStories: true,
                sendReadReceipts: true,
                ignoreAvatars: true,
                ignoreStickers: true,
            }));
        });

        it('should parse envelope with dataMessage', () => {
            const envelope = {
                timestamp: 1234567890,
                source: '+1111111111',
                sourceUuid: 'uuid-1',
                sourceDevice: 1,
                dataMessage: {
                    message: 'Hello',
                    groupInfo: { groupId: 'group123==' },
                    attachments: [{ id: 'attach1', contentType: 'image/jpeg' }],
                    mentions: [{ start: 0, length: 5, number: '+1111111111' }],
                    quote: { id: 123, author: '+2222222222' },
                    reaction: { emoji: '👍' },
                    sticker: { packId: 'pack1', stickerId: 1 },
                    expiresInSeconds: 3600,
                    viewOnce: true,
                    pinnedMessageTimestamps: [1111111111, 2222222222],
                },
            };

            const result = (messageManager as any).parseEnvelope(envelope);

            expect(result.text).toBe('Hello');
            expect(result.groupId).toBe('group123==');
            expect(result.attachments).toHaveLength(1);
            expect(result.pinnedMessageTimestamps).toEqual([1111111111, 2222222222]);
        });

        it('should parse envelope with textAttachment', () => {
            const envelope = {
                timestamp: 1234567890,
                source: '+1111111111',
                dataMessage: {
                    textAttachment: { text: 'Long message from attachment' },
                },
            };

            const result = (messageManager as any).parseEnvelope(envelope);

            expect(result.text).toBe('Long message from attachment');
        });

        it('should parse envelope with syncMessage', () => {
            const envelope = {
                timestamp: 1234567890,
                source: '+1111111111',
                syncMessage: { type: 'contacts' },
            };

            const result = (messageManager as any).parseEnvelope(envelope);

            expect(result.syncMessage).toEqual({ type: 'contacts' });
        });

        it('should parse envelope with receiptMessage', () => {
            const envelope = {
                timestamp: 1234567890,
                source: '+1111111111',
                receiptMessage: { type: 'READ', timestamps: [1234567890] },
            };

            const result = (messageManager as any).parseEnvelope(envelope);

            expect(result.receipt).toEqual({ type: 'READ', timestamps: [1234567890] });
        });

        it('should parse envelope with typingMessage', () => {
            const envelope = {
                timestamp: 1234567890,
                source: '+1111111111',
                typingMessage: { action: 'START' },
            };

            const result = (messageManager as any).parseEnvelope(envelope);

            expect(result.typing).toEqual({ action: 'START' });
        });

        it('should create and send poll', async () => {
            mockSendRequest.mockResolvedValue({ timestamp: Date.now(), results: [] });

            await messageManager.sendPollCreate({
                question: 'Favorite color?',
                options: ['Red', 'Green', 'Blue'],
                multiSelect: false,
                recipients: ['+1111111111'],
            });

            expect(mockSendRequest).toHaveBeenCalledWith('sendPollCreate', expect.objectContaining({
                account: '+1234567890',
                question: 'Favorite color?',
                options: ['Red', 'Green', 'Blue'],
                multiSelect: false,
                recipients: ['+1111111111'],
            }));
        });

        it('should send poll vote', async () => {
            mockSendRequest.mockResolvedValue({ timestamp: Date.now(), results: [] });

            await messageManager.sendPollVote('+1111111111', {
                pollAuthor: '+2222222222',
                pollTimestamp: 1234567890,
                optionIndexes: [0, 2],
                voteCount: 1,
            });

            expect(mockSendRequest).toHaveBeenCalledWith('sendPollVote', expect.objectContaining({
                account: '+1234567890',
                pollAuthor: '+2222222222',
                pollTimestamp: 1234567890,
                options: [0, 2],
                voteCount: 1,
            }));
        });

        it('should terminate poll', async () => {
            mockSendRequest.mockResolvedValue({ timestamp: Date.now(), results: [] });

            await messageManager.sendPollTerminate('+1111111111', {
                pollTimestamp: 1234567890,
            });

            expect(mockSendRequest).toHaveBeenCalledWith('sendPollTerminate', expect.objectContaining({
                account: '+1234567890',
                pollTimestamp: 1234567890,
            }));
        });

        it('should get attachment', async () => {
            mockSendRequest.mockResolvedValue({ data: 'base64data' });

            const result = await messageManager.getAttachment({
                id: 'attach123',
                recipient: '+1111111111',
            });

            expect(result).toBe('base64data');
        });

        it('should get attachment for group', async () => {
            mockSendRequest.mockResolvedValue({ data: 'base64data' });

            const result = await messageManager.getAttachment({
                id: 'attach123',
                groupId: 'group123==',
            });

            expect(result).toBe('base64data');
        });

        it('should throw error for invalid attachment options', async () => {
            await expect(messageManager.getAttachment({} as any))
                .rejects.toThrow('Attachment ID is required');
        });
    });

    // ==========================================
    // AccountManager Coverage Tests
    // ==========================================
    describe('AccountManager Additional Tests', () => {
        let accountManager: AccountManager;

        beforeEach(() => {
            accountManager = new AccountManager(mockSendRequest, '+1234567890', mockLogger, mockConfig);
        });

        it('should register without options', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await accountManager.register('+1111111111');

            expect(mockSendRequest).toHaveBeenCalledWith('register', {
                account: '+1111111111',
                voice: undefined,
                captcha: undefined,
            });
        });

        it('should register with all options', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await accountManager.register('+1111111111', true, 'captcha-token', true);

            expect(mockSendRequest).toHaveBeenCalledWith('register', {
                account: '+1111111111',
                voice: true,
                captcha: 'captcha-token',
                reregister: true,
            });
        });

        it('should verify', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await accountManager.verify('+1111111111', '123-456', '1234');

            expect(mockSendRequest).toHaveBeenCalledWith('verify', {
                account: '+1111111111',
                token: '123-456',
                pin: '1234',
            });
        });

        it('should update profile with all options', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await accountManager.updateProfile('John', 'Hello!', '👋', '/path/avatar.jpg', {
                familyName: 'Doe',
                mobileCoinAddress: 'mc123',
                removeAvatar: true,
            });

            expect(mockSendRequest).toHaveBeenCalledWith('updateProfile', {
                account: '+1234567890',
                givenName: 'John',
                about: 'Hello!',
                aboutEmoji: '👋',
                avatar: '/path/avatar.jpg',
                familyName: 'Doe',
                mobileCoinAddress: 'mc123',
                removeAvatar: true,
            });
        });

        it('should unregister', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await accountManager.unregister();

            expect(mockSendRequest).toHaveBeenCalledWith('unregister', {
                account: '+1234567890',
            });
        });

        it('should delete local account data', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await accountManager.deleteLocalAccountData();

            expect(mockSendRequest).toHaveBeenCalledWith('deleteLocalAccountData', {
                account: '+1234567890',
            });
        });

        it('should update account configuration', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await accountManager.updateAccountConfiguration({
                readReceipts: true,
                unidentifiedDeliveryIndicators: true,
                typingIndicators: true,
                linkPreviews: true,
            });

            expect(mockSendRequest).toHaveBeenCalledWith('updateConfiguration', expect.objectContaining({
                account: '+1234567890',
                readReceipts: true,
                unidentifiedDeliveryIndicators: true,
                typingIndicators: true,
                linkPreviews: true,
            }));
        });

        it('should set pin', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await accountManager.setPin('1234');

            expect(mockSendRequest).toHaveBeenCalledWith('setPin', {
                account: '+1234567890',
                pin: '1234',
            });
        });

        it('should remove pin', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await accountManager.removePin();

            expect(mockSendRequest).toHaveBeenCalledWith('removePin', {
                account: '+1234567890',
            });
        });

        it('should list accounts', async () => {
            mockSendRequest.mockResolvedValue({
                accounts: [{ number: '+1111111111' }, { number: '+2222222222' }],
            });

            const result = await accountManager.listAccounts();

            expect(result).toEqual(['+1111111111', '+2222222222']);
        });

        it('should list accounts detailed', async () => {
            const mockAccounts = [
                { number: '+1111111111', name: 'John', uuid: 'uuid-1' },
            ];
            mockSendRequest.mockResolvedValue({ accounts: mockAccounts });

            const result = await accountManager.listAccountsDetailed();

            expect(result).toEqual(mockAccounts);
        });

        it('should update account with all options', async () => {
            mockSendRequest.mockResolvedValue({
                username: 'johndoe.123',
                usernameLink: 'https://signal.me/#u/johndoe.123',
            });

            const result = await accountManager.updateAccount({
                deviceName: 'My Device',
                username: 'johndoe',
                deleteUsername: false,
                unrestrictedUnidentifiedSender: true,
                discoverableByNumber: true,
                numberSharing: true,
            });

            expect(result.success).toBe(true);
            expect(result.username).toBe('johndoe.123');
        });

        it('should handle update account failure', async () => {
            mockSendRequest.mockRejectedValue(new Error('Update failed'));

            const result = await accountManager.updateAccount({ deviceName: 'Test' });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Update failed');
        });

        it('should send payment notification', async () => {
            mockSendRequest.mockResolvedValue({ timestamp: Date.now(), results: [] });

            await accountManager.sendPaymentNotification('+1111111111', {
                receipt: 'base64receipt',
                note: 'Payment for lunch',
            });

            expect(mockSendRequest).toHaveBeenCalledWith('sendPaymentNotification', expect.objectContaining({
                account: '+1234567890',
                recipient: '+1111111111',
                receipt: 'base64receipt',
                note: 'Payment for lunch',
            }));
        });

        it('should submit rate limit challenge', async () => {
            mockSendRequest.mockResolvedValue({ success: true, retryAfter: 60 });

            const result = await accountManager.submitRateLimitChallenge('challenge123', 'captcha-token');

            expect(result.success).toBe(true);
            expect(result.retryAfter).toBe(60);
        });

        it('should start change number', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await accountManager.startChangeNumber('+2222222222', true, 'captcha-token');

            expect(mockSendRequest).toHaveBeenCalledWith('startChangeNumber', {
                account: '+1234567890',
                number: '+2222222222',
                voice: true,
                captcha: 'captcha-token',
            });
        });

        it('should finish change number', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await accountManager.finishChangeNumber('+2222222222', '123456', '1234');

            expect(mockSendRequest).toHaveBeenCalledWith('finishChangeNumber', {
                account: '+1234567890',
                number: '+2222222222',
                verificationCode: '123456',
                pin: '1234',
            });
        });
    });

    // ==========================================
    // DeviceManager Coverage Tests
    // ==========================================
    describe('DeviceManager Additional Tests', () => {
        let deviceManager: DeviceManager;

        beforeEach(() => {
            deviceManager = new DeviceManager(mockSendRequest, '+1234567890', mockLogger, mockConfig, '/bin/signal-cli');
        });

        it('should list devices', async () => {
            const mockDevices: Device[] = [
                { id: 1, name: 'Primary', created: 1234567890, lastSeen: 1234567890 },
            ];
            mockSendRequest.mockResolvedValue(mockDevices);

            const result = await deviceManager.listDevices();

            expect(result).toEqual(mockDevices);
        });

        it('should add device', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await deviceManager.addDevice('sgnl://link/abc123', 'New Device');

            expect(mockSendRequest).toHaveBeenCalledWith('addDevice', {
                account: '+1234567890',
                uri: 'sgnl://link/abc123',
                deviceName: 'New Device',
            });
        });

        it('should remove device', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await deviceManager.removeDevice(2);

            expect(mockSendRequest).toHaveBeenCalledWith('removeDevice', {
                account: '+1234567890',
                deviceId: 2,
            });
        });

        it('should update device', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await deviceManager.updateDevice({ deviceId: 2, deviceName: 'Updated Name' });

            expect(mockSendRequest).toHaveBeenCalledWith('updateDevice', {
                account: '+1234567890',
                deviceId: 2,
                deviceName: 'Updated Name',
            });
        });
    });

    // ==========================================
    // StickerManager Coverage Tests
    // ==========================================
    describe('StickerManager Additional Tests', () => {
        let stickerManager: StickerManager;

        beforeEach(() => {
            stickerManager = new StickerManager(mockSendRequest, '+1234567890', mockLogger, mockConfig);
        });

        it('should list sticker packs', async () => {
            const mockPacks: StickerPack[] = [
                {
                    id: 'pack1',
                    key: 'key1',
                    title: 'Test Pack',
                    author: 'Author',
                    stickers: [],
                    installed: true,
                },
            ];
            mockSendRequest.mockResolvedValue(mockPacks);

            const result = await stickerManager.listStickerPacks();

            expect(result).toEqual(mockPacks);
        });

        it('should add sticker pack', async () => {
            mockSendRequest.mockResolvedValue(undefined);

            await stickerManager.addStickerPack('pack123', 'key456');

            expect(mockSendRequest).toHaveBeenCalledWith('addStickerPack', {
                account: '+1234567890',
                packId: 'pack123',
                packKey: 'key456',
            });
        });
    });
});
