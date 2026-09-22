import { spawn } from 'child_process';
import { SignalCli } from '../SignalCli';

jest.mock('child_process');

describe('SignalCli direct command execution', () => {
    let signalCli: SignalCli;
    let mockProcess: any;
    let listeners: Map<string, (...args: any[]) => void>;

    beforeEach(() => {
        listeners = new Map();
        mockProcess = {
            stdout: { on: jest.fn() },
            stderr: { on: jest.fn() },
            once: jest.fn((event: string, callback: (...args: any[]) => void) => listeners.set(event, callback)),
            kill: jest.fn(),
        };
        mockProcess.stdout.on.mockImplementation((event: string, callback: (...args: any[]) => void) => {
            listeners.set(`stdout:${event}`, callback);
        });
        mockProcess.stderr.on.mockImplementation((event: string, callback: (...args: any[]) => void) => {
            listeners.set(`stderr:${event}`, callback);
        });
        (spawn as jest.Mock).mockReturnValue(mockProcess);
        signalCli = new SignalCli('signal-cli', '+33123456789', {
            dataPath: '/tmp/signal-sdk-data',
            requestTimeout: 1000,
        });
    });

    it('runs registration through the CLI with global options', async () => {
        const registration = signalCli.register('+33123456789', true, 'captcha-token', true);
        listeners.get('stdout:data')?.(Buffer.from('registered'));
        listeners.get('close')?.(0);

        await expect(registration).resolves.toBeUndefined();
        expect(spawn).toHaveBeenCalledWith(
            'signal-cli',
            [
                '--config',
                '/tmp/signal-sdk-data',
                '-a',
                '+33123456789',
                'register',
                '--voice',
                '--captcha',
                'captcha-token',
                '--reregister',
            ],
            { stdio: ['ignore', 'pipe', 'pipe'] },
        );
    });

    it('propagates CLI failures with stderr details', async () => {
        const command = (signalCli as any).executeCliCommand(['version']);
        listeners.get('stderr:data')?.(Buffer.from('invalid installation'));
        listeners.get('close')?.(2);

        await expect(command).rejects.toThrow('code 2: invalid installation');
    });

    it('propagates process startup failures', async () => {
        const command = (signalCli as any).executeCliCommand(['version']);
        listeners.get('error')?.(new Error('spawn failed'));

        await expect(command).rejects.toThrow('spawn failed');
    });

    it('times out and terminates a stalled command', async () => {
        jest.useFakeTimers();
        try {
            const command = (signalCli as any).executeCliCommand(['version']);
            jest.advanceTimersByTime(1000);

            await expect(command).rejects.toThrow('timed out');
            expect(mockProcess.kill).toHaveBeenCalled();
        } finally {
            jest.useRealTimers();
        }
    });
});
