/**
 * Example: Advanced Signal CLI SDK Features
 * 
 * This example demonstrates the newly implemented features:
 * - Contact management (removal)
 * - User status checking
 * - Payment notifications
 * - Custom sticker pack upload
 * - Rate limit challenge handling
 * - Phone number change process
 */

const { SignalCli } = require('../../dist');

async function demonstrateAdvancedFeatures() {
    const signal = new SignalCli(process.env.SIGNAL_PHONE_NUMBER);

    try {
        console.log('Connecting to Signal CLI...');
        await signal.connect();

        // 1. Contact Management
        console.log('\nContact Management:');

        // Remove a contact (hide from list but keep data)
        await signal.removeContact('+1234567890', { hide: true });
        console.log('Contact hidden from list');

        // Remove a contact completely (delete all data)
        await signal.removeContact('+0987654321', { forget: true });
        console.log('Contact data completely removed');

        // 2. User Status Checking
        console.log('\n🔍 Checking User Registration Status:');

        const userStatus = await signal.getUserStatus([
            '+1234567890',
            '+0987654321',
            '+1122334455'
        ]);

        userStatus.forEach(status => {
            console.log(`${status.number}: ${status.isRegistered ? 'Registered' : 'Not registered'}`);
            if (status.uuid) console.log(`   UUID: ${status.uuid}`);
        });

        // 3. Payment Notifications
        console.log('\nSending Payment Notification:');

        const paymentReceipt = 'base64-encoded-receipt-data'; // Your actual receipt data
        await signal.sendPaymentNotification('+1234567890', {
            receipt: paymentReceipt,
            note: 'Payment for coffee'
        });
        console.log('Payment notification sent');

        // 4. Custom Sticker Pack Upload
        console.log('\nUploading Custom Sticker Pack:');

        try {
            const stickerResult = await signal.uploadStickerPack({
                path: './sticker-pack/manifest.json', // Path to your sticker pack
                title: 'My Custom Stickers',
                author: 'Signal SDK User'
            });

            console.log('Sticker pack uploaded successfully!');
            console.log(`Pack ID: ${stickerResult.packId}`);
            console.log(`Pack Key: ${stickerResult.packKey}`);
            if (stickerResult.installUrl) {
                console.log(`Install URL: ${stickerResult.installUrl}`);
            }
        } catch (error) {
            console.log('Sticker pack upload failed:', error.message);
        }

        // 5. Rate Limit Challenge (demonstration)
        console.log('\nRate Limit Challenge Handling:');

        try {
            // This would normally be called when you receive a rate limit error
            const challengeResult = await signal.submitRateLimitChallenge(
                'challenge-token-from-error',
                'captcha-solution-token'
            );

            if (challengeResult.success) {
                console.log('Rate limit challenge successful');
            } else {
                console.log(`Challenge failed: ${challengeResult.message}`);
                if (challengeResult.retryAfter) {
                    console.log(`Retry after: ${challengeResult.retryAfter} seconds`);
                }
            }
        } catch (error) {
            console.log('Rate limit challenge demo (would be used during actual rate limiting)');
        }

        // 6. Phone Number Change Process
        console.log('\nPhone Number Change Process (Demo):');

        try {
            // Start the change process (demo only - don't actually change numbers!)
            console.log('This is a demonstration - not actually changing numbers');

            // const changeSession = await signal.startChangeNumber('+1999999999');
            // console.log(`Change session started: ${changeSession.session}`);
            // console.log('Check your SMS for verification code');

            // // After receiving the code:
            // await signal.finishChangeNumber('123456'); // The SMS code
            // console.log('Phone number changed successfully');

            console.log('Use startChangeNumber() and finishChangeNumber() for actual changes');
        } catch (error) {
            console.log('Phone number change demo completed');
        }

        // 7. Enhanced Message Sending with Progress
        console.log('\nEnhanced Message Sending:');

        await signal.sendMessageWithProgress(
            '+1234567890',
            'Message with progress tracking!',
            {
                attachments: ['./large-file.jpg'], // Demo file
                onProgress: (progress) => {
                    console.log(`Upload progress: ${progress.percentage}%`);
                }
            }
        );
        console.log('Enhanced message sent');

        console.log('\nAll advanced features demonstrated successfully!');

    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        console.log('\nDisconnecting...');
        await signal.gracefulShutdown();
    }
}

// Error handling for rate limits
function handleRateLimit(error, signal) {
    if (error.message.includes('proof required')) {
        console.log('Rate limit detected - you would solve a captcha and call:');
        console.log('signal.submitRateLimitChallenge(challengeToken, captchaToken)');
    }
}

// Helper function to create a simple sticker pack manifest
function createStickerManifest() {
    const manifest = {
        title: "My Custom Stickers",
        author: "Signal SDK User",
        cover: {
            id: 0,
            emoji: "😀"
        },
        stickers: [
            { id: 0, emoji: "😀" },
            { id: 1, emoji: "😎" },
            { id: 2, emoji: "🎉" }
        ]
    };

    return JSON.stringify(manifest, null, 2);
}

// Run the demonstration
if (require.main === module) {
    // Check environment variables
    if (!process.env.SIGNAL_PHONE_NUMBER) {
        console.error('Please set SIGNAL_PHONE_NUMBER environment variable');
        console.log('Example: export SIGNAL_PHONE_NUMBER="+1234567890"');
        process.exit(1);
    }

    console.log('Signal CLI SDK - Advanced Features Demo');
    console.log('=========================================');

    demonstrateAdvancedFeatures()
        .then(() => {
            console.log('\nDemo completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\nDemo failed:', error.message);
            process.exit(1);
        });
}

module.exports = {
    demonstrateAdvancedFeatures,
    handleRateLimit,
    createStickerManifest
};
