import { SignalCli } from '../SignalCli';
import { SendResponse, UserStatusResult } from '../interfaces';

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
        logFile: undefined,
        maxConcurrentRequests: 10,
        minRequestInterval: 100,
    }),
}));

describe('SignalCli - Simple Features', () => {
    let signalCli: SignalCli;
    const mockAccount = '+1234567890';

    beforeEach(() => {
        // Reset mocks and instance
        jest.clearAllMocks();
        signalCli = new SignalCli(mockAccount);

        // Mock the internal request method to avoid real calls
        (signalCli as any).sendJsonRpcRequest = jest.fn();
    });

    describe('isRegistered', () => {
        it('should return true when user is registered', async () => {
            const mockResponse: UserStatusResult[] = [
                {
                    number: '+1987654321',
                    isRegistered: true,
                    uuid: 'uuid-123',
                },
            ];

            (signalCli as any).sendJsonRpcRequest.mockResolvedValue({
                recipients: mockResponse,
            });

            const result = await signalCli.isRegistered('+1987654321');
            expect(result).toBe(true);
            expect((signalCli as any).sendJsonRpcRequest).toHaveBeenCalledWith(
                'getUserStatus',
                expect.objectContaining({ recipients: ['+1987654321'] }),
            );
        });

        it('should return false when user is not registered', async () => {
            const mockResponse: UserStatusResult[] = [
                {
                    number: '+1987654321',
                    isRegistered: false,
                },
            ];

            (signalCli as any).sendJsonRpcRequest.mockResolvedValue({
                recipients: mockResponse,
            });

            const result = await signalCli.isRegistered('+1987654321');
            expect(result).toBe(false);
        });
    });

    describe('sendNoteToSelf', () => {
        it('should send message to self account', async () => {
            const message = 'Note to self test';
            const mockResponse: SendResponse = {
                timestamp: 123456789,
                results: [],
            };

            // Mock sendMessage to verify it's called correctly
            const sendMessageSpy = jest.spyOn(signalCli, 'sendMessage').mockResolvedValue(mockResponse);

            await signalCli.sendNoteToSelf(message);

            expect(sendMessageSpy).toHaveBeenCalledWith(
                mockAccount,
                message,
                expect.objectContaining({ noteToSelf: true }),
            );
        });

        it('should throw error if account is not configured', async () => {
            const noAccountCli = new SignalCli();
            await expect(noAccountCli.sendNoteToSelf('fail')).rejects.toThrow('Account must be configured');
        });
    });
});
