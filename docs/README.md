# Signal SDK Documentation

Welcome to the complete documentation for the Signal SDK - a comprehensive TypeScript SDK for Signal CLI with native JSON-RPC support.

## Quick Navigation

### Getting Started

- [Installation & Setup](./installation.md) - Install the SDK and dependencies
- [Device Linking](./device-linking.md) - **Required first step** - Link your device with QR code
- [Getting Started](./getting-started.md) - Your first Signal app in minutes

### API Documentation

- [Complete API Reference](./api-reference.md) - Full SignalCli and SignalBot API documentation
- [Examples Guide](./examples-guide.md) - Walkthrough of all examples with explanations

### Framework Guides

- [SignalBot Framework](./signalbot-framework.md) - Build powerful bots with minimal code
- [Advanced Features](./advanced-features.md) - Polls, attachments, account management
- [Robust Infrastructure](./robust-infrastructure.md) - Error handling, retry, rate limiting, logging

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
- **[Advanced Features](./advanced-features.md)** - Polls, attachments, account management
- **[Robust Infrastructure](./robust-infrastructure.md)** - Enterprise-grade reliability

### New Features ✨

**Phases 1-6 Complete** (298 tests passing, 60.21% coverage)

#### Advanced Messaging

- **Text styling** - Bold, italic, strikethrough, monospace, spoiler
- **Mentions** - @tag users in messages
- **Quotes** - Reply to specific messages with context
- **Edit messages** - Correct previously sent messages
- **Link previews** - Rich URL previews
- **Story replies** - Respond to stories
- **Advanced receive()** - Timeout, maxMessages, ignoreAttachments, ignoreStories, sendReadReceipts

#### Identity & Security

- **Safety numbers** - Get and verify safety numbers
- **Identity verification** - Verify contact identities
- **Untrusted identities** - List identities that need verification

#### Username Management

- **Set username** - Create Signal username for privacy
- **Username links** - Share username without phone number
- **Delete username** - Remove username anytime

#### Multi-Account Management

- **MultiAccountManager** - Manage multiple Signal accounts simultaneously
- **Event routing** - Automatic event forwarding per account
- **Account isolation** - Independent connections and operations

#### Enhanced Parsing

- **Contact profiles** - Parse givenName, familyName, mobileCoinAddress
- **Group details** - Parse pendingMembers, bannedMembers, inviteLink
- **Helper methods** - getContactsWithProfiles(), getGroupsWithDetails()

#### Advanced Group Features

- **Group invite links** - Generate and manage invite links
- **Banned members** - Set and manage banned members list
- **Reset links** - Invalidate and regenerate invite links

#### Daemon Modes

- **Unix socket** - Connect via Unix socket
- **TCP** - Connect to remote daemon via TCP
- **HTTP** - REST API connection mode
- **JSON-RPC STDIO** - Default high-performance mode

#### Foundation Features

- **Poll support** - Create, vote, and terminate polls in conversations
- **Attachment management** - Retrieve attachments, avatars, stickers by ID
- **Account management** - Update profile, settings, and account details
- **Contact export** - Send and backup contact lists
- **Enhanced group info** - Detailed group information with permissions
- **Retry mechanism** - Exponential backoff for transient failures
- **Rate limiting** - Client-side rate limiting to prevent API throttling
- **Input validation** - Comprehensive validation for all operations
- **Structured logging** - Professional logging system with levels
- **Configuration** - Centralized configuration management

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
| **JSON-RPC**            |    Yes    |    Yes    | Native, high-performance communication         |
| **Device Linking**      |    Yes    |    Yes    | QR code device linking                         |
| **Messaging**           |    Yes    |    Yes    | Send/receive messages, reactions, typing       |
| **Advanced Messaging**  |    Yes    |    Yes    | Text styling, mentions, quotes, edits ✨       |
| **Identity Security**   |    Yes    |    Yes    | Safety numbers, verification ✨                |
| **Username Management** |    Yes    |    Yes    | Set/delete username, links ✨                  |
| **Multi-Account**       |    Yes    |    No     | Manage multiple accounts simultaneously ✨     |
| **Enhanced Parsing**    |    Yes    |    Yes    | Detailed profiles & groups ✨                  |
| **Group Management**    |    Yes    |    Yes    | Create, update, manage groups                  |
| **Advanced Groups**     |    Yes    |    Yes    | Invite links, banned members ✨                |
| **Contact Management**  |    Yes    |    Yes    | List, update, block/unblock contacts           |
| **File Attachments**    |    Yes    |    Yes    | Send files, images, and other media            |
| **Polls**               |    Yes    |    Yes    | Create, vote, terminate polls                  |
| **Daemon Modes**        |    Yes    |    Yes    | Unix socket, TCP, HTTP ✨                      |
| **Command System**      |    No     |    Yes    | Built-in command handling with prefixes        |
| **Admin Permissions**   |    No     |    Yes    | Role-based access control                      |
| **Auto Group Creation** |    No     |    Yes    | Automatically create and configure a bot group |
| **Anti-Spam**           |    No     |    Yes    | Rate limiting and spam protection              |

✨ = New in Phases 1-6

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
