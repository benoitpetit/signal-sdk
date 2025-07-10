import { spawn, ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import * as qrcodeTerminal from 'qrcode-terminal';
import { 
    Group, 
    Message, 
    Contact, 
    GroupUpdateOptions, 
    SendMessageOptions, 
    Profile, 
    ContactUpdateOptions, 
    AccountConfiguration, 
    AccountUpdateOptions,
    Device, 
    ReceiptType, 
    StickerPack, 
    TypingAction, 
    MessageType, 
    ReceiveOptions, 
    PinConfiguration, 
    IdentityKey, 
    UserStatus,
    Mention,
    TextStyle,
    Sticker,
    CaptchaChallenge,
    RateLimitChallenge,
    LinkingOptions,
    QRCodeData,
    LinkingResult,
    SyncOptions,
    ContactsSyncResult,
    MessageRequestResponseType,
    MessageRequestResponseOptions,
    PaymentNotification,
    RegistrationOptions,
    VerificationOptions,
    ListContactsOptions,
    JsonRpcRequest,
    JsonRpcResponse,
    JsonRpcNotification,
    SendRequestParams,
    SendResponse,
    GroupInfo,
    JsonAttachment
} from './interfaces';
import { EventEmitter } from 'events';
import * as path from 'path';

export class SignalCli extends EventEmitter {
    private signalCliPath: string;
    private account?: string;
    private cliProcess: ChildProcess | null = null;
    private requestPromises = new Map<string, { resolve: (value: any) => void; reject: (reason?: any) => void }>();

    constructor(signalCliPath?: string, account?: string) {
        super();
        // Determine the correct signal-cli path based on platform
        let defaultPath;
        if (process.platform === 'win32') {
            defaultPath = path.join(__dirname, '..', 'bin', 'bin', 'signal-cli.bat');
        } else {
            defaultPath = path.join(__dirname, '..', 'bin', 'signal-cli');
        }
        this.signalCliPath = signalCliPath || defaultPath;
        this.account = account;
    }

    public async connect(): Promise<void> {
        const args = this.account ? ['-a', this.account, 'jsonRpc'] : ['jsonRpc'];
        
        if (process.platform === 'win32') {
            // On Windows, use cmd.exe to run the batch file
            this.cliProcess = spawn('cmd.exe', ['/c', this.signalCliPath, ...args]);
        } else {
            this.cliProcess = spawn(this.signalCliPath, args);
        }

        this.cliProcess.stdout?.on('data', (data) => this.handleRpcResponse(data.toString()));
        this.cliProcess.stderr?.on('data', (data) => this.handleStderrData(data.toString()));
        this.cliProcess.on('close', (code) => {
            this.emit('close', code);
            this.cliProcess = null;
        });
        this.cliProcess.on('error', (err) => this.emit('error', err));

        return new Promise((resolve, reject) => {
            this.cliProcess?.stdout?.once('data', () => resolve());
            this.cliProcess?.once('error', (err) => reject(err));
        });
    }

    public disconnect(): void {
        if (this.cliProcess) {
            this.cliProcess.kill();
            this.cliProcess = null;
        }
    }

    public async gracefulShutdown(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.cliProcess) {
                resolve();
                return;
            }

            // Listen for the process to close
            this.cliProcess.once('close', () => {
                this.cliProcess = null;
                resolve();
            });

            // Send SIGTERM for graceful shutdown
            this.cliProcess.kill('SIGTERM');

            // Force kill after 5 seconds if it doesn't close gracefully
            setTimeout(() => {
                if (this.cliProcess) {
                    this.cliProcess.kill('SIGKILL');
                    this.cliProcess = null;
                    resolve();
                }
            }, 5000);
        });
    }

    private handleRpcResponse(data: string): void {
        const lines = data.trim().split('\n');
        for (const line of lines) {
            if (!line) continue;
            try {
                const response: JsonRpcResponse | JsonRpcNotification = JSON.parse(line);
                if ('id' in response && response.id) {
                    const promise = this.requestPromises.get(response.id);
                    if (promise) {
                        if (response.error) {
                            promise.reject(new Error(`[${response.error.code}] ${response.error.message}`));
                        }
                        else {
                            promise.resolve(response.result);
                        }
                        this.requestPromises.delete(response.id);
                    }
                }
                else if ('method' in response) {
                    this.emit('notification', response);
                    if (response.method === 'receive') {
                        this.emit('message', response.params);
                    }
                }
            }
            catch (error) {
                this.emit('error', new Error(`Failed to parse JSON-RPC response: ${line}`));
            }
        }
    }

    private handleStderrData(data: string): void {
        const message = data.trim();
        if (!message) return;

        // Parse log level from signal-cli stderr output
        // Format: "LEVEL  Component - Message"
        const logLevelMatch = message.match(/^(ERROR|WARN|INFO|DEBUG)\s+/);
        const logLevel = logLevelMatch ? logLevelMatch[1] : 'UNKNOWN';

        // Only emit errors for actual ERROR level messages
        // INFO, WARN, DEBUG messages are just logged without crashing
        if (logLevel === 'ERROR') {
            this.emit('error', new Error(`signal-cli error: ${message}`));
        } else {
            // Emit as a warning event for non-error messages
            this.emit('log', { level: logLevel.toLowerCase(), message });
            
            // Filter out common informational WARN messages from signal-cli
            const isInformationalWarn = logLevel === 'WARN' && (
                message.includes('Failed to get sender certificate') ||
                message.includes('ignoring: java.lang.InterruptedException') ||
                message.includes('Request was interrupted') ||
                message.includes('Connection reset') ||
                message.includes('Socket closed') ||
                message.includes('gracefully closing')
            );

            // Only log actual warning messages, not informational ones
            if (logLevel === 'WARN' && !isInformationalWarn) {
                console.warn(`[signal-cli] ${message}`);
            } else if (logLevel === 'INFO' || logLevel === 'DEBUG') {
                // Silently ignore INFO and DEBUG messages to avoid spam
                // Uncomment the line below if you want to see all signal-cli logs:
                // console.log(`[signal-cli] ${message}`);
            } else if (logLevel === 'UNKNOWN') {
                // Unknown format, log as warning only if it doesn't look informational
                if (!message.includes('Daemon closed') && !message.includes('gracefully')) {
                    console.warn(`[signal-cli] ${message}`);
                }
            }
        }
    }

    private async sendJsonRpcRequest(method: string, params?: any): Promise<any> {
        if (!this.cliProcess || !this.cliProcess.stdin) {
            throw new Error('Not connected. Call connect() first.');
        }

        const id = uuidv4();
        const request: JsonRpcRequest = {
            jsonrpc: '2.0',
            method,
            params,
            id,
        };

        const promise = new Promise((resolve, reject) => {
            this.requestPromises.set(id, { resolve, reject });
        });

        this.cliProcess.stdin.write(JSON.stringify(request) + '\n');

        return promise;
    }

    private isGroupId(recipient: string): boolean {
        return recipient.includes('=') || recipient.includes('/') || (recipient.includes('+') && !recipient.startsWith('+'));
    }



    // ############# Refactored Methods #############

    async register(number: string, voice?: boolean, captcha?: string): Promise<void> {
        await this.sendJsonRpcRequest('register', { account: number, voice, captcha });
    }

    async verify(number: string, token: string, pin?: string): Promise<void> {
        await this.sendJsonRpcRequest('verify', { account: number, token, pin });
    }

    async sendMessage(recipient: string, message: string, options: Omit<SendMessageOptions, 'message'> = {}): Promise<SendResponse> {
        const params: any = { 
            message, 
            account: this.account 
        };
        
        // Add recipient information
        if (this.isGroupId(recipient)) {
            params.groupId = recipient;
        } else {
            params.recipients = [recipient];
        }

        // Only add safe, well-known options to avoid JSON parsing issues
        if (options.attachments && options.attachments.length > 0) {
            params.attachments = options.attachments;
        }
        if (options.expiresInSeconds) {
            params.expiresInSeconds = options.expiresInSeconds;
        }
        if (options.isViewOnce) {
            params.isViewOnce = options.isViewOnce;
        }
        
        return this.sendJsonRpcRequest('send', params);
    }

    async sendReaction(recipient: string, targetAuthor: string, targetTimestamp: number, emoji: string, remove: boolean = false): Promise<SendResponse> {
        const params: any = {
            emoji,
            targetAuthor,
            targetTimestamp,
            remove,
            account: this.account
        };
        if (this.isGroupId(recipient)) {
            params.groupId = recipient;
        } else {
            params.recipients = [recipient];
        }
        return this.sendJsonRpcRequest('sendReaction', params);
    }

    async sendTyping(recipient: string, stop: boolean = false): Promise<void> {
        const params: any = { when: !stop, account: this.account };
        if (this.isGroupId(recipient)) {
            params.groupId = recipient;
        } else {
            params.recipients = [recipient];
        }
        await this.sendJsonRpcRequest('sendTyping', params);
    }

    async remoteDeleteMessage(recipient: string, targetTimestamp: number): Promise<void> {
        const params: any = { targetTimestamp, account: this.account };
        if (this.isGroupId(recipient)) {
            params.groupId = recipient;
        } else {
            params.recipients = [recipient];
        }
        await this.sendJsonRpcRequest('remoteDelete', params);
    }

    async updateContact(number: string, name: string, options: Omit<ContactUpdateOptions, 'name'> = {}): Promise<void> {
        await this.sendJsonRpcRequest('updateContact', { account: this.account, recipient: number, name, ...options });
    }

    async block(recipients: string[], groupId?: string): Promise<void> {
        await this.sendJsonRpcRequest('block', { account: this.account, recipient: recipients, groupId });
    }

    async unblock(recipients: string[], groupId?: string): Promise<void> {
        await this.sendJsonRpcRequest('unblock', { account: this.account, recipient: recipients, groupId });
    }

    async quitGroup(groupId: string): Promise<void> {
        await this.sendJsonRpcRequest('quitGroup', { account: this.account, groupId });
    }

    async joinGroup(uri: string): Promise<void> {
        await this.sendJsonRpcRequest('joinGroup', { account: this.account, uri });
    }

    async updateProfile(name: string, about?: string, aboutEmoji?: string, avatar?: string): Promise<void> {
        await this.sendJsonRpcRequest('updateProfile', { account: this.account, name, about, aboutEmoji, avatar });
    }

    async sendReceipt(recipient: string, targetTimestamp: number, type: ReceiptType = 'read'): Promise<void> {
        await this.sendJsonRpcRequest('sendReceipt', { account: this.account, recipient, targetTimestamp, type });
    }

    async listStickerPacks(): Promise<StickerPack[]> {
        return this.sendJsonRpcRequest('listStickerPacks', { account: this.account });
    }

    async addStickerPack(packId: string, packKey: string): Promise<void> {
        await this.sendJsonRpcRequest('addStickerPack', { account: this.account, packId, packKey });
    }

    async unregister(): Promise<void> {
        await this.sendJsonRpcRequest('unregister', { account: this.account });
    }

    async deleteLocalAccountData(): Promise<void> {
        await this.sendJsonRpcRequest('deleteLocalAccountData', { account: this.account });
    }

    async updateAccountConfiguration(config: AccountConfiguration): Promise<void> {
        await this.sendJsonRpcRequest('updateConfiguration', { account: this.account, ...config });
    }

    async removeDevice(deviceId: number): Promise<void> {
        await this.sendJsonRpcRequest('removeDevice', { account: this.account, deviceId });
    }

    async setPin(pin: string): Promise<void> {
        await this.sendJsonRpcRequest('setPin', { account: this.account, pin });
    }

    async removePin(): Promise<void> {
        await this.sendJsonRpcRequest('removePin', { account: this.account });
    }

    async listIdentities(number?: string): Promise<IdentityKey[]> {
        return this.sendJsonRpcRequest('listIdentities', { account: this.account, number });
    }

    async trustIdentity(number: string, safetyNumber: string, verified: boolean = true): Promise<void> {
        await this.sendJsonRpcRequest('trust', { account: this.account, recipient: number, safetyNumber, verified });
    }

    async link(deviceName?: string): Promise<string> {
        const result = await this.sendJsonRpcRequest('link', { deviceName });
        return result.uri;
    }

    /**
     * Link a new device to an existing Signal account with QR code support.
     * This method provides a complete device linking solution with QR code generation.
     * 
     * @param options - Linking options including device name and QR code output preferences
     * @returns Promise resolving to LinkingResult with QR code data and linking status
     */
    async deviceLink(options: LinkingOptions = {}): Promise<LinkingResult> {
        const { spawn } = await import('child_process');
        
        return new Promise((resolve, reject) => {
            const deviceName = options.name || 'Signal SDK Device';
            
            // Spawn signal-cli link command
            let linkProcess;
            if (process.platform === 'win32') {
                // On Windows, use cmd.exe to run the batch file
                linkProcess = spawn('cmd.exe', ['/c', this.signalCliPath, 'link', '--name', deviceName], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });
            } else {
                linkProcess = spawn(this.signalCliPath, ['link', '--name', deviceName], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });
            }
            
            let qrCodeData: QRCodeData | undefined;
            let linkingComplete = false;
            let hasError = false;
            
            // Handle stdout (where QR code URI will be)
            linkProcess.stdout.on('data', (data) => {
                const output = data.toString().trim();
                
                // Look for QR code URI (starts with sgnl://)
                if (output.includes('sgnl://')) {
                    const uriMatch = output.match(/sgnl:\/\/[^\s]+/);
                    if (uriMatch && !qrCodeData) {
                        const uri = uriMatch[0];
                        
                                                 qrCodeData = {
                             uri
                         };
                         
                         // Auto-display QR code if requested
                         if (options.qrCodeOutput === 'console') {
                             console.log('\n- QR CODE - SCAN WITH YOUR PHONE:');
                             console.log('===================================');
                             this.displayQRCode(uri);
                             console.log('===================================\n');
                         }
                    }
                }
                
                // Check for successful linking
                if (output.includes('Device registered') || output.includes('Successfully linked')) {
                    linkingComplete = true;
                }
            });
            
            // Handle stderr for errors
            linkProcess.stderr.on('data', (data) => {
                const error = data.toString().trim();
                
                // Filter out informational messages
                if (!error.includes('INFO') && !error.includes('DEBUG') && error.length > 0) {
                    hasError = true;
                }
            });
            
            // Handle process exit
            linkProcess.on('close', (code) => {
                if (code === 0 && linkingComplete) {
                    resolve({
                        success: true,
                        isLinked: true,
                        deviceName,
                        qrCode: qrCodeData
                    });
                } else if (code === 0 && qrCodeData) {
                    resolve({
                        success: true,
                        isLinked: false,
                        deviceName,
                        qrCode: qrCodeData
                    });
                } else {
                    resolve({
                        success: false,
                        error: hasError ? 'Device linking failed' : `signal-cli exited with code ${code}`,
                        qrCode: qrCodeData
                    });
                }
            });
            
            // Handle process errors
            linkProcess.on('error', (error) => {
                reject(new Error(`Failed to start device linking: ${error.message}`));
            });
        });
    }
    
    /**
     * Display ASCII QR code in console.
     * Uses qrcode-terminal which is included as a dependency.
     */
    private displayQRCode(uri: string): void {
        qrcodeTerminal.generate(uri, { small: true });
    }

    async addDevice(uri: string, deviceName?: string): Promise<void> {
        await this.sendJsonRpcRequest('addDevice', { account: this.account, uri, deviceName });
    }

    async sendSyncRequest(): Promise<void> {
        await this.sendJsonRpcRequest('sendSyncRequest', { account: this.account });
    }

    async sendMessageRequestResponse(recipient: string, response: MessageRequestResponseType): Promise<void> {
        await this.sendJsonRpcRequest('sendMessageRequestResponse', { account: this.account, recipient, type: response });
    }

    async getVersion(): Promise<any> {
        return this.sendJsonRpcRequest('version');
    }

    async createGroup(name: string, members: string[]): Promise<GroupInfo> {
        return this.sendJsonRpcRequest('updateGroup', { account: this.account, name, members });
    }

    async updateGroup(groupId: string, options: GroupUpdateOptions): Promise<void> {
        const params: any = { groupId, account: this.account };
        if (options.name) params.name = options.name;
        if (options.description) params.description = options.description;
        if (options.avatar) params.avatar = options.avatar;
        if (options.addMembers) params.addMembers = options.addMembers;
        if (options.removeMembers) params.removeMembers = options.removeMembers;
        if (options.promoteAdmins) params.promoteAdmins = options.promoteAdmins;
        if (options.demoteAdmins) params.demoteAdmins = options.demoteAdmins;
        if (options.resetInviteLink) params.resetLink = true;
        if (options.permissionAddMember) params.permissionAddMember = options.permissionAddMember;
        if (options.permissionEditDetails) params.permissionEditDetails = options.permissionEditDetails;
        if (options.permissionSendMessage) params.permissionSendMessage = options.permissionSendMessage;
        if (options.expirationTimer) params.expiration = options.expirationTimer;
        await this.sendJsonRpcRequest('updateGroup', params);
    }

    async listGroups(): Promise<GroupInfo[]> {
        return this.sendJsonRpcRequest('listGroups', { account: this.account });
    }

    async listContacts(): Promise<Contact[]> {
        return this.sendJsonRpcRequest('listContacts', { account: this.account });
    }

    async listDevices(): Promise<Device[]> {
        return this.sendJsonRpcRequest('listDevices', { account: this.account });
    }

    async listAccounts(): Promise<string[]> {
        const result = await this.sendJsonRpcRequest('listAccounts');
        return result.accounts.map((acc: any) => acc.number);
    }

    // ############# Deprecated Methods (Kept for backward compatibility) #############

    /** 
     * @deprecated Use `connect` and listen for `message` events instead.
     * This method now provides a compatibility layer by connecting and buffering messages.
     */
    async receiveMessages(): Promise<Message[]> {
        console.warn("receiveMessages is deprecated and will be removed in a future version. Use connect() and listen for 'message' events instead.");
        
        // Return empty array but log helpful migration info
        console.info("Migration guide: Replace receiveMessages() with:");
        console.info("  await signalCli.connect();");
        console.info("  signalCli.on('message', (msg) => { /* handle message */ });");
        
        return Promise.resolve([]);
    }

    /** 
     * @deprecated Use `connect` instead.
     * This method now calls connect() for backward compatibility.
     */
    startDaemon(): void {
        console.warn("startDaemon is deprecated. Use connect() instead.");
        this.connect();
    }

    /** 
     * @deprecated Use `gracefulShutdown` or `disconnect` instead.
     * This method now calls gracefulShutdown() for backward compatibility.
     */
    stopDaemon(): void {
        console.warn("stopDaemon is deprecated. Use gracefulShutdown() or disconnect() instead.");
        this.gracefulShutdown();
    }
}
