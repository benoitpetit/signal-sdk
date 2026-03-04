/**
 * Tests for signal-cli v0.14.0 new features
 *
 * Covers:
 *  - sendPinMessage   (new command)
 *  - sendUnpinMessage (new command)
 *  - sendAdminDelete  (new command)
 *  - noUrgent flag    (send / sendMessage)
 *  - ignoreAvatars    (receive + connect / jsonRpc startup)
 *  - ignoreStickers   (receive + connect / jsonRpc startup)
 *  - JsonRpcStartOptions forwarded to connect()
 */

import { SignalCli } from '../SignalCli';
import { spawn } from 'child_process';
import {
    PinMessageOptions,
    UnpinMessageOptions,
    AdminDeleteOptions,
    JsonRpcStartOptions,
} from '../interfaces';

jest.mock('child_process');

// ---------------------------------------------------------------------------
// Shared mock factory
// ---------------------------------------------------------------------------
function buildMockProcess() {
    return {
        stdout: { on: jest.fn(), once: jest.fn() },
        stderr: { on: jest.fn() },
        stdin:  { write: jest.fn() },
        on:     jest.fn(),
        once:   jest.fn(),
        kill:   jest.fn(),
        killed: false,
    };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('SignalCli — v0.14.0 new features', () => {
    let signalCli: SignalCli;
    let mockProcess: ReturnType<typeof buildMockProcess>;
    let rpcSpy: jest.SpyInstance;

    beforeEach(() => {
        mockProcess = buildMockProcess();
        (spawn as jest.MockedFunction<typeof spawn>).mockReturnValue(mockProcess as any);

        signalCli = new SignalCli('signal-cli', '+1234567890');

        // Intercept all JSON-RPC calls so tests stay unit-level
        rpcSpy = jest
            .spyOn(signalCli as any, 'sendJsonRpcRequest')
            .mockResolvedValue({});
    });

    afterEach(() => {
        signalCli.disconnect();
        jest.clearAllMocks();
    });

    // =========================================================================
    // sendPinMessage
    // =========================================================================
    describe('sendPinMessage', () => {
        const baseOptions: PinMessageOptions = {
            targetAuthor:    '+10987654321',
            targetTimestamp: 1_700_000_000_000,
        };

        it('forwards targetAuthor and targetTimestamp to signal-cli', async () => {
            await signalCli.sendPinMessage({
                ...baseOptions,
                groupId: 'testGroupId==',
            });

            expect(rpcSpy).toHaveBeenCalledWith('sendPinMessage', expect.objectContaining({
                account:         '+1234567890',
                targetAuthor:    baseOptions.targetAuthor,
                targetTimestamp: baseOptions.targetTimestamp,
            }));
        });

        it('sends to a group when groupId is provided', async () => {
            await signalCli.sendPinMessage({ ...baseOptions, groupId: 'myGroup==' });

            expect(rpcSpy).toHaveBeenCalledWith('sendPinMessage', expect.objectContaining({
                groupId: 'myGroup==',
            }));
            // recipients must NOT be set when groupId is used
            const params = rpcSpy.mock.calls[0][1];
            expect(params.recipients).toBeUndefined();
        });

        it('sends to individual recipients when recipients is provided', async () => {
            await signalCli.sendPinMessage({
                ...baseOptions,
                recipients: ['+10987654321', '+10000000001'],
            });

            expect(rpcSpy).toHaveBeenCalledWith('sendPinMessage', expect.objectContaining({
                recipients: ['+10987654321', '+10000000001'],
            }));
            const params = rpcSpy.mock.calls[0][1];
            expect(params.groupId).toBeUndefined();
        });

        it('sets noteToSelf when specified', async () => {
            await signalCli.sendPinMessage({ ...baseOptions, noteToSelf: true });

            expect(rpcSpy).toHaveBeenCalledWith('sendPinMessage', expect.objectContaining({
                noteToSelf: true,
            }));
        });

        it('forwards pinDuration to signal-cli', async () => {
            await signalCli.sendPinMessage({
                ...baseOptions,
                groupId:     'grp==',
                pinDuration: 3600,
            });

            expect(rpcSpy).toHaveBeenCalledWith('sendPinMessage', expect.objectContaining({
                pinDuration: 3600,
            }));
        });

        it('uses pinDuration -1 (forever) when specified', async () => {
            await signalCli.sendPinMessage({
                ...baseOptions,
                groupId:     'grp==',
                pinDuration: -1,
            });

            expect(rpcSpy).toHaveBeenCalledWith('sendPinMessage', expect.objectContaining({
                pinDuration: -1,
            }));
        });

        it('omits pinDuration when not provided', async () => {
            await signalCli.sendPinMessage({ ...baseOptions, groupId: 'grp==' });

            const params = rpcSpy.mock.calls[0][1];
            expect(params.pinDuration).toBeUndefined();
        });

        it('forwards notifySelf flag', async () => {
            await signalCli.sendPinMessage({
                ...baseOptions,
                groupId:     'grp==',
                notifySelf:  true,
            });

            expect(rpcSpy).toHaveBeenCalledWith('sendPinMessage', expect.objectContaining({
                notifySelf: true,
            }));
        });

        it('does not include notifySelf when false', async () => {
            await signalCli.sendPinMessage({ ...baseOptions, groupId: 'grp==' });

            const params = rpcSpy.mock.calls[0][1];
            expect(params.notifySelf).toBeUndefined();
        });

        it('resolves without return value (void)', async () => {
            const result = await signalCli.sendPinMessage({ ...baseOptions, groupId: 'grp==' });
            expect(result).toBeUndefined();
        });

        it('propagates errors from signal-cli', async () => {
            rpcSpy.mockRejectedValue(new Error('pin failed'));
            await expect(
                signalCli.sendPinMessage({ ...baseOptions, groupId: 'grp==' }),
            ).rejects.toThrow('pin failed');
        });
    });

    // =========================================================================
    // sendUnpinMessage
    // =========================================================================
    describe('sendUnpinMessage', () => {
        const baseOptions: UnpinMessageOptions = {
            targetAuthor:    '+10987654321',
            targetTimestamp: 1_700_000_000_000,
        };

        it('calls sendUnpinMessage with correct base params', async () => {
            await signalCli.sendUnpinMessage({ ...baseOptions, groupId: 'myGroup==' });

            expect(rpcSpy).toHaveBeenCalledWith('sendUnpinMessage', expect.objectContaining({
                account:         '+1234567890',
                targetAuthor:    baseOptions.targetAuthor,
                targetTimestamp: baseOptions.targetTimestamp,
            }));
        });

        it('sends to a group when groupId is provided', async () => {
            await signalCli.sendUnpinMessage({ ...baseOptions, groupId: 'myGroup==' });

            expect(rpcSpy).toHaveBeenCalledWith('sendUnpinMessage', expect.objectContaining({
                groupId: 'myGroup==',
            }));
            const params = rpcSpy.mock.calls[0][1];
            expect(params.recipients).toBeUndefined();
        });

        it('sends to individual recipients', async () => {
            await signalCli.sendUnpinMessage({
                ...baseOptions,
                recipients: ['+10987654321'],
            });

            expect(rpcSpy).toHaveBeenCalledWith('sendUnpinMessage', expect.objectContaining({
                recipients: ['+10987654321'],
            }));
            const params = rpcSpy.mock.calls[0][1];
            expect(params.groupId).toBeUndefined();
        });

        it('sets noteToSelf when specified', async () => {
            await signalCli.sendUnpinMessage({ ...baseOptions, noteToSelf: true });

            expect(rpcSpy).toHaveBeenCalledWith('sendUnpinMessage', expect.objectContaining({
                noteToSelf: true,
            }));
        });

        it('forwards notifySelf flag', async () => {
            await signalCli.sendUnpinMessage({
                ...baseOptions,
                groupId:    'grp==',
                notifySelf: true,
            });

            expect(rpcSpy).toHaveBeenCalledWith('sendUnpinMessage', expect.objectContaining({
                notifySelf: true,
            }));
        });

        it('resolves without return value (void)', async () => {
            const result = await signalCli.sendUnpinMessage({ ...baseOptions, groupId: 'grp==' });
            expect(result).toBeUndefined();
        });

        it('propagates errors from signal-cli', async () => {
            rpcSpy.mockRejectedValue(new Error('unpin failed'));
            await expect(
                signalCli.sendUnpinMessage({ ...baseOptions, groupId: 'grp==' }),
            ).rejects.toThrow('unpin failed');
        });
    });

    // =========================================================================
    // sendAdminDelete
    // =========================================================================
    describe('sendAdminDelete', () => {
        const baseOptions: AdminDeleteOptions = {
            groupId:         'adminGroupId==',
            targetAuthor:    '+10987654321',
            targetTimestamp: 1_700_000_000_000,
        };

        it('calls sendAdminDelete with required params', async () => {
            await signalCli.sendAdminDelete(baseOptions);

            expect(rpcSpy).toHaveBeenCalledWith('sendAdminDelete', expect.objectContaining({
                account:         '+1234567890',
                groupId:         baseOptions.groupId,
                targetAuthor:    baseOptions.targetAuthor,
                targetTimestamp: baseOptions.targetTimestamp,
            }));
        });

        it('does not include story flag by default', async () => {
            await signalCli.sendAdminDelete(baseOptions);

            const params = rpcSpy.mock.calls[0][1];
            expect(params.story).toBeUndefined();
        });

        it('sets story flag when deleting a story', async () => {
            await signalCli.sendAdminDelete({ ...baseOptions, story: true });

            expect(rpcSpy).toHaveBeenCalledWith('sendAdminDelete', expect.objectContaining({
                story: true,
            }));
        });

        it('does not include notifySelf by default', async () => {
            await signalCli.sendAdminDelete(baseOptions);

            const params = rpcSpy.mock.calls[0][1];
            expect(params.notifySelf).toBeUndefined();
        });

        it('forwards notifySelf flag', async () => {
            await signalCli.sendAdminDelete({ ...baseOptions, notifySelf: true });

            expect(rpcSpy).toHaveBeenCalledWith('sendAdminDelete', expect.objectContaining({
                notifySelf: true,
            }));
        });

        it('resolves without return value (void)', async () => {
            const result = await signalCli.sendAdminDelete(baseOptions);
            expect(result).toBeUndefined();
        });

        it('propagates errors from signal-cli', async () => {
            rpcSpy.mockRejectedValue(new Error('not an admin'));
            await expect(signalCli.sendAdminDelete(baseOptions)).rejects.toThrow('not an admin');
        });

        it('always includes groupId (required by signal-cli)', async () => {
            await signalCli.sendAdminDelete(baseOptions);

            const params = rpcSpy.mock.calls[0][1];
            expect(params.groupId).toBeDefined();
            expect(typeof params.groupId).toBe('string');
        });
    });

    // =========================================================================
    // noUrgent flag — sendMessage
    // =========================================================================
    describe('noUrgent flag on sendMessage', () => {
        it('is NOT included in params when not specified', async () => {
            await signalCli.sendMessage('+10987654321', 'hello');

            const params = rpcSpy.mock.calls[0][1];
            expect(params.noUrgent).toBeUndefined();
        });

        it('is NOT included when explicitly false', async () => {
            await signalCli.sendMessage('+10987654321', 'hello', { noUrgent: false });

            const params = rpcSpy.mock.calls[0][1];
            expect(params.noUrgent).toBeUndefined();
        });

        it('is included when set to true for direct message', async () => {
            await signalCli.sendMessage('+10987654321', 'silent message', { noUrgent: true });

            expect(rpcSpy).toHaveBeenCalledWith('send', expect.objectContaining({
                noUrgent:   true,
                message:    'silent message',
                recipients: ['+10987654321'],
            }));
        });

        it('is included when set to true for group message', async () => {
            await signalCli.sendMessage('groupId==', 'silent group message', { noUrgent: true });

            expect(rpcSpy).toHaveBeenCalledWith('send', expect.objectContaining({
                noUrgent: true,
                groupId:  'groupId==',
            }));
        });

        it('can be combined with other send options', async () => {
            await signalCli.sendMessage('+10987654321', 'combo', {
                noUrgent:        true,
                expiresInSeconds: 60,
                isViewOnce:      true,
            });

            expect(rpcSpy).toHaveBeenCalledWith('send', expect.objectContaining({
                noUrgent:        true,
                expiresInSeconds: 60,
                viewOnce:        true,
            }));
        });

        it('can be combined with noteToSelf', async () => {
            await signalCli.sendMessage('+1234567890', 'silent note', {
                noUrgent:   true,
                noteToSelf: true,
            });

            expect(rpcSpy).toHaveBeenCalledWith('send', expect.objectContaining({
                noUrgent:   true,
                noteToSelf: true,
            }));
        });
    });

    // =========================================================================
    // ignoreAvatars / ignoreStickers — receive()
    // =========================================================================
    describe('ignoreAvatars and ignoreStickers in receive()', () => {
        it('does NOT include ignoreAvatars by default', async () => {
            rpcSpy.mockResolvedValue([]);
            await signalCli.receive();

            const params = rpcSpy.mock.calls[0][1];
            expect(params.ignoreAvatars).toBeUndefined();
        });

        it('does NOT include ignoreStickers by default', async () => {
            rpcSpy.mockResolvedValue([]);
            await signalCli.receive();

            const params = rpcSpy.mock.calls[0][1];
            expect(params.ignoreStickers).toBeUndefined();
        });

        it('forwards ignoreAvatars: true to signal-cli', async () => {
            rpcSpy.mockResolvedValue([]);
            await signalCli.receive({ ignoreAvatars: true });

            expect(rpcSpy).toHaveBeenCalledWith('receive', expect.objectContaining({
                ignoreAvatars: true,
            }));
        });

        it('forwards ignoreStickers: true to signal-cli', async () => {
            rpcSpy.mockResolvedValue([]);
            await signalCli.receive({ ignoreStickers: true });

            expect(rpcSpy).toHaveBeenCalledWith('receive', expect.objectContaining({
                ignoreStickers: true,
            }));
        });

        it('can combine ignoreAvatars and ignoreStickers with other receive options', async () => {
            rpcSpy.mockResolvedValue([]);
            await signalCli.receive({
                ignoreAvatars:    true,
                ignoreStickers:   true,
                ignoreAttachments: true,
                ignoreStories:    true,
                sendReadReceipts: true,
                timeout:          10,
            });

            expect(rpcSpy).toHaveBeenCalledWith('receive', expect.objectContaining({
                ignoreAvatars:    true,
                ignoreStickers:   true,
                ignoreAttachments: true,
                ignoreStories:    true,
                sendReadReceipts: true,
                timeout:          10,
            }));
        });

        it('returns an empty array when signal-cli returns nothing', async () => {
            rpcSpy.mockResolvedValue(null);
            const messages = await signalCli.receive({ ignoreAvatars: true });
            expect(Array.isArray(messages)).toBe(true);
            expect(messages).toHaveLength(0);
        });
    });

    // =========================================================================
    // JsonRpcStartOptions forwarded to connect() → connectJsonRpc()
    // =========================================================================
    describe('JsonRpcStartOptions forwarded via connect()', () => {
        // For these tests we need to verify the args passed to spawn(),
        // so we set up a proper connect flow.
        beforeEach(() => {
            mockProcess.stdout.once.mockImplementation(
                (event: string, cb: () => void) => { if (event === 'data') cb(); },
            );
        });

        it('spawns jsonRpc without extra flags when no options given', async () => {
            await signalCli.connect();

            const [, args] = (spawn as jest.MockedFunction<typeof spawn>).mock.calls[0];
            expect(args).toContain('jsonRpc');
            expect(args).not.toContain('--ignore-avatars');
            expect(args).not.toContain('--ignore-stickers');
            expect(args).not.toContain('--ignore-attachments');
            expect(args).not.toContain('--ignore-stories');
            expect(args).not.toContain('--send-read-receipts');
        });

        it('passes --ignore-avatars to signal-cli jsonRpc process', async () => {
            const options: JsonRpcStartOptions = { ignoreAvatars: true };
            await signalCli.connect(options);

            const [, args] = (spawn as jest.MockedFunction<typeof spawn>).mock.calls[0];
            expect(args).toContain('--ignore-avatars');
        });

        it('passes --ignore-stickers to signal-cli jsonRpc process', async () => {
            await signalCli.connect({ ignoreStickers: true });

            const [, args] = (spawn as jest.MockedFunction<typeof spawn>).mock.calls[0];
            expect(args).toContain('--ignore-stickers');
        });

        it('passes --ignore-attachments to signal-cli jsonRpc process', async () => {
            await signalCli.connect({ ignoreAttachments: true });

            const [, args] = (spawn as jest.MockedFunction<typeof spawn>).mock.calls[0];
            expect(args).toContain('--ignore-attachments');
        });

        it('passes --ignore-stories to signal-cli jsonRpc process', async () => {
            await signalCli.connect({ ignoreStories: true });

            const [, args] = (spawn as jest.MockedFunction<typeof spawn>).mock.calls[0];
            expect(args).toContain('--ignore-stories');
        });

        it('passes --send-read-receipts to signal-cli jsonRpc process', async () => {
            await signalCli.connect({ sendReadReceipts: true });

            const [, args] = (spawn as jest.MockedFunction<typeof spawn>).mock.calls[0];
            expect(args).toContain('--send-read-receipts');
        });

        it('passes --receive-mode with value to signal-cli jsonRpc process', async () => {
            await signalCli.connect({ receiveMode: 'manual' });

            const [, args] = (spawn as jest.MockedFunction<typeof spawn>).mock.calls[0];
            expect(args).toContain('--receive-mode');
            expect(args).toContain('manual');
        });

        it('passes --receive-mode on-start to signal-cli jsonRpc process', async () => {
            await signalCli.connect({ receiveMode: 'on-start' });

            const [, args] = (spawn as jest.MockedFunction<typeof spawn>).mock.calls[0];
            expect(args).toContain('--receive-mode');
            expect(args).toContain('on-start');
        });

        it('can pass all v0.14.0 flags together', async () => {
            await signalCli.connect({
                ignoreAvatars:    true,
                ignoreStickers:   true,
                ignoreAttachments: true,
                ignoreStories:    true,
                sendReadReceipts: true,
                receiveMode:      'manual',
            });

            const [, args] = (spawn as jest.MockedFunction<typeof spawn>).mock.calls[0];
            expect(args).toContain('--ignore-avatars');
            expect(args).toContain('--ignore-stickers');
            expect(args).toContain('--ignore-attachments');
            expect(args).toContain('--ignore-stories');
            expect(args).toContain('--send-read-receipts');
            expect(args).toContain('--receive-mode');
            expect(args).toContain('manual');
        });

        it('still includes account -a flag before jsonRpc', async () => {
            await signalCli.connect({ ignoreAvatars: true });

            const [, args] = (spawn as jest.MockedFunction<typeof spawn>).mock.calls[0];
            expect(args).toContain('-a');
            expect(args).toContain('+1234567890');
            expect(args).toContain('jsonRpc');
        });

        it('does not include falsy flags in spawn args', async () => {
            await signalCli.connect({
                ignoreAvatars:  false,
                ignoreStickers: false,
            });

            const [, args] = (spawn as jest.MockedFunction<typeof spawn>).mock.calls[0];
            expect(args).not.toContain('--ignore-avatars');
            expect(args).not.toContain('--ignore-stickers');
        });
    });

    // =========================================================================
    // Interface shape verification — compile-time safety at runtime
    // =========================================================================
    describe('interface shape', () => {
        it('PinMessageOptions accepts all documented fields', () => {
            const opts: PinMessageOptions = {
                targetAuthor:    '+10987654321',
                targetTimestamp: 1_700_000_000_000,
                groupId:         'grp==',
                recipients:      ['+10987654321'],
                pinDuration:     -1,
                noteToSelf:      false,
                notifySelf:      false,
            };
            expect(opts).toBeDefined();
        });

        it('UnpinMessageOptions accepts all documented fields', () => {
            const opts: UnpinMessageOptions = {
                targetAuthor:    '+10987654321',
                targetTimestamp: 1_700_000_000_000,
                groupId:         'grp==',
                recipients:      ['+10987654321'],
                noteToSelf:      false,
                notifySelf:      false,
            };
            expect(opts).toBeDefined();
        });

        it('AdminDeleteOptions accepts all documented fields', () => {
            const opts: AdminDeleteOptions = {
                groupId:         'grp==',
                targetAuthor:    '+10987654321',
                targetTimestamp: 1_700_000_000_000,
                story:           false,
                notifySelf:      false,
            };
            expect(opts).toBeDefined();
        });

        it('JsonRpcStartOptions accepts all documented fields', () => {
            const opts: JsonRpcStartOptions = {
                ignoreAttachments: true,
                ignoreStories:     true,
                ignoreAvatars:     true,
                ignoreStickers:    true,
                sendReadReceipts:  true,
                receiveMode:       'manual',
            };
            expect(opts).toBeDefined();
        });
    });
});
