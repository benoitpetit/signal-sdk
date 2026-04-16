# API Reference

Complete API documentation for the Signal SDK classes and interfaces.

## Table of Contents

- [Class `SignalCli`](#signalcli-class)
  - [Constructor](#constructor)
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
new SignalCli(accountOrPath?: string, account?: string, config?: SignalCliConfig)
```

- **`accountOrPath`** (optional): Phone number (e.g., `"+15551234567"`) OR path to the `signal-cli` binary. The constructor uses smart detection - if it starts with `+`, it's treated as a phone number.
- **`account`** (optional): Phone number when the first argument is a path to the binary.
- **`config`** (optional): Advanced configuration object (see [SignalCliConfig](#signalcliconfig))

#### Examples

```typescript
// Simple usage with phone number
const signal = new SignalCli("+15551234567");

// With custom signal-cli path
const signal = new SignalCli("/path/to/signal-cli", "+15551234567");

// With configuration
const signal = new SignalCli("+15551234567", undefined, {
  maxRetries: 5,
  retryDelay: 1000,
  verbose: true,
});
```

#### SignalCliConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `signalCliPath` | `string` | auto-detected | Path to signal-cli binary |
| `maxRetries` | `number` | `3` | Number of retry attempts on failure |
| `retryDelay` | `number` | `1000` | Initial retry delay in milliseconds |
| `maxConcurrentRequests` | `number` | `10` | Maximum parallel JSON-RPC requests |
| `minRequestInterval` | `number` | `100` | Minimum delay between requests in ms |
| `requestTimeout` | `number` | `60000` | Per-request timeout in milliseconds |
| `connectionTimeout` | `number` | `30000` | Connection attempt timeout in milliseconds |
| `autoReconnect` | `boolean` | `true` | Automatically reconnect on disconnect |
| `verbose` | `boolean` | `false` | Enable debug logging |
| `logFile` | `string` | `undefined` | Write logs to a file path |
| `daemonMode` | `'json-rpc' \| 'unix-socket' \| 'tcp' \| 'http'` | `'json-rpc'` | Connection mode |
| `socketPath` | `string` | `'/tmp/signal-cli.sock'` | Unix socket path (unix-socket mode) |
| `tcpHost` | `string` | `'localhost'` | TCP host (tcp mode) |
| `tcpPort` | `number` | `7583` | TCP port (tcp mode) |
| `httpBaseUrl` | `string` | `'http://localhost:8080'` | Base URL (http mode) |

### Connection Management

#### `connect(options?: JsonRpcStartOptions): Promise<void>`

Establishes the JSON-RPC connection with the `signal-cli` daemon.

**Parameters:**
- `options` (optional): Startup flags for the daemon
  - `ignoreAttachments`: Skip downloading attachments
  - `ignoreStories`: Ignore story messages
  - `ignoreAvatars`: Skip downloading avatars
  - `ignoreStickers`: Skip downloading sticker packs
  - `sendReadReceipts`: Auto-send read receipts
  - `receiveMode`: When to start receiving ('on-start', 'on-connection', 'manual')

**Example:**
```typescript
await signal.connect({
  ignoreAttachments: true,
  ignoreStories: true,
  sendReadReceipts: true,
});
```

#### `disconnect(): void`

Immediately terminates the connection.

#### `gracefulShutdown(): Promise<void>`

Gracefully closes the connection, waiting for pending operations to complete.

### Device Management

#### `register(number: string, voice?: boolean, captcha?: string, reregister?: boolean): Promise<void>`

Registers a new Signal account.

**Parameters:**
- `number`: Phone number to register (E.164 format)
- `voice`: If true, verification is done via voice call instead of SMS
- `captcha`: Captcha token (required if registration fails with captcha required)
- `reregister`: If true, register even if account is already registered

#### `verify(number: string, token: string, pin?: string): Promise<void>`

Verifies a new account with the code received via SMS/voice.

#### `deviceLink(options?: LinkingOptions): Promise<LinkingResult>`

Links a new device to an existing Signal account with QR code support.

**Parameters:**
- `options.name`: Device name
- `options.qrCodeOutput`: 'console', 'file', or 'base64'
- `options.qrCodePath`: Path to save QR code (when qrCodeOutput is 'file')

#### `listDevices(): Promise<Device[]>`

Lists all linked devices for the account.

#### `updateDevice(options: UpdateDeviceOptions): Promise<void>`

Updates a linked device's name.

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

**SendMessageOptions:**

| Option | Type | Description |
|--------|------|-------------|
| `attachments` | `string[]` | File paths to attach |
| `mentions` | `Mention[]` | Mentions in the message body |
| `textStyles` | `TextStyle[]` | Text formatting (BOLD, ITALIC, SPOILER, STRIKETHROUGH, MONOSPACE) |
| `quote` | `QuoteOptions` | Reply to an existing message |
| `expiresInSeconds` | `number` | Message expiration timer |
| `isViewOnce` | `boolean` | View-once message |
| `editTimestamp` | `number` | Timestamp of the message to edit |
| `previewUrl` | `string` | URL for link preview |
| `previewTitle` | `string` | Title for link preview |
| `previewDescription` | `string` | Description for link preview |
| `previewImage` | `string` | Image path for link preview |
| `storyTimestamp` | `number` | Timestamp of a story to reply to |
| `storyAuthor` | `string` | Author of the story to reply to |
| `noteToSelf` | `boolean` | Send to own account |
| `endSession` | `boolean` | End the session |
| `noUrgent` | `boolean` | Send without push notification (v0.14.0+) |
| `voiceNote` | `boolean` | Mark attachments as voice notes (v0.14.2+) |

**Examples:**

```typescript
// Send with text styling and mention
await signal.sendMessage("+1234567890", "Hello @John", {
  textStyles: [{ start: 6, length: 5, style: "BOLD" }],
  mentions: [{ start: 6, length: 5, number: "+1234567890" }],
});

// Reply to a message
await signal.sendMessage("+1234567890", "Great point!", {
  quote: {
    timestamp: 1705843200000,
    author: "+1234567890",
    text: "Original message text",
  },
});

// Edit a previous message
await signal.sendMessage("+1234567890", "Corrected text", {
  editTimestamp: 1705843200000,
});
```

#### `receive(options?: ReceiveOptions): Promise<Message[]>`

Receives pending messages with advanced filtering options.

**Parameters:**
- `options`: Optional receive configuration
  - `timeout`: Maximum time to wait for messages in seconds (default: 5)
  - `maxMessages`: Maximum number of messages to retrieve
  - `ignoreAttachments`: Skip downloading attachments (boolean)
  - `ignoreStories`: Ignore story messages (boolean)
  - `ignoreAvatars`: Skip downloading avatars (boolean, v0.14.0+)
  - `ignoreStickers`: Skip downloading sticker packs (boolean, v0.14.0+)
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
```

#### `sendReaction(recipient: string, targetAuthor: string, targetTimestamp: number, emoji: string, remove?: boolean, isStory?: boolean): Promise<SendResponse>`

Sends a reaction to a specific message.

#### `sendTyping(recipient: string, stop?: boolean): Promise<void>`

Sends a typing indicator to a recipient.

#### `remoteDeleteMessage(recipient: string, targetTimestamp: number): Promise<void>`

Remotely deletes a sent message.

#### `sendPinMessage(options: PinMessageOptions): Promise<void>` (v0.14.0+)

Pins a message in a conversation or group.

**PinMessageOptions:**
- `targetAuthor`: Author of the message to pin (required)
- `targetTimestamp`: Timestamp of the message to pin (required)
- `groupId`: Target group (mutually exclusive with `recipients`)
- `recipients`: Target recipients for a direct pin
- `noteToSelf`: Pin in your own conversation
- `pinDuration`: Duration in seconds, `-1` for forever (default)
- `notifySelf`: Send as normal message if self is a recipient
- `story`: Pin a story instead of a normal message

#### `sendUnpinMessage(options: UnpinMessageOptions): Promise<void>` (v0.14.0+)

Unpins a message.

**UnpinMessageOptions:**
- `targetAuthor`: Author of the message to unpin (required)
- `targetTimestamp`: Timestamp of the message to unpin (required)
- `groupId`: Target group
- `recipients`: Target recipients
- `noteToSelf`: Unpin in your own conversation
- `notifySelf`: Send as normal message if self is a recipient

#### `sendAdminDelete(options: AdminDeleteOptions): Promise<void>` (v0.14.0+)

Deletes a message for all group members (admin only).

**AdminDeleteOptions:**
- `groupId`: Group ID (required)
- `targetAuthor`: Author of the message to delete (required)
- `targetTimestamp`: Timestamp of the message to delete (required)
- `story`: Delete a story instead of a regular message
- `notifySelf`: Send as normal message if self is a recipient

#### `sendPollCreate(options: PollCreateOptions): Promise<SendResponse>`

Creates a poll in a conversation.

**PollCreateOptions:**
- `question`: The poll question (required)
- `options`: Array of poll options, 2-10 items (required)
- `multiSelect`: Allow multiple selections (default: true)
- `recipients`: Recipients for direct message poll (either this or groupId required)
- `groupId`: Group ID for group poll (either this or recipients required)

**Example:**
```typescript
// Create a poll in a group
await signal.sendPollCreate({
  question: "What's your favorite color?",
  options: ["Red", "Blue", "Green", "Yellow"],
  multiSelect: false,
  groupId: "groupId==",
});

// Create a poll for individual recipients
await signal.sendPollCreate({
  question: "Meeting time?",
  options: ["9 AM", "12 PM", "3 PM"],
  recipients: ["+1234567890", "+1987654321"],
});
```

#### `sendPollVote(recipient: string, options: PollVoteOptions): Promise<SendResponse>`

Votes on an existing poll.

**Parameters:**
- `recipient`: Phone number or group ID where poll was sent
- `options`:
  - `pollAuthor`: Phone number of the poll creator (required)
  - `pollTimestamp`: Timestamp of the poll message (required)
  - `optionIndexes`: Array of answer indices to vote for (required)
  - `voteCount`: Optional vote count

**Example:**
```typescript
await signal.sendPollVote("groupId==", {
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
  - `pollTimestamp`: Timestamp of the poll message (required)

**Example:**
```typescript
await signal.sendPollTerminate("groupId==", {
  pollTimestamp: 1705843200000,
});
```

#### `sendPaymentNotification(recipient: string, data: PaymentNotificationData): Promise<SendResponse>`

Sends a MobileCoin payment notification.

**PaymentNotificationData:**
- `receipt`: Base64 encoded receipt blob (required)
- `note`: Optional note for the payment

#### `sendNoteToSelf(message: string, options?: SendMessageOptions): Promise<SendResponse>`

Sends a message to your own "Note to Self" conversation.

#### `sendMessageWithProgress(recipient: string, message: string, options?: SendMessageOptions & { onProgress?: (progress: UploadProgress) => void }): Promise<SendResponse>`

Sends a message with progress tracking for large attachments.

**Note:** The progress callback currently provides simulated progress for UX purposes, as JSON-RPC does not provide real-time upload progress feedback.

### Group Management

#### `createGroup(name: string, members: string[]): Promise<GroupInfo>`

Creates a new Signal group.

**Returns:** GroupInfo with `groupId`, `name`, `members`, etc.

#### `updateGroup(groupId: string, options: GroupUpdateOptions): Promise<void>`

Updates a group's settings and members.

**GroupUpdateOptions:**
- `name`: New group name
- `description`: New group description
- `avatar`: Path to avatar image
- `addMembers`: Array of members to add
- `removeMembers`: Array of members to remove
- `promoteAdmins`: Array of members to promote to admin
- `demoteAdmins`: Array of members to demote from admin
- `banMembers`: Array of members to ban
- `unbanMembers`: Array of members to unban
- `permissionAddMember`: 'EVERY_MEMBER' or 'ONLY_ADMINS'
- `permissionEditDetails`: 'EVERY_MEMBER' or 'ONLY_ADMINS'
- `permissionSendMessage`: 'EVERY_MEMBER' or 'ONLY_ADMINS'
- `expirationTimer`: Message expiration timer in seconds
- `resetInviteLink`: Reset the group invite link
- `linkState`: 'enabled', 'enabled-with-approval', or 'disabled'

**Example:**
```typescript
await signal.updateGroup("groupId==", {
  name: "Updated Group Name",
  description: "New description",
  addMembers: ["+1234567890"],
  promoteAdmins: ["+1234567890"],
});
```

#### `listGroups(): Promise<GroupInfo[]>`

Lists all groups.

#### `listGroupsDetailed(options?: ListGroupsOptions): Promise<GroupInfo[]>`

Lists all groups with detailed information including permissions, member roles, and invite links.

**Returns:** Array of detailed group information:
- `groupId`: Group identifier
- `name`: Group name
- `description`: Group description
- `members`: Array of member objects
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

#### `getGroupsWithDetails(options?: ListGroupsOptions): Promise<GroupInfo[]>`

Lists and parses groups with enhanced details.

#### `quitGroup(groupId: string, options?: { delete?: boolean; admins?: string[] }): Promise<void>`

Leaves a group.

**Parameters:**
- `groupId`: The group ID to quit
- `options.delete`: If true, delete local group data after quitting
- `options.admins`: Array of members to promote as admins before quitting (required if you're the only admin)

#### `joinGroup(uri: string): Promise<void>`

Joins a group via an invitation link.

#### `sendGroupInviteLink(groupId: string, recipient: string): Promise<SendResponse>`

Sends the group's invite link to a recipient.

#### `resetGroupLink(groupId: string): Promise<void>`

Resets the group's invite link.

#### `setBannedMembers(groupId: string, members: string[]): Promise<void>`

Sets the banned members list for a group.

### Contact Management

#### `listContacts(options?: ListContactsOptions): Promise<Contact[]>`

Lists all contacts.

**Options:**
- `detailed`: Include more detailed information
- `blocked`: Filter by blocked status (true/false)
- `allRecipients`: Include all known recipients, not only contacts
- `name`: Find contacts with the given name
- `recipients`: Specify phone numbers to filter
- `internal`: Include internal information

#### `getContactsWithProfiles(): Promise<Contact[]>`

Returns all contacts with enriched profile information (givenName, familyName, username, mobileCoinAddress).

#### `updateContact(number: string, name?: string, options?: ContactUpdateOptions): Promise<void>`

Updates a contact's information.

**ContactUpdateOptions:**
- `givenName`: First name
- `familyName`: Last name
- `nickGivenName`: Nickname (first name)
- `nickFamilyName`: Nickname (last name)
- `note`: Contact note
- `color`: Contact color
- `expiration`: Message expiration timer

#### `removeContact(number: string, options?: RemoveContactOptions): Promise<void>`

Removes a contact from the contact list.

**RemoveContactOptions:**
- `hide`: Hide the contact but keep encryption data
- `forget`: Completely remove all contact data

#### `sendContacts(options?: SendContactsOptions): Promise<void>`

Exports and sends contact data to sync with linked devices.

#### `block(recipients: string[], groupId?: string): Promise<void>`

Blocks one or more contacts or a group.

#### `unblock(recipients: string[], groupId?: string): Promise<void>`

Unblocks one or more contacts or a group.

#### `getUserStatus(numbers?: string[], usernames?: string[]): Promise<UserStatusResult[]>`

Checks registration status on Signal.

**Returns:** Array of status results with `number`, `isRegistered`, `uuid`, `username`

### Identity Management

#### `listIdentities(number?: string): Promise<IdentityKey[]>`

Lists known identities and their trust levels.

**Parameters:**
- `number`: Optional phone number to filter identities

#### `trustIdentity(number: string, verifiedSafetyNumber: string): Promise<void>`

Manually marks an identity as trusted by verifying its safety number.

**Parameters:**
- `number`: Phone number of the contact
- `verifiedSafetyNumber`: The 60-digit safety number to verify

#### `trustAllKnownKeys(number: string): Promise<void>`

⚠️ **For testing only.** Trusts all known identity keys of a user without verification.

#### `getSafetyNumber(number: string): Promise<string | null>`

Retrieves the 60-digit safety number for a contact.

**Returns:** The safety number string or null if not found.

#### `verifySafetyNumber(number: string, verifiedSafetyNumber: string): Promise<boolean>`

Verifies a safety number and marks the identity as trusted if it matches.

**Returns:** `true` if verification succeeded, `false` otherwise.

#### `listUntrustedIdentities(): Promise<IdentityKey[]>`

Lists all identities that are not currently trusted.

### Account Management

#### `unregister(): Promise<void>`

Unregisters the Signal account from the server. This deletes the account on the Signal server but keeps local data.

#### `deleteLocalAccountData(): Promise<void>`

Deletes all local data associated with the account.

#### `updateAccountConfiguration(config: AccountConfiguration): Promise<void>`

Updates account-wide configuration settings.

**AccountConfiguration:**
- `readReceipts`: Enable read receipts
- `unidentifiedDeliveryIndicators`: Show unidentified delivery indicators
- `typingIndicators`: Enable typing indicators
- `linkPreviews`: Enable link previews

#### `setPin(pin: string): Promise<void>`

Sets a registration lock PIN for the account.

#### `removePin(): Promise<void>`

Removes the registration lock PIN.

#### `updateProfile(givenName: string, about?: string, aboutEmoji?: string, avatar?: string, options?: { familyName?: string; mobileCoinAddress?: string; removeAvatar?: boolean }): Promise<void>`

Updates the account profile.

**Parameters:**
- `givenName`: First name (required)
- `about`: About/bio text
- `aboutEmoji`: Emoji for the about text
- `avatar`: Path to avatar image
- `options.familyName`: Last name
- `options.mobileCoinAddress`: MobileCoin address for payments
- `options.removeAvatar`: Remove the current avatar

**Example:**
```typescript
await signal.updateProfile("John", "Software developer", "💻", "./avatar.jpg", {
  familyName: "Doe",
});
```

#### `updateAccount(options: UpdateAccountOptions): Promise<AccountUpdateResult>`

Updates account settings.

**UpdateAccountOptions:**
- `deviceName`: New device name
- `username`: Username to set
- `deleteUsername`: Remove current username
- `unrestrictedUnidentifiedSender`: Enable unrestricted unidentified sender
- `discoverableByNumber`: Enable discoverability by phone number
- `numberSharing`: Enable number sharing

**Returns:** `AccountUpdateResult` with `success`, `username`, `usernameLink`

#### `setUsername(username: string): Promise<AccountUpdateResult>`

Sets a Signal username.

#### `deleteUsername(): Promise<AccountUpdateResult>`

Deletes the Signal username.

#### `listAccounts(): Promise<string[]>`

Lists all local account phone numbers.

#### `listAccountsDetailed(): Promise<Array<{ number: string; name?: string; uuid?: string }>>`

Lists accounts with name and UUID.

#### `startChangeNumber(newNumber: string, voice?: boolean, captcha?: string): Promise<void>`

Starts the process of changing your account to a new phone number.

**Parameters:**
- `newNumber`: The new phone number in E164 format (e.g., `"+33612345678"`)
- `voice`: Use voice verification instead of SMS (default: `false`)
- `captcha`: Optional captcha token if required

#### `finishChangeNumber(newNumber: string, verificationCode: string, pin?: string): Promise<void>`

Completes the phone number change process.

### Payment Features

#### `sendPaymentNotification(recipient: string, data: PaymentNotificationData): Promise<SendResponse>`

Sends a MobileCoin payment notification.

**PaymentNotificationData:**
- `receipt`: Base64 encoded receipt blob (required)
- `note`: Optional note for the payment

### Custom Sticker Management

#### `listStickerPacks(): Promise<StickerPack[]>`

Lists installed sticker packs.

#### `addStickerPack(packId: string, packKey: string): Promise<void>`

Adds a sticker pack by ID and key.

#### `uploadStickerPack(manifest: StickerPackManifest): Promise<StickerPackUploadResult>`

Uploads a custom sticker pack.

**StickerPackManifest:**
- `path`: Path to manifest.json or zip file (required)
- `title`: Sticker pack title
- `author`: Sticker pack author
- `cover`: Cover sticker information
- `stickers`: Array of sticker definitions

**Returns:** `StickerPackUploadResult` with `packId`, `packKey`, `installUrl`

#### `getSticker(options: GetStickerOptions): Promise<string>`

Retrieves a sticker. Returns the path to the saved file.

**GetStickerOptions:**
- `packId`: Sticker pack ID (hex encoded)
- `stickerId`: Sticker index in the pack

### Rate Limit Management

#### `submitRateLimitChallenge(challenge: string, captcha: string): Promise<RateLimitChallengeResult>`

Submits a rate limit challenge to lift the limitation.

**Returns:** `RateLimitChallengeResult` with `success`, `retryAfter`, `message`

### Attachment Management

#### `getAttachment(options: GetAttachmentOptions): Promise<string>`

Retrieves an attachment by ID. Returns the path to the saved file.

**GetAttachmentOptions:**
- `id`: Attachment ID (required)
- `recipient`: Recipient who sent the attachment
- `groupId`: Group ID where attachment was sent

#### `getAvatar(options: GetAvatarOptions): Promise<string>`

Retrieves a contact's or group's avatar. Returns the path to the saved file.

**GetAvatarOptions:**
- `contact`: Contact number for contact avatar
- `profile`: Profile number for profile avatar
- `groupId`: Group ID for group avatar

### Sync

#### `sendSyncRequest(): Promise<void>`

Sends a synchronization request to other linked devices.

#### `sendMessageRequestResponse(recipient: string, response: MessageRequestResponseType): Promise<void>`

Responds to a message request from a non-contact.

**MessageRequestResponseType:** `'ACCEPT' | 'DELETE' | 'BLOCK' | 'BLOCK_AND_DELETE'`

#### `getVersion(): Promise<any>`

Retrieves the version of the underlying `signal-cli`.

#### `isRegistered(number: string): Promise<boolean>`

Helper method to check if a phone number is registered on Signal.

### Events

The `SignalCli` class extends EventEmitter and emits the following events:

#### `message`

Emitted when a new message is received.

```typescript
signal.on("message", (envelope) => {
  console.log("From:", envelope.source);
  console.log("Message:", envelope.dataMessage?.message);
});
```

#### `reaction`

Emitted when a reaction is received.

```typescript
signal.on("reaction", (reaction) => {
  console.log("Reaction:", reaction.emoji);
  console.log("From:", reaction.sender);
  console.log("Target:", reaction.targetTimestamp);
});
```

#### `receipt`

Emitted when a delivery/read receipt is received.

```typescript
signal.on("receipt", (receipt) => {
  console.log("Receipt type:", receipt.type); // 'read', 'viewed', or 'delivered'
  console.log("From:", receipt.sender);
});
```

#### `typing`

Emitted when a typing indicator is received.

```typescript
signal.on("typing", (typing) => {
  console.log("Typing from:", typing.sender);
  console.log("Action:", typing.action); // 'start' or 'stop'
});
```

#### `story`

Emitted when a story is received.

```typescript
signal.on("story", (story) => {
  console.log("Story from:", story.sender);
});
```

#### `pin` (v0.14.0+)

Emitted when a message is pinned or unpinned.

```typescript
signal.on("pin", (pinEvent) => {
  console.log("Pin event from:", pinEvent.sender);
  console.log("Pinned timestamps:", pinEvent.pinnedMessageTimestamps);
});
```

#### `call` (v0.14.2+)

Emitted when a call is received or changes state.

```typescript
signal.on("call", (callEvent) => {
  console.log("Call from:", callEvent.sender);
  console.log("Call ID:", callEvent.callId);
  console.log("State:", callEvent.state);
});
```

#### `error`

Emitted when an error occurs.

```typescript
signal.on("error", (error) => {
  console.error("Error:", error.message);
});
```

#### `close`

Emitted when the connection is closed.

```typescript
signal.on("close", (code) => {
  console.log("Connection closed with code:", code);
});
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

### BotConfig

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `phoneNumber` | `string` | Yes | The bot's phone number |
| `admins` | `string[]` | Yes | List of administrator phone numbers |
| `group` | `object` | No | Group configuration |
| `group.name` | `string` | Yes (if group) | Group name |
| `group.description` | `string` | No | Group description |
| `group.createIfNotExists` | `boolean` | No | Auto-create group if it doesn't exist |
| `group.initialMembers` | `string[]` | No | Initial group members |
| `group.avatar` | `string` | No | Path to group avatar image |
| `settings` | `object` | No | Bot settings |
| `settings.commandPrefix` | `string` | No | Command prefix (default: "/") |
| `settings.autoReact` | `boolean` | No | Auto-react to messages |
| `settings.logMessages` | `boolean` | No | Log incoming messages |
| `settings.welcomeNewMembers` | `boolean` | No | Welcome new group members |
| `settings.cooldownSeconds` | `number` | No | Command cooldown per user |
| `settings.maxMessageLength` | `number` | No | Maximum message length |

### Command Management

#### `addCommand(command: BotCommand): void`

Adds a custom command to the bot.

**BotCommand:**
- `name`: Command name (required)
- `description`: Command description (required)
- `adminOnly`: Restrict to admins only (optional)
- `handler`: Async function to handle the command (required)

**Handler signature:**
```typescript
handler: (message: ParsedMessage, args: string[], bot: SignalBot) => Promise<string | null | void>
```

**Example:**
```typescript
bot.addCommand({
  name: "hello",
  description: "Say hello",
  handler: async (message, args) => {
    const name = args.join(" ") || "World";
    return `Hello ${name}!`;
  },
});
```

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

#### `sendReaction(recipient: string, targetAuthor: string, targetTimestamp: number, emoji: string): Promise<void>`

Sends a reaction to a message.

#### `sendMessageWithAttachment(recipient: string, message: string, attachments: string[], cleanup?: string[]): Promise<void>`

Sends a message with attachments.

#### `sendMessageWithImage(recipient: string, message: string, imageUrl: string, prefix?: string): Promise<void>`

Downloads an image from a URL and sends it as an attachment.

#### `downloadImageFromUrl(imageUrl: string, prefix?: string): Promise<string>`

Downloads an image from a URL to a temporary file. Returns the path to the temporary file.

#### `isAdmin(phoneNumber: string): boolean`

Checks if a phone number is in the bot's admin list.

#### `getBotGroupId(): string | null`

Retrieves the ID of the group managed by the bot.

#### `getSignalCli(): SignalCli`

Returns the underlying `SignalCli` instance for advanced operations.

#### `getStats(): BotStats`

Retrieves bot statistics including messages received and commands executed.

**BotStats:**
- `messagesReceived`: Number of messages received
- `commandsExecuted`: Number of commands executed
- `startTime`: Bot start timestamp
- `lastActivity`: Last activity timestamp
- `activeUsers`: Number of active users

### Events

The `SignalBot` class emits several events:

- `ready`: Emitted when the bot is started and ready.
- `stopped`: Emitted when the bot is stopped.
- `message`: Emitted upon receiving a new message.
- `command`: Emitted when a command is executed.
- `error`: Emitted when an error occurs.
- `daemon-closed`: Emitted when the Signal daemon closes.

---

## `MultiAccountManager` Class

Manages multiple Signal accounts simultaneously with automatic event routing.

### Constructor

```typescript
new MultiAccountManager(options?: MultiAccountOptions)
```

**MultiAccountOptions:**
- `signalCliPath`: Path to signal-cli executable
- `dataPath`: Data directory for all accounts
- `verbose`: Enable verbose logging
- `autoReconnect`: Auto-reconnect on failure

### Account Management

#### `addAccount(account: string, config?: Partial<SignalCliConfig>): Promise<SignalCli>`

Adds a Signal account to the manager.

**Parameters:**
- `account`: Phone number for the account
- `config`: Optional Signal CLI configuration overrides

**Returns:** SignalCli instance for the account

#### `removeAccount(account: string): Promise<void>`

Removes an account from the manager and disconnects it.

#### `getAccount(account: string): SignalCli | undefined`

Gets a specific account instance.

#### `getAccounts(): string[]`

Returns all managed account phone numbers.

#### `hasAccount(account: string): boolean`

Checks if an account is managed.

#### `connect(account: string): Promise<void>`

Connects a specific account.

#### `disconnect(account: string): Promise<void>`

Disconnects a specific account.

#### `connectAll(): Promise<void>`

Connects all accounts simultaneously.

#### `disconnectAll(): Promise<void>`

Disconnects all accounts.

#### `sendMessage(fromAccount: string, recipient: string, message: string, options?: any): Promise<any>`

Sends a message from a specific account.

#### `getStatus(account?: string): any`

Retrieves status information for all accounts or a specific one.

#### `shutdown(): Promise<void>`

Gracefully shuts down the manager and all managed accounts.

### Events

The `MultiAccountManager` extends EventEmitter and forwards all Signal events with account context:

- `message`: `(account: string, envelope: any) => void`
- `receipt`: `(account: string, receipt: any) => void`
- `typing`: `(account: string, typing: any) => void`
- `reaction`: `(account: string, reaction: any) => void`
- `error`: `(account: string, error: any) => void`
- `accountAdded`: `(account: string) => void`
- `accountRemoved`: `(account: string) => void`
- `accountConnected`: `(account: string) => void`
- `accountDisconnected`: `(account: string) => void`

**Example:**
```typescript
// Listen to messages from specific account
manager.on("message", (account, envelope) => {
  console.log(`${account} received:`, envelope.dataMessage?.message);
});

// Listen to account connection events
manager.on("accountConnected", (account) => {
  console.log("Account connected:", account);
});
```

---

## TypeScript Interfaces

The SDK uses a comprehensive set of TypeScript interfaces for type safety. These are defined in `src/interfaces.ts` and include types for messages, contacts, groups, attachments, and more.

### Key Interfaces

#### Mention
```typescript
interface Mention {
  start: number;      // Start position in message
  length: number;     // Length of mention
  number: string;     // Phone number of mentioned user
}
```

#### TextStyle
```typescript
interface TextStyle {
  start: number;      // Start position in message
  length: number;     // Length of styled text
  style: 'BOLD' | 'ITALIC' | 'STRIKETHROUGH' | 'MONOSPACE' | 'SPOILER';
}
```

#### QuoteOptions
```typescript
interface QuoteOptions {
  timestamp: number;
  author: string;
  text?: string;
  attachments?: Attachment[];
  mentions?: Mention[];
  textStyles?: TextStyle[];
}
```

#### Contact
```typescript
interface Contact {
  number: string;
  name: string;
  uuid?: string;
  blocked: boolean;
  givenName?: string;
  familyName?: string;
  username?: string;
  mobileCoinAddress?: string;
  // ... more fields
}
```

#### GroupInfo
```typescript
interface GroupInfo {
  groupId: string;
  name: string;
  description?: string;
  members: string[];
  pendingMembers?: string[];
  bannedMembers?: string[];
  admins?: string[];
  isAdmin?: boolean;
  isMember?: boolean;
  inviteLink?: string;
  // ... more fields
}
```

For complete interface definitions, see the source code in `src/interfaces.ts`.
