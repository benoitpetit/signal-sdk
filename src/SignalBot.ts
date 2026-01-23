import { EventEmitter } from 'events';
import { SignalCli } from './SignalCli';
import { BotConfig, BotCommand, ParsedMessage, BotStats, GroupInfo } from './interfaces';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

type BotAction =
    | { type: 'sendMessage'; recipient: string; message: string }
    | { type: 'sendMessageWithAttachment'; recipient: string; message: string; attachments: string[]; cleanup?: string[] }
    | { type: 'sendReaction'; recipient: string; targetAuthor: string; targetTimestamp: number; emoji: string };

export class SignalBot extends EventEmitter {
    private signalCli: SignalCli;
    private config: {
        phoneNumber: string;
        admins: string[];
        group?: {
            name: string;
            description: string;
            createIfNotExists: boolean;
            initialMembers: string[];
            avatar?: string;
        };
        settings: {
            commandPrefix: string;
            autoReact: boolean;
            logMessages: boolean;
            welcomeNewMembers: boolean;
            cooldownSeconds: number;
            maxMessageLength: number;
        };
    };
    private commands: Map<string, BotCommand> = new Map();
    private isRunning = false;
    private botGroupId: string | null = null;
    private stats: BotStats;
    private userCooldowns = new Map<string, number>();
    private actionQueue: BotAction[] = [];
    private isProcessingQueue = false;
    private incomingMessageBuffer: any[] = [];
    private activeTimers: NodeJS.Timeout[] = [];

    constructor(config: BotConfig, signalCliPath?: string) {
        super();

        this.config = {
            phoneNumber: config.phoneNumber,
            admins: config.admins || [],
            settings: {
                commandPrefix: config.settings?.commandPrefix || '/',
                autoReact: config.settings?.autoReact ?? false,
                logMessages: config.settings?.logMessages ?? true,
                welcomeNewMembers: config.settings?.welcomeNewMembers ?? true,
                cooldownSeconds: config.settings?.cooldownSeconds || 2,
                maxMessageLength: config.settings?.maxMessageLength || 1000,
            },
        };

        if (config.group) {
            this.config.group = {
                name: config.group.name,
                description: config.group.description || '- Group managed by Signal Bot',
                createIfNotExists: config.group.createIfNotExists ?? true,
                initialMembers: config.group.initialMembers || [],
                avatar: config.group.avatar, // Add the missing avatar property
            };
        }

        this.signalCli = new SignalCli(signalCliPath, this.config.phoneNumber);

        this.stats = {
            messagesReceived: 0,
            commandsExecuted: 0,
            startTime: Date.now(),
            lastActivity: Date.now(),
            activeUsers: 0
        };

        this.setupDefaultCommands();
    }

