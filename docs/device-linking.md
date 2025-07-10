# Device Linking & First Connection

> **Important**: You MUST link your device before using the Signal SDK. This is a one-time setup process.

## Overview

Device linking connects your application to your existing Signal account by generating a QR code that you scan with your phone. This process is required before you can send or receive messages.

## Quick Start - Link Your Device

### Step 1: Run the Device Linking Script

The SDK provides a convenient script to handle the entire linking process:

```bash
node examples/sdk/00-device-linking.js
```

This script will:

- Generate a QR code in your terminal
- Display linking instructions
- Handle the linking process automatically

### Step 2: Scan with Signal App

1. Open **Signal** on your phone
2. Go to **Settings** → **Linked devices**
3. Tap **"Link new device"**
4. Scan the QR code displayed in your terminal
5. Confirm the linking on your phone

### Step 3: Success!

When linking is complete, you'll see:

```
Device linking completed successfully!
Your device is now connected to Signal
```

## Manual Device Linking

If you prefer to handle device linking in your own code:

```javascript
const { SignalCli } = require("signal-sdk");

async function linkDevice() {
  const signal = new SignalCli();

  const result = await signal.deviceLink({
    name: "My Signal App",
    qrCodeOutput: "console", // Display QR code in terminal
  });

  if (result.success) {
    console.log("QR Code generated!");
    console.log("Scan this with your Signal app:");
    console.log(result.qrCode.uri);

    if (result.isLinked) {
      console.log("Device linked successfully!");
    } else {
      console.log("Waiting for you to scan the QR code...");
    }
  } else {
    console.error("Linking failed:", result.error);
  }

  await signal.gracefulShutdown();
}

linkDevice();
```

## QR Code Display Options

The SDK supports multiple ways to display the QR code:

### Option 1: Terminal Display (Default)

```javascript
await signal.deviceLink({
  name: "My App",
  qrCodeOutput: "console", // Shows QR code in terminal
});
```

### Option 2: Get QR URI Only

```javascript
const result = await signal.deviceLink({
  name: "My App",
  // No qrCodeOutput - just get the URI
});

console.log("Scan this URI:", result.qrCode.uri);
```

### Option 3: Save QR Code to File

```javascript
await signal.deviceLink({
  name: "My App",
  qrCodeOutput: "file",
  qrCodePath: "./signal-qr.png", // Save as PNG file
});
```

### Option 4: Get Base64 Encoded QR Code

```javascript
const result = await signal.deviceLink({
  name: "My App",
  qrCodeOutput: "base64",
});

console.log("Base64 QR Code:", result.qrCode.base64);
// Useful for web UIs
```

## Troubleshooting

### QR Code Not Displaying Correctly

- **Solution**: Use a modern terminal with good Unicode support (e.g., Windows Terminal, iTerm2).
- **Alternative**: Save the QR code to a file (`qrCodeOutput: 'file'`).

### Linking Timeout

- **Problem**: The linking process times out after 90 seconds.
- **Solution**: Scan the QR code more quickly. If the issue persists, check your internet connection on both your phone and computer.

### "Account Already Linked"

- **Problem**: You're trying to link a device that's already configured.
- **Solution**: You don't need to link again. You can proceed directly to using the SDK with your phone number.

## Security Considerations

- **Treat QR codes as sensitive**: Anyone who scans your QR code can link to your Signal account.
- **Generate QR codes in a secure environment**: Avoid generating them on public or untrusted machines.
- **Device names**: Use a descriptive device name (`name: 'My Awesome App'`) so you can easily identify and manage linked devices in your Signal app.

## Next Steps

Once your device is linked, you're ready to start building!

**Continue to the [Getting Started Guide](./getting-started.md)**
