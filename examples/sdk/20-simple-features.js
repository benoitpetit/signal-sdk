const { SignalCli } = require('../../dist');

// This example demonstrates the new simple features added in the latest update
// 1. isRegistered - Check if a number is on Signal
// 2. sendNoteToSelf - Send a message to your own "Note to Self" chat

const signal = new SignalCli(process.env.SIGNAL_ACCOUNT);

async function main() {
    if (!process.env.SIGNAL_ACCOUNT) {
        console.log('Please set SIGNAL_ACCOUNT environment variable');
        return;
    }

    try {
        console.log('Connecting...');
        // We don't necessarily need to connect for these specific calls if using single-shot mode,
        // but it's good practice.
        
        // 1. Check registration status
        const numberToCheck = '+33612345678'; // Example number
        console.log(`Checking if ${numberToCheck} is registered...`);
        const isRegistered = await signal.isRegistered(numberToCheck);
        console.log(`${numberToCheck} is ${isRegistered ? 'REGISTERED' : 'NOT REGISTERED'}`);

        // 2. Send Note to Self
        console.log('Sending a note to self...');
        const result = await signal.sendNoteToSelf('This is a test note from the SDK example!');
        console.log('Note sent!', result);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
