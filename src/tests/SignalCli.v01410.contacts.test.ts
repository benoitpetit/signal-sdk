import { SignalCli } from '../SignalCli';
import { Contact } from '../interfaces';

describe('signal-cli v0.14.10 contact profile badges', () => {
    let signalCli: SignalCli;

    beforeEach(() => {
        signalCli = new SignalCli('signal-cli', '+1234567890', { enableRetry: false });
    });

    afterEach(() => {
        signalCli.disconnect();
        jest.clearAllMocks();
    });

    it('preserves profile badges returned by listContacts', async () => {
        const contact: Contact = {
            number: '+33123456789',
            name: 'Alice',
            blocked: false,
            profile: {
                badges: [
                    {
                        id: 'badge-id',
                        category: 'badge-category',
                        expirationTimestamp: 1_800_000_000_000,
                        visible: true,
                    },
                ],
            },
        };
        jest.spyOn(signalCli as any, 'sendJsonRpcRequest').mockResolvedValue([contact]);

        const contacts = await signalCli.listContacts();

        expect(contacts[0]).toEqual(contact);
        expect(contacts[0].profile?.badges).toEqual(contact.profile?.badges);
    });

    it('preserves a null badge expiration timestamp', async () => {
        const contact: Contact = {
            number: '+33123456789',
            name: 'Alice',
            blocked: false,
            profile: {
                badges: [
                    {
                        id: 'permanent-badge',
                        category: 'badge-category',
                        expirationTimestamp: null,
                        visible: false,
                    },
                ],
            },
        };
        jest.spyOn(signalCli as any, 'sendJsonRpcRequest').mockResolvedValue([contact]);

        const contacts = await signalCli.listContacts();

        expect(contacts[0].profile?.badges?.[0].expirationTimestamp).toBeNull();
    });
});
