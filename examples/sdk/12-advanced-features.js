/**
 * Usage Examples - Advanced Features
 * 
 * This file demonstrates the advanced features introduced in Signal SDK v0.1.0.
 */

const { SignalCli } = require('../dist/SignalCli');

async function demonstrateAdvancedFeatures() {
    const signal = new SignalCli(process.env.SIGNAL_NUMBER);

    console.log('═══════════════════════════════════════════════════════');
    console.log('🚀 Signal SDK - Advanced Features');
    console.log('═══════════════════════════════════════════════════════\n');

    // ═══════════════════════════════════════════════════════════════
    // 1. ADVANCED SENDMESSAGE OPTIONS
    // ═══════════════════════════════════════════════════════════════

    console.log('1️⃣  Advanced sendMessage() options\n');

    // 1.1 Text formatting
    console.log('   📝 Formatage de texte:');
    try {
        await signal.sendMessage('+33123456789', 'Message avec *gras* et _italique_', {
            textStyles: [
                { start: 13, length: 5, style: 'BOLD' },      // *gras*
                { start: 22, length: 9, style: 'ITALIC' }     // _italique_
            ]
        });
        console.log('      ✅ Formatted message sent\n');
    } catch (error) {
        console.log(`      ❌ Error: ${error.message}\n`);
    }

    // 1.2 User mentions
    console.log('   👥 Mentions:');
    try {
        await signal.sendMessage('+33123456789', 'Hello @John, how are you?', {
            mentions: [
                { start: 6, length: 5, number: '+33111111111' }  // @John
            ]
        });
        console.log('      ✅ Mentioned message sent\n');
    } catch (error) {
        console.log(`      ❌ Error: ${error.message}\n`);
    }

    // 1.3 Advanced quote
    console.log('   💬 Citation avec formatage:');
    try {
        await signal.sendMessage('+33123456789', 'Je suis d\'accord !', {
            quote: {
                timestamp: Date.now() - 60000,
                author: '+33111111111',
                text: 'Message original avec *gras*',
                textStyles: [
                    { start: 24, length: 5, style: 'BOLD' }
                ]
            }
        });
        console.log('      ✅ Quoted reply sent\n');
    } catch (error) {
        console.log(`      ❌ Error: ${error.message}\n`);
    }

    // 1.4 Message editing
    console.log('   ✏️  Message editing:');
    try {
        const originalMsg = await signal.sendMessage('+33123456789', 'Message original');
        await new Promise(resolve => setTimeout(resolve, 1000));

        await signal.sendMessage('+33123456789', 'Corrected message', {
            editTimestamp: originalMsg.timestamp
        });
        console.log('      ✅ Message edited\n');
    } catch (error) {
        console.log(`      ❌ Error: ${error.message}\n`);
    }

    // 1.5 Story reply
    console.log('   📖 Story reply:');
    try {
        await signal.sendMessage('+33123456789', 'Belle photo ! 📸', {
            storyTimestamp: Date.now() - 3600000,
            storyAuthor: '+33111111111'
        });
        console.log('      ✅ Story reply sent\n');
    } catch (error) {
        console.log(`      ❌ Error: ${error.message}\n`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. RECEIVE() METHOD
    // ═══════════════════════════════════════════════════════════════

    console.log('\n2️⃣  Receiving messages with receive()\n');

    // 2.1 Basic receiving
    console.log('   📥 Receiving with a timeout:');
    try {
        const messages = await signal.receive({ timeout: 5 });
        console.log(`      ✅ Received ${messages.length} message(s)\n`);
    } catch (error) {
        console.log(`      ❌ Error: ${error.message}\n`);
    }

    // 2.2 Receiving with advanced options
    console.log('   ⚙️  Receiving with options:');
    try {
        const messages = await signal.receive({
            timeout: 10,
            maxMessages: 5,
            ignoreAttachments: true,
            sendReadReceipts: true
        });
        console.log(`      ✅ Received ${messages.length} message(s) with options\n`);
    } catch (error) {
        console.log(`      ❌ Error: ${error.message}\n`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. USERNAME MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    console.log('\n3️⃣  Username management\n');

    // 3.1 Set a username
    console.log('   ✏️  Set a username:');
    try {
        const result = await signal.setUsername('myawesomebot');
        console.log(`      ✅ Username set: ${result.username}`);
        console.log(`      🔗 Link: ${result.usernameLink}\n`);
    } catch (error) {
        console.log(`      ❌ Error: ${error.message}\n`);
    }

    // 3.2 Delete the username
    console.log('   🗑️  Delete the username:');
    try {
        const result = await signal.deleteUsername();
        if (result.success) {
            console.log('      ✅ Username deleted\n');
        }
    } catch (error) {
        console.log(`      ❌ Error: ${error.message}\n`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 4. ADVANCED IDENTITY MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    console.log('\n4️⃣  Advanced identity management\n');

    // 4.1 Get a safety number
    console.log('   🔐 Get a safety number:');
    try {
        const safetyNumber = await signal.getSafetyNumber('+33123456789');
        if (safetyNumber) {
            console.log(`      ✅ Safety number: ${safetyNumber}\n`);
        } else {
            console.log('      ⚠️  No safety number found\n');
        }
    } catch (error) {
        console.log(`      ❌ Error: ${error.message}\n`);
    }

    // 4.2 Verify a safety number
    console.log('   ✅ Verify a safety number:');
    try {
        const verified = await signal.verifySafetyNumber(
            '+33123456789',
            '12345 67890 12345 67890 12345 67890'
        );
        if (verified) {
            console.log('      ✅ Safety number verified successfully\n');
        } else {
            console.log('      ❌ Incorrect safety number\n');
        }
    } catch (error) {
        console.log(`      ❌ Error: ${error.message}\n`);
    }

    // 4.3 List untrusted identities
    console.log('   📋 List untrusted identities:');
    try {
        const untrusted = await signal.listUntrustedIdentities();
        console.log(`      ℹ️  ${untrusted.length} untrusted identity/identities:`);
        untrusted.slice(0, 3).forEach(identity => {
            console.log(`         - ${identity.number} (${identity.trustLevel || 'UNKNOWN'})`);
        });
        console.log();
    } catch (error) {
        console.log(`      ❌ Error: ${error.message}\n`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 5. ADVANCED GROUP MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    console.log('\n5️⃣  Advanced group management\n');

    // 5.1 Send the invitation link
    console.log('   🔗 Envoyer lien d\'invitation:');
    try {
        await signal.sendGroupInviteLink('groupId123==', '+33123456789');
        console.log('      ✅ Invitation link sent\n');
    } catch (error) {
        console.log(`      ❌ Error: ${error.message}\n`);
    }

    // 5.2 Ban members
    console.log('   🚫 Bannir des membres:');
    try {
        await signal.setBannedMembers('groupId123==', ['+33111111111']);
        console.log('      ✅ Membre(s) banni(s)\n');
    } catch (error) {
        console.log(`      ❌ Error: ${error.message}\n`);
    }

    // 5.3 Reset the invitation link
    console.log('   🔄 Reset invitation link:');
    try {
        await signal.resetGroupLink('groupId123==');
        console.log('      ✅ Invitation link reset\n');
    } catch (error) {
        console.log(`      ❌ Error: ${error.message}\n`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 6. COMPLETE EXAMPLE - COMPLEX MESSAGE
    // ═══════════════════════════════════════════════════════════════

    console.log('\n6️⃣  Exemple Complet - Message avec Tout\n');

    console.log('   🎯 Envoi d\'un message complexe:');
    try {
        await signal.sendMessage('+33123456789',
            'Salut @John! Voici un message *important* avec formatage et citation.',
            {
                mentions: [
                    { start: 6, length: 5, number: '+33111111111' }
                ],
                textStyles: [
                    { start: 25, length: 9, style: 'BOLD' }
                ],
                quote: {
                    timestamp: Date.now() - 120000,
                    author: '+33111111111',
                    text: 'Previous message'
                },
                previewUrl: 'https://example.com',
                expiresInSeconds: 3600
            }
        );
        console.log('      ✅ Complex message sent successfully\n');
    } catch (error) {
        console.log(`      ❌ Error: ${error.message}\n`);
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('✨ Demonstration completed!');
    console.log('═══════════════════════════════════════════════════════\n');
}

// ═══════════════════════════════════════════════════════════════
// IMPORTANT INFORMATION
// ═══════════════════════════════════════════════════════════════

console.log('\n📚 INFORMATIONS IMPORTANTES:\n');
console.log('1. Make sure signal-cli is installed and configured');
console.log('2. Set SIGNAL_NUMBER in your .env file');
console.log('3. These features require signal-cli >= 0.13.0');
console.log('4. Some operations may require additional permissions');
console.log('5. Unit tests cover these usage scenarios\n');

console.log('📖 DOCUMENTATION:\n');
console.log('- README.md: Getting started guide');
console.log('- docs/api-reference.md: Complete API reference');
console.log('- IMPLEMENTATION_SUMMARY.md: Technical details');
console.log('- update_coverage_todo.md : Roadmap et statut\n');

// Run the demonstration when this file is executed directly
if (require.main === module) {
    demonstrateAdvancedFeatures().catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { demonstrateAdvancedFeatures };
