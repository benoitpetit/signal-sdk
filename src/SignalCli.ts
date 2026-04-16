import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import * as http from 'http';
import { v4 as uuidv4 } from 'uuid';

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
    ReceiveOptions,
    UploadProgress,
    PollCreateOptions,
    PollVoteOptions,
    PollTerminateOptions,
    GetAttachmentOptions,
    GetAvatarOptions,
    GetStickerOptions,
    UpdateAccountOptions,
    AccountUpdateResult,
    SendContactsOptions,
    ListGroupsOptions,
    UpdateDeviceOptions,
    // v0.14.0
    PinMessageOptions,
    UnpinMessageOptions,
    AdminDeleteOptions,
    JsonRpcStartOptions,
    StartCallOptions,
    CallInfo,
    AcceptCallOptions,
    HangUpCallOptions,
    SendCallRelayCandidatesOptions,
    ListContactsOptions,
} from './interfaces';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';
import { validatePhoneNumber, validateSanitizedString } from './validators';
import { RateLimiter } from './retry';
import { Logger, SignalCliConfig, validateConfig } from './config';
import { ConnectionError } from './errors';
import { MessageManager } from './managers/MessageManager';
import { GroupManager } from './managers/GroupManager';
import { ContactManager } from './managers/ContactManager';
import { DeviceManager } from './managers/DeviceManager';
import { AccountManager } from './managers/AccountManager';
import { StickerManager } from './managers/StickerManager';

export class SignalCli extends EventEmitter {
    private signalCliPath: string;
    private account?: string;
    private cliProcess: ChildProcess | null = null;
    private requestPromises = new Map<string, { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }>();
    private config: Required<SignalCliConfig>;
    private logger: Logger;
    private rateLimiter: RateLimiter;
    private responseBuffer = '';
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private isIntentionalShutdown = false;
    private healthCheckTimer: NodeJS.Timeout | null = null;
    private socket?: net.Socket;

    // Managers
    public readonly messages: MessageManager;
    public readonly groups: GroupManager;
    public readonly contacts: ContactManager;
    public readonly devices: DeviceManager;
    public readonly accounts: AccountManager;
    public readonly stickers: StickerManager;

    constructor(accountOrPath?: string, account?: string, config: SignalCliConfig = {}) {
        super();

        // Validate and merge configuration
        this.config = validateConfig(config);

        // Initialize logger
        this.logger = new Logger({
            level: this.config.verbose ? 'debug' : 'info',
        });

        // Initialize rate limiter
        this.rateLimiter = new RateLimiter(this.config.maxConcurrentRequests, this.config.minRequestInterval);

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
        const localBinPath =
            process.platform === 'win32'
                ? path.join(__dirname, '..', 'bin', 'signal-cli.bat')
                : path.join(__dirname, '..', 'bin', 'signal-cli');

        // Check if signal-cli is in local bin, otherwise assume it's in system PATH
        if (fs.existsSync(localBinPath)) {
            defaultPath = localBinPath;
        } else {
            defaultPath = process.platform === 'win32' ? 'signal-cli.bat' : 'signal-cli';
        }

        this.signalCliPath = signalCliPath || defaultPath;
        this.account = phoneNumber;

        // Validate account if provided
        if (this.account) {
            validatePhoneNumber(this.account);
        }

        // Validate CLI path
        validateSanitizedString(this.signalCliPath, 'signalCliPath');

        // Initialize Managers
        const rpcCall = <T = unknown>(method: string, params?: unknown) => {
            return this.sendJsonRpcRequest(method, params) as Promise<T>;
        };
        this.messages = new MessageManager(rpcCall, this.account, this.logger, this.config);
        this.groups = new GroupManager(rpcCall, this.account, this.logger, this.config);
        this.contacts = new ContactManager(rpcCall, this.account, this.logger, this.config);
        this.devices = new DeviceManager(rpcCall, this.account, this.logger, this.config, this.signalCliPath);
        this.accounts = new AccountManager(rpcCall, this.account, this.logger, this.config);
        this.stickers = new StickerManager(rpcCall, this.account, this.logger, this.config);
    }

