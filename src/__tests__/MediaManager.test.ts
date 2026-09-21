import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as https from 'https';

import { MAX_DOWNLOAD_BYTES, MediaManager } from '../bot/MediaManager';

jest.mock('http', () => ({ get: jest.fn() }));
jest.mock('https', () => ({ get: jest.fn() }));
jest.mock('fs', () => ({
    existsSync: jest.fn().mockReturnValue(true),
    createWriteStream: jest.fn(),
    unlink: jest.fn((_path: string, callback: (error?: Error) => void) => callback()),
    promises: {
        writeFile: jest.fn().mockResolvedValue(undefined),
        unlink: jest.fn().mockResolvedValue(undefined),
    },
}));

function createResponse(statusCode: number, headers: Record<string, string> = {}): EventEmitter & {
    statusCode: number;
    headers: Record<string, string>;
    pipe: jest.Mock;
    resume: jest.Mock;
    destroy: jest.Mock;
} {
    const response = new EventEmitter() as EventEmitter & {
        statusCode: number;
        headers: Record<string, string>;
        pipe: jest.Mock;
        resume: jest.Mock;
        destroy: jest.Mock;
    };
    response.statusCode = statusCode;
    response.headers = headers;
    response.pipe = jest.fn();
    response.resume = jest.fn();
    response.destroy = jest.fn();
    return response;
}

function createRequest(): EventEmitter {
    return new EventEmitter();
}

