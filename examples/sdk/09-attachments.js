require('dotenv').config();
const fs = require('fs');
const path = require('path');

/**
 * Signal SDK - Attachments Retrieval Example
 * 
 * This example demonstrates attachment retrieval features:
 * - Getting attachments in base64 format
 * - Retrieving contact avatars
 * - Retrieving group avatars
 * - Retrieving profile avatars
 * - Getting sticker data
 * - Saving retrieved data to files
 * 
 * Prerequisites:
 * - signal-cli installed and configured
 * - Account registered with signal-cli
 * - Environment variables set
 * - Some messages with attachments received
 */

const { SignalCli } = require('../../dist/SignalCli');

async function attachmentsExample() {
    console.log('Signal SDK - Attachments Retrieval Example');
    console.log('==============================================\n');

    // Configuration
    const phoneNumber = process.env.SIGNAL_PHONE_NUMBER;
    const testContact = process.env.SIGNAL_ADMIN_NUMBER;
    const testGroupId = process.env.SIGNAL_TEST_GROUP_ID; // Optional

    if (!phoneNumber || !testContact) {
        console.error('ERROR: Missing required environment variables:');
        console.error('   SIGNAL_PHONE_NUMBER - Your Signal phone number');
        console.error('   SIGNAL_ADMIN_NUMBER - Contact number to test');
        console.error('\nOptional:');
        console.error('   SIGNAL_TEST_GROUP_ID - Group ID for avatar testing');
        console.error('\nExample .env file:');
        console.error('   SIGNAL_PHONE_NUMBER="+33111111111"');
        console.error('   SIGNAL_ADMIN_NUMBER="+33000000000"');
        console.error('   SIGNAL_TEST_GROUP_ID="group-id-here"');
        process.exit(1);
    }

    // Initialize SDK
    const signal = new SignalCli(phoneNumber);

    // Create output directory for saved attachments
    const outputDir = path.join(__dirname, 'retrieved-attachments');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
        // Step 1: Connect
        console.log('1. Connecting to signal-cli...');
        await signal.connect();
        console.log('   Connected successfully!\n');

        // Step 2: Get attachment from a message
        console.log('2. Demonstrating attachment retrieval...');
        console.log('   To retrieve an attachment, you need:');
        console.log('      - attachmentId: ID of the attachment');
        console.log('      - Example: "12345678901234567890"\n');

        // Example of how to get attachment (requires real attachment ID)
        const exampleAttachmentId = '12345678901234567890';
        console.log(`   Example code for attachment retrieval:`);
        console.log(`      const base64Data = await signal.getAttachment({`);
        console.log(`        attachmentId: '${exampleAttachmentId}'`);
        console.log(`      });`);
        console.log(`      // base64Data contains the attachment in base64 format\n`);

        // Step 3: Listen for messages with attachments
        console.log('3. Listening for messages with attachments...');
        console.log('   Send a message with an attachment to test this feature');
        console.log('   Listening for 15 seconds...\n');

        let attachmentFound = false;
        const messageHandler = async (msg) => {
            const envelope = msg.envelope;
            const dataMessage = envelope?.dataMessage;

            if (dataMessage?.attachments && dataMessage.attachments.length > 0) {
                console.log('   Message with attachment received!');
                console.log(`   - From: ${envelope.source || envelope.sourceNumber}`);
                console.log(`   - Attachments: ${dataMessage.attachments.length}`);

                // Process each attachment
                for (let i = 0; i < dataMessage.attachments.length; i++) {
                    const attachment = dataMessage.attachments[i];
                    console.log(`\n   Attachment ${i + 1}:`);
                    console.log(`      - ID: ${attachment.id}`);
                    console.log(`      - Content Type: ${attachment.contentType || 'unknown'}`);
                    console.log(`      - Size: ${attachment.size || 'unknown'} bytes`);
                    console.log(`      - Filename: ${attachment.filename || 'unnamed'}`);

                    try {
                        console.log(`      - Retrieving attachment data...`);
                        const base64Data = await signal.getAttachment({
                            attachmentId: attachment.id
                        });

                        console.log(`      Attachment retrieved! (${base64Data.length} chars in base64)`);

                        // Save to file
                        const filename = attachment.filename || `attachment_${i + 1}.bin`;
                        const filepath = path.join(outputDir, filename);
                        const buffer = Buffer.from(base64Data, 'base64');
                        fs.writeFileSync(filepath, buffer);

                        console.log(`      Saved to: ${filepath}`);
                        attachmentFound = true;
                    } catch (error) {
                        console.log(`      Failed to retrieve: ${error.message}`);
                    }
                }
                console.log();
            }
        };

        signal.on('message', messageHandler);
        await new Promise(resolve => setTimeout(resolve, 15000));
        signal.off('message', messageHandler);

        if (!attachmentFound) {
            console.log('   No attachments received during listening period\n');
        }

        // Step 4: Get contact avatar
        console.log('4. Retrieving contact avatar...');
        try {
            const contactAvatar = await signal.getAvatar({
                type: 'contact',
                number: testContact
            });

            if (contactAvatar) {
                console.log(`   Contact avatar retrieved!`);
                console.log(`   - Size: ${contactAvatar.length} chars (base64)`);

                // Save avatar
                const avatarPath = path.join(outputDir, `contact_${testContact.replace('+', '')}_avatar.jpg`);
                const avatarBuffer = Buffer.from(contactAvatar, 'base64');
                fs.writeFileSync(avatarPath, avatarBuffer);
                console.log(`   Saved to: ${avatarPath}\n`);
            }
        } catch (error) {
            console.log(`   Contact avatar not available: ${error.message}\n`);
        }

        // Step 5: Get profile avatar (your own avatar)
        console.log('5. Retrieving your profile avatar...');
        try {
            const profileAvatar = await signal.getAvatar({
                type: 'profile'
            });

            if (profileAvatar) {
                console.log(`   Profile avatar retrieved!`);
                console.log(`   - Size: ${profileAvatar.length} chars (base64)`);

                const profileAvatarPath = path.join(outputDir, 'my_profile_avatar.jpg');
                const profileBuffer = Buffer.from(profileAvatar, 'base64');
                fs.writeFileSync(profileAvatarPath, profileBuffer);
                console.log(`   Saved to: ${profileAvatarPath}\n`);
            }
        } catch (error) {
            console.log(`   Profile avatar not available: ${error.message}\n`);
        }

        // Step 6: Get group avatar (if group ID available)
        if (testGroupId) {
            console.log('6. Retrieving group avatar...');
            try {
                const groupAvatar = await signal.getAvatar({
                    type: 'group',
                    groupId: testGroupId
                });

                if (groupAvatar) {
                    console.log(`   Group avatar retrieved!`);
                    console.log(`   - Size: ${groupAvatar.length} chars (base64)`);

                    const groupAvatarPath = path.join(outputDir, 'group_avatar.jpg');
                    const groupBuffer = Buffer.from(groupAvatar, 'base64');
                    fs.writeFileSync(groupAvatarPath, groupBuffer);
                    console.log(`   Saved to: ${groupAvatarPath}\n`);
                }
            } catch (error) {
                console.log(`   Group avatar not available: ${error.message}\n`);
            }
        } else {
            console.log('6. Skipping group avatar (no SIGNAL_TEST_GROUP_ID set)\n');
        }

        // Step 7: Get sticker data
        console.log('7. Demonstrating sticker retrieval...');
        console.log('   To retrieve a sticker, you need:');
        console.log('      - packId: Sticker pack ID');
        console.log('      - stickerId: Specific sticker ID within pack');
        console.log('      - packKey: Pack encryption key\n');

        console.log('   Example code for sticker retrieval:');
        console.log('      const stickerData = await signal.getSticker({');
        console.log('        packId: "pack-id-here",');
        console.log('        stickerId: 0,');
        console.log('        packKey: "pack-key-here"');
        console.log('      });\n');

        // List available sticker packs
        console.log('   Listing installed sticker packs...');
        try {
            const stickerPacks = await signal.listStickerPacks();
            console.log(`   - Found ${stickerPacks.length} sticker pack(s)`);

            if (stickerPacks.length > 0) {
                console.log('   - Installed packs:');
                stickerPacks.slice(0, 3).forEach((pack, idx) => {
                    console.log(`     ${idx + 1}. Pack ID: ${pack.id}`);
                    if (pack.title) console.log(`        Title: ${pack.title}`);
                });

                // Try to get first sticker from first pack
                if (stickerPacks[0].id && stickerPacks[0].key) {
                    console.log(`\n   Attempting to retrieve sticker from first pack...`);
                    try {
                        const stickerData = await signal.getSticker({
                            packId: stickerPacks[0].id,
                            stickerId: 0,
                            packKey: stickerPacks[0].key
                        });

                        console.log(`   Sticker retrieved!`);
                        console.log(`   - Size: ${stickerData.length} chars (base64)`);

                        const stickerPath = path.join(outputDir, 'sticker_0.webp');
                        const stickerBuffer = Buffer.from(stickerData, 'base64');
                        fs.writeFileSync(stickerPath, stickerBuffer);
                        console.log(`   Saved to: ${stickerPath}`);
                    } catch (error) {
                        console.log(`   Sticker retrieval failed: ${error.message}`);
                    }
                }
            }
        } catch (error) {
            console.log(`   Could not list sticker packs: ${error.message}`);
        }
        console.log();

        // Step 8: Best practices
        console.log('8. Attachment Retrieval Best Practices:');
        console.log('   Always check if attachment exists before retrieval');
        console.log('   Handle base64 data properly (decode before saving)');
        console.log('   Store attachment IDs from received messages');
        console.log('   Use appropriate file extensions based on contentType');
        console.log('   Implement error handling for missing/deleted attachments');
        console.log('   Consider file size limits when processing attachments\n');

        // Summary
        console.log('═══════════════════════════════════════');
        console.log('Attachments Example Summary:');
        console.log('═══════════════════════════════════════');
        console.log('Demonstrated attachment retrieval process');
        console.log('Retrieved contact avatar (if available)');
        console.log('Retrieved profile avatar (if available)');
        if (testGroupId) {
            console.log('Retrieved group avatar (if available)');
        }
        console.log('Demonstrated sticker retrieval process');
        console.log(`Files saved to: ${outputDir}`);
        console.log('\nAttachments example completed successfully!');

    } catch (error) {
        console.error('\nERROR: An error occurred:', error.message);
        console.error('\nTroubleshooting:');
        console.error('   • Ensure signal-cli is properly configured');
        console.error('   • Verify attachment IDs are valid');
        console.error('   • Check that contacts have avatars set');
        console.error('   • Ensure sufficient disk space for saving files');
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
    attachmentsExample().catch(console.error);
}

module.exports = { attachmentsExample };
