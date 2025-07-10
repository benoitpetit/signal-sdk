require('dotenv').config();

/**
 * 👥 Signal SDK - Group Management Example
 * 
 * This example demonstrates comprehensive group management features:
 * - Listing existing groups
 * - Creating new groups
 * - Adding/removing members
 * - Updating group details
 * - Managing group permissions
 * - Leaving groups
 * 
 * Prerequisites:
 * - signal-cli installed and configured
 * - Account registered with signal-cli
 * - Environment variables set
 */

const { SignalCli } = require('../../dist/SignalCli');

async function groupManagementExample() {
    console.log('👥 Signal SDK - Group Management Example');
    console.log('=========================================\n');

    // Configuration
    const phoneNumber = process.env.SIGNAL_PHONE_NUMBER;
    const testMember = process.env.SIGNAL_ADMIN_NUMBER;

    if (!phoneNumber || !testMember) {
        console.error('ERROR: Missing required environment variables:');
        console.error('   SIGNAL_PHONE_NUMBER - Your Signal phone number');
        console.error('   SIGNAL_TEST_MEMBER - Test member to add to groups');
        console.error('\nExample .env file:');
        console.error('   SIGNAL_PHONE_NUMBER="+33111111111"');
        console.error('   SIGNAL_TEST_MEMBER="+33000000000"');
        process.exit(1);
    }

    // Initialize SDK
    const signal = new SignalCli(undefined, phoneNumber);

    try {
        // Step 1: Connect
        console.log('1. Connecting to signal-cli...');
        await signal.connect();
        console.log('   - Connected successfully!\n');

        // Step 2: List existing groups
        console.log('2. Listing existing groups...');
        const existingGroups = await signal.listGroups();
        console.log(`   - Found ${existingGroups.length} groups:`);
        
        if (existingGroups.length > 0) {
            existingGroups.forEach((group, index) => {
                const memberCount = group.members ? group.members.length : 0;
                const description = group.description || 'No description';
                console.log(`   ${index + 1}. ${group.name} (${memberCount} members)`);
                console.log(`      - ${description}`);
                console.log(`      - ID: ${group.groupId}`);
                console.log(`      - Is Admin: ${group.isAdmin ? 'Yes' : 'No'}`);
                console.log(`      - Is Member: ${group.isMember ? 'Yes' : 'No'}`);
                console.log();
            });
        } else {
            console.log('   - No groups found\n');
        }

        // Step 3: Create a new test group
        console.log('3. Creating a new test group...');
        const testGroupName = `SDK Test Group ${Date.now()}`;
        const initialMembers = [testMember];

        try {
            const newGroup = await signal.createGroup(testGroupName, initialMembers);
            console.log(`   - Group created successfully!`);
            console.log(`   - Name: ${testGroupName}`);
            console.log(`   - ID: ${newGroup.groupId}`);
            console.log(`   - Initial members: ${initialMembers.length}\n`);

            // Store group ID for later operations
            const testGroupId = newGroup.groupId;

            // Step 4: Update group details
            console.log('4. Updating group details...');
            const updateOptions = {
                description: 'This is a test group created by the Signal SDK Group Management example',
                permissionAddMember: 'ONLY_ADMINS',
                permissionEditDetails: 'ONLY_ADMINS',
                permissionSendMessage: 'EVERY_MEMBER'
            };

            await signal.updateGroup(testGroupId, updateOptions);
            console.log('   - Group details updated successfully!');
            console.log(`   - Description: ${updateOptions.description}`);
            console.log(`   - Permissions configured\n`);

            // Step 5: Send a message to the group
            console.log('5. Sending message to the group...');
            const groupMessage = `Welcome to ${testGroupName}!\n\n` +
                               `This group was created by the Signal SDK Group Management example.\n\n` +
                               `Group Info:\n` +
                               `- Created: ${new Date().toLocaleString()}\n` +
                               `- Creator: ${phoneNumber}\n` +
                               `- Initial Members: ${initialMembers.length}\n` +
                               `- SDK Version: Latest\n\n` +
                               `Ready to test group features!`;

            await signal.sendMessage(testGroupId, groupMessage);
            console.log('   - Welcome message sent to group!\n');

            // Step 6: List group members
            console.log('6. 👥 Checking group members...');
            const updatedGroups = await signal.listGroups();
            const currentGroup = updatedGroups.find(g => g.groupId === testGroupId);
            
            if (currentGroup && currentGroup.members) {
                console.log(`   - Group has ${currentGroup.members.length} members:`);
                currentGroup.members.forEach((member, index) => {
                    const memberInfo = typeof member === 'string' ? member : member.number;
                    const memberName = typeof member === 'object' ? member.name : 'Unknown';
                    console.log(`   ${index + 1}. ${memberName} (${memberInfo})`);
                });
            } else {
                console.log('   - Could not retrieve member list');
            }
            console.log();

            // Step 7: Demonstrate group permissions
            console.log('7. Testing group permissions...');
            
            // Try to add another member (if we have one)
            if (process.env.SIGNAL_ADDITIONAL_MEMBER) {
                try {
                    await signal.updateGroup(testGroupId, {
                        addMembers: [process.env.SIGNAL_ADDITIONAL_MEMBER]
                    });
                    console.log('   - Additional member added successfully!');
                } catch (error) {
                    console.log('   - Could not add additional member:', error.message);
                }
            } else {
                console.log('   - No additional member specified (SIGNAL_ADDITIONAL_MEMBER)');
            }
            console.log();

            // Step 8: Send a file to the group
            console.log('8. Sending file to group...');
            const fs = require('fs');
            if (fs.existsSync('README.md')) {
                await signal.sendMessage(testGroupId, '📚 Here is the project README:', {
                    attachments: ['README.md']
                });
                console.log('   - File sent to group!\n');
            } else {
                console.log('   - No README.md found, skipping file send\n');
            }

            // Step 9: Final group summary
            console.log('9. Sending group summary...');
            const finalGroups = await signal.listGroups();
            const finalGroup = finalGroups.find(g => g.groupId === testGroupId);
            
            const summary = `Group Management Example Complete!\n\n` +
                          `Test Group Details:\n` +
                          `- Name: ${testGroupName}\n` +
                          `- ID: ${testGroupId}\n` +
                          `- Members: ${finalGroup?.members?.length || 0}\n` +
                          `- Admin: ${finalGroup?.isAdmin ? 'Yes' : 'No'}\n` +
                          `- Created: ${new Date().toLocaleString()}\n\n` +
                          `- All group operations completed successfully!\n\n` +
                          `TIP: Note: This is a test group. You can leave it after testing.`;

            await signal.sendMessage(testGroupId, summary);
            console.log('   - Group summary sent!\n');

            console.log('Group management example completed successfully!');
            console.log(`TIP: Test group ID: ${testGroupId}`);
            console.log('TIP: You can use this ID for further testing or leave the group when done.');

        } catch (groupError) {
            console.error('ERROR: Error with group operations:', groupError.message);
            
            if (groupError.message.includes('Method not implemented')) {
                console.error('\nTIP: Group creation not supported by your signal-cli version.');
                console.error('   This is normal for some signal-cli versions.');
                console.error('   The example will demonstrate other group operations with existing groups.');
                
                // Fall back to demonstrating with existing groups
                if (existingGroups.length > 0) {
                    console.log('\nDemonstrating with existing group...');
                    const testGroup = existingGroups[0];
                    
                    console.log(`Sending test message to: ${testGroup.name}`);
                    const testMessage = `Group Management Test Message\n\n` +
                                      `- Sent from: Signal SDK Group Management Example\n` +
                                      `- Time: ${new Date().toLocaleString()}\n\n` +
                                      `- This message demonstrates group messaging capabilities.`;
                    
                    await signal.sendMessage(testGroup.groupId, testMessage);
                    console.log('   - Test message sent to existing group!');
                }
            } else {
                throw groupError;
            }
        }

    } catch (error) {
        console.error('ERROR: Error occurred:', error.message);
        console.error('\nTIP: Troubleshooting:');
        console.error('   • Verify signal-cli is properly configured');
        console.error('   • Check that phone numbers are valid');
        console.error('   • Ensure you have permission to create groups');
        console.error('   • Try with existing groups first');
        process.exit(1);
    } finally {
        // Clean shutdown
        console.log('- Disconnecting from signal-cli...');
        await signal.gracefulShutdown();
        console.log('- Disconnected successfully!');
    }
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
    console.log('\n- Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

// Run the example
groupManagementExample().catch(error => {
    console.error('ERROR: Fatal error:', error);
    process.exit(1);
}); 