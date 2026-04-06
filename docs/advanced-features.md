# Advanced Features

This guide covers the advanced features of the Signal CLI SDK, offering a range of powerful functionalities for developers. This document details how to use these features for contact management, user status checks, payment notifications, polls, attachment management, and more, along with performance optimizations and security patterns.

---

## Table of Contents

- [Advanced Messaging](#advanced-messaging)
- [Identity Verification](#identity-verification)
- [Username Management](#username-management)
- [Multi-Account Management](#multi-account-management)
- [Enhanced Parsing](#enhanced-parsing)
- [Daemon Modes](#daemon-modes)
- [Polls](#polls)
- [Attachment Management](#attachment-management)
- [Account Management](#account-management)
- [Contact Management](#contact-management)
- [User Registration Status](#user-registration-status)
- [Payment Notifications](#payment-notifications)
- [Group Management](#group-management)
- [Robust Infrastructure](#robust-infrastructure)

---

## Advanced Messaging

Send messages with advanced formatting, mentions, quotes, and editing capabilities.

### Text Styling

```javascript
const { SignalCli } = require("signal-sdk");
const signal = new SignalCli("+1234567890");

await signal.connect();

// Send message with bold text
await signal.sendMessage("+1987654321", "This is bold text", {
  textStyles: [{ start: 8, length: 4, style: "BOLD" }],
});

// Send message with multiple styles
await signal.sendMessage("+1987654321", "Bold, italic, and strikethrough", {
  textStyles: [
    { start: 0, length: 4, style: "BOLD" },
    { start: 6, length: 6, style: "ITALIC" },
    { start: 18, length: 13, style: "STRIKETHROUGH" },
  ],
});

// Available styles: BOLD, ITALIC, STRIKETHROUGH, MONOSPACE, SPOILER
```

### Mentions

```javascript
// Send message with @mention
await signal.sendMessage("+1987654321", "Hello @John, how are you?", {
  mentions: [
    {
      start: 6,
      length: 5,
      number: "+1234567890",
    },
  ],
});

// Multiple mentions
await signal.sendMessage("group-id-123", "@Alice and @Bob, please review", {
  mentions: [
    { start: 0, length: 6, number: "+1111111111" },
    { start: 11, length: 4, number: "+2222222222" },
  ],
});
```

### Quote Messages (Replies)

```javascript
// Reply to a message
await signal.sendMessage("+1987654321", "That's a great point!", {
  quote: {
    timestamp: 1705843200000,
    author: "+1987654321",
    text: "What do you think about the new SDK?",
  },
});

// Reply with mentions in quoted message
await signal.sendMessage("+1987654321", "I agree!", {
  quote: {
    timestamp: 1705843200000,
    author: "+1987654321",
    text: "@John has a good idea",
    mentions: [{ start: 0, length: 5, number: "+1234567890" }],
  },
});
```

### Edit Messages

```javascript
// Edit a previously sent message
await signal.sendMessage("+1987654321", "Corrected text here", {
  editTimestamp: 1705843200000, // Timestamp of message to edit
});

// Note: Only works with messages sent recently (within edit window)
```

### Link Previews

```javascript
// Send message with link preview
await signal.sendMessage("+1987654321", "Check out https://example.com", {
  previewUrl: "https://example.com",
  previewTitle: "Example Website",
  previewDescription: "This is an example website",
});
```

### Reply to Stories

```javascript
// Reply to a story
await signal.sendMessage("+1987654321", "Cool story!", {
  storyTimestamp: 1705843200000,
  storyAuthor: "+1987654321",
});
```

### Receive Messages with Options

```javascript
// Receive with advanced options
const messages = await signal.receive({
  timeout: 10, // Wait up to 10 seconds
  maxMessages: 50, // Receive maximum 50 messages
  ignoreAttachments: true, // Skip downloading attachments (faster)
  ignoreStories: true, // Ignore story messages
  ignoreAvatars: true, // Skip downloading avatars (v0.14.0+)
  ignoreStickers: true, // Skip downloading sticker packs (v0.14.0+)
  sendReadReceipts: false, // Don't send read receipts
});

// Process received messages
messages.forEach((msg) => {
  if (msg.dataMessage) {
    console.log("From:", msg.source);
    console.log("Message:", msg.dataMessage.message);

    // Check for mentions
    if (msg.dataMessage.mentions) {
      console.log("Mentions:", msg.dataMessage.mentions);
    }

    // Check for quotes
    if (msg.dataMessage.quote) {
      console.log("Replying to:", msg.dataMessage.quote.text);
    }
  }
});
```

### Advanced Messaging Use Cases

- **Rich formatting**: Emphasize important text with bold/italic
- **Team communication**: Mention team members to get their attention
- **Threaded conversations**: Reply to specific messages with quotes
- **Message corrections**: Edit typos or mistakes in sent messages
- **Link sharing**: Share URLs with automatic previews
- **Story engagement**: React and respond to stories

---

## Identity Verification

Verify contact identities using safety numbers for secure communication.

### Get Safety Number

```javascript
// Retrieve safety number for a contact
const safetyNumber = await signal.getSafetyNumber("+1987654321");

if (safetyNumber) {
  console.log("Safety Number:", safetyNumber);
  
  // Display safety number in groups of 5 digits
  const formatted = safetyNumber.match(/.{1,5}/g).join(" ");
  console.log("Formatted:", formatted);
  // Output: 12345 67890 12345 67890 12345 67890 12345 67890 12345 67890 12345 67890
}
```

### Verify Safety Number

```javascript
// Verify and mark as trusted
const isVerified = await signal.verifySafetyNumber(
  "+1987654321",
  "123456789012345678901234567890123456789012345678901234567890",
);

if (isVerified) {
  console.log("✓ Safety number verified and marked as trusted");
} else {
  console.log("✗ Safety number does not match");
}
```

### List Untrusted Identities

```javascript
// Check for identity changes
const untrusted = await signal.listUntrustedIdentities();

if (untrusted.length > 0) {
  console.log("⚠️  Identity changes detected:");
  untrusted.forEach((identity) => {
    console.log(`  ${identity.number}`);
    console.log(`    Key: ${identity.identityKey}`);
  });
} else {
  console.log("✓ All identities are trusted");
}
```

### Identity Verification Workflow

```javascript
// Complete verification workflow
async function verifyContact(phoneNumber) {
  // 1. Get safety number
  const safetyNumber = await signal.getSafetyNumber(phoneNumber);

  if (!safetyNumber) {
    console.log("Could not retrieve safety number");
    return false;
  }

  console.log("\nSafety Number Verification");
  console.log("===========================");
  console.log("Contact:", phoneNumber);
  console.log("Safety Number:", safetyNumber);
  console.log("\n⚠️  Compare this number in person or via a trusted channel");

  // 2. User confirms match (in real app, get user input)
  const userConfirms = true; // Replace with actual user confirmation

  if (userConfirms) {
    // 3. Mark as trusted
    const isVerified = await signal.verifySafetyNumber(phoneNumber, safetyNumber);

    if (isVerified) {
      console.log("\n✓ Identity verified and marked as trusted");
      return true;
    }
  }

  console.log("\n✗ Verification cancelled or failed");
  return false;
}

// Usage
await verifyContact("+1987654321");
```

### Identity Verification Use Cases

- **High-security communications**: Verify identities before sensitive conversations
- **Key change monitoring**: Detect when contacts reinstall Signal
- **Compliance requirements**: Meet security verification requirements
- **Trust establishment**: Build trust in new contact relationships

---

## Username Management

Manage Signal usernames for privacy-focused contact sharing.

### Set Username

```javascript
// Set your Signal username
const result = await signal.updateAccount({
  username: "john.doe.42",
});

if (result.success) {
  console.log("Username:", result.username);
  console.log("Username Link:", result.usernameLink);
  // Output: https://signal.me/#u/john.doe.42
}
```

### Get Username Link

```javascript
// Retrieve your username link
const result = await signal.updateAccount({});

if (result.usernameLink) {
  console.log("Your username link:", result.usernameLink);
  // Can be shared on social media, websites, etc.
}
```

### Delete Username

```javascript
// Remove your username
const result = await signal.updateAccount({
  deleteUsername: true,
});

if (result.success) {
  console.log("✓ Username deleted");
}
```

### Username Requirements

- **Characters**: Alphanumeric and dots only (a-z, 0-9, .)
- **No spaces**: Cannot contain spaces or special characters
- **Unique**: Must be unique across all Signal users
- **Case-insensitive**: john.doe and John.Doe are the same
- **Minimum length**: At least 3 characters
- **Dots**: Cannot start or end with a dot, no consecutive dots

### Valid Username Examples

```javascript
// Valid usernames
await signal.updateAccount({ username: "john.doe" });    // ✓
await signal.updateAccount({ username: "alice.2023" });  // ✓
await signal.updateAccount({ username: "bob.crypto" });  // ✓
await signal.updateAccount({ username: "charlie.42" });  // ✓

// Invalid usernames (will throw error)
await signal.updateAccount({ username: "john doe" });    // ✗ (space)
await signal.updateAccount({ username: "alice@signal" }); // ✗ (special char)
await signal.updateAccount({ username: ".bob" });        // ✗ (starts with dot)
await signal.updateAccount({ username: "charlie.." });   // ✗ (consecutive dots)
```

### Username Management Use Cases

- **Privacy**: Share contact info without revealing phone number
- **Professional accounts**: Create business or professional Signal presence
- **Public figures**: Allow fans/followers to contact you
- **Bot services**: Provide easy-to-remember bot usernames
- **Event coordination**: Share temporary contact for events

---

## Multi-Account Management

Manage multiple Signal accounts simultaneously with automatic event routing.

### Setup Multi-Account Manager

```javascript
const { MultiAccountManager } = require("signal-sdk");

const manager = new MultiAccountManager({
  verbose: true,
  autoReconnect: true,
});

// Add accounts
const account1 = await manager.addAccount("+1234567890");
const account2 = await manager.addAccount("+1987654321");

console.log("Added", manager.getAccounts().length, "accounts");
```

### Connect All Accounts

```javascript
// Connect all accounts simultaneously
await manager.connectAll();
console.log("✓ All accounts connected");

// Check connection status
const status = manager.getStatus();
console.log(`Connected: ${status.connectedAccounts}/${status.totalAccounts}`);
```

### Send from Different Accounts

```javascript
// Send from account 1
await manager.sendMessage(
  "+1234567890",
  "+1111111111",
  "Message from account 1",
);

// Send from account 2
await manager.sendMessage(
  "+1987654321",
  "+1111111111",
  "Message from account 2",
);
```

### Event Handling by Account

```javascript
// Listen to all messages with account context
manager.on("message", (account, envelope) => {
  console.log(`${account}: ${envelope.dataMessage?.message}`);
});

// Listen to specific account
manager.on("accountConnected", (account) => {
  console.log("Account connected:", account);
});

manager.on("accountDisconnected", (account) => {
  console.log("Account disconnected:", account);
});

// Error handling
manager.on("error", (account, error) => {
  console.error(`Account ${account} error:`, error);
});
```

### Account Management

```javascript
// Get specific account
const account = manager.getAccount("+1234567890");
if (account) {
  // Use SignalCli methods directly
  const contacts = await account.listContacts();
  console.log(`Account 1 has ${contacts.length} contacts`);
}

// Remove account
await manager.removeAccount("+1987654321");

// Cleanup
await manager.shutdown();
```

### Multi-Account Use Cases

- **Business & Personal**: Separate work and personal communications
- **Customer Support**: Multiple agents with dedicated numbers
- **Bot Services**: Manage multiple bot instances
- **Testing**: Test interactions between accounts
- **Organization**: Different accounts for different projects/teams

---

## Enhanced Parsing

Extract detailed information from contacts and groups.

### Parse Contact Profiles

```javascript
// Get contacts with enhanced parsing
const contacts = await signal.listContacts({ detailed: true });

contacts.forEach((contact) => {
  console.log("\nContact:", contact.number);
  console.log("  Given Name:", contact.givenName || "N/A");
  console.log("  Family Name:", contact.familyName || "N/A");
  console.log("  Username:", contact.username ? `@${contact.username}` : "N/A");
  console.log("  MobileCoin:", contact.mobileCoinAddress || "N/A");
  console.log("  Profile Key:", contact.profileKey || "N/A");
  console.log("  Registered:", contact.registered ? "Yes" : "No");
});
```

### Parse Group Details

```javascript
// Get groups with enhanced parsing
const groups = await signal.listGroupsDetailed({ detailed: true });

groups.forEach((group) => {
  console.log("\nGroup:", group.name);
  console.log("  ID:", group.groupId);
  console.log("  Members:", group.members?.length || 0);
  console.log("  Pending:", group.pendingMembers?.length || 0);
  console.log("  Banned:", group.banned?.length || 0);

  if (group.inviteLink || group.groupInviteLink) {
    console.log("  Invite Link:", group.inviteLink || group.groupInviteLink);
  }

  // List pending members
  if (group.pendingMembers && group.pendingMembers.length > 0) {
    console.log("  Pending Members:");
    group.pendingMembers.forEach((member) => {
      console.log(`    - ${member}`);
    });
  }

  // List banned members
  if (group.banned && group.banned.length > 0) {
    console.log("  Banned Members:");
    group.banned.forEach((member) => {
      console.log(`    - ${member}`);
    });
  }
});
```

### Extract Payment Addresses

```javascript
// Find contacts with MobileCoin addresses
const contacts = await signal.listContacts({ detailed: true });

const withPayment = contacts.filter((c) => c.mobileCoinAddress);

console.log(`\n${withPayment.length} contacts have payment addresses:\n`);
withPayment.forEach((contact) => {
  console.log(`${contact.givenName || contact.name} ${contact.familyName || ""}`);
  console.log(`  Address: ${contact.mobileCoinAddress}`);
});
```

### Enhanced Parsing Use Cases

- **Contact directories**: Build detailed contact databases
- **Payment integrations**: Identify contacts with payment capabilities
- **Group moderation**: Manage pending and banned members
- **Invite management**: Generate and share group invite links
- **Profile analysis**: Analyze contact profile completeness

---

## Daemon Modes

Connect to signal-cli daemon using different transport methods.

### Unix Socket Mode

```javascript
const { SignalCli } = require("signal-sdk");

const signal = new SignalCli("+1234567890", undefined, {
  daemonMode: "unix-socket",
  socketPath: "/var/run/signal-cli.sock",
});

await signal.connect();
console.log("✓ Connected via Unix socket");
```

### TCP Mode

```javascript
// Connect to remote daemon via TCP
const signal = new SignalCli("+1234567890", undefined, {
  daemonMode: "tcp",
  tcpHost: "localhost",
  tcpPort: 7583,
});

await signal.connect();
console.log("✓ Connected via TCP");

// For remote servers
const remoteSignal = new SignalCli("+1234567890", undefined, {
  daemonMode: "tcp",
  tcpHost: "signal-server.example.com",
  tcpPort: 7583,
});
```

### HTTP Mode

```javascript
// Connect to HTTP REST API
const signal = new SignalCli("+1234567890", undefined, {
  daemonMode: "http",
  httpBaseUrl: "http://localhost:8080",
});

await signal.connect();
console.log("✓ Connected via HTTP");
```

### Default JSON-RPC Mode (STDIO)

```javascript
// Default mode - spawns signal-cli process
const signal = new SignalCli("+1234567890");
await signal.connect();
// Uses stdin/stdout JSON-RPC communication
```

### Daemon Mode Use Cases

- **Shared daemon**: Multiple applications connecting to one daemon
- **Remote servers**: Connect to signal-cli running on different machines
- **Containerized deployments**: Use sockets for inter-container communication
- **Load balancing**: Distribute connections across multiple daemons
- **HTTP APIs**: Build REST APIs on top of signal-cli

---

## Polls

Create, vote on, and manage polls in Signal conversations.

### Create a Poll

```javascript
const { SignalCli } = require("signal-sdk");
const signal = new SignalCli("+1234567890");

await signal.connect();

// Create a poll in a group
await signal.sendPollCreate({
  question: "What's your favorite programming language?",
  options: ["JavaScript", "Python", "Rust", "Go"],
  groupId: "group-id-here",
  multiSelect: false, // Single choice poll
});

// Create a multiple-choice poll with individual recipients
await signal.sendPollCreate({
  question: "Which features do you want next?",
  options: ["Dark Mode", "File Sync", "Video Calls", "Screen Share"],
  recipients: ["+1987654321", "+1112223334"],
  multiSelect: true, // Allow multiple selections
});
```

### Vote on a Poll

```javascript
// Vote on a poll
await signal.sendPollVote(
  "group-id-or-phone", // Where the poll was sent
  {
    pollAuthor: "+1234567890", // Author of the poll
    pollTimestamp: 1705843200000, // Poll message timestamp
    optionIndexes: [1], // Vote for second option (0-indexed)
  }
);

// Vote for multiple options (if poll allows)
await signal.sendPollVote("group-id-or-phone", {
  pollAuthor: "+1234567890",
  pollTimestamp: 1705843200000,
  optionIndexes: [0, 2, 3], // Vote for first, third, and fourth options
});
```

### Terminate a Poll

```javascript
// Stop accepting votes (creator only)
await signal.sendPollTerminate(
  "group-id-or-phone",
  {
    pollTimestamp: 1705843200000, // Poll message timestamp
  }
);
```

### Poll Use Cases

- **Group decisions**: Let group members vote on meeting times, topics, or activities
- **Surveys**: Collect feedback from your Signal contacts
- **Bot interactions**: Create interactive bot experiences with polls
- **Quick polls**: Get instant feedback without leaving Signal

---

## Attachment Management

Retrieve attachments, avatars, and stickers by their unique identifiers.

### Get Attachment by ID

```javascript
// Retrieve attachment from a message
const attachment = await signal.getAttachment({
  id: "abc123...", // Attachment ID from message
  recipient: "+1234567890", // Optional: recipient context
});

console.log("Attachment retrieved:", attachment);
```

### Get Avatar

```javascript
// Get contact's avatar
const avatar = await signal.getAvatar({
  contact: "+1234567890",
});

// Get group avatar
const groupAvatar = await signal.getAvatar({
  groupId: "group-id-123",
});

// Get profile avatar
const profileAvatar = await signal.getAvatar({
  profile: "+1234567890",
});
```

### Get Sticker

```javascript
// Retrieve sticker by ID
const sticker = await signal.getSticker({
  packId: "sticker-pack-id-123",
  stickerId: 0,
});

console.log("Sticker format:", sticker);
```

### Attachment Use Cases

- **Media archival**: Download and archive important attachments
- **Content processing**: Process images, documents, or videos programmatically
- **Avatar management**: Sync avatars to external systems
- **Sticker collections**: Build custom sticker management tools

---

## Account Management

Manage account settings, profile information, and account details.

### Update Profile

```javascript
// Update profile name and avatar
await signal.updateProfile(
  "John",                    // givenName (required)
  "Software Developer",      // about
  "💻",                      // aboutEmoji
  "./profile-picture.jpg",   // avatar
  {
    familyName: "Doe",
    mobileCoinAddress: "your-mobilecoin-address",
  }
);

// Remove avatar
await signal.updateProfile(
  "John",
  undefined,
  undefined,
  undefined,
  { removeAvatar: true }
);
```

### Update Account Settings

```javascript
// Update account settings
const result = await signal.updateAccount({
  deviceName: "My Laptop",
});

// Set username
const result = await signal.updateAccount({
  username: "john.doe.42",
});

// Update privacy settings
await signal.updateAccount({
  discoverableByNumber: false,
  numberSharing: false,
  unrestrictedUnidentifiedSender: false,
});

// Delete username
await signal.updateAccount({
  deleteUsername: true,
});
```

### List Accounts with Details

```javascript
// Get detailed information about all registered accounts
const accounts = await signal.listAccountsDetailed();

accounts.forEach((account) => {
  console.log(`Account: ${account.name || "N/A"} (${account.number})`);
  console.log(`  UUID: ${account.uuid || "N/A"}`);
  console.log(`  Registered: ${account.registered !== false ? "Yes" : "No"}`);
});
```

### Account Management Use Cases

- **Profile updates**: Programmatically update profile information
- **Multi-account management**: Manage multiple Signal accounts
- **Backup and restore**: Export account settings for backup
- **Bot profiles**: Set appropriate names and avatars for bots

### Phone Number Change

Change your Signal account to a new phone number with two-step verification process.

```javascript
// Step 1: Start the change number process
await signal.startChangeNumber("+33612345678");

// Wait for SMS/voice verification code...

// Step 2: Complete the change with verification code
await signal.finishChangeNumber("+33612345678", "123456");

// With PIN if registration lock is enabled
await signal.finishChangeNumber("+33612345678", "123456", "1234");
```

**Voice Verification:**

```javascript
// Use voice call instead of SMS
await signal.startChangeNumber("+33612345678", true);
```

**With Captcha:**

```javascript
// If captcha is required
const captcha = "captcha_token_from_signalcaptchas.org";
await signal.startChangeNumber("+33612345678", false, captcha);
```

### Payment Notifications

Send MobileCoin payment notifications through Signal's cryptocurrency integration.

```javascript
// Send payment notification with receipt and note
await signal.sendPaymentNotification("+33612345678", {
  receipt: "base64EncodedMobileCoinReceipt",
  note: "Thanks for dinner! 🍕",
});

// Without note
await signal.sendPaymentNotification("+33612345678", {
  receipt: "base64EncodedMobileCoinReceipt",
});
```

**Use Cases:**

- **Cryptocurrency payments**: Notify recipients of MobileCoin transactions
- **Payment confirmations**: Send payment receipts with custom notes
- **P2P payments**: Integrate MobileCoin payments in Signal conversations

**Requirements:**

- MobileCoin wallet integration
- Valid payment receipt blob (base64 encoded)
- Recipient must have Signal with MobileCoin enabled

---

## Group Management

### List Groups with Details

Get comprehensive group information including permissions and member roles.

```javascript
// Get detailed group information
const groups = await signal.listGroupsDetailed({ detailed: true });

groups.forEach((group) => {
  console.log(`Group: ${group.name}`);
  console.log(`  ID: ${group.groupId}`);
  console.log(`  Description: ${group.description || "None"}`);
  console.log(`  Members: ${group.members?.length || 0}`);
  console.log(`  Admin: ${group.isAdmin ? "Yes" : "No"}`);

  if (group.inviteLink || group.groupInviteLink) {
    console.log(`  Invite Link: ${group.inviteLink || group.groupInviteLink}`);
  }

  // Member details
  if (group.members) {
    group.members.forEach((member) => {
      console.log(`    - ${member}`);
    });
  }

  // Pending members
  if (group.pendingMembers?.length > 0) {
    console.log(`  Pending: ${group.pendingMembers.length}`);
  }
});
```

### Group Use Cases

- **Group analytics**: Track member counts and activity
- **Permission management**: Monitor admin status and permissions
- **Invite link generation**: Programmatically manage group invites
- **Member auditing**: Review member lists and roles

---

## Robust Infrastructure

The SDK includes enterprise-grade reliability features:

### Error Handling

```javascript
import {
  SignalCli,
  ConnectionError,
  ValidationError,
  RateLimitError,
  TimeoutError,
} from "signal-sdk";

try {
  await signal.sendMessage(recipient, message);
} catch (error) {
  if (error instanceof ConnectionError) {
    console.error("Connection failed:", error.message);
    // Automatic retry with exponential backoff
  } else if (error instanceof ValidationError) {
    console.error("Invalid input:", error.message);
  } else if (error instanceof RateLimitError) {
    console.error("Rate limited, waiting...");
    await sleep(error.retryAfter);
  }
}
```

### Automatic Retry

The SDK automatically retries operations with exponential backoff based on the `maxRetries` and `retryDelay` configuration options.

```javascript
const signal = new SignalCli("+1234567890", undefined, {
  maxRetries: 5,
  retryDelay: 1000,
});

// Operations automatically retry on transient failures
await signal.sendMessage(recipient, message);
```

### Rate Limiting

The SDK includes built-in rate limiting to prevent hitting Signal's API limits:

```javascript
const signal = new SignalCli("+1234567890", undefined, {
  maxConcurrentRequests: 5, // Max 5 concurrent operations
  minRequestInterval: 200,  // 200ms between requests
});

// Bulk operations automatically rate-limited
const recipients = ["+1111111111", "+2222222222", "+3333333333"];
for (const recipient of recipients) {
  await signal.sendMessage(recipient, "Bulk message");
}
```

### Input Validation

All SDK methods automatically validate inputs:

```javascript
import { validatePhoneNumber, validateMessage } from "signal-sdk";

// Validate before sending
try {
  validatePhoneNumber(userInput);
  validateMessage(userMessage);
  await signal.sendMessage(userInput, userMessage);
} catch (error) {
  console.error("Validation failed:", error.message);
}
```

### Structured Logging

```javascript
const { SignalCli } = require("signal-sdk");

const signal = new SignalCli("+1234567890", undefined, {
  verbose: true,
  logFile: "./signal-sdk.log",
});

// Automatic structured logging
// [2024-01-21T10:30:45.123Z] [INFO] - Connecting to signal-cli daemon
// [2024-01-21T10:30:45.456Z] [INFO] - Connected successfully
```

For complete infrastructure documentation, see [Robust Infrastructure Guide](./robust-infrastructure.md).

---

## Contact Management

### Remove Contacts

Remove contacts from your Signal account with different levels of data removal.

```javascript
const { SignalCli } = require("signal-sdk");
const signal = new SignalCli("+1234567890");

await signal.connect();

// Hide contact from list but keep encryption data
await signal.removeContact("+1987654321", { hide: true });

// Completely remove all contact data (sessions, keys, etc.)
await signal.removeContact("+1987654321", { forget: true });
```

#### Options

- `hide: boolean` - Hide the contact in the contact list, but keep the data
- `forget: boolean` - Delete all data associated with this contact, including identity keys and sessions

### Export and Send Contacts

Send your contact list to another Signal user or export for backup.

```javascript
// Send contact list to a user (exports contacts in vCard format)
await signal.sendContacts({
  includeAllRecipients: true,
});
```

This is useful for:
- Contact sharing between devices
- Backup and restore operations
- Contact synchronization

#### Use Cases

- Clean up contact lists
- Remove old or unwanted contacts
- Privacy management after blocking
- Contact backup and migration
- Share contacts with team members

---

## User Registration Status

### Check Registration Status

Verify if phone numbers are registered with Signal before sending messages.

```javascript
const userStatus = await signal.getUserStatus({
  recipients: [
    "+1234567890",
    "+1987654321",
    "+1122334455",
  ],
});

userStatus.forEach((status) => {
  console.log(
    `${status.number}: ${status.isRegistered ? "Registered" : "Not registered"}`,
  );
  if (status.uuid) console.log(`  UUID: ${status.uuid}`);
  if (status.username) console.log(`  Username: ${status.username}`);
});
```

#### Response Format

```typescript
interface UserStatusResult {
  number: string;        // Phone number checked
  isRegistered: boolean; // Whether user is on Signal
  uuid?: string;         // Signal UUID if registered
  username?: string;     // Username if available
}
```

#### Use Cases

- Bot onboarding: Check if users are on Signal
- Contact validation before messaging
- User discovery in applications
- Prevent messaging unregistered numbers

---

## Custom Sticker Packs

### Upload Sticker Packs

Create and upload custom sticker packs to Signal.

```javascript
const stickerResult = await signal.uploadStickerPack({
  path: "./my-stickers/manifest.json",
});

console.log(`Pack ID: ${stickerResult.packId}`);
console.log(`Pack Key: ${stickerResult.packKey}`);
console.log(`Install URL: ${stickerResult.installUrl}`);
```

#### Sticker Pack Structure

Create a manifest.json file:

```json
{
  "title": "My Custom Stickers",
  "author": "Your Name",
  "cover": {
    "id": 0,
    "emoji": "smile"
  },
  "stickers": [
    { "id": 0, "emoji": "smile" },
    { "id": 1, "emoji": "cool" },
    { "id": 2, "emoji": "party" }
  ]
}
```

Directory structure:

```
my-stickers/
├── manifest.json
├── 0.webp (cover sticker)
├── 1.webp
└── 2.webp
```

#### Requirements

- Stickers must be WebP format
- Maximum 200 stickers per pack
- Sticker size: 256x256 pixels recommended
- Total pack size limit: ~10MB

---

## Rate Limit Recovery

### Handle Rate Limiting

Automatically recover from rate limiting with captcha challenges.

```javascript
try {
  await signal.sendMessage("+1234567890", "Hello!");
} catch (error) {
  if (error.message.includes("proof required")) {
    // Extract challenge token from error
    const challengeToken = extractChallenge(error);

    // Solve captcha (integrate with captcha service)
    const captchaToken = await solveCaptcha();

    // Submit challenge
    const result = await signal.submitRateLimitChallenge(
      challengeToken,
      captchaToken,
    );

    if (result.success) {
      // Retry the original operation
      await signal.sendMessage("+1234567890", "Hello!");
    } else {
      console.log(`Wait ${result.retryAfter} seconds before retry`);
    }
  }
}
```

#### Response Format

```typescript
interface RateLimitChallengeResult {
  success: boolean;    // Whether challenge was accepted
  retryAfter?: number; // Seconds to wait before retry
  message?: string;    // Additional server message
}
```

---

## Enhanced Messaging

### Progress Tracking

Track upload progress for large attachments.

**Note:** The progress callback currently provides simulated progress (0-100 in steps of 10) for attachment uploads. This is not the actual upload progress from signal-cli, as JSON-RPC does not provide real-time upload progress feedback. The simulation occurs before the actual send operation and is for UX purposes only.

```javascript
await signal.sendMessageWithProgress(
  "+1234567890",
  "Sending large file...",
  {
    attachments: ["./large-video.mp4"],
    onProgress: (progress) => {
      console.log(`Upload: ${progress.percentage}%`);
      console.log(`Total: ${progress.total}`);
      console.log(`Uploaded: ${progress.uploaded}`);
    },
  }
);
```

---

## Performance Optimization

### Connection Pooling

For high-throughput scenarios, implement connection pooling:

```javascript
const { SignalCli } = require("signal-sdk");

class SignalPool {
  constructor(phoneNumbers, poolSize = 3) {
    this.pools = new Map();
    this.poolSize = poolSize;

    phoneNumbers.forEach((phone) => {
      this.pools.set(phone, {
        connections: [],
        activeIndex: 0,
      });
    });
  }

  async getConnection(phoneNumber) {
    const pool = this.pools.get(phoneNumber);
    if (!pool) throw new Error(`No pool for ${phoneNumber}`);

    // Create connections if needed
    if (pool.connections.length < this.poolSize) {
      const signal = new SignalCli(phoneNumber);
      await signal.connect();
      pool.connections.push(signal);
    }

    // Round-robin selection
    const connection = pool.connections[pool.activeIndex];
    pool.activeIndex = (pool.activeIndex + 1) % pool.connections.length;

    return connection;
  }

  async sendMessage(phoneNumber, recipient, message, options = {}) {
    const signal = await this.getConnection(phoneNumber);
    return signal.sendMessage(recipient, message, options);
  }

  async shutdown() {
    for (const [phone, pool] of this.pools) {
      await Promise.all(
        pool.connections.map((conn) => conn.gracefulShutdown()),
      );
    }
  }
}

// Usage
const pool = new SignalPool(["+33111111111", "+33222222222"]);
await pool.sendMessage("+33111111111", "+33000000000", "Hello!");
```

### Batch Operations

```javascript
class BatchProcessor {
  constructor(signalCli, batchSize = 10, delayMs = 100) {
    this.signal = signalCli;
    this.batchSize = batchSize;
    this.delayMs = delayMs;
    this.queue = [];
    this.processing = false;
  }

  async addMessage(recipient, message, options = {}) {
    return new Promise((resolve, reject) => {
      this.queue.push({ recipient, message, options, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);

      await Promise.all(
        batch.map(async (item) => {
          try {
            const result = await this.signal.sendMessage(
              item.recipient,
              item.message,
              item.options,
            );
            item.resolve(result);
          } catch (error) {
            item.reject(error);
          }
        }),
      );

      // Delay between batches to avoid rate limiting
      if (this.queue.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.delayMs));
      }
    }

    this.processing = false;
  }
}

// Usage
const batch = new BatchProcessor(signal, 5, 200);

// Queue multiple messages
const promises = [
  batch.addMessage("+33000000001", "Hello 1"),
  batch.addMessage("+33000000002", "Hello 2"),
  batch.addMessage("+33000000003", "Hello 3"),
];

await Promise.all(promises);
```

---

## Security Patterns

### Message Encryption

```javascript
const crypto = require("crypto");

class SecureSignalBot {
  constructor(signalBot, encryptionKey) {
    this.bot = signalBot;
    this.key = crypto.scryptSync(encryptionKey, "salt", 32);
    this.setupSecureHandlers();
  }

  setupSecureHandlers() {
    // Intercept outgoing messages
    const originalSendMessage = this.bot.sendMessage.bind(this.bot);
    this.bot.sendMessage = async (recipient, message, options = {}) => {
      if (options.encrypt) {
        message = this.encrypt(message);
      }
      return originalSendMessage(recipient, message, options);
    };

    // Decrypt incoming messages
    this.bot.on("message", (message) => {
      if (this.isEncrypted(message.text)) {
        try {
          message.decryptedText = this.decrypt(message.text);
          this.bot.emit("secureMessage", message);
        } catch (error) {
          console.error("Failed to decrypt message:", error);
        }
      }
    });
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", this.key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    return `🔒${iv.toString("hex")}:${encrypted}`;
  }

  decrypt(encryptedText) {
    if (!encryptedText.startsWith("🔒")) {
      throw new Error("Not an encrypted message");
    }

    const content = encryptedText.substring(2);
    const [ivHex, encrypted] = content.split(":");

    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", this.key, iv);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  isEncrypted(text) {
    return text && text.startsWith("🔒");
  }
}

// Usage
const secureBot = new SecureSignalBot(bot, "my-secret-key");

// Send encrypted message
await secureBot.bot.sendMessage("+33000000000", "Secret message", {
  encrypt: true,
});

// Handle decrypted messages
secureBot.bot.on("secureMessage", (message) => {
  console.log("🔓 Decrypted:", message.decryptedText);
});
```

---

## Monitoring & Analytics

### Basic Logging

```javascript
// Simple event tracking
const eventCounts = new Map();

signal.on("message", () => {
  eventCounts.set("message", (eventCounts.get("message") || 0) + 1);
});

signal.on("reaction", () => {
  eventCounts.set("reaction", (eventCounts.get("reaction") || 0) + 1);
});

// Print stats every minute
setInterval(() => {
  console.log("Event stats:", Object.fromEntries(eventCounts));
}, 60000);
```

---

## Summary

The Signal SDK provides a comprehensive set of advanced features for building sophisticated Signal applications:

- **Advanced Messaging**: Text styling, mentions, quotes, edits, stories
- **Identity Verification**: Safety numbers, trust management
- **Username Management**: Privacy-focused contact sharing
- **Multi-Account**: Manage multiple Signal accounts
- **Daemon Modes**: Multiple connection options
- **Polls**: Interactive surveys and voting
- **Attachments**: Media retrieval and management
- **Account Management**: Profile, settings, phone number changes
- **Infrastructure**: Retry, rate limiting, validation, logging

For more details on specific features, refer to the [API Reference](./api-reference.md) and [SignalBot Framework](./signalbot-framework.md) guides.
