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
new SignalCli(signalCliPath?: string, account?: string)
```

- **`signalCliPath`** (optional): Path to the `signal-cli` binary. Defaults to `./bin/signal-cli`.
- **`account`** (optional): Phone number for the Signal account (e.g., `"+15551234567"`).

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

### Group Management

#### `createGroup(name: string, members: string[]): Promise<GroupInfo>`

Creates a new Signal group.

#### `updateGroup(groupId: string, options: GroupUpdateOptions): Promise<void>`

Updates a group's settings and members.

#### `listGroups(): Promise<GroupInfo[]>`

Lists all groups.

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

#### `block(recipients: string[], groupId?: string): Promise<void>`

Blocks one or more contacts.

#### `unblock(recipients: string[], groupId?: string): Promise<void>`

Unblocks one or more contacts.

#### `getUserStatus(numbers?: string[], usernames?: string[]): Promise<UserStatusResult[]>`

Checks if phone numbers or usernames are registered with Signal.

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