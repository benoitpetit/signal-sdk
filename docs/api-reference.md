# API Reference

Complete API documentation for the Signal SDK classes and interfaces.

## Table of Contents

- [Class `SignalCli`](#signalcli-class)
  - [Connection Management](#connection-management)
  - [Device Management](#device-management)
  - [Messaging](#messaging)
  - [Group Management](#group-management)
  - [Contact Management](#contact-management)
  - [Payment Features](#payment-features)
  - [Custom Sticker Management](#custom-sticker-management)
  - [Rate Limit Management](#rate-limit-management)
  - [Phone Number Management](#phone-number-management)
- [Class `SignalBot`](#signalbot-class)
  - [Configuration](#configuration)
  - [Command Management](#command-management)
  - [Bot Lifecycle](#bot-lifecycle)
  - [Bot Actions](#bot-actions)
  - [Events](#events)
- [TypeScript Interfaces](#typescript-interfaces)

---

## `SignalCli` Class

The core class for Signal messaging operations using JSON-RPC with `signal-cli`.

### Constructor

```typescript
new SignalCli(account?: string, signalCliPath?: string, config?: SignalCliConfig)
```

- **`account`** (optional): Phone number for the Signal account (e.g., `"+15551234567"`).
- **`signalCliPath`** (optional): Path to the `signal-cli` binary. Defaults to `./bin/signal-cli`.
- **`config`** (optional): Advanced configuration object:
  - `retryConfig`: Retry configuration with exponential backoff
    - `maxAttempts`: Maximum retry attempts (default: 3)
    - `initialDelay`: Initial delay in ms (default: 1000)
    - `maxDelay`: Maximum delay in ms (default: 30000)
    - `backoffMultiplier`: Backoff multiplier (default: 2)
  - `rateLimiter`: Rate limiting configuration
    - `maxConcurrent`: Maximum concurrent requests (default: 5)
    - `minInterval`: Minimum interval between requests in ms (default: 100)
  - `logger`: Logger instance for structured logging
  - `timeout`: Operation timeout in ms (default: 30000)
  - **Daemon Mode Options:**
    - `socketPath`: Unix socket path for daemon connection
    - `tcpHost`: TCP host for daemon connection
    - `tcpPort`: TCP port for daemon connection
    - `httpHost`: HTTP host for REST API
    - `httpPort`: HTTP port for REST API

#### Example with Configuration

```typescript
import { SignalCli, Logger } from "signal-sdk";

const config = {
  retryConfig: {
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 60000,
    backoffMultiplier: 2,
  },
  rateLimiter: {
    maxConcurrent: 3,
    minInterval: 500,
  },
  logger: new Logger("debug"),
  timeout: 60000,
};

const signal = new SignalCli("+1234567890", undefined, config);
```

### Connection Management

#### `connect(): Promise<void>`

Establishes the JSON-RPC connection with the `signal-cli` daemon.

#### `disconnect(): void`

Immediately terminates the connection.

#### `gracefulShutdown(): Promise<void>`

Gracefully closes the connection.

### Device Management

#### `register(number: string, voice?: boolean, captcha?: string): Promise<void>`

Registers a new Signal account.

#### `verify(number: string, token: string, pin?: string): Promise<void>`

Verifies a new account with the code received via SMS/voice.

#### `deviceLink(options?: LinkingOptions): Promise<LinkingResult>`

Links a new device to an existing Signal account with QR code support.

#### `listDevices(): Promise<Device[]>`

Lists all linked devices for the account.

#### `updateDevice(options: UpdateDeviceOptions): Promise<void>`

Updates a linked device's name. Requires signal-cli v0.13.23 or newer.

**Parameters:**

- `options.deviceId`: Device ID to update (number)
- `options.deviceName`: New name for the device (string)

**Example:**

```typescript
const devices = await signal.listDevices();
await signal.updateDevice({
  deviceId: 2,
  deviceName: "Work Laptop",
});
```

#### `removeDevice(deviceId: number): Promise<void>`

Removes a linked device.

### Messaging

#### `sendMessage(recipient: string, message: string, options?: SendMessageOptions): Promise<SendResponse>`

Sends a message to a recipient (user or group).

**Advanced Options** (SendMessageOptions):

- `attachments`: File paths to attach (string[])
- `textStyle`: Text styling ranges for bold/italic/etc.
- `textMode`: Text mode ('normal' | 'styled')
- `mention`: Mentions with start/length/uuid
- `quoteTimestamp`: Timestamp of message to quote
- `quoteAuthor`: Author of quoted message
- `quoteMessage`: Text of quoted message
- `quoteMention`: Mentions in quoted message
- `editTimestamp`: Timestamp of message to edit
- `previewUrl`: URL for preview generation
- `storyTimestamp`: Timestamp to reply to a story
- `storyAuthor`: Author of story to reply to

**Example:**

```typescript
// Send with text styling and mention
await signal.sendMessage("+1234567890", "Hello @John", {
  textStyle: [{ start: 6, length: 5, style: "BOLD" }],
  mention: [{ start: 6, length: 5, uuid: "user-uuid" }],
});

// Reply to a message
await signal.sendMessage("+1234567890", "Great point!", {
  quoteTimestamp: 1705843200000,
  quoteAuthor: "+1234567890",
  quoteMessage: "Original message text",
});

// Edit a previous message
await signal.sendMessage("+1234567890", "Corrected text", {
  editTimestamp: 1705843200000,
});
```

#### `receive(options?: ReceiveOptions): Promise<Message[]>`

Receives pending messages with advanced filtering options. Replaces the deprecated `receiveMessages()` method.

**Parameters:**

- `options`: Optional receive configuration
  - `timeout`: Maximum time to wait for messages in seconds (default: 5)
  - `maxMessages`: Maximum number of messages to retrieve
  - `ignoreAttachments`: Skip downloading attachments (boolean)
  - `ignoreStories`: Ignore story messages (boolean)
  - `sendReadReceipts`: Automatically send read receipts (boolean, default: true)

**Returns:** Array of received messages

**Example:**

```typescript
// Receive with timeout
const messages = await signal.receive({ timeout: 10 });

// Receive without attachments (faster)
const messages = await signal.receive({
  timeout: 5,
  ignoreAttachments: true,
  ignoreStories: true,
});

// Receive without sending read receipts
const messages = await signal.receive({
  sendReadReceipts: false,
});
```

#### `sendReaction(recipient: string, targetAuthor: string, targetTimestamp: number, emoji: string, remove?: boolean): Promise<SendResponse>`

Sends a reaction to a specific message.

#### `sendTyping(recipient: string, stop?: boolean): Promise<void>`

Sends a typing indicator to a recipient.

#### `remoteDeleteMessage(recipient: string, targetTimestamp: number): Promise<void>`

Remotely deletes a sent message.

#### `sendMessageWithProgress(recipient: string, message: string, options?: SendMessageOptions & { onProgress?: (progress: UploadProgress) => void }): Promise<SendResponse>`

Sends a message with progress tracking for large attachments.

#### `sendPollCreate(recipient: string, question: string, options: PollCreateOptions): Promise<SendResponse>`

Creates a poll in a conversation.

**Parameters:**

- `recipient`: Phone number or group ID
- `question`: Poll question text
- `options`:
  - `answers`: Array of poll answer options (string[])
  - `multipleAnswers`: Allow multiple answers (boolean)

**Example:**

```typescript
await signal.sendPollCreate("+1234567890", "What's your favorite color?", {
  answers: ["Red", "Blue", "Green", "Yellow"],
  multipleAnswers: false,
});
```

#### `sendPollVote(recipient: string, options: PollVoteOptions): Promise<SendResponse>`

Votes on an existing poll.

**Parameters:**

- `recipient`: Phone number or group ID where poll was sent
- `options`:
  - `pollAuthor`: Phone number of the poll creator
  - `pollTimestamp`: Timestamp of the poll message
  - `optionIndexes`: Array of answer indices to vote for (number[])
  - `voteCount`: Optional vote count (increase for each vote)

**Example:**

```typescript
await signal.sendPollVote("+1234567890", {
  pollAuthor: "+1234567890",
  pollTimestamp: 1705843200000,
  optionIndexes: [0, 2], // Vote for first and third options
});
```

#### `sendPollTerminate(recipient: string, options: PollTerminateOptions): Promise<SendResponse>`

Terminates a poll, preventing further votes.

**Parameters:**

- `recipient`: Phone number or group ID where poll was sent
- `options`:
  - `pollTimestamp`: Timestamp of the poll message

**Example:**

```typescript
await signal.sendPollTerminate("+1234567890", {
  pollTimestamp: 1705843200000,
});
```

### Group Management

#### `createGroup(name: string, members: string[]): Promise<GroupInfo>`

Creates a new Signal group.

#### `updateGroup(groupId: string, options: GroupUpdateOptions): Promise<void>`

Updates a group's settings and members.

#### `listGroups(): Promise<GroupInfo[]>`

Lists all groups.

#### `listGroupsDetailed(): Promise<DetailedGroupInfo[]>`

Lists all groups with detailed information including permissions, member roles, and invite links.

**Returns:** Array of detailed group information:

- `groupId`: Group identifier
- `name`: Group name
- `description`: Group description
- `members`: Array of member objects with roles and permissions
- `pendingMembers`: Members pending approval
- `requestingMembers`: Members requesting to join
- `bannedMembers`: Banned member list
- `inviteLink`: Group invite link
- `groupPermissions`: Permission settings
- `isAdmin`: Whether current user is admin
- `isMember`: Whether current user is member

**Example:**

```typescript
const groups = await signal.listGroupsDetailed();
groups.forEach((group) => {
  console.log(`${group.name}: ${group.members.length} members`);
  if (group.isAdmin) console.log("  (You are admin)");
});
```

#### `joinGroup(uri: string): Promise<void>`

Joins a group via an invitation link.

#### `quitGroup(groupId: string): Promise<void>`

Leaves a group.

### Contact Management

#### `listContacts(): Promise<Contact[]>`

Lists all contacts.

#### `updateContact(number: string, name: string, options?: ContactUpdateOptions): Promise<void>`

Updates a contact's name.

#### `removeContact(number: string, options?: RemoveContactOptions): Promise<void>`

Removes a contact from the contact list.

#### `sendContacts(recipient: string): Promise<SendResponse>`

Exports and sends contact list to a recipient. Useful for contact sharing and backup.

**Parameters:**

- `recipient`: Phone number or group ID to send contacts to

**Example:**

```typescript
// Send your contact list to another user
await signal.sendContacts("+1234567890");
```

#### `block(recipients: string[], groupId?: string): Promise<void>`

Blocks one or more contacts.

#### `unblock(recipients: string[], groupId?: string): Promise<void>`

Unblocks one or more contacts.

#### `getUserStatus(numbers?: string[], usernames?: string[]): Promise<UserStatusResult[]>`

Checks if phone numbers or usernames are registered with Signal.

### Identity and Security Management

#### `getSafetyNumber(recipient: string): Promise<SafetyNumberInfo>`

Retrieves the safety number for identity verification with a contact.

**Parameters:**

- `recipient`: Phone number or UUID of the contact

**Returns:** Safety number information:

- `safetyNumber`: The 60-digit safety number
- `identityKey`: The identity key (base64)
- `trusted`: Whether the identity is trusted

**Example:**

```typescript
const safetyInfo = await signal.getSafetyNumber("+1234567890");
console.log("Safety Number:", safetyInfo.safetyNumber);
console.log("Trusted:", safetyInfo.trusted);
```

#### `verifySafetyNumber(recipient: string, safetyNumber: string): Promise<VerificationResult>`

Verifies a safety number matches the expected value and marks it as trusted.

**Parameters:**

- `recipient`: Phone number or UUID of the contact
- `safetyNumber`: The 60-digit safety number to verify

**Returns:** Verification result with success status

**Example:**

```typescript
const result = await signal.verifySafetyNumber(
  "+1234567890",
  "123456789012345678901234567890123456789012345678901234567890",
);
console.log("Verified:", result.success);
```

#### `listUntrustedIdentities(recipient?: string): Promise<UntrustedIdentity[]>`

Lists identities that have changed and need verification.

**Parameters:**

- `recipient`: Optional phone number to check specific contact

**Returns:** Array of untrusted identities with details

**Example:**

```typescript
const untrusted = await signal.listUntrustedIdentities();
untrusted.forEach((identity) => {
  console.log(`${identity.number}: ${identity.identityKey}`);
});
```

### Username Management

#### `setUsername(username: string): Promise<UsernameResult>`

Sets or updates your Signal username.

**Parameters:**

- `username`: Desired username (alphanumeric with optional dots, no spaces)

**Returns:** Username result with success status and username link

**Example:**

```typescript
const result = await signal.setUsername("john.doe.42");
console.log("Username set:", result.username);
console.log("Share link:", result.usernameLink);
```

#### `deleteUsername(): Promise<void>`

Deletes your Signal username.

**Example:**

```typescript
await signal.deleteUsername();
console.log("Username removed");
```

#### `getUsernameLink(): Promise<string>`

Retrieves your username link for sharing.

**Returns:** Username link URL

**Example:**

```typescript
const link = await signal.getUsernameLink();
console.log("Share your username:", link);
```

### Enhanced Parsing Helpers

#### `parseContactProfile(contact: Contact): EnhancedContact`

Parses and enriches contact information from raw Signal data.

**Parameters:**

- `contact`: Raw contact object

**Returns:** Enhanced contact with additional fields:

- `givenName`: First name
- `familyName`: Last name
- `mobileCoinAddress`: MobileCoin payment address
- `profileKey`: Profile encryption key
- `username`: Signal username
- `registered`: Registration status

**Example:**

```typescript
const contacts = await signal.listContacts();
const enhanced = contacts.map((c) => signal.parseContactProfile(c));
enhanced.forEach((contact) => {
  console.log(`${contact.givenName} ${contact.familyName}`);
  if (contact.username) console.log(`  @${contact.username}`);
});
```

#### `getContactsWithProfiles(): Promise<EnhancedContact[]>`

Returns all contacts with parsed profile information.

**Returns:** Array of enhanced contacts

**Example:**

```typescript
const contacts = await signal.getContactsWithProfiles();
contacts.forEach((c) => {
  console.log(`${c.givenName} ${c.familyName} (@${c.username})`);
});
```

#### `parseGroupDetails(group: Group): EnhancedGroup`

Parses and enriches group information from raw Signal data.

**Parameters:**

- `group`: Raw group object

**Returns:** Enhanced group with additional fields:

- `pendingMembers`: Members waiting for approval
- `bannedMembers`: Banned members list
- `inviteLink`: Group invitation link
- `version`: Group version
- `masterKey`: Group master key

**Example:**

```typescript
const groups = await signal.listGroups();
const enhanced = groups.map((g) => signal.parseGroupDetails(g));
enhanced.forEach((group) => {
  console.log(`${group.name}:`);
  console.log(`  Members: ${group.members.length}`);
  console.log(`  Pending: ${group.pendingMembers?.length || 0}`);
  console.log(`  Banned: ${group.bannedMembers?.length || 0}`);
  if (group.inviteLink) console.log(`  Invite: ${group.inviteLink}`);
});
```

#### `getGroupsWithDetails(): Promise<EnhancedGroup[]>`

Returns all groups with parsed detailed information.

**Returns:** Array of enhanced groups

**Example:**

```typescript
const groups = await signal.getGroupsWithDetails();
groups.forEach((g) => {
  console.log(`${g.name} - ${g.members.length} members`);
  if (g.inviteLink) console.log(`  Join: ${g.inviteLink}`);
});
```

### Advanced Group Management

#### `sendGroupInviteLink(groupId: string): Promise<string>`

Generates and retrieves the invite link for a group.

**Parameters:**

- `groupId`: Group identifier

**Returns:** Group invite link URL

**Example:**

```typescript
const inviteLink = await signal.sendGroupInviteLink("group-id-123");
console.log("Share this link:", inviteLink);
```

#### `setBannedMembers(groupId: string, members: string[]): Promise<void>`

Sets the list of banned members for a group.

**Parameters:**

- `groupId`: Group identifier
- `members`: Array of phone numbers to ban

**Example:**

```typescript
await signal.setBannedMembers("group-id-123", ["+1234567890", "+1987654321"]);
```

#### `resetGroupLink(groupId: string): Promise<string>`

Resets the group invite link (invalidates old link).

**Parameters:**

- `groupId`: Group identifier

**Returns:** New group invite link

**Example:**

```typescript
const newLink = await signal.resetGroupLink("group-id-123");
console.log("New invite link:", newLink);
```

### Account Management

#### `updateAccount(options: UpdateAccountOptions): Promise<AccountUpdateResult>`

Updates account settings including name, avatar, and profile.

**Parameters:**

- `options`:
  - `name`: Account display name (string)
  - `avatar`: Path to avatar image file (string)
  - `removeAvatar`: Remove current avatar (boolean)
  - `about`: About/status text (string)
  - `aboutEmoji`: About emoji (string)
  - `mobileCoinAddress`: MobileCoin address for payments (string)

**Returns:** Account update result with success status

**Example:**

```typescript
const result = await signal.updateAccount({
  name: "John Doe",
  avatar: "./profile-pic.jpg",
  about: "Signal SDK Developer",
  aboutEmoji: "💻",
});
console.log("Account updated:", result.success);
```

#### `listAccountsDetailed(): Promise<DetailedAccountInfo[]>`

Lists all registered accounts with detailed information.

**Returns:** Array of detailed account information:

- `number`: Phone number
- `uuid`: Account UUID
- `username`: Signal username
- `name`: Display name
- `about`: About text
- `aboutEmoji`: About emoji
- `avatar`: Avatar information
- `deviceId`: Device identifier
- `registered`: Registration status

**Example:**

```typescript
const accounts = await signal.listAccountsDetailed();
accounts.forEach((account) => {
  console.log(`${account.name} (${account.number})`);
  if (account.about) console.log(`  About: ${account.about}`);
});
```

### Attachment Management

#### `getAttachment(attachmentId: string, outputPath?: string): Promise<AttachmentData>`

Retrieves an attachment by its ID.

**Parameters:**

- `attachmentId`: Unique attachment identifier
- `outputPath`: Optional path to save the attachment

**Returns:** Attachment data with content type and data

**Example:**

```typescript
const attachment = await signal.getAttachment(
  "abc123...",
  "./downloads/file.pdf",
);
console.log("Downloaded:", attachment.contentType);
```

#### `getAvatar(contact: string, outputPath?: string): Promise<AvatarData>`

Retrieves a contact's or group's avatar by contact identifier.

**Parameters:**

- `contact`: Phone number, UUID, or group ID
- `outputPath`: Optional path to save the avatar

**Returns:** Avatar data with image information

**Example:**

```typescript
const avatar = await signal.getAvatar("+1234567890", "./avatars/contact.jpg");
```

#### `getSticker(stickerId: string, outputPath?: string): Promise<StickerData>`

Retrieves a sticker by its ID.

**Parameters:**

- `stickerId`: Unique sticker identifier from pack
- `outputPath`: Optional path to save the sticker

**Returns:** Sticker data with image information

**Example:**

```typescript
const sticker = await signal.getSticker(
  "sticker-id-123",
  "./stickers/my-sticker.webp",
);
```

### Payment Features

#### `sendPaymentNotification(recipient: string, paymentData: PaymentNotificationData): Promise<SendResponse>`

Sends a payment notification with a receipt to a recipient.

### Custom Sticker Management

#### `uploadStickerPack(manifest: StickerPackManifest): Promise<StickerPackUploadResult>`

Uploads a custom sticker pack to Signal.

#### `listStickerPacks(): Promise<StickerPack[]>`

Lists installed sticker packs.

### Rate Limit Management

#### `submitRateLimitChallenge(challenge: string, captcha: string): Promise<RateLimitChallengeResult>`

Submits a rate limit challenge to lift the limitation.

### Phone Number Management

#### `startChangeNumber(newNumber: string, voice?: boolean, captcha?: string): Promise<void>`

Starts the process of changing your account to a new phone number. Initiates SMS or voice verification.

**Parameters:**

- `newNumber`: The new phone number in E164 format (e.g., `"+33612345678"`)
- `voice`: Use voice verification instead of SMS (default: `false`)
- `captcha`: Optional captcha token if required (get from https://signalcaptchas.org/registration/generate.html)

**Throws:** Error if not a primary device or rate limited

**Example:**

```typescript
// Start SMS verification
await signal.startChangeNumber("+33612345678");

// Or use voice verification
await signal.startChangeNumber("+33612345678", true);

// Wait for SMS/voice code, then call finishChangeNumber()
```

#### `finishChangeNumber(newNumber: string, verificationCode: string, pin?: string): Promise<void>`

Completes the phone number change process. Verifies the code received via SMS or voice and changes your account to the new number.

**Parameters:**

- `newNumber`: The new phone number (same as `startChangeNumber`)
- `verificationCode`: The verification code received via SMS or voice
- `pin`: Optional registration lock PIN if one was set

**Throws:** Error if verification fails or incorrect PIN

**Example:**

```typescript
// After receiving verification code
await signal.finishChangeNumber("+33612345678", "123456");

// Or with PIN if registration lock is enabled
await signal.finishChangeNumber("+33612345678", "123456", "1234");
```

---

## `SignalBot` Class

A high-level class for creating interactive Signal bots.

### Constructor

```typescript
new SignalBot(config: BotConfig, signalCliPath?: string)
```

- **`config`**: `BotConfig` object for the bot.
- **`signalCliPath`** (optional): Path to the `signal-cli` binary.

### Configuration

The bot's configuration is managed via the `BotConfig` interface, which includes:

- `phoneNumber`: The bot's phone number.
- `admins`: A list of administrator phone numbers.
- `group`: Configuration for a bot-managed group.
- `settings`: Bot settings like command prefix, cooldowns, etc.

### Command Management

#### `addCommand(command: BotCommand): void`

Adds a custom command to the bot.

#### `removeCommand(name: string): boolean`

Removes a command from the bot.

#### `getCommands(): BotCommand[]`

Retrieves all available commands.

### Bot Lifecycle

#### `start(): Promise<void>`

Starts the bot, connects to `signal-cli`, and sets up event handlers.

#### `stop(): Promise<void>`

Stops the bot and disconnects from `signal-cli`.

#### `gracefulShutdown(): Promise<void>`

Gracefully shuts down the bot.

### Bot Actions

#### `sendMessage(recipient: string, message: string): Promise<void>`

Sends a text message.

#### `sendMessageWithAttachment(recipient: string, message: string, attachments: string[], cleanup?: string[]): Promise<void>`

Sends a message with attachments.

#### `sendMessageWithImage(recipient: string, message: string, imageUrl: string, prefix?: string): Promise<void>`

Downloads an image from a URL and sends it as an attachment.

#### `sendReaction(recipient: string, targetAuthor: string, targetTimestamp: number, emoji: string): Promise<void>`

Sends a reaction to a message.

### Events

The `SignalBot` class emits several events:

- `ready`: Emitted when the bot is started and ready.
- `stopped`: Emitted when the bot is stopped.
- `message`: Emitted upon receiving a new message.
- `command`: Emitted when a command is executed.
- `error`: Emitted when an error occurs.

---

## `MultiAccountManager` Class

Manages multiple Signal accounts simultaneously with automatic event routing.

### Constructor

```typescript
import { MultiAccountManager } from "signal-sdk";

const manager = new MultiAccountManager();
```

### Account Management

#### `addAccount(account: string, signalCliPath?: string, config?: SignalCliConfig): SignalCli`

Adds a Signal account to the manager.

**Parameters:**

- `account`: Phone number for the account
- `signalCliPath`: Optional path to signal-cli binary
- `config`: Optional Signal CLI configuration

**Returns:** SignalCli instance for the account

**Example:**

```typescript
const account1 = manager.addAccount("+1234567890");
const account2 = manager.addAccount("+1987654321");
```

#### `removeAccount(account: string): boolean`

Removes an account from the manager.

**Parameters:**

- `account`: Phone number of account to remove

**Returns:** true if account was removed

**Example:**

```typescript
manager.removeAccount("+1234567890");
```

#### `getAccount(account: string): SignalCli | undefined`

Retrieves a specific account instance.

**Parameters:**

- `account`: Phone number of account

**Returns:** SignalCli instance or undefined

**Example:**

```typescript
const account = manager.getAccount("+1234567890");
if (account) {
  await account.sendMessage("+1111111111", "Hello");
}
```

#### `getAccounts(): Map<string, SignalCli>`

Returns all managed accounts.

**Returns:** Map of account number to SignalCli instance

**Example:**

```typescript
const accounts = manager.getAccounts();
console.log(`Managing ${accounts.size} accounts`);
```

### Connection Management

#### `connectAll(): Promise<void>`

Connects all managed accounts to their respective daemons.

**Example:**

```typescript
await manager.connectAll();
console.log("All accounts connected");
```

#### `disconnectAll(): void`

Disconnects all managed accounts.

**Example:**

```typescript
manager.disconnectAll();
```

### Messaging Operations

#### `sendMessage(fromAccount: string, recipient: string, message: string, options?: SendMessageOptions): Promise<SendResponse>`

Sends a message from a specific account.

**Parameters:**

- `fromAccount`: Phone number of sending account
- `recipient`: Phone number or group ID of recipient
- `message`: Message text
- `options`: Optional send options

**Returns:** Send response

**Example:**

```typescript
await manager.sendMessage("+1234567890", "+1111111111", "Hello from account 1");
```

#### `receive(account: string, options?: ReceiveOptions): Promise<Message[]>`

Receives messages for a specific account.

**Parameters:**

- `account`: Phone number of account
- `options`: Optional receive options

**Returns:** Array of received messages

**Example:**

```typescript
const messages = await manager.receive("+1234567890", {
  timeout: 5,
  ignoreStories: true,
});
```

### Status and Monitoring

#### `getAllStatus(): AccountStatus[]`

Retrives the status of all managed accounts.

**Returns:** Array of account statuses:

- `account`: Phone number
- `connected`: Connection status
- `deviceLinked`: Device linking status

**Example:**

```typescript
const statuses = manager.getAllStatus();
statuses.forEach((status) => {
  console.log(
    `${status.account}: ${status.connected ? "Connected" : "Disconnected"}`,
  );
});
```

### Events

The `MultiAccountManager` extends EventEmitter and forwards all Signal events with account context:

- `message:account`: Message received for specific account
- `receipt:account`: Receipt received for specific account
- `typing:account`: Typing indicator for specific account
- `error:account`: Error occurred for specific account
- `connected:account`: Account connected
- `disconnected:account`: Account disconnected

**Example:**

```typescript
// Listen to messages from specific account
manager.on("message:+1234567890", (envelope) => {
  console.log("Account 1 received:", envelope.dataMessage?.message);
});

// Listen to all messages
manager.on("message", (account, envelope) => {
  console.log(`${account} received: ${envelope.dataMessage?.message}`);
});

// Listen to connection events
manager.on("connected:+1234567890", () => {
  console.log("Account 1 connected");
});
```

### Complete Multi-Account Example

```typescript
import { MultiAccountManager } from "signal-sdk";

const manager = new MultiAccountManager();

// Add accounts
const account1 = manager.addAccount("+1234567890");
const account2 = manager.addAccount("+1987654321");

// Setup event handlers
manager.on("message:+1234567890", (envelope) => {
  console.log("Account 1:", envelope.dataMessage?.message);
});

manager.on("message:+1987654321", (envelope) => {
  console.log("Account 2:", envelope.dataMessage?.message);
});

// Connect all
await manager.connectAll();

// Send from different accounts
await manager.sendMessage("+1234567890", "+1111111111", "From account 1");
await manager.sendMessage("+1987654321", "+1111111111", "From account 2");

// Check status
const statuses = manager.getAllStatus();
console.log("Account statuses:", statuses);

// Cleanup
manager.disconnectAll();
```

---

## TypeScript Interfaces

The SDK uses a comprehensive set of TypeScript interfaces for type safety. These are defined in `src/interfaces.ts` and include types for messages, contacts, groups, attachments, and more.
