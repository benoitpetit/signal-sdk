# Signal SDK - TypeScript SDK for Signal Messenger

  <div align="center">
    <img src="logo.png" alt="Signal SDK Logo" width="200"/>
  </div>

  <div align="center">
    <p>
      A comprehensive TypeScript SDK for interacting with 
      <a href="https://github.com/AsamK/signal-cli" target="_blank">signal-cli</a>
      <br>
      providing JSON-RPC communication and a powerful bot framework.
    </p>

[![npm version](https://badge.fury.io/js/signal-sdk.svg)](https://badge.fury.io/js/signal-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![signal-cli](https://img.shields.io/badge/signal--cli-v0.13.22-blue.svg)](https://github.com/AsamK/signal-cli)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/tests-225%20passing-brightgreen.svg)](./src/__tests__)
[![Coverage](https://img.shields.io/badge/coverage-57.52%25-yellow.svg)](./src/__tests__)
[![Donate on Liberapay](https://img.shields.io/badge/Liberapay-Donate-yellow.svg)](https://liberapay.com/devbyben/donate)

  </div>

## Features

### Core Capabilities

- **JSON-RPC Communication** - Direct communication with signal-cli daemon
- **TypeScript Support** - Complete type definitions with IntelliSense
- **Message Management** - Send, receive, and manage Signal messages
- **Real-time Events** - Event-driven architecture for incoming messages
- **Enterprise-Grade** - Robust error handling and retry logic
- **Type-Safe Validation** - Comprehensive input validation
- **Retry Mechanism** - Exponential backoff with configurable policies
- **Structured Logging** - Multi-level logging system
- **Configuration Management** - Centralized configuration with validation

### SignalBot Framework

- **Simple Bot Creation** - Create powerful bots with minimal setup
- **Command System** - Built-in command parsing and routing
- **Event Handling** - React to messages, group events, and user actions
- **Admin Controls** - Role-based permissions and access control
- **Group Management** - Automated group creation and member management
- **Extensible** - Plugin-style architecture for custom functionality

### Advanced Features

- **File Attachments** - Send and receive files, images, and media
- **Group Operations** - Create and manage groups with detailed information
- **Contact Management** - Manage contacts with export/import capabilities
- **Message Reactions** - React to messages with emoji
- **Typing Indicators** - Send and receive typing notifications
- **Read Receipts** - Track message delivery and read status
- **Profile Management** - Update profile information and avatars
- **Payment Notifications** - Send payment notifications
- **Sticker Packs** - Upload and manage custom sticker packs
- **User Status** - Verify Signal registration status
- **Rate Limiting** - Handle and recover from rate limits
- **Phone Number Changes** - Change registered phone numbers
- **Progress Tracking** - Monitor upload progress
- **Polls** - Create, vote, and terminate polls
- **Attachment Retrieval** - Retrieve attachments, avatars, and stickers
- **Account Management** - Update account settings
- **Stories** - View and interact with Signal stories
- **Group Information** - Retrieve detailed group permissions

## Quick Start

### Installation

```bash
npm install signal-sdk
```

### Prerequisites

1. **Node.js** (version 18 or later)
2. **Java Runtime Environment** (required by signal-cli)

**Note:** signal-cli binaries are included with the SDK - no separate installation required.

[Detailed installation guide](./docs/installation.md)

### CLI Commands

The SDK includes a command-line interface for common operations:

```bash
# View all available commands
npx signal-sdk --help

# Link a new device to your Signal account
npx signal-sdk connect

# Link with a custom device name
npx signal-sdk connect "My Custom Device Name"
```

### Device Linking

Before using the SDK, you need to link a device to your Signal account:

```bash
# Using npx (recommended)
npx signal-sdk connect

# Or with a custom device name
npx signal-sdk connect "My Bot Device"

# Get help for the CLI
npx signal-sdk --help
```

This command will:

1. Generate a QR code in your terminal
2. Display instructions for scanning with your Signal app
3. Complete the device linking process

**Note:** You only need to do this once per device. After linking, your device will be permanently connected to your Signal account.

### Basic Usage

```javascript
const { SignalCli } = require("signal-sdk");

// Initialize SignalCli with phone number
const signal = new SignalCli("+33111111111");

// Connect to signal-cli daemon
await signal.connect();

// Send a message
await signal.sendMessage("+33222222222", "Hello from Signal SDK!");

// Listen for incoming messages
signal.on("message", (message) => {
  console.log("Received message:", message.envelope.dataMessage.message);
});

// Graceful shutdown
await signal.gracefulShutdown();
```

### Advanced Configuration

```javascript
const { SignalCli, Logger } = require("signal-sdk");

// Configure with advanced settings
const config = {
  retryConfig: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  },
  rateLimiter: {
    maxConcurrent: 5,
    minInterval: 200,
  },
  logger: new Logger("info"),
};

const signal = new SignalCli("+33111111111", undefined, config);

await signal.connect();

// SDK automatically retries on failures, respects rate limits,
// validates inputs, and logs operations
await signal.sendMessage("+33222222222", "Reliable messaging!");
```

### Create a Bot

```javascript
const { SignalBot } = require("signal-sdk");

// Initialize bot with configuration
const bot = new SignalBot({
  phoneNumber: "+33111111111",
  admins: ["+33222222222"],
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
const signal = new SignalCli("+33111111111");

await signal.connect();
await signal.sendMessage("+33222222222", "Hello World!");
await signal.gracefulShutdown();
```

### Send Files

```javascript
// Send file with message
await signal.sendMessage("+33222222222", "Here's the document:", {
  attachments: ["./path/to/document.pdf"],
});

// Send multiple files
await signal.sendMessage("+33222222222", "Photos from today:", {
  attachments: ["./photo1.jpg", "./photo2.jpg"],
});
```

### Group Management

```javascript
// Create a new group
const group = await signal.createGroup("My Group", [
  "+33222222222",
  "+33333333333",
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
  phoneNumber: "+33111111111",
  admins: ["+33222222222"],
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

## Quality & Reliability

### Code Quality

- **TypeScript Strict Mode** - Full type safety with strict compilation
- **Complete Type Coverage** - Type definitions for all APIs
- **Input Validation** - Comprehensive validation throughout
- **Error Handling** - Robust error classes and management
- **Retry Logic** - Exponential backoff with configurable policies
- **Configuration Management** - Validated configuration system

### Enterprise Features

- **Automatic Retries** - Configurable retry policies with exponential backoff
- **Rate Limiting** - Built-in rate limiter to prevent throttling
- **Structured Logging** - Multi-level logging system
- **Input Sanitization** - Automatic sanitization of inputs
- **E.164 Validation** - Strict international phone number validation
- **Connection Management** - Graceful connection handling

### Technical Specifications

- **Node.js**: >=18.0.0
- **TypeScript**: 5.8+ with strict mode
- **Test Coverage**: 225 passing tests across 9 suites
- **Code Coverage**: 57.52% overall, critical modules at 96-100%
- **signal-cli**: Compatible with v0.13.22

## Testing

The SDK has comprehensive test coverage to ensure reliability and quality.

### Test Statistics

- **Total Tests**: 225 passing
- **Test Suites**: 9 suites
- **Overall Coverage**: 57.52%

### Coverage by Module

| Module | Statements | Branches | Functions | Lines | Status |
|--------|-----------|----------|-----------|-------|--------|
| **validators.ts** | 100% | 100% | 100% | 100% | ✅ Perfect |
| **config.ts** | 100% | 97.22% | 100% | 100% | ✅ Excellent |
| **errors.ts** | 100% | 100% | 100% | 100% | ✅ Perfect |
| **retry.ts** | 96.15% | 85.71% | 100% | 97.95% | ✅ Excellent |
| **SignalCli.ts** | 68.68% | 55.46% | 65.9% | 72.7% | ✅ Good |
| **SignalBot.ts** | 24.33% | 16.94% | 29.68% | 24.59% | ⚠️ In Progress |

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --testNamePattern="SignalCli"

# Run with coverage report
npm run test:coverage

# Run tests in watch mode
npm test -- --watch
```

### Test Suites

1. **validators.test.ts** - Input validation (100% coverage)
2. **config.test.ts** - Configuration management (100% coverage)
3. **errors.test.ts** - Error handling (100% coverage)
4. **retry.test.ts** - Retry logic (96% coverage)
5. **SignalCli.test.ts** - Core CLI functionality
6. **SignalCli.integration.test.ts** - Integration scenarios
7. **SignalCli.methods.test.ts** - API methods (31 tests)
8. **SignalBot.test.ts** - Bot framework
9. **SignalBot.additional.test.ts** - Extended bot features

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
SIGNAL_PHONE_NUMBER="+33111111111"
SIGNAL_ADMIN_NUMBER="+33222222222"
SIGNAL_RECIPIENT_NUMBER="+33333333333"
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
const signal = new SignalCli("/custom/signal-cli/config", "+33111111111");
```

### SignalBot Configuration

```javascript
const { SignalBot } = require("signal-sdk");

const bot = new SignalBot({
  phoneNumber: "+33111111111", // Required: Your Signal phone number
  admins: ["+33222222222"], // Required: Admin phone numbers
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
   signal-cli -a +33111111111 register
   signal-cli -a +33111111111 verify CODE_FROM_SMS
   ```

4. **Connection timeout**

   ```bash
   # Test signal-cli directly
   signal-cli -a +33111111111 send +33222222222 "Test message"
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

## API Methods

Compatible with signal-cli v0.13.22 - **100% Feature Coverage**

| Category        | Method                     | Description                        | Status |
| --------------- | -------------------------- | ---------------------------------- | ------ |
| **Messaging**   | `send`                     | Send text messages and attachments | ✅     |
|                 | `sendReaction`             | React to messages with emoji       | ✅     |
|                 | `sendTyping`               | Send typing indicators             | ✅     |
|                 | `sendReceipt`              | Send read receipts                 | ✅     |
|                 | `sendPaymentNotification`  | Send payment notifications         | ✅     |
|                 | `sendPollCreate`           | Create polls in conversations      | ✅     |
|                 | `sendPollVote`             | Vote on existing polls             | ✅     |
|                 | `sendPollTerminate`        | Terminate a poll                   | ✅     |
| **Groups**      | `createGroup`              | Create new groups                  | ✅     |
|                 | `updateGroup`              | Update group settings              | ✅     |
|                 | `listGroups`               | List all groups                    | ✅     |
|                 | `listGroupsDetailed`       | List groups with detailed info     | ✅     |
|                 | `quitGroup`                | Leave a group                      | ✅     |
| **Contacts**    | `listContacts`             | List all contacts                  | ✅     |
|                 | `updateContact`            | Update contact information         | ✅     |
|                 | `removeContact`            | Remove contacts with options       | ✅     |
|                 | `sendContacts`             | Export/send contact data           | ✅     |
|                 | `block` / `unblock`        | Block/unblock contacts             | ✅     |
|                 | `getUserStatus`            | Check registration status          | ✅     |
| **Account**     | `updateAccount`            | Update account settings            | ✅     |
|                 | `listAccountsDetailed`     | List accounts with detailed info   | ✅     |
| **Attachments** | `getAttachment`            | Retrieve attachment by ID          | ✅     |
|                 | `getAvatar`                | Retrieve avatar by ID              | ✅     |
|                 | `getSticker`               | Retrieve sticker by ID             | ✅     |
| **Stickers**    | `listStickerPacks`         | List sticker packs                 | ✅     |
|                 | `addStickerPack`           | Install sticker packs              | ✅     |
|                 | `uploadStickerPack`        | Upload custom sticker packs        | ✅     |
| **Advanced**    | `submitRateLimitChallenge` | Handle rate limiting               | ✅     |
|                 | `startChangeNumber`        | Start phone number change          | ✅     |
|                 | `finishChangeNumber`       | Complete phone number change       | ✅     |
|                 | `sendMessageWithProgress`  | Enhanced messaging with progress   | ✅     |

[Complete API documentation](./docs/api-reference.md)

---

### Support the Project

If you find signal sdk useful, consider supporting its development:

[![Donate on Liberapay](https://img.shields.io/badge/Liberapay-Donate-yellow.svg)](https://liberapay.com/devbyben/donate)

Your support helps maintain and improve signal-sdk

---

Made with ❤️ for the Signal community
