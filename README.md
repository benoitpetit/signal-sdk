# Signal SDK - TypeScript SDK for Signal CLI

A comprehensive TypeScript SDK for interacting with [signal-cli](https://github.com/AsamK/signal-cli), featuring native JSON-RPC communication and a powerful bot framework.

[![npm version](https://badge.fury.io/js/signal-sdk.svg)](https://badge.fury.io/js/signal-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![signal-cli](https://img.shields.io/badge/signal--cli-v0.13.17-blue.svg)](https://github.com/AsamK/signal-cli)

## Features

### Core Capabilities

- **Native JSON-RPC** - Persistent connection with signal-cli for optimal performance
- **100% API Coverage** - All 34 signal-cli methods fully implemented
- **TypeScript Support** - Complete type definitions and IntelliSense
- **Real-time Events** - Asynchronous message reception and notifications
- **Production Ready** - Optimized for high-performance applications

### SignalBot Framework

- **3-line bot setup** - Create powerful bots in minutes
- **Command System** - Built-in command handling with custom prefixes
- **Group Management** - Automatic group creation and configuration
- **Admin Permissions** - Role-based access control
- **File Handling** - Send files, images, and attachments
- **Anti-spam Protection** - Automatic cooldowns and rate limiting

### Advanced Features

- **Device Linking** - Link devices with QR code display (NEW!)
- **Group Operations** - Create, update, manage permissions
- **Contact Management** - Block, unblock, update contacts
- **Device Management** - Link, list, remove devices
- **File Attachments** - Send files, images, and media
- **Message Reactions** - React to messages with emojis
- **Typing Indicators** - Show typing status
- **Read Receipts** - Track message delivery
- **Disappearing Messages** - Auto-delete messages
- **Profile Management** - Update avatars and status

## Quick Start

### Installation

```bash
npm install signal-sdk
```

### Prerequisites

**signal-cli is automatically downloaded and managed by the SDK!**

1.  **Node.js** (version 16 or later)
2.  **Java Runtime Environment** (required by signal-cli)
3.  **Link your device** with the QR code tool:
    ```bash
    node examples/sdk/00-device-linking.js
    ```

[Detailed installation guide](./docs/getting-started.md)

### Link Your Device First

```javascript
const { SignalCli } = require("signal-sdk");

// Link device with QR code
const signal = new SignalCli();
const result = await signal.deviceLink({
  name: "My App Device",
  qrCodeOutput: "console",
});

if (result.success) {
  console.log("Device linked! QR URI:", result.qrCode.uri);
}
```

### Your First Signal App

```javascript
const { SignalCli } = require("signal-sdk");

const signal = new SignalCli(undefined, "+33111111111");

await signal.connect();
await signal.sendMessage("+33000000000", "Hello from Signal SDK!");
await signal.gracefulShutdown();
```

### Your First Signal Bot

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

bot.addCommand({
  name: "hello",
  description: "Say hello",
  handler: async (message, args) => {
    return `Hello ${args.join(" ")}!`;
  },
});

bot.on("ready", () => console.log("Bot is ready!"));
await bot.start();
```

**That's it!** Your bot is now running with:

- Command system (`/help`, `/hello`, `/ping`)
- Admin permissions
- Auto-group creation
- Error handling
- Anti-spam protection

## Documentation

### Getting Started

- [Installation & Setup](./docs/getting-started.md)
- [Quick Start Guide](./docs/getting-started.md#quick-start)
- [Configuration](./docs/getting-started.md#configuration)

### API Reference

- [SignalCli Class](./docs/api-reference.md#signalcli)
- [SignalBot Class](./docs/api-reference.md#signalbot)
- [TypeScript Interfaces](./docs/api-reference.md#interfaces)

### Examples

- [Device Linking](./examples/sdk/00-device-linking.js) **← START HERE!**
- [Basic SDK Usage](./examples/sdk/01-basic-usage.js)
- [Quick Start](./examples/sdk/02-quick-start.js)
- [Group Management](./examples/sdk/03-group-management.js)
- [Contact Management](./examples/sdk/04-contact-management.js)
- [File Handling](./examples/sdk/05-file-handling.js)
- [Minimal Bot](./examples/bot/01-minimal-bot.js)
- [Advanced Bot](./examples/bot/02-advanced-bot.js)

### Advanced Topics

- [Advanced Features](./docs/advanced-features.md)
- [SignalBot Framework](./docs/signalbot-framework.md)
- [Troubleshooting](./docs/troubleshooting.md)

## Common Use Cases

### Send Messages

```javascript
const { SignalCli } = require("signal-sdk");
const signal = new SignalCli(undefined, "+33111111111");

await signal.connect();
await signal.sendMessage("+33000000000", "Hello World!");
```

### Send Files

```javascript
await signal.sendMessage("+33000000000", "Here is a file:", {
  attachments: ["document.pdf", "image.jpg"],
});
```

### Create Groups

```javascript
const group = await signal.createGroup("My Group", ["+33000000000"]);
await signal.sendMessage(group.groupId, "Welcome to the group!");
```

### Bot with Commands

```javascript
const bot = new SignalBot({
  phoneNumber: "+33111111111",
  admins: ["+33000000000"],
});

bot.addCommand({
  name: "weather",
  description: "Get weather info",
  handler: async (message, args) => {
    const city = args.join(" ") || "Paris";
    return `Weather in ${city}: 22°C, sunny`;
  },
});
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
git clone https://github.com/signal-sdk/signal-sdk.git
cd signal-sdk

# Install dependencies
npm install

# Build the project
npm run build

# Run examples
npm run build && node examples/sdk/01-basic-usage.js
```

## Configuration

### Environment Variables

Create a `.env` file in your project root:

```env
SIGNAL_PHONE_NUMBER="+33111111111"
SIGNAL_ADMIN_NUMBER="+33000000000"
SIGNAL_RECIPIENT_NUMBER="+33000000000"
SIGNAL_GROUP_NAME="My Bot Group"
```

### SignalCli Options

```javascript
const signal = new SignalCli(configPath, phoneNumber);
// configPath: Path to signal-cli config (optional)
// phoneNumber: Your Signal phone number (required)
```

### SignalBot Options

```javascript
const bot = new SignalBot({
  phoneNumber: "+33111111111", // Required
  admins: ["+33000000000"], // Required
  group: {
    // Optional
    name: "My Bot Group",
    description: "Bot description",
    createIfNotExists: true,
    avatar: "https://example.com/avatar.jpg",
  },
  settings: {
    // Optional
    commandPrefix: "/",
    autoReact: true,
    logMessages: true,
    welcomeNewMembers: true,
    cooldownSeconds: 2,
  },
});
```

## Troubleshooting

### Common Issues

1.  **Java not found**

```bash
# Install Java (required by signal-cli)
# Ubuntu/Debian
sudo apt update && sudo apt install default-jre

# macOS with Homebrew
brew install openjdk
```

2. **Device not linked**

   ```bash
   # Link your device with QR code
   node examples/sdk/00-device-linking.js
   ```

3. **Permission denied**

   ```bash
   chmod -R 755 ~/.local/share/signal-cli/
   ```

4. **Connection timeout**
   ```bash
   # Test signal-cli directly
   signal-cli -a +33111111111 send +33000000000 "Test"
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
- **Issues**: [GitHub Issues](https://github.com/signal-sdk/signal-sdk/issues)
- **Discussions**: [GitHub Discussions](https://github.com/signal-sdk/signal-sdk/discussions)

---

**Happy coding with Signal SDK!**

---

## API Coverage

**100% Compatible** with signal-cli v0.13.17 (34/34 methods)

| Category               | Methods                                                              | Status |
| ---------------------- | -------------------------------------------------------------------- | ------ |
| **Core Messaging**     | `send`, `sendReaction`, `sendTyping`, `remoteDelete`                 |        |
| **Group Management**   | `createGroup`, `updateGroup`, `listGroups`, `quitGroup`, `joinGroup` |        |
| **Contact Management** | `listContacts`, `updateContact`, `block`, `unblock`                  |        |
| **Device Management**  | `link`, `listDevices`, `removeDevice`, `addDevice`                   |        |
| **Account Management** | `register`, `verify`, `updateProfile`, `updateConfiguration`         |        |
| **Advanced Features**  | `sendSticker`, `sendReceipt`, `sendPaymentNotification`              |        |

[Complete feature mapping](./docs/api-reference.md)
