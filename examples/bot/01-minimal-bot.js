require('dotenv').config();

/**
 * Signal Bot - Minimal Example
 * 
 * This is the simplest possible Signal bot using the SignalBot framework.
 * Perfect for beginners or as a starting point for more complex bots.
 * 
 * Features:
 * - Basic bot initialization
 * - Simple command handling
 * - Automatic message responses
 * - Clean shutdown
 * 
 * Commands included:
 * - /hello - Say hello
 * - /ping - Test bot responsiveness
 * - /help - Show available commands
 * - /stats - Show bot statistics
 * 
 * Prerequisites:
 * - signal-cli installed and configured
 * - Account registered with signal-cli
 * - Environment variables set
 */

const { SignalBot } = require('../../dist/SignalBot');

async function startMinimalBot() {
    console.log('Signal Bot - Minimal Example');
    console.log('============================\n');

    // Configuration
    const phoneNumber = process.env.SIGNAL_PHONE_NUMBER;
    const adminNumber = process.env.SIGNAL_ADMIN_NUMBER;

    if (!phoneNumber || !adminNumber) {
        console.error('ERROR: Missing required environment variables:');
        console.error('   SIGNAL_PHONE_NUMBER - Your Signal phone number');
        console.error('   SIGNAL_ADMIN_NUMBER - Admin phone number');
        console.error('\nExample .env file:');
        console.error('   SIGNAL_PHONE_NUMBER="+33111111111"');
        console.error('   SIGNAL_ADMIN_NUMBER="+33000000000"');
        process.exit(1);
    }

    // Initialize bot with minimal configuration
    const bot = new SignalBot({
        phoneNumber,
        admins: [adminNumber]
    });

    // Add basic commands
    bot.addCommand({
        name: 'hello',
        description: 'Say hello to the bot',
        handler: async (message, args) => {
            const name = args.length > 0 ? args.join(' ') : 'there';
            return `Hello ${name}! I'm a Signal bot created with the Signal SDK.`;
        }
    });

    bot.addCommand({
        name: 'ping',
        description: 'Test bot responsiveness',
        handler: async (message) => {
            const responseTime = Date.now() - message.timestamp;
            return `Pong! Response time: ${responseTime}ms`;
        }
    });

    bot.addCommand({
        name: 'echo',
        description: 'Repeat your message',
        handler: async (message, args) => {
            if (args.length === 0) {
                return 'Usage: /echo <message to repeat>';
            }
            return `Echo: ${args.join(' ')}`;
        }
    });

    bot.addCommand({
        name: 'time',
        description: 'Get current time',
        handler: async () => {
            const now = new Date();
            return `Current time: ${now.toLocaleString()}`;
        }
    });

    bot.addCommand({
        name: 'info',
        description: 'Bot information',
        handler: async () => {
            return `Minimal Signal Bot\n\n` +
                `- Phone: ${phoneNumber}\n` +
                `- Admin: ${adminNumber}\n` +
                `- SDK Version: Latest\n` +
                `- Started: ${new Date().toLocaleString()}\n\n` +
                `Type /help to see all commands.`;
        }
    });

    // Event handlers
    bot.on('ready', () => {
        console.log('Minimal bot is ready!');
        console.log(`Phone: ${phoneNumber}`);
        console.log(`Admin: ${adminNumber}`);
        console.log(`Send /help to see available commands`);
        console.log('');
    });

    bot.on('message', (message) => {
        // Log received messages
        const sender = message.source;
        const text = message.text.substring(0, 50);
        const truncated = message.text.length > 50 ? '...' : '';

        console.log(`Message from ${sender}: ${text}${truncated}`);
    });

    bot.on('command', (data) => {
        console.log(`Command executed: /${data.command} by ${data.user}`);
    });

    bot.on('error', (error) => {
        console.error('ERROR: Bot error:', error.message);
    });

    // Start the bot
    try {
        await bot.start();
        console.log('Bot started successfully!');
        console.log('Bot is now running and will respond to commands...');
        console.log('Press Ctrl+C to stop the bot');
    } catch (error) {
        console.error('ERROR: Failed to start bot:', error.message);
        console.error('\nTroubleshooting:');
        console.error('   - Check that signal-cli is installed and working');
        console.error('   - Verify your phone number is registered');
        console.error('   - Ensure admin number is correct');
        console.error('   - Check environment variables');
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down bot gracefully...');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down bot gracefully...');
    process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('ERROR: Unhandled Promise Rejection:', reason);
    process.exit(1);
});

// Start the minimal bot
startMinimalBot().catch(error => {
    console.error('FATAL ERROR:', error);
    process.exit(1);
}); 