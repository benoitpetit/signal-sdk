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
await signal.sendMessage("+1987654321", "This is **bold** text", {
  textStyle: [{ start: 8, length: 6, style: "BOLD" }],
});

// Send message with multiple styles
await signal.sendMessage("+1987654321", "Bold, italic, and strikethrough", {
  textStyle: [
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
  mention: [
    {
      start: 6,
      length: 5,
      uuid: "user-uuid-here",
    },
  ],
});

// Multiple mentions
await signal.sendMessage("group-id-123", "@Alice and @Bob, please review", {
  mention: [
    { start: 0, length: 6, uuid: "alice-uuid" },
    { start: 11, length: 4, uuid: "bob-uuid" },
  ],
});
```

### Quote Messages (Replies)

```javascript
// Reply to a message
await signal.sendMessage("+1987654321", "That's a great point!", {
  quoteTimestamp: 1705843200000,
  quoteAuthor: "+1987654321",
  quoteMessage: "What do you think about the new SDK?",
});

// Reply with mentions in quoted message
await signal.sendMessage("+1987654321", "I agree!", {
  quoteTimestamp: 1705843200000,
  quoteAuthor: "+1987654321",
  quoteMessage: "@John has a good idea",
  quoteMention: [{ start: 0, length: 5, uuid: "john-uuid" }],
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
  sendReadReceipts: false, // Don't send read receipts
});

// Process received messages
messages.forEach((msg) => {
  if (msg.dataMessage) {
    console.log("From:", msg.source);
    console.log("Message:", msg.dataMessage.message);

    // Check for mentions
    if (msg.dataMessage.mention) {
      console.log("Mentions:", msg.dataMessage.mention);
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
const safetyInfo = await signal.getSafetyNumber("+1987654321");

console.log("Safety Number:", safetyInfo.safetyNumber);
console.log("Identity Key:", safetyInfo.identityKey);
console.log("Trusted:", safetyInfo.trusted);

// Display safety number in groups of 5 digits
const formatted = safetyInfo.safetyNumber.match(/.{1,5}/g).join(" ");
console.log("Formatted:", formatted);
// Output: 12345 67890 12345 67890 12345 67890 12345 67890 12345 67890 12345 67890
```

### Verify Safety Number

```javascript
// Verify and mark as trusted
const result = await signal.verifySafetyNumber(
  "+1987654321",
  "123456789012345678901234567890123456789012345678901234567890",
);

if (result.success) {
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
    console.log(`    New key: ${identity.identityKey}`);
    console.log(`    Added: ${new Date(identity.addedDate).toLocaleString()}`);
  });
} else {
  console.log("✓ All identities are trusted");
}

// Check specific contact
const contactUntrusted = await signal.listUntrustedIdentities("+1987654321");
if (contactUntrusted.length > 0) {
  console.log("This contact's identity has changed - verification required");
}
```

### Identity Verification Workflow

```javascript
// Complete verification workflow
async function verifyContact(phoneNumber) {
  // 1. Get safety number
  const safetyInfo = await signal.getSafetyNumber(phoneNumber);

  console.log("\nSafety Number Verification");
  console.log("===========================");
  console.log("Contact:", phoneNumber);
  console.log("Safety Number:", safetyInfo.safetyNumber);
  console.log("\n⚠️  Compare this number in person or via a trusted channel");

  // 2. User confirms match (in real app, get user input)
  const userConfirms = true; // Replace with actual user confirmation

  if (userConfirms) {
    // 3. Mark as trusted
    const result = await signal.verifySafetyNumber(
      phoneNumber,
      safetyInfo.safetyNumber,
    );

    if (result.success) {
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
const result = await signal.setUsername("john.doe.42");

console.log("Username:", result.username);
console.log("Username Link:", result.usernameLink);
// Output: https://signal.me/#u/john.doe.42

console.log(
  "\nShare this link to let people contact you without your phone number!",
);
```

### Get Username Link

```javascript
// Retrieve your username link
const link = await signal.getUsernameLink();

console.log("Your username link:", link);
// Can be shared on social media, websites, etc.
```

### Delete Username

```javascript
// Remove your username
await signal.deleteUsername();
console.log("✓ Username deleted");
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
await signal.setUsername("john.doe"); // ✓
await signal.setUsername("alice.2023"); // ✓
await signal.setUsername("bob_crypto"); // ✓ (underscores allowed)
await signal.setUsername("charlie.42"); // ✓

// Invalid usernames
await signal.setUsername("john doe"); // ✗ (space)
await signal.setUsername("alice@signal"); // ✗ (special char)
await signal.setUsername(".bob"); // ✗ (starts with dot)
await signal.setUsername("charlie.."); // ✗ (consecutive dots)
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

const manager = new MultiAccountManager();

// Add accounts
const account1 = manager.addAccount("+1234567890");
const account2 = manager.addAccount("+1987654321");

console.log("Added", manager.getAccounts().size, "accounts");
```

### Connect All Accounts

```javascript
// Connect all accounts simultaneously
await manager.connectAll();
console.log("✓ All accounts connected");

// Check connection status
const statuses = manager.getAllStatus();
statuses.forEach((status) => {
  console.log(
    `${status.account}: ${status.connected ? "Connected" : "Disconnected"}`,
  );
});
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

### Receive Messages by Account

```javascript
// Receive for specific account
const messages1 = await manager.receive("+1234567890", {
  timeout: 5,
  ignoreStories: true,
});

const messages2 = await manager.receive("+1987654321", {
  timeout: 5,
  ignoreStories: true,
});

console.log(`Account 1: ${messages1.length} messages`);
console.log(`Account 2: ${messages2.length} messages`);
```

### Event Handling by Account

```javascript
// Listen to specific account
manager.on("message:+1234567890", (envelope) => {
  console.log("Account 1 received:", envelope.dataMessage?.message);
});

manager.on("message:+1987654321", (envelope) => {
  console.log("Account 2 received:", envelope.dataMessage?.message);
});

// Listen to all messages with account context
manager.on("message", (account, envelope) => {
  console.log(`${account}: ${envelope.dataMessage?.message}`);
});

// Connection events
manager.on("connected:+1234567890", () => {
  console.log("Account 1 connected");
});

manager.on("disconnected:+1987654321", () => {
  console.log("Account 2 disconnected");
});

// Error handling
manager.on("error:+1234567890", (error) => {
  console.error("Account 1 error:", error);
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
manager.removeAccount("+1987654321");

// Cleanup
manager.disconnectAll();
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
const contacts = await signal.getContactsWithProfiles();

contacts.forEach((contact) => {
  console.log("\nContact:", contact.number);
  console.log("  Given Name:", contact.givenName || "N/A");
  console.log("  Family Name:", contact.familyName || "N/A");
  console.log("  Username:", contact.username ? `@${contact.username}` : "N/A");
  console.log("  MobileCoin:", contact.mobileCoinAddress || "N/A");
  console.log("  Profile Key:", contact.profileKey || "N/A");
  console.log("  Registered:", contact.registered ? "Yes" : "No");
});

// Or parse manually
const rawContacts = await signal.listContacts();
const enhanced = rawContacts.map((c) => signal.parseContactProfile(c));
```

### Parse Group Details

```javascript
// Get groups with enhanced parsing
const groups = await signal.getGroupsWithDetails();

groups.forEach((group) => {
  console.log("\nGroup:", group.name);
  console.log("  ID:", group.groupId);
  console.log("  Members:", group.members.length);
  console.log("  Pending:", group.pendingMembers?.length || 0);
  console.log("  Banned:", group.bannedMembers?.length || 0);

  if (group.inviteLink) {
    console.log("  Invite Link:", group.inviteLink);
  }

  console.log("  Version:", group.version);
  console.log("  Master Key:", group.masterKey?.substring(0, 20) + "...");

  // List pending members
  if (group.pendingMembers && group.pendingMembers.length > 0) {
    console.log("  Pending Members:");
    group.pendingMembers.forEach((member) => {
      console.log(`    - ${member}`);
    });
  }

  // List banned members
  if (group.bannedMembers && group.bannedMembers.length > 0) {
    console.log("  Banned Members:");
    group.bannedMembers.forEach((member) => {
      console.log(`    - ${member}`);
    });
  }
});
```

### Extract Payment Addresses

```javascript
// Find contacts with MobileCoin addresses
const contacts = await signal.getContactsWithProfiles();

const withPayment = contacts.filter((c) => c.mobileCoinAddress);

console.log(`\n${withPayment.length} contacts have payment addresses:\n`);
withPayment.forEach((contact) => {
  console.log(`${contact.givenName} ${contact.familyName}`);
  console.log(`  Address: ${contact.mobileCoinAddress}`);
});
```

### Group Moderation

```javascript
// Get group with details
const groups = await signal.getGroupsWithDetails();
const myGroup = groups.find((g) => g.name === "My Group");

if (myGroup) {
  console.log("\nGroup Moderation Status:");
  console.log("========================");
  console.log("Active Members:", myGroup.members.length);
  console.log("Pending Approval:", myGroup.pendingMembers?.length || 0);
  console.log("Banned:", myGroup.bannedMembers?.length || 0);

  // Manage banned members
  if (myGroup.bannedMembers && myGroup.bannedMembers.length > 0) {
    console.log("\n⚠️  Review banned members:");
    myGroup.bannedMembers.forEach((member) => {
      console.log(`  - ${member}`);
    });
  }
}
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
  socketPath: "/var/run/signal-cli.sock",
});

await signal.connect();
console.log("✓ Connected via Unix socket");
```

### TCP Mode

```javascript
// Connect to remote daemon via TCP
const signal = new SignalCli("+1234567890", undefined, {
  tcpHost: "localhost",
  tcpPort: 7583,
});

await signal.connect();
console.log("✓ Connected via TCP");

// For remote servers
const remoteSignal = new SignalCli("+1234567890", undefined, {
  tcpHost: "signal-server.example.com",
  tcpPort: 7583,
});
```

### HTTP Mode

```javascript
// Connect to HTTP REST API
const signal = new SignalCli("+1234567890", undefined, {
  httpHost: "localhost",
  httpPort: 8080,
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

// Create a poll in a group or with a contact
await signal.sendPollCreate(
  "group-id-or-phone",
  "What's your favorite programming language?",
  {
    answers: ["JavaScript", "Python", "Rust", "Go"],
    multipleAnswers: false, // Single choice poll
  },
);

// Create a multiple-choice poll
await signal.sendPollCreate("+1987654321", "Which features do you want next?", {
  answers: ["Dark Mode", "File Sync", "Video Calls", "Screen Share"],
  multipleAnswers: true, // Allow multiple selections
});
```

### Vote on a Poll

```javascript
// Vote on a poll (use timestamp from poll message)
await signal.sendPollVote(
  "group-id-or-phone",
  1705843200000, // Poll message timestamp
  {
    votes: [1], // Vote for second option (0-indexed)
  },
);

// Vote for multiple options (if poll allows)
await signal.sendPollVote("group-id-or-phone", 1705843200000, {
  votes: [0, 2, 3], // Vote for first, third, and fourth options
});
```

### Terminate a Poll

```javascript
// Stop accepting votes (creator only)
await signal.sendPollTerminate(
  "group-id-or-phone",
  1705843200000, // Poll message timestamp
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
const attachment = await signal.getAttachment(
  "abc123...", // Attachment ID from message
  "./downloads/document.pdf", // Optional: save to file
);

console.log("Content type:", attachment.contentType);
console.log("Size:", attachment.size);
console.log("Data:", attachment.data); // Buffer if no outputPath
```

### Get Avatar

```javascript
// Get contact's avatar
const avatar = await signal.getAvatar("+1234567890", "./avatars/contact.jpg");

// Get group avatar
const groupAvatar = await signal.getAvatar(
  "group-id-123",
  "./avatars/group.jpg",
);

// Get avatar data without saving
const avatarData = await signal.getAvatar("+1234567890");
console.log("Avatar type:", avatarData.contentType);
// avatarData.data contains the image buffer
```

### Get Sticker

```javascript
// Retrieve sticker by ID
const sticker = await signal.getSticker(
  "sticker-pack-id-123",
  "./stickers/funny-cat.webp",
);

console.log("Sticker format:", sticker.contentType);
```

### Attachment Use Cases

- **Media archival**: Download and archive important attachments
- **Content processing**: Process images, documents, or videos programmatically
- **Avatar management**: Sync avatars to external systems
- **Sticker collections**: Build custom sticker management tools

---

## Account Management

Manage account settings, profile information, and account details.

### Update Account

```javascript
// Update profile name and avatar
const result = await signal.updateAccount({
  name: "John Doe",
  avatar: "./profile-picture.jpg",
});

// Update about section
await signal.updateAccount({
  about: "Signal SDK Developer",
  aboutEmoji: "computer",
});

// Remove avatar
await signal.updateAccount({
  removeAvatar: true,
});

// Update MobileCoin address for payments
await signal.updateAccount({
  mobileCoinAddress: "your-mobilecoin-address",
});

// Multiple updates at once
await signal.updateAccount({
  name: "Jane Smith",
  avatar: "./new-avatar.jpg",
  about: "Open source enthusiast",
  aboutEmoji: "🚀",
});
```

### List Accounts with Details

```javascript
// Get detailed information about all registered accounts
const accounts = await signal.listAccountsDetailed();

accounts.forEach((account) => {
  console.log(`Account: ${account.name} (${account.number})`);
  console.log(`  UUID: ${account.uuid}`);
  console.log(`  Username: ${account.username || "Not set"}`);
  console.log(`  About: ${account.about || "No status"}`);
  console.log(`  Device ID: ${account.deviceId}`);
  console.log(`  Registered: ${account.registered}`);
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

**Error Handling:**

```javascript
try {
  await signal.startChangeNumber("+33612345678");
} catch (error) {
  if (error.message.includes("captcha")) {
    // Get captcha from https://signalcaptchas.org/registration/generate.html
    const captcha = await getCaptchaToken();
    await signal.startChangeNumber("+33612345678", false, captcha);
  } else if (error.message.includes("rate limit")) {
    // Wait and retry
    await sleep(3600000); // 1 hour
  }
}
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
const groups = await signal.listGroupsDetailed();

groups.forEach((group) => {
  console.log(`Group: ${group.name}`);
  console.log(`  ID: ${group.groupId}`);
  console.log(`  Description: ${group.description || "None"}`);
  console.log(`  Members: ${group.members.length}`);
  console.log(`  Admin: ${group.isAdmin ? "Yes" : "No"}`);

  if (group.inviteLink) {
    console.log(`  Invite Link: ${group.inviteLink}`);
  }

  // Member details
  group.members.forEach((member) => {
    console.log(`    - ${member.name} (${member.role})`);
  });

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
  ConnectionError,
  ValidationError,
  RateLimitError,
  TimeoutError,
} from "signal-sdk";

try {
  await signal.sendMessage(recipient, message);
} catch (error) {
  if (error instanceof ConnectionError) {
    console.error("Connection failed, retrying...");
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

```javascript
import { SignalCli } from "signal-sdk";

// Configure retry with exponential backoff
const signal = new SignalCli("+1234567890", undefined, {
  retryConfig: {
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 60000,
    backoffMultiplier: 2,
  },
});

// Operations automatically retry on transient failures
await signal.sendMessage(recipient, message);
```

### Rate Limiting

```javascript
import { RateLimiter } from "signal-sdk";

// Client-side rate limiting
const signal = new SignalCli("+1234567890", undefined, {
  rateLimiter: {
    maxConcurrent: 5, // Max 5 concurrent operations
    minInterval: 200, // 200ms between requests
  },
});

// Bulk operations automatically rate-limited
const recipients = ["+1111111111", "+2222222222" /* ... */];
for (const recipient of recipients) {
  await signal.sendMessage(recipient, "Bulk message");
}
```

### Input Validation

```javascript
import {
  validatePhoneNumber,
  validateMessage,
  sanitizeInput,
} from "signal-sdk";

// Validate before sending
try {
  validatePhoneNumber(userInput);
  const message = sanitizeInput(userMessage);
  await signal.sendMessage(userInput, message);
} catch (error) {
  console.error("Validation failed:", error.message);
}
```

### Structured Logging

```javascript
import { Logger, SignalCli } from "signal-sdk";

const logger = new Logger("info");
const signal = new SignalCli("+1234567890", undefined, { logger });

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
// Send contact list to a user
await signal.sendContacts("+1234567890");

// Send contacts to a group
await signal.sendContacts("group-id-123");
```

This exports your Signal contacts in vCard format and sends them as an attachment. Useful for:

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
const userStatus = await signal.getUserStatus([
  "+1234567890",
  "+1987654321",
  "+1122334455",
]);

userStatus.forEach((status) => {
  console.log(
    `${status.number}: ${status.isRegistered ? "Registered" : "Not registered"}`,
  );
  if (status.uuid) console.log(`UUID: ${status.uuid}`);
  if (status.username) console.log(`Username: ${status.username}`);
});
```

#### Response Format

```typescript
interface UserStatusResult {
  number: string; // Phone number checked
  isRegistered: boolean; // Whether user is on Signal
  uuid?: string; // Signal UUID if registered
  username?: string; // Username if available
}
```

#### Use Cases

- Bot onboarding: Check if users are on Signal
- Contact validation before messaging
- User discovery in applications
- Prevent messaging unregistered numbers

---

## Payment Notifications

### Send Payment Receipts

Send payment notifications with receipts to other Signal users.

```javascript
await signal.sendPaymentNotification("+1234567890", {
  receipt: "base64-encoded-receipt-blob",
  note: "Payment for coffee ☕",
});

// Group payment notification
await signal.sendPaymentNotification("group-id-here", {
  receipt: "base64-receipt-data",
  note: "Split dinner bill",
});
```

#### Parameters

- `receipt: string` - Base64 encoded receipt blob (required)
- `note?: string` - Optional note for the payment

#### Use Cases

- Payment confirmations
- Receipt sharing
- Transaction notifications
- Business payment workflows

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
  success: boolean; // Whether challenge was accepted
  retryAfter?: number; // Seconds to wait before retry
  message?: string; // Additional server message
}
```

---

## Enhanced Messaging

### Progress Tracking

Track upload progress for large attachments.

```javascript
await signal.sendMessageWithProgress("+1234567890", "Sending large file...", {
  attachments: ["./large-video.mp4"],
  onProgress: (progress) => {
    console.log(`Upload: ${progress.percentage}%`);
    console.log(`Speed: ${progress.speed} bytes/sec`);
    console.log(`ETA: ${progress.timeRemaining} seconds`);
  },
});
```

---

## Performance Optimization

### Connection Pooling

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

### Message Queuing

```javascript
const Queue = require("bull");
const redis = require("redis");

class MessageQueue {
  constructor(signalCli, redisConfig = {}) {
    this.signal = signalCli;
    this.queue = new Queue("message queue", {
      redis: redisConfig,
    });

    this.setupProcessor();
  }

  setupProcessor() {
    this.queue.process("sendMessage", async (job) => {
      const { recipient, message, options } = job.data;

      try {
        const result = await this.signal.sendMessage(
          recipient,
          message,
          options,
        );
        return result;
      } catch (error) {
        throw error;
      }
    });

    this.queue.on("completed", (job, result) => {
      console.log(`- Message sent: ${job.data.recipient}`);
    });

    this.queue.on("failed", (job, error) => {
      console.error(`ERROR: Message failed: ${job.data.recipient}`, error);
    });
  }

  async queueMessage(recipient, message, options = {}, jobOptions = {}) {
    return this.queue.add(
      "sendMessage",
      { recipient, message, options },
      {
        delay: jobOptions.delay || 0,
        attempts: jobOptions.retries || 3,
        backoff: "exponential",
        ...jobOptions,
      },
    );
  }

  async getStats() {
    return {
      waiting: await this.queue.getWaiting(),
      active: await this.queue.getActive(),
      completed: await this.queue.getCompleted(),
      failed: await this.queue.getFailed(),
    };
  }
}

// Usage with Redis
const messageQueue = new MessageQueue(signal, {
  host: "localhost",
  port: 6379,
});

// Queue message with 30 second delay
await messageQueue.queueMessage(
  "+33000000000",
  "Delayed message",
  {},
  { delay: 30000 },
);
```

## Custom JSON-RPC Implementation

### Direct JSON-RPC Client

```javascript
const net = require("net");
const { EventEmitter } = require("events");

class SignalRPC extends EventEmitter {
  constructor(socketPath = "/tmp/signal-cli-rpc") {
    super();
    this.socketPath = socketPath;
    this.socket = null;
    this.requestId = 0;
    this.pendingRequests = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection(this.socketPath);

      this.socket.on("connect", () => {
        console.log("Connected to Signal RPC");
        resolve();
      });

      this.socket.on("data", (data) => {
        this.handleResponse(data.toString());
      });

      this.socket.on("error", reject);
    });
  }

  handleResponse(data) {
    const lines = data.trim().split("\n");

    lines.forEach((line) => {
      try {
        const response = JSON.parse(line);

        if (response.id && this.pendingRequests.has(response.id)) {
          const { resolve, reject } = this.pendingRequests.get(response.id);
          this.pendingRequests.delete(response.id);

          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
        } else if (response.method) {
          // Handle notifications
          this.emit(response.method, response.params);
        }
      } catch (error) {
        console.error("Failed to parse RPC response:", error);
      }
    });
  }

  async call(method, params = {}) {
    const id = ++this.requestId;
    const request = {
      jsonrpc: "2.0",
      method,
      params,
      id,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.socket.write(JSON.stringify(request) + "\n");

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error("RPC call timeout"));
        }
      }, 30000);
    });
  }

  async sendMessage(recipient, message, attachments = []) {
    return this.call("send", {
      recipient,
      message,
      attachments,
    });
  }

  async createGroup(name, members = []) {
    return this.call("createGroup", {
      name,
      members,
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.end();
    }
  }
}

// Usage
const rpc = new SignalRPC();
await rpc.connect();

// Listen for incoming messages
rpc.on("receive", (params) => {
  console.log("Message received:", params);
});

await rpc.sendMessage("+33000000000", "Hello via RPC!");
```

### WebSocket Bridge

```javascript
const WebSocket = require("ws");
const { SignalCli } = require("signal-sdk");

class SignalWebSocketBridge {
  constructor(port = 8080, phoneNumber) {
    this.port = port;
    this.phoneNumber = phoneNumber;
    this.signal = null;
    this.wss = null;
    this.clients = new Set();
  }

  async start() {
    // Initialize Signal
    this.signal = new SignalCli(this.phoneNumber);
    await this.signal.connect();

    // Setup WebSocket server
    this.wss = new WebSocket.Server({ port: this.port });

    this.wss.on("connection", (ws) => {
      console.log("Client connected");
      this.clients.add(ws);

      ws.on("message", async (data) => {
        try {
          const request = JSON.parse(data);
          await this.handleRequest(ws, request);
        } catch (error) {
          this.sendError(ws, error.message);
        }
      });

      ws.on("close", () => {
        console.log("Client disconnected");
        this.clients.delete(ws);
      });
    });

    // Forward Signal messages to all clients
    this.signal.on("message", (message) => {
      this.broadcast("message", message);
    });

    console.log(`- WebSocket bridge running on port ${this.port}`);
  }

  async handleRequest(ws, request) {
    const { id, method, params } = request;

    try {
      let result;

      switch (method) {
        case "sendMessage":
          result = await this.signal.sendMessage(
            params.recipient,
            params.message,
            params.options,
          );
          break;

        case "createGroup":
          result = await this.signal.createGroup(params.name, params.members);
          break;

        case "getContacts":
          result = await this.signal.getContacts();
          break;

        default:
          throw new Error(`Unknown method: ${method}`);
      }

      this.sendResponse(ws, id, result);
    } catch (error) {
      this.sendError(ws, error.message, id);
    }
  }

  sendResponse(ws, id, result) {
    ws.send(
      JSON.stringify({
        id,
        result,
        error: null,
      }),
    );
  }

  sendError(ws, message, id = null) {
    ws.send(
      JSON.stringify({
        id,
        result: null,
        error: { message },
      }),
    );
  }

  broadcast(event, data) {
    const message = JSON.stringify({ event, data });
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  async stop() {
    if (this.wss) {
      this.wss.close();
    }
    if (this.signal) {
      await this.signal.gracefulShutdown();
    }
  }
}

// Usage
const bridge = new SignalWebSocketBridge(8080, "+33111111111");
await bridge.start();
```

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
    const cipher = crypto.createCipher("aes-256-cbc", this.key);

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

### Access Control

```javascript
class AccessControlBot {
  constructor(signalBot) {
    this.bot = signalBot;
    this.permissions = new Map();
    this.sessions = new Map();
    this.setupAccessControl();
  }

  setupAccessControl() {
    this.bot.addMiddleware(async (message, next) => {
      if (!(await this.checkPermission(message))) {
        this.bot.sendMessage(message.source, "ERROR: Access denied");
        return;
      }
      await next();
    });
  }

  async checkPermission(message) {
    const user = message.source;
    const command = message.text.split(" ")[0];

    // Check if user is authenticated
    if (!this.isAuthenticated(user)) {
      if (command === "/login") {
        return true; // Allow login command
      }
      this.bot.sendMessage(user, "Please login first: /login <password>");
      return false;
    }

    // Check command permissions
    const userRole = this.getUserRole(user);
    const requiredRole = this.getCommandRole(command);

    return this.hasPermission(userRole, requiredRole);
  }

  isAuthenticated(user) {
    return (
      this.sessions.has(user) && this.sessions.get(user).expires > Date.now()
    );
  }

  authenticate(user, password) {
    // In production, use proper password hashing
    const validPasswords = {
      admin: "admin123",
      user: "user123",
    };

    for (const [role, pass] of Object.entries(validPasswords)) {
      if (password === pass) {
        this.sessions.set(user, {
          role,
          expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        });
        return role;
      }
    }

    return null;
  }

  getUserRole(user) {
    const session = this.sessions.get(user);
    return session ? session.role : null;
  }

  getCommandRole(command) {
    const roleMap = {
      "/admin": "admin",
      "/ban": "admin",
      "/kick": "admin",
      "/stats": "user",
      "/help": "user",
    };

    return roleMap[command] || "user";
  }

  hasPermission(userRole, requiredRole) {
    const hierarchy = { admin: 2, user: 1 };
    return hierarchy[userRole] >= hierarchy[requiredRole];
  }

  setupCommands() {
    this.bot.addCommand({
      name: "login",
      description: "Authenticate user",
      handler: async (message, args) => {
        const password = args.join(" ");
        const role = this.authenticate(message.source, password);

        if (role) {
          return `Logged in as ${role}`;
        } else {
          return "ERROR: Invalid password";
        }
      },
    });

    this.bot.addCommand({
      name: "logout",
      description: "End session",
      handler: async (message) => {
        this.sessions.delete(message.source);
        return "Logged out successfully";
      },
    });

    this.bot.addCommand({
      name: "whoami",
      description: "Show current role",
      handler: async (message) => {
        const role = this.getUserRole(message.source);
        return role ? `You are: ${role}` : "ERROR: Not authenticated";
      },
    });
  }
}

// Usage
const accessBot = new AccessControlBot(bot);
accessBot.setupCommands();
```

## Monitoring & Analytics

### Advanced Logging

```javascript
const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");

class SignalLogger {
  constructor() {
    this.logger = winston.createLogger({
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
        new DailyRotateFile({
          filename: "logs/signal-%DATE%.log",
          datePattern: "YYYY-MM-DD",
          maxSize: "20m",
          maxFiles: "14d",
        }),
        new DailyRotateFile({
          filename: "logs/signal-error-%DATE%.log",
          datePattern: "YYYY-MM-DD",
          level: "error",
          maxSize: "20m",
          maxFiles: "30d",
        }),
      ],
    });
  }

  logMessage(direction, source, destination, message, metadata = {}) {
    this.logger.info("Message", {
      direction, // 'incoming' or 'outgoing'
      source,
      destination,
      message: message.substring(0, 100), // Truncate for privacy
      messageLength: message.length,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  logCommand(user, command, args, success, responseTime) {
    this.logger.info("Command", {
      user,
      command,
      args: args.join(" "),
      success,
      responseTime,
      timestamp: new Date().toISOString(),
    });
  }

  logError(error, context = {}) {
    this.logger.error("Error", {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  logMetrics(metrics) {
    this.logger.info("Metrics", {
      type: "metrics",
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  }
}

// Usage with SignalBot
const logger = new SignalLogger();

bot.on("message", (message) => {
  logger.logMessage("incoming", message.source, "bot", message.text, {
    groupId: message.groupId,
    hasAttachments: message.attachments.length > 0,
  });
});

// Wrap command handlers with logging
const originalAddCommand = bot.addCommand.bind(bot);
bot.addCommand = (commandConfig) => {
  const originalHandler = commandConfig.handler;
  commandConfig.handler = async (message, args) => {
    const startTime = Date.now();
    let success = false;

    try {
      const result = await originalHandler(message, args);
      success = true;
      return result;
    } catch (error) {
      logger.logError(error, {
        command: commandConfig.name,
        user: message.source,
      });
      throw error;
    } finally {
      const responseTime = Date.now() - startTime;
      logger.logCommand(
        message.source,
        commandConfig.name,
        args,
        success,
        responseTime,
      );
    }
  };

  originalAddCommand(commandConfig);
};
```

### Performance Metrics

```javascript
class SignalMetrics {
  constructor() {
    this.metrics = {
      messages: { sent: 0, received: 0, failed: 0 },
      commands: { executed: 0, failed: 0 },
      connections: { active: 0, total: 0 },
      performance: {
        avgResponseTime: 0,
        responseTimeSum: 0,
        responseTimeCount: 0,
      },
    };

    this.startTime = Date.now();
    this.setupPeriodicReporting();
  }

  incrementMessage(type) {
    this.metrics.messages[type]++;
  }

  incrementCommand(success) {
    if (success) {
      this.metrics.commands.executed++;
    } else {
      this.metrics.commands.failed++;
    }
  }

  recordResponseTime(ms) {
    this.metrics.performance.responseTimeSum += ms;
    this.metrics.performance.responseTimeCount++;
    this.metrics.performance.avgResponseTime =
      this.metrics.performance.responseTimeSum /
      this.metrics.performance.responseTimeCount;
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      timestamp: Date.now(),
    };
  }

  setupPeriodicReporting() {
    setInterval(() => {
      const metrics = this.getMetrics();
      console.log("Metrics Report:", metrics);

      // Send to monitoring service
      this.sendToMonitoring(metrics);
    }, 60000); // Every minute
  }

  async sendToMonitoring(metrics) {
    // Example: Send to external monitoring service
    try {
      await fetch("https://monitoring.example.com/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metrics),
      });
    } catch (error) {
      console.error("Failed to send metrics:", error);
    }
  }
}

// Usage
const metrics = new SignalMetrics();

bot.on("message", () => metrics.incrementMessage("received"));

// Wrap sendMessage to track sent messages
const originalSendMessage = bot.sendMessage.bind(bot);
bot.sendMessage = async (...args) => {
  try {
    const result = await originalSendMessage(...args);
    metrics.incrementMessage("sent");
    return result;
  } catch (error) {
    metrics.incrementMessage("failed");
    throw error;
  }
};
```

## Integration Patterns

### REST API Integration

```javascript
const express = require("express");
const { SignalBot } = require("signal-sdk");

class SignalRESTAPI {
  constructor(signalBot, port = 3000) {
    this.bot = signalBot;
    this.app = express();
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // CORS
    this.app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      next();
    });

    // API Key authentication
    this.app.use((req, res, next) => {
      if (req.path === "/health") return next();

      const apiKey = req.headers["x-api-key"];
      if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: "Invalid API key" });
      }
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get("/health", (req, res) => {
      res.json({ status: "healthy", uptime: process.uptime() });
    });

    // Send message
    this.app.post("/messages", async (req, res) => {
      try {
        const { recipient, message, attachments } = req.body;

        if (!recipient || !message) {
          return res.status(400).json({
            error: "recipient and message are required",
          });
        }

        const result = await this.bot.sendMessage(recipient, message, {
          attachments: attachments || [],
        });

        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get contacts
    this.app.get("/contacts", async (req, res) => {
      try {
        const contacts = await this.bot.signalCli.getContacts();
        res.json({ contacts });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Create group
    this.app.post("/groups", async (req, res) => {
      try {
        const { name, members, description } = req.body;

        if (!name || !members) {
          return res.status(400).json({
            error: "name and members are required",
          });
        }

        const group = await this.bot.signalCli.createGroup(name, members);

        if (description) {
          await this.bot.signalCli.updateGroup(group.groupId, {
            description,
          });
        }

        res.json({ success: true, group });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get statistics
    this.app.get("/stats", (req, res) => {
      const stats = this.bot.getStats();
      res.json({ stats });
    });
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`Signal REST API running on port ${this.port}`);
    });
  }
}

// Usage
const api = new SignalRESTAPI(bot, 3000);
api.start();
```

### Webhook Integration

```javascript
class WebhookManager {
  constructor(signalBot) {
    this.bot = signalBot;
    this.webhooks = new Map();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.bot.on("message", async (message) => {
      await this.triggerWebhooks("message", {
        source: message.source,
        text: message.text,
        groupId: message.groupId,
        timestamp: Date.now(),
      });
    });

    this.bot.on("memberJoined", async (groupId, member) => {
      await this.triggerWebhooks("memberJoined", {
        groupId,
        member,
        timestamp: Date.now(),
      });
    });
  }

  addWebhook(event, url, options = {}) {
    if (!this.webhooks.has(event)) {
      this.webhooks.set(event, []);
    }

    this.webhooks.get(event).push({
      url,
      headers: options.headers || {},
      retries: options.retries || 3,
      timeout: options.timeout || 5000,
    });
  }

  async triggerWebhooks(event, data) {
    const webhooks = this.webhooks.get(event) || [];

    for (const webhook of webhooks) {
      await this.sendWebhook(webhook, { event, data });
    }
  }

  async sendWebhook(webhook, payload) {
    let attempts = 0;

    while (attempts < webhook.retries) {
      try {
        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...webhook.headers,
          },
          body: JSON.stringify(payload),
          timeout: webhook.timeout,
        });

        if (response.ok) {
          console.log(`- Webhook sent: ${webhook.url}`);
          return;
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        attempts++;
        console.error(
          `ERROR: Webhook failed (${attempts}/${webhook.retries}):`,
          error,
        );

        if (attempts < webhook.retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
        }
      }
    }
  }
}

// Usage
const webhookManager = new WebhookManager(bot);

// Add webhooks for different events
webhookManager.addWebhook("message", "https://api.example.com/signal/message", {
  headers: { Authorization: "Bearer token123" },
  retries: 5,
});

webhookManager.addWebhook(
  "memberJoined",
  "https://api.example.com/signal/join",
);
```

## Production Strategies

### High Availability Setup

```javascript
const cluster = require("cluster");
const numCPUs = require("os").cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork(); // Restart worker
  });
} else {
  // Worker process
  const { SignalBot } = require("signal-sdk");

  const bot = new SignalBot({
    phoneNumber: process.env.SIGNAL_PHONE_NUMBER,
    // ... other config
  });

  bot.start().then(() => {
    console.log(`Worker ${process.pid} started`);
  });
}
```

### Circuit Breaker Pattern

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000, monitoringPeriod = 10000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.monitoringPeriod = monitoringPeriod;
    this.state = "CLOSED"; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
  }

  async execute(fn) {
    if (this.state === "OPEN") {
      if (Date.now() >= this.nextAttempt) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = "OPEN";
      this.nextAttempt = Date.now() + this.timeout;
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      nextAttempt: this.nextAttempt,
    };
  }
}

// Usage with Signal
const circuitBreaker = new CircuitBreaker(3, 30000);

async function safeSendMessage(recipient, message) {
  return circuitBreaker.execute(async () => {
    return await bot.sendMessage(recipient, message);
  });
}
```

## Next Steps

- Explore the [Examples Guide](./examples-guide.md) for practical implementations
- Check the [API Reference](./api-reference.md) for complete method documentation
- Build bots with the [SignalBot Framework](./signalbot-framework.md)
- Troubleshoot issues with the [Troubleshooting Guide](./troubleshooting.md)

---

**Ready for production?** These advanced patterns will help you build robust, scalable Signal applications!
