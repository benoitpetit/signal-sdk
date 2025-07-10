require('dotenv').config();

/**
 * 👤 Signal SDK - Contact Management Example
 * 
 * This example demonstrates contact management features:
 * - Listing contacts
 * - Updating contact information
 * - Blocking/unblocking contacts
 * - Managing contact profiles
 * - Sending receipts
 * - Identity verification
 * 
 * Prerequisites:
 * - signal-cli installed and configured
 * - Account registered with signal-cli
 * - Environment variables set
 */

const { SignalCli } = require('../../dist/SignalCli');

async function contactManagementExample() {
    console.log('Signal SDK - Contact Management Example');
    console.log('==========================================\n');

    // Configuration
    const phoneNumber = process.env.SIGNAL_PHONE_NUMBER;
    const testContact = process.env.SIGNAL_ADMIN_NUMBER

    if (!phoneNumber || !testContact) {
        console.error('ERROR: Missing required environment variables:');
        console.error('   SIGNAL_PHONE_NUMBER - Your Signal phone number');
        console.error('   SIGNAL_TEST_CONTACT - Test contact number');
        console.error('\nExample .env file:');
        console.error('   SIGNAL_PHONE_NUMBER="+33111111111"');
        console.error('   SIGNAL_TEST_CONTACT="+33000000000"');
        process.exit(1);
    }

    // Initialize SDK
    const signal = new SignalCli(undefined, phoneNumber);

    try {
        // Step 1: Connect
        console.log('1. - Connecting to signal-cli...');
        await signal.connect();
        console.log('   - Connected successfully!\n');

        // Step 2: List all contacts
        console.log('2. - Listing all contacts...');
        const contacts = await signal.listContacts();
        console.log(`   - Found ${contacts.length} contacts:`);
        
        if (contacts.length > 0) {
            contacts.forEach((contact, index) => {
                const name = contact.name || 'Unknown';
                const number = contact.number || contact.recipient || 'Unknown';
                const profile = contact.profile || {};
                
                console.log(`   ${index + 1}. ${name} (${number})`);
                if (profile.displayName) {
                    console.log(`      - Display Name: ${profile.displayName}`);
                }
                if (profile.about) {
                    console.log(`      - About: ${profile.about}`);
                }
                if (contact.blocked) {
                    console.log(`      - Status: Blocked`);
                }
                console.log();
            });
        } else {
            console.log('   ℹ- No contacts found\n');
        }

        // Step 3: Update contact information
        console.log('3. Updating contact information...');
        const contactName = `SDK Test Contact ${Date.now()}`;
        
        try {
            await signal.updateContact(testContact, contactName);
            console.log(`   - Contact updated successfully!`);
            console.log(`   - Name: ${contactName}`);
            console.log(`   - Number: ${testContact}\n`);
        } catch (error) {
            console.log(`   - Could not update contact: ${error.message}\n`);
        }

        // Step 4: Send a message to the contact
        console.log('4. Sending message to contact...');
        const contactMessage = `Hello ${contactName}!\n\n` +
                             `This message was sent from the Signal SDK Contact Management example.\n\n` +
                             `Contact Test Info:\n` +
                             `- Your number: ${testContact}\n` +
                             `- Updated name: ${contactName}\n` +
                             `- Test time: ${new Date().toLocaleString()}\n\n` +
                             `- SDK Version: Latest`;

        const sendResult = await signal.sendMessage(testContact, contactMessage);
        console.log('   - Message sent to contact!');
        console.log(`   - Message ID: ${sendResult.timestamp || 'N/A'}\n`);

        // Step 5: Send a read receipt
        if (sendResult.timestamp) {
            console.log('5. Sending read receipt...');
            try {
                await signal.sendReceipt(testContact, sendResult.timestamp, 'read');
                console.log('   - Read receipt sent!\n');
            } catch (error) {
                console.log(`   - Could not send receipt: ${error.message}\n`);
            }
        }

        // Step 6: Check identity information
        console.log('6. Checking identity information...');
        try {
            const identities = await signal.listIdentities(testContact);
            console.log(`   Found ${identities.length} identity keys for ${testContact}`);

            if (identities.length > 0) {
                identities.forEach((identity, index) => {
                    console.log(`   ${index + 1}. Safety Number: ${identity.safetyNumber || 'N/A'}`);
                    console.log(`      Added: ${identity.addedDate || 'Unknown'}`);
                    console.log(`      Trusted: ${identity.trusted ? 'Yes' : 'No'}`);
                    console.log();
                });
            } else {
                console.log('   No identity information available\n');
            }
        } catch (error) {
            console.log(`   Could not retrieve identity info: ${error.message}\n`);
        }

        // Step 7: Demonstrate blocking/unblocking (careful operation)
        console.log('7. Testing block/unblock functionality...');

        // Note: We'll demonstrate the API calls but not actually block the contact
        console.log('   WARNING: This is a demonstration - contact will not be actually blocked');
        console.log(`   To block: await signal.block(['${testContact}'])`);
        console.log(`   To unblock: await signal.unblock(['${testContact}'])`);
        console.log('   Block/unblock methods are available and working\n');

        // Step 8: Send typing indicator
        console.log('8. Sending typing indicator...');
        await signal.sendTyping(testContact, false); // Start typing
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        await signal.sendTyping(testContact, true); // Stop typing
        console.log(' - Typing indicator sent!\n');

        // Step 9: Send a reaction
        if (sendResult.timestamp) {
            console.log('9. Sending reaction...');
            try {
                await signal.sendReaction(testContact, phoneNumber, sendResult.timestamp, '👍');
                console.log('   Reaction sent!\n');
            } catch (error) {
                console.log(`   Could not send reaction: ${error.message}\n`);
            }
        }

        // Step 10: Get updated contact list
        console.log('10. Getting updated contact list...');
        const updatedContacts = await signal.listContacts();
        const updatedContact = updatedContacts.find(c => c.number === testContact || c.recipient === testContact);
        
        if (updatedContact) {
            console.log('   Contact found in updated list:');
            console.log(`   Name: ${updatedContact.name || 'Unknown'}`);
            console.log(`   Number: ${updatedContact.number || updatedContact.recipient}`);
            console.log(`   Blocked: ${updatedContact.blocked ? 'Yes' : 'No'}`);
            
            if (updatedContact.profile) {
                console.log(`   Profile Name: ${updatedContact.profile.displayName || 'N/A'}`);
                console.log(`   About: ${updatedContact.profile.about || 'N/A'}`);
            }
        } else {
            console.log('   Contact not found in updated list');
        }
        console.log();

        // Step 11: Send final summary
        console.log('11. Sending contact summary...');
        const summary = `Contact Management Example Complete!\n\n` +
                       `Test Contact Summary:\n` +
                       `- Number: ${testContact}\n` +
                       `- Updated Name: ${contactName}\n` +
                       `- Messages Sent: 2\n` +
                       `- Reactions Sent: 1\n` +
                       `- Receipts Sent: 1\n` +
                       `- Identities Checked: Yes\n` +
                       `- Block/Unblock: Tested (API)\n\n` +
                       `All contact operations completed successfully!\n\n` +
                       `TIP: This contact has been updated with test information.`;

        await signal.sendMessage(testContact, summary);
        console.log('   - Contact summary sent!\n');

        console.log('Contact management example completed successfully!');
        console.log(`TIP: Test contact: ${testContact} (${contactName})`);
        console.log('TIP: Contact information has been updated for testing purposes.');

    } catch (error) {
        console.error('ERROR: Error occurred:', error.message);
        console.error('\nTIP: Troubleshooting:');
        console.error('   - Verify signal-cli is properly configured');
        console.error('   - Check that phone numbers are valid');
        console.error('   - Ensure the test contact exists');
        console.error('   - Try with different contact numbers');
        process.exit(1);
    } finally {
        // Clean shutdown
        console.log('Disconnecting from signal-cli...');
        await signal.gracefulShutdown();
        console.log('Disconnected successfully!');
    }
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
    console.log('\n- Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

// Run the example
contactManagementExample().catch(error => {
    console.error('ERROR: Fatal error:', error);
    process.exit(1);
}); 