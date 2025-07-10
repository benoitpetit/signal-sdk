/**
 * Advanced Signal Bot with New Features
 * 
 * This example demonstrates a production-ready bot using all the latest
 * Signal CLI SDK features including contact management, payment notifications,
 * user status checking, and advanced error handling.
 */

const { SignalBot, SignalCli } = require('../../dist');
const fs = require('fs').promises;
const path = require('path');

class AdvancedSignalBot extends SignalBot {
    constructor(config) {
        super(config);

        // Enhanced configuration
        this.userStatusCache = new Map();
        this.paymentTracking = new Map();
        this.rateLimitRetries = new Map();

        this.setupAdvancedCommands();
        this.setupAdvancedEventHandlers();
    }

    setupAdvancedCommands() {
        // User verification command
        this.addCommand({
            name: 'verify',
            description: 'Check if users are on Signal',
            adminOnly: false,
            handler: async (message, args) => {
                if (args.length === 0) {
                    return 'Usage: /verify +1234567890 [+1987654321 ...]';
                }

                try {
                    const numbers = args.filter(arg => arg.startsWith('+'));
                    if (numbers.length === 0) {
                        return 'Please provide valid phone numbers starting with +';
                    }

                    // Check user status
                    const userStatuses = await this.signalCli.getUserStatus(numbers);

                    let response = 'Signal Registration Status:\n\n';
                    userStatuses.forEach(status => {
                        const emoji = status.isRegistered ? '✅' : '❌';
                        response += `${emoji} ${status.number}: ${status.isRegistered ? 'Registered' : 'Not on Signal'}\n`;

                        // Cache the result
                        this.userStatusCache.set(status.number, {
                            isRegistered: status.isRegistered,
                            timestamp: Date.now()
                        });
                    });

                    return response;
                } catch (error) {
                    return 'ERROR: checking user status. Please try again.';
                }
            }
        });

        // Contact management command
        this.addCommand({
            name: 'cleanup',
            description: 'Remove old or blocked contacts',
            adminOnly: true,
            handler: async (message, args) => {
                if (args.length === 0) {
                    return 'Usage: /cleanup hide|forget +1234567890 [reason]';
                }

                const [action, phoneNumber, ...reasonParts] = args;
                const reason = reasonParts.join(' ') || 'Admin cleanup';

                if (!['hide', 'forget'].includes(action)) {
                    return 'Action must be "hide" or "forget"';
                }

                if (!phoneNumber || !phoneNumber.startsWith('+')) {
                    return 'Please provide a valid phone number';
                }

                try {
                    const options = action === 'hide' ? { hide: true } : { forget: true };
                    await this.signalCli.removeContact(phoneNumber, options);

                    // Log the action
                    this.log(`Contact ${phoneNumber} ${action === 'hide' ? 'hidden' : 'removed'} by ${message.source}. Reason: ${reason}`);

                    return `- Contact ${phoneNumber} ${action === 'hide' ? 'hidden from list' : 'completely removed'}`;
                } catch (error) {
                    return `ERROR: Failed to ${action} contact: ${error.message}`;
                }
            }
        });

        // Payment tracking command
        this.addCommand({
            name: 'payment',
            description: 'Send payment notification',
            adminOnly: true,
            handler: async (message, args) => {
                if (args.length < 2) {
                    return 'Usage: /payment +1234567890 receipt-id [note]';
                }

                const [recipient, receiptId, ...noteParts] = args;
                const note = noteParts.join(' ') || 'Payment processed';

                if (!recipient.startsWith('+')) {
                    return 'Please provide a valid phone number';
                }

                try {
                    // In a real application, you'd fetch the actual receipt data
                    const mockReceiptData = Buffer.from(`receipt-${receiptId}-${Date.now()}`).toString('base64');

                    await this.signalCli.sendPaymentNotification(recipient, {
                        receipt: mockReceiptData,
                        note: note
                    });

                    // Track the payment
                    this.paymentTracking.set(receiptId, {
                        recipient,
                        note,
                        timestamp: Date.now(),
                        admin: message.source
                    });

                    return `- Payment notification sent to ${recipient}`;
                } catch (error) {
                    return `ERROR: Failed to send payment notification: ${error.message}`;
                }
            }
        });

        // Sticker pack management
        this.addCommand({
            name: 'stickers',
            description: 'Manage sticker packs',
            adminOnly: true,
            handler: async (message, args) => {
                if (args.length === 0) {
                    return 'Usage: /stickers list|upload [path]';
                }

                const [action, stickerPath] = args;

                try {
                    if (action === 'list') {
                        const packs = await this.signalCli.listStickerPacks();
                        if (packs.length === 0) {
                            return 'No sticker packs installed';
                        }

                        let response = 'Installed Sticker Packs:\n\n';
                        packs.forEach((pack, index) => {
                            response += `- ${index + 1}. ${pack.title || 'Untitled'}\n`;
                            response += `- Author: ${pack.author || 'Unknown'}\n`;
                            response += `- ID: ${pack.id}\n\n`;
                        });

                        return response;
                    } else if (action === 'upload') {
                        if (!stickerPath) {
                            return 'Please provide path to sticker pack manifest or zip file';
                        }

                        // Check if file exists (in a real app)
                        try {
                            await fs.access(stickerPath);
                        } catch {
                            return `ERROR: File not found: ${stickerPath}`;
                        }

                        const result = await this.signalCli.uploadStickerPack({
                            path: stickerPath
                        });

                        return `- Sticker pack uploaded!\n- Pack ID: ${result.packId}\n- Pack Key: ${result.packKey}`;
                    } else {
                        return 'Unknown action. Use "list" or "upload"';
                    }
                } catch (error) {
                    return `ERROR: Sticker operation failed: ${error.message}`;
                }
            }
        });

        // System status command
        this.addCommand({
            name: 'status',
            description: 'Show bot system status',
            adminOnly: true,
            handler: async (message, args) => {
                const stats = this.getStats();
                const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
                const hours = Math.floor(uptime / 3600);
                const minutes = Math.floor((uptime % 3600) / 60);

                let response = 'Bot System Status:\n\n';
                response += `- Uptime: ${hours}h ${minutes}m\n`;
                response += `- Messages received: ${stats.messagesReceived}\n`;
                response += `- Commands executed: ${stats.commandsExecuted}\n`;
                response += `- Active users: ${stats.activeUsers}\n`;
                response += `- User status cache: ${this.userStatusCache.size} entries\n`;
                response += `- Payment tracking: ${this.paymentTracking.size} payments\n`;
                response += `- Rate limit retries: ${this.rateLimitRetries.size} active\n`;

                return response;
            }
        });
    }

