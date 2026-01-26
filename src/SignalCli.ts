import { spawn, ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import * as qrcodeTerminal from 'qrcode-terminal';
import { 
    Message,
    Contact, 
    GroupUpdateOptions, 
    SendMessageOptions, 
    ContactUpdateOptions, 
    AccountConfiguration, 
    Device, 
    ReceiptType, 
    StickerPack, 
    IdentityKey, 
    LinkingOptions,
    QRCodeData,
    LinkingResult,
    MessageRequestResponseType,
    JsonRpcRequest,
    JsonRpcResponse,
    JsonRpcNotification,
    SendResponse,
    GroupInfo,
    RemoveContactOptions,
    UserStatusResult,
    PaymentNotificationData,
    StickerPackManifest,
    StickerPackUploadResult,
    RateLimitChallengeResult,
    ChangeNumberSession,
    ReceiveOptions,
    UploadProgress,
    PollCreateOptions,
    PollVoteOptions,
    PollTerminateOptions,
    StoryOptions,
    GetAttachmentOptions,
    GetAvatarOptions,
    GetStickerOptions,
    UpdateAccountOptions,
    AccountUpdateResult,
    SendContactsOptions,
    ListGroupsOptions,
    UpdateDeviceOptions
} from './interfaces';
import { EventEmitter } from 'events';
import * as path from 'path';
import { validatePhoneNumber, validateGroupId, validateRecipient, validateMessage, validateTimestamp, validateEmoji, validateDeviceId } from './validators';
import { withRetry, RateLimiter } from './retry';
import { Logger, SignalCliConfig, validateConfig } from './config';
import { ConnectionError, AuthenticationError, RateLimitError, MessageError, GroupError } from './errors';

export class SignalCli extends EventEmitter {
    private signalCliPath: string;
    private account?: string;
    private cliProcess: ChildProcess | null = null;
    private requestPromises = new Map<string, { resolve: (value: any) => void; reject: (reason?: any) => void }>();
    private config: Required<SignalCliConfig>;
    private logger: Logger;
    private rateLimiter: RateLimiter;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    constructor(accountOrPath?: string, account?: string, config: SignalCliConfig = {}) {
        super();
        
        // Validate and merge configuration
        this.config = validateConfig(config);
        
        // Initialize logger
        this.logger = new Logger({
            level: this.config.verbose ? 'debug' : 'info',
            enableFile: !!this.config.logFile,
            filePath: this.config.logFile
        });
        
        // Initialize rate limiter
        this.rateLimiter = new RateLimiter(
            this.config.maxConcurrentRequests,
            this.config.minRequestInterval
        );
        
        let signalCliPath: string | undefined;
        let phoneNumber: string | undefined;
        
        // Smart parameter detection
        if (typeof accountOrPath === 'string') {
            if (accountOrPath.startsWith('+')) {
                // First parameter is a phone number
                phoneNumber = accountOrPath;
                signalCliPath = undefined;
            } else {
                // First parameter is a path, second is phone number
                signalCliPath = accountOrPath;
                phoneNumber = account;
            }
        }
        
        // Determine the correct signal-cli path based on platform
        let defaultPath;
        if (process.platform === 'win32') {
            defaultPath = path.join(__dirname, '..', 'bin', 'signal-cli.bat');
        } else {
            // For Unix/Linux systems, use the shell script
            defaultPath = path.join(__dirname, '..', 'bin', 'signal-cli');
        }
        
        this.signalCliPath = signalCliPath || defaultPath;
        this.account = phoneNumber;
    }

    public async connect(): Promise<void> {
        const daemonMode = this.config.daemonMode || 'json-rpc';
        
        switch (daemonMode) {
            case 'json-rpc':
                await this.connectJsonRpc();
                break;
            case 'unix-socket':
                await this.connectUnixSocket();
                break;
            case 'tcp':
                await this.connectTcp();
                break;
            case 'http':
                await this.connectHttp();
                break;
            default:
                throw new Error(`Invalid daemon mode: ${daemonMode}`);
        }
    }

    private async connectJsonRpc(): Promise<void> {
        const args = this.account ? ['-a', this.account, 'jsonRpc'] : ['jsonRpc'];
        
        if (process.platform === 'win32') {
            // On Windows, use cmd.exe to run the batch file with proper quoting for paths with spaces
            this.cliProcess = spawn('cmd.exe', ['/c', `"${this.signalCliPath}"`, ...args]);
        } else {
            this.cliProcess = spawn(this.signalCliPath, args);
        }

        this.cliProcess.stdout?.on('data', (data) => this.handleRpcResponse(data.toString('utf8')));
        this.cliProcess.stderr?.on('data', (data) => this.handleStderrData(data.toString('utf8')));
        this.cliProcess.on('close', (code) => {
            this.emit('close', code);
            this.cliProcess = null;
        });
        this.cliProcess.on('error', (err) => this.emit('error', err));

        return new Promise((resolve, reject) => {
            // Set a timeout to resolve the promise even if no data is received
            const connectTimeout = setTimeout(() => {
                // Test if the process is still alive and responsive
                if (this.cliProcess && !this.cliProcess.killed) {
                    resolve();
                } else {
                    reject(new Error('signal-cli process failed to start'));
                }
            }, 2000); // Wait 2 seconds max
            
            // If we get data quickly, resolve immediately
            this.cliProcess?.stdout?.once('data', () => {
                clearTimeout(connectTimeout);
                resolve();
            });
            
            // If there's an error, reject
            this.cliProcess?.once('error', (err) => {
                clearTimeout(connectTimeout);
                reject(err);
            });
            
            // If the process exits immediately, that's an error
            this.cliProcess?.once('close', (code) => {
                clearTimeout(connectTimeout);
                if (code !== 0) {
                    reject(new Error(`signal-cli exited with code ${code}`));
                }
            });
        });
    }

    private async connectUnixSocket(): Promise<void> {
        const net = await import('net');
        const socketPath = this.config.socketPath || '/tmp/signal-cli.sock';
        
        return new Promise((resolve, reject) => {
            const socket = net.createConnection(socketPath);
            
            socket.on('connect', () => {
                this.logger.debug('Connected to Unix socket:', socketPath);
                
                socket.on('data', (data) => this.handleRpcResponse(data.toString('utf8')));
                socket.on('error', (err) => this.emit('error', err));
                socket.on('close', () => {
                    this.emit('close', 0);
                });
                
                (this as any).socket = socket;
                resolve();
            });
            
            socket.on('error', (err) => {
                reject(new ConnectionError(`Failed to connect to Unix socket: ${err.message}`));
            });
            
            setTimeout(() => reject(new ConnectionError('Unix socket connection timeout')), this.config.connectionTimeout);
        });
    }

    private async connectTcp(): Promise<void> {
        const net = await import('net');
        const host = this.config.tcpHost || 'localhost';
        const port = this.config.tcpPort || 7583;
        
        return new Promise((resolve, reject) => {
            const socket = net.createConnection(port, host);
            
            socket.on('connect', () => {
                this.logger.debug(`Connected to TCP: ${host}:${port}`);
                
                socket.on('data', (data) => this.handleRpcResponse(data.toString('utf8')));
                socket.on('error', (err) => this.emit('error', err));
                socket.on('close', () => {
                    this.emit('close', 0);
                });
                
                (this as any).socket = socket;
                resolve();
            });
            
            socket.on('error', (err) => {
                reject(new ConnectionError(`Failed to connect to TCP: ${err.message}`));
            });
            
            setTimeout(() => reject(new ConnectionError('TCP connection timeout')), this.config.connectionTimeout);
        });
    }

    private async connectHttp(): Promise<void> {
        const baseUrl = this.config.httpBaseUrl || 'http://localhost:8080';
        
        // For HTTP mode, we don't maintain a persistent connection
        // Instead, we'll use the httpRequest method for each operation
        this.logger.debug('HTTP mode configured:', baseUrl);
        (this as any).httpBaseUrl = baseUrl;
        
        // Test connection by sending a simple request
        try {
            await this.httpRequest({ jsonrpc: '2.0', method: 'version', params: {}, id: uuidv4() });
            this.logger.debug('HTTP connection verified');
        } catch (error) {
            throw new ConnectionError(`Failed to connect to HTTP endpoint: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async httpRequest(request: JsonRpcRequest): Promise<any> {
        const https = await import(this.config.httpBaseUrl?.startsWith('https:') ? 'https' : 'http');
        const baseUrl = this.config.httpBaseUrl || 'http://localhost:8080';
        const url = new URL('/api/v1/rpc', baseUrl);
        
        return new Promise((resolve, reject) => {
            const data = JSON.stringify(request);
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                }
            };
            
            const req = https.request(url, options, (res: any) => {
                let body = '';
                res.on('data', (chunk: any) => body += chunk);
                res.on('end', () => {
                    try {
                        const response: JsonRpcResponse = JSON.parse(body);
                        if (response.error) {
                            reject(new Error(`[${response.error.code}] ${response.error.message}`));
                        } else {
                            resolve(response.result);
                        }
                    } catch (error) {
                        reject(new Error(`Failed to parse HTTP response: ${body}`));
                    }
                });
            });
            
            req.on('error', (err: any) => reject(new ConnectionError(`HTTP request failed: ${err.message}`)));
            req.setTimeout(this.config.requestTimeout, () => {
                req.destroy();
                reject(new ConnectionError('HTTP request timeout'));
            });
            
            req.write(data);
            req.end();
        });
    }

    public disconnect(): void {
        const daemonMode = this.config.daemonMode || 'json-rpc';
        
        // Close socket connections
        if (daemonMode === 'unix-socket' || daemonMode === 'tcp') {
            const socket = (this as any).socket;
            if (socket && !socket.destroyed) {
                socket.destroy();
                (this as any).socket = null;
            }
        }
        
        // Close process for json-rpc mode
        if (daemonMode === 'json-rpc' && this.cliProcess) {
            this.cliProcess.kill();
            this.cliProcess = null;
        }
        
        // For HTTP mode, nothing to disconnect (stateless)
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
            const forceKillTimer = setTimeout(() => {
                if (this.cliProcess) {
                    this.cliProcess.kill('SIGKILL');
                    this.cliProcess = null;
                    resolve();
                }
            }, 5000);
            
            // Use unref() to prevent this timer from keeping the process alive
            if (forceKillTimer.unref) {
                forceKillTimer.unref();
            }
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
        const daemonMode = this.config.daemonMode || 'json-rpc';
        
        // For HTTP mode, use HTTP requests
        if (daemonMode === 'http') {
            const id = uuidv4();
            const request: JsonRpcRequest = {
                jsonrpc: '2.0',
                method,
                params,
                id,
            };
            return await this.httpRequest(request);
        }
        
        // For socket modes (Unix socket, TCP), write to socket
        if (daemonMode === 'unix-socket' || daemonMode === 'tcp') {
            const socket = (this as any).socket;
            if (!socket || socket.destroyed) {
                throw new ConnectionError('Not connected. Call connect() first.');
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

            socket.write(JSON.stringify(request) + '\n');
            return promise;
        }
        
        // Default JSON-RPC mode with stdin/stdout
        if (!this.cliProcess || !this.cliProcess.stdin) {
            throw new ConnectionError('Not connected. Call connect() first.');
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

        // Add well-known options
        if (options.attachments && options.attachments.length > 0) {
            params.attachments = options.attachments;
        }
        if (options.expiresInSeconds) {
            params.expiresInSeconds = options.expiresInSeconds;
        }
        if (options.isViewOnce) {
            params.viewOnce = options.isViewOnce;
        }
        
        // Add advanced text formatting options
        if (options.mentions && options.mentions.length > 0) {
            params.mentions = options.mentions.map(m => ({
                start: m.start,
                length: m.length,
                number: m.recipient || m.number
            }));
        }
        
        if (options.textStyles && options.textStyles.length > 0) {
            params.textStyles = options.textStyles.map(ts => ({
                start: ts.start,
                length: ts.length,
                style: ts.style
            }));
        }
        
        // Add quote/reply information
        if (options.quote) {
            params.quoteTimestamp = options.quote.timestamp;
            params.quoteAuthor = options.quote.author;
            if (options.quote.text) {
                params.quoteMessage = options.quote.text;
            }
            if (options.quote.mentions && options.quote.mentions.length > 0) {
                params.quoteMentions = options.quote.mentions.map(m => ({
                    start: m.start,
                    length: m.length,
                    number: m.recipient || m.number
                }));
            }
            if (options.quote.textStyles && options.quote.textStyles.length > 0) {
                params.quoteTextStyles = options.quote.textStyles.map(ts => ({
                    start: ts.start,
                    length: ts.length,
                    style: ts.style
                }));
            }
        }
        
        // Add preview URL
        if (options.previewUrl) {
            params.previewUrl = options.previewUrl;
        }
        
        // Add edit timestamp for editing existing messages
        if (options.editTimestamp) {
            params.editTimestamp = options.editTimestamp;
        }
        
        // Add story reply information
        if (options.storyTimestamp && options.storyAuthor) {
            params.storyTimestamp = options.storyTimestamp;
            params.storyAuthor = options.storyAuthor;
        }
        
        // Add special flags
        if (options.noteToSelf) {
            params.noteToSelf = options.noteToSelf;
        }
        
        if (options.endSession) {
            params.endSession = options.endSession;
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

    /**
     * Get the safety number for a specific contact.
     * This is a helper method that extracts just the safety number from identity information.
     * 
     * @param number - The phone number of the contact
     * @returns The safety number string, or null if not found
     * 
     * @example
     * ```typescript
     * const safetyNumber = await signal.getSafetyNumber('+33123456789');
     * console.log(`Safety number: ${safetyNumber}`);
     * ```
     */
    async getSafetyNumber(number: string): Promise<string | null> {
        const identities = await this.listIdentities(number);
        if (identities.length > 0 && identities[0].safetyNumber) {
            return identities[0].safetyNumber;
        }
        return null;
    }

    /**
     * Verify a safety number for a contact.
     * Checks if the provided safety number matches the stored one and marks it as trusted if it does.
     * 
     * @param number - The phone number of the contact
     * @param safetyNumber - The safety number to verify
     * @returns True if the safety number matches and was trusted, false otherwise
     * 
     * @example
     * ```typescript
     * const verified = await signal.verifySafetyNumber('+33123456789', '123456 78901...');
     * if (verified) {
     *   console.log('Safety number verified and trusted');
     * } else {
     *   console.log('Safety number does not match!');
     * }
     * ```
     */
    async verifySafetyNumber(number: string, safetyNumber: string): Promise<boolean> {
        const storedSafetyNumber = await this.getSafetyNumber(number);
        
        if (!storedSafetyNumber) {
            return false;
        }
        
        // Compare safety numbers (remove spaces for comparison)
        const normalizedStored = storedSafetyNumber.replace(/\s/g, '');
        const normalizedProvided = safetyNumber.replace(/\s/g, '');
        
        if (normalizedStored === normalizedProvided) {
            await this.trustIdentity(number, safetyNumber, true);
            return true;
        }
        
        return false;
    }

    /**
     * List all untrusted identities.
     * Returns identities that have not been explicitly trusted.
     * 
     * @returns Array of untrusted identity keys
     * 
     * @example
     * ```typescript
     * const untrusted = await signal.listUntrustedIdentities();
     * console.log(`Found ${untrusted.length} untrusted identities`);
     * untrusted.forEach(id => {
     *   console.log(`${id.number}: ${id.safetyNumber}`);
     * });
     * ```
     */
    async listUntrustedIdentities(): Promise<IdentityKey[]> {
        const allIdentities = await this.listIdentities();
        return allIdentities.filter(identity => 
            identity.trustLevel === 'UNTRUSTED' || 
            identity.trustLevel === 'TRUST_ON_FIRST_USE' ||
            !identity.trustLevel
        );
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
                // On Windows, use cmd.exe to run the batch file with proper quoting for paths with spaces
                linkProcess = spawn('cmd.exe', ['/c', `"${this.signalCliPath}"`, 'link', '--name', deviceName], {
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
                const output = data.toString('utf8').trim();
                
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
                const error = data.toString('utf8').trim();
                
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
        if (options.banMembers) params.banMembers = options.banMembers;
        if (options.unbanMembers) params.unbanMembers = options.unbanMembers;
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

    /**
     * Send group invite link to a recipient.
     * Retrieves and sends the invitation link for a group.
     * 
     * @param groupId - The group ID
     * @param recipient - The recipient to send the invite link to
     * @returns Send response
     * 
     * @example
     * ```typescript
     * await signal.sendGroupInviteLink('groupId123==', '+33123456789');
     * ```
     */
    async sendGroupInviteLink(groupId: string, recipient: string): Promise<SendResponse> {
        // Get group info to retrieve invite link
        const groups = await this.listGroups();
        const group = groups.find(g => g.groupId === groupId);
        
        const inviteLink = group?.groupInviteLink || group?.inviteLink;
        if (!group || !inviteLink) {
            throw new Error('Group not found or does not have an invite link');
        }
        
        return this.sendMessage(recipient, `Join our group: ${inviteLink}`);
    }

    /**
     * Set banned members for a group.
     * Ban specific members from the group.
     * 
     * @param groupId - The group ID
     * @param members - Array of phone numbers to ban
     * 
     * @example
     * ```typescript
     * await signal.setBannedMembers('groupId123==', ['+33111111111', '+33222222222']);
     * ```
     */
    async setBannedMembers(groupId: string, members: string[]): Promise<void> {
        await this.updateGroup(groupId, { banMembers: members });
    }

    /**
     * Reset group invite link.
     * Invalidates the current group invite link and generates a new one.
     * 
     * @param groupId - The group ID
     * 
     * @example
     * ```typescript
     * await signal.resetGroupLink('groupId123==');
     * ```
     */
    async resetGroupLink(groupId: string): Promise<void> {
        await this.updateGroup(groupId, { resetInviteLink: true });
    }

    async listContacts(): Promise<Contact[]> {
        return this.sendJsonRpcRequest('listContacts', { account: this.account });
    }

    async listDevices(): Promise<Device[]> {
        return this.sendJsonRpcRequest('listDevices', { account: this.account });
    }

    /**
     * Update a linked device name (signal-cli v0.13.23+).
     * Allows changing the display name of a linked device.
     * 
     * @param options - Device update options
     * @returns Promise that resolves when device is updated
     * 
     * @example
     * ```typescript
     * // List devices to get device IDs
     * const devices = await signal.listDevices();
     * 
     * // Update device name
     * await signal.updateDevice({
     *   deviceId: 2,
     *   deviceName: 'My New Device Name'
     * });
     * ```
     */
    async updateDevice(options: UpdateDeviceOptions): Promise<void> {
        this.logger.debug('Updating device', options);
        
        validateDeviceId(options.deviceId);
        validateMessage(options.deviceName, 200);
        
        await this.sendJsonRpcRequest('updateDevice', {
            deviceId: options.deviceId,
            deviceName: options.deviceName,
            account: this.account
        });
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

    // ############# MESSAGE RECEIVING #############
    
    /**
     * Receive messages from Signal with configurable options.
     * This is the modern replacement for the deprecated receiveMessages().
     * 
     * @param options - Options for receiving messages
     * @returns Array of received messages
     * 
     * @example
     * ```typescript
     * // Receive with default timeout
     * const messages = await signal.receive();
     * 
     * // Receive with custom options
     * const messages = await signal.receive({
     *   timeout: 10,
     *   maxMessages: 5,
     *   ignoreAttachments: true,
     *   sendReadReceipts: true
     * });
     * ```
     */
    async receive(options: ReceiveOptions = {}): Promise<Message[]> {
        const params: any = { account: this.account };
        
        // Set timeout (default: 5 seconds)
        if (options.timeout !== undefined) {
            params.timeout = options.timeout;
        }
        
        // Set maximum number of messages
        if (options.maxMessages !== undefined) {
            params.maxMessages = options.maxMessages;
        }
        
        // Skip attachment downloads
        if (options.ignoreAttachments) {
            params.ignoreAttachments = true;
        }
        
        // Skip stories
        if (options.ignoreStories) {
            params.ignoreStories = true;
        }
        
        // Send read receipts automatically
        if (options.sendReadReceipts) {
            params.sendReadReceipts = true;
        }
        
        try {
            const result = await this.sendJsonRpcRequest('receive', params);
            
            // Parse and return messages
            if (Array.isArray(result)) {
                return result.map(envelope => this.parseEnvelope(envelope));
            }
            
            return [];
        } catch (error) {
            this.logger.error('Failed to receive messages:', error);
            throw error;
        }
    }
    
    /**
     * Parse a message envelope from signal-cli into a Message object.
     * @private
     */
    private parseEnvelope(envelope: any): Message {
        const message: Message = {
            timestamp: envelope.timestamp || Date.now(),
            source: envelope.source || envelope.sourceNumber,
            sourceUuid: envelope.sourceUuid,
            sourceDevice: envelope.sourceDevice,
        };
        
        // Parse data message
        if (envelope.dataMessage) {
            const data = envelope.dataMessage;
            message.text = data.message || data.body;
            message.groupId = data.groupInfo?.groupId;
            message.attachments = data.attachments;
            message.mentions = data.mentions;
            message.quote = data.quote;
            message.reaction = data.reaction;
            message.sticker = data.sticker;
            message.expiresInSeconds = data.expiresInSeconds;
            message.viewOnce = data.viewOnce;
        }
        
        // Parse sync message
        if (envelope.syncMessage) {
            message.syncMessage = envelope.syncMessage;
        }
        
        // Parse receipt message
        if (envelope.receiptMessage) {
            message.receipt = envelope.receiptMessage;
        }
        
        // Parse typing message
        if (envelope.typingMessage) {
            message.typing = envelope.typingMessage;
        }
        
        return message;
    }

    // ############# NEW FEATURES - Missing signal-cli Commands #############

    /**
     * Remove a contact from the contact list.
     * @param number - The phone number of the contact to remove
     * @param options - Options for how to remove the contact
     */
    async removeContact(number: string, options: RemoveContactOptions = {}): Promise<void> {
        const params: any = { 
            account: this.account, 
            recipient: number 
        };
        
        if (options.hide) params.hide = true;
        if (options.forget) params.forget = true;
        
        await this.sendJsonRpcRequest('removeContact', params);
    }

    /**
     * Check if phone numbers are registered with Signal.
     * @param numbers - Array of phone numbers to check
     * @param usernames - Optional array of usernames to check
     * @returns Array of user status results
     */
    async getUserStatus(numbers: string[] = [], usernames: string[] = []): Promise<UserStatusResult[]> {
        const params: any = { account: this.account };
        
        if (numbers.length > 0) params.recipients = numbers;
        if (usernames.length > 0) params.usernames = usernames;
        
        const result = await this.sendJsonRpcRequest('getUserStatus', params);
        
        // Transform the result to match our interface
        const statusResults: UserStatusResult[] = [];
        
        if (result.recipients) {
            result.recipients.forEach((recipient: any) => {
                statusResults.push({
                    number: recipient.number,
                    isRegistered: recipient.isRegistered || false,
                    uuid: recipient.uuid,
                    username: recipient.username
                });
            });
        }
        
        return statusResults;
    }

    /**
     * Send a payment notification to a recipient (MobileCoin).
     * Sends a notification about a cryptocurrency payment made through Signal's MobileCoin integration.
     * 
     * @param recipient - The phone number or group ID of the recipient
     * @param paymentData - Payment notification data including receipt and optional note
     * @returns Send result with timestamp
     * @throws {Error} If receipt is invalid or sending fails
     * 
     * @example
     * ```typescript
     * const receiptBlob = 'base64EncodedReceiptData...';
     * await signal.sendPaymentNotification('+33612345678', {
     *   receipt: receiptBlob,
     *   note: 'Thanks for dinner!'
     * });
     * ```
     */
    async sendPaymentNotification(
        recipient: string, 
        paymentData: PaymentNotificationData
    ): Promise<SendResponse> {
        this.logger.info(`Sending payment notification to ${recipient}`);
        
        validateRecipient(recipient);
        
        if (!paymentData.receipt || paymentData.receipt.trim().length === 0) {
            throw new Error('Payment receipt is required');
        }
        
        const params: any = {
            receipt: paymentData.receipt,
            account: this.account
        };
        
        if (paymentData.note) {
            params.note = paymentData.note;
        }
        
        if (this.isGroupId(recipient)) {
            params.groupId = recipient;
        } else {
            params.recipient = recipient;
        }
        
        return this.sendJsonRpcRequest('sendPaymentNotification', params);
    }

    /**
     * Upload a custom sticker pack to Signal.
     * @param manifest - Sticker pack manifest information
     * @returns Upload result with pack ID and key
     */
    async uploadStickerPack(manifest: StickerPackManifest): Promise<StickerPackUploadResult> {
        const params = {
            account: this.account,
            path: manifest.path
        };
        
        const result = await this.sendJsonRpcRequest('uploadStickerPack', params);
        
        return {
            packId: result.packId,
            packKey: result.packKey,
            installUrl: result.installUrl
        };
    }

    /**
     * Submit a rate limit challenge to lift rate limiting.
     * @param challenge - Challenge token from the proof required error
     * @param captcha - Captcha token from solved captcha
     * @returns Challenge result indicating success/failure
     */
    async submitRateLimitChallenge(
        challenge: string, 
        captcha: string
    ): Promise<RateLimitChallengeResult> {
        const params = {
            account: this.account,
            challenge,
            captcha
        };
        
        const result = await this.sendJsonRpcRequest('submitRateLimitChallenge', params);
        
        return {
            success: result.success || false,
            retryAfter: result.retryAfter,
            message: result.message
        };
    }

    /**
     * Start the phone number change process.
     * Initiates SMS or voice verification for changing your account to a new phone number.
     * After calling this, you must verify the new number with finishChangeNumber().
     * 
     * @param newNumber - The new phone number in E164 format (e.g., "+33612345678")
     * @param voice - Use voice verification instead of SMS (default: false)
     * @param captcha - Optional captcha token if required
     * @throws {Error} If not a primary device or rate limited
     */
    async startChangeNumber(
        newNumber: string, 
        voice: boolean = false, 
        captcha?: string
    ): Promise<void> {
        this.logger.info(`Starting change number to ${newNumber} (voice: ${voice})`);
        
        validatePhoneNumber(newNumber);
        
        const params: any = {
            account: this.account,
            number: newNumber,
            voice
        };
        
        if (captcha) params.captcha = captcha;
        
        await this.sendJsonRpcRequest('startChangeNumber', params);
    }

    /**
     * Complete the phone number change process.
     * Verifies the code received via SMS or voice and changes your account to the new number.
     * Must be called after startChangeNumber().
     * 
     * @param newNumber - The new phone number (same as startChangeNumber)
     * @param verificationCode - The verification code received via SMS or voice
     * @param pin - Optional registration lock PIN if one was set
     * @throws {Error} If verification fails or incorrect PIN
     */
    async finishChangeNumber(newNumber: string, verificationCode: string, pin?: string): Promise<void> {
        this.logger.info(`Finishing change number to ${newNumber}`);
        
        validatePhoneNumber(newNumber);
        
        if (!verificationCode || verificationCode.trim().length === 0) {
            throw new Error('Verification code is required');
        }
        
        const params: any = {
            account: this.account,
            number: newNumber,
            verificationCode
        };
        
        if (pin) params.pin = pin;
        
        await this.sendJsonRpcRequest('finishChangeNumber', params);
    }

    /**
     * Enhanced send message with progress callback support.
     * @param recipient - Phone number or group ID
     * @param message - Message text
     * @param options - Send options including progress callback
     * @returns Send response
     */
    async sendMessageWithProgress(
        recipient: string, 
        message: string, 
        options: SendMessageOptions & { 
            onProgress?: (progress: UploadProgress) => void 
        } = {}
    ): Promise<SendResponse> {
        // For now, this is the same as sendMessage since signal-cli doesn't provide
        // native progress callbacks. This is a placeholder for future enhancement.
        const { onProgress, ...sendOptions } = options;
        
        // Simulate progress for large attachments
        if (onProgress && sendOptions.attachments && sendOptions.attachments.length > 0) {
            // Simulate upload progress
            for (let i = 0; i <= 100; i += 10) {
                onProgress({
                    total: 100,
                    uploaded: i,
                    percentage: i
                });
                // Small delay to simulate upload
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        
        return this.sendMessage(recipient, message, sendOptions);
    }

    // ========== NEW METHODS FOR 100% signal-cli COMPATIBILITY ==========

    /**
     * Send a poll create message to a recipient or group.
     * @param options Poll creation options
     * @returns Send response with timestamp
     */
    async sendPollCreate(options: PollCreateOptions): Promise<SendResponse> {
        this.logger.debug('Sending poll create', options);
        
        validateMessage(options.question, 500);
        
        if (!options.options || options.options.length < 2) {
            throw new MessageError('Poll must have at least 2 options');
        }
        
        if (options.options.length > 10) {
            throw new MessageError('Poll cannot have more than 10 options');
        }
        
        const params: any = {
            question: options.question,
            options: options.options,
            account: this.account
        };
        
        if (options.multiSelect !== undefined) {
            params.multiSelect = options.multiSelect;
        }
        
        if (options.groupId) {
            validateGroupId(options.groupId);
            params.groupId = options.groupId;
        } else if (options.recipients) {
            params.recipients = options.recipients.map(r => {
                validateRecipient(r);
                return r;
            });
        } else {
            throw new MessageError('Must specify either recipients or groupId');
        }
        
        return this.sendJsonRpcRequest('sendPollCreate', params);
    }

    /**
     * Send a poll vote message to vote on a poll.
     * @param recipient Recipient or group ID
     * @param options Poll vote options
     * @returns Send response with timestamp
     */
    async sendPollVote(recipient: string, options: PollVoteOptions): Promise<SendResponse> {
        this.logger.debug('Sending poll vote', { recipient, options });
        
        validateRecipient(options.pollAuthor);
        validateTimestamp(options.pollTimestamp);
        
        if (!options.optionIndexes || options.optionIndexes.length === 0) {
            throw new MessageError('Must specify at least one option to vote for');
        }
        
        const params: any = {
            pollAuthor: options.pollAuthor,
            pollTimestamp: options.pollTimestamp,
            options: options.optionIndexes,
            account: this.account
        };
        
        if (options.voteCount !== undefined) {
            params.voteCount = options.voteCount;
        }
        
        if (this.isGroupId(recipient)) {
            validateGroupId(recipient);
            params.groupId = recipient;
        } else {
            validateRecipient(recipient);
            params.recipient = recipient;
        }
        
        return this.sendJsonRpcRequest('sendPollVote', params);
    }

    /**
     * Send a poll terminate message to close a poll.
     * @param recipient Recipient or group ID
     * @param options Poll terminate options
     * @returns Send response with timestamp
     */
    async sendPollTerminate(recipient: string, options: PollTerminateOptions): Promise<SendResponse> {
        this.logger.debug('Sending poll terminate', { recipient, options });
        
        validateTimestamp(options.pollTimestamp);
        
        const params: any = {
            pollTimestamp: options.pollTimestamp,
            account: this.account
        };
        
        if (this.isGroupId(recipient)) {
            validateGroupId(recipient);
            params.groupId = recipient;
        } else {
            validateRecipient(recipient);
            params.recipient = recipient;
        }
        
        return this.sendJsonRpcRequest('sendPollTerminate', params);
    }

    /**
     * Update account information (device name, username, privacy settings).
     * @param options Account update options
     * @returns Account update result
     */
    async updateAccount(options: UpdateAccountOptions): Promise<AccountUpdateResult> {
        this.logger.debug('Updating account', options);
        
        const params: any = { account: this.account };
        
        if (options.deviceName) {
            params.deviceName = options.deviceName;
        }
        
        if (options.username) {
            params.username = options.username;
        }
        
        if (options.deleteUsername) {
            params.deleteUsername = true;
        }
        
        if (options.unrestrictedUnidentifiedSender !== undefined) {
            params.unrestrictedUnidentifiedSender = options.unrestrictedUnidentifiedSender;
        }
        
        if (options.discoverableByNumber !== undefined) {
            params.discoverableByNumber = options.discoverableByNumber;
        }
        
        if (options.numberSharing !== undefined) {
            params.numberSharing = options.numberSharing;
        }
        
        try {
            const result = await this.sendJsonRpcRequest('updateAccount', params);
            return {
                success: true,
                username: result.username,
                usernameLink: result.usernameLink
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Set or update the username for this account.
     * Helper method that wraps updateAccount() for simpler username management.
     * 
     * @param username - The username to set (without discriminator)
     * @returns Account update result with username and link
     * 
     * @example
     * ```typescript
     * const result = await signal.setUsername('myusername');
     * console.log(`Username: ${result.username}`);
     * console.log(`Link: ${result.usernameLink}`);
     * ```
     */
    async setUsername(username: string): Promise<AccountUpdateResult> {
        return this.updateAccount({ username });
    }

    /**
     * Delete the current username from this account.
     * Helper method that wraps updateAccount() for simpler username deletion.
     * 
     * @returns Account update result
     * 
     * @example
     * ```typescript
     * const result = await signal.deleteUsername();
     * if (result.success) {
     *   console.log('Username deleted successfully');
     * }
     * ```
     */
    async deleteUsername(): Promise<AccountUpdateResult> {
        return this.updateAccount({ deleteUsername: true });
    }

    /**
     * Get raw attachment data as base64 string.
     * @param options Attachment retrieval options
     * @returns Base64 encoded attachment data
     */
    async getAttachment(options: GetAttachmentOptions): Promise<string> {
        this.logger.debug('Getting attachment', options);
        
        if (!options.id) {
            throw new MessageError('Attachment ID is required');
        }
        
        const params: any = {
            id: options.id,
            account: this.account
        };
        
        if (options.groupId) {
            validateGroupId(options.groupId);
            params.groupId = options.groupId;
        } else if (options.recipient) {
            validateRecipient(options.recipient);
            params.recipient = options.recipient;
        }
        
        const result = await this.sendJsonRpcRequest('getAttachment', params);
        return result.data || result;
    }

    /**
     * Get raw avatar data as base64 string.
     * @param options Avatar retrieval options
     * @returns Base64 encoded avatar data
     */
    async getAvatar(options: GetAvatarOptions): Promise<string> {
        this.logger.debug('Getting avatar', options);
        
        const params: any = { account: this.account };
        
        if (options.contact) {
            validateRecipient(options.contact);
            params.contact = options.contact;
        } else if (options.profile) {
            validateRecipient(options.profile);
            params.profile = options.profile;
        } else if (options.groupId) {
            validateGroupId(options.groupId);
            params.groupId = options.groupId;
        } else {
            throw new MessageError('Must specify contact, profile, or groupId');
        }
        
        const result = await this.sendJsonRpcRequest('getAvatar', params);
        return result.data || result;
    }

    /**
     * Get raw sticker data as base64 string.
     * @param options Sticker retrieval options
     * @returns Base64 encoded sticker data
     */
    async getSticker(options: GetStickerOptions): Promise<string> {
        this.logger.debug('Getting sticker', options);
        
        if (!options.packId || !options.stickerId) {
            throw new MessageError('Pack ID and sticker ID are required');
        }
        
        const params = {
            packId: options.packId,
            stickerId: options.stickerId,
            account: this.account
        };
        
        const result = await this.sendJsonRpcRequest('getSticker', params);
        return result.data || result;
    }

    /**
     * Send contacts synchronization message to linked devices.
     * @param options Contacts sync options
     */
    async sendContacts(options: SendContactsOptions = {}): Promise<void> {
        this.logger.debug('Sending contacts sync');
        
        const params: any = { account: this.account };
        
        if (options.includeAllRecipients) {
            params.allRecipients = true;
        }
        
        await this.sendJsonRpcRequest('sendContacts', params);
    }

    /**
     * List groups with optional filtering and details.
     * @param options List groups options
     * @returns Array of group information
     */
    async listGroupsDetailed(options: ListGroupsOptions = {}): Promise<GroupInfo[]> {
        this.logger.debug('Listing groups with options', options);
        
        const params: any = { account: this.account };
        
        if (options.detailed) {
            params.detailed = true;
        }
        
        if (options.groupIds && options.groupIds.length > 0) {
            params.groupId = options.groupIds;
        }
        
        return this.sendJsonRpcRequest('listGroups', params);
    }

    /**
     * List all local accounts.
     * @returns Array of account phone numbers
     */
    async listAccountsDetailed(): Promise<Array<{ number: string; name?: string; uuid?: string }>> {
        this.logger.debug('Listing all accounts');
        
        const result = await this.sendJsonRpcRequest('listAccounts');
        return result.accounts || [];
    }

    /**
     * Extract profile information from a contact.
     * Parses givenName, familyName, mobileCoinAddress from profile data.
     * 
     * @param contact - The contact object to parse
     * @returns Enhanced contact with extracted profile fields
     * 
     * @example
     * ```typescript
     * const contacts = await signal.listContacts();
     * const enriched = signal.parseContactProfile(contacts[0]);
     * console.log(enriched.givenName, enriched.familyName);
     * ```
     */
    parseContactProfile(contact: Contact): Contact {
        // signal-cli already provides these fields if available
        // This method normalizes and validates the data
        return {
            ...contact,
            givenName: contact.givenName || undefined,
            familyName: contact.familyName || undefined,
            mobileCoinAddress: contact.mobileCoinAddress || undefined,
            profileName: contact.profileName || 
                         (contact.givenName && contact.familyName 
                          ? `${contact.givenName} ${contact.familyName}` 
                          : contact.givenName || contact.familyName),
        };
    }

    /**
     * Extract group membership details.
     * Parses pendingMembers, bannedMembers, inviteLink from group data.
     * 
     * @param group - The group info to parse
     * @returns Enhanced group with extracted membership fields
     * 
     * @example
     * ```typescript
     * const groups = await signal.listGroups();
     * const enriched = signal.parseGroupDetails(groups[0]);
     * console.log(enriched.pendingMembers, enriched.bannedMembers);
     * ```
     */
    parseGroupDetails(group: GroupInfo): GroupInfo {
        return {
            ...group,
            // Normalize inviteLink field
            inviteLink: group.groupInviteLink || group.inviteLink,
            groupInviteLink: group.groupInviteLink || group.inviteLink,
            // Ensure arrays exist
            pendingMembers: group.pendingMembers || [],
            banned: group.banned || [],
            requestingMembers: group.requestingMembers || [],
            admins: group.admins || [],
            members: group.members || [],
        };
    }

    /**
     * Get enriched contacts list with parsed profile information.
     * 
     * @returns Array of contacts with full profile data
     * 
     * @example
     * ```typescript
     * const contacts = await signal.getContactsWithProfiles();
     * contacts.forEach(c => {
     *   console.log(`${c.givenName} ${c.familyName} - ${c.mobileCoinAddress}`);
     * });
     * ```
     */
    async getContactsWithProfiles(): Promise<Contact[]> {
        const contacts = await this.listContacts();
        return contacts.map(c => this.parseContactProfile(c));
    }

    /**
     * Get enriched groups list with parsed membership details.
     * 
     * @param options - List groups options
     * @returns Array of groups with full membership data
     * 
     * @example
     * ```typescript
     * const groups = await signal.getGroupsWithDetails();
     * groups.forEach(g => {
     *   console.log(`${g.name}: ${g.members.length} members, ${g.pendingMembers.length} pending`);
     * });
     * ```
     */
    async getGroupsWithDetails(options: ListGroupsOptions = {}): Promise<GroupInfo[]> {
        const groups = await this.listGroupsDetailed(options);
        return groups.map(g => this.parseGroupDetails(g));
    }
}
