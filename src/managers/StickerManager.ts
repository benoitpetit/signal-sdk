import { BaseManager } from './BaseManager';
import { StickerPack, StickerPackManifest, StickerPackUploadResult, GetStickerOptions } from '../interfaces';
import { MessageError } from '../errors';

export class StickerManager extends BaseManager {
    async listStickerPacks(): Promise<StickerPack[]> {
        return this.sendRequest('listStickerPacks', { account: this.account });
    }

    async addStickerPack(packId: string, packKey: string): Promise<void> {
        await this.sendRequest('addStickerPack', { account: this.account, packId, packKey });
    }

    async uploadStickerPack(manifest: StickerPackManifest): Promise<StickerPackUploadResult> {
        const params = {
            account: this.account,
            path: manifest.path,
        };

        const result = await this.sendRequest('uploadStickerPack', params);

        return {
            packId: result.packId,
            packKey: result.packKey,
            installUrl: result.installUrl,
        };
    }

    async getSticker(options: GetStickerOptions): Promise<string> {
        this.logger.debug('Getting sticker', options);

        if (!options.packId || !options.stickerId) {
            throw new MessageError('Pack ID and sticker ID are required');
        }

        const params = {
            packId: options.packId,
            stickerId: options.stickerId,
            account: this.account,
        };

        const result = await this.sendRequest('getSticker', params);
        return result.data || result;
    }
}