    public async connect(options: JsonRpcStartOptions = {}): Promise<void> {
        this.isIntentionalShutdown = false;
        const daemonMode = this.config.daemonMode || 'json-rpc';

        switch (daemonMode) {
            case 'json-rpc':
                await this.connectJsonRpc(options);
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

        this.emit('connected');

        if (this.config.autoReconnect) {
            this.startHealthCheck();
        }
    }

    private jsonRpcStartOptions: JsonRpcStartOptions = {};

    private async connectJsonRpc(options: JsonRpcStartOptions = {}): Promise<void> {
        this.jsonRpcStartOptions = options;
        const baseArgs = this.account ? ['-a', this.account, 'jsonRpc'] : ['jsonRpc'];
        const args = [...baseArgs];

        // v0.14.0 flags for the jsonRpc sub-command
        if (options.ignoreAttachments) args.push('--ignore-attachments');
        if (options.ignoreStories) args.push('--ignore-stories');
        if (options.ignoreAvatars) args.push('--ignore-avatars');
        if (options.ignoreStickers) args.push('--ignore-stickers');
        if (options.sendReadReceipts) args.push('--send-read-receipts');
        if (options.receiveMode) args.push('--receive-mode', options.receiveMode);

        if (process.platform === 'win32') {
            // On Windows, use cmd.exe to run the batch file with proper quoting for paths with spaces
            this.cliProcess = spawn('cmd.exe', ['/c', this.signalCliPath, ...args]);
        } else {
            this.cliProcess = spawn(this.signalCliPath, args);
        }

        this.cliProcess.stdout?.on('data', (data) => this.handleRpcResponse(data.toString('utf8')));
        this.cliProcess.stderr?.on('data', (data) => this.handleStderrData(data.toString('utf8')));
        this.cliProcess.on('close', (code) => this.handleProcessClose(code));
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
                if (code !== 0 && !this.cliProcess) {
                    // Only reject if not trying to reconnect or already null
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

                this.socket = socket;
                resolve();
            });

            socket.on('error', (err) => {
                reject(new ConnectionError(`Failed to connect to Unix socket: ${err.message}`));
            });

            setTimeout(
                () => reject(new ConnectionError('Unix socket connection timeout')),
                this.config.connectionTimeout,
            );
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

                this.socket = socket;
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


        // Test connection by sending a simple request
        try {
            await this.httpRequest({ jsonrpc: '2.0', method: 'version', params: {}, id: uuidv4() });
            this.logger.debug('HTTP connection verified');
        } catch (error) {
            throw new ConnectionError(
                `Failed to connect to HTTP endpoint: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    private async httpRequest(request: JsonRpcRequest): Promise<unknown> {
        const https = await import(this.config.httpBaseUrl?.startsWith('https:') ? 'https' : 'http');
        const baseUrl = this.config.httpBaseUrl || 'http://localhost:8080';
        const url = new URL('/api/v1/rpc', baseUrl);

        return new Promise((resolve, reject) => {
            const data = JSON.stringify(request);
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data),
                },
            };

            const req = https.request(url, options, (res: http.IncomingMessage) => {
                let body = '';
                res.on('data', (chunk: string) => (body += chunk));
                res.on('end', () => {
                    try {
                        const response: JsonRpcResponse = JSON.parse(body);
                        if (response.error) {
                            reject(new Error(`[${response.error.code}] ${response.error.message}`));
                        } else {
                            resolve(response.result);
                        }
                    } catch {
                        reject(new Error(`Failed to parse HTTP response: ${body}`));
                    }
                });
            });

            req.on('error', (err: Error) => reject(new ConnectionError(`HTTP request failed: ${err.message}`)));
            req.setTimeout(this.config.requestTimeout, () => {
                req.destroy();
                reject(new ConnectionError('HTTP request timeout'));
            });

            req.write(data);
            req.end();
        });
    }

    public disconnect(): void {
        this.isIntentionalShutdown = true;
        this.stopHealthCheck();
        const daemonMode = this.config.daemonMode || 'json-rpc';

        // Close socket connections
        if (daemonMode === 'unix-socket' || daemonMode === 'tcp') {
            const socket = this.socket;
            if (socket && !socket.destroyed) {
                socket.destroy();
                this.socket = undefined;
            }
        }

        // Close process for json-rpc mode
        if (daemonMode === 'json-rpc' && this.cliProcess) {
            this.cliProcess.kill();
            this.cliProcess = null;
        }

        this.emit('disconnected');

        // For HTTP mode, nothing to disconnect (stateless)
    }

    public async gracefulShutdown(): Promise<void> {
        this.isIntentionalShutdown = true;
        this.stopHealthCheck();
        return new Promise((resolve) => {
            if (!this.cliProcess) {
                this.emit('disconnected');
                resolve();
                return;
            }

            // Listen for the process to close
            this.cliProcess.once('close', () => {
                this.cliProcess = null;
                this.emit('disconnected');
                resolve();
            });

            // Send SIGTERM for graceful shutdown
            this.cliProcess.kill('SIGTERM');

            // Force kill after 5 seconds if it doesn't close gracefully
            const forceKillTimer = setTimeout(() => {
                if (this.cliProcess) {
                    this.cliProcess.kill('SIGKILL');
                    this.cliProcess = null;
                    this.emit('disconnected');
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
        this.responseBuffer += data;

        const lines = this.responseBuffer.split('\n');

        // If there's only one "line" and it doesn't end with a newline,
        // it might be a partial JSON OR a full JSON from a test passing a string without \n.
        if (lines.length === 1 && !this.responseBuffer.endsWith('\n')) {
            const trimmed = this.responseBuffer.trim();
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                try {
                    const response = JSON.parse(trimmed);
                    this.responseBuffer = '';
                    this.processSingleRpcResponse(response);
                    return;
                } catch {
                    // Partial JSON, wait for more data
                    return;
                }
            }
            return;
        }

        // If we have multiple lines, or it ends with a newline, process all complete lines
        this.responseBuffer = lines.pop() || '';

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            try {
                const response: JsonRpcResponse | JsonRpcNotification = JSON.parse(trimmedLine);
                this.processSingleRpcResponse(response);
            } catch {
                this.emit('error', new Error(`Failed to parse JSON-RPC response: ${trimmedLine}`));
            }
        }
    }

    private processSingleRpcResponse(response: JsonRpcResponse | JsonRpcNotification): void {
        if ('id' in response && response.id) {
            const promise = this.requestPromises.get(response.id);
            if (promise) {
                if (response.error) {
                    promise.reject(new Error(`[${response.error.code}] ${response.error.message}`));
                } else {
                    promise.resolve(response.result);
                }
                this.requestPromises.delete(response.id);
            }
        } else if ('method' in response) {
            this.emit('notification', response);
            if (response.method === 'receive') {
                this.emit('message', response.params);
                const params = response.params as Record<string, unknown> | undefined;
                if (params && params.envelope) {
                    this.emitDetailedEvents(params.envelope as Record<string, unknown>);
                }
            }
        }
    }

    private emitDetailedEvents(envelope: Record<string, unknown>): void {
        const source = (envelope.source as string | undefined) || (envelope.sourceNumber as string | undefined);
        const timestamp = envelope.timestamp as number | undefined;
        const dataMessage = envelope.dataMessage as Record<string, unknown> | undefined;

        // 1. Reaction
        const reaction = dataMessage?.reaction as Record<string, unknown> | undefined;
        if (reaction) {
            this.emit('reaction', {
                emoji: reaction.emoji,
                sender: source,
                timestamp: timestamp,
                targetAuthor: reaction.targetAuthor,
                targetTimestamp: reaction.targetSentTimestamp,
                isRemove: reaction.isRemove,
            });
        }

        // 2. Receipt
        const receiptMessage = envelope.receiptMessage as Record<string, unknown> | undefined;
        if (receiptMessage) {
            this.emit('receipt', {
                sender: source,
                timestamp: timestamp,
                type: receiptMessage.type,
                timestamps: receiptMessage.timestamps,
                when: receiptMessage.when,
            });
        }

        // 3. Typing
        const typingMessage = envelope.typingMessage as Record<string, unknown> | undefined;
        if (typingMessage) {
            this.emit('typing', {
                sender: source,
                timestamp: timestamp,
                action: typingMessage.action,
                groupId: typingMessage.groupId,
            });
        }

        // 4. Story (if supported in future or present)
        const storyMessage = envelope.storyMessage as Record<string, unknown> | undefined;
        if (storyMessage) {
            this.emit('story', {
                sender: source,
                timestamp: timestamp,
                ...storyMessage,
            });
        }

        // 5. Pin/Unpin events (v0.14.0)
        if (dataMessage && dataMessage.pinnedMessageTimestamps !== undefined) {
            this.emit('pin', {
                sender: source,
                timestamp: timestamp,
                pinnedMessageTimestamps: dataMessage.pinnedMessageTimestamps,
                ...dataMessage,
            });
        }

        // 6. Call events (v0.14.2)
        const callMessage = envelope.callMessage as Record<string, unknown> | undefined;
        if (callMessage) {
            const callData = callMessage;
            this.emit('call', {
                sender: source,
                timestamp: timestamp,
                callId: callData.callId,
                type: callData.type || 'voice',
                direction: callData.direction || 'incoming',
                state: callData.state || 'ringing',
                ...callData,
            });
        }
    }

    private async handleProcessClose(code: number | null): Promise<void> {
        this.cliProcess = null;
        this.emit('close', code);

        // Skip reconnection if shutdown was intentional
        if (this.isIntentionalShutdown) {
            this.logger.debug(`Signal process closed intentionally (code ${code}). Skipping reconnection.`);
            return;
        }

        // Auto-reconnect logic if not explicitly disconnected
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;

            // Exponential backoff: 1s, 2s, 4s, 8s, 16s...
            const delay = Math.pow(2, this.reconnectAttempts - 1) * 1000;
            this.logger.warn(
                `signal-cli process closed (code ${code}). Reconnecting in ${delay}ms... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
            );

            setTimeout(async () => {
                try {
                    await this.connect(this.jsonRpcStartOptions);
                    this.reconnectAttempts = 0; // Reset on success
                    this.logger.info('Reconnected to signal-cli successfully');
                } catch (error) {
                    this.logger.error('Reconnection attempt failed:', error);
                }
            }, delay);
        } else {
            this.logger.error(
                `Max reconnection attempts reached (${this.maxReconnectAttempts}). Manual intervention required.`,
            );
        }
    }

