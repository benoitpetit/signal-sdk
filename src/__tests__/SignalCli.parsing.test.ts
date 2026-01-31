/**
 * Tests for enhanced parsing functionality (Phase 5)
 * Tests profile and group data parsing methods
 */

import { SignalCli } from '../SignalCli';
import { Contact, GroupInfo } from '../interfaces';

describe('SignalCli - Enhanced Parsing (Phase 5)', () => {
    let signal: SignalCli;

    beforeEach(() => {
        signal = new SignalCli('+33123456789');
        // Mock sendJsonRpcRequest to avoid actual signal-cli calls
        (signal as any).sendJsonRpcRequest = jest.fn();
    });

    describe('parseContactProfile', () => {
        it('should parse contact with full profile data', () => {
            const contact: Contact = {
                number: '+33123456789',
                name: 'John Doe',
                uuid: 'test-uuid',
                blocked: false,
                givenName: 'John',
                familyName: 'Doe',
                mobileCoinAddress: 'mc1_test_address_123',
                profileName: 'John Doe',
            };

            const parsed = signal.parseContactProfile(contact);

            expect(parsed.givenName).toBe('John');
            expect(parsed.familyName).toBe('Doe');
            expect(parsed.mobileCoinAddress).toBe('mc1_test_address_123');
            expect(parsed.profileName).toBe('John Doe');
        });

        it('should build profileName from givenName and familyName if missing', () => {
            const contact: Contact = {
                number: '+33123456789',
                name: 'John Doe',
                uuid: 'test-uuid',
                blocked: false,
                givenName: 'John',
                familyName: 'Doe',
            };

            const parsed = signal.parseContactProfile(contact);

            expect(parsed.profileName).toBe('John Doe');
        });

        it('should use givenName as profileName if no familyName', () => {
            const contact: Contact = {
                number: '+33123456789',
                name: 'John',
                uuid: 'test-uuid',
                blocked: false,
                givenName: 'John',
            };

            const parsed = signal.parseContactProfile(contact);

            expect(parsed.profileName).toBe('John');
        });

        it('should handle contact with minimal data', () => {
            const contact: Contact = {
                number: '+33123456789',
                name: 'Unknown',
                blocked: false,
            };

            const parsed = signal.parseContactProfile(contact);

            expect(parsed.givenName).toBeUndefined();
            expect(parsed.familyName).toBeUndefined();
            expect(parsed.mobileCoinAddress).toBeUndefined();
        });

        it('should preserve additional contact fields', () => {
            const contact: Contact = {
                number: '+33123456789',
                name: 'John Doe',
                uuid: 'test-uuid',
                blocked: true,
                profileAvatar: 'avatar.jpg',
                color: 'blue',
                archived: true,
                mutedUntil: 123456789,
                hideStory: true,
                givenName: 'John',
            };

            const parsed = signal.parseContactProfile(contact);

            expect(parsed.blocked).toBe(true);
            expect(parsed.profileAvatar).toBe('avatar.jpg');
            expect(parsed.color).toBe('blue');
            expect(parsed.archived).toBe(true);
            expect(parsed.mutedUntil).toBe(123456789);
            expect(parsed.hideStory).toBe(true);
        });
    });

    describe('parseGroupDetails', () => {
        it('should parse group with full membership data', () => {
            const group: GroupInfo = {
                groupId: 'group123==',
                name: 'Test Group',
                description: 'A test group',
                isMember: true,
                isBlocked: false,
                messageExpirationTime: 0,
                members: [{ number: '+33111111111' }, { number: '+33222222222' }],
                pendingMembers: [{ number: '+33333333333' }],
                requestingMembers: [],
                admins: [{ number: '+33111111111' }],
                banned: [{ number: '+33444444444' }],
                permissionAddMember: 'ONLY_ADMINS',
                permissionEditDetails: 'ONLY_ADMINS',
                permissionSendMessage: 'EVERY_MEMBER',
                groupInviteLink: 'https://signal.group/test',
            };

            const parsed = signal.parseGroupDetails(group);

            expect(parsed.pendingMembers).toHaveLength(1);
            expect(parsed.pendingMembers[0].number).toBe('+33333333333');
            expect(parsed.banned).toHaveLength(1);
            expect(parsed.banned[0].number).toBe('+33444444444');
            expect(parsed.inviteLink).toBe('https://signal.group/test');
            expect(parsed.groupInviteLink).toBe('https://signal.group/test');
        });

        it('should normalize inviteLink field', () => {
            const group1: GroupInfo = {
                groupId: 'group123==',
                name: 'Test Group',
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
                groupInviteLink: 'https://signal.group/test1',
            };

            const parsed1 = signal.parseGroupDetails(group1);
            expect(parsed1.inviteLink).toBe('https://signal.group/test1');
            expect(parsed1.groupInviteLink).toBe('https://signal.group/test1');

            const group2: GroupInfo = {
                ...group1,
                groupInviteLink: undefined,
                inviteLink: 'https://signal.group/test2',
            };

            const parsed2 = signal.parseGroupDetails(group2);
            expect(parsed2.inviteLink).toBe('https://signal.group/test2');
            expect(parsed2.groupInviteLink).toBe('https://signal.group/test2');
        });

        it('should ensure membership arrays exist', () => {
            const group: GroupInfo = {
                groupId: 'group123==',
                name: 'Minimal Group',
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
            };

            const parsed = signal.parseGroupDetails(group);

            expect(Array.isArray(parsed.members)).toBe(true);
            expect(Array.isArray(parsed.pendingMembers)).toBe(true);
            expect(Array.isArray(parsed.requestingMembers)).toBe(true);
            expect(Array.isArray(parsed.admins)).toBe(true);
            expect(Array.isArray(parsed.banned)).toBe(true);
        });

        it('should preserve group permissions', () => {
            const group: GroupInfo = {
                groupId: 'group123==',
                name: 'Restricted Group',
                isMember: true,
                isBlocked: false,
                messageExpirationTime: 3600,
                members: [],
                pendingMembers: [],
                requestingMembers: [],
                admins: [],
                banned: [],
                permissionAddMember: 'ONLY_ADMINS',
                permissionEditDetails: 'ONLY_ADMINS',
                permissionSendMessage: 'ONLY_ADMINS',
            };

            const parsed = signal.parseGroupDetails(group);

            expect(parsed.permissionAddMember).toBe('ONLY_ADMINS');
            expect(parsed.permissionEditDetails).toBe('ONLY_ADMINS');
            expect(parsed.permissionSendMessage).toBe('ONLY_ADMINS');
            expect(parsed.messageExpirationTime).toBe(3600);
        });
    });

    describe('getContactsWithProfiles', () => {
        it('should return enriched contacts list', async () => {
            const mockContacts: Contact[] = [
                {
                    number: '+33111111111',
                    name: 'Alice',
                    blocked: false,
                    givenName: 'Alice',
                    familyName: 'Smith',
                },
                {
                    number: '+33222222222',
                    name: 'Bob',
                    blocked: false,
                    givenName: 'Bob',
                    mobileCoinAddress: 'mc1_bob',
                },
            ];

            (signal as any).sendJsonRpcRequest = jest.fn().mockResolvedValue(mockContacts);

            const enriched = await signal.getContactsWithProfiles();

            expect(enriched).toHaveLength(2);
            expect(enriched[0].profileName).toBe('Alice Smith');
            expect(enriched[1].profileName).toBe('Bob');
            expect(enriched[1].mobileCoinAddress).toBe('mc1_bob');
        });
    });

    describe('getGroupsWithDetails', () => {
        it('should return enriched groups list', async () => {
            const mockGroups: GroupInfo[] = [
                {
                    groupId: 'group1==',
                    name: 'Group 1',
                    isMember: true,
                    isBlocked: false,
                    messageExpirationTime: 0,
                    members: [{ number: '+33111111111' }],
                    pendingMembers: [{ number: '+33222222222' }],
                    requestingMembers: [],
                    admins: [{ number: '+33111111111' }],
                    banned: [],
                    permissionAddMember: 'EVERY_MEMBER',
                    permissionEditDetails: 'EVERY_MEMBER',
                    permissionSendMessage: 'EVERY_MEMBER',
                    groupInviteLink: 'https://signal.group/group1',
                },
            ];

            (signal as any).sendJsonRpcRequest = jest.fn().mockResolvedValue(mockGroups);

            const enriched = await signal.getGroupsWithDetails();

            expect(enriched).toHaveLength(1);
            expect(enriched[0].inviteLink).toBe('https://signal.group/group1');
            expect(enriched[0].pendingMembers).toHaveLength(1);
        });

        it('should support list options', async () => {
            (signal as any).sendJsonRpcRequest = jest.fn().mockResolvedValue([]);

            await signal.getGroupsWithDetails({ detailed: true });

            expect((signal as any).sendJsonRpcRequest).toHaveBeenCalledWith(
                'listGroups',
                expect.objectContaining({ detailed: true }),
            );
        });
    });
});
