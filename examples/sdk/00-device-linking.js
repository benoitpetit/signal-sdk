require('dotenv').config();

/**
 * Signal SDK - Device Linking with QR Code
 * 
 * This example demonstrates how to link a new device to your existing Signal account
 * by displaying a QR code directly in the terminal.
 * 
 * Features:
 * - Generate QR code for device linking
 * - Display QR code in terminal
 * - Automatic linking process
 * - No phone number required initially
 * 
 * Prerequisites:
 * - signal-cli installed (or will be auto-downloaded)
 * - Existing Signal account on your phone
 * - Terminal that supports QR code display
 */

const { SignalCli } = require('../../dist');

async function deviceLinking() {
    console.log('Signal SDK - Device Linking');
    console.log('===========================\n');

    try {
        console.log('1. Starting device linking process...');
        console.log('   This will create a QR code to link this device to your Signal account.\n');

        // Initialize SDK without phone number for linking
        console.log('2. Initializing Signal SDK...');
        const signal = new SignalCli();
        signalInstance = signal; // Track for cleanup

        // Start device linking with QR code display
        console.log('3. Generating QR code for device linking...\n');

        const result = await signal.deviceLink({
            name: 'Signal SDK Device',
            qrCodeOutput: 'console'
        });

        if (result.success && result.qrCode) {
            console.log('QR code generated successfully!\n');

            // Show direct link as backup
            console.log('Direct link (backup method):');
            console.log(result.qrCode.uri);
            console.log('');

            // Instructions
            console.log('Instructions:');
            console.log('1. Open Signal on your phone');
            console.log('2. Go to Settings → Linked devices');
            console.log('3. Tap "Link new device"');
            console.log('4. Scan the QR code above');
            console.log('5. Confirm on your phone');
            console.log('');

            if (result.isLinked) {
                console.log('Device linking completed successfully!\n');

                console.log('Next steps:');
                console.log('- Your device is now connected to Signal');
                console.log('- You can use your phone number with the SDK');
                console.log('- Set SIGNAL_PHONE_NUMBER environment variable');
                console.log('- Example: SIGNAL_PHONE_NUMBER="+33111111111" node examples/sdk/01-basic-usage.js');
            } else {
                console.log('QR code displayed. Waiting for you to scan it...');
                console.log('TIP: The linking process may take a few moments after scanning.');
                console.log('TIP: Keep this terminal open until you see the success message.');
                console.log('');
                console.log('After linking:');
                console.log('- Your device will be connected to Signal');
                console.log('- You can use your phone number with the SDK');
                console.log('- Set SIGNAL_PHONE_NUMBER environment variable');
                console.log('- Example: SIGNAL_PHONE_NUMBER="+33111111111" node examples/sdk/01-basic-usage.js');
            }
        } else {
            throw new Error(result.error || 'Device linking failed for unknown reason');
        }

        // Clean shutdown
        await signal.gracefulShutdown();

    } catch (error) {
        console.error('ERROR: Linking failed:', error.message);
        console.error('');
        console.error('Troubleshooting:');
        console.error('- Make sure Signal is installed on your phone');
        console.error('- Check your internet connection');
        console.error('- Ensure Java is installed (required by signal-cli)');
        console.error('- Try running: java --version');
        console.error('');
        console.error('If Java is not installed:');
        console.error('- Ubuntu/Debian: sudo apt update && sudo apt install default-jre');
        console.error('- macOS: brew install openjdk');
        console.error('- Windows: Download from https://java.com/download/');

        process.exit(1);
    }
}

// Track SDK instance for cleanup
let signalInstance = null;

// Handle process termination gracefully
process.on('SIGINT', async () => {
    console.log('\nLinking process interrupted.');
    console.log('TIP: You can restart this script anytime to try again.');

    if (signalInstance) {
        try {
            await signalInstance.gracefulShutdown();
        } catch (error) {
            // Ignore cleanup errors
        }
    }

    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nLinking process terminated.');

    if (signalInstance) {
        try {
            await signalInstance.gracefulShutdown();
        } catch (error) {
            // Ignore cleanup errors
        }
    }

    process.exit(0);
});

// Run the linking process
deviceLinking().catch(error => {
    console.error('FATAL ERROR:', error);
    process.exit(1);
}); 