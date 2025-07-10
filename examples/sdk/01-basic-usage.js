require('dotenv').config();

/**
 * Signal SDK - Basic Usage Example
 * 
 * This example demonstrates the fundamental features of the Signal SDK:
 * - Connecting to signal-cli
 * - Sending messages
 * - Receiving messages
 * - Listing contacts and groups
 * - Basic error handling
 * 
 * Prerequisites:
 * - signal-cli installed and configured
 * - Account already registered with signal-cli
 * - Environment variables set in .env file
 */

const { SignalCli } = require('../../dist/SignalCli');

async function basicUsageExample() {
    console.log('Signal SDK - Basic Usage Example');
    console.log('=====================================\n');

    // Configuration from environment variables
    const phoneNumber = process.env.SIGNAL_PHONE_NUMBER;
    const recipientNumber = process.env.SIGNAL_ADMIN_NUMBER;

    if (!phoneNumber || !recipientNumber) {
        console.error('ERROR: Missing required environment variables:');
        console.error('   SIGNAL_PHONE_NUMBER - Your Signal phone number');
        console.error('   SIGNAL_RECIPIENT_NUMBER - Test recipient number');
        console.error('\nExample .env file:');
        console.error('   SIGNAL_PHONE_NUMBER="+33111111111"');
        console.error('   SIGNAL_RECIPIENT_NUMBER="+33000000000"');
        process.exit(1);
    }

    // Initialize the SDK
    const signalCli = new SignalCli(undefined, phoneNumber);

    try {
        // 1. Connect to signal-cli
        console.log('1. Connecting to signal-cli...');
        await signalCli.connect();
        console.log('   - Connected successfully!\n');

        // 2. Get version information
        console.log('2. Getting version information...');
        const version = await signalCli.getVersion();
        console.log(`   - signal-cli version: ${version.version}\n`);

        // 3. List contacts
        console.log('3. Listing contacts...');
        const contacts = await signalCli.listContacts();
        console.log(`   - Found ${contacts.length} contacts`);
        if (contacts.length > 0) {
            console.log('   - Sample contacts:');
            contacts.slice(0, 3).forEach(contact => {
                console.log(`     - ${contact.name || 'Unknown'} (${contact.number})`);
            });
        }
        console.log();

        // 4. List groups
        console.log('4. Listing groups...');
        const groups = await signalCli.listGroups();
        console.log(`   - Found ${groups.length} groups`);
        if (groups.length > 0) {
            console.log('   - Sample groups:');
            groups.slice(0, 3).forEach(group => {
                const memberCount = group.members ? group.members.length : 0;
                console.log(`     - ${group.name} (${memberCount} members)`);
            });
        }
        console.log();

        // 5. Send a test message
        console.log('5. Sending test message...');
        const testMessage = `Signal SDK Test Message\n\nSent at: ${new Date().toISOString()}\nFrom: Basic Usage Example`;

        const sendResult = await signalCli.sendMessage(recipientNumber, testMessage);
        console.log('   - Message sent successfully!');
        console.log(`   - Message ID: ${sendResult.timestamp || 'N/A'}\n`);

        // 6. Send a reaction to the message we just sent
        if (sendResult.timestamp) {
            console.log('6. Sending reaction to our message...');
            await signalCli.sendReaction(recipientNumber, phoneNumber, sendResult.timestamp, '✅');
            console.log('   - Reaction sent successfully!\n');
        }

        // 7. Send typing indicator
        console.log('7. Sending typing indicator...');
        await signalCli.sendTyping(recipientNumber, false); // Start typing
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        await signalCli.sendTyping(recipientNumber, true); // Stop typing
        console.log('   - Typing indicator sent!\n');

        // 8. Listen for messages for 10 seconds
        console.log('8. Listening for messages (10 seconds)...');

        let messageCount = 0;
        const messageHandler = (message) => {
            messageCount++;
            console.log(`   - Message ${messageCount} received from ${message.envelope.sourceNumber || 'Unknown'}`);

            // Log message content if available
            if (message.envelope.dataMessage?.message) {
                const text = message.envelope.dataMessage.message;
                console.log(`      - "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
            }
        };

        signalCli.on('message', messageHandler);

        // Wait for 10 seconds
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Remove the message handler
        signalCli.off('message', messageHandler);

        if (messageCount === 0) {
            console.log('   - No messages received during listening period');
        }
        console.log();

        // 9. Send a final confirmation message
        console.log('9. Sending completion message...');
        const finalMessage = `Basic Usage Example Completed!\n\n` +
            `Summary:\n` +
            `- Contacts: ${contacts.length}\n` +
            `- Groups: ${groups.length}\n` +
            `- Messages received: ${messageCount}\n` +
            `- Time: ${new Date().toLocaleString()}`;

        await signalCli.sendMessage(recipientNumber, finalMessage);
        console.log('   - Completion message sent!\n');

    } catch (error) {
        console.error('ERROR: Error occurred:', error.message);
        console.error('TIP: Common solutions:');
        console.error('   • Check that signal-cli is installed and working');
        console.error('   • Verify your phone number is registered with signal-cli');
        console.error('   • Ensure the recipient number is valid');
        console.error('   • Check your internet connection');
        process.exit(1);
    } finally {
        // Clean up connection
        console.log('🔌 Disconnecting from signal-cli...');
        await signalCli.gracefulShutdown();
        console.log('Disconnected successfully!');
    }
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    process.exit(0);
});

// Run the example
basicUsageExample().catch(error => {
    console.error('ERROR: Fatal error:', error);
    process.exit(1);
}); 