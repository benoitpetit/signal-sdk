/**
 * Cross-Platform Setup and Usage Example
 * 
 * This example demonstrates how the Signal CLI SDK works across different platforms
 * and how to properly set up signal-cli on Windows, Linux, and macOS.
 */

const { SignalCli } = require('../../dist');
const fs = require('fs');
const path = require('path');

async function checkPlatformSetup() {
    console.log('🔍 Signal CLI SDK - Cross-Platform Setup Check');
    console.log('============================================');

    const platform = process.platform;
    console.log(`📱 Detected platform: ${platform}`);

    // Check signal-cli installation
    const signal = new SignalCli();
    const signalCliPath = signal.signalCliPath;
    console.log(`signal-cli path: ${signalCliPath}`);

    // Check if signal-cli exists
    if (fs.existsSync(signalCliPath)) {
        console.log('signal-cli binary found');

        // Check executable permissions on Unix systems
        if (platform !== 'win32') {
            try {
                const stats = fs.statSync(signalCliPath);
                const mode = (stats.mode & 0o777).toString(8);
                console.log(`File permissions: ${mode}`);

                if (stats.mode & 0o111) {
                    console.log('signal-cli is executable');
                } else {
                    console.log('signal-cli may not be executable');
                    console.log('   Run: chmod +x ' + signalCliPath);
                }
            } catch (error) {
                console.log('Could not check file permissions');
            }
        }
    } else {
        console.log('signal-cli binary not found');
        console.log('   Run: npm run install:signal-cli');
        return false;
    }

    // Platform-specific setup instructions
    console.log('\nPlatform-specific setup:');

    switch (platform) {
        case 'win32':
            console.log('Windows Setup:');
            console.log('   1. Install Java: https://www.oracle.com/java/technologies/downloads/');
            console.log('   2. signal-cli.bat will be used automatically');
            console.log('   3. Test with: java -version');
            break;

        case 'linux':
            console.log('Linux Setup:');
            console.log('   1. Install Java: sudo apt update && sudo apt install default-jre');
            console.log('   2. signal-cli shell script will be used');
            console.log('   3. Test with: java -version');
            break;

        case 'darwin':
            console.log('macOS Setup:');
            console.log('   1. Install Java: brew install openjdk');
            console.log('   2. signal-cli shell script will be used');
            console.log('   3. Test with: java -version');
            break;

        default:
            console.log(`Unsupported platform: ${platform}`);
            console.log('   May work with manual Java installation');
            break;
    }

    return true;
}

async function testBasicFunctionality() {
    console.log('\nTesting Basic Functionality');
    console.log('==============================');

    if (!process.env.SIGNAL_PHONE_NUMBER) {
        console.log('SIGNAL_PHONE_NUMBER not set - skipping connection test');
        console.log('Set environment variable to test: export SIGNAL_PHONE_NUMBER="+1234567890"');
        return;
    }

    const signal = new SignalCli(undefined, process.env.SIGNAL_PHONE_NUMBER);

    try {
        console.log('- Testing connection...');
        await signal.connect();
        console.log('- Connection successful');

        // Test version command
        try {
            const version = await signal.getVersion();
            console.log(`signal-cli version: ${version}`);
        } catch (error) {
            console.log('Could not get version (normal if not registered)');
        }

        console.log('- Disconnecting...');
        await signal.gracefulShutdown();
        console.log('- Disconnection successful');

    } catch (error) {
        console.error('Connection failed:', error.message);

        if (error.message.includes('ENOENT')) {
            console.log('TIP: Solution: Make sure signal-cli is installed and executable');
        } else if (error.message.includes('java')) {
            console.log('TIP: Solution: Install Java runtime');
        }
    }
}

function showUsageExamples() {
    console.log('\nCross-Platform Usage Examples');
    console.log('===============================');

    console.log(`
// Basic usage (works on all platforms)
const { SignalCli } = require('signal-cli-sdk');
const signal = new SignalCli(undefined, '+1234567890');

await signal.connect();
await signal.sendMessage('+0987654321', 'Hello from ${process.platform}!');
await signal.gracefulShutdown();

// Custom path (if needed)
const customSignal = new SignalCli('/custom/path/to/signal-cli', '+1234567890');

// Platform detection
if (process.platform === 'win32') {
    console.log('Running on Windows');
} else {
    console.log('Running on Unix-like system');
}
`);
}

function showTroubleshooting() {
    console.log('\n🔧 Cross-Platform Troubleshooting');
    console.log('=================================');

    console.log(`
Common Issues by Platform:

Windows:
   • Java not in PATH: Add Java to system PATH
   • Permission denied: Run as administrator
   • signal-cli.bat not found: Run npm run install:signal-cli

Linux:
   • Permission denied: chmod +x bin/bin/signal-cli
   • Java not found: sudo apt install default-jre
   • libsignal-client error: Install native dependencies

macOS:
   • Java not found: brew install openjdk
   • Quarantine warning: xattr -d com.apple.quarantine bin/bin/signal-cli
   • Permission denied: chmod +x bin/bin/signal-cli

All Platforms:
   • Connection timeout: Check Java installation
   • JSON parse error: Update to latest signal-cli version
   • Registration required: Register phone number first
`);
}

async function main() {
    try {
        const setupOk = await checkPlatformSetup();

        if (setupOk) {
            await testBasicFunctionality();
        }

        showUsageExamples();
        showTroubleshooting();

        console.log('\n- Cross-platform check completed!');

    } catch (error) {
        console.error('ERROR: during platform check:', error.message);
        process.exit(1);
    }
}

// Auto-run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    checkPlatformSetup,
    testBasicFunctionality,
    showUsageExamples,
    showTroubleshooting
};
