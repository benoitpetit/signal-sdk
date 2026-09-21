import { BaseManager } from './BaseManager';
import { GroupInfo, GroupUpdateOptions, ListGroupsOptions } from '../interfaces';
import { validateGroupId } from '../validators';
import { withRetry } from '../retry';

export class GroupManager extends BaseManager {
    async createGroup(name: string, members: string[]): Promise<GroupInfo> {
        return withRetry(
            async () => this.normalizeGroup(await this.sendRequest('updateGroup', { account: this.account, name, members })),
            { maxAttempts: this.config.maxRetries, initialDelay: this.config.retryDelay, enabled: this.config.enableRetry }
        );
    }

    async updateGroup(groupId: string, options: GroupUpdateOptions): Promise<void> {
        return withRetry(async () => {
            validateGroupId(groupId);
            const params: Record<string, unknown> = { groupId, account: this.account };
            if (options.name) params.name = options.name;
            if (options.description) params.description = options.description;
            if (options.avatar) params.avatar = options.avatar;
            if (options.addMembers) params.member = options.addMembers;
            if (options.removeMembers) params.removeMember = options.removeMembers;
            if (options.promoteAdmins) params.admin = options.promoteAdmins;
            if (options.demoteAdmins) params.removeAdmin = options.demoteAdmins;
            if (options.banMembers) params.ban = options.banMembers;
            if (options.unbanMembers) params.unban = options.unbanMembers;
            // signal-cli's JSON-RPC name follows the CLI flag --reset-link.
            if (options.resetInviteLink) params.resetLink = true;
            if (options.linkState) {
                params.link = options.linkState === 'enabled-with-approval' ? 'enabledWithApproval' : options.linkState;
            }
            if (options.memberLabelEmoji) params.memberLabelEmoji = options.memberLabelEmoji;
            if (options.memberLabel) params.memberLabel = options.memberLabel;
            if (options.permissionAddMember) params.setPermissionAddMember = this.toSignalPermission(options.permissionAddMember);
            if (options.permissionEditDetails) params.setPermissionEditDetails = this.toSignalPermission(options.permissionEditDetails);
            if (options.permissionSendMessage) params.setPermissionSendMessages = this.toSignalPermission(options.permissionSendMessage);
            if (options.announcementsOnly) params.setPermissionSendMessages = 'only-admins';
            if (options.expirationTimer !== undefined) params.expiration = options.expirationTimer;
            await this.sendRequest('updateGroup', params);
        }, { maxAttempts: this.config.maxRetries, initialDelay: this.config.retryDelay, enabled: this.config.enableRetry });
    }

    async listGroups(): Promise<GroupInfo[]> {
        return withRetry(
            async () => this.normalizeGroups(await this.sendRequest('listGroups', { account: this.account })),
            { maxAttempts: this.config.maxRetries, initialDelay: this.config.retryDelay, enabled: this.config.enableRetry }
        );
    }

    async quitGroup(groupId: string, options?: { delete?: boolean; admins?: string[] }): Promise<void> {
        const params: Record<string, unknown> = { account: this.account, groupId };
        if (options?.delete) params.delete = true;
        if (options?.admins && options.admins.length > 0) params.admin = options.admins;
        await this.sendRequest('quitGroup', params);
    }

    async joinGroup(uri: string): Promise<void> {
        await this.sendRequest('joinGroup', { account: this.account, uri });
    }

    async terminateGroup(groupId: string): Promise<void> {
        validateGroupId(groupId);
        await this.sendRequest('terminateGroup', { account: this.account, groupId });
    }

    async listGroupsDetailed(options: ListGroupsOptions = {}): Promise<GroupInfo[]> {
        this.logger.debug('Listing groups with options', options);

        const params: Record<string, unknown> = { account: this.account };

        if (options.detailed) {
            params.detailed = true;
        }

        if (options.groupIds && options.groupIds.length > 0) {
            params.groupIds = options.groupIds;
        }

        const result = await this.sendRequest('listGroups', params);
        return this.normalizeGroups(result);
    }

    parseGroupDetails(group: GroupInfo): GroupInfo {
        group = this.normalizeGroup(group);
        return {
            ...group,
            inviteLink: group.groupInviteLink || group.inviteLink,
            groupInviteLink: group.groupInviteLink || group.inviteLink,
            pendingMembers: group.pendingMembers || [],
            banned: group.banned || [],
            requestingMembers: group.requestingMembers || [],
            admins: group.admins || [],
            members: group.members || [],
        };
    }

    async getGroupsWithDetails(options: ListGroupsOptions = {}): Promise<GroupInfo[]> {
        const groups = await this.listGroupsDetailed(options);
        return groups.map((g) => this.parseGroupDetails(g));
    }

    private toSignalPermission(permission: 'EVERY_MEMBER' | 'ONLY_ADMINS'): 'every-member' | 'only-admins' {
        return permission === 'ONLY_ADMINS' ? 'only-admins' : 'every-member';
    }

    private normalizeGroups(result: unknown): GroupInfo[] {
        const groups = Array.isArray(result) ? result : (result as { groups?: unknown[] } | undefined)?.groups || [];
        return groups.map((group) => this.normalizeGroup(group));
    }

    private normalizeGroup(value: unknown): GroupInfo {
        const group = (value || {}) as Partial<GroupInfo> & {
            id?: string;
            groupId?: string;
            members?: unknown[];
            pendingMembers?: unknown[];
            requestingMembers?: unknown[];
            admins?: unknown[];
            banned?: unknown[];
        };
        const memberId = (member: unknown): string => {
            if (typeof member === 'string') return member;
            const item = (member || {}) as { number?: string; uuid?: string; id?: string };
            return item.number || item.uuid || item.id || '';
        };
        const members = (items?: unknown[]) => (items || []).map(memberId).filter(Boolean);

        return {
            ...group,
            groupId: group.groupId || group.id || '',
            name: group.name || '',
            isMember: group.isMember ?? true,
            isBlocked: group.isBlocked ?? false,
            messageExpirationTime: group.messageExpirationTime ?? 0,
            members: members(group.members),
            pendingMembers: members(group.pendingMembers),
            requestingMembers: members(group.requestingMembers),
            admins: members(group.admins),
            banned: members(group.banned),
            permissionAddMember: group.permissionAddMember || '',
            permissionEditDetails: group.permissionEditDetails || '',
            permissionSendMessage: group.permissionSendMessage || '',
        } as GroupInfo;
    }
}
