import { BaseManager } from './BaseManager';
import { Device, LinkingOptions, LinkingResult, QRCodeData, UpdateDeviceOptions } from '../interfaces';
import { validateSanitizedString, validateDeviceId, validateDeviceName } from '../validators';
import * as qrcodeTerminal from 'qrcode-terminal';
import { spawn } from 'child_process';

export class DeviceManager extends BaseManager {
    constructor(
        sendRequest: <T = unknown>(method: string, params?: unknown) => Promise<T>,
        account: string | undefined,
        logger: import('../config').Logger,
        config: Required<import('../config').SignalCliConfig>,
        private readonly signalCliPath: string,
    ) {
        super(sendRequest, account, logger, config);
    }

    async listDevices(): Promise<Device[]> {
        const result = await this.sendRequest<Array<Partial<Device> & { createdTimestamp?: number; lastSeenTimestamp?: number }>>('listDevices', { account: this.account });
        return result.map((device) => ({
            ...device,
            id: device.id || 0,
            name: device.name || '',
            created: device.created ?? device.createdTimestamp ?? 0,
            lastSeen: device.lastSeen ?? device.lastSeenTimestamp ?? 0,
        })) as Device[];
    }

    async addDevice(uri: string, deviceName?: string): Promise<void> {
        await this.sendRequest('addDevice', { account: this.account, uri, deviceName });
    }

    async removeDevice(deviceId: number): Promise<void> {
        await this.sendRequest('removeDevice', { account: this.account, deviceId });
    }

    async updateDevice(options: UpdateDeviceOptions): Promise<void> {
        this.logger.debug('Updating device', options);

        validateDeviceId(options.deviceId);
        validateDeviceName(options.deviceName);

        await this.sendRequest('updateDevice', {
            deviceId: options.deviceId,
            deviceName: options.deviceName,
            account: this.account,
        });
    }

    async deviceLink(options: LinkingOptions = {}): Promise<LinkingResult> {
        return new Promise((resolve, reject) => {
            const deviceName = options.name || 'Signal SDK Device';
            validateSanitizedString(deviceName, 'deviceName');

            let linkProcess;
            const linkArgs = [
                ...(this.config.dataPath ? ['--config', this.config.dataPath] : []),
                'link',
                '--name',
                deviceName,
            ];

            if (process.platform === 'win32') {
                linkProcess = spawn('cmd.exe', ['/c', this.signalCliPath, ...linkArgs], {
                    stdio: ['pipe', 'pipe', 'pipe'],
                });
            } else {
                linkProcess = spawn(this.signalCliPath, linkArgs, {
                    stdio: ['pipe', 'pipe', 'pipe'],
                });
            }

            let qrCodeData: QRCodeData | undefined;
            let linkingComplete = false;
            const errorOutput: string[] = [];

            // Since signal-cli v0.14.0, signal-cli displays its own QR code in the terminal.
            // We detect this to avoid displaying a duplicate QR code.
            let signalCliDisplayedQRCode = false;

            linkProcess.stdout.on('data', (data) => {
                const output = data.toString('utf8').trim();

                // Detect if signal-cli has displayed its own QR code (ASCII art pattern)
                if (output.includes('▄▄▄▄▄') || output.includes('█████') || output.includes('▀▀▀▀▀')) {
                    signalCliDisplayedQRCode = true;
                }

                if (output.includes('sgnl://')) {
                    const uriMatch = output.match(/sgnl:\/\/[^\s]+/);
                    if (uriMatch && !qrCodeData) {
                        const uri = uriMatch[0];
                        qrCodeData = { uri };

                        // Only display our QR code if signal-cli hasn't already displayed one
                        if (options.qrCodeOutput === 'console' && !signalCliDisplayedQRCode) {
                            console.log('\n- QR CODE - SCAN WITH YOUR PHONE:');
                            console.log('===================================');
                            qrcodeTerminal.generate(uri, { small: true });
                            console.log('===================================\n');
                        } else if (options.qrCodeOutput === 'console') {
                            console.log('\n[signal-cli v0.14.0+ has already displayed the QR code above]');
                            console.log(`Link URI: ${uri}\n`);
                        }
                    }
                }

                if (output.includes('Device registered') || output.includes('Successfully linked')) {
                    linkingComplete = true;
                }
            });

            linkProcess.stderr.on('data', (data) => {
                const error = data.toString('utf8').trim();
                if (!error.includes('INFO') && !error.includes('DEBUG') && error.length > 0) {
                    errorOutput.push(error);
                }
            });

            linkProcess.on('close', (code) => {
                if (code === 0 && linkingComplete) {
                    resolve({
                        success: true,
                        isLinked: true,
                        deviceName,
                        qrCode: qrCodeData,
                    });
                } else if (code === 0 && qrCodeData) {
                    resolve({
                        success: true,
                        isLinked: false,
                        deviceName,
                        qrCode: qrCodeData,
                    });
                } else {
                    const diagnostic = errorOutput.join('\n').trim();
                    const detail = diagnostic ? `: ${diagnostic.slice(-2000)}` : '';
                    resolve({
                        success: false,
                        error: `Device linking failed${detail || ` (signal-cli exited with code ${code})`}`,
                        exitCode: code,
                        qrCode: qrCodeData,
                    });
                }
            });

            linkProcess.on('error', (error) => {
                reject(new Error(`Failed to start device linking: ${error.message}`));
            });
        });
    }
}
