/** Contract tests for signal-cli v0.14.6 through v0.14.8 JSON-RPC additions. */

import { spawn } from 'child_process';
import { SignalCli } from '../SignalCli';

jest.mock('child_process');

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

describe('SignalCli — v0.14.8 compatibility', () => {
    let signalCli: SignalCli;
    let rpcSpy: jest.SpyInstance;

    beforeEach(() => {
        (spawn as jest.MockedFunction<typeof spawn>).mockReturnValue(buildMockProcess() as any);
        signalCli = new SignalCli('signal-cli', '+1234567890');
        rpcSpy = jest.spyOn(signalCli as any, 'sendJsonRpcRequest').mockResolvedValue({ timestamp: 1234567890 });
    });

    afterEach(() => {
        signalCli.disconnect();
        jest.clearAllMocks();
    });

    it('sends an attachment story to My Story', async () => {
        await signalCli.sendStory({ attachment: '/tmp/story.jpg' });

        expect(rpcSpy).toHaveBeenCalledWith('sendStory', {
            account: '+1234567890',
            attachment: '/tmp/story.jpg',
        });
    });

    it('sends a group story and disables replies when requested', async () => {
        await signalCli.sendStory({
            attachment: '/tmp/story.mp4',
            groupId: 'group123==',
            allowReplies: false,
        });

        expect(rpcSpy).toHaveBeenCalledWith('sendStory', {
            account: '+1234567890',
            attachment: '/tmp/story.mp4',
            groupId: 'group123==',
            noReplies: true,
        });
    });

    it('rejects a story without an attachment', async () => {
        await expect(signalCli.sendStory({ attachment: '' })).rejects.toThrow('Story attachment is required');
    });

    it('terminates a group with the v0.14.8 command', async () => {
        await signalCli.terminateGroup('group123==');

        expect(rpcSpy).toHaveBeenCalledWith('terminateGroup', {
            account: '+1234567890',
            groupId: 'group123==',
        });
    });
});
