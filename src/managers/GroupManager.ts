import { BaseManager } from './BaseManager';
import { GroupInfo, GroupUpdateOptions, ListGroupsOptions, SendResponse } from '../interfaces';

export class GroupManager extends BaseManager {
    async createGroup(name: string, members: string[]): Promise<GroupInfo> {
        return this.sendRequest('updateGroup', { account: this.account, name, members });
    }

    async updateGroup(groupId: string, options: GroupUpdateOptions): Promise<void> {
        const params: any = { groupId, account: this.account };
        if (options.name) params.name = options.name;
        if (options.description) params.description = options.description;
        if (options.avatar) params.avatar = options.avatar;
        if (options.addMembers) params.addMembers = options.addMembers;
        if (options.removeMembers) params.removeMembers = options.removeMembers;
        if (options.promoteAdmins) params.promoteAdmins = options.promoteAdmins;
        if (options.demoteAdmins) params.demoteAdmins = options.demoteAdmins;
        if (options.banMembers) params.banMembers = options.banMembers;
        if (options.unbanMembers) params.unbanMembers = options.unbanMembers;
        if (options.resetInviteLink) params.resetLink = true;
        if (options.permissionAddMember) params.permissionAddMember = options.permissionAddMember;
        if (options.permissionEditDetails) params.permissionEditDetails = options.permissionEditDetails;
        if (options.permissionSendMessage) params.permissionSendMessage = options.permissionSendMessage;
        if (options.expirationTimer) params.expiration = options.expirationTimer;
        await this.sendRequest('updateGroup', params);
    }

    async listGroups(): Promise<GroupInfo[]> {
        return this.sendRequest('listGroups', { account: this.account });
    }

    async quitGroup(groupId: string): Promise<void> {
        await this.sendRequest('quitGroup', { account: this.account, groupId });
    }

    async joinGroup(uri: string): Promise<void> {
        await this.sendRequest('joinGroup', { account: this.account, uri });
    }

    async listGroupsDetailed(options: ListGroupsOptions = {}): Promise<GroupInfo[]> {
        this.logger.debug('Listing groups with options', options);

        const params: any = { account: this.account };

        if (options.detailed) {
            params.detailed = true;
        }

        if (options.groupIds && options.groupIds.length > 0) {
            params.groupId = options.groupIds;
        }

        return this.sendRequest('listGroups', params);
    }

    parseGroupDetails(group: GroupInfo): GroupInfo {
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
}
