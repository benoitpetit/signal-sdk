import { BaseManager } from './BaseManager';
import {
    Contact,
    ContactUpdateOptions,
    RemoveContactOptions,
    IdentityKey,
    UserStatusResult,
    GetAvatarOptions,
} from '../interfaces';
import { validateRecipient } from '../validators';
import { MessageError } from '../errors';

export class ContactManager extends BaseManager {
    async updateContact(number: string, name?: string, options: Omit<ContactUpdateOptions, 'name'> = {}): Promise<void> {
        const params: any = { account: this.account, recipient: number };
        if (name) params.name = name;
        if (options.givenName) params.givenName = options.givenName;
        if (options.familyName) params.familyName = options.familyName;
        if (options.nickGivenName) params.nickGivenName = options.nickGivenName;
        if (options.nickFamilyName) params.nickFamilyName = options.nickFamilyName;
        if (options.note) params.note = options.note;
        if (options.expiration !== undefined) params.expiration = options.expiration;
        if (options.color) params.color = options.color;
        if (options.block !== undefined) params.block = options.block;
        if (options.unblock !== undefined) params.unblock = options.unblock;
        if (options.archived !== undefined) params.archived = options.archived;
        if (options.muted !== undefined) params.muted = options.muted;
        if (options.mutedUntil !== undefined) params.mutedUntil = options.mutedUntil;
        if (options.hideStory !== undefined) params.hideStory = options.hideStory;

        await this.sendRequest('updateContact', params);
    }

    async block(recipients: string[], groupId?: string): Promise<void> {
        await this.sendRequest('block', { account: this.account, recipient: recipients, groupId });
    }

    async unblock(recipients: string[], groupId?: string): Promise<void> {
        await this.sendRequest('unblock', { account: this.account, recipient: recipients, groupId });
    }

    async listContacts(): Promise<Contact[]> {
        return this.sendRequest('listContacts', { account: this.account });
    }

    async removeContact(number: string, options: RemoveContactOptions = {}): Promise<void> {
        const params: any = {
            account: this.account,
            recipient: number,
        };

        if (options.hide) params.hide = true;
        if (options.forget) params.forget = true;

        await this.sendRequest('removeContact', params);
    }

    async getUserStatus(numbers: string[] = [], usernames: string[] = []): Promise<UserStatusResult[]> {
        const params: any = { account: this.account };

        if (numbers.length > 0) params.recipients = numbers;
        if (usernames.length > 0) params.usernames = usernames;

        const result = await this.sendRequest('getUserStatus', params);

        const statusResults: UserStatusResult[] = [];

        if (result.recipients) {
            result.recipients.forEach((recipient: any) => {
                statusResults.push({
                    number: recipient.number,
                    isRegistered: recipient.isRegistered || false,
                    uuid: recipient.uuid,
                    username: recipient.username,
                });
            });
        }

        return statusResults;
    }

    async listIdentities(number?: string): Promise<IdentityKey[]> {
        return this.sendRequest('listIdentities', { account: this.account, number });
    }

    async trustIdentity(number: string, safetyNumber: string, verified: boolean = true): Promise<void> {
        await this.sendRequest('trust', { account: this.account, recipient: number, safetyNumber, verified });
    }

    async getAvatar(options: GetAvatarOptions): Promise<string> {
        this.logger.debug('Getting avatar', options);

        const params: any = { account: this.account };

        if (options.contact) {
            validateRecipient(options.contact);
            params.contact = options.contact;
        } else if (options.profile) {
            validateRecipient(options.profile);
            params.profile = options.profile;
        } else if (options.groupId) {
            params.groupId = options.groupId;
        } else {
            throw new MessageError('Must specify contact, profile, or groupId');
        }

        const result = await this.sendRequest('getAvatar', params);
        return result.data || result;
    }

    parseContactProfile(contact: Contact): Contact {
        return {
            ...contact,
            givenName: contact.givenName || undefined,
            familyName: contact.familyName || undefined,
            mobileCoinAddress: contact.mobileCoinAddress || undefined,
            profileName:
                contact.profileName ||
                (contact.givenName && contact.familyName
                    ? `${contact.givenName} ${contact.familyName}`
                    : contact.givenName || contact.familyName),
        };
    }

    async getContactsWithProfiles(): Promise<Contact[]> {
        const contacts = await this.listContacts();
        return contacts.map((c) => this.parseContactProfile(c));
    }
}
