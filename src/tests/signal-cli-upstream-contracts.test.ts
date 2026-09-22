import { AccountManager } from '../managers/AccountManager';
import { ContactManager } from '../managers/ContactManager';
import { GroupManager } from '../managers/GroupManager';
import { DeviceManager } from '../managers/DeviceManager';
import { readFileSync } from 'fs';
import { join } from 'path';

function fixture<T>(name: string): T {
    return JSON.parse(
        readFileSync(join(__dirname, 'fixtures', 'signal-cli', 'v0.14.x', `${name}.json`), 'utf8'),
    ) as T;
}

const config = {
    maxRetries: 1,
    retryDelay: 0,
    enableRetry: false,
} as any;

const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
} as any;

describe('signal-cli response contracts', () => {
    it('normalizes the current listAccounts array response', async () => {
        const sendRequest = jest.fn().mockResolvedValue(fixture('list-accounts'));
        const manager = new AccountManager(sendRequest, '+33123456789', logger, config);

        await expect(manager.listAccounts()).resolves.toEqual(['+33123456789', 'aci-numberless']);
        await expect(manager.listAccountsDetailed()).resolves.toEqual([
            { number: '+33123456789', aci: 'aci-1' },
            { number: null, aci: 'aci-numberless' },
        ]);
    });

    it('sends verificationCode and normalizes array status responses', async () => {
        const sendRequest = jest
            .fn()
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce([{ recipient: '+33987654321', isRegistered: true, uuid: 'uuid-1' }]);
        const account = new AccountManager(sendRequest, '+33123456789', logger, config);
        const contacts = new ContactManager(sendRequest, '+33123456789', logger, config);

        await account.verify('+33123456789', '123456');
        await expect(contacts.getUserStatus(['+33987654321'])).resolves.toEqual([
            { number: '+33987654321', isRegistered: true, uuid: 'uuid-1', username: undefined },
        ]);
        expect(sendRequest).toHaveBeenNthCalledWith(1, 'verify', {
            account: '+33123456789',
            verificationCode: '123456',
            pin: undefined,
        });
    });

    it('maps fingerprint and addedTimestamp in identity responses', async () => {
        const sendRequest = jest.fn().mockResolvedValue(fixture('list-identities'));
        const manager = new ContactManager(sendRequest, '+33123456789', logger, config);

        await expect(manager.listIdentities()).resolves.toEqual([
            {
                number: '+33987654321',
                fingerprint: 'fingerprint-1',
                identityKey: 'fingerprint-1',
                safetyNumber: '12345',
                addedTimestamp: 1700000000000,
                addedDate: 1700000000000,
            },
        ]);
    });

    it('maps group ids and member objects to the public group contract', async () => {
        const sendRequest = jest.fn().mockResolvedValue(fixture('list-groups'));
        const manager = new GroupManager(sendRequest, '+33123456789', logger, config);

        await expect(manager.listGroups()).resolves.toEqual([
            expect.objectContaining({
                groupId: 'group-1',
                members: ['+33987654321'],
                admins: ['uuid-admin'],
                isMember: true,
                isBlocked: false,
            }),
        ]);
    });

    it('maps current device timestamp fields', async () => {
        const sendRequest = jest.fn().mockResolvedValue(fixture('list-devices'));
        const manager = new DeviceManager(sendRequest, '+33123456789', logger, config, 'signal-cli');

        await expect(manager.listDevices()).resolves.toEqual([
            { id: 1, name: 'Desktop', createdTimestamp: 1700000000000, lastSeenTimestamp: 1700000001000, created: 1700000000000, lastSeen: 1700000001000 },
        ]);
    });
});
