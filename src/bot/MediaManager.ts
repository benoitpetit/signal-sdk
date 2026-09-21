import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as os from 'os';
import * as path from 'path';
import { validatePublicHttpUrl } from '../validators';

/** Maximum allowed size for downloaded images (25 MB). */
export const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;

export type MediaLogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
export type MediaLogger = (message: string, level?: MediaLogLevel) => void;

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

/**
 * Owns temporary media files used by SignalBot.
 *
 * Keeping downloads and cleanup here leaves the bot focused on message
 * routing, commands, and lifecycle management. The class deliberately does
 * not know about SignalCli, so it can be tested without a Signal connection.
 */
export class MediaManager {
    private readonly tempFiles = new Set<string>();

    constructor(private readonly log: MediaLogger = () => {}) {}

    async downloadImageFromUrl(imageUrl: string, prefix: string = 'bot_image'): Promise<string> {
        validatePublicHttpUrl(imageUrl, 'imageUrl');

        return new Promise((resolve, reject) => {
            const downloadWithRedirect = (url: string, maxRedirects: number = 5): void => {
                const client = url.startsWith('https:') ? https : http;

                client
                    .get(url, (response) => {
                        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) {
                            if (maxRedirects <= 0) {
                                reject(new Error(`Too many redirects for image: ${url}`));
                                return;
                            }

                            const redirectUrl = response.headers.location;
                            if (!redirectUrl) {
                                reject(new Error(`Redirect without location header: ${response.statusCode}`));
                                return;
                            }

                            const finalUrl = new URL(redirectUrl, url).href;
                            try {
                                validatePublicHttpUrl(finalUrl, 'redirectUrl');
                            } catch (validationError) {
                                reject(validationError);
                                return;
                            }

                            this.log(`Following redirect to: ${finalUrl}`, 'DEBUG');
                            response.resume();
                            downloadWithRedirect(finalUrl, maxRedirects - 1);
                            return;
                        }

                        if (response.statusCode !== 200) {
                            response.resume();
                            reject(new Error(`Failed to download image: ${response.statusCode}`));
                            return;
                        }

                        const contentLength = Number(response.headers['content-length'] || 0);
                        if (contentLength > MAX_DOWNLOAD_BYTES) {
                            response.resume();
                            reject(new Error(`Image too large: ${contentLength} bytes (max ${MAX_DOWNLOAD_BYTES} bytes)`));
                            return;
                        }

                        const urlObj = new URL(url);
                        const extension = path.extname(urlObj.pathname) || '.jpg';
                        const tempFilePath = path.join(os.tmpdir(), `${prefix}_${Date.now()}${extension}`);
                        const file = fs.createWriteStream(tempFilePath);
                        let downloadedBytes = 0;
                        let sizeLimitExceeded = false;

                        response.on('data', (chunk: Buffer) => {
                            downloadedBytes += chunk.length;
                            if (!sizeLimitExceeded && downloadedBytes > MAX_DOWNLOAD_BYTES) {
                                sizeLimitExceeded = true;
                                response.destroy();
                                file.destroy();
                                fs.unlink(tempFilePath, () => {});
                                reject(new Error(`Image too large: exceeds ${MAX_DOWNLOAD_BYTES} bytes`));
                            }
                        });

                        response.pipe(file);
                        file.on('finish', () => {
                            file.close();
                            this.tempFiles.add(tempFilePath);
                            resolve(tempFilePath);
                        });
                        file.on('error', (error) => {
                            fs.unlink(tempFilePath, () => {});
                            if (!sizeLimitExceeded) reject(error);
                        });
                    })
                    .on('error', reject);
            };

            downloadWithRedirect(imageUrl);
        });
    }

    async processAvatar(avatar: string): Promise<string | null> {
        if (!avatar) return null;

        if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
            try {
                this.log('Downloading group avatar from URL...', 'INFO');
                const tempPath = await this.downloadImageFromUrl(avatar, 'bot_avatar');
                this.log(`Avatar downloaded to: ${tempPath}`, 'DEBUG');
                return tempPath;
            } catch (error: unknown) {
                this.log(`Failed to download avatar: ${getErrorMessage(error)}`, 'ERROR');
                return null;
            }
        }

        if (fs.existsSync(avatar)) {
            this.log(`Using local avatar file: ${avatar}`, 'INFO');
            return avatar;
        }

        if (avatar.startsWith('data:image/')) {
            try {
                const base64Data = avatar.split(',')[1];
                const tempFilePath = path.join(os.tmpdir(), `bot_avatar_${Date.now()}.jpg`);
                await fs.promises.writeFile(tempFilePath, base64Data, 'base64');
                this.tempFiles.add(tempFilePath);
                this.log(`Saved base64 avatar to: ${tempFilePath}`, 'DEBUG');
                return tempFilePath;
            } catch (error: unknown) {
                this.log(`Failed to process base64 avatar: ${getErrorMessage(error)}`, 'ERROR');
                return null;
            }
        }

        this.log(`Unsupported avatar format: ${avatar.substring(0, 50)}...`, 'WARN');
        return null;
    }

    async cleanupTempFile(filePath: string): Promise<void> {
        try {
            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
                this.log(`Cleaned up temporary file: ${filePath}`, 'DEBUG');
            }
        } catch (error: unknown) {
            this.log(`Could not cleanup temp file ${filePath}: ${getErrorMessage(error)}`, 'DEBUG');
        } finally {
            this.tempFiles.delete(filePath);
        }
    }

    async cleanupAll(): Promise<void> {
        for (const filePath of Array.from(this.tempFiles)) {
            await this.cleanupTempFile(filePath);
        }
    }

    getTrackedFiles(): string[] {
        return Array.from(this.tempFiles);
    }
}
