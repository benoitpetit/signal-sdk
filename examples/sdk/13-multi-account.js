/**
 * Example: Multi-Account Management
 * Demonstrates how to manage multiple Signal accounts simultaneously
 */

const { MultiAccountManager } = require('../../dist');

async function main() {
    console.log('=== Multi-Account Management Example ===\n');

    // Create a multi-account manager
    const manager = new MultiAccountManager({
        signalCliPath: '/usr/local/bin/signal-cli',
        verbose: true
    });

    try {
        // Add multiple accounts
        console.log('Adding accounts...');
        await manager.addAccount('+33111111111');
        await manager.addAccount('+33222222222');
        console.log('✓ Accounts added\n');

        // Connect all accounts
        console.log('Connecting all accounts...');
        await manager.connectAll();
        console.log('✓ All accounts connected\n');

        // Listen for messages from any account
        manager.on('message', (account, message) => {
            console.log(`📨 Message from ${account}:`, message.text);
        });

        // Listen for errors
        manager.on('error', (account, error) => {
            console.error(`❌ Error on ${account}:`, error.message);
        });

        // Listen for all account events
        manager.on('accountEvent', (event) => {
            console.log(`🔔 Event from ${event.account}: ${event.event}`);
        });

        // Send a message from a specific account
        console.log('Sending message from account 1...');
        await manager.sendMessage(
            '+33111111111',
            '+33987654321',
            'Hello from account 1!'
        );
        console.log('✓ Message sent\n');

        // Send with options
        console.log('Sending styled message...');
        await manager.sendMessage(
            '+33222222222',
            '+33987654321',
            'Important message',
            {
                textStyles: [
                    { start: 0, length: 9, style: 'BOLD' }
                ]
            }
        );
        console.log('✓ Styled message sent\n');

        // Get status of all accounts
        const status = await manager.getAllStatus();
        console.log('Account statuses:');
        console.log(`- Total accounts: ${status.totalAccounts}`);
        console.log(`- Connected: ${status.connectedCount}`);
        status.accounts.forEach(acc => {
            console.log(`  • ${acc.account}: ${acc.connected ? '✓ Connected' : '✗ Disconnected'}`);
        });
        console.log();

        // Get specific account instance
        const account1 = manager.getAccount('+33111111111');
        if (account1) {
            const groups = await account1.listGroups();
            console.log(`Account 1 has ${groups.length} groups\n`);
        }

        // Disconnect a specific account
        console.log('Disconnecting account 1...');
        await manager.removeAccount('+33111111111');
        console.log('✓ Account 1 disconnected\n');

        // Final status
        const finalStatus = await manager.getAllStatus();
        console.log(`Remaining accounts: ${finalStatus.totalAccounts}`);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        // Cleanup
        console.log('\nShutting down...');
        await manager.shutdown();
        console.log('✓ Shutdown complete');
    }
}

// Run with proper error handling
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
