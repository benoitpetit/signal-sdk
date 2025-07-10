# API Reference

Complete API documentation for the Signal SDK classes and interfaces.

## Table of Contents

- [SignalCli Class](#signalcli-class)
- [SignalBot Class](#signalbot-class)
- [TypeScript Interfaces](#typescript-interfaces)
- [Error Handling](#error-handling)
- [Events](#events)

---

## SignalCli Class

The core class for Signal messaging operations using JSON-RPC with signal-cli.

### Constructor

```typescript
new SignalCli(signalCliPath?: string, account?: string)
```

**Parameters:**

- `signalCliPath` (optional): Path to signal-cli binary. Defaults to `./bin/signal-cli`
- `account` (optional): Phone number for the Signal account (e.g., `"+33111111111"`)

**Example:**

```javascript
const { SignalCli } = require("signal-sdk");

// Auto-detect signal-cli path
const signal = new SignalCli();

// With custom path and account
const signal = new SignalCli("/custom/path/signal-cli", "+33111111111");
```

### Connection Management

#### `connect(): Promise<void>`

Establishes JSON-RPC connection with signal-cli daemon.

```javascript
await signal.connect();
```

#### `disconnect(): void`

Immediately terminates the connection.

```javascript
signal.disconnect();
```

#### `gracefulShutdown(): Promise<void>`

Gracefully closes the connection with cleanup.

```javascript
await signal.gracefulShutdown();
```

### Device Management

#### `deviceLink(options?: LinkingOptions): Promise<LinkingResult>`

Links a new device to existing Signal account with QR code support.

**Parameters:**

- `options.name` (optional): Device name (default: "Signal SDK Device")
- `options.qrCodeOutput` (optional): QR display mode: `'console'` | `'file'` | `'base64'`
- `options.qrCodePath` (optional): File path for QR code image

**Returns:** `LinkingResult` with QR code data and linking status

```javascript
// Display QR code in terminal
const result = await signal.deviceLink({
  name: "My App Device",
  qrCodeOutput: "console",
});

if (result.success) {
  console.log("QR Code URI:", result.qrCode.uri);
  console.log("Is Linked:", result.isLinked);
}
```

#### `register(number: string, voice?: boolean, captcha?: string): Promise<void>`

Registers a new Signal account.

```javascript
await signal.register("+33111111111");
await signal.register("+33111111111", false, "captcha-token");
```

#### `verify(number: string, verificationCode: string): Promise<void>`

Verifies a new Signal account with the code received via SMS/voice.

```javascript
await signal.verify("+33111111111", "123-456");
```

#### `listDevices(): Promise<IDevice[]>`

Lists all linked devices for the current account.

```javascript
const devices = await signal.listDevices();
console.log(devices);
```

#### `removeDevice(deviceId: string): Promise<void>`

Removes a linked device.

```javascript
await signal.removeDevice("device-id-123");
```

### Messaging

#### `sendMessage(recipient: string, message: string, options?: SendMessageOptions): Promise<ISentMessage>`

Sends a message to a recipient (user or group).

**Parameters:**

- `recipient`: Phone number (`"+33111111111"`) or group ID
- `message`: Text message content
- `options`: Additional message options

**Options:**

- `attachments?: string[]`: File paths to attach
- `expiresInSeconds?: number`: Disappearing message timer
- `isViewOnce?: boolean`: View-once message flag

```javascript
// Simple text message
await signal.sendMessage("+33000000000", "Hello!");

// With attachments
await signal.sendMessage("+33000000000", "Here are some files:", {
  attachments: ["./file.pdf", "./image.jpg"],
});
```

#### `sendReaction(target: IMessage, emoji: string): Promise<ISentMessage>`

Sends a reaction to a specific message.

```javascript
// Send a thumbs up reaction
await signal.sendReaction(receivedMessage, "👍");
```

#### `sendTyping(recipient: string, stop?: boolean): Promise<void>`

Sends a typing indicator to a recipient.

```javascript
// Start typing indicator
await signal.sendTyping(recipient);

// Stop typing indicator
await signal.sendTyping(recipient, true);
```

#### `remoteDelete(target: IMessage): Promise<void>`

Deletes a sent message remotely.

```javascript
await signal.remoteDelete(messageToDelete);
```

### Group Management

#### `createGroup(name: string, members: string[], avatar?: string): Promise<IGroup>`

Creates a new Signal group.

```javascript
const group = await signal.createGroup("My Group", [
  "+33000000000",
  "+33200000000",
  "./group-avatar.png",
]);

console.log("Group ID:", group.groupId);
console.log("Group Name:", group.name);
```

#### `updateGroup(groupId: string, options: UpdateGroupOptions): Promise<void>`

Updates group settings and membership.

**Options:**

- `name?: string`: New group name
- `description?: string`: Group description
- `avatar?: string`: Path to avatar image
- `addMembers?: string[]`: Members to add
- `removeMembers?: string[]`: Members to remove
- `promoteAdmins?: string[]`: Promote to admin
- `demoteAdmins?: string[]`: Demote from admin
- `banMembers?: string[]`: Ban members
- `unbanMembers?: string[]`: Unban members
- `permissionAddMember?: 'EVERY_MEMBER' | 'ONLY_ADMINS'`
- `permissionEditDetails?: 'EVERY_MEMBER' | 'ONLY_ADMINS'`
- `permissionSendMessage?: 'EVERY_MEMBER' | 'ONLY_ADMINS'`
- `announcementsOnly?: boolean`
- `expirationTimer?: number`: Message expiration in seconds
- `resetInviteLink?: boolean`

```javascript
await signal.updateGroup("groupId123", {
  name: "Updated Group Name",
  description: "New description",
  addMembers: ["+3370000000"],
  promoteAdmins: ["+33000000000"],
  permissionSendMessage: "ONLY_ADMINS",
  expirationTimer: 3600,
});
```

#### `listGroups(): Promise<IGroup[]>`

Lists all groups.

```javascript
const groups = await signal.listGroups();
console.log(groups);
```

#### `joinGroup(groupUri: string): Promise<void>`

Joins a group via invite link.

```javascript
await signal.joinGroup("https://signal.group/#Cj...1234");
```

#### `quitGroup(groupId: string): Promise<void>`

Leaves a group.

```javascript
await signal.quitGroup("group-id-123");
```

#### `addGroupMember(groupId: string, member: string): Promise<void>`

Adds a member to a group.

```javascript
await signal.addGroupMember("group-id-123", "+33300000000");
```

#### `removeGroupMember(groupId: string, member: string): Promise<void>`

Removes a member from a group.

```javascript
await signal.removeGroupMember("group-id-123", "+33300000000");
```

### Contact Management

#### `listContacts(): Promise<IContact[]>`

Lists all contacts.

```javascript
const contacts = await signal.listContacts();
console.log(contacts);
```

#### `updateContact(contactId: string, name: string): Promise<void>`

Updates a contact's name.

```javascript
await signal.updateContact("+33000000000", "New Contact Name");
```

#### `block(contactId: string): Promise<void>`

Blocks a contact.

```javascript
await signal.block("+33000000000");
```

#### `unblock(contactId: string): Promise<void>`

Unblocks a contact.

```javascript
await signal.unblock("+33000000000");
```

### Profile Management

#### `updateProfile(name: string, avatar?: string): Promise<void>`

Updates the current user's profile.

```javascript
await signal.updateProfile("My New Profile Name", "./avatar.jpg");
```

---

## SignalBot Class

A high-level framework for building Signal bots with command handling, admin controls, and more.

### Constructor

```typescript
new SignalBot(options: BotOptions)
```

**Parameters:**

- `options.phoneNumber`: Your Signal phone number (required)
- `options.admins`: Array of admin phone numbers (required)
- `options.group`: Group configuration (optional)
- `options.settings`: Bot behavior settings (optional)

**Example:**

```javascript
const { SignalBot } = require("signal-sdk");

const bot = new SignalBot({
  phoneNumber: "+33111111111",
  admins: ["+33000000000"],
  group: {
    name: "My Bot Group",
    createIfNotExists: true,
  },
});
```

### Core Methods

#### `start(): Promise<void>`

Starts the bot and connects to Signal.

```javascript
await bot.start();
```

#### `gracefulShutdown(): Promise<void>`

Shuts down the bot and disconnects cleanly.

```javascript
await bot.gracefulShutdown();
```

### Command Management

#### `addCommand(command: ICommand): void`

Adds a new command to the bot.

```javascript
bot.addCommand({
  name: "hello",
  description: "Say hello",
  handler: async (message, args) => {
    return `Hello ${args.join(" ")}!`;
  },
});
```

#### `use(middleware: Middleware): void`

Adds a middleware function to the command processing pipeline.

```javascript
// Log every command
bot.use(async (command, message, next) => {
  console.log(`Executing command: ${command.name}`);
  await next();
});
```

---

## TypeScript Interfaces

The SDK uses a rich set of TypeScript interfaces for type safety and IntelliSense.

### IMessage

Represents a received message.

```typescript
interface IMessage {
  id: string;
  source: string; // Sender's phone number
  body: string;
  timestamp: number;
  isGroup: boolean;
  groupId?: string;
  attachments?: IAttachment[];
}
```

### IGroup

Represents a Signal group.

```typescript
interface IGroup {
  id: string;
  name: string;
  description?: string;
  members: string[];
  isMember: boolean;
  isBlocked: boolean;
}
```

### IContact

Represents a Signal contact.

```typescript
interface IContact {
  id: string; // Phone number
  name?: string;
  isBlocked: boolean;
}
```

... and many more. See `src/interfaces.ts` for a complete list.

---

## Error Handling

The SDK throws custom error classes for better error management.

- `SignalCliError`: General SDK error
- `ConnectionError`: Connection-related issues
- `AuthenticationError`: Registration or verification failures
- `NotFoundError`: Resource not found (e.g., group, contact)

```javascript
try {
  await signal.sendMessage("+1234567890", "Hello");
} catch (error) {
  if (error instanceof NotFoundError) {
    console.error("Recipient not found:", error.message);
  } else {
    console.error("An error occurred:", error);
  }
}
```

---

## Events

Listen to real-time events using an EventEmitter interface.

### SignalCli Events

```javascript
signal.on("message", (message: IMessage) => {
  console.log("New message received:", message.body);
});

signal.on("receipt", (receipt: IReceipt) => {
  console.log("Message receipt updated:", receipt.status);
});
```

**Common Events:**

- `message`: Incoming message
- `receipt`: Message delivery receipt
- `typing`: Typing indicator received
- `log`: Internal SDK log message

### SignalBot Events

```javascript
bot.on("ready", () => {
  console.log("Bot is connected and ready!");
});

bot.on("command", (command: ICommand, message: IMessage) => {
  console.log(`Command executed: ${command.name}`);
});
```

**Common Events:**

- `ready`: Bot is ready
- `command`: A command is executed
- `groupMemberJoined`: A member joins the bot's group
- `error`: An error occurred
