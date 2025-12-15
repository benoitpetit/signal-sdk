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

    // On Windows, spawn may use cmd.exe /c, so we check the arguments more flexibly
    const spawnCalls = (spawn as jest.MockedFunction<typeof spawn>).mock.calls;
    expect(spawnCalls).toHaveLength(1);
    
    const [command, args] = spawnCalls[0];
    if (process.platform === 'win32') {
      // On Windows, expect cmd.exe with /c and the actual command
      expect(command).toBe('cmd.exe');
      expect(args).toEqual(['/c', 'signal-cli', '-a', '+1234567890', 'jsonRpc']);
    } else {
      // On Unix-like systems, expect direct command
      expect(command).toBe('signal-cli');
      expect(args).toEqual(['-a', '+1234567890', 'jsonRpc']);
    }
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

  // Test new features
  describe('New Features', () => {
    beforeEach(() => {
      // Mock sendJsonRpcRequest for all tests
      jest.spyOn(signalCli as any, 'sendJsonRpcRequest').mockResolvedValue({});
    });

    it('should remove contact', async () => {
      const sendJsonRpcRequestSpy = jest.spyOn(signalCli as any, 'sendJsonRpcRequest')
        .mockResolvedValue({});

      await signalCli.removeContact('+1234567890', { forget: true });

      expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('removeContact', {
        account: '+1234567890',
        recipient: '+1234567890',
        forget: true
      });
    });

    it('should get user status', async () => {
      const mockResponse = {
        recipients: [
          { number: '+1234567890', isRegistered: true, uuid: 'test-uuid' }
        ]
      };
      
      const sendJsonRpcRequestSpy = jest.spyOn(signalCli as any, 'sendJsonRpcRequest')
        .mockResolvedValue(mockResponse);

      const result = await signalCli.getUserStatus(['+1234567890']);

      expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('getUserStatus', {
        account: '+1234567890',
        recipients: ['+1234567890']
      });

      expect(result).toEqual([
        { number: '+1234567890', isRegistered: true, uuid: 'test-uuid', username: undefined }
      ]);
    });

    it('should send payment notification', async () => {
      const sendJsonRpcRequestSpy = jest.spyOn(signalCli as any, 'sendJsonRpcRequest')
        .mockResolvedValue({ timestamp: 123456 });

      await signalCli.sendPaymentNotification('+1234567890', {
        receipt: 'base64-receipt',
        note: 'Payment for coffee'
      });

      expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('sendPaymentNotification', {
        account: '+1234567890',
        recipient: '+1234567890',
        receipt: 'base64-receipt',
        note: 'Payment for coffee'
      });
    });

    it('should upload sticker pack', async () => {
      const mockResponse = {
        packId: 'pack-id',
        packKey: 'pack-key',
        installUrl: 'https://signal.org/stickers/pack-id'
      };
      
      const sendJsonRpcRequestSpy = jest.spyOn(signalCli as any, 'sendJsonRpcRequest')
        .mockResolvedValue(mockResponse);

      const result = await signalCli.uploadStickerPack({
        path: '/path/to/manifest.json'
      });

      expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('uploadStickerPack', {
        account: '+1234567890',
        path: '/path/to/manifest.json'
      });

      expect(result).toEqual(mockResponse);
    });

    it('should submit rate limit challenge', async () => {
      const mockResponse = {
        success: true,
        message: 'Challenge accepted'
      };
      
      const sendJsonRpcRequestSpy = jest.spyOn(signalCli as any, 'sendJsonRpcRequest')
        .mockResolvedValue(mockResponse);

      const result = await signalCli.submitRateLimitChallenge('challenge-token', 'captcha-token');

      expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('submitRateLimitChallenge', {
        account: '+1234567890',
        challenge: 'challenge-token',
        captcha: 'captcha-token'
      });

      expect(result).toEqual(mockResponse);
    });

    it('should start change number', async () => {
      const mockResponse = {
        session: 'change-session-id',
        challenge: 'challenge-token'
      };
      
      const sendJsonRpcRequestSpy = jest.spyOn(signalCli as any, 'sendJsonRpcRequest')
        .mockResolvedValue(mockResponse);

      const result = await signalCli.startChangeNumber('+1987654321');

      expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('startChangeNumber', {
        account: '+1234567890',
        number: '+1987654321',
        voice: false
      });

      expect(result).toEqual({
        session: 'change-session-id',
        newNumber: '+1987654321',
        challenge: 'challenge-token'
      });
    });

    it('should finish change number', async () => {
      const sendJsonRpcRequestSpy = jest.spyOn(signalCli as any, 'sendJsonRpcRequest')
        .mockResolvedValue({});

      await signalCli.finishChangeNumber('123456', 'pin-code');

      expect(sendJsonRpcRequestSpy).toHaveBeenCalledWith('finishChangeNumber', {
        account: '+1234567890',
        code: '123456',
        pin: 'pin-code'
      });
    });
  });

  // Test cross-platform path detection
  describe('Cross-platform compatibility', () => {
    it('should use correct executable path based on platform', () => {
      // Test Windows path
      const originalPlatform = process.platform;
      
      // Mock Windows
      Object.defineProperty(process, 'platform', { value: 'win32' });
      const windowsSignal = new SignalCli('+1234567890');
      expect((windowsSignal as any).signalCliPath).toContain('signal-cli.bat');
      
      // Mock Linux
      Object.defineProperty(process, 'platform', { value: 'linux' });
      const linuxSignal = new SignalCli('+1234567890');
      expect((linuxSignal as any).signalCliPath).toContain('signal-cli');
      expect((linuxSignal as any).signalCliPath).not.toContain('.bat');
      
      // Mock macOS
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      const macSignal = new SignalCli('+1234567890');
      expect((macSignal as any).signalCliPath).toContain('signal-cli');
      expect((macSignal as any).signalCliPath).not.toContain('.bat');
      
      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should spawn correct command based on platform', async () => {
      const originalPlatform = process.platform;
      
      // Test Windows spawning
      Object.defineProperty(process, 'platform', { value: 'win32' });
      const windowsSignal = new SignalCli('test-path.bat', '+1234567890');
      
      mockProcess.stdout.once.mockImplementation((event: string, callback: () => void) => {
        if (event === 'data') callback();
      });
      
      await windowsSignal.connect();
      
      const windowsCalls = (spawn as jest.MockedFunction<typeof spawn>).mock.calls;
      const lastCall = windowsCalls[windowsCalls.length - 1];
      expect(lastCall[0]).toBe('cmd.exe');
      expect(lastCall[1]).toEqual(['/c', '"test-path.bat"', '-a', '+1234567890', 'jsonRpc']);
      
      // Test Unix spawning
      Object.defineProperty(process, 'platform', { value: 'linux' });
      const linuxSignal = new SignalCli('test-path', '+1234567890');
      
      await linuxSignal.connect();
      
      const linuxCalls = (spawn as jest.MockedFunction<typeof spawn>).mock.calls;
      const lastLinuxCall = linuxCalls[linuxCalls.length - 1];
      expect(lastLinuxCall[0]).toBe('test-path');
      expect(lastLinuxCall[1]).toEqual(['-a', '+1234567890', 'jsonRpc']);
      
      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });
});