describe('MediaManager', () => {
    let manager: MediaManager;

    beforeEach(() => {
        jest.clearAllMocks();
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.createWriteStream as jest.Mock).mockReset();
        (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
        (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);
        manager = new MediaManager();
    });

    it('downloads a public image and tracks the temporary file', async () => {
        const response = createResponse(200);
        const file = new EventEmitter() as EventEmitter & { close: jest.Mock };
        file.close = jest.fn();
        const request = createRequest();

        (fs.createWriteStream as jest.Mock).mockReturnValue(file);
        (https.get as jest.Mock).mockImplementation((_url: string, callback: (value: unknown) => void) => {
            callback(response);
            return request;
        });

        const download = manager.downloadImageFromUrl('https://example.com/image.jpg', 'test_image');
        file.emit('finish');
        const filePath = await download;

        expect(filePath).toContain('test_image_');
        expect(manager.getTrackedFiles()).toEqual([filePath]);
        expect(response.pipe).toHaveBeenCalledWith(file);
    });

    it('follows redirects and rejects redirects without a location', async () => {
        const redirect = createResponse(302, { location: '/final.png' });
        const success = createResponse(200);
        const file = new EventEmitter() as EventEmitter & { close: jest.Mock };
        file.close = jest.fn();
        (fs.createWriteStream as jest.Mock).mockReturnValue(file);

        let calls = 0;
        (https.get as jest.Mock).mockImplementation((_url: string, callback: (value: unknown) => void) => {
            callback(calls++ === 0 ? redirect : success);
            return createRequest();
        });

        const download = manager.downloadImageFromUrl('https://example.com/start');
        file.emit('finish');
        await expect(download).resolves.toContain('.png');
        expect(redirect.resume).toHaveBeenCalled();

        const missingLocation = createResponse(302);
        (https.get as jest.Mock).mockImplementationOnce((_url: string, callback: (value: unknown) => void) => {
            callback(missingLocation);
            return createRequest();
        });
        await expect(manager.downloadImageFromUrl('https://example.com/missing')).rejects.toThrow('without location');
    });

    it('stops redirect loops and rejects unsafe redirect targets', async () => {
        const loop = createResponse(302, { location: '/loop' });
        (https.get as jest.Mock).mockImplementation((_url: string, callback: (value: unknown) => void) => {
            callback(loop);
            return createRequest();
        });

        await expect(manager.downloadImageFromUrl('https://example.com/loop')).rejects.toThrow('Too many redirects');
        expect(https.get).toHaveBeenCalledTimes(6);

        const privateRedirect = createResponse(302, { location: 'http://127.0.0.1/internal' });
        (https.get as jest.Mock).mockImplementationOnce((_url: string, callback: (value: unknown) => void) => {
            callback(privateRedirect);
            return createRequest();
        });

        await expect(manager.downloadImageFromUrl('https://example.com/private-redirect')).rejects.toThrow(
            'private network',
        );
    });

    it('rejects invalid URLs, failed responses and oversized content', async () => {
        await expect(manager.downloadImageFromUrl('http://127.0.0.1/private')).rejects.toThrow('private network');

        const failed = createResponse(404);
        (https.get as jest.Mock).mockImplementationOnce((_url: string, callback: (value: unknown) => void) => {
            callback(failed);
            return createRequest();
        });
        await expect(manager.downloadImageFromUrl('https://example.com/missing')).rejects.toThrow('404');
        expect(failed.resume).toHaveBeenCalled();

        const tooLarge = createResponse(200, { 'content-length': String(MAX_DOWNLOAD_BYTES + 1) });
        (https.get as jest.Mock).mockImplementationOnce((_url: string, callback: (value: unknown) => void) => {
            callback(tooLarge);
            return createRequest();
        });
        await expect(manager.downloadImageFromUrl('https://example.com/large')).rejects.toThrow('too large');
        expect(tooLarge.resume).toHaveBeenCalled();
    });

    it('rejects a response that exceeds the streaming limit', async () => {
        const response = createResponse(200);
        const file = new EventEmitter() as EventEmitter & { destroy: jest.Mock };
        file.destroy = jest.fn();
        (fs.createWriteStream as jest.Mock).mockReturnValue(file);
        (https.get as jest.Mock).mockImplementation((_url: string, callback: (value: unknown) => void) => {
            callback(response);
            return createRequest();
        });

        const download = manager.downloadImageFromUrl('https://example.com/stream');
        response.emit('data', Buffer.alloc(MAX_DOWNLOAD_BYTES + 1));

        await expect(download).rejects.toThrow('exceeds');
        expect(response.destroy).toHaveBeenCalled();
        expect(file.destroy).toHaveBeenCalled();
    });

    it('rejects transport and file stream errors', async () => {
        const transportResponse = createResponse(200);
        const transportFile = new EventEmitter() as EventEmitter & { close: jest.Mock };
        transportFile.close = jest.fn();
        (fs.createWriteStream as jest.Mock).mockReturnValue(transportFile);
        const request = createRequest();
        (https.get as jest.Mock).mockImplementationOnce((_url: string, callback: (value: unknown) => void) => {
            callback(transportResponse);
            return request;
        });
        const transportDownload = manager.downloadImageFromUrl('https://example.com/transport');
        request.emit('error', new Error('network failure'));
        await expect(transportDownload).rejects.toThrow('network failure');

        const response = createResponse(200);
        const file = new EventEmitter() as EventEmitter & { close: jest.Mock };
        file.close = jest.fn();
        const fileRequest = createRequest();
        (fs.createWriteStream as jest.Mock).mockReturnValue(file);
        (https.get as jest.Mock).mockImplementationOnce((_url: string, callback: (value: unknown) => void) => {
            callback(response);
            return fileRequest;
        });

        const fileDownload = manager.downloadImageFromUrl('https://example.com/file');
        file.emit('error', new Error('disk failure'));
        await expect(fileDownload).rejects.toThrow('disk failure');
        expect(fs.unlink).toHaveBeenCalled();
    });

    it('processes local, data and unsupported avatars', async () => {
        (fs.existsSync as jest.Mock).mockReturnValueOnce(true).mockReturnValue(false);
        await expect(manager.processAvatar('/tmp/avatar.png')).resolves.toBe('/tmp/avatar.png');

        const dataPath = await manager.processAvatar('data:image/png;base64,aGVsbG8=');
        expect(dataPath).toContain('bot_avatar_');
        expect(manager.getTrackedFiles()).toContain(dataPath);

        await expect(manager.processAvatar('avatar.svg')).resolves.toBeNull();
        await expect(manager.processAvatar('')).resolves.toBeNull();
        await manager.cleanupAll();
        expect(manager.getTrackedFiles()).toEqual([]);
    });

    it('returns null when a remote avatar cannot be downloaded and handles cleanup errors', async () => {
        (https.get as jest.Mock).mockImplementationOnce((_url: string, callback: (value: unknown) => void) => {
            callback(createResponse(500));
            return createRequest();
        });
        await expect(manager.processAvatar('https://example.com/avatar.png')).resolves.toBeNull();

        const exists = fs.existsSync as jest.Mock;
        (fs.promises.unlink as jest.Mock).mockRejectedValueOnce(new Error('permission denied'));
        await manager.cleanupTempFile('/tmp/unremovable');
        expect(exists).toHaveBeenCalledWith('/tmp/unremovable');
    });

    it('returns null when a base64 avatar cannot be written', async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        (fs.promises.writeFile as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

        await expect(manager.processAvatar('data:image/png;base64,aGVsbG8=')).resolves.toBeNull();
        expect(manager.getTrackedFiles()).toEqual([]);
    });
});
