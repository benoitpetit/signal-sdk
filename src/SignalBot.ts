import { EventEmitter } from 'events';
import { SignalCli } from './SignalCli';
import { BotConfig, BotCommand, GroupUpdateEvent, ParsedMessage, BotStats } from './interfaces';
import { MediaManager } from './bot/MediaManager';

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

type BotAction =
    | { type: 'sendMessage'; recipient: string; message: string }
    | {
          type: 'sendMessageWithAttachment';
          recipient: string;
          message: string;
          attachments: string[];
          cleanup?: string[];
      }
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
    private queueProcessingPromise: Promise<void> | null = null;
    private activeTimers: NodeJS.Timeout[] = [];
    private eventHandlersAttached = false;

    private readonly signalMessageHandler = (messageData: Record<string, unknown>): void => {
        void this.handleMessage(messageData);
    };

    private readonly signalCloseHandler = (code: number | null): void => {
        if (code === 0) {
            this.log('Signal daemon closed gracefully', 'INFO');
        } else {
            this.log(`Signal daemon closed with error code ${code}`, 'ERROR');
        }
        this.emit('daemon-closed', code);
    };

    private readonly signalErrorHandler = (error: Error): void => {
        this.log(`Daemon error: ${error.message}`, 'ERROR');
        this.emit('error', error);
    };

    private readonly signalLogHandler = (logData: { level: string; message: string }): void => {
        this.log(`[signal-cli ${logData.level.toUpperCase()}] ${logData.message}`, 'DEBUG');
    };

    private readonly signalGroupUpdateHandler = (groupUpdate: GroupUpdateEvent): void => {
        this.emit('groupUpdate', groupUpdate);
    };

    private readonly media = new MediaManager((message, level = 'INFO') => this.log(message, level));

    constructor(config: BotConfig, signalCliPath?: string) {
        super();

        this.config = {
            phoneNumber: config.phoneNumber,
            admins: config.admins || [],
            settings: {
                commandPrefix: config.settings?.commandPrefix || '/',
                autoReact: config.settings?.autoReact ?? false,
                logMessages: config.settings?.logMessages ?? true,
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
            activeUsers: 0,
        };

        this.setupDefaultCommands();
    }

    /**
     * Downloads an image from URL for commands (like NASA images)
     * @param imageUrl URL of the image to download
     * @param prefix Optional prefix for the temp file name
     * @returns Path to the temporary file
     */
    async downloadImageFromUrl(imageUrl: string, prefix: string = 'bot_image'): Promise<string> {
        return this.media.downloadImageFromUrl(imageUrl, prefix);
    }

    /**
     * Sends a message with downloaded image attachment
     * @param recipient Recipient to send to
     * @param message Text message to send
     * @param imageUrl URL of the image to download and send
     * @param prefix Optional prefix for the temp file name
     */
    async sendMessageWithImage(
        recipient: string,
        message: string,
        imageUrl: string,
        prefix: string = 'bot_image',
    ): Promise<void> {
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
                cleanup: [tempFilePath], // Mark files for cleanup after sending
            });
            await this.processActionQueue();
        } catch (error: unknown) {
            this.log(`ERROR: Failed to download and send image: ${getErrorMessage(error)}`, 'ERROR');
            // Clean up on download error
            if (tempFilePath) await this.media.cleanupTempFile(tempFilePath);
            // Fallback to text message with URL
            await this.sendMessage(recipient, `${message}\n\n- Image: ${imageUrl}`);
        }
    }

    private async processGroupAvatar(avatar: string): Promise<string | null> {
        return this.media.processAvatar(avatar);
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
        if (this.isRunning) {
            return;
        }

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
        } catch (error: unknown) {
            this.log(`ERROR: Error during startup: ${getErrorMessage(error) || error}`, 'ERROR');
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
        this.activeTimers.forEach((timer) => clearTimeout(timer));
        this.activeTimers = [];

        // Clean up any leftover temporary files
        await this.media.cleanupAll();

        this.detachEventHandlers();
        this.signalCli.disconnect();
        this.emit('stopped');
        this.log('- Bot stopped');
    }

    async gracefulShutdown(): Promise<void> {
        this.log('- Gracefully shutting down Signal Bot...');
        this.isRunning = false;

        // Clear all active timers
        this.activeTimers.forEach((timer) => clearTimeout(timer));
        this.activeTimers = [];

        // Clean up any leftover temporary files
        await this.media.cleanupAll();

        try {
            this.detachEventHandlers();
            await this.signalCli.gracefulShutdown();
            this.log('- Signal Bot shutdown completed gracefully');
        } catch (error: unknown) {
            this.log(`ERROR: Error during graceful shutdown: ${getErrorMessage(error) || error}`, 'ERROR');
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
        await this.processActionQueue();
    }

    /**
     * Sends a reaction to a message
     */
    async sendReaction(recipient: string, targetAuthor: string, targetTimestamp: number, emoji: string): Promise<void> {
        // Add to the action queue
        this.actionQueue.push({ type: 'sendReaction', recipient, targetAuthor, targetTimestamp, emoji });
        await this.processActionQueue();
    }

    /**
     * Sends a message with file attachments
     */
    async sendMessageWithAttachment(
        recipient: string,
        message: string,
        attachments: string[],
        cleanup?: string[],
    ): Promise<void> {
        if (message.length > (this.config.settings.maxMessageLength || 1000)) {
            message = message.substring(0, (this.config.settings.maxMessageLength || 1000) - 3) + '...';
        }

        // Add to the action queue
        this.actionQueue.push({ type: 'sendMessageWithAttachment', recipient, message, attachments, cleanup });
        await this.processActionQueue();
    }

    /**
     * Gets bot statistics
     */
    getStats(): BotStats {
        return {
            ...this.stats,
            activeUsers: this.userCooldowns.size,
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
            handler: async (message, _args) => {
                const userCommands = Array.from(this.commands.values())
                    .filter((cmd) => !cmd.adminOnly || message.isFromAdmin)
                    .map((cmd) => `${this.config.settings.commandPrefix}${cmd.name} - ${cmd.description}`)
                    .join('\n');

                return `Signal Bot Commands\n\n${userCommands}\n\n${
                    message.isFromAdmin ? '| You have admin privileges' : ''
                }`;
            },
        });

        // Stats command
        this.addCommand({
            name: 'stats',
            description: 'Displays bot statistics',
            handler: async () => {
                const stats = this.getStats();
                const uptime = this.formatUptime(Date.now() - stats.startTime);

                return (
                    `Bot Statistics\n\n` +
                    `1. Messages Received: ${stats.messagesReceived}\n` +
                    `2. Commands Executed: ${stats.commandsExecuted}\n` +
                    `3. Uptime: ${uptime}\n` +
                    `4. Active Users: ${stats.activeUsers}`
                );
            },
        });

        // Ping command
        this.addCommand({
            name: 'ping',
            description: 'Tests bot responsiveness',
            handler: async (message) => {
                const responseTime = Date.now() - message.timestamp;
                return `Pong! Response time: ${responseTime}ms`;
            },
        });

        // Info command (admin only)
        this.addCommand({
            name: 'info',
            description: 'Detailed bot information (admin)',
            adminOnly: true,
            handler: async () => {
                return (
                    `Bot Information\n\n` +
                    `- Number: ${this.config.phoneNumber}\n` +
                    `- Group: ${this.config.group ? this.config.group.name : 'N/A'}\n` +
                    `- Admins: ${this.config.admins.length}\n` +
                    `- Commands: ${this.commands.size}\n` +
                    `- Prefix: ${this.config.settings.commandPrefix}`
                );
            },
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

            const existingGroup = groups.find((group) => group.name === this.config.group!.name && group.isMember);

            if (existingGroup) {
                // Try different possible field names for the group ID
                const groupData = existingGroup as unknown as Record<string, unknown>;
                const possibleGroupId = existingGroup.groupId || (groupData.id as string | undefined) || (groupData.Id as string | undefined);
                this.botGroupId = possibleGroupId || null;
                this.log(`- Existing group found: ${this.config.group.name} (${possibleGroupId})`);

                // Check if all admins are in the group and add them if not
                const currentMembers = existingGroup.members?.map((m: unknown) => {
                    if (typeof m === 'string') return m;
                    if (m && typeof m === 'object' && 'number' in m) return (m as { number: string }).number;
                    return '';
                }) || [];
                const missingAdmins = this.config.admins.filter((admin) => !currentMembers.includes(admin));

                // Prepare update options
                const updateOptions: Record<string, unknown> = {};
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
                            await this.sendMessage(
                                this.botGroupId,
                                `Welcome to ${this.config.group.name}!\n\n` +
                                    `This group is managed by Signal Bot.\n` +
                                    `Type ${this.config.settings.commandPrefix}help to see available commands.`,
                            );
                        }
                    } catch (updateError: unknown) {
                        this.log(`ERROR: Error updating group: ${getErrorMessage(updateError)}`, 'ERROR');
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

            const initialMembers = [...this.config.admins, ...(this.config.group.initialMembers || [])].filter(
                (member, index, array) => array.indexOf(member) === index,
            );

            try {
                const newGroup = await this.signalCli.createGroup(this.config.group.name, initialMembers);
                const newGroupData = newGroup as unknown as Record<string, unknown>;
                this.botGroupId = newGroup.groupId || (newGroupData.id as string | undefined) || (newGroupData.Id as string | undefined) || null;

                if (this.botGroupId) {
                    this.log(`- Group created: ${this.config.group.name} (${this.botGroupId})`);

                    // Configure the group with description, permissions, and avatar
                    const configOptions: Record<string, unknown> = {
                        description: this.config.group.description,
                        permissionAddMember: 'ONLY_ADMINS',
                        permissionEditDetails: 'ONLY_ADMINS',
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
                    await this.sendMessage(
                        this.botGroupId,
                        `Welcome to ${this.config.group.name}!\n\n` +
                            `This group is managed by Signal Bot.\n` +
                            `Type ${this.config.settings.commandPrefix}help to see available commands.`,
                    );
                }
            } catch (createError: unknown) {
                if (getErrorMessage(createError).includes('Method not implemented')) {
                    // signal-cli doesn't support group creation via JSON-RPC
                    this.log(`ERROR: Group creation not supported by signal-cli version.`, 'ERROR');
                    this.log(`INSTRUCTIONS: To fix this issue:`, 'INFO');
                    this.log(`   1. Create a group named "${this.config.group.name}" manually in Signal`, 'INFO');
                    this.log(`   2. Add the bot number (${this.config.phoneNumber}) to the group`, 'INFO');
                    this.log(`   3. Add all admins to the group: ${this.config.admins.join(', ')}`, 'INFO');
                    this.log(`   4. Restart the bot`, 'INFO');
                    this.log(`   Available groups: ${groups.map((g) => g.name).join(', ')}`, 'INFO');

                    // Don't use a fallback group - this is misleading behavior
                    throw new Error(
                        `Group "${this.config.group.name}" does not exist and cannot be created automatically. Please create it manually as described above.`,
                    );
                } else {
                    // Re-throw the original error for other types of failures
                    this.log(`ERROR: Failed to create group: ${getErrorMessage(createError)}`, 'ERROR');
                    throw createError;
                }
            }
        } catch (error: unknown) {
            this.log(`ERROR: Error configuring group: ${getErrorMessage(error) || error}`, 'ERROR');
            throw error;
        } finally {
            // Clean up temporary avatar file if it was downloaded/created
            if (avatarPath && isTemporaryAvatar) {
                await this.media.cleanupTempFile(avatarPath);
            }
        }
    }

    private setupEventHandlers(): void {
        if (this.eventHandlersAttached) return;

        this.signalCli.on('message', this.signalMessageHandler);
        this.signalCli.on('close', this.signalCloseHandler);
        this.signalCli.on('error', this.signalErrorHandler);
        this.signalCli.on('log', this.signalLogHandler);
        this.signalCli.on('groupUpdate', this.signalGroupUpdateHandler);
        this.eventHandlersAttached = true;
    }

    private detachEventHandlers(): void {
        if (!this.eventHandlersAttached) return;

        this.signalCli.removeListener('message', this.signalMessageHandler);
        this.signalCli.removeListener('close', this.signalCloseHandler);
        this.signalCli.removeListener('error', this.signalErrorHandler);
        this.signalCli.removeListener('log', this.signalLogHandler);
        this.signalCli.removeListener('groupUpdate', this.signalGroupUpdateHandler);
        this.eventHandlersAttached = false;
    }

    private async handleMessage(messageData: Record<string, unknown>): Promise<void> {
        try {
            const envelope = messageData.envelope as Record<string, unknown> | undefined;
            const dataMessage = envelope?.dataMessage as Record<string, unknown> | undefined;
            if (!dataMessage) {
                return; // Ignore non-data messages (receipts, typing indicators, etc.)
            }

            const parsedMessage: ParsedMessage = {
                id: String(envelope?.timestamp || ''),
                source: (envelope?.sourceNumber as string | undefined) || (envelope?.source as string | undefined) || '',
                text: (dataMessage.message as string | undefined) || '',
                timestamp: (envelope?.timestamp as number | undefined) || 0,
                groupInfo: dataMessage.groupInfo as ParsedMessage['groupInfo'],
                isFromAdmin: this.isAdmin((envelope?.sourceNumber as string | undefined) || (envelope?.source as string | undefined) || ''),
            };

            // Ignore own messages
            if (parsedMessage.source === this.config.phoneNumber) {
                return;
            }

            // Ignore empty messages (like reactions only, media without text, etc.)
            if (!parsedMessage.text && !dataMessage.attachments) {
                return;
            }

            // If bot is configured for group mode, ignore private messages
            if (this.botGroupId && !parsedMessage.groupInfo) {
                // Only log if there's actual text content to avoid spam
                if (parsedMessage.text.trim()) {
                    this.log(
                        `IGNORE: Ignoring private message from ${parsedMessage.source} (bot is in group mode)`,
                        'DEBUG',
                    );
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

            if (this.config.settings.logMessages) {
                this.log(`Message from ${parsedMessage.source}: ${parsedMessage.text.substring(0, 50)}...`);
            }

            // Emit message event
            this.emit('message', parsedMessage);

            if (this.config.settings.autoReact) {
                const reactionRecipient = parsedMessage.groupInfo?.id || parsedMessage.groupInfo?.groupId || parsedMessage.source;
                try {
                    await this.signalCli.sendReaction(
                        reactionRecipient,
                        parsedMessage.source,
                        parsedMessage.timestamp,
                        '👍',
                    );
                } catch (error: unknown) {
                    this.log(`ERROR: Error sending automatic reaction: ${getErrorMessage(error)}`, 'DEBUG');
                }
            }

            // Send read receipt automatically
            try {
                await this.signalCli.sendReceipt(parsedMessage.source, parsedMessage.timestamp, 'read');
            } catch (error: unknown) {
                this.log(`ERROR: Error sending read receipt: ${getErrorMessage(error) || error}`, 'DEBUG');
            }

            // Handle commands
            if (parsedMessage.text.startsWith(this.config.settings.commandPrefix || '/')) {
                await this.handleCommand(parsedMessage);
            }
        } catch (error: unknown) {
            this.log(`ERROR: Error processing message: ${getErrorMessage(error) || error}`, 'ERROR');
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
        } catch (error: unknown) {
            this.log(`ERROR: Error executing command "${command.name}": ${getErrorMessage(error) || error}`, 'ERROR');
            await this.sendCommandResponse(
                message,
                `ERROR: An error occurred while running the command: ${command.name}`,
            );
        }
    }

    private async sendCommandResponse(message: ParsedMessage, response: string): Promise<void> {
        const recipient = message.groupInfo
            ? message.groupInfo.id || message.groupInfo.groupId || message.source
            : message.source;
        await this.sendMessage(recipient, response);
    }

    private isOnCooldown(userId: string): boolean {
        const lastCommand = this.userCooldowns.get(userId);
        if (!lastCommand) return false;

        const now = Date.now();
        const cooldownMs = (this.config.settings.cooldownSeconds || 2) * 1000;
        return now - lastCommand < cooldownMs;
    }

    private async processActionQueue(): Promise<void> {
        if (this.queueProcessingPromise) {
            await this.queueProcessingPromise;
            return;
        }

        if (this.actionQueue.length === 0) {
            return;
        }

        const processingPromise = this.runActionQueue();
        this.queueProcessingPromise = processingPromise;

        try {
            await processingPromise;
        } finally {
            if (this.queueProcessingPromise === processingPromise) {
                this.queueProcessingPromise = null;
            }
        }
    }

    private async runActionQueue(): Promise<void> {
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
                            this.log(
                                `Executing sendMessageWithAttachment to ${action.recipient} with ${action.attachments.length} file(s)...`,
                                'DEBUG',
                            );
                            await this.signalCli.sendMessage(action.recipient, action.message, {
                                attachments: action.attachments,
                            });
                            // Wait a bit for signal-cli to finish processing the files before cleanup
                            // signal-cli responds immediately but continues processing files in background
                            if (action.cleanup && action.cleanup.length > 0) {
                                const cleanupTimer = setTimeout(async () => {
                                    for (const filePath of action.cleanup!) {
                                        await this.media.cleanupTempFile(filePath);
                                    }
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
                                action.emoji,
                            );

                            break;
                    }

                    // Wait a bit between actions to be safe
                    await new Promise((resolve) => {
                        const timer = setTimeout(resolve, 250);
                        if (timer.unref) timer.unref();
                    });
                } catch (error: unknown) {
                    this.log(`ERROR: Failed to execute action ${action.type}: ${getErrorMessage(error) || error}`, 'ERROR');

                    // Clean up temporary files even on error
                    if (action.type === 'sendMessageWithAttachment' && action.cleanup && action.cleanup.length > 0) {
                        for (const filePath of action.cleanup) {
                            await this.media.cleanupTempFile(filePath);
                        }
                    }
                }
            }
        } finally {
            this.isProcessingQueue = false;
            this.log('Action queue processed.', 'DEBUG');
        }
    }

    private async sendWelcomeMessage(): Promise<void> {
        const welcomeText =
            `Signal Bot Started!

` +
            `Bot is now active
` +
            `Number: ${this.config.phoneNumber}
` +
            `Group: ${this.config.group ? this.config.group.name : 'None'}
` +
            `Use ${this.config.settings.commandPrefix}help to see commands

` +
            `Happy chatting!`;

        for (const admin of this.config.admins) {
            try {
                await this.sendMessage(admin, welcomeText);
            } catch (error: unknown) {
                this.log(`ERROR: Error sending welcome message to ${admin}: ${getErrorMessage(error) || error}`, 'ERROR');
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

    }
}
