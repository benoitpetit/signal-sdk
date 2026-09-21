import { SignalCli } from '../SignalCli';
import * as net from 'net';
import * as http from 'http';

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
        mockReq.destroy = jest.fn();
        mockReq.setTimeout = jest.fn();

        (http.request as jest.Mock).mockImplementation((url, opts, cb) => {
            setImmediate(() => cb(mockRes));
            return mockReq;
        });

        signalCli = new SignalCli('+1234567890', undefined, {
            daemonMode: 'http',
            httpBaseUrl: 'http://localhost:8080',
            autoReconnect: false,
        });

        await signalCli.connect();
        expect(http.request).toHaveBeenCalledTimes(2);
        expect((http.request as jest.Mock).mock.calls[1][1]).toEqual(
            expect.objectContaining({
                method: 'GET',
                headers: { Accept: 'text/event-stream' },
            }),
        );
    });

    it('should reject an unsupported daemon mode', async () => {
        signalCli = new SignalCli('+1234567890', undefined, {
            daemonMode: 'unsupported' as any,
        });

        await expect(signalCli.connect()).rejects.toThrow('Invalid daemon mode: unsupported');
    });

    it('should dispatch JSON-RPC notifications received through SSE data frames', () => {
        signalCli = new SignalCli('+1234567890', undefined, { daemonMode: 'http', autoReconnect: false });
        const messageHandler = jest.fn();
        signalCli.on('message', messageHandler);

        (signalCli as any).handleSseData(
            'data: {"jsonrpc":"2.0","method":"receive","params":{"envelope":{"dataMessage":{"message":"hello"}}}}\n\n',
        );

        expect(messageHandler).toHaveBeenCalledWith({ envelope: { dataMessage: { message: 'hello' } } });
    });

    it('should reject HTTP connection when the SSE endpoint returns an error status', async () => {
        const rpcResponse = new EventEmitter() as any;
        rpcResponse.on = jest.fn().mockImplementation((event, callback) => {
            if (event === 'data') callback(JSON.stringify({ jsonrpc: '2.0', result: 'ok', id: '1' }));
            if (event === 'end') callback();
            return rpcResponse;
        });
        const eventsResponse = new EventEmitter() as any;
        eventsResponse.statusCode = 503;
        eventsResponse.resume = jest.fn();
        const rpcRequest = new EventEmitter() as any;
        rpcRequest.write = jest.fn();
        rpcRequest.end = jest.fn();
        rpcRequest.setTimeout = jest.fn();
        rpcRequest.destroy = jest.fn();
        const eventsRequest = new EventEmitter() as any;
        eventsRequest.write = jest.fn();
        eventsRequest.end = jest.fn();
        eventsRequest.setTimeout = jest.fn();
        eventsRequest.destroy = jest.fn();

        (http.request as jest.Mock)
            .mockImplementationOnce((_url, _options, callback) => {
                setImmediate(() => callback(rpcResponse));
                return rpcRequest;
            })
            .mockImplementationOnce((_url, _options, callback) => {
                setImmediate(() => callback(eventsResponse));
                return eventsRequest;
            });

        signalCli = new SignalCli('+1234567890', undefined, { daemonMode: 'http', autoReconnect: false });

        await expect(signalCli.connect()).rejects.toThrow('HTTP events endpoint returned status 503');
        expect(eventsResponse.resume).toHaveBeenCalled();
    });

    it('should close the SSE request when disconnecting from HTTP mode', async () => {
        const mockRes = new EventEmitter() as any;
        mockRes.on = jest.fn().mockImplementation((event, callback) => {
            if (event === 'data') callback(JSON.stringify({ jsonrpc: '2.0', result: 'ok', id: '1' }));
            if (event === 'end') callback();
            return mockRes;
        });
        const mockReq = new EventEmitter() as any;
        mockReq.write = jest.fn();
        mockReq.end = jest.fn();
        mockReq.destroy = jest.fn();
        mockReq.setTimeout = jest.fn();
        (http.request as jest.Mock).mockImplementation((_url, _options, callback) => {
            setImmediate(() => callback(mockRes));
            return mockReq;
        });

        signalCli = new SignalCli('+1234567890', undefined, { daemonMode: 'http', autoReconnect: false });
        await signalCli.connect();
        signalCli.disconnect();

        expect(mockReq.destroy).toHaveBeenCalled();
    });

    it('should emit close and stream errors from an established SSE connection', async () => {
        const rpcResponse = new EventEmitter() as any;
        rpcResponse.on = jest.fn().mockImplementation((event, callback) => {
            if (event === 'data') callback(JSON.stringify({ jsonrpc: '2.0', result: 'ok', id: '1' }));
            if (event === 'end') callback();
            return rpcResponse;
        });
        const eventsResponse = new EventEmitter() as any;
        const request = new EventEmitter() as any;
        request.write = jest.fn();
        request.end = jest.fn();
        request.destroy = jest.fn();
        request.setTimeout = jest.fn();
        (http.request as jest.Mock)
            .mockImplementationOnce((_url, _options, callback) => {
                setImmediate(() => callback(rpcResponse));
                return request;
            })
            .mockImplementationOnce((_url, _options, callback) => {
                setImmediate(() => callback(eventsResponse));
                return request;
            });

        signalCli = new SignalCli('+1234567890', undefined, { daemonMode: 'http', autoReconnect: false });
        const closeHandler = jest.fn();
        const errorHandler = jest.fn();
        signalCli.on('close', closeHandler);
        signalCli.on('error', errorHandler);
        await signalCli.connect();

        eventsResponse.emit('error', new Error('stream failed'));
        eventsResponse.emit('close');

        expect(closeHandler).toHaveBeenCalledWith(0);
        expect(errorHandler).toHaveBeenCalledWith(expect.objectContaining({ message: 'stream failed' }));
    });

    it('should reject when the SSE request fails before receiving headers', async () => {
        const rpcResponse = new EventEmitter() as any;
        rpcResponse.on = jest.fn().mockImplementation((event, callback) => {
            if (event === 'data') callback(JSON.stringify({ jsonrpc: '2.0', result: 'ok', id: '1' }));
            if (event === 'end') callback();
            return rpcResponse;
        });
        const eventsRequest = new EventEmitter() as any;
        eventsRequest.write = jest.fn();
        eventsRequest.end = jest.fn();
        eventsRequest.destroy = jest.fn();
        eventsRequest.setTimeout = jest.fn();
        (http.request as jest.Mock)
            .mockImplementationOnce((_url, _options, callback) => {
                setImmediate(() => callback(rpcResponse));
                return eventsRequest;
            })
            .mockImplementationOnce(() => {
                setImmediate(() => eventsRequest.emit('error', new Error('connection failed')));
                return eventsRequest;
            });

        signalCli = new SignalCli('+1234567890', undefined, { daemonMode: 'http' });

        await expect(signalCli.connect()).rejects.toThrow('HTTP events request failed: connection failed');
    });

    it('should schedule one reconnect after an unexpected transport close', async () => {
        jest.useFakeTimers();
        signalCli = new SignalCli('+1234567890', undefined, { autoReconnect: true });
        const connectSpy = jest.spyOn(signalCli, 'connect').mockResolvedValue(undefined);

        (signalCli as any).scheduleReconnect('HTTP event stream closed');
        (signalCli as any).scheduleReconnect('duplicate close');
        await jest.advanceTimersByTimeAsync(1000);

        expect(connectSpy).toHaveBeenCalledTimes(1);
        expect((signalCli as any).metrics.reconnects).toBe(1);
        jest.useRealTimers();
    });

    it('should not schedule reconnects when autoReconnect is disabled', async () => {
        jest.useFakeTimers();
        signalCli = new SignalCli('+1234567890', undefined, { autoReconnect: false });
        const connectSpy = jest.spyOn(signalCli, 'connect').mockResolvedValue(undefined);

        (signalCli as any).scheduleReconnect('transport closed');
        await jest.advanceTimersByTimeAsync(2000);

        expect(connectSpy).not.toHaveBeenCalled();
        jest.useRealTimers();
    });

    it('should report a failed reconnect and stop at the retry limit', async () => {
        jest.useFakeTimers();
        signalCli = new SignalCli('+1234567890', undefined, { autoReconnect: true });
        const connectSpy = jest.spyOn(signalCli, 'connect').mockRejectedValue(new Error('reconnect failed'));
        const errorSpy = jest.spyOn((signalCli as any).logger, 'error');
        (signalCli as any).reconnectAttempts = 4;

        (signalCli as any).scheduleReconnect('transport closed');
        await jest.advanceTimersByTimeAsync(16000);

        expect(connectSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy).toHaveBeenCalledWith('Reconnection attempt failed:', expect.any(Error));
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Max reconnection attempts reached'));
        jest.useRealTimers();
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

    it('should close socket connections during graceful shutdown', async () => {
        signalCli = new SignalCli('+1234567890', undefined, { daemonMode: 'tcp' });

        const connectPromise = signalCli.connect();
        setImmediate(() => mockSocket.emit('connect'));
        await connectPromise;

        await signalCli.gracefulShutdown();

        expect(mockSocket.destroy).toHaveBeenCalled();
    });
});
