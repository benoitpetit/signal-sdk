# Getting Started

This guide will help you quickly get up and running with the Signal SDK. In just a few minutes, you'll be sending your first Signal message!

## Prerequisites Checklist

Before you begin, ensure you have completed:

- [Node.js installed](./installation.md#system-requirements) (v16+)
- [Java JRE installed](./installation.md#java-installation-by-platform)
- [Signal SDK installed](./installation.md#installation)
- [Device linked with QR code](./device-linking.md) **REQUIRED**

> **Important**: You MUST link your device first using the QR code process. This is mandatory before the SDK can function.

## Quick Setup (30 seconds)

### 1. Link Your Device (One-time setup)

```bash
# Run the CLI device linking command (recommended)
npx signal-sdk connect

# Or use the example script
node examples/sdk/00-device-linking.js

# Get help on available commands
npx signal-sdk --help
```

Follow the on-screen instructions to scan the QR code with your Signal app.

### 2. Set Your Phone Number

```bash
# Create .env file
echo 'SIGNAL_PHONE_NUMBER="+33111111111"' > .env
```

Replace with your actual phone number (the one linked to Signal).

### 3. Send Your First Message

```javascript
// test.js
require("dotenv").config();
const { SignalCli } = require("signal-sdk");

async function sendFirstMessage() {
  const signal = new SignalCli(process.env.SIGNAL_PHONE_NUMBER);

  await signal.connect();
  await signal.sendMessage("+33000000000", "Hello from Signal SDK!");
  await signal.gracefulShutdown();

  console.log("Message sent successfully!");
}

sendFirstMessage().catch(console.error);
```

```bash
node test.js
```

**That's it!** You've sent your first Signal message through the SDK!

## Basic Usage Patterns

### Send Text Messages

```javascript
const { SignalCli } = require("signal-sdk");

const signal = new SignalCli("+33111111111");

await signal.connect();

// Send to individual
await signal.sendMessage("+33000000000", "Hello there!");

// Send to group (after creating/joining group)
await signal.sendMessage("groupId123", "Hello group!");

await signal.gracefulShutdown();
```

### Send Files & Media

```javascript
// Send with attachments
await signal.sendMessage("+33000000000", "Here are some files:", {
  attachments: ["document.pdf", "photo.jpg", "video.mp4"],
});

// Send image with caption
await signal.sendMessage("+33000000000", "Check out this photo!", {
  attachments: ["vacation.jpg"],
});
```

### Receive Messages

```javascript
// Listen for incoming messages
signal.on("message", (message) => {
  console.log(`New message from ${message.source}: ${message.body}`);

  // Auto-reply
  if (message.body.toLowerCase() === "ping") {
    signal.sendMessage(message.source, "pong");
  }
});

await signal.connect();
console.log("Listening for messages...");
```

### Create and Manage Groups

```javascript
// Create a new group
const group = await signal.createGroup("My Awesome Group", ["+33000000000"]);
console.log(`Group created with ID: ${group.groupId}`);

// Send a message to the new group
await signal.sendMessage(group.groupId, "Welcome to the group!");

// Add a new member
await signal.addGroupMember(group.groupId, "+33200000000");
```

## Your First Signal Bot

The `SignalBot` framework makes creating bots incredibly simple.

```javascript
// bot.js
require("dotenv").config();
const { SignalBot } = require("signal-sdk");

const bot = new SignalBot({
  phoneNumber: process.env.SIGNAL_PHONE_NUMBER,
  admins: ["+33000000000"], // Your admin number
  group: {
    name: "My First Bot Group",
    createIfNotExists: true,
  },
});

// Add a simple command
bot.addCommand({
  name: "hello",
  description: "Say hello",
  handler: async (message, args) => {
    return `Hello ${args.join(" ")}!`;
  },
});

// Start the bot
bot.start().then(() => {
  console.log("Bot is running!");
});
```

Run the bot:

```bash
node bot.js
```

Now, in your Signal group, you can type `/hello` and the bot will respond!

## Common Use Cases

### Simple Notification Script

```javascript
// notify.js
const { SignalCli } = require("signal-sdk");

async function sendNotification(recipient, message) {
  const signal = new SignalCli(process.env.SIGNAL_PHONE_NUMBER);
  await signal.connect();
  await signal.sendMessage(recipient, message);
  await signal.gracefulShutdown();
}

sendNotification("+33000000000", "This is an automated notification.");
```

### Interactive Chatbot

```javascript
const { SignalBot } = require("signal-sdk");

const bot = new SignalBot({
  phoneNumber: process.env.SIGNAL_PHONE_NUMBER,
  admins: ["+33000000000"],
});

bot.addCommand({
  name: "weather",
  description: "Get the weather",
  handler: async (message, args) => {
    const city = args[0] || "Paris";
    // In a real bot, you would fetch this from an API
    return `The weather in ${city} is sunny.`;
  },
});

bot.start();
```

## Configuration

### SignalCli Options

```javascript
const signal = new SignalCli(
  "/path/to/signal-cli/config", // Optional: path to signal-cli config
  "+33111111111" // Required: your Signal phone number
);
```

### SignalBot Options

```javascript
const bot = new SignalBot({
  phoneNumber: "+33111111111", // Required
  admins: ["+33000000000"], // Required
  group: {
    // Optional
    name: "My Bot Group",
    createIfNotExists: true,
  },
  settings: {
    // Optional
    commandPrefix: "!",
    autoReact: false,
  },
});
```

## What's Next?

You've now mastered the basics! Here's where to go next:

- **[Examples Guide](./examples-guide.md)**: Explore all the ready-to-run examples.
- **[API Reference](./api-reference.md)**: Dive deep into all available methods.
- **[SignalBot Framework](./signalbot-framework.md)**: Learn how to build powerful bots.
- **[Troubleshooting](./troubleshooting.md)**: Find solutions to common problems.
