/**
 * Example: Identity Verification and Security
 * Demonstrates safety number verification and identity management
 */

const { SignalCli } = require('../../dist');

async function main() {
    console.log('=== Identity Verification Example ===\n');

    const signal = new SignalCli('+33123456789');

    try {
        await signal.connect();
        console.log('✓ Connected to Signal\n');

        const contactNumber = '+33987654321';

        // 1. Get safety number for a contact
        console.log('1. Getting safety number...');
        const safetyNumber = await signal.getSafetyNumber(contactNumber);
        if (safetyNumber) {
            console.log(`✓ Safety number: ${safetyNumber}\n`);
        } else {
            console.log('✗ No safety number found (contact may not be verified)\n');
        }

        // 2. Verify safety number
        if (safetyNumber) {
            console.log('2. Verifying safety number...');
            const isVerified = await signal.verifySafetyNumber(contactNumber, safetyNumber);
            console.log(`✓ Verification result: ${isVerified ? 'VERIFIED ✓' : 'NOT VERIFIED ✗'}\n`);
        }

        // 3. List all identities
        console.log('3. Listing all identities...');
        const allIdentities = await signal.listIdentities();
        console.log(`Found ${allIdentities.length} identities:\n`);

        allIdentities.forEach(identity => {
            console.log(`• ${identity.number}`);
            console.log(`  Trust level: ${identity.trustLevel}`);
            if (identity.safetyNumber) {
                console.log(`  Safety number: ${identity.safetyNumber.substring(0, 20)}...`);
            }
            console.log();
        });

        // 4. List only untrusted identities
        console.log('4. Listing untrusted identities...');
        const untrusted = await signal.listUntrustedIdentities();
        if (untrusted.length > 0) {
            console.log(`⚠️  Found ${untrusted.length} untrusted identities:\n`);
            untrusted.forEach(identity => {
                console.log(`• ${identity.number} (${identity.trustLevel})`);
            });
            console.log();
        } else {
            console.log('✓ All identities are trusted\n');
        }

        // 5. Trust an identity (if untrusted ones exist)
        if (untrusted.length > 0) {
            console.log('5. Trusting an identity...');
            const toTrust = untrusted[0];

            // Get the safety number first
            const safetyNumberToTrust = await signal.getSafetyNumber(toTrust.number);

            if (safetyNumberToTrust) {
                await signal.trustIdentity(
                    toTrust.number,
                    safetyNumberToTrust,
                    true  // verified = true
                );
                console.log(`✓ Trusted identity: ${toTrust.number}\n`);
            }
        }

        // 6. Secure messaging workflow
        console.log('6. Secure messaging workflow...');
        console.log('   Step 1: Check if contact is verified');
        const recipientSafetyNumber = await signal.getSafetyNumber(contactNumber);

        if (recipientSafetyNumber) {
            console.log('   Step 2: Verify safety number');
            const verified = await signal.verifySafetyNumber(contactNumber, recipientSafetyNumber);

            if (verified) {
                console.log('   Step 3: Send secure message');
                await signal.sendMessage(contactNumber, 'This is a verified secure message 🔒');
                console.log('   ✓ Secure message sent\n');
            } else {
                console.log('   ⚠️  Safety number mismatch - message not sent\n');
            }
        } else {
            console.log('   ℹ️  Contact not verified yet - sending anyway');
            await signal.sendMessage(contactNumber, 'Please verify your identity');
            console.log('   ✓ Message sent (unverified)\n');
        }

        // 7. List identities for specific contact
        console.log('7. Getting identity details for contact...');
        const contactIdentities = await signal.listIdentities(contactNumber);
        if (contactIdentities.length > 0) {
            const identity = contactIdentities[0];
            console.log(`Contact: ${identity.number}`);
            console.log(`Trust status: ${identity.trustLevel}`);
            console.log(`Added: ${identity.addedTimestamp ? new Date(identity.addedTimestamp).toLocaleString() : 'Unknown'}`);
            if (identity.safetyNumber) {
                console.log(`Safety number: ${identity.safetyNumber}`);
            }
            console.log();
        }

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
