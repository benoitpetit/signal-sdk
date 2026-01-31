import { SignalCli } from '../SignalCli';
import * as net from 'net';
import * as http from 'http';
import * as https from 'https';
import { EventEmitter } from 'events';

jest.mock('net');
jest.mock('http');
jest.mock('https');

describe('SignalCli Connections', () => {
    let signalCli: SignalCli;
    let mockSocket: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSocket = new EventEmitter();
        mockSocket.write = jest.fn();
        mockSocket.destroy = jest.fn();
        (net.createConnection as jest.Mock).mockReturnValue(mockSocket);
    });

    it('should connect via Unix socket', async () => {
        signalCli = new SignalCli('+1234567890', undefined, {
            daemonMode: 'unix-socket',
            socketPath: '/tmp/test.sock'
        });

        const connectPromise = signalCli.connect();
        setImmediate(() => mockSocket.emit('connect'));
        await connectPromise;

        expect(net.createConnection).toHaveBeenCalledWith('/tmp/test.sock');
    });

    it('should connect via TCP', async () => {
        signalCli = new SignalCli('+1234567890', undefined, {
            daemonMode: 'tcp',
            tcpHost: '1.2.3.4',
            tcpPort: 1234
        });

        const connectPromise = signalCli.connect();
        setImmediate(() => mockSocket.emit('connect'));
        await connectPromise;

        expect(net.createConnection).toHaveBeenCalledWith(1234, '1.2.3.4');
    });

    it('should connect via HTTP', async () => {
        const mockRes = new EventEmitter() as any;
        mockRes.on = jest.fn().mockImplementation((event, cb) => {
            if (event === 'data') cb(JSON.stringify({ jsonrpc: '2.0', result: 'ok', id: '1' }));
            if (event === 'end') cb();
            return mockRes;
        });

        const mockReq = new EventEmitter() as any;
        mockReq.write = jest.fn();
        mockReq.end = jest.fn();
        mockReq.setTimeout = jest.fn();

        (http.request as jest.Mock).mockImplementation((url, opts, cb) => {
            setImmediate(() => cb(mockRes));
            return mockReq;
        });

        signalCli = new SignalCli('+1234567890', undefined, {
            daemonMode: 'http',
            httpBaseUrl: 'http://localhost:8080'
        });

        await signalCli.connect();
        expect(http.request).toHaveBeenCalled();
    });

    it('should handle socket data and errors', async () => {
        signalCli = new SignalCli('+1234567890', undefined, {
            daemonMode: 'tcp'
        });

        const connectPromise = signalCli.connect();
        setImmediate(() => mockSocket.emit('connect'));
        await connectPromise;

        const errorSpy = jest.fn();
        signalCli.on('error', errorSpy);

        mockSocket.emit('data', Buffer.from('invalid json\n'));
        expect(errorSpy).toHaveBeenCalled();
    });
});
