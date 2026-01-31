import { BaseManager } from './BaseManager';
import { Device, LinkingOptions, LinkingResult, QRCodeData, UpdateDeviceOptions } from '../interfaces';
import { validateSanitizedString, validateDeviceId, validateMessage } from '../validators';
import * as qrcodeTerminal from 'qrcode-terminal';
import { spawn } from 'child_process';

export class DeviceManager extends BaseManager {
    constructor(
        sendRequest: (method: string, params?: any) => Promise<any>,
        account: string | undefined,
        logger: any,
        config: any,
        private readonly signalCliPath: string,
    ) {
        super(sendRequest, account, logger, config);
    }

    async listDevices(): Promise<Device[]> {
        return this.sendRequest('listDevices', { account: this.account });
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
        validateMessage(options.deviceName, 200);

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
            if (process.platform === 'win32') {
                linkProcess = spawn('cmd.exe', ['/c', `"${this.signalCliPath}"`, 'link', '--name', deviceName], {
                    stdio: ['pipe', 'pipe', 'pipe'],
                });
            } else {
                linkProcess = spawn(this.signalCliPath, ['link', '--name', deviceName], {
                    stdio: ['pipe', 'pipe', 'pipe'],
                });
            }

            let qrCodeData: QRCodeData | undefined;
            let linkingComplete = false;
            let hasError = false;

            linkProcess.stdout.on('data', (data) => {
                const output = data.toString('utf8').trim();

                if (output.includes('sgnl://')) {
                    const uriMatch = output.match(/sgnl:\/\/[^\s]+/);
                    if (uriMatch && !qrCodeData) {
                        const uri = uriMatch[0];
                        qrCodeData = { uri };

                        if (options.qrCodeOutput === 'console') {
                            console.log('\n- QR CODE - SCAN WITH YOUR PHONE:');
                            console.log('===================================');
                            qrcodeTerminal.generate(uri, { small: true });
                            console.log('===================================\n');
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
                    hasError = true;
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
                    resolve({
                        success: false,
                        error: hasError ? 'Device linking failed' : `signal-cli exited with code ${code}`,
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
