# CLI Reference

The Signal SDK provides a command-line interface for common operations, making it easy to manage your Signal integration from the terminal.

## Installation

The CLI is automatically available after installing the SDK:

```bash
npm install signal-sdk
```

## Usage

```bash
npx signal-sdk <command> [options]
```

## Available Commands

### connect

Link a new device to your Signal account by generating a QR code.

```bash
# Link with default device name
npx signal-sdk connect

# Link with custom device name
npx signal-sdk connect "My Bot Device"
```

**What it does:**

- Generates a QR code in your terminal
- Displays step-by-step instructions
- Handles the complete linking process
- Configures your device for Signal SDK usage

**Output:**
The command will display a QR code that you can scan with your Signal mobile app to link the device.

### help

Display help information about available commands.

```bash
npx signal-sdk help
npx signal-sdk --help
npx signal-sdk -h
```

**Output:**

```
Signal SDK - Command Line Interface
===================================

Usage:
  npx signal-sdk <command> [options]

Commands:
  connect [device-name]    Link a new device with QR code
  help                     Show this help message

Examples:
  npx signal-sdk connect
  npx signal-sdk connect "My Bot Device"
  npx signal-sdk help

For more information, visit: https://github.com/benoitpetit/signal-sdk
```

## Examples

### First Time Setup

```bash
# 1. Link your device
npx signal-sdk connect "My Application"

# 2. Follow the QR code instructions
# 3. Your device is now ready to use with the SDK
```

### Device Linking with Custom Name

```bash
# Use a descriptive name for your device
npx signal-sdk connect "Production Bot Server"
```

This helps you identify the device in your Signal app's "Linked devices" section.

## Error Handling

The CLI provides clear error messages and troubleshooting tips:

### Common Issues

#### Java Not Found

```
Error: Java Runtime Environment not found
Solution: Install Java JRE (see installation guide)
```

#### Signal CLI Not Available

```
Error: signal-cli not found
Solution: The SDK will automatically download signal-cli
```

#### Network Connection Issues

```
Error: Failed to connect to Signal servers
Solution: Check your internet connection and try again
```

## Integration with Scripts

You can use the CLI in your deployment scripts:

```bash
#!/bin/bash
# deploy.sh

echo "Setting up Signal SDK..."
npx signal-sdk connect "Production Bot $(date +%Y%m%d)"

echo "Device linked successfully!"
echo "Starting application..."
node app.js
```

## Programmatic Usage

While the CLI is convenient for setup, you can also perform these operations programmatically:

```javascript
const { SignalCli } = require("signal-sdk");

// Equivalent to: npx signal-sdk connect "My Device"
const signal = new SignalCli();
await signal.deviceLink({
  name: "My Device",
  qrCodeOutput: "console",
});
```

## Next Steps

After using the CLI to link your device:

1. [Set up your environment variables](./getting-started.md#set-your-phone-number)
2. [Send your first message](./getting-started.md#send-your-first-message)
3. [Explore the examples](../examples/)
4. [Read the API reference](./api-reference.md)