    setupAdvancedEventHandlers() {
        // Enhanced error handling
        this.signalCli.on('error', async (error) => {
            this.log(`Error: ${error.message}`, 'error');

            // Handle rate limiting
            if (error.message.includes('proof required')) {
                await this.handleRateLimit(error);
            }
        });

        // Log all messages for auditing
        this.on('message', (message) => {
            this.log(`Message from ${message.source}: ${message.text?.substring(0, 50)}...`);
        });

        // Welcome new group members with status check
        this.on('groupMemberJoined', async (event) => {
            try {
                // Check if new member is on Signal
                const userStatus = await this.signalCli.getUserStatus([event.member]);

                if (userStatus[0]?.isRegistered) {
                    await this.sendMessage(
                        event.groupId,
                        `Welcome ${event.member}! You're verified on Signal.`
                    );
                } else {
                    await this.sendMessage(
                        event.groupId,
                        `Welcome ${event.member}! Please make sure you're using Signal.`
                    );
                }
            } catch (error) {
                this.log(`Failed to welcome new member: ${error.message}`, 'error');
            }
        });
    }

    async handleRateLimit(error) {
        this.log('Rate limit detected - implementing recovery strategy', 'warning');

        try {
            // Extract challenge token (this would need proper parsing in real implementation)
            const challengeMatch = error.message.match(/challenge:(\w+)/);
            if (!challengeMatch) {
                this.log('No challenge token found in rate limit error', 'error');
                return;
            }

            const challengeToken = challengeMatch[1];

            // In a real implementation, integrate with a captcha solving service
            this.log('Rate limit challenge detected. In production, solve captcha here.', 'info');

            // For demo purposes, we'll just log the challenge
            this.rateLimitRetries.set(challengeToken, {
                timestamp: Date.now(),
                attempts: 1
            });

            // Notify admins
            await this.notifyAdmins(`Rate limit detected. Challenge token: ${challengeToken}`);

        } catch (recoveryError) {
            this.log(`Rate limit recovery failed: ${recoveryError.message}`, 'error');
        }
    }

