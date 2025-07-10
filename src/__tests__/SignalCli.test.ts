import { SignalCli } from '../SignalCli';
import { spawn } from 'child_process';

jest.mock('child_process');

describe('SignalCli', () => {
  let signalCli: SignalCli;
  let mockProcess: any;

  beforeEach(() => {
    mockProcess = {
      stdout: {
        on: jest.fn(),
        once: jest.fn(),
      },
      stderr: {
        on: jest.fn(),
      },
      stdin: {
        write: jest.fn(),
      },
      on: jest.fn(),
      once: jest.fn(),
      kill: jest.fn(),
    };

    const spawnMock = spawn as jest.MockedFunction<typeof spawn>;
    spawnMock.mockReturnValue(mockProcess);

    signalCli = new SignalCli('signal-cli', '+1234567890');
  });

  it('should be defined', () => {
    expect(SignalCli).toBeDefined();
  });

  it('should connect to JSON-RPC mode', async () => {
    // Mock the stdout data event to resolve connect
    mockProcess.stdout.once.mockImplementation((event: string, callback: () => void) => {
      if (event === 'data') {
        callback();
      }
    });

    await signalCli.connect();

    expect(spawn).toHaveBeenCalledWith('signal-cli', ['-a', '+1234567890', 'jsonRpc']);
  });

  it('should send JSON-RPC request for sendMessage', async () => {
    // Mock sendJsonRpcRequest directly
    const sendJsonRpcRequestSpy = jest.spyOn(signalCli as any, 'sendJsonRpcRequest')
      .mockResolvedValue({ results: [{ type: 'SUCCESS' }], timestamp: 123456 });

    await signalCli.sendMessage('+10987654321', 'Hello, world!');

    expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('send', {
      message: 'Hello, world!',
      account: '+1234567890',
      recipients: ['+10987654321'],
    });
  });

  it('should disconnect properly', async () => {
    // Connect first
    mockProcess.stdout.once.mockImplementation((event: string, callback: () => void) => {
      if (event === 'data') {
        setTimeout(callback, 0);
      }
    });
    await signalCli.connect();

    // Now disconnect
    signalCli.disconnect();
    expect(mockProcess.kill).toHaveBeenCalled();
  });
});
