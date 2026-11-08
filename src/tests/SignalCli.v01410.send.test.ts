import { SignalCli } from '../SignalCli';
import { MessageError, ValidationError } from '../errors';
import { JsonRpcSendParams, SendMessageOptions } from '../interfaces';

const SEND_TIMESTAMP = 1_700_000_000_000;

describe('signal-cli v0.14.10 custom send timestamp', () => {
    let signalCli: SignalCli;
    let sendRequest: jest.SpyInstance;

    beforeEach(() => {
        signalCli = new SignalCli('signal-cli', '+1234567890', { enableRetry: false });
        sendRequest = jest.spyOn(signalCli as any, 'sendJsonRpcRequest').mockResolvedValue({ timestamp: SEND_TIMESTAMP });
    });

    afterEach(() => {
        signalCli.disconnect();
        jest.clearAllMocks();
    });

    it('forwards a custom timestamp as a JSON-RPC send parameter', async () => {
        const options: Omit<SendMessageOptions, 'message'> = { timestamp: SEND_TIMESTAMP };
        const rpcParams: JsonRpcSendParams = { timestamp: SEND_TIMESTAMP };
        expect(rpcParams.timestamp).toBe(SEND_TIMESTAMP);

        await signalCli.sendMessage('+33123456789', 'hello', options);

        expect(sendRequest).toHaveBeenCalledWith(
            'send',
            expect.objectContaining({
                account: '+1234567890',
                recipients: ['+33123456789'],
                message: 'hello',
                timestamp: SEND_TIMESTAMP,
            }),
        );
    });

    it('omits an absent timestamp', async () => {
        await signalCli.sendMessage('+33123456789', 'hello');

        expect(sendRequest.mock.calls[0][1]).not.toHaveProperty('timestamp');
    });

    it('rejects invalid timestamp values before sending', async () => {
        for (const timestamp of [0, -1, 1.5, Infinity, NaN, '123'] as unknown[]) {
            await expect(
                signalCli.sendMessage('+33123456789', 'hello', { timestamp } as any),
            ).rejects.toBeInstanceOf(ValidationError);
        }

        expect(sendRequest).not.toHaveBeenCalled();
    });

    it('rejects timestamp with editTimestamp', async () => {
        await expect(
            signalCli.sendMessage('+33123456789', 'edited', {
                timestamp: SEND_TIMESTAMP,
                editTimestamp: SEND_TIMESTAMP - 1000,
            } as any),
        ).rejects.toBeInstanceOf(MessageError);

        expect(sendRequest).not.toHaveBeenCalled();
    });

    it('rejects timestamp with endSession', async () => {
        await expect(
            signalCli.sendMessage('+33123456789', 'end session', {
                timestamp: SEND_TIMESTAMP,
                endSession: true,
            } as any),
        ).rejects.toBeInstanceOf(MessageError);

        expect(sendRequest).not.toHaveBeenCalled();
    });

    it('forwards a future timestamp and propagates the daemon rejection', async () => {
        const futureTimestamp = Date.now() + 60_000;
        const daemonError = new Error('Timestamp must be in the past');
        sendRequest.mockRejectedValue(daemonError);

        await expect(
            signalCli.sendMessage('+33123456789', 'future', { timestamp: futureTimestamp } as any),
        ).rejects.toBe(daemonError);

        expect(sendRequest).toHaveBeenCalledWith(
            'send',
            expect.objectContaining({ timestamp: futureTimestamp }),
        );
    });
});
