/**
 * Example: Sending Voice Notes
 *
 * This example demonstrates how to send voice messages using the
 * voiceNote flag introduced in signal-cli v0.14.2
 *
 * Requirements:
 * - signal-cli v0.14.2 or later
 * - An audio file (e.g., .ogg, .mp3, .m4a)
 */

const { SignalCli } = require('../../dist/index');

async function main() {
    // Initialize the SDK with your phone number
    const signal = new SignalCli('+1234567890');

    try {
        // Connect to signal-cli
        await signal.connect();
        console.log('Connected to signal-cli');

        // Send a voice note to a contact
        // The voiceNote flag tells Signal to display and play this as a voice message
        const result = await signal.sendMessage('+0987654321', '', {
            attachments: ['/path/to/your/voice-message.ogg'],
            voiceNote: true, // Mark as voice note (v0.14.2+)
        });

        console.log('Voice note sent successfully!');
        console.log('Timestamp:', result.timestamp);

        // You can also combine voiceNote with other options
        const resultWithOptions = await signal.sendMessage('+0987654321', '', {
            attachments: ['/path/to/another-message.ogg'],
            voiceNote: true,
            noUrgent: true, // Don't trigger push notification
            expiresInSeconds: 3600, // Disappearing message (1 hour)
        });

        console.log('Voice note with options sent!');
        console.log('Timestamp:', resultWithOptions.timestamp);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        // Always disconnect when done
        await signal.gracefulShutdown();
    }
}

// Run the example
main();
