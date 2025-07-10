# Signal SDK Documentation

Welcome to the complete documentation for the Signal SDK - a comprehensive TypeScript SDK for Signal CLI with native JSON-RPC support.

## Quick Navigation

### Getting Started

- [Installation & Setup](./installation.md) - Install the SDK and dependencies
- [Device Linking](./device-linking.md) - **Required first step** - Link your device with QR code
- [Getting Started](./getting-started.md) - Your first Signal app in minutes

### API Documentation

- [Complete API Reference](./api-reference.md) - Full SignalCli and SignalBot API documentation
- [CLI Reference](./cli-reference.md) - Command-line interface documentation
- [Examples Guide](./examples-guide.md) - Walkthrough of all examples with explanations

### Framework Guides

- [SignalBot Framework](./signalbot-framework.md) - Build powerful bots with minimal code
- [Advanced Features](./advanced-features.md) - Advanced SDK features and techniques

### Support

- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
- [FAQ](./faq.md) - Frequently asked questions

---

## What's in This Documentation

This documentation covers everything you need to know about the Signal SDK:

### For Beginners

Start here if you're new to the Signal SDK:

1. **[Installation](./installation.md)** - Get the SDK installed and ready
2. **[Device Linking](./device-linking.md)** - Connect your Signal account (mandatory)
3. **[Getting Started](./getting-started.md)** - Send your first message
4. **[Examples Guide](./examples-guide.md)** - Learn from practical examples

### For Developers

Dive deeper into the SDK capabilities:

- **[API Reference](./api-reference.md)** - Complete method documentation
- **[SignalBot Framework](./signalbot-framework.md)** - Build interactive bots
- **[Advanced Features](./advanced-features.md)** - Power user techniques

### For Troubleshooting

When things don't work as expected:

- **[Troubleshooting Guide](./troubleshooting.md)** - Common issues and fixes
- **[FAQ](./faq.md)** - Quick answers to common questions

---

## Quick Start Path

**Never used the Signal SDK?** Follow this path:

```
1. Install SDK → 2. Link Device → 3. Send Message → 4. Build Bot
     ↓               ↓               ↓               ↓
[Installation] → [Device Linking] → [Getting Started] → [Examples]
```

### 30-Second Quick Start

```bash
# 1. Install
npm install signal-sdk

# 2. Link device (mandatory first step)
npx signal-sdk connect

# 3. Set your phone number
echo 'SIGNAL_PHONE_NUMBER="+33111111111"' > .env

# 4. Send your first message
node examples/sdk/01-basic-usage.js
```

---

## SDK Overview

The Signal SDK provides two main classes:

### SignalCli - Core Messaging

```javascript
const { SignalCli } = require("signal-sdk");
const signal = new SignalCli("+33111111111");

await signal.connect();
await signal.sendMessage("+33000000000", "Hello from Signal SDK!");
await signal.gracefulShutdown();
```

### SignalBot - Interactive Bots

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
  handler: () => "Hello World!",
});

await bot.start();
```

---

## Documentation Structure

The documentation is organized into the following sections:

- **`docs/`**: Contains all documentation files.

  - **`installation.md`**: Step-by-step installation guide.
  - **`device-linking.md`**: QR code linking process.
  - **`getting-started.md`**: Quick start and basic usage.
  - **`api-reference.md`**: Complete API for all classes and methods.
  - **`examples-guide.md`**: Detailed walkthrough of all examples.
  - **`signalbot-framework.md`**: In-depth guide to the bot framework.
  - **`advanced-features.md`**: Advanced topics and techniques.
  - **`troubleshooting.md`**: Solutions to common problems.
  - **`faq.md`**: Frequently asked questions.
  - **`README.md`**: This file, the main entry point.

- **`examples/`**: Contains ready-to-run examples.
  - **`sdk/`**: Core SDK examples.
  - **`bot/`**: SignalBot framework examples.

---

## Key Features

| Feature                 | SignalCli | SignalBot | Description                                    |
| ----------------------- | :-------: | :-------: | ---------------------------------------------- |
| **JSON-RPC**            |    ✅     |    ✅     | Native, high-performance communication         |
| **Device Linking**      |    ✅     |    ✅     | QR code device linking                         |
| **Messaging**           |    ✅     |    ✅     | Send/receive messages, reactions, typing       |
| **Group Management**    |    ✅     |    ✅     | Create, update, manage groups                  |
| **Contact Management**  |    ✅     |    ✅     | List, update, block/unblock contacts           |
| **File Attachments**    |    ✅     |    ✅     | Send files, images, and other media            |
| **Command System**      |    ❌     |    ✅     | Built-in command handling with prefixes        |
| **Admin Permissions**   |    ❌     |    ✅     | Role-based access control                      |
| **Auto Group Creation** |    ❌     |    ✅     | Automatically create and configure a bot group |
| **Anti-Spam**           |    ❌     |    ✅     | Rate limiting and spam protection              |

---

## How to Contribute

We welcome contributions to the documentation!

1.  **Fork the repository.**
2.  **Make your changes** in the `docs/` directory.
3.  **Follow the existing style** and formatting.
4.  **Submit a pull request.**

Your contributions help make the Signal SDK better for everyone.

---

Happy coding!
