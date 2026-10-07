/** Contract tests for the signal-cli v0.14.9 JSON-RPC additions. */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import * as http from 'http';
import { SignalCli } from '../SignalCli';
import { AttachmentError, ValidationError } from '../errors';
import { validateAttachmentBlurhash, validateAttachmentDimensions } from '../validators';

jest.mock('child_process');
jest.mock('http');
jest.mock('https');

const BLUR_HASH = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';

function buildMockProcess() {
    return {
        stdout: { on: jest.fn(), once: jest.fn() },
        stderr: { on: jest.fn() },
        stdin: { write: jest.fn() },
        on: jest.fn(),
        once: jest.fn(),
        kill: jest.fn(),
        killed: false,
    };
}

describe('SignalCli — v0.14.9 compatibility', () => {
    describe('attachment dimensions and BlurHash', () => {
        let signalCli: SignalCli;
        let rpcSpy: jest.SpyInstance;

        beforeEach(() => {
            (spawn as jest.MockedFunction<typeof spawn>).mockReturnValue(buildMockProcess() as any);
            signalCli = new SignalCli('signal-cli', '+1234567890');
            rpcSpy = jest.spyOn(signalCli as any, 'sendJsonRpcRequest').mockResolvedValue({ timestamp: 1 });
        });

        afterEach(() => {
            signalCli.disconnect();
            jest.clearAllMocks();
        });

        it('sends per-attachment dimensions and BlurHashes', async () => {
            await signalCli.sendMessage('+33123456789', 'photo', {
                attachments: ['/tmp/a.jpg', '/tmp/b.mp4'],
                attachmentDimensions: ['1080x1920', ''],
                attachmentBlurhash: ['', BLUR_HASH],
            });

            expect(rpcSpy).toHaveBeenCalledWith('send', {
                account: '+1234567890',
                message: 'photo',
                recipients: ['+33123456789'],
                attachments: ['/tmp/a.jpg', '/tmp/b.mp4'],
                attachmentDimensions: ['1080x1920', ''],
                attachmentBlurhash: ['', BLUR_HASH],
            });
        });

        it('omits the parameters when no metadata is supplied', async () => {
            await signalCli.sendMessage('+33123456789', 'hello');

            const params = rpcSpy.mock.calls[0][1];
            expect(params).not.toHaveProperty('attachmentDimensions');
            expect(params).not.toHaveProperty('attachmentBlurhash');
        });

        it('rejects malformed dimensions before sending', async () => {
            for (const value of ['0x1080', '1920x0', '-1x2', '1.5x2', '1920']) {
                await expect(
                    signalCli.sendMessage('+33123456789', 'photo', {
                        attachments: ['/tmp/a.jpg'],
                        attachmentDimensions: [value],
                    }),
                ).rejects.toThrow(ValidationError);
            }
            expect(rpcSpy).not.toHaveBeenCalled();
        });

        it('rejects malformed BlurHashes before sending', async () => {
            for (const value of [`${BLUR_HASH}0`, `!${BLUR_HASH.substring(1)}`, '00000']) {
                await expect(
                    signalCli.sendMessage('+33123456789', 'photo', {
                        attachments: ['/tmp/a.jpg'],
                        attachmentBlurhash: [value],
                    }),
                ).rejects.toThrow(ValidationError);
            }
            expect(rpcSpy).not.toHaveBeenCalled();
        });

        it('rejects metadata arrays longer than the attachment list', async () => {
            await expect(
                signalCli.sendMessage('+33123456789', 'photo', {
                    attachments: ['/tmp/a.jpg'],
                    attachmentDimensions: ['1080x1920', '1x1'],
                }),
            ).rejects.toThrow(ValidationError);

            await expect(
                signalCli.sendMessage('+33123456789', 'photo', {
                    attachments: ['/tmp/a.jpg'],
                    attachmentBlurhash: [BLUR_HASH, BLUR_HASH],
                }),
            ).rejects.toThrow(ValidationError);
        });

        it('requires attachments when metadata is provided', async () => {
            await expect(
                signalCli.sendMessage('+33123456789', 'photo', { attachmentDimensions: ['1080x1920'] }),
            ).rejects.toThrow(ValidationError);

            await expect(
                signalCli.sendMessage('+33123456789', 'photo', { attachmentBlurhash: [BLUR_HASH] }),
            ).rejects.toThrow(ValidationError);
        });
    });

    describe('validators', () => {
        it('accepts well-formed dimensions and empty skip markers', () => {
            expect(() => validateAttachmentDimensions(['1080x1920', ''], 2)).not.toThrow();
            expect(() => validateAttachmentDimensions([], 0)).not.toThrow();
        });

        it('accepts BlurHashes of every valid component count', () => {
            // Length is 4 + 2 * (sizeFlag % 9 + 1) * (sizeFlag / 9 + 1), size flag = first character.
            expect(() => validateAttachmentBlurhash([BLUR_HASH], 1)).not.toThrow();
            expect(() => validateAttachmentBlurhash(['0' + 'A'.repeat(5)], 1)).not.toThrow();
            expect(() => validateAttachmentBlurhash(['3' + 'A'.repeat(11)], 1)).not.toThrow();
            expect(() => validateAttachmentBlurhash(['9' + 'A'.repeat(7)], 1)).not.toThrow();
        });

        it('rejects non-array metadata', () => {
            expect(() => validateAttachmentDimensions('1080x1920' as any, 1)).toThrow(ValidationError);
            expect(() => validateAttachmentBlurhash(null as any, 1)).toThrow(ValidationError);
        });
    });

    describe('attachment upload failures', () => {
        let signalCli: SignalCli;

        beforeEach(() => {
            (spawn as jest.MockedFunction<typeof spawn>).mockReturnValue(buildMockProcess() as any);
            signalCli = new SignalCli('signal-cli', '+1234567890');
        });

        afterEach(() => {
            signalCli.disconnect();
            jest.clearAllMocks();
        });

        it('surfaces upstream attachment failures as AttachmentError', async () => {
            jest.spyOn(signalCli as any, 'sendJsonRpcRequest').mockRejectedValue(
                new Error(
                    '[-32603] Failed to send message: inline attachment #1: Invalid data URI (AttachmentInvalidException)',
                ),
            );

            await expect(
                signalCli.sendMessage('+33123456789', 'photo', { attachments: ['data:image/png;base64,xx'] }),
            ).rejects.toBeInstanceOf(AttachmentError);
        });

        it('keeps unrelated send failures untouched', async () => {
            const original = new Error('[-32603] Failed to send message: internal error (RuntimeException)');
            jest.spyOn(signalCli as any, 'sendJsonRpcRequest').mockRejectedValue(original);

            await expect(signalCli.sendMessage('+33123456789', 'hello')).rejects.toBe(original);
        });
    });

    describe('account recovery registration', () => {
        let signalCli: SignalCli;
        let cliSpy: jest.SpyInstance;

        const ACI = '11111111-1111-4111-8111-111111111111';
        const RECOVERY_KEY = 'a'.repeat(64);

        beforeEach(() => {
            (spawn as jest.MockedFunction<typeof spawn>).mockReturnValue(buildMockProcess() as any);
            signalCli = new SignalCli('signal-cli', '+1234567890');
            cliSpy = jest.spyOn(signalCli as any, 'executeCliCommand').mockResolvedValue('');
        });

        afterEach(() => {
            signalCli.disconnect();
            jest.clearAllMocks();
        });

        it('registers an account from its recovery key', async () => {
            await signalCli.registerWithRecoveryKey(ACI, RECOVERY_KEY);

            expect(cliSpy).toHaveBeenCalledWith([
                '-a',
                ACI,
                'register',
                '--recovery-key',
                RECOVERY_KEY,
            ]);
        });

        it('adds the TOTP token when a second step is required', async () => {
            await signalCli.registerWithRecoveryKey(ACI, RECOVERY_KEY, { totp: '123456', reregister: true });

            expect(cliSpy).toHaveBeenCalledWith([
                '-a',
                ACI,
                'register',
                '--recovery-key',
                RECOVERY_KEY,
                '--reregister',
                '--totp',
                '123456',
            ]);
        });

        it('rejects a malformed ACI, recovery key or TOTP token', async () => {
            await expect(signalCli.registerWithRecoveryKey('+33123456789', RECOVERY_KEY)).rejects.toThrow(
                ValidationError,
            );
            await expect(signalCli.registerWithRecoveryKey(ACI, 'too-short')).rejects.toThrow(ValidationError);
            await expect(
                signalCli.registerWithRecoveryKey(ACI, RECOVERY_KEY, { totp: '12345' }),
            ).rejects.toThrow(ValidationError);
            expect(cliSpy).not.toHaveBeenCalled();
        });
    });

    describe('SSE Last-Event-ID replay', () => {
        let signalCli: SignalCli;
        let requestSpy: jest.SpyInstance;

        const rpcResponse = (): any => {
            const res = new EventEmitter() as any;
            res.statusCode = 200;
            res.destroy = jest.fn();
            res.resume = jest.fn();
            res.on = jest.fn().mockImplementation((event: string, cb: (arg?: any) => void) => {
                if (event === 'data') cb(JSON.stringify({ jsonrpc: '2.0', result: 'ok', id: '1' }));
                if (event === 'end') cb();
                return res;
            });
            return res;
        };

        const eventsResponse = (): any => {
            const res = new EventEmitter() as any;
            res.statusCode = 200;
            res.destroy = jest.fn();
            res.resume = jest.fn();
            res.on = jest.fn().mockImplementation((event: string, cb: (arg?: any) => void) => {
                if (event === 'data') {
                    cb(
                        'id: 1700000000000-1\nevent: receive\ndata: {"jsonrpc":"2.0","method":"receive","params":{"envelope":{"dataMessage":{"message":"hi"}}}}\n\n',
                    );
                }
                return res;
            });
            return res;
        };

        const mockRequest = (): any => {
            const req = new EventEmitter() as any;
            req.write = jest.fn();
            req.end = jest.fn();
            req.setTimeout = jest.fn();
            req.destroy = jest.fn();
            return req;
        };

        const headersOfLastEventRequest = (): Record<string, string> => {
            const calls = (http.request as jest.Mock).mock.calls;
            const last = calls[calls.length - 1][1] as { headers: Record<string, string> };
            return last.headers;
        };

        beforeEach(() => {
            (http.request as jest.Mock).mockReset();
            (http.request as jest.Mock).mockImplementation((url: unknown, _opts: unknown, cb: any) => {
                const isEvents = String(url).includes('/api/v1/events');
                setImmediate(() => cb(isEvents ? eventsResponse() : rpcResponse()));
                return mockRequest();
            });

            signalCli = new SignalCli('+1234567890', undefined, {
                daemonMode: 'http',
                httpBaseUrl: 'http://localhost:8080',
                autoReconnect: false,
            });
            requestSpy = jest.spyOn(signalCli as any, 'connectHttpEvents');
        });

        afterEach(() => {
            signalCli.disconnect();
            jest.restoreAllMocks();
        });

        it('omits the header until an event id has been seen', async () => {
            await signalCli.connect();

            expect(requestSpy).toHaveBeenCalled();
            expect(headersOfLastEventRequest()).toEqual({ Accept: 'text/event-stream' });
        });

        it('resumes with the last event id on reconnect', async () => {
            await signalCli.connect();

            await (signalCli as any).connectHttpEvents();

            expect(headersOfLastEventRequest()).toEqual({
                Accept: 'text/event-stream',
                'Last-Event-ID': '1700000000000-1',
            });
        });

        it('forgets the event id on an explicit disconnect', async () => {
            await signalCli.connect();
            signalCli.disconnect();

            await (signalCli as any).connectHttpEvents();

            expect(headersOfLastEventRequest()).toEqual({ Accept: 'text/event-stream' });
        });

        it('still dispatches the event payload', async () => {
            const messageHandler = jest.fn();
            signalCli.on('message', messageHandler);

            await signalCli.connect();

            expect(messageHandler).toHaveBeenCalledWith({
                envelope: { dataMessage: { message: 'hi' } },
            });
        });

        it('ignores keep-alive comment frames', async () => {
            const messageHandler = jest.fn();
            signalCli.on('message', messageHandler);

            await signalCli.connect();

            (signalCli as any).handleSseData(':\n');

            expect(messageHandler).toHaveBeenCalledTimes(1);
        });
    });
});