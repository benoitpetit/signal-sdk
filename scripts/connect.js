#!/usr/bin/env node

/**
 * Signal SDK - Device Connection Script
 * 
 * This script allows you to link a new device to an existing Signal account
 * by generating and displaying a QR code that can be scanned with your phone.
 * 
 * Usage:
 *   node scripts/connect.js [device-name]
 * 
 * Examples:
 *   node scripts/connect.js
 *   node scripts/connect.js "My Bot Device"
 *   npx signal-sdk connect
 *   npx signal-sdk connect "My Custom Device"
 */

const { SignalCli } = require('../dist/SignalCli');

async function connectDevice() {
    console.log('🔗 Signal SDK - Device Connection');
    console.log('==================================\n');

    // Get device name from command line arguments
    const deviceName = process.argv[2] || 'Signal SDK Device';
    
    console.log(`📱 Device name: ${deviceName}`);
    console.log('⏳ Generating QR code for device linking...\n');

    // Initialize the SDK without an account (for linking)
    const signalCli = new SignalCli();

    try {
        // Start device linking with QR code output to console
        const linkingResult = await signalCli.deviceLink({
            name: deviceName,
            qrCodeOutput: 'console'
        });

        if (linkingResult.success) {
            if (linkingResult.isLinked) {
                console.log('✅ Device successfully linked!');
                console.log(`📱 Device name: ${linkingResult.deviceName}`);
                console.log('\n🎉 You can now use this device to send and receive Signal messages.');
                console.log('\n💡 Next steps:');
                console.log('   1. Import SignalCli in your Node.js project');
                console.log('   2. Initialize with your phone number');
                console.log('   3. Start sending and receiving messages');
                console.log('\n📖 Example usage:');
                console.log('   const { SignalCli } = require("signal-sdk");');
                console.log('   const signalCli = new SignalCli(undefined, "+YourPhoneNumber");');
                console.log('   await signalCli.connect();');
            } else {
                console.log('📋 QR code generated successfully!');
                console.log('📱 Scan the QR code above with your Signal app to link this device.');
                console.log('\n📝 Instructions:');
                console.log('   1. Open Signal on your phone');
                console.log('   2. Go to Settings > Linked devices');
                console.log('   3. Tap "Link new device"');
                console.log('   4. Scan the QR code displayed above');
                console.log('\n⏳ Waiting for device linking...');
                console.log('   (This process may take a few moments)');
            }
        } else {
            console.error('❌ Device linking failed');
            if (linkingResult.error) {
                console.error(`   Error: ${linkingResult.error}`);
            }
            console.error('\n🔧 Troubleshooting:');
            console.error('   • Make sure signal-cli is properly installed');
            console.error('   • Check your internet connection');
            console.error('   • Ensure your Signal app is up to date');
            console.error('   • Try running the command again');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Fatal error during device linking:', error.message);
        console.error('\n🔧 Common solutions:');
        console.error('   • Install signal-cli: https://github.com/AsamK/signal-cli');
        console.error('   • Make sure Java is installed and accessible');
        console.error('   • Check that signal-cli is in your PATH');
        console.error('   • Verify your internet connection');
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n⏹️  Device linking cancelled by user.');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n⏹️  Device linking terminated.');
    process.exit(0);
});

// Display help if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('Signal SDK - Device Connection Script');
    console.log('=====================================\n');
    console.log('Usage:');
    console.log('  node scripts/connect.js [device-name]');
    console.log('  npx signal-sdk connect [device-name]\n');
    console.log('Arguments:');
    console.log('  device-name    Optional name for the linked device (default: "Signal SDK Device")\n');
    console.log('Examples:');
    console.log('  node scripts/connect.js');
    console.log('  node scripts/connect.js "My Bot Device"');
    console.log('  npx signal-sdk connect');
    console.log('  npx signal-sdk connect "My Custom Device"\n');
    console.log('This script generates a QR code that you can scan with your Signal app');
    console.log('to link a new device for use with the Signal SDK.');
    process.exit(0);
}

// Run the connection process
connectDevice();
