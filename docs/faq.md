# Frequently Asked Questions (FAQ)

This document provides quick answers to common questions about the Signal SDK.

## General Questions

### What is Signal SDK?

Signal SDK is a comprehensive TypeScript SDK for interacting with [signal-cli](https://github.com/AsamK/signal-cli), featuring native JSON-RPC communication and a powerful bot framework.

### Is this an official Signal product?

No, this is an unofficial SDK that uses signal-cli. It is not affiliated with or endorsed by Signal Messenger or Signal Technology Foundation.

### What can I build with Signal SDK?

You can build messaging applications, notification systems, chatbots, group management tools, and more - anything that leverages Signal's secure messaging platform.

## Installation & Setup

### What are the system requirements?

- Node.js (version 16 or later)
- Java Runtime Environment (JRE)
- Internet connection for initial setup

### Do I need to install signal-cli separately?

No, the SDK automatically downloads and manages signal-cli for you. No manual signal-cli installation is required.

### How do I link my device?

Run the device linking script:

```bash
node examples/sdk/00-device-linking.js
```

Then scan the QR code with your Signal mobile app. See the [Device Linking Guide](./device-linking.md) for detailed instructions.

### Can I use this SDK without a phone number?

No, you need a registered Signal account with a phone number to use this SDK.

## Features & Usage

### Can I send messages to multiple recipients at once?

Yes, you can send to multiple recipients by calling the `sendMessage()` method in a loop, or by creating a group and sending to the group.

### How do I create a bot?

Use the `SignalBot` class to create a bot with a command system:

```javascript
const { SignalBot } = require("signal-sdk");
const bot = new SignalBot({
  phoneNumber: "+33111111111",
  admins: ["+33000000000"],
  group: { name: "My Bot Group", createIfNotExists: true },
});

bot.addCommand({
  name: "hello",
  description: "Say hello",
  handler: async (message, args) => `Hello ${args.join(" ")}!`,
});

await bot.start();
```

### How do I send files/attachments?

```javascript
await signal.sendMessage(recipient, "Here are some files:", {
  attachments: ["document.pdf", "image.jpg"],
});
```

### Can I use this in a production environment?

Yes, the SDK is designed for production use with error handling, reconnection logic, and performance optimizations.

## Troubleshooting

### Why can't I connect to Signal?

Make sure you've completed the device linking process first. This is a mandatory step before using the SDK.

### How do I debug connection issues?

Enable debug logging:

```javascript
const signal = new SignalCli();
signal.on("log", (log) => {
  console.log(`[${log.level}] ${log.message}`);
});
```

### My message wasn't delivered. What should I check?

- Verify the recipient's phone number format (include country code: `+33111111111`)
- Check your internet connection
- Ensure your device is properly linked
- Look for rate limiting issues

### How do I update signal-cli to a newer version?

The SDK automatically uses a compatible version of signal-cli. If you need a specific version, you can manually place it in the `./bin/signal-cli` directory.

## Technical Questions

### Does this SDK support all signal-cli features?

Yes, the SDK provides 100% coverage of signal-cli methods (all 34+ methods).

### How does the JSON-RPC communication work?

The SDK establishes a persistent JSON-RPC connection with signal-cli for optimal performance, handling serialization, deserialization, and error management automatically.

### Can I run multiple bots on the same machine?

Yes, you can run multiple bots, but each bot must be associated with a unique phone number and a separate signal-cli data directory.

### Is the SDK asynchronous?

Yes, all methods that involve I/O are asynchronous and return Promises. You should use `async/await` for best results.

## Security

### Is my data secure?

Yes, all communication is end-to-end encrypted by the Signal Protocol, just like the official Signal app. The SDK does not compromise the security of your messages.

### Where are my keys stored?

Your cryptographic keys are stored locally in the signal-cli data directory. Ensure this directory is properly secured.

### Should I expose my bot to the public?

Be cautious when creating public-facing bots. Implement strict permission controls, validate all user input, and avoid commands that could be abused (e.g., shell execution).

---

Have a question that's not answered here? [Open an issue on GitHub](https://github.com/signal-sdk/signal-sdk/issues).
