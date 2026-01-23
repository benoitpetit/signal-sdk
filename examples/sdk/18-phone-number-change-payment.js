/**
 * Phone Number Change & Payment Notifications Example
 * 
 * Demonstrates:
 * - Starting phone number change process
 * - Completing phone number change with verification
 * - Sending MobileCoin payment notifications
 * 
 * Prerequisites:
 * - Registered Signal account (primary device only for number change)
 * - Valid new phone number for change
 * - MobileCoin wallet integration for payments
 */

const { SignalCli } = require('../../dist/SignalCli');

async function main() {
    const signal = new SignalCli('+1234567890');

    try {
        await signal.connect();
        console.log('Connected to Signal');

        // ============================================
        // PHONE NUMBER CHANGE
        // ============================================

        console.log('\n=== Phone Number Change ===\n');

        const newNumber = '+33612345678'; // Your new number

        // Step 1: Start the change number process
        console.log(`1. Starting change number to ${newNumber}...`);
        try {
            await signal.startChangeNumber(newNumber);
            console.log('✓ SMS verification sent');
        } catch (error) {
            if (error.message.includes('captcha')) {
                console.log('⚠️  Captcha required. Get token from:');
                console.log('   https://signalcaptchas.org/registration/generate.html');
                console.log('\nRetrying with captcha...');

                // In practice, you'd get this from the website
                const captcha = 'your_captcha_token_here';
                await signal.startChangeNumber(newNumber, false, captcha);
                console.log('✓ SMS verification sent with captcha');
            } else {
                throw error;
            }
        }

        // Wait for user to receive SMS code
        console.log('\n2. Check your phone for verification code...');
        console.log('   (In real app, prompt user for input)');

        // Step 2: Complete the change with verification code
        // const verificationCode = '123456'; // User input
        // await signal.finishChangeNumber(newNumber, verificationCode);
        // console.log('✓ Phone number changed successfully!');

        // With PIN if registration lock is enabled
        // const pin = '1234'; // User's PIN
        // await signal.finishChangeNumber(newNumber, verificationCode, pin);
        // console.log('✓ Phone number changed with PIN verification');

        // ============================================
        // VOICE VERIFICATION
        // ============================================

        console.log('\n=== Voice Verification ===\n');

        // Use voice call instead of SMS
        console.log('Starting voice verification...');
        // await signal.startChangeNumber(newNumber, true);
        // console.log('✓ Voice call initiated');
        console.log('(Commented out - uncomment to test)');

        // ============================================
        // PAYMENT NOTIFICATIONS
        // ============================================

        console.log('\n=== Payment Notifications ===\n');

        // MobileCoin payment example
        const recipient = '+1111111111';

        // In a real app, this comes from your MobileCoin wallet
        const paymentReceipt = Buffer.from(
            'MobileCoin payment receipt data'
        ).toString('base64');

        console.log('1. Sending payment notification with note...');
        try {
            await signal.sendPaymentNotification(recipient, {
                receipt: paymentReceipt,
                note: 'Thanks for dinner! 🍕'
            });
            console.log('✓ Payment notification sent with note');
        } catch (error) {
            console.log('ℹ️  Note: Payment notifications require MobileCoin integration');
            console.log(`   Error: ${error.message}`);
        }

        console.log('\n2. Sending payment notification without note...');
        try {
            await signal.sendPaymentNotification(recipient, {
                receipt: paymentReceipt
            });
            console.log('✓ Payment notification sent');
        } catch (error) {
            console.log(`   Error: ${error.message}`);
        }

        // ============================================
        // ERROR HANDLING
        // ============================================

        console.log('\n=== Error Handling ===\n');

        // Invalid phone number
        try {
            await signal.startChangeNumber('invalid');
        } catch (error) {
            console.log('✓ Invalid phone number rejected:', error.message);
        }

        // Empty verification code
        try {
            await signal.finishChangeNumber(newNumber, '');
        } catch (error) {
            console.log('✓ Empty verification code rejected:', error.message);
        }

        // Empty payment receipt
        try {
            await signal.sendPaymentNotification(recipient, {
                receipt: ''
            });
        } catch (error) {
            console.log('✓ Empty receipt rejected:', error.message);
        }

        // ============================================
        // BEST PRACTICES
        // ============================================

        console.log('\n=== Best Practices ===\n');

        console.log('Phone Number Change:');
        console.log('• Only works on primary devices (not linked)');
        console.log('• Keep backup of old number until verified');
        console.log('• Use voice verification if SMS fails');
        console.log('• Save your PIN if registration lock is enabled');
        console.log('• Test with captcha support enabled');

        console.log('\nPayment Notifications:');
        console.log('• Requires MobileCoin wallet integration');
        console.log('• Receipt must be base64 encoded blob');
        console.log('• Note is optional but recommended');
        console.log('• Works with individual recipients only');
        console.log('• Recipient must have MobileCoin enabled');

        // ============================================
        // USE CASES
        // ============================================

        console.log('\n=== Use Cases ===\n');

        console.log('Phone Number Change:');
        console.log('• Moving to new country/region');
        console.log('• Changing phone carriers');
        console.log('• Privacy/security reasons');
        console.log('• Account migration');

        console.log('\nPayment Notifications:');
        console.log('• P2P cryptocurrency payments');
        console.log('• Split bills with friends');
        console.log('• Send money with messages');
        console.log('• Payment confirmations');

    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    } finally {
        await signal.disconnect();
        console.log('\n✓ Disconnected');
    }
}

// Run the example
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { main };
