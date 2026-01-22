require('dotenv').config();

/**
 * Signal SDK - Polls Example
 * 
 * This example demonstrates poll management features:
 * - Creating polls with multiple options
 * - Voting on polls
 * - Terminating polls
 * - Handling poll responses
 * 
 * Prerequisites:
 * - signal-cli installed and configured
 * - Account registered with signal-cli
 * - Environment variables set
 */

const { SignalCli } = require('../../dist/SignalCli');

async function pollsExample() {
    console.log('Signal SDK - Polls Example');
    console.log('================================\n');

    // Configuration
    const phoneNumber = process.env.SIGNAL_PHONE_NUMBER;
    const recipientNumber = process.env.SIGNAL_ADMIN_NUMBER;
    const groupId = process.env.SIGNAL_TEST_GROUP_ID; // Optional - for group polls

    if (!phoneNumber || !recipientNumber) {
        console.error('ERROR: Missing required environment variables:');
        console.error('   SIGNAL_PHONE_NUMBER - Your Signal phone number');
        console.error('   SIGNAL_ADMIN_NUMBER - Recipient number for polls');
        console.error('\nOptional:');
        console.error('   SIGNAL_TEST_GROUP_ID - Group ID for group polls');
        console.error('\nExample .env file:');
        console.error('   SIGNAL_PHONE_NUMBER="+33111111111"');
        console.error('   SIGNAL_ADMIN_NUMBER="+33000000000"');
        console.error('   SIGNAL_TEST_GROUP_ID="group-id-here"');
        process.exit(1);
    }

    // Initialize SDK
    const signal = new SignalCli(phoneNumber);

    try {
        // Step 1: Connect
        console.log('1. Connecting to signal-cli...');
        await signal.connect();
        console.log('   Connected successfully!\n');

        // Step 2: Create a simple poll (single recipient)
        console.log('2. Creating a simple poll for direct message...');
        const poll1 = await signal.sendPollCreate({
            recipient: recipientNumber,
            question: 'What\'s your favorite programming language?',
            options: ['TypeScript', 'Python', 'Go', 'Rust', 'JavaScript']
        });
        console.log(`   Poll created successfully!`);
        console.log(`   - Timestamp: ${poll1.timestamp}`);
        console.log(`   - Question: "What's your favorite programming language?"`);
        console.log(`   - Options: 5 choices\n`);

        // Step 3: Create a poll with multiple recipients
        console.log('3. Creating a poll with multiple recipients...');
        const poll2 = await signal.sendPollCreate({
            recipients: [recipientNumber], // Can include multiple numbers
            question: 'Best time for team meeting?',
            options: ['9:00 AM', '2:00 PM', '4:00 PM']
        });
        console.log(`   Multi-recipient poll created!`);
        console.log(`   - Timestamp: ${poll2.timestamp}\n`);

        // Step 4: Create a group poll (if group ID is available)
        if (groupId) {
            console.log('4. Creating a group poll...');
            const groupPoll = await signal.sendPollCreate({
                groupId: groupId,
                question: 'Where should we go for lunch?',
                options: ['Pizza', 'Sushi', 'Burgers', 'Salad']
            });
            console.log(`   Group poll created!`);
            console.log(`   - Timestamp: ${groupPoll.timestamp}`);
            console.log(`   - In group: ${groupId}\n`);
        } else {
            console.log('4. Skipping group poll (no SIGNAL_TEST_GROUP_ID set)\n');
        }

        // Step 5: Vote on a poll
        console.log('5. Voting on poll...');
        console.log('   Voting on first poll with option index 0 (TypeScript)');
        try {
            const voteResult = await signal.sendPollVote(recipientNumber, {
                pollAuthor: phoneNumber, // Author of the poll
                pollTimestamp: poll1.timestamp,
                optionIndexes: [0] // Vote for first option (TypeScript)
            });
            console.log(`   Vote sent successfully!`);
            console.log(`   - Vote timestamp: ${voteResult.timestamp}`);
            console.log(`   - Selected: TypeScript (index 0)\n`);
        } catch (error) {
            console.log(`   Note: Voting may fail if poll not yet received`);
            console.log(`   - Error: ${error.message}\n`);
        }

        // Step 6: Multiple choice vote
        console.log('6. Demonstrating multiple choice vote...');
        console.log('   For polls that allow multiple selections');
        try {
            await signal.sendPollVote(recipientNumber, {
                pollAuthor: phoneNumber,
                pollTimestamp: poll2.timestamp,
                optionIndexes: [0, 1] // Vote for multiple options
            });
            console.log(`   Multiple votes sent!\n`);
        } catch (error) {
            console.log(`   Multiple voting example (may not be supported)\n`);
        }

        // Step 7: Wait a bit before terminating
        console.log('7. Waiting 3 seconds before poll termination...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('   Wait complete\n');

        // Step 8: Terminate the poll
        console.log('8. Terminating poll...');
        try {
            const terminateResult = await signal.sendPollTerminate(recipientNumber, {
                pollTimestamp: poll1.timestamp
            });
            console.log(`   Poll terminated successfully!`);
            console.log(`   - Termination timestamp: ${terminateResult.timestamp}`);
            console.log(`   - Original poll: ${poll1.timestamp}\n`);
        } catch (error) {
            console.log(`   Poll termination note: ${error.message}\n`);
        }

        // Step 9: Demonstrate poll best practices
        console.log('9. Poll Best Practices:');
        console.log('   Keep questions clear and concise');
        console.log('   Limit options to 5-7 for best UX');
        console.log('   Use polls in groups for team decisions');
        console.log('   Terminate polls when decision is made');
        console.log('   Store poll timestamps to track results\n');

        // Step 10: Advanced poll example
        console.log('10. Creating an advanced poll with detailed question...');
        const advancedPoll = await signal.sendPollCreate({
            recipient: recipientNumber,
            question: 'Movie night poll: Which genre should we watch this weekend?',
            options: [
                'Comedy',
                'Action',
                'Romance',
                'Horror',
                'Sci-Fi'
            ]
        });
        console.log(`   Advanced poll created with emojis!`);
        console.log(`   - Timestamp: ${advancedPoll.timestamp}`);
        console.log(`   - Using emojis makes polls more engaging\n`);

        // Summary
        console.log('═══════════════════════════════════════');
        console.log('Poll Example Summary:');
        console.log('═══════════════════════════════════════');
        console.log('Created simple poll');
        console.log('Created multi-recipient poll');
        if (groupId) {
            console.log('Created group poll');
        }
        console.log('Demonstrated voting');
        console.log('Demonstrated poll termination');
        console.log('Created advanced poll with emojis');
        console.log('\nPolls example completed successfully!');

    } catch (error) {
        console.error('\nERROR: An error occurred:', error.message);
        console.error('\nTroubleshooting:');
        console.error('   • Ensure signal-cli supports polls (v0.11.0+)');
        console.error('   • Verify your account is properly registered');
        console.error('   • Check recipient number is valid');
        console.error('   • Ensure internet connection is stable');
        process.exit(1);
    } finally {
        // Cleanup
        console.log('\nDisconnecting from signal-cli...');
        await signal.gracefulShutdown();
        console.log('Disconnected successfully!');
    }
}

// Run the example
if (require.main === module) {
    pollsExample().catch(console.error);
}

module.exports = { pollsExample };
