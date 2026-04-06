# Signal SDK - TypeScript SDK for Signal Messenger

<div align="center">
  <img src="logo.png" alt="Signal SDK Logo" width="200"/>
</div>

<div align="center">

A comprehensive TypeScript SDK for interacting with [signal-cli](https://github.com/AsamK/signal-cli),
providing JSON-RPC communication and a powerful bot framework.

[![npm version](https://badge.fury.io/js/signal-sdk.svg)](https://badge.fury.io/js/signal-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/tests-548%20passing-brightgreen.svg)](./src/__tests__)
[![Donate on Liberapay](https://img.shields.io/badge/Liberapay-Donate-yellow.svg)](https://liberapay.com/devbyben/donate)

</div>

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Prerequisites](#prerequisites)
- [Device Linking](#device-linking)
- [Basic Usage](#basic-usage)
- [Advanced Configuration](#advanced-configuration)
- [Common Use Cases](#common-use-cases)
- [SignalBot Framework](#signalbot-framework)
- [API Reference](#api-reference)
- [Configuration Reference](#configuration-reference)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Features

**Core**

- JSON-RPC communication with signal-cli daemon
- Complete TypeScript support with strict type definitions
- Event-driven architecture for real-time message handling
- Exponential backoff retry mechanism with configurable policies
- Built-in rate limiter to prevent throttling
- Multi-level structured logging
- E.164 phone number validation and input sanitization
- Automatic signal-cli binary download on install (Linux, macOS, Windows)

**Messaging**

- Send and receive text messages, attachments, and media
- Text formatting — bold, italic, spoiler, strikethrough, monospace
- Mentions, quotes, URL previews, message editing
- View-once messages, end-session messages
- Message reactions, typing indicators, read receipts
- Remote delete and admin delete (group admins only)
- **Pin / unpin messages** in conversations and groups
- **Silent messages** — send without triggering a push notification (`noUrgent`)
- Polls — create, vote, and terminate
- Payment notifications (MobileCoin)
- Note-to-self messages
- Story replies

**Groups**

- Create, update, and leave groups
- Manage members — add, remove, ban, unban, promote/demote admins
- Group invite links — generate, reset, send
- Group permissions — message sending, editing details, adding members
- Announcement groups (only admins can send)
- Detailed group info including pending and requesting members

**Contacts & Identity**

- List, update, and remove contacts
- Block and unblock contacts or groups
- Check Signal registration status
- Safety number verification and identity trust management
- Untrusted identity detection

**Account & Devices**

- Register, verify, and unregister accounts
- Update account settings — username, privacy, phone number sharing
- Set and remove registration lock PIN
- List and manage linked devices
- Phone number change with SMS or voice verification
- Multi-account support via `MultiAccountManager`

**Media & Stickers**

- Retrieve attachments, avatars, and stickers by ID
- Upload and install custom sticker packs

**Receive Options**

- Configurable timeout, message limit, read receipt sending
- Skip downloading attachments, stories, avatars, or sticker packs
- Apply receive filters at daemon startup via `connect()` options

**SignalBot Framework**

- Minimal boilerplate — create a working bot in under 20 lines
- Built-in command parser with configurable prefix
- Role-based access — admin-only commands
- Built-in `/help` and `/ping` commands
- Group auto-creation and member management
- Welcome messages for new members
- Command cooldown system

---

## Installation

```bash
npm install signal-sdk
```

The `postinstall` script automatically downloads and installs the correct signal-cli binary for your platform into the package's `bin/` directory. No manual signal-cli installation is needed.

> **macOS / Windows** — signal-cli runs on the JVM. Make sure **Java 25 or later** is installed and available in your `PATH`.
>
> **Linux** — The native binary is used. No JVM required.

---

## Prerequisites

- **Node.js** 18 or later
- **Java 25+** (macOS and Windows only — required by the JVM-based signal-cli distribution)
- A Signal account with a registered phone number

To register a phone number with signal-cli before using the SDK:

```bash
# Register (triggers an SMS verification code)
./node_modules/signal-sdk/bin/signal-cli -a +33111111111 register

# Verify with the code you received
./node_modules/signal-sdk/bin/signal-cli -a +33111111111 verify 123-456
```

---

## Device Linking

If you want to use an existing Signal account (instead of registering a new number), link the SDK as a secondary device:

```bash
# Using the bundled CLI helper
npx signal-sdk connect

# With a custom device name
npx signal-sdk connect "My Bot Device"
```

This prints a QR code in your terminal. Scan it from the Signal app on your phone:
**Settings → Linked Devices → Link New Device**

You only need to do this once. The device stays linked permanently until explicitly removed.

---

## Basic Usage

```javascript
const { SignalCli } = require('signal-sdk');

const signal = new SignalCli('+33111111111');

await signal.connect();

// Send a message
await signal.sendMessage('+33222222222', 'Hello from Signal SDK!');

// Listen for incoming messages
signal.on('message', (message) => {
    const text = message.envelope?.dataMessage?.message;
    console.log('Received:', text);
});

// Graceful shutdown
await signal.gracefulShutdown();
```

---

## Advanced Configuration

```javascript
const { SignalCli } = require('signal-sdk');

const signal = new SignalCli('+33111111111', undefined, {
    maxRetries: 3,
    retryDelay: 1000,
    maxConcurrentRequests: 5,
    minRequestInterval: 200,
    requestTimeout: 60000,
    connectionTimeout: 30000,
    autoReconnect: true,
    verbose: false,
});

await signal.connect();
```

### Connect with startup flags

Pass options directly to the `jsonRpc` subprocess at connection time to control what signal-cli downloads or processes:

```javascript
await signal.connect({
    ignoreAttachments: true, // do not download attachment files
    ignoreAvatars: true, // do not download contact/profile avatars
    ignoreStickers: true, // do not download sticker packs
    ignoreStories: true, // do not receive story messages
    sendReadReceipts: true, // automatically send read receipts
    receiveMode: 'on-start', // start receiving immediately (default)
});
```

### Daemon modes

```javascript
// Unix socket (daemon must be running separately)
const signal = new SignalCli('+33111111111', undefined, {
    daemonMode: 'unix-socket',
    socketPath: '/run/signal-cli/socket',
});

// TCP
const signal = new SignalCli('+33111111111', undefined, {
    daemonMode: 'tcp',
    tcpHost: 'localhost',
    tcpPort: 7583,
});

// HTTP
const signal = new SignalCli('+33111111111', undefined, {
    daemonMode: 'http',
    httpBaseUrl: 'http://localhost:8080',
});
```

---

## Common Use Cases

### Send a message

```javascript
await signal.sendMessage('+33222222222', 'Hello!');
```

### Send a silent message (no push notification)

```javascript
await signal.sendMessage('+33222222222', 'Background sync message', {
    noUrgent: true,
});
```

### Send formatted text

```javascript
await signal.sendMessage('+33222222222', 'Hello *world*!', {
    textStyles: [{ start: 6, length: 5, style: 'BOLD' }],
});
```

### Send with mention

```javascript
await signal.sendMessage('groupId==', 'Hey @Alice, check this out!', {
    mentions: [{ start: 4, length: 6, number: '+33333333333' }],
});
```

### Reply to a message

```javascript
await signal.sendMessage('+33222222222', 'I agree!', {
    quote: {
        timestamp: 1700000000000,
        author: '+33222222222',
        text: 'Original message text',
    },
});
```

### Edit a message

```javascript
await signal.sendMessage('+33222222222', 'Corrected text', {
    editTimestamp: 1700000000000,
});
```

### Send files

```javascript
await signal.sendMessage('+33222222222', "Here's the document:", {
    attachments: ['./path/to/document.pdf'],
});

await signal.sendMessage('+33222222222', 'Photos from today:', {
    attachments: ['./photo1.jpg', './photo2.jpg'],
});
```

### React to a message

```javascript
await signal.sendReaction('+33222222222', '+33222222222', 1700000000000, '👍');

// Remove a reaction
await signal.sendReaction('+33222222222', '+33222222222', 1700000000000, '👍', true);
```

### Remote delete a message

```javascript
await signal.remoteDeleteMessage('+33222222222', 1700000000000);
```

### Pin a message

```javascript
await signal.sendPinMessage({
    targetAuthor: '+33222222222',
    targetTimestamp: 1700000000000,
    groupId: 'groupId==',
    pinDuration: -1, // -1 = forever (default)
});
```

### Unpin a message

```javascript
await signal.sendUnpinMessage({
    targetAuthor: '+33222222222',
    targetTimestamp: 1700000000000,
    groupId: 'groupId==',
});
```

### Admin delete (group admins only)

```javascript
await signal.sendAdminDelete({
    groupId: 'groupId==',
    targetAuthor: '+33222222222',
    targetTimestamp: 1700000000000,
});
```

### Create a poll

```javascript
// Create a poll in a group
await signal.sendPollCreate({
    question: 'Favorite language?',
    options: ['TypeScript', 'Python', 'Go'],
    groupId: 'groupId==',
});

// Create a poll for individual recipients
await signal.sendPollCreate({
    question: 'Favorite color?',
    options: ['Red', 'Blue', 'Green'],
    recipients: ['+33222222222', '+33333333333'],
    multiSelect: false,
});
```

### Vote on a poll

```javascript
// Vote on a poll (recipient is where the poll was sent)
await signal.sendPollVote('groupId==', {
    pollAuthor: '+33222222222',
    pollTimestamp: 1705843200000,
    optionIndexes: [0], // Vote for first option
});
```

### Terminate a poll

```javascript
await signal.sendPollTerminate('groupId==', {
    pollTimestamp: 1705843200000,
});
```

### Receive messages manually

```javascript
const messages = await signal.receive({
    timeout: 5,
    ignoreAttachments: true,
    ignoreAvatars: true,
    ignoreStickers: true,
    sendReadReceipts: true,
});
```

### Group management

```javascript
// Create a group
const group = await signal.createGroup('My Group', ['+33222222222', '+33333333333']);

// Send to group
await signal.sendMessage(group.groupId, 'Welcome everyone!');

// Update group
await signal.updateGroup(group.groupId, {
    name: 'Updated Group Name',
    description: 'New description',
    addMembers: ['+33444444444'],
    promoteAdmins: ['+33222222222'],
});

// Get detailed group info
const groups = await signal.listGroupsDetailed({ detailed: true });

// Send the group invite link to someone
await signal.sendGroupInviteLink(group.groupId, '+33555555555');

// Reset the invite link
await signal.resetGroupLink(group.groupId);

// Leave the group
await signal.quitGroup(group.groupId);
```

### Contact management

```javascript
// List contacts
const contacts = await signal.listContacts();

// Update a contact
await signal.updateContact('+33222222222', 'Alice', {
    nickGivenName: 'Ali',
    expiration: 3600,
});

// Block / unblock
await signal.block(['+33222222222']);
await signal.unblock(['+33222222222']);

// Remove a contact
await signal.removeContact('+33222222222', { forget: true });

// Check registration status
const statuses = await signal.getUserStatus(['+33222222222']);
console.log(statuses[0].isRegistered);
```

### Identity verification

```javascript
// Get safety number
const safetyNumber = await signal.getSafetyNumber('+33222222222');

// Verify and trust
const verified = await signal.verifySafetyNumber('+33222222222', safetyNumber);

// List untrusted identities
const untrusted = await signal.listUntrustedIdentities();
```

### Account settings

```javascript
// Set a username
await signal.setUsername('alice');

// Delete username
await signal.deleteUsername();

// Update privacy
await signal.updateAccount({
    discoverableByNumber: false,
    numberSharing: false,
    unrestrictedUnidentifiedSender: false,
});

// Registration lock PIN
await signal.setPin('123456');
await signal.removePin();
```

### Multi-account

```javascript
const { MultiAccountManager } = require('signal-sdk');

const manager = new MultiAccountManager();
await manager.addAccount('+33111111111');
await manager.addAccount('+33222222222');

await manager.connectAll();

const signal1 = manager.getAccount('+33111111111');
await signal1.sendMessage('+33333333333', 'Hello from account 1!');
```

---

## SignalBot Framework

### Minimal bot

```javascript
const { SignalBot } = require('signal-sdk');
require('dotenv').config();

const bot = new SignalBot({
    phoneNumber: process.env.SIGNAL_PHONE_NUMBER,
    admins: [process.env.SIGNAL_ADMIN_NUMBER],
});

bot.addCommand({
    name: 'hello',
    description: 'Greet the user',
    handler: async (message, args) => {
        const name = args.join(' ') || 'friend';
        return `Hello ${name}!`;
    },
});

bot.on('ready', () => console.log('Bot is ready!'));
bot.on('message', (msg) => console.log(`${msg.source}: ${msg.text}`));

await bot.start();
```

### Full configuration

```javascript
const bot = new SignalBot({
    phoneNumber: '+33111111111',
    admins: ['+33222222222'],
    group: {
        name: 'My Bot Group',
        description: 'Managed by my bot',
        createIfNotExists: true,
        avatar: './group-avatar.jpg',
    },
    settings: {
        commandPrefix: '/', // default: "/"
        logMessages: true,
        welcomeNewMembers: true,
        cooldownSeconds: 2,
    },
});
```

### Bot events

```javascript
bot.on('ready', () => {});
bot.on('message', (message) => {});
bot.on('command', ({ command, user, args }) => {});
bot.on('groupMemberJoined', ({ groupId, member }) => {});
bot.on('error', (error) => {});
```

The bot includes built-in `/help` and `/ping` commands automatically.

---

## API Reference

### SignalCli methods

| Category        | Method                                                       | Description                                         |
| --------------- | ------------------------------------------------------------ | --------------------------------------------------- |
| **Connection**  | `connect(options?)`                                          | Start JSON-RPC daemon with optional startup flags   |
|                 | `disconnect()`                                               | Close the connection immediately                    |
|                 | `gracefulShutdown()`                                         | Wait for process to exit cleanly                    |
| **Messaging**   | `sendMessage(recipient, text, options?)`                     | Send a message to a number or group                 |
|                 | `sendReaction(recipient, author, timestamp, emoji, remove?)` | React to a message                                  |
|                 | `sendTyping(recipient, stop?)`                               | Send a typing indicator                             |
|                 | `sendReceipt(recipient, timestamp, type?)`                   | Send a read or viewed receipt                       |
|                 | `remoteDeleteMessage(recipient, timestamp)`                  | Delete a sent message                               |
|                 | `sendPinMessage(options)`                                    | Pin a message in a conversation or group            |
|                 | `sendUnpinMessage(options)`                                  | Unpin a message                                     |
|                 | `sendAdminDelete(options)`                                   | Delete a message for all group members (admin only) |
|                 | `sendPollCreate(options)`                                    | Create a poll                                       |
|                 | `sendPollVote(recipient, options)`                           | Vote on a poll                                      |
|                 | `sendPollTerminate(recipient, options)`                      | Close a poll                                        |
|                 | `sendPaymentNotification(recipient, data)`                   | Send a MobileCoin payment notification              |
|                 | `sendNoteToSelf(message, options?)`                          | Send a message to your own account                  |
|                 | `sendMessageWithProgress(recipient, text, options?)`         | Send with upload progress callback                  |
|                 | `receive(options?)`                                          | Manually fetch pending messages                     |
| **Groups**      | `createGroup(name, members)`                                 | Create a new group                                  |
|                 | `updateGroup(groupId, options)`                              | Update group settings and members                   |
|                 | `listGroups()`                                               | List all groups                                     |
|                 | `listGroupsDetailed(options?)`                               | List groups with members and invite links           |
|                 | `getGroupsWithDetails(options?)`                             | List and parse groups                               |
|                 | `quitGroup(groupId)`                                         | Leave a group                                       |
|                 | `joinGroup(uri)`                                             | Join via invite link                                |
|                 | `sendGroupInviteLink(groupId, recipient)`                    | Send invite link to a contact                       |
|                 | `resetGroupLink(groupId)`                                    | Reset the invite link                               |
|                 | `setBannedMembers(groupId, members)`                         | Ban members from a group                            |
| **Contacts**    | `listContacts()`                                             | List all contacts                                   |
|                 | `getContactsWithProfiles()`                                  | List contacts with parsed profile data              |
|                 | `updateContact(number, name?, options?)`                     | Update a contact                                    |
|                 | `removeContact(number, options?)`                            | Remove a contact                                    |
|                 | `block(recipients, groupId?)`                                | Block contacts or a group                           |
|                 | `unblock(recipients, groupId?)`                              | Unblock contacts or a group                         |
|                 | `getUserStatus(numbers?, usernames?)`                        | Check Signal registration status                    |
|                 | `sendContacts(options?)`                                     | Sync contacts to linked devices                     |
| **Identity**    | `listIdentities(number?)`                                    | List identity keys                                  |
|                 | `trustIdentity(number, safetyNumber, verified?)`             | Trust an identity key                               |
|                 | `getSafetyNumber(number)`                                    | Get the safety number for a contact                 |
|                 | `verifySafetyNumber(number, safetyNumber)`                   | Verify and auto-trust a safety number               |
|                 | `listUntrustedIdentities()`                                  | List all untrusted identities                       |
| **Account**     | `register(number, voice?, captcha?)`                         | Register a phone number                             |
|                 | `verify(number, code, pin?)`                                 | Complete registration verification                  |
|                 | `unregister()`                                               | Deactivate the account                              |
|                 | `deleteLocalAccountData()`                                   | Delete all local account data                       |
|                 | `updateAccount(options)`                                     | Update account settings                             |
|                 | `updateAccountConfiguration(config)`                         | Update sync configuration                           |
|                 | `updateProfile(givenName, about?, aboutEmoji?, avatar?, options?)` | Update profile                              |
|                 | `setUsername(username)`                                      | Set a Signal username                               |
|                 | `deleteUsername()`                                           | Delete the Signal username                          |
|                 | `setPin(pin)`                                                | Set a registration lock PIN                         |
|                 | `removePin()`                                                | Remove the registration lock PIN                    |
|                 | `startChangeNumber(number, voice?, captcha?)`                | Start a phone number change                         |
|                 | `finishChangeNumber(number, code, pin?)`                     | Complete a phone number change                      |
|                 | `listAccounts()`                                             | List all local accounts                             |
|                 | `listAccountsDetailed()`                                     | List accounts with name and UUID                    |
|                 | `sendPaymentNotification(recipient, data)`                   | Send a payment notification                         |
|                 | `submitRateLimitChallenge(challenge, captcha)`               | Resolve a rate limit captcha                        |
|                 | `isRegistered(number)`                                       | Check if a number is registered on Signal           |
| **Devices**     | `listDevices()`                                              | List linked devices                                 |
|                 | `removeDevice(deviceId)`                                     | Remove a linked device                              |
|                 | `updateDevice(options)`                                      | Rename a linked device                              |
|                 | `addDevice(uri, name?)`                                      | Link a new device by URI                            |
|                 | `deviceLink(options?)`                                       | Start device linking and show QR code               |
| **Stickers**    | `listStickerPacks()`                                         | List installed sticker packs                        |
|                 | `addStickerPack(packId, packKey)`                            | Install a sticker pack                              |
|                 | `uploadStickerPack(manifest)`                                | Upload a custom sticker pack                        |
|                 | `getSticker(options)`                                        | Retrieve sticker data                               |
| **Attachments** | `getAttachment(options)`                                     | Retrieve an attachment by ID                        |
|                 | `getAvatar(options)`                                         | Retrieve a contact or group avatar                  |
| **Sync**        | `sendSyncRequest()`                                          | Request sync from primary device                    |
|                 | `sendMessageRequestResponse(recipient, response)`            | Respond to a message request                        |
|                 | `getVersion()`                                               | Get signal-cli version info                         |

### SendMessageOptions

| Option               | Type           | Description                                                       |
| -------------------- | -------------- | ----------------------------------------------------------------- |
| `attachments`        | `string[]`     | File paths to attach                                              |
| `mentions`           | `Mention[]`    | Mentions in the message body                                      |
| `textStyles`         | `TextStyle[]`  | Text formatting (BOLD, ITALIC, SPOILER, STRIKETHROUGH, MONOSPACE) |
| `quote`              | `QuoteOptions` | Reply to an existing message                                      |
| `expiresInSeconds`   | `number`       | Message expiration timer                                          |
| `isViewOnce`         | `boolean`      | View-once message                                                 |
| `editTimestamp`      | `number`       | Timestamp of the message to edit                                  |
| `storyTimestamp`     | `number`       | Timestamp of a story to reply to                                  |
| `storyAuthor`        | `string`       | Author of the story to reply to                                   |
| `previewUrl`         | `string`       | URL for link preview                                              |
| `previewTitle`       | `string`       | Title for link preview                                            |
| `previewDescription` | `string`       | Description for link preview                                      |
| `previewImage`       | `string`       | Image path for link preview                                       |
| `noteToSelf`         | `boolean`      | Send to own account                                               |
| `endSession`         | `boolean`      | End the session                                                   |
| `noUrgent`           | `boolean`      | Send without push notification                                    |

### PollCreateOptions

| Option        | Type       | Description                              |
| ------------- | ---------- | ---------------------------------------- |
| `question`    | `string`   | The poll question (required)             |
| `options`     | `string[]` | Array of poll options (required)         |
| `multiSelect` | `boolean`  | Allow multiple selections (default: true)|
| `recipients`  | `string[]` | Recipients for direct message poll       |
| `groupId`     | `string`   | Group ID for group poll                  |

### PollVoteOptions

| Option          | Type       | Description                        |
| --------------- | ---------- | ---------------------------------- |
| `pollAuthor`    | `string`   | Author of the poll (required)      |
| `pollTimestamp` | `number`   | Poll message timestamp (required)  |
| `optionIndexes` | `number[]` | Array of option indices to vote for|
| `voteCount`     | `number`   | Optional vote count                |

### PollTerminateOptions

| Option          | Type     | Description                       |
| --------------- | -------- | --------------------------------- |
| `pollTimestamp` | `number` | Timestamp of the poll to terminate|

### PinMessageOptions

| Option            | Type       | Description                                         |
| ----------------- | ---------- | --------------------------------------------------- |
| `targetAuthor`    | `string`   | Author of the message to pin                        |
| `targetTimestamp` | `number`   | Timestamp of the message to pin                     |
| `groupId`         | `string`   | Target group (mutually exclusive with `recipients`) |
| `recipients`      | `string[]` | Target recipients for a direct pin                  |
| `noteToSelf`      | `boolean`  | Pin in your own conversation                        |
| `pinDuration`     | `number`   | Duration in seconds, `-1` for forever (default)     |
| `notifySelf`      | `boolean`  | Send as normal message if self is a recipient       |

### AdminDeleteOptions

| Option            | Type      | Description                                     |
| ----------------- | --------- | ----------------------------------------------- |
| `groupId`         | `string`  | Group in which to delete the message (required) |
| `targetAuthor`    | `string`  | Author of the message to delete                 |
| `targetTimestamp` | `number`  | Timestamp of the message to delete              |
| `story`           | `boolean` | Delete a story instead of a regular message     |
| `notifySelf`      | `boolean` | Send as normal message if self is a recipient   |

### ReceiveOptions

| Option              | Type      | Description                               |
| ------------------- | --------- | ----------------------------------------- |
| `timeout`           | `number`  | Seconds to wait for messages (default: 5) |
| `maxMessages`       | `number`  | Maximum number of messages to receive     |
| `ignoreAttachments` | `boolean` | Skip downloading attachments              |
| `ignoreStories`     | `boolean` | Skip story messages                       |
| `ignoreAvatars`     | `boolean` | Skip downloading avatars                  |
| `ignoreStickers`    | `boolean` | Skip downloading sticker packs            |
| `sendReadReceipts`  | `boolean` | Automatically send read receipts          |

### JsonRpcStartOptions (connect)

| Option              | Type                     | Description                                            |
| ------------------- | ------------------------ | ------------------------------------------------------ |
| `ignoreAttachments` | `boolean`                | Skip downloading attachments for all received messages |
| `ignoreStories`     | `boolean`                | Skip story messages for the entire session             |
| `ignoreAvatars`     | `boolean`                | Skip downloading avatars for the entire session        |
| `ignoreStickers`    | `boolean`                | Skip downloading sticker packs for the entire session  |
| `sendReadReceipts`  | `boolean`                | Auto-send read receipts for the entire session         |
| `receiveMode`       | `'on-start' \| 'manual'` | When to start receiving messages                       |

---

## Configuration Reference

### Environment variables

```env
SIGNAL_PHONE_NUMBER="+33111111111"
SIGNAL_ADMIN_NUMBER="+33222222222"
SIGNAL_RECIPIENT_NUMBER="+33333333333"
SIGNAL_GROUP_NAME="My Bot Group"
```

### SignalCli constructor

```javascript
new SignalCli(accountOrPath?, account?, config?)
```

| Parameter       | Description                                                   |
| --------------- | ------------------------------------------------------------- |
| `accountOrPath` | Phone number (`+33...`) or path to a custom signal-cli binary |
| `account`       | Phone number when the first argument is a path                |
| `config`        | `SignalCliConfig` object (see below)                          |

The constructor uses smart parameter detection:
- If `accountOrPath` starts with `+`, it's treated as a phone number
- Otherwise, it's treated as a path to the signal-cli binary

### SignalCliConfig

| Option                  | Default                   | Description                                               |
| ----------------------- | ------------------------- | --------------------------------------------------------- |
| `maxRetries`            | `3`                       | Number of retry attempts on failure                       |
| `retryDelay`            | `1000`                    | Initial retry delay in milliseconds                       |
| `maxConcurrentRequests` | `10`                      | Maximum parallel JSON-RPC requests                        |
| `minRequestInterval`    | `100`                     | Minimum delay between requests in milliseconds            |
| `requestTimeout`        | `60000`                   | Per-request timeout in milliseconds                       |
| `connectionTimeout`     | `30000`                   | Connection attempt timeout in milliseconds                |
| `autoReconnect`         | `true`                    | Automatically reconnect on unexpected disconnect          |
| `verbose`               | `false`                   | Enable debug logging                                      |
| `logFile`               | `undefined`               | Write logs to a file path                                 |
| `daemonMode`            | `'json-rpc'`              | Connection mode: `json-rpc`, `unix-socket`, `tcp`, `http` |
| `socketPath`            | `undefined`               | Path to Unix socket (unix-socket mode)                    |
| `tcpHost`               | `'localhost'`             | TCP host (tcp mode)                                       |
| `tcpPort`               | `7583`                    | TCP port (tcp mode)                                       |
| `httpBaseUrl`           | `'http://localhost:8080'` | Base URL (http mode)                                      |

---

## Testing

```bash
# Run all tests
npm test

# Run a specific suite
npm test -- --testPathPattern="SignalCli.methods"

# Run with coverage report
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

### Test statistics

| Metric           | Value       |
| ---------------- | ----------- |
| Total tests      | 548 passing |
| Test suites      | 24          |
| Overall coverage | ~87%        |

### Coverage by module

| Module                   | Statements | Branches | Functions | Lines  |
| ------------------------ | ---------- | -------- | --------- | ------ |
| `errors.ts`              | 100%       | 100%     | 100%      | 100%   |
| `validators.ts`          | 100%       | 100%     | 100%      | 100%   |
| `config.ts`              | 100%       | 97%      | 100%      | 100%   |
| `retry.ts`               | 97%        | 85%      | 100%      | 98%    |
| `BaseManager.ts`         | 100%       | 100%     | 100%      | 100%   |
| `AccountManager.ts`      | 98.73%     | 88%      | 100%      | 98.46% |
| `ContactManager.ts`      | 98.88%     | 91.35%   | 100%      | 100%   |
| `DeviceManager.ts`       | 90.74%     | 80.48%   | 90.9%     | 90.74% |
| `GroupManager.ts`        | 100%       | 98.38%   | 100%      | 100%   |
| `MessageManager.ts`      | 90.28%     | 86.66%   | 90%       | 91.07% |
| `StickerManager.ts`      | 92.85%     | 83.33%   | 100%      | 92.85% |
| `SignalCli.ts`           | 83.47%     | 70.99%   | 79.72%    | 85.32% |
| `SignalBot.ts`           | 73.03%     | 59.75%   | 65.62%    | 72.62% |
| `MultiAccountManager.ts` | 88.49%     | 74.28%   | 82.6%     | 90.09% |

### Test suites

| Suite                                    | Focus                                                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `errors.test.ts`                         | Error class hierarchy and serialization                                                                         |
| `validators.test.ts`                     | Phone number, UUID, and input validation                                                                        |
| `config.test.ts`                         | Configuration validation and defaults                                                                           |
| `retry.test.ts`                          | Retry logic and exponential backoff                                                                             |
| `security.test.ts`                       | Input sanitization and injection prevention                                                                     |
| `robustness.test.ts`                     | Edge cases and failure scenarios                                                                                |
| `SignalCli.test.ts`                      | Core connection and messaging                                                                                   |
| `SignalCli.methods.test.ts`              | Full API method coverage                                                                                        |
| `SignalCli.advanced.test.ts`             | Advanced send options, receive, identity                                                                        |
| `SignalCli.integration.test.ts`          | Connection lifecycle and JSON-RPC parsing                                                                       |
| `SignalCli.simple.test.ts`               | isRegistered, sendNoteToSelf                                                                                    |
| `SignalCli.parsing.test.ts`              | Envelope parsing and event emission                                                                             |
| `SignalCli.events.test.ts`               | Reaction, receipt, typing events                                                                                |
| `SignalCli.connections.test.ts`          | Unix socket, TCP, HTTP daemon modes                                                                             |
| `SignalCli.e2e.test.ts`                  | End-to-end multi-step workflows                                                                                 |
| `SignalCli.v0140.test.ts`                | sendPinMessage, sendUnpinMessage, sendAdminDelete, noUrgent, ignoreAvatars, ignoreStickers, JsonRpcStartOptions |
| `DeviceManager.test.ts`                  | Device listing, linking, renaming                                                                               |
| `MultiAccountManager.test.ts`            | Multi-account management                                                                                        |
| `MultiAccountManager.coverage.test.ts`   | Edge cases for multi-account                                                                                    |
| `SignalBot.test.ts`                      | Bot startup, commands, events                                                                                   |
| `SignalBot.additional.test.ts`           | Extended bot features                                                                                           |
| `SignalBot.coverage.test.ts`             | Bot edge cases and error handling                                                                               |
| `signal-cli-v0141-compatibility.test.ts` | signal-cli v0.14.1 compatibility tests                                                                          |
| `coverage-improvement.test.ts`           | Additional coverage tests for managers                                                                          |

---

## Troubleshooting

**signal-cli not found / ENOENT error**

The `postinstall` script downloads signal-cli automatically. If it failed (e.g. no internet during `npm install`), re-run it:

```bash
node node_modules/signal-sdk/scripts/install.js
```

Or download manually from the [signal-cli releases page](https://github.com/AsamK/signal-cli/releases) and place the binary at `node_modules/signal-sdk/bin/signal-cli`.

**Java not found (macOS / Windows)**

The JVM-based signal-cli distribution requires Java 25 or later:

```bash
# macOS
brew install openjdk@21

# Ubuntu / Debian
sudo apt install openjdk-21-jre

# Verify
java -version
```

**Phone number not registered**

```bash
./node_modules/signal-sdk/bin/signal-cli -a +33111111111 register
./node_modules/signal-sdk/bin/signal-cli -a +33111111111 verify 123-456
```

**Connection timeout**

Test signal-cli directly to confirm the account works:

```bash
./node_modules/signal-sdk/bin/signal-cli -a +33111111111 send -m "test" +33222222222
```

**Permission denied on config directory**

```bash
chmod -R 755 ~/.local/share/signal-cli/
```

**Rate limit error**

signal-cli returns exit code 5 when rate-limited. Use `submitRateLimitChallenge()` to resolve it:

```javascript
await signal.submitRateLimitChallenge(challengeToken, captchaToken);
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes and add tests
4. Ensure all tests pass (`npm test`)
5. Submit a pull request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

---

## License

MIT — see [LICENSE](./LICENSE) for details.

---

## Acknowledgments

- [signal-cli](https://github.com/AsamK/signal-cli) by AsamK — the underlying Signal command-line client
- [Signal Protocol](https://signal.org/docs/) — end-to-end encrypted messaging protocol
- The Signal open-source community

---

## Support

- **Issues**: [GitHub Issues](https://github.com/benoitpetit/signal-sdk/issues)
- **Examples**: [examples/](./examples/)
- **Docs**: [docs/](./docs/)

If you find this project useful, consider supporting its development:

[![Donate on Liberapay](https://img.shields.io/badge/Liberapay-Donate-yellow.svg)](https://liberapay.com/devbyben/donate)

---

_Made with ❤️ for the Signal community_