    private async handleStderrData(data: string): Promise<void> {
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
            const isInformationalWarn =
                logLevel === 'WARN' &&
                (message.includes('Failed to get sender certificate') ||
                    message.includes('ignoring: java.lang.InterruptedException') ||
                    message.includes('Request was interrupted') ||
                    message.includes('Connection reset') ||
                    message.includes('Socket closed') ||
                    message.includes('gracefully closing'));

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

    private startHealthCheck(): void {
        this.stopHealthCheck();

        // Check health every 30 seconds by default
        const interval = 30000;

        this.healthCheckTimer = setInterval(async () => {
            if (!this.cliProcess && this.config.daemonMode === 'json-rpc') return;

            try {
                // Send a lightweight request to check if process is responsive
                await this.getVersion();
                this.logger.debug('Health check passed');
            } catch (error) {
                this.logger.error('Health check failed:', error);

                // If the process is stuck, we might need to restart it
                if (this.config.autoReconnect && !this.isIntentionalShutdown) {
                    this.logger.warn('Process unresponsive, attempting restart...');
                    if (this.cliProcess) {
                        this.cliProcess.kill('SIGKILL');
                    } else if (this.config.daemonMode !== 'json-rpc') {
                        // For other modes, try to reconnect
                        this.connect().catch((err) =>
                            this.logger.error('Failed to reconnect after health check failure', err),
                        );
                    }
                }
            }
        }, interval);

        if (this.healthCheckTimer.unref) {
            this.healthCheckTimer.unref();
        }
    }

    private stopHealthCheck(): void {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
    }

    private async sendJsonRpcRequest(method: string, params?: unknown): Promise<unknown> {
        return this.rateLimiter.execute(async () => {
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

            const id = uuidv4();
            const request: JsonRpcRequest = {
                jsonrpc: '2.0',
                method,
                params,
                id,
            };

            const executeRequest = (): Promise<unknown> => {
                // For socket modes (Unix socket, TCP), write to socket
                if (daemonMode === 'unix-socket' || daemonMode === 'tcp') {
                    const socket = this.socket;
                    if (!socket || socket.destroyed) {
                        throw new ConnectionError('Not connected. Call connect() first.');
                    }

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

                const promise = new Promise((resolve, reject) => {
                    this.requestPromises.set(id, { resolve, reject });
                });

                this.cliProcess.stdin.write(JSON.stringify(request) + '\n');
                return promise;
            };

            // Standardized timeout for all RPC requests
            let timeoutHandle: NodeJS.Timeout | null = null;
            const timeoutPromise = new Promise((_, reject) => {
                timeoutHandle = setTimeout(() => {
                    this.requestPromises.delete(id);
                    reject(new ConnectionError(`RPC request timeout: ${method} (${this.config.requestTimeout}ms)`));
                }, this.config.requestTimeout);
            });

            try {
                return await Promise.race([executeRequest(), timeoutPromise]);
            } finally {
                if (timeoutHandle) {
                    clearTimeout(timeoutHandle);
                }
            }
        });
    }

    // ############# Refactored Methods #############

    async register(number: string, voice?: boolean, captcha?: string, reregister?: boolean): Promise<void> {
        return this.accounts.register(number, voice, captcha, reregister);
    }

    async verify(number: string, token: string, pin?: string): Promise<void> {
        return this.accounts.verify(number, token, pin);
    }

    async sendMessage(
        recipient: string,
        message: string,
        options: Omit<SendMessageOptions, 'message'> = {},
    ): Promise<SendResponse> {
        return this.messages.sendMessage(recipient, message, options);
    }

    async sendReaction(
        recipient: string,
        targetAuthor: string,
        targetTimestamp: number,
        emoji: string,
        remove: boolean = false,
        isStory: boolean = false,
    ): Promise<SendResponse> {
        return this.messages.sendReaction(recipient, targetAuthor, targetTimestamp, emoji, remove, isStory);
    }

    async sendTyping(recipient: string, stop: boolean = false): Promise<void> {
        return this.messages.sendTyping(recipient, stop);
    }

    async remoteDeleteMessage(recipient: string, targetTimestamp: number): Promise<void> {
        return this.messages.remoteDeleteMessage(recipient, targetTimestamp);
    }

    async updateContact(
        number: string,
        name?: string,
        options: Omit<ContactUpdateOptions, 'name'> = {},
    ): Promise<void> {
        return this.contacts.updateContact(number, name, options);
    }

    async block(recipients: string[], groupId?: string): Promise<void> {
        return this.contacts.block(recipients, groupId);
    }

    async unblock(recipients: string[], groupId?: string): Promise<void> {
        return this.contacts.unblock(recipients, groupId);
    }

    async quitGroup(groupId: string, options?: { delete?: boolean; admins?: string[] }): Promise<void> {
        return this.groups.quitGroup(groupId, options);
    }

    async joinGroup(uri: string): Promise<void> {
        return this.groups.joinGroup(uri);
    }

    async updateProfile(
        givenName: string,
        about?: string,
        aboutEmoji?: string,
        avatar?: string,
        options: { familyName?: string; mobileCoinAddress?: string; removeAvatar?: boolean } = {},
    ): Promise<void> {
        return this.accounts.updateProfile(givenName, about, aboutEmoji, avatar, options);
    }

    async sendReceipt(recipient: string, targetTimestamp: number, type: ReceiptType = 'read'): Promise<void> {
        return this.messages.sendReceipt(recipient, targetTimestamp, type);
    }

    async listStickerPacks(): Promise<StickerPack[]> {
        return this.stickers.listStickerPacks();
    }

    async addStickerPack(packId: string, packKey: string): Promise<void> {
        return this.stickers.addStickerPack(packId, packKey);
    }

    async unregister(): Promise<void> {
        return this.accounts.unregister();
    }

    async deleteLocalAccountData(): Promise<void> {
        return this.accounts.deleteLocalAccountData();
    }

    async updateAccountConfiguration(config: AccountConfiguration): Promise<void> {
        return this.accounts.updateAccountConfiguration(config);
    }

    async removeDevice(deviceId: number): Promise<void> {
        return this.devices.removeDevice(deviceId);
    }

    async setPin(pin: string): Promise<void> {
        return this.accounts.setPin(pin);
    }

    async removePin(): Promise<void> {
        return this.accounts.removePin();
    }

    async listIdentities(number?: string): Promise<IdentityKey[]> {
        return this.contacts.listIdentities(number);
    }

    async trustIdentity(number: string, verifiedSafetyNumber: string): Promise<void> {
        return this.contacts.trustIdentity(number, verifiedSafetyNumber);
    }

    /**
     * Trust all known identity keys of a user.
     * ⚠️ Only use this for testing purposes.
     */
    async trustAllKnownKeys(number: string): Promise<void> {
        return this.contacts.trustAllKnownKeys(number);
    }

    async getSafetyNumber(number: string): Promise<string | null> {
        const identities = await this.listIdentities(number);
        if (identities.length > 0 && identities[0].safetyNumber) {
            return identities[0].safetyNumber;
        }
        return null;
    }

    async verifySafetyNumber(number: string, safetyNumber: string): Promise<boolean> {
        const storedSafetyNumber = await this.getSafetyNumber(number);

        if (!storedSafetyNumber) {
            return false;
        }

        const normalizedStored = storedSafetyNumber.replace(/\s/g, '');
        const normalizedProvided = safetyNumber.replace(/\s/g, '');

        if (normalizedStored === normalizedProvided) {
            await this.trustIdentity(number, safetyNumber);
            return true;
        }

        return false;
    }

    async listUntrustedIdentities(): Promise<IdentityKey[]> {
        const allIdentities = await this.listIdentities();
        return allIdentities.filter(
            (identity) =>
                identity.trustLevel === 'UNTRUSTED' ||
                identity.trustLevel === 'TRUST_ON_FIRST_USE' ||
                !identity.trustLevel,
        );
    }

    async link(deviceName?: string): Promise<string> {
        const result = (await this.sendJsonRpcRequest('link', { deviceName })) as { uri: string };
        return result.uri;
    }

    async deviceLink(options: LinkingOptions = {}): Promise<LinkingResult> {
        return this.devices.deviceLink(options);
    }

    async addDevice(uri: string, deviceName?: string): Promise<void> {
        return this.devices.addDevice(uri, deviceName);
    }

    async sendSyncRequest(): Promise<void> {
        await this.sendJsonRpcRequest('sendSyncRequest', { account: this.account });
    }

    async sendMessageRequestResponse(recipient: string, response: MessageRequestResponseType): Promise<void> {
        await this.sendJsonRpcRequest('sendMessageRequestResponse', {
            account: this.account,
            recipient,
            type: response,
        });
    }

    async getVersion(): Promise<unknown> {
        return this.sendJsonRpcRequest('version');
    }

    async createGroup(name: string, members: string[]): Promise<GroupInfo> {
        return this.groups.createGroup(name, members);
    }

    async updateGroup(groupId: string, options: GroupUpdateOptions): Promise<void> {
        return this.groups.updateGroup(groupId, options);
    }

    async listGroups(): Promise<GroupInfo[]> {
        return this.groups.listGroups();
    }

    async sendGroupInviteLink(groupId: string, recipient: string): Promise<SendResponse> {
        const groups = await this.listGroups();
        const group = groups.find((g) => g.groupId === groupId);

        const inviteLink = group?.groupInviteLink || group?.inviteLink;
        if (!group || !inviteLink) {
            throw new Error('Group not found or does not have an invite link');
        }

        return this.sendMessage(recipient, `Join our group: ${inviteLink}`);
    }

    async setBannedMembers(groupId: string, members: string[]): Promise<void> {
        await this.updateGroup(groupId, { banMembers: members });
    }

    async resetGroupLink(groupId: string): Promise<void> {
        await this.updateGroup(groupId, { resetInviteLink: true });
    }

    async listContacts(options?: ListContactsOptions): Promise<Contact[]> {
        return this.contacts.listContacts(options);
    }

    async listDevices(): Promise<Device[]> {
        return this.devices.listDevices();
    }

    async updateDevice(options: UpdateDeviceOptions): Promise<void> {
        return this.devices.updateDevice(options);
    }

    async listAccounts(): Promise<string[]> {
        return this.accounts.listAccounts();
    }

    // ############# Deprecated Methods (Kept for backward compatibility) #############

    /**
     * @deprecated Use `connect` and listen for `message` events instead.
     * This method now provides a compatibility layer by connecting and buffering messages.
     */
    async receiveMessages(): Promise<Message[]> {
        console.warn(
            "receiveMessages is deprecated and will be removed in a future version. Use connect() and listen for 'message' events instead.",
        );

        // Return empty array but log helpful migration info
        console.info('Migration guide: Replace receiveMessages() with:');
        console.info('  await signalCli.connect();');
        console.info("  signalCli.on('message', (msg) => { /* handle message */ });");

        return Promise.resolve([]);
    }

    /**
     * @deprecated Use `connect` instead.
     * This method now calls connect() for backward compatibility.
     */
    async startDaemon(): Promise<void> {
        console.warn('startDaemon is deprecated. Use connect() instead.');
        await this.connect();
    }

    /**
     * @deprecated Use `gracefulShutdown` or `disconnect` instead.
     * This method now calls gracefulShutdown() for backward compatibility.
     */
    async stopDaemon(): Promise<void> {
        console.warn('stopDaemon is deprecated. Use gracefulShutdown() or disconnect() instead.');
        await this.gracefulShutdown();
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
        return this.messages.receive(options);
    }

    async removeContact(number: string, options: RemoveContactOptions = {}): Promise<void> {
        return this.contacts.removeContact(number, options);
    }

    async getUserStatus(numbers: string[] = [], usernames: string[] = []): Promise<UserStatusResult[]> {
        return this.contacts.getUserStatus(numbers, usernames);
    }

    async sendPaymentNotification(recipient: string, paymentData: PaymentNotificationData): Promise<SendResponse> {
        return this.accounts.sendPaymentNotification(recipient, paymentData);
    }

    async uploadStickerPack(manifest: StickerPackManifest): Promise<StickerPackUploadResult> {
        return this.stickers.uploadStickerPack(manifest);
    }

    async submitRateLimitChallenge(challenge: string, captcha: string): Promise<RateLimitChallengeResult> {
        return this.accounts.submitRateLimitChallenge(challenge, captcha);
    }

    async startChangeNumber(newNumber: string, voice: boolean = false, captcha?: string): Promise<void> {
        return this.accounts.startChangeNumber(newNumber, voice, captcha);
    }

    async finishChangeNumber(newNumber: string, verificationCode: string, pin?: string): Promise<void> {
        return this.accounts.finishChangeNumber(newNumber, verificationCode, pin);
    }

    async sendMessageWithProgress(
        recipient: string,
        message: string,
        options: SendMessageOptions & {
            onProgress?: (progress: UploadProgress) => void;
        } = {},
    ): Promise<SendResponse> {
        return this.messages.sendMessageWithProgress(recipient, message, options);
    }

    async sendPollCreate(options: PollCreateOptions): Promise<SendResponse> {
        return this.messages.sendPollCreate(options);
    }

    async sendPollVote(recipient: string, options: PollVoteOptions): Promise<SendResponse> {
        return this.messages.sendPollVote(recipient, options);
    }

    async sendPollTerminate(recipient: string, options: PollTerminateOptions): Promise<SendResponse> {
        return this.messages.sendPollTerminate(recipient, options);
    }

    async updateAccount(options: UpdateAccountOptions): Promise<AccountUpdateResult> {
        return this.accounts.updateAccount(options);
    }

    async setUsername(username: string): Promise<AccountUpdateResult> {
        return this.accounts.updateAccount({ username });
    }

    async deleteUsername(): Promise<AccountUpdateResult> {
        return this.accounts.updateAccount({ deleteUsername: true });
    }

    async getAttachment(options: GetAttachmentOptions): Promise<string> {
        return this.messages.getAttachment(options);
    }

    async getAvatar(options: GetAvatarOptions): Promise<string> {
        return this.contacts.getAvatar(options);
    }

    async getSticker(options: GetStickerOptions): Promise<string> {
        return this.stickers.getSticker(options);
    }

    async sendContacts(options: SendContactsOptions = {}): Promise<void> {
        const params: Record<string, unknown> = { account: this.account };
        if (options.includeAllRecipients) params.allRecipients = true;
        await this.sendJsonRpcRequest('sendContacts', params);
    }

    async listGroupsDetailed(options: ListGroupsOptions = {}): Promise<GroupInfo[]> {
        return this.groups.listGroupsDetailed(options);
    }

    async listAccountsDetailed(): Promise<Array<{ number: string; name?: string; uuid?: string }>> {
        return this.accounts.listAccountsDetailed();
    }

    parseContactProfile(contact: Contact): Contact {
        return this.contacts.parseContactProfile(contact);
    }

    parseGroupDetails(group: GroupInfo): GroupInfo {
        return this.groups.parseGroupDetails(group);
    }

    async getContactsWithProfiles(): Promise<Contact[]> {
        return this.contacts.getContactsWithProfiles();
    }

    async getGroupsWithDetails(options: ListGroupsOptions = {}): Promise<GroupInfo[]> {
        return this.groups.getGroupsWithDetails(options);
    }

    async isRegistered(number: string): Promise<boolean> {
        const results = await this.getUserStatus([number]);
        return results.length > 0 && results[0].isRegistered;
    }

    async sendNoteToSelf(
        message: string,
        options: Omit<SendMessageOptions, 'message' | 'noteToSelf'> = {},
    ): Promise<SendResponse> {
        if (!this.account) {
            throw new Error('Account must be configured to send Note to Self');
        }
        return this.sendMessage(this.account, message, { ...options, noteToSelf: true });
    }

    // ############# v0.14.0 NEW METHODS #############

    /**
     * Pin a message in a conversation or group.
     *
     * Requires signal-cli v0.14.0+.
     *
     * @param options - Options describing the message to pin and the target recipient/group
     *
     * @example
     * ```typescript
     * await signal.sendPinMessage({
     *   targetAuthor: '+33123456789',
     *   targetTimestamp: 1700000000000,
     *   groupId: 'base64groupId==',
     *   pinDuration: -1, // forever
     * });
     * ```
     */
    async sendPinMessage(options: PinMessageOptions): Promise<void> {
        const params: Record<string, unknown> = {
            account: this.account,
            targetAuthor: options.targetAuthor,
            targetTimestamp: options.targetTimestamp,
        };

        if (options.groupId) {
            params.groupId = options.groupId;
        } else if (options.recipients && options.recipients.length > 0) {
            params.recipients = options.recipients;
        } else if (options.noteToSelf) {
            params.noteToSelf = true;
        }

        if (options.pinDuration !== undefined) {
            params.pinDuration = options.pinDuration;
        }

        if (options.notifySelf) {
            params.notifySelf = true;
        }

        await this.sendJsonRpcRequest('sendPinMessage', params);
    }

    /**
     * Unpin a previously pinned message in a conversation or group.
     *
     * Requires signal-cli v0.14.0+.
     *
     * @param options - Options describing the message to unpin and the target recipient/group
     *
     * @example
     * ```typescript
     * await signal.sendUnpinMessage({
     *   targetAuthor: '+33123456789',
     *   targetTimestamp: 1700000000000,
     *   groupId: 'base64groupId==',
     * });
     * ```
     */
    async sendUnpinMessage(options: UnpinMessageOptions): Promise<void> {
        const params: Record<string, unknown> = {
            account: this.account,
            targetAuthor: options.targetAuthor,
            targetTimestamp: options.targetTimestamp,
        };

        if (options.groupId) {
            params.groupId = options.groupId;
        } else if (options.recipients && options.recipients.length > 0) {
            params.recipients = options.recipients;
        } else if (options.noteToSelf) {
            params.noteToSelf = true;
        }

        if (options.notifySelf) {
            params.notifySelf = true;
        }

        await this.sendJsonRpcRequest('sendUnpinMessage', params);
    }

    /**
     * Delete a message for all group members (admin-only operation).
     *
     * Requires signal-cli v0.14.0+ and group admin privileges.
     *
     * @param options - Options describing the message to delete and the target group
     *
     * @example
     * ```typescript
     * await signal.sendAdminDelete({
     *   groupId: 'base64groupId==',
     *   targetAuthor: '+33123456789',
     *   targetTimestamp: 1700000000000,
     * });
     * ```
     */
    async sendAdminDelete(options: AdminDeleteOptions): Promise<void> {
        const params: Record<string, unknown> = {
            account: this.account,
            groupId: options.groupId,
            targetAuthor: options.targetAuthor,
            targetTimestamp: options.targetTimestamp,
        };

        if (options.story) {
            params.story = true;
        }

        if (options.notifySelf) {
            params.notifySelf = true;
        }

        await this.sendJsonRpcRequest('sendAdminDelete', params);
    }

    // ############# v0.14.2 NEW METHODS - VOICE CALLING #############

    /**
     * Start a voice or video call with a recipient.
     *
     * Requires signal-cli v0.14.2+.
     *
     * @param options - Options for the call including recipient and video flag
     * @returns Call information including the call ID
     *
     * @example
     * ```typescript
     * // Start a voice call
     * const call = await signal.startCall({
     *   recipient: '+33123456789',
     * });
     *
     * // Start a video call
     * const videoCall = await signal.startCall({
     *   recipient: '+33123456789',
     *   video: true,
     * });
     * ```
     */
    async startCall(options: StartCallOptions): Promise<CallInfo> {
        const params: Record<string, unknown> = {
            account: this.account,
            recipient: options.recipient,
        };

        if (options.video) {
            params.video = true;
        }

        const result = (await this.sendJsonRpcRequest('startCall', params)) as { callId: string; state?: 'ringing' | 'connecting' | 'connected' | 'ended' | 'declined' | 'missed' };
        return {
            callId: result.callId,
            recipient: options.recipient,
            direction: 'outgoing',
            type: options.video ? 'video' : 'voice',
            state: result.state || 'ringing',
            timestamp: Date.now(),
            isActive: true,
        };
    }

    /**
     * Accept an incoming call.
     *
     * Requires signal-cli v0.14.2+.
     *
     * @param options - Options including the call ID to accept
     *
     * @example
     * ```typescript
     * // Listen for incoming calls and accept them
     * signal.on('call', async (callEvent) => {
     *   if (callEvent.call.direction === 'incoming') {
     *     await signal.acceptCall({ callId: callEvent.call.callId });
     *   }
     * });
     * ```
     */
    async acceptCall(options: AcceptCallOptions): Promise<void> {
        await this.sendJsonRpcRequest('acceptCall', {
            account: this.account,
            callId: options.callId,
        });
    }

    /**
     * Hang up an active call.
     *
     * Requires signal-cli v0.14.2+.
     *
     * @param options - Options including the call ID to hang up
     *
     * @example
     * ```typescript
     * // Hang up a call
     * await signal.hangUpCall({ callId: 'call-123-456' });
     * ```
     */
    async hangUpCall(options: HangUpCallOptions): Promise<void> {
        await this.sendJsonRpcRequest('hangUpCall', {
            account: this.account,
            callId: options.callId,
        });
    }

    /**
     * Send ICE relay candidates for establishing a call connection.
     *
     * Requires signal-cli v0.14.2+.
     * This is used internally for WebRTC call establishment.
     *
     * @param options - Options including call ID and ICE candidates
     *
     * @example
     * ```typescript
     * await signal.sendCallRelayCandidates({
     *   callId: 'call-123-456',
     *   candidates: [
     *     {
     *       candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 5000 typ host',
     *       sdpMLineIndex: 0,
     *       sdpMid: 'audio',
     *     },
     *   ],
     * });
     * ```
     */
    async sendCallRelayCandidates(options: SendCallRelayCandidatesOptions): Promise<void> {
        await this.sendJsonRpcRequest('sendCallRelayCandidates', {
            account: this.account,
            callId: options.callId,
            candidates: options.candidates,
        });
    }
}
