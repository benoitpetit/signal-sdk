/**
 * Example: Enhanced Profile and Contact Parsing
 * Demonstrates parsing givenName, familyName, mobileCoinAddress, and group details
 */

const { SignalCli } = require('../../dist');

async function main() {
    console.log('=== Enhanced Profile and Contact Parsing ===\n');

    const signal = new SignalCli('+33123456789');

    try {
        await signal.connect();
        console.log('✓ Connected to Signal\n');

        // 1. Get contacts with enriched profiles
        console.log('1. Fetching contacts with full profile data...');
        const contacts = await signal.getContactsWithProfiles();
        console.log(`✓ Found ${contacts.length} contacts\n`);

        // Display detailed contact information
        console.log('Contact Details:');
        contacts.slice(0, 5).forEach((contact, index) => {
            console.log(`\n${index + 1}. ${contact.name}`);
            console.log(`   Phone: ${contact.number}`);

            if (contact.givenName || contact.familyName) {
                const fullName = [contact.givenName, contact.familyName].filter(Boolean).join(' ');
                console.log(`   Full Name: ${fullName}`);
            }

            if (contact.profileName) {
                console.log(`   Profile: ${contact.profileName}`);
            }

            if (contact.username) {
                console.log(`   Username: @${contact.username}`);
            }

            if (contact.mobileCoinAddress) {
                console.log(`   MobileCoin: ${contact.mobileCoinAddress.substring(0, 20)}...`);
            }

            if (contact.uuid) {
                console.log(`   UUID: ${contact.uuid.substring(0, 20)}...`);
            }

            console.log(`   Status: ${contact.blocked ? '🚫 Blocked' : '✓ Active'}`);

            if (contact.registered !== undefined) {
                console.log(`   Signal User: ${contact.registered ? 'Yes' : 'No'}`);
            }
        });

        // 2. Parse individual contact
        console.log('\n\n2. Parsing individual contact...');
        const rawContacts = await signal.listContacts();
        if (rawContacts.length > 0) {
            const parsed = signal.parseContactProfile(rawContacts[0]);
            console.log('✓ Parsed contact:');
            console.log(`   Given Name: ${parsed.givenName || 'N/A'}`);
            console.log(`   Family Name: ${parsed.familyName || 'N/A'}`);
            console.log(`   Profile Name: ${parsed.profileName || 'N/A'}`);
            console.log(`   MobileCoin: ${parsed.mobileCoinAddress ? 'Yes' : 'No'}`);
        }

        // 3. Get groups with enhanced details
        console.log('\n\n3. Fetching groups with full membership data...');
        const groups = await signal.getGroupsWithDetails();
        console.log(`✓ Found ${groups.length} groups\n`);

        // Display detailed group information
        console.log('Group Details:');
        groups.forEach((group, index) => {
            console.log(`\n${index + 1}. ${group.name}`);
            console.log(`   ID: ${group.groupId.substring(0, 20)}...`);

            if (group.description) {
                console.log(`   Description: ${group.description}`);
            }

            // Member counts
            console.log(`   Members: ${group.members.length}`);
            console.log(`   Admins: ${group.admins.length}`);
            console.log(`   Pending: ${group.pendingMembers.length}`);
            console.log(`   Banned: ${group.banned.length}`);

            // Invite link
            if (group.inviteLink) {
                console.log(`   Invite Link: ${group.inviteLink}`);
                if (group.inviteLinkRequiresApproval) {
                    console.log(`   Approval Required: Yes`);
                }
            }

            // Permissions
            console.log(`   Permissions:`);
            console.log(`     Add Members: ${group.permissionAddMember}`);
            console.log(`     Edit Details: ${group.permissionEditDetails}`);
            console.log(`     Send Messages: ${group.permissionSendMessage}`);

            // Status
            console.log(`   Status:`);
            console.log(`     Member: ${group.isMember ? 'Yes' : 'No'}`);
            console.log(`     Admin: ${group.isAdmin ? 'Yes' : 'No'}`);
            console.log(`     Blocked: ${group.isBlocked ? 'Yes' : 'No'}`);

            if (group.version) {
                console.log(`   Version: ${group.version}`);
            }
        });

        // 4. Parse individual group
        console.log('\n\n4. Parsing individual group...');
        const rawGroups = await signal.listGroups();
        if (rawGroups.length > 0) {
            const parsed = signal.parseGroupDetails(rawGroups[0]);
            console.log('✓ Parsed group:');
            console.log(`   Pending Members: ${parsed.pendingMembers.length}`);
            console.log(`   Banned Members: ${parsed.banned.length}`);
            console.log(`   Has Invite Link: ${parsed.inviteLink ? 'Yes' : 'No'}`);
        }

        // 5. Statistics
        console.log('\n\n5. Statistics:');

        const totalContacts = contacts.length;
        const withGivenName = contacts.filter(c => c.givenName).length;
        const withFamilyName = contacts.filter(c => c.familyName).length;
        const withMobileCoin = contacts.filter(c => c.mobileCoinAddress).length;
        const withUsername = contacts.filter(c => c.username).length;
        const registered = contacts.filter(c => c.registered).length;

        console.log('Contacts:');
        console.log(`  Total: ${totalContacts}`);
        console.log(`  With Given Name: ${withGivenName} (${Math.round(withGivenName / totalContacts * 100)}%)`);
        console.log(`  With Family Name: ${withFamilyName} (${Math.round(withFamilyName / totalContacts * 100)}%)`);
        console.log(`  With MobileCoin: ${withMobileCoin} (${Math.round(withMobileCoin / totalContacts * 100)}%)`);
        console.log(`  With Username: ${withUsername} (${Math.round(withUsername / totalContacts * 100)}%)`);
        console.log(`  Registered: ${registered} (${Math.round(registered / totalContacts * 100)}%)`);

        if (groups.length > 0) {
            const totalGroups = groups.length;
            const withInviteLink = groups.filter(g => g.inviteLink).length;
            const withBanned = groups.filter(g => g.banned && g.banned.length > 0).length;
            const withPending = groups.filter(g => g.pendingMembers && g.pendingMembers.length > 0).length;

            console.log('\nGroups:');
            console.log(`  Total: ${totalGroups}`);
            console.log(`  With Invite Link: ${withInviteLink} (${Math.round(withInviteLink / totalGroups * 100)}%)`);
            console.log(`  With Banned Members: ${withBanned}`);
            console.log(`  With Pending Members: ${withPending}`);
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        signal.disconnect();
        console.log('\n✓ Disconnected');
    }
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
