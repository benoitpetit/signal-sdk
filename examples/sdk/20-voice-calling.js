/**
 * Example: Voice and Video Calling
 *
 * This example demonstrates how to use the voice/video calling
 * features introduced in signal-cli v0.14.2
 *
 * Requirements:
 * - signal-cli v0.14.2 or later
 */

const { SignalCli } = require('../../dist/index');

async function main() {
    // Initialize the SDK with your phone number
    const signal = new SignalCli('+1234567890');

    try {
        // Connect to signal-cli
        await signal.connect();
        console.log('Connected to signal-cli');

        // Listen for incoming calls
        signal.on('call', async (callEvent) => {
            console.log('Incoming call event:', callEvent);

            const { callId, type, direction, sender } = callEvent;

            if (direction === 'incoming') {
                console.log(`Incoming ${type} call from ${sender}`);
                console.log(`Call ID: ${callId}`);

                // Accept the call
                try {
                    await signal.acceptCall({ callId });
                    console.log('Call accepted');
                } catch (error) {
                    console.error('Failed to accept call:', error.message);
                }

                // Hang up after 10 seconds (for demo purposes)
                setTimeout(async () => {
                    try {
                        await signal.hangUpCall({ callId });
                        console.log('Call hung up');
                    } catch (error) {
                        console.error('Failed to hang up:', error.message);
                    }
                }, 10000);
            }
        });

        // Example: Start an outgoing voice call
        console.log('Starting a voice call...');
        const voiceCall = await signal.startCall({
            recipient: '+0987654321',
        });
        console.log('Voice call started:', voiceCall);

        // Hang up the voice call after 5 seconds
        setTimeout(async () => {
            try {
                await signal.hangUpCall({ callId: voiceCall.callId });
                console.log('Voice call hung up');
            } catch (error) {
                console.error('Failed to hang up:', error.message);
            }
        }, 5000);

        // Example: Start a video call
        setTimeout(async () => {
            try {
                console.log('Starting a video call...');
                const videoCall = await signal.startCall({
                    recipient: '+0987654321',
                    video: true, // Enable video
                });
                console.log('Video call started:', videoCall);

                // Hang up after 5 seconds
                setTimeout(async () => {
                    try {
                        await signal.hangUpCall({ callId: videoCall.callId });
                        console.log('Video call hung up');
                    } catch (error) {
                        console.error('Failed to hang up:', error.message);
                    }
                }, 5000);
            } catch (error) {
                console.error('Failed to start video call:', error.message);
            }
        }, 6000);

        // Keep the process running to receive call events
        console.log('Waiting for calls... (Press Ctrl+C to exit)');

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\nShutting down...');
            await signal.gracefulShutdown();
            process.exit(0);
        });

    } catch (error) {
        console.error('Error:', error.message);
        await signal.gracefulShutdown();
    }
}

// Run the example
main().catch(console.error);
