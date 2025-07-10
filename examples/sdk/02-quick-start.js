require('dotenv').config();

/**
 * Signal SDK - Quick Start Example
 * 
 * This is the simplest way to get started with the Signal SDK.
 * Perfect for testing your setup or building your first Signal app.
 * 
 * Features demonstrated:
 * - Basic connection
 * - Send a message
 * - Send a file
 * - Clean shutdown
 * 
 * Prerequisites:
 * - signal-cli installed and configured
 * - Account registered with signal-cli
 * - Environment variables set
 */

const { SignalCli } = require('../../dist/SignalCli');

async function quickStart() {
    console.log('Signal SDK - Quick Start');
    console.log('========================\n');

    // Configuration
    const phoneNumber = process.env.SIGNAL_PHONE_NUMBER;
    const recipientNumber = process.env.SIGNAL_ADMIN_NUMBER;

    if (!phoneNumber || !recipientNumber) {
        console.error('ERROR: Please set environment variables:');
        console.error('   SIGNAL_PHONE_NUMBER="+33111111111"');
        console.error('   SIGNAL_RECIPIENT_NUMBER="+33000000000"');
        process.exit(1);
    }

    // Initialize SDK
    const signal = new SignalCli(undefined, phoneNumber);

    try {
        // Step 1: Connect
        console.log('1. Connecting...');
        await signal.connect();
        console.log('   - Connected!\n');

        // Step 2: Send a simple message
        console.log('2. Sending message...');
        const message = `Hello from Signal SDK!\n\nSent at: ${new Date().toLocaleString()}`;
        await signal.sendMessage(recipientNumber, message);
        console.log('   - Message sent!\n');

        // Step 3: Send a file (if package.json exists)
        console.log('3. Sending file...');
        const fs = require('fs');
        if (fs.existsSync('package.json')) {
            await signal.sendMessage(recipientNumber, 'Here is the package.json file:', {
                attachments: ['package.json']
            });
            console.log('   - File sent!\n');
        } else {
            console.log('   INFO: No package.json found, skipping file send\n');
        }

        // Step 4: Get basic info
        console.log('4. Getting info...');
        const contacts = await signal.listContacts();
        const groups = await signal.listGroups();
        console.log(`   - Found ${contacts.length} contacts and ${groups.length} groups\n`);

        // Step 5: Send summary
        console.log('5. Sending summary...');
        const summary = `Quick Start Completed!\n\n` +
            `Your Signal account:\n` +
            `- Phone: ${phoneNumber}\n` +
            `- Contacts: ${contacts.length}\n` +
            `- Groups: ${groups.length}\n` +
            `- SDK Version: Latest\n\n` +
            `Ready to build amazing Signal apps!`;

        await signal.sendMessage(recipientNumber, summary);
        console.log('   - Summary sent!\n');

        console.log('Quick Start completed successfully!');

    } catch (error) {
        console.error('ERROR:', error.message);
        console.error('\nTroubleshooting:');
        console.error('   - Run: signal-cli --version');
        console.error('   - Check: signal-cli listAccounts');
        console.error('   - Verify phone numbers are correct');
        process.exit(1);
    } finally {
        // Clean shutdown
        console.log('Disconnecting...');
        await signal.gracefulShutdown();
        console.log('Done!');
    }
}

// Run the quick start
quickStart().catch(error => {
    console.error('FATAL ERROR:', error);
    process.exit(1);
}); 