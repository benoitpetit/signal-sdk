import { SignalCli } from '../SignalCli';

// Mock dependencies
jest.mock('child_process');
jest.mock('../config', () => ({
    Logger: jest.fn().mockImplementation(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    })),
    validateConfig: jest.fn().mockReturnValue({
        verbose: false,
    }),
}));

describe('SignalCli - Advanced Events', () => {
    let signalCli: SignalCli;
    const mockAccount = '+1234567890';

    beforeEach(() => {
        jest.clearAllMocks();
        signalCli = new SignalCli(mockAccount);
    });

    it('should emit "reaction" event when receiving a reaction', (done) => {
        const reactionPayload = {
            jsonrpc: '2.0',
            method: 'receive',
            params: {
                envelope: {
                    source: '+1111111111',
                    timestamp: 1600000000000,
                    dataMessage: {
                        reaction: {
                            emoji: '👍',
                            targetAuthor: '+1234567890',
                            targetSentTimestamp: 1599999999999,
                            isRemove: false,
                        },
                    },
                },
            },
        };

        signalCli.on('reaction', (event) => {
            try {
                expect(event.emoji).toBe('👍');
                expect(event.sender).toBe('+1111111111');
                expect(event.targetTimestamp).toBe(1599999999999);
                done();
            } catch (error) {
                done(error);
            }
        });

        // Simulate incoming data
        (signalCli as any).handleRpcResponse(JSON.stringify(reactionPayload));
    });

    it('should emit "receipt" event when receiving a receipt', (done) => {
        const receiptPayload = {
            jsonrpc: '2.0',
            method: 'receive',
            params: {
                envelope: {
                    source: '+2222222222',
                    timestamp: 1600000000000,
                    receiptMessage: {
                        type: 'READ',
                        timestamps: [1599999999999],
                        when: 1600000000000,
                    },
                },
            },
        };

        signalCli.on('receipt', (event) => {
            try {
                expect(event.type).toBe('READ');
                expect(event.sender).toBe('+2222222222');
                expect(event.timestamps).toContain(1599999999999);
                done();
            } catch (error) {
                done(error);
            }
        });

        (signalCli as any).handleRpcResponse(JSON.stringify(receiptPayload));
    });

    it('should emit "typing" event when receiving typing indicator', (done) => {
        const typingPayload = {
            jsonrpc: '2.0',
            method: 'receive',
            params: {
                envelope: {
                    source: '+3333333333',
                    timestamp: 1600000000000,
                    typingMessage: {
                        action: 'STARTED',
                        groupId: null,
                    },
                },
            },
        };

        signalCli.on('typing', (event) => {
            try {
                expect(event.action).toBe('STARTED');
                expect(event.sender).toBe('+3333333333');
                done();
            } catch (error) {
                done(error);
            }
        });

        (signalCli as any).handleRpcResponse(JSON.stringify(typingPayload));
    });
});
