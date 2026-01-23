/**
 * Exemples d'Utilisation - Nouvelles Fonctionnalités Avancées
 * 
 * Ce fichier démontre l'utilisation de toutes les fonctionnalités avancées
 * ajoutées dans la mise à jour v0.1.0 du Signal SDK.
 */

const { SignalCli } = require('../dist/SignalCli');

async function demonstrateAdvancedFeatures() {
    const signal = new SignalCli(process.env.SIGNAL_NUMBER);

    console.log('═══════════════════════════════════════════════════════');
    console.log('🚀 Signal SDK - Fonctionnalités Avancées');
    console.log('═══════════════════════════════════════════════════════\n');

    // ═══════════════════════════════════════════════════════════════
    // 1. OPTIONS AVANCÉES DE SENDMESSAGE
    // ═══════════════════════════════════════════════════════════════

    console.log('1️⃣  Options Avancées de sendMessage()\n');

    // 1.1 Formatage de texte
    console.log('   📝 Formatage de texte:');
    try {
        await signal.sendMessage('+33123456789', 'Message avec *gras* et _italique_', {
            textStyles: [
                { start: 13, length: 5, style: 'BOLD' },      // *gras*
                { start: 22, length: 9, style: 'ITALIC' }     // _italique_
            ]
        });
        console.log('      ✅ Message avec formatage envoyé\n');
    } catch (error) {
        console.log(`      ❌ Erreur: ${error.message}\n`);
    }

    // 1.2 Mentions d'utilisateurs
    console.log('   👥 Mentions:');
    try {
        await signal.sendMessage('+33123456789', 'Salut @John, comment ça va ?', {
            mentions: [
                { start: 6, length: 5, number: '+33111111111' }  // @John
            ]
        });
        console.log('      ✅ Message avec mention envoyé\n');
    } catch (error) {
        console.log(`      ❌ Erreur: ${error.message}\n`);
    }

    // 1.3 Citation avancée
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
        console.log('      ✅ Réponse avec citation envoyée\n');
    } catch (error) {
        console.log(`      ❌ Erreur: ${error.message}\n`);
    }

    // 1.4 Édition de message
    console.log('   ✏️  Édition de message:');
    try {
        const originalMsg = await signal.sendMessage('+33123456789', 'Message original');
        await new Promise(resolve => setTimeout(resolve, 1000));

        await signal.sendMessage('+33123456789', 'Message corrigé', {
            editTimestamp: originalMsg.timestamp
        });
        console.log('      ✅ Message édité\n');
    } catch (error) {
        console.log(`      ❌ Erreur: ${error.message}\n`);
    }

    // 1.5 Réponse à une story
    console.log('   📖 Réponse à une story:');
    try {
        await signal.sendMessage('+33123456789', 'Belle photo ! 📸', {
            storyTimestamp: Date.now() - 3600000,
            storyAuthor: '+33111111111'
        });
        console.log('      ✅ Réponse à la story envoyée\n');
    } catch (error) {
        console.log(`      ❌ Erreur: ${error.message}\n`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. NOUVELLE MÉTHODE RECEIVE()
    // ═══════════════════════════════════════════════════════════════

    console.log('\n2️⃣  Réception de Messages avec receive()\n');

    // 2.1 Réception basique
    console.log('   📥 Réception avec timeout:');
    try {
        const messages = await signal.receive({ timeout: 5 });
        console.log(`      ✅ ${messages.length} message(s) reçu(s)\n`);
    } catch (error) {
        console.log(`      ❌ Erreur: ${error.message}\n`);
    }

    // 2.2 Réception avec options avancées
    console.log('   ⚙️  Réception avec options:');
    try {
        const messages = await signal.receive({
            timeout: 10,
            maxMessages: 5,
            ignoreAttachments: true,
            sendReadReceipts: true
        });
        console.log(`      ✅ ${messages.length} message(s) reçu(s) avec options\n`);
    } catch (error) {
        console.log(`      ❌ Erreur: ${error.message}\n`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. GESTION DES USERNAMES
    // ═══════════════════════════════════════════════════════════════

    console.log('\n3️⃣  Gestion des Usernames\n');

    // 3.1 Définir un username
    console.log('   ✏️  Définir un username:');
    try {
        const result = await signal.setUsername('myawesomebot');
        console.log(`      ✅ Username défini: ${result.username}`);
        console.log(`      🔗 Lien: ${result.usernameLink}\n`);
    } catch (error) {
        console.log(`      ❌ Erreur: ${error.message}\n`);
    }

    // 3.2 Supprimer le username
    console.log('   🗑️  Supprimer le username:');
    try {
        const result = await signal.deleteUsername();
        if (result.success) {
            console.log('      ✅ Username supprimé\n');
        }
    } catch (error) {
        console.log(`      ❌ Erreur: ${error.message}\n`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 4. GESTION AVANCÉE DES IDENTITÉS
    // ═══════════════════════════════════════════════════════════════

    console.log('\n4️⃣  Gestion Avancée des Identités\n');

    // 4.1 Obtenir le safety number
    console.log('   🔐 Obtenir safety number:');
    try {
        const safetyNumber = await signal.getSafetyNumber('+33123456789');
        if (safetyNumber) {
            console.log(`      ✅ Safety number: ${safetyNumber}\n`);
        } else {
            console.log('      ⚠️  Aucun safety number trouvé\n');
        }
    } catch (error) {
        console.log(`      ❌ Erreur: ${error.message}\n`);
    }

    // 4.2 Vérifier un safety number
    console.log('   ✅ Vérifier safety number:');
    try {
        const verified = await signal.verifySafetyNumber(
            '+33123456789',
            '12345 67890 12345 67890 12345 67890'
        );
        if (verified) {
            console.log('      ✅ Safety number vérifié avec succès\n');
        } else {
            console.log('      ❌ Safety number incorrect\n');
        }
    } catch (error) {
        console.log(`      ❌ Erreur: ${error.message}\n`);
    }

    // 4.3 Lister les identités non vérifiées
    console.log('   📋 Lister identités non vérifiées:');
    try {
        const untrusted = await signal.listUntrustedIdentities();
        console.log(`      ℹ️  ${untrusted.length} identité(s) non vérifiée(s):`);
        untrusted.slice(0, 3).forEach(identity => {
            console.log(`         - ${identity.number} (${identity.trustLevel || 'UNKNOWN'})`);
        });
        console.log();
    } catch (error) {
        console.log(`      ❌ Erreur: ${error.message}\n`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 5. GESTION AVANCÉE DES GROUPES
    // ═══════════════════════════════════════════════════════════════

    console.log('\n5️⃣  Gestion Avancée des Groupes\n');

    // 5.1 Envoyer le lien d'invitation
    console.log('   🔗 Envoyer lien d\'invitation:');
    try {
        await signal.sendGroupInviteLink('groupId123==', '+33123456789');
        console.log('      ✅ Lien d\'invitation envoyé\n');
    } catch (error) {
        console.log(`      ❌ Erreur: ${error.message}\n`);
    }

    // 5.2 Bannir des membres
    console.log('   🚫 Bannir des membres:');
    try {
        await signal.setBannedMembers('groupId123==', ['+33111111111']);
        console.log('      ✅ Membre(s) banni(s)\n');
    } catch (error) {
        console.log(`      ❌ Erreur: ${error.message}\n`);
    }

    // 5.3 Réinitialiser le lien d'invitation
    console.log('   🔄 Réinitialiser lien d\'invitation:');
    try {
        await signal.resetGroupLink('groupId123==');
        console.log('      ✅ Lien d\'invitation réinitialisé\n');
    } catch (error) {
        console.log(`      ❌ Erreur: ${error.message}\n`);
    }

    // ═══════════════════════════════════════════════════════════════
    // 6. EXEMPLE COMPLET - MESSAGE COMPLEXE
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
                    text: 'Message précédent'
                },
                previewUrl: 'https://example.com',
                expiresInSeconds: 3600
            }
        );
        console.log('      ✅ Message complexe envoyé avec succès\n');
    } catch (error) {
        console.log(`      ❌ Erreur: ${error.message}\n`);
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('✨ Démonstration terminée !');
    console.log('═══════════════════════════════════════════════════════\n');
}

// ═══════════════════════════════════════════════════════════════
// INFORMATIONS IMPORTANTES
// ═══════════════════════════════════════════════════════════════

console.log('\n📚 INFORMATIONS IMPORTANTES:\n');
console.log('1. Assurez-vous que signal-cli est installé et configuré');
console.log('2. Définissez SIGNAL_NUMBER dans votre .env');
console.log('3. Ces fonctionnalités nécessitent signal-cli >= 0.13.0');
console.log('4. Certaines opérations peuvent nécessiter des permissions');
console.log('5. Les tests unitaires couvrent tous ces cas d\'usage\n');

console.log('📖 DOCUMENTATION:\n');
console.log('- README.md : Guide de démarrage');
console.log('- docs/api-reference.md : Référence complète de l\'API');
console.log('- IMPLEMENTATION_SUMMARY.md : Détails techniques');
console.log('- update_coverage_todo.md : Roadmap et statut\n');

// Exécuter la démonstration si le fichier est exécuté directement
if (require.main === module) {
    demonstrateAdvancedFeatures().catch(error => {
        console.error('\n❌ Erreur fatale:', error);
        process.exit(1);
    });
}

module.exports = { demonstrateAdvancedFeatures };