    /**
     * Downloads an image from URL to a temporary file
     * @param imageUrl URL of the image to download
     * @returns Path to the temporary file
     */
    private async downloadImage(imageUrl: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const tempFileName = `bot_avatar_${Date.now()}.jpg`;
            const tempFilePath = path.join(process.cwd(), tempFileName);
            const file = fs.createWriteStream(tempFilePath);

            const client = imageUrl.startsWith('https:') ? https : http;
            
            client.get(imageUrl, (response) => {
                if (response.statusCode !== 200) {
                    fs.unlink(tempFilePath, () => {}); // Clean up on error
                    reject(new Error(`Failed to download image: ${response.statusCode}`));
                    return;
                }

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    resolve(tempFilePath);
                });

                file.on('error', (err) => {
                    fs.unlink(tempFilePath, () => {}); // Clean up on error
                    reject(err);
                });
            }).on('error', (err) => {
                fs.unlink(tempFilePath, () => {}); // Clean up on error
                reject(err);
            });
        });
    }

    /**
     * Downloads an image from URL for commands (like NASA images)
     * @param imageUrl URL of the image to download
     * @param prefix Optional prefix for the temp file name
     * @returns Path to the temporary file
     */
    async downloadImageFromUrl(imageUrl: string, prefix: string = 'bot_image'): Promise<string> {
        return new Promise((resolve, reject) => {
            const downloadWithRedirect = (url: string, maxRedirects: number = 5): void => {
                const client = url.startsWith('https:') ? https : http;
                
                client.get(url, (response) => {
                    // Handle redirections (3xx status codes)
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

                        // Resolve relative URLs
                        const finalUrl = redirectUrl.startsWith('http') ? redirectUrl : new URL(redirectUrl, url).href;
                        this.log(`🔄 Following redirect to: ${finalUrl}`, 'DEBUG');
                        
                        downloadWithRedirect(finalUrl, maxRedirects - 1);
                        return;
                    }

                    // Handle non-success status codes
                    if (response.statusCode !== 200) {
                        reject(new Error(`Failed to download image: ${response.statusCode}`));
                        return;
                    }

                    // Success - create file and pipe response
                    const urlObj = new URL(url);
                    const extension = path.extname(urlObj.pathname) || '.jpg';
                    const tempFileName = `${prefix}_${Date.now()}${extension}`;
                    const tempFilePath = path.join(process.cwd(), tempFileName);
                    const file = fs.createWriteStream(tempFilePath);

                    response.pipe(file);

                    file.on('finish', () => {
                        file.close();
                        resolve(tempFilePath);
                    });

                    file.on('error', (err) => {
                        fs.unlink(tempFilePath, () => {}); // Clean up on error
                        reject(err);
                    });
                }).on('error', (err) => {
                    reject(err);
                });
            };

            // Start the download with redirect handling
            downloadWithRedirect(imageUrl);
        });
    }

    /**
     * Sends a message with downloaded image attachment
     * @param recipient Recipient to send to
     * @param message Text message to send
     * @param imageUrl URL of the image to download and send
     * @param prefix Optional prefix for the temp file name
     */
    async sendMessageWithImage(recipient: string, message: string, imageUrl: string, prefix: string = 'bot_image'): Promise<void> {
        let tempFilePath: string | null = null;
        
        try {
            this.log(`- Downloading image from ${imageUrl}...`, 'DEBUG');
            tempFilePath = await this.downloadImageFromUrl(imageUrl, prefix);
            this.log(`- Image downloaded to: ${tempFilePath}`, 'DEBUG');
            
            // Add to the action queue with cleanup info
            this.actionQueue.push({ 
                type: 'sendMessageWithAttachment', 
                recipient, 
                message, 
                attachments: [tempFilePath],
                cleanup: [tempFilePath] // Mark files for cleanup after sending
            });
            this.processActionQueue();
        } catch (error: any) {
            this.log(`ERROR: Failed to download and send image: ${error?.message}`, 'ERROR');
            // Clean up on download error
            if (tempFilePath) {
                this.cleanupTempFile(tempFilePath);
            }
            // Fallback to text message with URL
            await this.sendMessage(recipient, `${message}\n\n- Image: ${imageUrl}`);
        }
    }

    /**
     * Cleans up a temporary file
     * @param filePath Path to the file to delete
     */
    private cleanupTempFile(filePath: string): void {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                this.log(`- Cleaned up temporary file: ${filePath}`, 'DEBUG');
            }
        } catch (error: any) {
            this.log(`WARNING: Could not cleanup temp file ${filePath}: ${error?.message}`, 'DEBUG');
        }
    }

    /**
     * Processes group avatar configuration
     * @param avatar Avatar configuration (URL, file path, or base64)
     * @returns Path to the avatar file or null if no avatar
     */
    private async processGroupAvatar(avatar: string): Promise<string | null> {
        if (!avatar) {
            return null;
        }

        // Check if it's a URL
        if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
            try {
                this.log(`- Downloading group avatar from URL...`, 'INFO');
                const tempPath = await this.downloadImage(avatar);
                this.log(`- Avatar downloaded to: ${tempPath}`, 'DEBUG');
                return tempPath;
            } catch (error: any) {
                this.log(`ERROR: Failed to download avatar: ${error?.message}`, 'ERROR');
                return null;
            }
        }

        // Check if it's a file path
        if (fs.existsSync(avatar)) {
            this.log(`- Using local avatar file: ${avatar}`, 'INFO');
            return avatar;
        }

        // If it's base64 or other format, save it as a temporary file
        if (avatar.startsWith('data:image/')) {
            try {
                const base64Data = avatar.split(',')[1];
                const tempFileName = `bot_avatar_${Date.now()}.jpg`;
                const tempFilePath = path.join(process.cwd(), tempFileName);
                
                fs.writeFileSync(tempFilePath, base64Data, 'base64');
                this.log(`- Saved base64 avatar to: ${tempFilePath}`, 'DEBUG');
                return tempFilePath;
            } catch (error: any) {
                this.log(`ERROR: Failed to process base64 avatar: ${error?.message}`, 'ERROR');
                return null;
            }
        }

        this.log(`WARNING: Unsupported avatar format: ${avatar.substring(0, 50)}...`, 'WARN');
        return null;
    }

    /**
     * Adds a custom command to the bot
     */
    addCommand(command: BotCommand): void {
        this.commands.set(command.name.toLowerCase(), command);
    }

    /**
     * Removes a command from the bot
     */
    removeCommand(name: string): boolean {
        return this.commands.delete(name.toLowerCase());
    }

    /**
     * Gets all available commands
     */
    getCommands(): BotCommand[] {
        return Array.from(this.commands.values());
    }

    /**
     * Starts the bot
     */
    async start(): Promise<void> {
        try {
            this.log('- Starting Signal Bot...', 'INFO');

            await this.signalCli.connect();
            this.log('- Connected to signal-cli in JSON-RPC mode');

            // Check that the bot is linked
            const devices = await this.signalCli.listDevices();
            if (devices.length === 0) {
                throw new Error('No device found. Please link the bot first.');
            }
            this.log(`- Bot linked with ${devices.length} device(s)`);

            // Set up or find the bot group
            if (this.config.group && this.config.group.createIfNotExists) {
                await this.setupBotGroup();
            }

            // Set up event handlers
            this.setupEventHandlers();

            this.isRunning = true;
            this.log('- Signal Bot started successfully!');
            this.emit('ready');

            // Send welcome message to admins
            await this.sendWelcomeMessage();

        } catch (error: any) {
            this.log(`ERROR: Error during startup: ${error?.message || error}`, 'ERROR');
            throw error;
        }
    }

    /**
     * Stops the bot
     */
    async stop(): Promise<void> {
        this.log('- Stopping Signal Bot...');
        this.isRunning = false;
        
        // Clear all active timers
        this.activeTimers.forEach(timer => clearTimeout(timer));
        this.activeTimers = [];
        
        this.signalCli.disconnect();
        this.emit('stopped');
        this.log('- Bot stopped');
    }

    async gracefulShutdown(): Promise<void> {
        this.log('- Gracefully shutting down Signal Bot...');
        this.isRunning = false;
        
        // Clear all active timers
        this.activeTimers.forEach(timer => clearTimeout(timer));
        this.activeTimers = [];
        
        try {
            await this.signalCli.gracefulShutdown();
            this.log('- Signal Bot shutdown completed gracefully');
        } catch (error: any) {
            this.log(`ERROR: Error during graceful shutdown: ${error?.message || error}`, 'ERROR');
        }
        
        this.emit('stopped');
    }

    /**
     * Sends a message
     */
    async sendMessage(recipient: string, message: string): Promise<void> {
        if (message.length > (this.config.settings.maxMessageLength || 1000)) {
            message = message.substring(0, (this.config.settings.maxMessageLength || 1000) - 3) + '...';
        }

        // Add to the action queue
        this.actionQueue.push({ type: 'sendMessage', recipient, message });
        this.processActionQueue();
    }

    /**
     * Sends a reaction to a message
     */
    async sendReaction(recipient: string, targetAuthor: string, targetTimestamp: number, emoji: string): Promise<void> {
        // Add to the action queue
        this.actionQueue.push({ type: 'sendReaction', recipient, targetAuthor, targetTimestamp, emoji });
        this.processActionQueue();
    }

    /**
     * Sends a message with file attachments
     */
    async sendMessageWithAttachment(recipient: string, message: string, attachments: string[], cleanup?: string[]): Promise<void> {
        if (message.length > (this.config.settings.maxMessageLength || 1000)) {
            message = message.substring(0, (this.config.settings.maxMessageLength || 1000) - 3) + '...';
        }

        // Add to the action queue
        this.actionQueue.push({ type: 'sendMessageWithAttachment', recipient, message, attachments, cleanup });
        this.processActionQueue();
    }

    /**
     * Gets bot statistics
     */
    getStats(): BotStats {
        return {
            ...this.stats,
            activeUsers: this.userCooldowns.size
        };
    }

    /**
     * Checks if a user is an admin
     */
    isAdmin(phoneNumber: string): boolean {
        return this.config.admins.includes(phoneNumber);
    }

    /**
     * Gets the bot group ID
     */
    getBotGroupId(): string | null {
        return this.botGroupId;
    }

    /**
     * Gets the underlying SignalCli instance for advanced operations
     */
    getSignalCli(): SignalCli {
        return this.signalCli;
    }

    private setupDefaultCommands(): void {
        // Help command
        this.addCommand({
            name: 'help',
            description: 'Displays available commands',
            handler: async (message, args) => {
                const userCommands = Array.from(this.commands.values())
                    .filter(cmd => !cmd.adminOnly || message.isFromAdmin)
                    .map(cmd => `${this.config.settings.commandPrefix}${cmd.name} - ${cmd.description}`)
                    .join('\n');

                return `Signal Bot Commands\n\n${userCommands}\n\n${message.isFromAdmin ? '| You have admin privileges' : ''
                    }`;
            }
        });

        // Stats command
        this.addCommand({
            name: 'stats',
            description: 'Displays bot statistics',
            handler: async () => {
                const stats = this.getStats();
                const uptime = this.formatUptime(Date.now() - stats.startTime);

                return `Bot Statistics\n\n` +
                    `1. Messages Received: ${stats.messagesReceived}\n` +
                    `2. Commands Executed: ${stats.commandsExecuted}\n` +
                    `3. Uptime: ${uptime}\n` +
                    `4. Active Users: ${stats.activeUsers}`;
            }
        });

        // Ping command
        this.addCommand({
            name: 'ping',
            description: 'Tests bot responsiveness',
            handler: async (message) => {
                const responseTime = Date.now() - message.timestamp;
                return `Pong! Response time: ${responseTime}ms`;
            }
        });

        // Info command (admin only)
        this.addCommand({
            name: 'info',
            description: 'Detailed bot information (admin)',
            adminOnly: true,
            handler: async () => {
                return `Bot Information\n\n` +
                    `- Number: ${this.config.phoneNumber}\n` +
                    `- Group: ${this.config.group ? this.config.group.name : 'N/A'}\n` +
                    `- Admins: ${this.config.admins.length}\n` +
                    `- Commands: ${this.commands.size}\n` +
                    `- Prefix: ${this.config.settings.commandPrefix}`;
            }
        });
    }

    private async setupBotGroup(): Promise<void> {
        if (!this.config.group) {
            return;
        }
        
        let avatarPath: string | null = null;
        let isTemporaryAvatar = false;
        
        try {
            // Process avatar if configured
            if (this.config.group.avatar) {
                avatarPath = await this.processGroupAvatar(this.config.group.avatar);
                isTemporaryAvatar = avatarPath !== this.config.group.avatar; // It's temporary if it was processed
            }

            // Search for an existing group
            const groups = await this.signalCli.listGroups();
            
            const existingGroup = groups.find(group =>
                group.name === this.config.group!.name && group.isMember
            );

            if (existingGroup) {
                // Try different possible field names for the group ID
                const groupData = existingGroup as any;
                const possibleGroupId = existingGroup.groupId || groupData.id || groupData.Id;
                this.botGroupId = possibleGroupId;
                this.log(`- Existing group found: ${this.config.group.name} (${possibleGroupId})`);
                
                // Check if all admins are in the group and add them if not
                const currentMembers = existingGroup.members?.map((m: any) => m.number || m) || [];
                const missingAdmins = this.config.admins.filter(admin => !currentMembers.includes(admin));
                
                // Prepare update options
                const updateOptions: any = {};
                if (missingAdmins.length > 0) {
                    updateOptions.addMembers = missingAdmins;
                }
                if (avatarPath) {
                    updateOptions.avatar = avatarPath;
                }

                // Always apply avatar if configured, even for existing groups
                if (Object.keys(updateOptions).length > 0 && this.botGroupId) {
                    try {
                        if (missingAdmins.length > 0) {
                            this.log(`- Adding missing admins to group: ${missingAdmins.join(', ')}`, 'INFO');
                        }
                        if (avatarPath) {
                            this.log(`- Setting group avatar...`, 'INFO');
                        }

                        await this.signalCli.updateGroup(this.botGroupId, updateOptions);
                        
                        if (missingAdmins.length > 0) {
                            this.log(`- Successfully added admins to the group`, 'INFO');
                        }
                        if (avatarPath) {
                            this.log(`- Group avatar set successfully`, 'INFO');
                        }
                        
                        // Send welcome message to the group only if admins were added
                        if (missingAdmins.length > 0) {
                            await this.sendMessage(this.botGroupId,
                                `Welcome to ${this.config.group.name}!\n\n` +
                                `This group is managed by Signal Bot.\n` +
                                `Type ${this.config.settings.commandPrefix}help to see available commands.`
                            );
                        }
                    } catch (updateError: any) {
                        this.log(`ERROR: Error updating group: ${updateError?.message || updateError}`, 'ERROR');
                    }
                } else {
                    this.log(`- All admins are already in the group`, 'INFO');
                    if (!avatarPath) {
                        this.log(`INFO: No avatar configured for group`, 'INFO');
                    }
                }
                
                return;
            }

            // Create a new group only if none exists
            this.log(`- Creating group: ${this.config.group.name}`);

            const initialMembers = [
                ...this.config.admins,
                ...(this.config.group.initialMembers || [])
            ].filter((member, index, array) => array.indexOf(member) === index);

            try {
                const newGroup = await this.signalCli.createGroup(
                    this.config.group.name,
                    initialMembers
                );
                const newGroupData = newGroup as any;
                this.botGroupId = newGroup.groupId || newGroupData.id || newGroupData.Id;

                if (this.botGroupId) {
                    this.log(`- Group created: ${this.config.group.name} (${this.botGroupId})`);

                    // Configure the group with description, permissions, and avatar
                    const configOptions: any = {
                        description: this.config.group.description,
                        permissionAddMember: 'ONLY_ADMINS',
                        permissionEditDetails: 'ONLY_ADMINS'
                    };

                    if (avatarPath) {
                        configOptions.avatar = avatarPath;
                        this.log(`- Setting avatar for new group...`, 'INFO');
                    }

                    await this.signalCli.updateGroup(this.botGroupId, configOptions);

                    if (avatarPath) {
                        this.log(`- Group avatar set successfully`, 'INFO');
                    }

                    // Send a welcome message to the group
                    await this.sendMessage(this.botGroupId,
                        `Welcome to ${this.config.group.name}!\n\n` +
                        `This group is managed by Signal Bot.\n` +
                        `Type ${this.config.settings.commandPrefix}help to see available commands.`
                    );
                }
            } catch (createError: any) {
                if (createError.message && createError.message.includes('Method not implemented')) {
                    // signal-cli doesn't support group creation via JSON-RPC
                    this.log(`ERROR: Group creation not supported by signal-cli version.`, 'ERROR');
                    this.log(`INSTRUCTIONS: To fix this issue:`, 'INFO');
                    this.log(`   1. Create a group named "${this.config.group.name}" manually in Signal`, 'INFO');
                    this.log(`   2. Add the bot number (${this.config.phoneNumber}) to the group`, 'INFO');
                    this.log(`   3. Add all admins to the group: ${this.config.admins.join(', ')}`, 'INFO');
                    this.log(`   4. Restart the bot`, 'INFO');
                    this.log(`   Available groups: ${groups.map(g => g.name).join(', ')}`, 'INFO');
                    
                    // Don't use a fallback group - this is misleading behavior
                    throw new Error(`Group "${this.config.group.name}" does not exist and cannot be created automatically. Please create it manually as described above.`);
                } else {
                    // Re-throw the original error for other types of failures
                    this.log(`ERROR: Failed to create group: ${createError?.message || createError}`, 'ERROR');
                    throw createError;
                }
            }
        } catch (error: any) {
            this.log(`ERROR: Error configuring group: ${error?.message || error}`, 'ERROR');
        } finally {
            // Clean up temporary avatar file if it was downloaded/created
            if (avatarPath && isTemporaryAvatar) {
                this.cleanupTempFile(avatarPath);
            }
        }
    }

    private setupEventHandlers(): void {
        this.signalCli.on('message', (messageData) => {
            if (this.isProcessingQueue) {
                this.log('Queue is processing, buffering incoming message...', 'DEBUG');
                this.incomingMessageBuffer.push(messageData);
            } else {
                this.handleMessage(messageData);
            }
        });

        this.signalCli.on('close', (code) => {
            // Only log as warning if exit code indicates an error
            if (code === 0) {
                this.log(`Signal daemon closed gracefully`, 'INFO');
            } else {
                this.log(`Signal daemon closed with error code ${code}`, 'ERROR');
            }
            this.emit('daemon-closed', code);
        });

        this.signalCli.on('error', (error) => {
            this.log(`Daemon error: ${error.message}`, 'ERROR');
            this.emit('error', error);
        });

        this.signalCli.on('log', (logData) => {
            // Handle non-error stderr messages from signal-cli
            this.log(`[signal-cli ${logData.level.toUpperCase()}] ${logData.message}`, 'DEBUG');
        });
    }

    private async handleMessage(messageData: any): Promise<void> {
        try {
            if (!messageData.envelope?.dataMessage) {
                return; // Ignore non-data messages (receipts, typing indicators, etc.)
            }

            const parsedMessage: ParsedMessage = {
                id: messageData.envelope.timestamp.toString(),
                source: messageData.envelope.sourceNumber || messageData.envelope.source,
                text: messageData.envelope.dataMessage.message || '',
                timestamp: messageData.envelope.timestamp,
                groupInfo: messageData.envelope.dataMessage.groupInfo,
                isFromAdmin: this.isAdmin(messageData.envelope.sourceNumber || messageData.envelope.source)
            };

            // Ignore own messages
            if (parsedMessage.source === this.config.phoneNumber) {
                return;
            }

            // Ignore empty messages (like reactions only, media without text, etc.)
            if (!parsedMessage.text && !messageData.envelope.dataMessage.attachments) {
                return;
            }

            // If bot is configured for group mode, ignore private messages
            if (this.botGroupId && !parsedMessage.groupInfo) {
                // Only log if there's actual text content to avoid spam
                if (parsedMessage.text.trim()) {
                    this.log(`IGNORE: Ignoring private message from ${parsedMessage.source} (bot is in group mode)`, 'DEBUG');
                }
                return;
            }

            // Check if the group is authorized
            if (parsedMessage.groupInfo && this.botGroupId) {
                const groupId = parsedMessage.groupInfo.id || parsedMessage.groupInfo.groupId;
                if (groupId !== this.botGroupId) {
                    return; // Ignore messages from other groups
                }
            }

            // Update statistics
            this.stats.messagesReceived++;
            this.stats.lastActivity = Date.now();

            this.log(`Message from ${parsedMessage.source}: ${parsedMessage.text.substring(0, 50)}...`);

            // Emit message event
            this.emit('message', parsedMessage);

            // Send read receipt automatically
            try {
                await this.signalCli.sendReceipt(parsedMessage.source, parsedMessage.timestamp, 'read');
            } catch (error: any) {
                this.log(`ERROR: Error sending read receipt: ${error?.message || error}`, 'DEBUG');
            }

            

            // Handle commands
            if (parsedMessage.text.startsWith(this.config.settings.commandPrefix || '/')) {
                await this.handleCommand(parsedMessage);
            }

        } catch (error: any) {
            this.log(`ERROR: Error processing message: ${error?.message || error}`, 'ERROR');
        }
    }

    private async handleCommand(message: ParsedMessage): Promise<void> {
        const commandPrefix = this.config.settings.commandPrefix || '/';
        const commandText = message.text.substring(commandPrefix.length);
        const [commandName, ...args] = commandText.split(' ');

        const command = this.commands.get(commandName.toLowerCase());

        if (!command) {
            return; // Unknown command, ignore
        }

        // Check admin permissions
        if (command.adminOnly && !message.isFromAdmin) {
            await this.sendCommandResponse(message, 'ERROR: This command requires admin privileges');
            return;

        }

        if (this.isOnCooldown(message.source)) {
            this.log(`COOLDOWN: Cooldown active for ${message.source} on command "${commandName}"`);
            return;

        }

        this.stats.commandsExecuted++;
        this.emit('command', { command: commandName, user: message.source, args });
        this.userCooldowns.set(message.source, Date.now());

        this.log(`- Executing command: "${command.name}" by ${message.source}`);

        try {
            const response = await command.handler(message, args, this);
            if (response) {
                await this.sendCommandResponse(message, response);
            }

        } catch (error: any) {
            this.log(`ERROR: Error executing command "${command.name}": ${error?.message || error}`, 'ERROR');
            await this.sendCommandResponse(message, `ERROR: An error occurred while running the command: ${command.name}`);
        }
    }

    private async sendCommandResponse(message: ParsedMessage, response: string): Promise<void> {
        const recipient = message.groupInfo ?
            (message.groupInfo.id || message.groupInfo.groupId || message.source) : message.source;
        await this.sendMessage(recipient, response);
    }

    

    private isOnCooldown(userId: string): boolean {
        const lastCommand = this.userCooldowns.get(userId);
        if (!lastCommand) return false;

        const now = Date.now();
        const cooldownMs = (this.config.settings.cooldownSeconds || 2) * 1000;
        return (now - lastCommand) < cooldownMs;
    }

    private async processActionQueue(): Promise<void> {
        if (this.isProcessingQueue || this.actionQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;
        this.log(`Processing action queue with ${this.actionQueue.length} action(s)...`, 'DEBUG');

        try {
            while (this.actionQueue.length > 0) {
                const action = this.actionQueue.shift()!;

                try {
                    switch (action.type) {
                        case 'sendMessage':
                            this.log(`Executing sendMessage to ${action.recipient}...`, 'DEBUG');
                            await this.signalCli.sendMessage(action.recipient, action.message);
                            break;
                        case 'sendMessageWithAttachment':
                            this.log(`Executing sendMessageWithAttachment to ${action.recipient} with ${action.attachments.length} file(s)...`, 'DEBUG');
                            await this.signalCli.sendMessage(action.recipient, action.message, { 
                                attachments: action.attachments 
                            });
                            // Wait a bit for signal-cli to finish processing the files before cleanup
                            // signal-cli responds immediately but continues processing files in background
                            if (action.cleanup && action.cleanup.length > 0) {
                                const cleanupTimer = setTimeout(() => {
                                    action.cleanup!.forEach(filePath => {
                                        this.cleanupTempFile(filePath);
                                    });
                                    // Remove timer from active list
                                    const index = this.activeTimers.indexOf(cleanupTimer);
                                    if (index > -1) this.activeTimers.splice(index, 1);
                                }, 2000); // Wait 2 seconds for signal-cli to upload files
                                if (cleanupTimer.unref) cleanupTimer.unref();
                                this.activeTimers.push(cleanupTimer);
                            }
                            break;
                        case 'sendReaction':
                            this.log(`Executing sendReaction to ${action.recipient}...`, 'DEBUG');
                            await this.signalCli.sendReaction(
                                action.recipient,
                                action.targetAuthor,
                                action.targetTimestamp,
                                action.emoji
                            );

                            break;
                    }

                    // Wait a bit between actions to be safe
                    await new Promise(resolve => {
                        const timer = setTimeout(resolve, 250);
                        if (timer.unref) timer.unref();
                    });
                } catch (error: any) {
                    this.log(`ERROR: Failed to execute action ${action.type}: ${error?.message || error}`, 'ERROR');
                    
                    // Clean up temporary files even on error
                    if (action.type === 'sendMessageWithAttachment' && action.cleanup && action.cleanup.length > 0) {
                        action.cleanup.forEach(filePath => {
                            this.cleanupTempFile(filePath);
                        });
                    }
                }

            }

        } finally {
            this.isProcessingQueue = false;
            this.log('Action queue processed.', 'DEBUG');

            // Process any buffered messages
            while (this.incomingMessageBuffer.length > 0) {
                this.log('Processing buffered message...', 'DEBUG');
                const bufferedMessage = this.incomingMessageBuffer.shift();
                this.handleMessage(bufferedMessage);
            }

        }
    }

    private async sendWelcomeMessage(): Promise<void> {
        const welcomeText = `Signal Bot Started!

` +
            `Bot is now active
` +
            `Number: ${this.config.phoneNumber}
` +
            `Group: ${this.config.group ? this.config.group.name : 'None'}
` +
            `Use ${this.config.settings.commandPrefix}help to see commands

` +
            `Happy chatting!`

        for (const admin of this.config.admins) {
            try {
                await this.sendMessage(admin, welcomeText);
            } catch (error: any) {
                this.log(`ERROR: Error sending welcome message to ${admin}: ${error?.message || error}`, 'ERROR');
            }

        }
    }

    private formatUptime(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    private log(message: string, level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' = 'INFO'): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;

        console.log(logMessage);

        if (this.config.settings.logMessages) {
            // In production, you might want to write to a file
            // fs.appendFileSync('bot.log', logMessage + '\n');
        }
    }
}