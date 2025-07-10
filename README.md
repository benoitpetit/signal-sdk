# Signal CLI SDK - TypeScript Wrapper for Signal CLI

A comprehensive TypeScript SDK for interacting with [signal-cli](https://github.com/AsamK/signal-cli), providing JSON-RPC communication and a powerful bot framework.

[![npm version](https://badge.fury.io/js/signal-sdk.svg)](https://badge.fury.io/js/signal-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![signal-cli](https://img.shields.io/badge/signal--cli-v0.13.17-blue.svg)](https://github.com/AsamK/signal-cli)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)

## Features

### Core Capabilities

- **JSON-RPC Communication** - Direct communication with signal-cli daemon via JSON-RPC
- **TypeScript Support** - Complete type definitions with full IntelliSense support
- **Message Management** - Send, receive, and manage Signal messages
- **Real-time Events** - Listen to incoming messages and notifications
- **Production Ready** - Robust error handling and connection management

### SignalBot Framework

- **Simple Bot Creation** - Create powerful bots with minimal setup
- **Command System** - Built-in command parsing and routing
- **Event Handling** - React to messages, group events, and user actions
- **Admin Controls** - Role-based permissions and access control
- **Group Management** - Automated group creation and member management
- **Extensible** - Plugin-style architecture for custom functionality

### Advanced Features

- **File Attachments** - Send and receive files, images, and media
- **Group Operations** - Create, manage, and configure groups
- **Contact Management** - Add, update, remove, and manage contacts
- **Message Reactions** - React to messages with emoji reactions
- **Typing Indicators** - Send and receive typing notifications
- **Read Receipts** - Track message delivery and read status
- **Profile Management** - Update profile information and avatars
- **Payment Notifications** - Send payment receipts and notifications
- **Custom Sticker Packs** - Upload and manage custom sticker packs
- **User Status Checking** - Verify Signal registration status
- **Rate Limit Recovery** - Handle and recover from rate limiting
- **Phone Number Changes** - Change registered phone numbers
- **Progress Tracking** - Monitor upload progress for large files

## Quick Start

### Installation

```bash
npm install
```

### Prerequisites

1. **Node.js** (version 16 or later)
2. **Java Runtime Environment** (required by signal-cli)
3. **signal-cli** - Download and setup instructions available in [installation guide](./docs/installation.md)

[Detailed installation guide](./docs/installation.md)

### Device Linking

Before using the SDK, you need to link a device to your Signal account:

```bash
# Using npx (recommended)
npx signal-sdk connect

# Or with a custom device name
npx signal-sdk connect "My Bot Device"

# Or using npm script after installation
cd node_modules/signal-sdk
npm run connect
```

This command will:
1. 🔗 Generate a QR code in your terminal
2. 📱 Display instructions for scanning with your Signal app
3. ✅ Complete the device linking process

**Note:** You only need to do this once per device. After linking, your device will be permanently connected to your Signal account.

### Basic Usage

```javascript
const { SignalCli } = require("signal-sdk");

// Initialize SignalCli with phone number
const signal = new SignalCli(undefined, "+1234567890");

// Connect to signal-cli daemon
await signal.connect();

// Send a message
await signal.sendMessage("+0987654321", "Hello from Signal CLI SDK!");

// Listen for incoming messages
signal.on("message", (message) => {
  console.log("Received message:", message.envelope.dataMessage.message);
});

// Graceful shutdown
await signal.gracefulShutdown();
```

### Create a Bot

```javascript
const { SignalBot } = require("signal-sdk");

// Initialize bot with configuration
const bot = new SignalBot({
  phoneNumber: "+1234567890",
  admins: ["+0987654321"],
  group: {
    name: "My Bot Group",
    description: "A group managed by my bot",
    createIfNotExists: true,
  },
});

// Add custom commands
bot.addCommand({
  name: "hello",
  description: "Greet the user",
  handler: async (message, args) => {
    const name = args.join(" ") || "friend";
    return `Hello ${name}! How can I help you today?`;
  },
});

// Handle events
bot.on("ready", () => {
  console.log("Bot is ready and listening for messages!");
});

bot.on("message", (message) => {
  console.log(`Received: ${message.text} from ${message.sender}`);
});

// Start the bot
await bot.start();
```

Your bot will automatically:

- Handle command parsing (default prefix: `/`)
- Provide built-in commands (`/help`, `/ping`)
- Manage group creation and membership
- Enforce admin permissions
- Handle errors gracefully

## Documentation

### Getting Started

- [Installation & Setup](./docs/installation.md)
- [Getting Started Guide](./docs/getting-started.md)
- [Device Linking](./docs/device-linking.md)

### API Reference

- [SignalCli Class](./docs/api-reference.md#signalcli)
- [SignalBot Class](./docs/api-reference.md#signalbot)
- [TypeScript Interfaces](./docs/api-reference.md#interfaces)

### Examples

- [Device Linking](./examples/sdk/00-device-linking.js) - Link your device to Signal
- [Basic SDK Usage](./examples/sdk/01-basic-usage.js) - Simple message sending
- [Quick Start](./examples/sdk/02-quick-start.js) - Complete getting started example
- [Group Management](./examples/sdk/03-group-management.js) - Create and manage groups
- [Contact Management](./examples/sdk/04-contact-management.js) - Handle contacts
- [File Handling](./examples/sdk/05-file-handling.js) - Send and receive files
- [Minimal Bot](./examples/bot/01-minimal-bot.js) - Simple bot implementation
- [Advanced Bot](./examples/bot/02-advanced-bot.js) - Full-featured bot example

### Advanced Topics

- [Advanced Features](./docs/advanced-features.md)
- [SignalBot Framework](./docs/signalbot-framework.md)
- [Feature Coverage Analysis](./FEATURE_COVERAGE.md)
- [Implementation Plan](./IMPLEMENTATION_PLAN.md)
- [FAQ](./docs/faq.md)
- [Troubleshooting](./docs/troubleshooting.md)

## Common Use Cases

### Send Messages

```javascript
const { SignalCli } = require("signal-sdk");
const signal = new SignalCli(undefined, "+1234567890");

await signal.connect();
await signal.sendMessage("+0987654321", "Hello World!");
await signal.gracefulShutdown();
```

### Send Files

```javascript
// Send file with message
await signal.sendMessage("+0987654321", "Here's the document:", {
  attachments: ["./path/to/document.pdf"],
});

// Send multiple files
await signal.sendMessage("+0987654321", "Photos from today:", {
  attachments: ["./photo1.jpg", "./photo2.jpg"],
});
```

### Group Management

```javascript
// Create a new group
const group = await signal.createGroup("My Group", [
  "+0987654321",
  "+1122334455",
]);
console.log("Group ID:", group.groupId);

// Send message to group
await signal.sendMessage(group.groupId, "Welcome to the group!");

// Update group info
await signal.updateGroup(group.groupId, {
  title: "Updated Group Name",
  description: "This is our group chat",
});
```

### Bot with Custom Commands

```javascript
const { SignalBot } = require("signal-sdk");

const bot = new SignalBot({
  phoneNumber: "+1234567890",
  admins: ["+0987654321"],
});

// Add weather command
bot.addCommand({
  name: "weather",
  description: "Get weather information",
  handler: async (message, args) => {
    const city = args.join(" ") || "New York";
    // Integrate with weather API
    return `Weather in ${city}: 22°C, sunny`;
  },
});

// Add custom event handler
bot.on("groupMemberJoined", async (event) => {
  await bot.sendMessage(event.groupId, `Welcome ${event.member.name}!`);
});

await bot.start();
```

## Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --testNamePattern="SignalCli"

# Run with coverage
npm run test:coverage
```

## Development

```bash
# Clone the repository
git clone https://github.com/your-username/signal-cli-sdk.git
cd signal-cli-sdk

# Install dependencies
npm install

# Build the project
npm run build

# Run examples
npm run build && node examples/sdk/01-basic-usage.js

# Run tests
npm test
```

## Configuration

### Environment Variables

Create a `.env` file in your project root:

```env
SIGNAL_PHONE_NUMBER="+1234567890"
SIGNAL_ADMIN_NUMBER="+0987654321"
SIGNAL_RECIPIENT_NUMBER="+1122334455"
SIGNAL_GROUP_NAME="My Bot Group"
```

### SignalCli Configuration

```javascript
const { SignalCli } = require("signal-sdk");

// Basic configuration
const signal = new SignalCli(configPath, phoneNumber);
// configPath: Path to signal-cli config directory (optional)
// phoneNumber: Your registered Signal phone number (required)

// Example with custom config path
const signal = new SignalCli("/custom/signal-cli/config", "+1234567890");
```

### SignalBot Configuration

```javascript
const { SignalBot } = require("signal-sdk");

const bot = new SignalBot({
  phoneNumber: "+1234567890", // Required: Your Signal phone number
  admins: ["+0987654321"], // Required: Admin phone numbers
  group: {
    name: "My Bot Group", // Group name
    description: "Managed by my bot", // Group description
    createIfNotExists: true, // Create group if it doesn't exist
    avatar: "./group-avatar.jpg", // Group avatar image
  },
  settings: {
    commandPrefix: "/", // Command prefix (default: "/")
    logMessages: true, // Log incoming messages (default: false)
    welcomeNewMembers: true, // Welcome message for new members
    cooldownSeconds: 2, // Command cooldown in seconds
  },
});
```

## Troubleshooting

### Common Issues

1. **signal-cli not found**

   ```bash
   # Make sure signal-cli is installed and in your PATH
   # Download from: https://github.com/AsamK/signal-cli/releases
   signal-cli --version
   ```

2. **Java not installed**

   ```bash
   # Install Java (required by signal-cli)
   # Ubuntu/Debian
   sudo apt update && sudo apt install default-jre

   # macOS with Homebrew
   brew install openjdk

   # Windows: Download from Oracle or use package manager
   ```

3. **Phone number not registered**

   ```bash
   # Register your phone number with Signal first
   signal-cli -a +1234567890 register
   signal-cli -a +1234567890 verify CODE_FROM_SMS
   ```

4. **Connection timeout**

   ```bash
   # Test signal-cli directly
   signal-cli -a +1234567890 send +0987654321 "Test message"
   ```

5. **Permission denied on config directory**
   ```bash
   # Fix permissions on signal-cli config directory
   chmod -R 755 ~/.local/share/signal-cli/
   ```

[Complete troubleshooting guide](./docs/troubleshooting.md)

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Acknowledgments

- [signal-cli](https://github.com/AsamK/signal-cli) - The underlying Signal CLI client
- [Signal Protocol](https://signal.org/docs/) - The Signal messaging protocol
- The Signal community for their excellent work

## Support

- **Documentation**: [docs/](./docs/)
- **Examples**: [examples/](./examples/)
- **Issues**: Report bugs and request features
- **Contributing**: See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

**Built with TypeScript for the Signal community**

---

## Development Status

### Current Coverage: 39/39 signal-cli commands (100%) ✅

The SDK now provides **complete feature parity** with signal-cli, implementing all available commands and functionality.

**Latest Updates:**

- ✅ **Contact Management**: Complete removal with options (hide/forget)
- ✅ **User Status**: Check Signal registration status
- ✅ **Payment Notifications**: Send payment receipts and notes
- ✅ **Custom Stickers**: Upload and manage sticker packs
- ✅ **Rate Limit Recovery**: Handle rate limiting with captcha challenges
- ✅ **Phone Number Changes**: Change registered phone numbers
- ✅ **Enhanced Messaging**: Progress tracking for large file uploads

[**View Complete Feature Coverage Analysis →**](./FEATURE_COVERAGE.md)  
[**View Implementation Details →**](./IMPLEMENTATION_PLAN.md)

---

## API Methods

Compatible with signal-cli v0.13.17 - **100% Feature Coverage**

| Category      | Method                     | Description                        | Status |
| ------------- | -------------------------- | ---------------------------------- | ------ |
| **Messaging** | `send`                     | Send text messages and attachments | ✅     |
|               | `sendReaction`             | React to messages with emoji       | ✅     |
|               | `sendTyping`               | Send typing indicators             | ✅     |
|               | `sendReceipt`              | Send read receipts                 | ✅     |
|               | `sendPaymentNotification`  | Send payment notifications         | ✅     |
| **Groups**    | `createGroup`              | Create new groups                  | ✅     |
|               | `updateGroup`              | Update group settings              | ✅     |
|               | `listGroups`               | List all groups                    | ✅     |
|               | `quitGroup`                | Leave a group                      | ✅     |
| **Contacts**  | `listContacts`             | List all contacts                  | ✅     |
|               | `updateContact`            | Update contact information         | ✅     |
|               | `removeContact`            | Remove contacts with options       | ✅     |
|               | `block` / `unblock`        | Block/unblock contacts             | ✅     |
|               | `getUserStatus`            | Check registration status          | ✅     |
| **Stickers**  | `listStickerPacks`         | List sticker packs                 | ✅     |
|               | `addStickerPack`           | Install sticker packs              | ✅     |
|               | `uploadStickerPack`        | Upload custom sticker packs        | ✅     |
| **Advanced**  | `submitRateLimitChallenge` | Handle rate limiting               | ✅     |
|               | `startChangeNumber`        | Start phone number change          | ✅     |
|               | `finishChangeNumber`       | Complete phone number change       | ✅     |
|               | `sendMessageWithProgress`  | Enhanced messaging with progress   | ✅     |

[Complete API documentation](./docs/api-reference.md)
