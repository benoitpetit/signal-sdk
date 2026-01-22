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

#### `removeDevice(deviceId: number): Promise<void>`

Removes a linked device.

### Messaging

#### `sendMessage(recipient: string, message: string, options?: SendMessageOptions): Promise<SendResponse>`

Sends a message to a recipient (user or group).

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

#### `startChangeNumber(newNumber: string, voice?: boolean, captcha?: string): Promise<ChangeNumberSession>`

Starts the process of changing a phone number.

#### `finishChangeNumber(verificationCode: string, pin?: string): Promise<void>`

Completes the phone number change process.

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

## TypeScript Interfaces

The SDK uses a comprehensive set of TypeScript interfaces for type safety. These are defined in `src/interfaces.ts` and include types for messages, contacts, groups, attachments, and more.
