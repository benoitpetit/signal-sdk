require('dotenv').config();

/**
 * Signal SDK - Account Management Example
 * 
 * This example demonstrates account management features:
 * - Updating account details (username, device name)
 * - Managing account privacy settings
 * - Listing all local accounts
 * - Setting and removing PIN
 * - Managing profile information
 * - Device management
 * 
 * Prerequisites:
 * - signal-cli installed and configured
 * - Account registered with signal-cli
 * - Environment variables set
 */

const { SignalCli } = require('../../dist/SignalCli');

async function accountManagementExample() {
    console.log('Signal SDK - Account Management Example');
    console.log('===========================================\n');

    // Configuration
    const phoneNumber = process.env.SIGNAL_PHONE_NUMBER;

    if (!phoneNumber) {
        console.error('ERROR: Missing required environment variables:');
        console.error('   SIGNAL_PHONE_NUMBER - Your Signal phone number');
        console.error('\nExample .env file:');
        console.error('   SIGNAL_PHONE_NUMBER="+33111111111"');
        process.exit(1);
    }

    // Initialize SDK
    const signal = new SignalCli(phoneNumber);

    try {
        // Step 1: Connect
        console.log('1. Connecting to signal-cli...');
        await signal.connect();
        console.log('   Connected successfully!\n');

        // Step 2: List all local accounts
        console.log('2. Listing all local Signal accounts...');
        try {
            const accounts = await signal.listAccountsDetailed();
            console.log(`   Found ${accounts.length} account(s):`);
            accounts.forEach((account, idx) => {
                console.log(`   ${idx + 1}. Number: ${account.number}`);
                if (account.name) console.log(`      Name: ${account.name}`);
                if (account.uuid) console.log(`      UUID: ${account.uuid}`);
            });
            console.log();
        } catch (error) {
            console.log(`   Could not list accounts: ${error.message}\n`);
        }

        // Step 3: Get current account version/info
        console.log('3. Getting account information...');
        try {
            const version = await signal.getVersion();
            console.log(`   signal-cli version: ${version.version || 'unknown'}`);
            console.log(`   - Account: ${phoneNumber}\n`);
        } catch (error) {
            console.log(`   Could not get version: ${error.message}\n`);
        }

        // Step 4: Update profile information
        console.log('4. Updating profile information...');
        try {
            const newProfileName = 'Signal SDK Bot';
            const newAbout = 'Testing Signal SDK account management features';
            const newAboutEmoji = '🤖';

            await signal.updateProfile(
                newProfileName,
                newAbout,
                newAboutEmoji
            );
            console.log('   Profile updated successfully!');
            console.log(`   - Name: ${newProfileName}`);
            console.log(`   - About: ${newAbout}`);
            console.log(`   - About Emoji: ${newAboutEmoji}\n`);
        } catch (error) {
            console.log(`   Profile update failed: ${error.message}\n`);
        }

        // Step 5: Update account settings
        console.log('5. Updating account settings...');
        try {
            const updateResult = await signal.updateAccount({
                deviceName: 'Signal SDK Test Device'
            });
            console.log('   Account settings updated!');
            if (updateResult.deviceName) {
                console.log(`   - Device name: ${updateResult.deviceName}`);
            }
            console.log();
        } catch (error) {
            console.log(`   Account update note: ${error.message}\n`);
        }

        // Step 6: Update account configuration
        console.log('6. Updating account configuration...');
        try {
            await signal.updateAccountConfiguration({
                readReceipts: true,
                unidentifiedDeliveryIndicators: false,
                typingIndicators: true,
                linkPreviews: true
            });
            console.log('   Account configuration updated!');
            console.log('   - Read receipts: enabled');
            console.log('   - Typing indicators: enabled');
            console.log('   - Link previews: enabled');
            console.log('   - Unidentified delivery: disabled\n');
        } catch (error) {
            console.log(`   Configuration update note: ${error.message}\n`);
        }

        // Step 7: Set PIN (demonstration - use with caution)
        console.log('7. PIN Management (demonstration)...');
        console.log('   PIN is used for account recovery and registration lock');
        console.log('   Keep your PIN secure and don\'t lose it!');
        console.log('\n   Example code for setting PIN:');
        console.log('      await signal.setPin("123456");');
        console.log('\n   Example code for removing PIN:');
        console.log('      await signal.removePin();\n');

        // Uncomment to actually set/remove PIN:
        // const testPin = '123456';
        // await signal.setPin(testPin);
        // console.log('   PIN set successfully!');
        // await signal.removePin();
        // console.log('   PIN removed successfully!\n');

        // Step 8: List devices linked to account
        console.log('8. Listing linked devices...');
        try {
            const devices = await signal.listDevices();
            console.log(`   Found ${devices.length} device(s):`);
            devices.forEach((device, idx) => {
                console.log(`   ${idx + 1}. Device ID: ${device.id}`);
                if (device.name) console.log(`      Name: ${device.name}`);
                if (device.created) console.log(`      Created: ${new Date(device.created).toLocaleString()}`);
                if (device.lastSeen) console.log(`      Last seen: ${new Date(device.lastSeen).toLocaleString()}`);
            });
            console.log();
        } catch (error) {
            console.log(`   Could not list devices: ${error.message}\n`);
        }

        // Step 9: Account privacy settings
        console.log('9. Account Privacy Best Practices:');
        console.log('   Enable registration lock with PIN for security');
        console.log('   Review linked devices regularly');
        console.log('   Use unidentified delivery for privacy');
        console.log('   Set meaningful device names for tracking');
        console.log('   Keep your account information up to date');
        console.log('   Use Safety Numbers to verify contacts\n');

        // Step 10: Advanced account operations
        console.log('10. Advanced account operations (demonstrations):');
        console.log('\n   Identity Management:');
        console.log('      await signal.listIdentities("+33000000000");');
        console.log('      await signal.trustIdentity(number, safetyNumber, true);\n');

        console.log('   Sync Operations:');
        console.log('      await signal.sendSyncRequest();');
        console.log('      await signal.sendContacts();\n');

        console.log('   Account Removal (CAUTION):');
        console.log('      await signal.unregister(); // Unregister from Signal');
        console.log('      await signal.deleteLocalAccountData(); // Delete local data\n');

        // Step 11: Contact identity verification
        console.log('11. Contact identity verification...');
        try {
            const identities = await signal.listIdentities();
            console.log(`   Found ${identities.length} identity/identities`);
            if (identities.length > 0) {
                console.log('   - Sample identities:');
                identities.slice(0, 3).forEach((identity, idx) => {
                    console.log(`     ${idx + 1}. Number: ${identity.number}`);
                    console.log(`        Fingerprint: ${identity.fingerprint?.substring(0, 20)}...`);
                    console.log(`        Trust: ${identity.trustLevel || 'unknown'}`);
                });
            }
            console.log();
        } catch (error) {
            console.log(`   Identity list note: ${error.message}\n`);
        }

        // Step 12: Summary of account state
        console.log('12. Current Account State Summary:');
        try {
            const accounts = await signal.listAccountsDetailed();
            const devices = await signal.listDevices();
            const version = await signal.getVersion();

            console.log('   ═══════════════════════════════════');
            console.log(`   Account: ${phoneNumber}`);
            console.log(`   signal-cli: ${version.version || 'unknown'}`);
            console.log(`   Devices: ${devices.length}`);
            console.log(`   Total Accounts: ${accounts.length}`);
            console.log('   ═══════════════════════════════════\n');
        } catch (error) {
            console.log(`   Could not generate summary\n`);
        }

        // Summary
        console.log('═══════════════════════════════════════');
        console.log('Account Management Summary:');
        console.log('═══════════════════════════════════════');
        console.log('Listed local accounts');
        console.log('Updated profile information');
        console.log('Updated account settings');
        console.log('Demonstrated PIN management');
        console.log('Listed linked devices');
        console.log('Reviewed identity verification');
        console.log('\nAccount management example completed successfully!');

    } catch (error) {
        console.error('\nERROR: An error occurred:', error.message);
        console.error('\nTroubleshooting:');
        console.error('   • Ensure signal-cli is properly configured');
        console.error('   • Verify your account is registered');
        console.error('   • Check permissions for account modifications');
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
    accountManagementExample().catch(console.error);
}

module.exports = { accountManagementExample };
