require('dotenv').config();

/**
 * Signal Bot - Advanced Example
 * 
 * This demonstrates advanced features of the SignalBot framework:
 * - Group management
 * - User permissions
 * - File handling
 * - State management
 * - Command categories
 * - Error handling
 * - Logging and monitoring
 * 
 * Commands included:
 * - General: /help, /ping, /stats, /uptime
 * - Admin: /admin, /broadcast, /logs
 * - Groups: /groupinfo, /members, /invite
 * - Fun: /weather, /joke, /quote
 * - Files: /sendfile, /avatar
 * 
 * Prerequisites:
 * - signal-cli installed and configured
 * - Account registered with signal-cli
 * - Environment variables set
 */

const { SignalBot } = require('../../dist/SignalBot');
const fs = require('fs');
const path = require('path');

async function startAdvancedBot() {
    console.log('Signal Bot - Advanced Example');
    console.log('=============================\n');

    // Configuration
    const phoneNumber = process.env.SIGNAL_PHONE_NUMBER;
    const adminNumber = process.env.SIGNAL_ADMIN_NUMBER;
    const groupName = process.env.SIGNAL_GROUP_NAME || 'Advanced Bot Group';

    if (!phoneNumber || !adminNumber) {
        console.error('ERROR: Missing required environment variables:');
        console.error('   SIGNAL_PHONE_NUMBER - Your Signal phone number');
        console.error('   SIGNAL_ADMIN_NUMBER - Admin phone number');
        console.error('\nOptional:');
        console.error('   SIGNAL_GROUP_NAME - Bot group name');
        console.error('\nExample .env file:');
        console.error('   SIGNAL_PHONE_NUMBER="+33111111111"');
        console.error('   SIGNAL_ADMIN_NUMBER="+33000000000"');
        console.error('   SIGNAL_GROUP_NAME="My Advanced Bot Group"');
        process.exit(1);
    }

    // Bot state management
    const botState = {
        startTime: Date.now(),
        messageCount: 0,
        commandCount: 0,
        errors: [],
        users: new Map(),
        lastMessages: new Map()
    };

    // Initialize bot with advanced configuration
    const bot = new SignalBot({
        phoneNumber,
        admins: [adminNumber],
        group: {
            name: groupName,
            description: 'Advanced Signal Bot - Full feature demonstration',
            createIfNotExists: true,
            initialMembers: []
        },
        settings: {
            commandPrefix: '/',
            autoReact: true,
            logMessages: true,
            welcomeNewMembers: true,
            cooldownSeconds: 2,
            maxMessageLength: 2000
        }
    });

    // Helper functions
    const isAdmin = (phoneNumber) => {
        return bot.isAdmin(phoneNumber);
    };

    const formatUptime = (milliseconds) => {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    };

    const logError = (error, context = '') => {
        const errorEntry = {
            timestamp: Date.now(),
            error: error.message,
            context,
            stack: error.stack
        };
        botState.errors.push(errorEntry);

        // Keep only last 10 errors
        if (botState.errors.length > 10) {
            botState.errors.shift();
        }

        console.error(`ERROR: Error ${context ? `(${context})` : ''}: ${error.message}`);
    };

    // ===== GENERAL COMMANDS =====

    bot.addCommand({
        name: 'ping',
        description: 'Test bot responsiveness',
        handler: async (message) => {
            const responseTime = Date.now() - message.timestamp;
            return `Pong! Response time: ${responseTime}ms\n` +
                `Status: Healthy\n` +
                `Uptime: ${formatUptime(Date.now() - botState.startTime)}`;
        }
    });

    bot.addCommand({
        name: 'stats',
        description: 'Bot statistics',
        handler: async () => {
            const uptime = formatUptime(Date.now() - botState.startTime);
            const avgResponseTime = botState.commandCount > 0 ?
                Math.round((Date.now() - botState.startTime) / botState.commandCount) : 0;

            return `Bot Statistics\n\n` +
                `- Uptime: ${uptime}\n` +
                `- Messages: ${botState.messageCount}\n` +
                `- Commands: ${botState.commandCount}\n` +
                `- Users: ${botState.users.size}\n` +
                `- Errors: ${botState.errors.length}\n` +
                `- Avg Response: ${avgResponseTime}ms\n` +
                `- Started: ${new Date(botState.startTime).toLocaleString()}`;
        }
    });

    bot.addCommand({
        name: 'uptime',
        description: 'Bot uptime information',
        handler: async () => {
            const uptime = formatUptime(Date.now() - botState.startTime);
            const startTime = new Date(botState.startTime).toLocaleString();

            return `Uptime Information\n\n` +
                `Current Uptime: ${uptime}\n` +
                `- Started: ${startTime}\n` +
                `- Status: Online and Running`;
        }
    });

    // ===== ADMIN COMMANDS =====

    bot.addCommand({
        name: 'admin',
        description: 'Admin control panel',
        handler: async (message) => {
            if (!isAdmin(message.source)) {
                return 'ERROR: This command is restricted to administrators.';
            }

            return `Admin Control Panel\n\n` +
                `Quick Stats:\n` +
                `- Messages: ${botState.messageCount}\n` +
                `- Commands: ${botState.commandCount}\n` +
                `- Users: ${botState.users.size}\n` +
                `- Errors: ${botState.errors.length}\n\n` +
                `Admin Commands:\n` +
                `• /broadcast <message> - Send to all users\n` +
                `• /logs - View recent errors\n` +
                `• /restart - Restart bot (if implemented)\n` +
                `• /status - Detailed system status`;
        }
    });

    bot.addCommand({
        name: 'broadcast',
        description: 'Send message to all users (admin only)',
        handler: async (message, args) => {
            if (!isAdmin(message.source)) {
                return 'ERROR: This command is restricted to administrators.';
            }

            if (args.length === 0) {
                return 'Usage: /broadcast <message>';
            }

            const broadcastMessage = args.join(' ');
            let sentCount = 0;

            for (const [userNumber, userData] of botState.users) {
                try {
                    await bot.sendMessage(userNumber,
                        `Admin Broadcast\n\n${broadcastMessage}\n\n` +
                        `${new Date().toLocaleString()}`
                    );
                    sentCount++;
                } catch (error) {
                    logError(error, `broadcast to ${userNumber}`);
                }
            }

            return `- Broadcast sent to ${sentCount} users.`;
        }
    });

    bot.addCommand({
        name: 'logs',
        description: 'View recent error logs (admin only)',
        handler: async (message) => {
            if (!isAdmin(message.source)) {
                return 'ERROR: This command is restricted to administrators.';
            }

            if (botState.errors.length === 0) {
                return 'No recent errors found.';
            }

            const recentErrors = botState.errors.slice(-5);
            let logMessage = `Recent Error Logs (${recentErrors.length}/${botState.errors.length})\n\n`;

            recentErrors.forEach((error, index) => {
                const timeAgo = Math.round((Date.now() - error.timestamp) / 1000);
                logMessage += `${index + 1}. ${error.context || 'Unknown'}\n`;
                logMessage += `   - ${error.error}\n`;
                logMessage += `   - ${timeAgo}s ago\n\n`;
            });

            return logMessage;
        }
    });

    // ===== GROUP COMMANDS =====

    bot.addCommand({
        name: 'groupinfo',
        description: 'Group information',
        handler: async (message) => {
            if (!message.groupInfo) {
                return 'ERROR: This command only works in groups.';
            }

            try {
                const groups = await bot.getSignalCli().listGroups();
                const groupId = message.groupInfo.id || message.groupInfo.groupId;
                const group = groups.find(g => g.groupId === groupId);

                if (!group) {
                    return 'ERROR: Group information not found.';
                }

                return `Group Information\n\n` +
                    `- Name: ${group.name}\n` +
                    `- ID: ${group.groupId}\n` +
                    `- Members: ${group.members ? group.members.length : 'Unknown'}\n` +
                    `- Description: ${group.description || 'No description'}\n` +
                    `- Admin: ${group.isAdmin ? 'Yes' : 'No'}\n` +
                    `- Active: ${group.isMember ? 'Yes' : 'No'}`;
            } catch (error) {
                logError(error, 'groupinfo');
                return 'ERROR: Error retrieving group information.';
            }
        }
    });

    // ===== FUN COMMANDS =====

    bot.addCommand({
        name: 'weather',
        description: 'Get weather for a city',
        handler: async (message, args) => {
            const city = args.join(' ') || 'Paris';

            // Simulated weather data
            const conditions = ['sunny', 'rainy', 'cloudy', 'snowy', 'stormy'];
            const temp = Math.floor(Math.random() * 30) + 5;
            const condition = conditions[Math.floor(Math.random() * conditions.length)];
            const humidity = Math.floor(Math.random() * 50) + 30;
            const wind = Math.floor(Math.random() * 20) + 5;

            return `Weather in ${city}\n\n` +
                `- Temperature: ${temp}°C\n` +
                `- Condition: ${condition}\n` +
                `- Humidity: ${humidity}%\n` +
                `- Wind: ${wind} km/h\n\n` +
                `- ${new Date().toLocaleString()}\n` +
                `- Simulated data for demonstration`;
        }
    });

    bot.addCommand({
        name: 'joke',
        description: 'Get a random joke',
        handler: async () => {
            const jokes = [
                "Why don't scientists trust atoms? Because they make up everything!",
                "Why did the scarecrow win an award? Because he was outstanding in his field!",
                "Why don't eggs tell jokes? They'd crack each other up!",
                "What do you call a fake noodle? An impasta!",
                "Why did the math book look so sad? Because it had too many problems!",
                "What do you call a bear with no teeth? A gummy bear!",
                "Why don't skeletons fight each other? They don't have the guts!",
                "What do you call a dinosaur that crashes his car? Tyrannosaurus Wrecks!"
            ];

            const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
            return `Here's a joke for you:\n\n${randomJoke}`;
        }
    });

    bot.addCommand({
        name: 'quote',
        description: 'Get an inspirational quote',
        handler: async () => {
            const quotes = [
                "The only way to do great work is to love what you do. - Steve Jobs",
                "Innovation distinguishes between a leader and a follower. - Steve Jobs",
                "Life is what happens to you while you're busy making other plans. - John Lennon",
                "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
                "It is during our darkest moments that we must focus to see the light. - Aristotle",
                "The way to get started is to quit talking and begin doing. - Walt Disney",
                "Don't let yesterday take up too much of today. - Will Rogers",
                "You learn more from failure than from success. - Unknown"
            ];

            const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
            return `- Inspirational Quote:\n\n${randomQuote}`;
        }
    });

    // ===== FILE COMMANDS =====

    bot.addCommand({
        name: 'sendfile',
        description: 'Send a file from the project',
        handler: async (message, args) => {
            if (args.length === 0) {
                return 'Usage: /sendfile <filename>\nExample: /sendfile package.json';
            }

            const filename = args.join(' ');
            const filePath = path.join(process.cwd(), filename);

            if (!fs.existsSync(filePath)) {
                return `ERROR: File not found: ${filename}`;
            }

            try {
                const recipient = message.groupInfo ?
                    (message.groupInfo.id || message.groupInfo.groupId) :
                    message.source;

                await bot.sendMessageWithAttachment(recipient,
                    `- Here's your file: ${filename}`,
                    [filePath]
                );

                return null; // Don't send additional text message
            } catch (error) {
                logError(error, 'sendfile');
                return `ERROR: Error sending file: ${error.message}`;
            }
        }
    });

    // ===== EVENT HANDLERS =====

    bot.on('ready', () => {
        console.log('Advanced bot is ready!');
        console.log(`- Phone: ${phoneNumber}`);
        console.log(`- Admin: ${adminNumber}`);
        console.log(`- Group: ${groupName}`);
        console.log(`- Send /help to see all commands`);
        console.log('');
    });

    bot.on('message', (message) => {
        // Update statistics
        botState.messageCount++;

        // Track users
        if (!botState.users.has(message.source)) {
            botState.users.set(message.source, {
                firstSeen: Date.now(),
                messageCount: 1
            });
        } else {
            const userData = botState.users.get(message.source);
            userData.messageCount++;
            botState.users.set(message.source, userData);
        }

        // Store last message for each chat
        const chatId = message.groupInfo ? message.groupInfo.id : message.source;
        botState.lastMessages.set(chatId, message);

        // Log message
        const sender = message.source;
        const text = message.text.substring(0, 50);
        const truncated = message.text.length > 50 ? '...' : '';
        const location = message.groupInfo ? `[${message.groupInfo.name || 'Group'}]` : '[DM]';

        console.log(`- ${location} ${sender}: ${text}${truncated}`);
    });

    bot.on('command', (data) => {
        botState.commandCount++;
        console.log(`- Command: /${data.command} by ${data.user}`);
    });

    bot.on('error', (error) => {
        logError(error, 'bot');
    });

    bot.on('group-member-added', (data) => {
        console.log(`- New member added: ${data.member} to ${data.group}`);
    });

    bot.on('group-member-removed', (data) => {
        console.log(`- Member removed: ${data.member} from ${data.group}`);
    });

    // Start the bot
    try {
        await bot.start();
        console.log('- Advanced bot started successfully!');
        console.log('- Bot is now running with full features...');
        console.log('-  Press Ctrl+C to stop the bot');
    } catch (error) {
        console.error('ERROR: Failed to start advanced bot:', error.message);
        console.error('\nTIP: Troubleshooting:');
        console.error('   • Check signal-cli installation');
        console.error('   • Verify environment variables');
        console.error('   • Check group permissions');
        console.error('   • Ensure admin number is correct');
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n- Shutting down advanced bot gracefully...');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n- Received SIGTERM, shutting down...');
    process.exit(0);
});

// Start the advanced bot
startAdvancedBot().catch(error => {
    console.error('ERROR: Fatal error:', error);
    process.exit(1);
}); 