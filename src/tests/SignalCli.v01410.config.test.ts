import { spawn } from 'child_process';
import { SignalCli } from '../SignalCli';
import { SignalCliConfig, validateConfig } from '../config';

jest.mock('child_process');

const TLS_PROXY = 'https://signal.tube/#relay.example';

function buildMockProcess() {
    const stdout = {
        on: jest.fn(),
        once: jest.fn().mockImplementation((event: string, callback: () => void) => {
            if (event === 'data') callback();
        }),
    };

    return {
        stdout,
        stderr: { on: jest.fn() },
        stdin: { write: jest.fn() },
        on: jest.fn(),
        once: jest.fn(),
        kill: jest.fn(),
        killed: false,
    };
}

describe('signal-cli v0.14.10 TLS proxy startup', () => {
    const spawnMock = spawn as jest.MockedFunction<typeof spawn>;
    let signalCli: SignalCli | undefined;

    beforeEach(() => {
        spawnMock.mockReturnValue(buildMockProcess() as any);
    });

    afterEach(() => {
        signalCli?.disconnect();
        signalCli = undefined;
        jest.clearAllMocks();
    });

    it('passes TLS proxy as a single global argument before jsonRpc', async () => {
        const config: SignalCliConfig = {
            account: '+1234567890',
            tlsProxy: TLS_PROXY,
            autoReconnect: false,
        };
        signalCli = new SignalCli(config);

        await signalCli.connect();

        const args = spawnMock.mock.calls[0][1] as string[];
        const proxyIndex = args.indexOf('--tls-proxy');
        const jsonRpcIndex = args.indexOf('jsonRpc');

        expect(args.slice(proxyIndex, proxyIndex + 2)).toEqual(['--tls-proxy', TLS_PROXY]);
        expect(proxyIndex).toBeGreaterThanOrEqual(0);
        expect(proxyIndex).toBeLessThan(jsonRpcIndex);
    });

    it('omits TLS proxy when unset', async () => {
        signalCli = new SignalCli({ account: '+1234567890', autoReconnect: false });

        await signalCli.connect();

        const args = spawnMock.mock.calls[0][1] as string[];
        expect(args).not.toContain('--tls-proxy');
    });

    it('accepts TLS proxy config alongside externally managed daemon modes', () => {
        for (const daemonMode of ['unix-socket', 'tcp', 'http'] as const) {
            expect(() => validateConfig({ daemonMode, tlsProxy: TLS_PROXY })).not.toThrow();
        }
    });

    it('passes TLS proxy to one-shot CLI commands when the RPC daemon is external', async () => {
        const commandProcess = buildMockProcess();
        commandProcess.once.mockImplementation((event: string, callback: (...args: any[]) => void) => {
            if (event === 'close') callback(0);
            return commandProcess as any;
        });
        spawnMock.mockReturnValue(commandProcess as any);
        signalCli = new SignalCli({
            account: '+1234567890',
            daemonMode: 'http',
            tlsProxy: TLS_PROXY,
            autoReconnect: false,
        });

        await (signalCli as any).executeCliCommand(['register']);

        const args = spawnMock.mock.calls[0][1] as string[];
        expect(args.slice(0, 2)).toEqual(['--tls-proxy', TLS_PROXY]);
        expect(args.indexOf('--tls-proxy')).toBeLessThan(args.indexOf('register'));
    });

    it('rejects non-string TLS proxy values at runtime', () => {
        expect(() => validateConfig({ tlsProxy: 42 } as any)).toThrow('tlsProxy must be a string');
    });
});
