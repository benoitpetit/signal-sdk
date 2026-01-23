/**
 * Example: Advanced Messaging Features
 * Demonstrates text styles, mentions, quotes, and advanced message options
 */

const { SignalCli } = require('../../dist');

async function main() {
    console.log('=== Advanced Messaging Features ===\n');

    const signal = new SignalCli('+33123456789');

    try {
        await signal.connect();
        console.log('✓ Connected to Signal\n');

        const recipient = '+33987654321';

        // 1. Text Styles
        console.log('1. Sending message with text styles...');
        await signal.sendMessage(recipient, 'This is bold, italic, and monospace text', {
            textStyles: [
                { start: 8, length: 4, style: 'BOLD' },        // "bold"
                { start: 14, length: 6, style: 'ITALIC' },     // "italic"
                { start: 26, length: 9, style: 'MONOSPACE' }   // "monospace"
            ]
        });
        console.log('✓ Styled message sent\n');

        // 2. Mentions
        console.log('2. Sending message with mentions...');
        await signal.sendMessage(recipient, 'Hello @Alice, how are you?', {
            mentions: [
                { start: 6, length: 6, number: '+33111111111' }  // "@Alice"
            ]
        });
        console.log('✓ Message with mention sent\n');

        // 3. Quote/Reply
        console.log('3. Sending quoted message...');
        await signal.sendMessage(recipient, 'I agree!', {
            quote: {
                timestamp: Date.now() - 60000,  // 1 minute ago
                author: recipient,
                text: 'Should we meet tomorrow?'
            }
        });
        console.log('✓ Quoted message sent\n');

        // 4. Combined: Styled text with mentions and quote
        console.log('4. Sending complex message...');
        await signal.sendMessage(recipient, 'Great idea @Alice! Let me know.', {
            textStyles: [
                { start: 0, length: 10, style: 'BOLD' }  // "Great idea"
            ],
            mentions: [
                { start: 11, length: 6, number: '+33111111111' }
            ],
            quote: {
                timestamp: Date.now() - 120000,
                author: '+33111111111',
                text: 'What about a team meeting?'
            }
        });
        console.log('✓ Complex message sent\n');

        // 5. Edit a message
        console.log('5. Editing a previous message...');
        const originalTimestamp = Date.now() - 300000;  // 5 minutes ago
        await signal.sendMessage(recipient, 'This is the corrected version', {
            editTimestamp: originalTimestamp
        });
        console.log('✓ Message edited\n');

        // 6. Reply to a story
        console.log('6. Replying to a story...');
        await signal.sendMessage(recipient, 'Nice photo!', {
            storyTimestamp: Date.now() - 3600000,  // 1 hour ago
            storyAuthor: recipient
        });
        console.log('✓ Story reply sent\n');

        // 7. Note to self
        console.log('7. Sending note to self...');
        await signal.sendMessage(signal.account || '+33123456789', 'Remember to call John', {
            noteToSelf: true
        });
        console.log('✓ Note to self sent\n');

        // 8. Receive messages with options
        console.log('8. Receiving messages...');
        const messages = await signal.receive({
            timeout: 1,
            ignoreStories: true,
            sendReadReceipts: true
        });
        console.log(`✓ Received ${messages.length} messages\n`);

        messages.forEach((msg, index) => {
            console.log(`Message ${index + 1}:`);
            console.log(`  From: ${msg.source}`);
            console.log(`  Text: ${msg.text || '(no text)'}`);
            if (msg.mentions && msg.mentions.length > 0) {
                console.log(`  Mentions: ${msg.mentions.length}`);
            }
            if (msg.quote) {
                console.log(`  Quoted: "${msg.quote.text}"`);
            }
            console.log();
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        signal.disconnect();
        console.log('✓ Disconnected');
    }
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