    async notifyAdmins(message) {
        for (const admin of this.admins) {
            try {
                await this.sendMessage(admin, `Bot Alert: ${message}`);
            } catch (error) {
                this.log(`Failed to notify admin ${admin}: ${error.message}`, 'error');
            }
        }
    }

    // Clean up old cache entries
    async cleanupCache() {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        // Clean user status cache
        for (const [number, data] of this.userStatusCache.entries()) {
            if (now - data.timestamp > maxAge) {
                this.userStatusCache.delete(number);
            }
        }

        // Clean payment tracking
        for (const [receiptId, data] of this.paymentTracking.entries()) {
            if (now - data.timestamp > maxAge * 7) { // Keep for 7 days
                this.paymentTracking.delete(receiptId);
            }
        }

        this.log(`Cache cleanup completed. User status: ${this.userStatusCache.size}, Payments: ${this.paymentTracking.size}`);
    }

    async start() {
        await super.start();

        // Start periodic cleanup
        setInterval(() => {
            this.cleanupCache();
        }, 60 * 60 * 1000); // Every hour

        this.log('Advanced Signal Bot started with full feature set!');
    }
}

// Configuration
const botConfig = {
    phoneNumber: process.env.SIGNAL_PHONE_NUMBER,
    admins: process.env.SIGNAL_ADMIN_NUMBER?.split(',') || [],
    group: {
        name: process.env.SIGNAL_GROUP_NAME || 'Advanced Bot Group',
        description: 'A group managed by the advanced Signal bot with full features',
        createIfNotExists: true
    },
    settings: {
        commandPrefix: '/',
        logMessages: true,
        welcomeNewMembers: true,
        cooldownSeconds: 1 // Reduced for demo
    }
};

// Error handling for the demo
async function runAdvancedBot() {
    if (!botConfig.phoneNumber) {
        console.error('ERROR: Please set SIGNAL_PHONE_NUMBER environment variable');
        process.exit(1);
    }

    if (!botConfig.admins.length) {
        console.error('ERROR: Please set SIGNAL_ADMIN_NUMBER environment variable');
        process.exit(1);
    }

    const bot = new AdvancedSignalBot(botConfig);

    // Handle shutdown gracefully
    process.on('SIGINT', async () => {
        console.log('\nShutting down bot...');
        await bot.stop();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\nReceived SIGTERM, shutting down...');
        await bot.stop();
        process.exit(0);
    });

    try {
        await bot.start();
        console.log('\nAdvanced Signal Bot is running!');
        console.log('- Available commands:');
        console.log('   /verify +1234567890 - Check Signal registration');
        console.log('   /cleanup hide|forget +1234567890 - Contact management');
        console.log('   /payment +1234567890 receipt-id [note] - Send payment');
        console.log('   /stickers list|upload [path] - Manage sticker packs');
        console.log('   /status - Show system status');
        console.log('   /help - Show all commands');
    } catch (error) {
        console.error('ERROR: Failed to start bot:', error.message);
        process.exit(1);
    }
}

// Run the bot if this file is executed directly
if (require.main === module) {
    runAdvancedBot();
}

module.exports = { AdvancedSignalBot, runAdvancedBot };
