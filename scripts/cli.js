#!/usr/bin/env node

/**
 * Signal SDK - CLI Tool
 * 
 * Command-line interface for Signal SDK operations
 */

const { spawn } = require('child_process');
const path = require('path');

function showHelp() {
    console.log('Signal SDK - Command Line Interface');
    console.log('===================================\n');
    console.log('Usage:');
    console.log('  npx signal-sdk <command> [options]\n');
    console.log('Commands:');
    console.log('  connect [device-name]    Link a new device with QR code');
    console.log('  help                     Show this help message\n');
    console.log('Examples:');
    console.log('  npx signal-sdk connect');
    console.log('  npx signal-sdk connect "My Bot Device"');
    console.log('  npx signal-sdk help\n');
    console.log('For more information, visit: https://github.com/benoitpetit/signal-sdk');
}

function runCommand(scriptName, args = []) {
    const scriptPath = path.join(__dirname, `${scriptName}.js`);
    const child = spawn('node', [scriptPath, ...args], {
        stdio: 'inherit',
        cwd: process.cwd()
    });

    child.on('exit', (code) => {
        process.exit(code || 0);
    });

    child.on('error', (error) => {
        console.error('Error running command:', error.message);
        process.exit(1);
    });
}

// Parse command line arguments
const [,, command, ...args] = process.argv;

switch (command) {
    case 'connect':
        runCommand('connect', args);
        break;
    
    case 'help':
    case '--help':
    case '-h':
        showHelp();
        break;
    
    default:
        if (!command) {
            console.log('Signal SDK - No command specified\n');
            showHelp();
        } else {
            console.log(`Signal SDK - Unknown command: ${command}\n`);
            showHelp();
            process.exit(1);
        }
        break;
}
