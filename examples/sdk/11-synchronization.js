require('dotenv').config();

/**
 * Signal SDK - Synchronization Example
 * 
 * This example demonstrates synchronization features:
 * - Syncing contacts with linked devices
 * - Sending sync requests
 * - Listing groups with detailed information
 * - Managing multi-device setups
 * - Handling device linking
 * 
 * Prerequisites:
 * - signal-cli installed and configured
 * - Account registered with signal-cli
 * - Optional: Linked devices for testing sync
 * - Environment variables set
 */

const { SignalCli } = require('../../dist/SignalCli');

async function synchronizationExample() {
    console.log('Signal SDK - Synchronization Example');
    console.log('========================================\n');

    // Configuration
    const phoneNumber = process.env.SIGNAL_PHONE_NUMBER;
    const testGroupId = process.env.SIGNAL_TEST_GROUP_ID; // Optional

    if (!phoneNumber) {
        console.error('ERROR: Missing required environment variables:');
        console.error('   SIGNAL_PHONE_NUMBER - Your Signal phone number');
        console.error('\nOptional:');
        console.error('   SIGNAL_TEST_GROUP_ID - Group ID for filtering tests');
        console.error('\nExample .env file:');
        console.error('   SIGNAL_PHONE_NUMBER="+33111111111"');
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

        // Step 2: Check linked devices
        console.log('2. Checking linked devices...');
        try {
            const devices = await signal.listDevices();
            console.log(`   Found ${devices.length} device(s):`);

            if (devices.length > 0) {
                devices.forEach((device, idx) => {
                    console.log(`   ${idx + 1}. Device ID: ${device.id}`);
                    if (device.name) console.log(`      Name: ${device.name}`);
                    if (device.created) console.log(`      Created: ${new Date(device.created).toLocaleString()}`);
                    if (device.lastSeen) console.log(`      Last seen: ${new Date(device.lastSeen).toLocaleString()}`);
                });

                if (devices.length === 1) {
                    console.log('\n   Only primary device found. Link a device to test sync features!');
                } else {
                    console.log(`\n   Multi-device setup detected (${devices.length} devices)`);
                }
            }
            console.log();
        } catch (error) {
            console.log(`   Could not list devices: ${error.message}\n`);
        }

        // Step 3: Send sync request
        console.log('3. Sending sync request to linked devices...');
        try {
            await signal.sendSyncRequest();
            console.log('   Sync request sent successfully!');
            console.log('   - All linked devices will receive sync data');
            console.log('   - This includes contacts, groups, and settings\n');
        } catch (error) {
            console.log(`   Sync request note: ${error.message}\n`);
        }

        // Step 4: Sync contacts with linked devices
        console.log('4. Syncing contacts with linked devices...');
        try {
            await signal.sendContacts();
            console.log('   Contacts synchronized!');
            console.log('   - Contact list sent to all linked devices');
            console.log('   - Devices will update their contact database\n');
        } catch (error) {
            console.log(`   Contact sync note: ${error.message}\n`);
        }

        // Step 5: List all groups (simple)
        console.log('5. Listing all groups (simple mode)...');
        try {
            const groups = await signal.listGroups();
            console.log(`   Found ${groups.length} group(s):`);

            if (groups.length > 0) {
                groups.slice(0, 5).forEach((group, idx) => {
                    console.log(`   ${idx + 1}. ${group.name || 'Unnamed group'}`);
                    console.log(`      ID: ${group.id?.substring(0, 20)}...`);
                    if (group.members) console.log(`      Members: ${group.members.length}`);
                });

                if (groups.length > 5) {
                    console.log(`   ... and ${groups.length - 5} more groups`);
                }
            }
            console.log();
        } catch (error) {
            console.log(`   Could not list groups: ${error.message}\n`);
        }

        // Step 6: List groups with detailed information
        console.log('6. Listing groups with detailed information...');
        try {
            const detailedGroups = await signal.listGroupsDetailed({
                detailed: true
            });

            console.log(`   Retrieved detailed information for ${detailedGroups.length} group(s):`);

            if (detailedGroups.length > 0) {
                detailedGroups.slice(0, 3).forEach((group, idx) => {
                    console.log(`\n   ${idx + 1}. ${group.name || 'Unnamed group'}`);
                    console.log(`      ID: ${group.id}`);
                    console.log(`      Type: ${group.groupType || 'unknown'}`);
                    if (group.members) {
                        console.log(`      Members: ${group.members.length}`);
                        console.log(`      First members: ${group.members.slice(0, 3).join(', ')}`);
                    }
                    if (group.permissionAddMember) {
                        console.log(`      Add member permission: ${group.permissionAddMember}`);
                    }
                    if (group.permissionEditDetails) {
                        console.log(`      Edit details permission: ${group.permissionEditDetails}`);
                    }
                    if (group.permissionSendMessages) {
                        console.log(`      Send messages permission: ${group.permissionSendMessages}`);
                    }
                });
            }
            console.log();
        } catch (error) {
            console.log(`   Detailed groups note: ${error.message}\n`);
        }

        // Step 7: Filter specific group by ID
        if (testGroupId) {
            console.log('7. Filtering specific group by ID...');
            try {
                const filteredGroups = await signal.listGroupsDetailed({
                    groupIds: [testGroupId],
                    detailed: true
                });

                if (filteredGroups.length > 0) {
                    const group = filteredGroups[0];
                    console.log('   Group found:');
                    console.log(`      Name: ${group.name}`);
                    console.log(`      ID: ${group.id}`);
                    console.log(`      Members: ${group.members?.length || 0}`);
                    if (group.description) {
                        console.log(`      Description: ${group.description}`);
                    }
                } else {
                    console.log('   Group not found with specified ID');
                }
                console.log();
            } catch (error) {
                console.log(`   Group filtering note: ${error.message}\n`);
            }
        } else {
            console.log('7. Skipping group filtering (no SIGNAL_TEST_GROUP_ID set)\n');
        }

        // Step 8: List all contacts
        console.log('8. Listing contacts for sync verification...');
        try {
            const contacts = await signal.listContacts();
            console.log(`   Found ${contacts.length} contact(s)`);

            if (contacts.length > 0) {
                console.log('   - Sample contacts:');
                contacts.slice(0, 5).forEach((contact, idx) => {
                    console.log(`     ${idx + 1}. ${contact.name || 'Unknown'} (${contact.number})`);
                });

                if (contacts.length > 5) {
                    console.log(`     ... and ${contacts.length - 5} more contacts`);
                }
            }
            console.log();
        } catch (error) {
            console.log(`   Could not list contacts: ${error.message}\n`);
        }

        // Step 9: Device linking demonstration
        console.log('9. Device Linking Process (demonstration):');
        console.log('   To link a new device:');
        console.log('      1. const linkResult = await signal.deviceLink({');
        console.log('           deviceName: "My Tablet",');
        console.log('           showQRCode: true');
        console.log('         });');
        console.log('      2. Scan QR code with Signal app on new device');
        console.log('      3. Wait for linking confirmation');
        console.log('      4. New device will sync all data automatically\n');

        // Step 10: Sync best practices
        console.log('10. Synchronization Best Practices:');
        console.log('   Send sync requests after major changes');
        console.log('   Regularly sync contacts to keep devices updated');
        console.log('   Use detailed group queries for specific operations');
        console.log('   Monitor linked devices and remove unused ones');
        console.log('   Sync after adding/removing contacts or groups');
        console.log('   Test sync by checking data on all devices\n');

        // Step 11: Advanced sync operations
        console.log('11. Advanced Sync Operations:');
        console.log('\n   Selective Contact Sync:');
        console.log('      await signal.sendContacts({ numbers: ["+33000000000"] });\n');

        console.log('   Group Membership Sync:');
        console.log('      const groups = await signal.listGroupsDetailed({ detailed: true });');
        console.log('      // Process each group for detailed member info\n');

        console.log('   Identity Sync:');
        console.log('      await signal.sendSyncRequest();');
        console.log('      // Syncs safety numbers and trust levels\n');

        // Step 12: Monitoring sync status
        console.log('12. Monitoring Sync Status:');
        try {
            const devices = await signal.listDevices();
            const groups = await signal.listGroups();
            const contacts = await signal.listContacts();

            console.log('   ═══════════════════════════════════');
            console.log('   Current Sync State:');
            console.log('   ═══════════════════════════════════');
            console.log(`   Linked devices: ${devices.length}`);
            console.log(`   👥 Groups: ${groups.length}`);
            console.log(`   📇 Contacts: ${contacts.length}`);
            console.log('   ═══════════════════════════════════\n');

            if (devices.length > 1) {
                console.log('   Multi-device setup active - sync operations available');
            } else {
                console.log('   Single device - sync operations will be ready after linking');
            }
            console.log();
        } catch (error) {
            console.log(`   Could not generate sync status\n`);
        }

        // Summary
        console.log('═══════════════════════════════════════');
        console.log('Synchronization Summary:');
        console.log('═══════════════════════════════════════');
        console.log('Checked linked devices');
        console.log('Sent sync request');
        console.log('Synchronized contacts');
        console.log('Listed groups (simple & detailed)');
        if (testGroupId) {
            console.log('Filtered specific group');
        }
        console.log('Demonstrated device linking');
        console.log('\nSynchronization example completed successfully!');

    } catch (error) {
        console.error('\nERROR: An error occurred:', error.message);
        console.error('\nTroubleshooting:');
        console.error('   • Ensure signal-cli is properly configured');
        console.error('   • Verify your account is registered');
        console.error('   • Check that linked devices are online');
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
    synchronizationExample().catch(console.error);
}

module.exports = { synchronizationExample };
