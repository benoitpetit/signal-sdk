/**
 * Example: Username Management
 * Demonstrates setting, using, and deleting Signal usernames
 */

const { SignalCli } = require('../../dist');

async function main() {
    console.log('=== Username Management Example ===\n');

    const signal = new SignalCli('+33123456789');

    try {
        await signal.connect();
        console.log('✓ Connected to Signal\n');

        // 1. Set a username
        console.log('1. Setting username...');
        try {
            const result = await signal.setUsername('mycoolusername');
            console.log('✓ Username set successfully!');
            console.log(`   Username: ${result.username}`);
            if (result.usernameLink) {
                console.log(`   Link: ${result.usernameLink}`);
            }
            console.log();

            // 2. Inform contacts about username
            console.log('2. Informing contacts about username...');
            const contacts = await signal.listContacts();
            const firstContact = contacts.find(c => !c.blocked);

            if (firstContact) {
                await signal.sendMessage(
                    firstContact.number,
                    `You can now find me at @${result.username} on Signal! 🎉`
                );
                console.log(`✓ Informed ${firstContact.name}\n`);
            }

            // 3. Use username in profile
            console.log('3. Updating profile with username reference...');
            await signal.updateProfile({
                about: `Find me: @${result.username}`
            });
            console.log('✓ Profile updated\n');

            // Wait a bit to demonstrate the username is active
            console.log('4. Username is now active and searchable');
            console.log('   Other users can find you by searching for your username\n');

            // 5. Delete username (optional)
            console.log('5. Would you like to delete the username? (Simulating "No")');
            console.log('   Keeping username active...\n');

            // Uncomment to actually delete:
            // console.log('5. Deleting username...');
            // await signal.deleteUsername();
            // console.log('✓ Username deleted\n');

        } catch (error) {
            if (error.message.includes('already taken') || error.message.includes('in use')) {
                console.log('✗ Username already taken, trying with a number...\n');

                // Try with a random suffix
                const randomSuffix = Math.floor(Math.random() * 1000);
                const altUsername = `mycoolusername${randomSuffix}`;

                const result = await signal.setUsername(altUsername);
                console.log('✓ Alternative username set!');
                console.log(`   Username: ${result.username}`);
                if (result.usernameLink) {
                    console.log(`   Link: ${result.usernameLink}`);
                }
                console.log();
            } else {
                throw error;
            }
        }

        // 6. List contacts with usernames
        console.log('6. Contacts with usernames:');
        const contacts = await signal.listContacts();
        const contactsWithUsernames = contacts.filter(c => c.username);

        if (contactsWithUsernames.length > 0) {
            contactsWithUsernames.forEach(contact => {
                console.log(`• ${contact.name}: @${contact.username}`);
            });
            console.log();
        } else {
            console.log('  None of your contacts have usernames set\n');
        }

        // 7. Username best practices
        console.log('7. Username Best Practices:');
        console.log('   ✓ Usernames are case-insensitive');
        console.log('   ✓ Can contain letters, numbers, and underscores');
        console.log('   ✓ Minimum length: 3 characters');
        console.log('   ✓ Maximum length: 32 characters');
        console.log('   ✓ Signal adds a unique suffix (e.g., .01, .123)');
        console.log('   ✓ Share username instead of phone number for privacy');
        console.log('   ✓ Can delete and set a new username anytime\n');

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
