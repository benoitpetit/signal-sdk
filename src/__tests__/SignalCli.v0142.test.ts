/**
 * Tests for signal-cli v0.14.2 new features
 *
 * Covers:
 *  - voiceNote flag on send command (FEAT-14)
 *  - Voice calling support: startCall, acceptCall, hangUpCall, sendCallRelayCandidates (FEAT-15)
 *  - Poll option length validation 1-100 chars (FEAT-13)
 *  - Call events emission
 */

import { SignalCli } from '../SignalCli';
import { spawn } from 'child_process';
import {
    StartCallOptions,
    AcceptCallOptions,
    HangUpCallOptions,
    SendCallRelayCandidatesOptions,
    CallRelayCandidate,
} from '../interfaces';

jest.mock('child_process');

// ---------------------------------------------------------------------------
// Shared mock factory
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('SignalCli — v0.14.2 new features', () => {
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
    // FEAT-13: Poll option length validation (1-100 characters)
    // =========================================================================
    describe('sendPollCreate — option length validation', () => {
        it('should throw error when option is empty (0 characters)', async () => {
            await expect(
                signalCli.sendPollCreate({
                    question: 'What is your favorite color?',
                    options: ['Red', '', 'Blue'], // Empty option
                    recipients: ['+33123456789'],
                })
            ).rejects.toThrow('Poll option 2 must be at least 1 character long');
        });

        it('should throw error when option exceeds 100 characters', async () => {
            const longOption = 'A'.repeat(101);
            await expect(
                signalCli.sendPollCreate({
                    question: 'What is your favorite color?',
                    options: ['Red', longOption, 'Blue'],
                    recipients: ['+33123456789'],
                })
            ).rejects.toThrow('Poll option 2 cannot exceed 100 characters');
        });

        it('should accept option with exactly 1 character', async () => {
            rpcSpy.mockResolvedValue({ timestamp: 1234567890 });

            await signalCli.sendPollCreate({
                question: 'Yes or No?',
                options: ['Y', 'N'],
                recipients: ['+33123456789'],
            });

            expect(rpcSpy).toHaveBeenCalledWith('sendPollCreate', expect.objectContaining({
                question: 'Yes or No?',
                options: ['Y', 'N'],
            }));
        });

        it('should accept option with exactly 100 characters', async () => {
            rpcSpy.mockResolvedValue({ timestamp: 1234567890 });
            const exactOption = 'A'.repeat(100);

            await signalCli.sendPollCreate({
                question: 'Choose one:',
                options: ['Short', exactOption],
                recipients: ['+33123456789'],
            });

            expect(rpcSpy).toHaveBeenCalledWith('sendPollCreate', expect.objectContaining({
                options: ['Short', exactOption],
            }));
        });

        it('should validate all options in the list', async () => {
            await expect(
                signalCli.sendPollCreate({
                    question: 'Test?',
                    options: ['OK', 'OK', 'OK', '', 'OK'], // 4th option is empty
                    recipients: ['+33123456789'],
                })
            ).rejects.toThrow('Poll option 4 must be at least 1 character long');
        });
    });

    // =========================================================================
    // FEAT-14: voiceNote flag on send command
    // =========================================================================
    describe('sendMessage — voiceNote flag', () => {
        it('should NOT include voiceNote by default', async () => {
            rpcSpy.mockResolvedValue({ timestamp: 1234567890 });
            await signalCli.sendMessage('+33123456789', 'Hello');

            const params = rpcSpy.mock.calls[0][1];
            expect(params.voiceNote).toBeUndefined();
        });

        it('should include voiceNote: true when specified', async () => {
            rpcSpy.mockResolvedValue({ timestamp: 1234567890 });
            await signalCli.sendMessage('+33123456789', 'Voice message', {
                attachments: ['/path/to/audio.ogg'],
                voiceNote: true,
            });

            expect(rpcSpy).toHaveBeenCalledWith('send', expect.objectContaining({
                voiceNote: true,
                attachments: ['/path/to/audio.ogg'],
            }));
        });

        it('can combine voiceNote with other send options', async () => {
            rpcSpy.mockResolvedValue({ timestamp: 1234567890 });
            await signalCli.sendMessage('+33123456789', 'Voice message', {
                attachments: ['/path/to/audio.ogg'],
                voiceNote: true,
                noUrgent: true,
                expiresInSeconds: 60,
            });

            expect(rpcSpy).toHaveBeenCalledWith('send', expect.objectContaining({
                voiceNote: true,
                noUrgent: true,
                expiresInSeconds: 60,
            }));
        });

        it('should work with group messages', async () => {
            rpcSpy.mockResolvedValue({ timestamp: 1234567890 });
            await signalCli.sendMessage('groupId==', 'Group voice message', {
                attachments: ['/path/to/audio.ogg'],
                voiceNote: true,
            });

            expect(rpcSpy).toHaveBeenCalledWith('send', expect.objectContaining({
                groupId: 'groupId==',
                voiceNote: true,
            }));
        });
    });

    // =========================================================================
    // FEAT-15: Voice calling support
    // =========================================================================
    describe('startCall — voice/video calling', () => {
        it('should start a voice call with recipient', async () => {
            rpcSpy.mockResolvedValue({
                callId: 'call-123-456',
                state: 'ringing',
            });

            const result = await signalCli.startCall({
                recipient: '+33123456789',
            });

            expect(rpcSpy).toHaveBeenCalledWith('startCall', expect.objectContaining({
                account: '+1234567890',
                recipient: '+33123456789',
            }));
            expect(result.callId).toBe('call-123-456');
            expect(result.type).toBe('voice');
            expect(result.direction).toBe('outgoing');
        });

        it('should start a video call when video: true', async () => {
            rpcSpy.mockResolvedValue({
                callId: 'call-789-012',
                state: 'ringing',
            });

            const result = await signalCli.startCall({
                recipient: '+33123456789',
                video: true,
            });

            expect(rpcSpy).toHaveBeenCalledWith('startCall', expect.objectContaining({
                account: '+1234567890',
                recipient: '+33123456789',
                video: true,
            }));
            expect(result.type).toBe('video');
        });

        it('should NOT include video flag when false/not specified', async () => {
            rpcSpy.mockResolvedValue({ callId: 'call-123' });
            await signalCli.startCall({ recipient: '+33123456789' });

            const params = rpcSpy.mock.calls[0][1];
            expect(params.video).toBeUndefined();
        });
    });

    describe('acceptCall — accepting incoming calls', () => {
        it('should accept a call with callId', async () => {
            rpcSpy.mockResolvedValue(undefined);

            await signalCli.acceptCall({ callId: 'incoming-call-123' });

            expect(rpcSpy).toHaveBeenCalledWith('acceptCall', expect.objectContaining({
                account: '+1234567890',
                callId: 'incoming-call-123',
            }));
        });
    });

    describe('hangUpCall — ending calls', () => {
        it('should hang up a call with callId', async () => {
            rpcSpy.mockResolvedValue(undefined);

            await signalCli.hangUpCall({ callId: 'active-call-456' });

            expect(rpcSpy).toHaveBeenCalledWith('hangUpCall', expect.objectContaining({
                account: '+1234567890',
                callId: 'active-call-456',
            }));
        });
    });

    describe('sendCallRelayCandidates — ICE candidates for WebRTC', () => {
        it('should send ICE relay candidates', async () => {
            rpcSpy.mockResolvedValue(undefined);

            const candidates: CallRelayCandidate[] = [
                {
                    candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 5000 typ host',
                    sdpMLineIndex: 0,
                    sdpMid: 'audio',
                },
                {
                    candidate: 'candidate:2 1 UDP 1694498815 203.0.113.1 5001 typ srflx raddr 192.168.1.1 rport 5000',
                    sdpMLineIndex: 0,
                    sdpMid: 'audio',
                },
            ];

            await signalCli.sendCallRelayCandidates({
                callId: 'call-123',
                candidates,
            });

            expect(rpcSpy).toHaveBeenCalledWith('sendCallRelayCandidates', expect.objectContaining({
                account: '+1234567890',
                callId: 'call-123',
                candidates: candidates,
            }));
        });
    });

    // =========================================================================
    // Call event emission
    // =========================================================================
    describe('Call event emission', () => {
        it('should emit call event when receiving callMessage', () => {
            const emitSpy = jest.spyOn(signalCli, 'emit');

            const emitDetailedEvents = (signalCli as any).emitDetailedEvents.bind(signalCli);

            const envelope = {
                source: '+33123456789',
                timestamp: 1234567890,
                callMessage: {
                    callId: 'incoming-call-789',
                    type: 'voice',
                    direction: 'incoming',
                    state: 'ringing',
                },
            };

            emitDetailedEvents(envelope);

            expect(emitSpy).toHaveBeenCalledWith(
                'call',
                expect.objectContaining({
                    sender: '+33123456789',
                    timestamp: 1234567890,
                    callId: 'incoming-call-789',
                    type: 'voice',
                    direction: 'incoming',
                    state: 'ringing',
                })
            );
        });

        it('should emit call event with video type', () => {
            const emitSpy = jest.spyOn(signalCli, 'emit');
            const emitDetailedEvents = (signalCli as any).emitDetailedEvents.bind(signalCli);

            const envelope = {
                source: '+33123456789',
                timestamp: 1234567890,
                callMessage: {
                    callId: 'video-call-001',
                    type: 'video',
                    direction: 'incoming',
                    state: 'ringing',
                },
            };

            emitDetailedEvents(envelope);

            expect(emitSpy).toHaveBeenCalledWith(
                'call',
                expect.objectContaining({
                    callId: 'video-call-001',
                    type: 'video',
                })
            );
        });
    });

    // =========================================================================
    // Interface shape verification
    // =========================================================================
    describe('interface shape', () => {
        it('StartCallOptions accepts all documented fields', () => {
            const opts: StartCallOptions = {
                recipient: '+33123456789',
                video: true,
            };
            expect(opts).toBeDefined();
            expect(opts.recipient).toBe('+33123456789');
            expect(opts.video).toBe(true);
        });

        it('StartCallOptions works without video flag', () => {
            const opts: StartCallOptions = {
                recipient: '+33123456789',
            };
            expect(opts.video).toBeUndefined();
        });

        it('AcceptCallOptions accepts callId', () => {
            const opts: AcceptCallOptions = {
                callId: 'call-123-456',
            };
            expect(opts.callId).toBe('call-123-456');
        });

        it('HangUpCallOptions accepts callId', () => {
            const opts: HangUpCallOptions = {
                callId: 'call-123-456',
            };
            expect(opts.callId).toBe('call-123-456');
        });

        it('SendCallRelayCandidatesOptions accepts callId and candidates', () => {
            const candidates: CallRelayCandidate[] = [
                {
                    candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 5000 typ host',
                    sdpMLineIndex: 0,
                    sdpMid: 'audio',
                },
            ];
            const opts: SendCallRelayCandidatesOptions = {
                callId: 'call-123',
                candidates,
            };
            expect(opts.callId).toBe('call-123');
            expect(opts.candidates).toHaveLength(1);
            expect(opts.candidates[0].sdpMLineIndex).toBe(0);
        });

        it('CallRelayCandidate has required fields', () => {
            const candidate: CallRelayCandidate = {
                candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 5000 typ host',
                sdpMLineIndex: 0,
                sdpMid: 'audio',
            };
            expect(candidate.candidate).toContain('candidate:');
            expect(candidate.sdpMLineIndex).toBe(0);
            expect(candidate.sdpMid).toBe('audio');
        });
    });
});
