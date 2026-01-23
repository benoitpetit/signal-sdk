# Troubleshooting Guide

Common issues and solutions for the Signal SDK.

## Quick Diagnostics

Before diving into specific issues, run these quick diagnostic commands:

```bash
# Check Node.js version (should be 18+)
node --version

# Check Java installation (required by signal-cli)
java --version

# Check if device is linked
node -e "
const { SignalCli } = require('./dist');
const signal = new SignalCli(process.env.SIGNAL_PHONE_NUMBER);
signal.connect().then(() => signal.listDevices()).then(devices => {
    console.log(devices.length > 0 ? 'Device linked' : 'Device not linked');
    process.exit(0);
}).catch(err => {
    console.log('Connection failed:', err.message);
    process.exit(1);
});
"
```

---

## Device Linking Issues

### QR Code Not Displaying

**Problem**: QR code doesn't appear in terminal

**Symptoms**:

```
Error: Cannot display QR code
QR code characters appear as boxes or question marks
```

**Solutions**:

1. **Use a better terminal**:

   ```bash
   # macOS - use Terminal.app or iTerm2
   # Windows - use Windows Terminal (not Command Prompt)
   # Linux - use gnome-terminal or konsole
   ```

2. **Enable Unicode support**:

   ```bash
   # Windows Command Prompt
   chcp 65001

   # PowerShell
   [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
   ```

3. **Save QR code to file instead**:

   ```javascript
   const result = await signal.deviceLink({
     name: "My Device",
     qrCodeOutput: "file",
     qrCodePath: "./qr-code.png",
   });
   ```

4. **Use QR code URI directly**:
   ```javascript
   const result = await signal.deviceLink({ name: "My Device" });
   console.log("Scan this:", result.qrCode.uri);
   // Copy URI and create QR code with online tool
   ```

### Java Not Found

**Problem**: signal-cli can't run because Java is missing

**Symptoms**:

```
Error: java: command not found
Error: spawn java ENOENT
```

**Solutions**:

1. **Install Java JRE**:

   ```bash
   # Ubuntu/Debian
   sudo apt update && sudo apt install default-jre

   # macOS with Homebrew
   brew install openjdk

   # Windows - download from java.com
   ```

2. **Verify Java in PATH**:
   ```bash
   # Should output Java path
   which java
   ```

### Linking Timeout

**Problem**: Device linking fails with a timeout

**Symptoms**:

```
Error: Timeout while waiting for device to be linked
```

**Solutions**:

1. **Scan QR code faster**: You have a limited time to scan.
2. **Check internet connection**: Ensure both phone and computer are online.
3. **Firewall issues**:
   - Disable firewall temporarily
   - Allow connections for Node.js and Java

### "Account Already Linked"

**Problem**: Trying to link a device that is already linked

**Symptoms**:

```
Error: Account already linked on this device
```

**Solutions**:

1. **Use existing account**:
   - Your phone number is already configured.
   - Use `new SignalCli(undefined, 'YOUR_PHONE_NUMBER')`

2. **Unlink and relink**:

   ```bash
   # Unlink from your phone:
   # Signal > Settings > Linked Devices > Remove this device

   # Then run linking again
   node examples/sdk/00-device-linking.js
   ```

---

## Connection Issues

### Connection Refused

**Problem**: SDK cannot connect to signal-cli process

**Symptoms**:

```
Error: connect ECONNREFUSED 127.0.0.1:XXXX
```

**Solutions**:

1. **Check if signal-cli is running**:
   - The SDK automatically starts signal-cli.
   - If you run it manually, ensure it's in `json-rpc` mode.

2. **Port conflicts**:
   - Another application might be using the port.
   - The SDK will try to find a free port automatically.

3. **Firewall**:
   - Ensure firewall is not blocking local connections.

### Connection Timeout

**Problem**: Connection to signal-cli times out

**Symptoms**:

```
Error: Connection timeout
```

**Solutions**:

1. **Slow system**:
   - Increase timeout in `connect()`:
     ```javascript
     await signal.connect({ timeout: 30000 }); // 30 seconds
     ```

2. **signal-cli slow to start**:
   - Check for Java or system performance issues.

### "Account not registered"

**Problem**: The phone number is not registered with Signal

**Symptoms**:

```
Error: User +XXXXXXXXXXX is not registered.
```

**Solutions**:

1. **Register the number first**:

   ```bash
   # Use signal-cli directly to register
   signal-cli -a +XXXXXXXXXXX register
   signal-cli -a +XXXXXXXXXXX verify YOUR_CODE
   ```

2. **Check for typos**:
   - Ensure the phone number is correct.

---

## Message Sending/Receiving Issues

### Messages Not Sending

**Problem**: `sendMessage()` succeeds but message is not delivered

**Symptoms**:

- No error from `sendMessage()`
- Message doesn't appear on recipient's device

**Solutions**:

1. **Check for rate limiting**:
   - You might be sending too many messages.
   - Wait a while and try again.

2. **Recipient has blocked you**:
   - Verify with the recipient.

3. **Safety numbers changed**:
   - You may need to verify the new safety numbers.
   - This usually happens automatically.

4. **Enable debug logs**:
   ```bash
   DEBUG=signal-cli,signal-sdk node your-script.js
   ```

   - Look for errors in the signal-cli output.

### Messages Not Being Received

**Problem**: Not receiving incoming messages

**Symptoms**:

- `message` event is not emitted
- No errors in the console

**Solutions**:

1. **Listener not attached**:
   - Ensure you have `signal.on('message', ...)` set up.

2. **Another client is receiving messages**:
   - If you have multiple signal-cli instances running, only one will receive the message.
   - Ensure only one client is connected for that number.

3. **Group message settings**:
   - For groups, ensure you haven't muted the conversation.

### Attachments Not Working

**Problem**: File attachments fail to send

**Symptoms**:

```
Error: Attachment file not found
Error: Invalid attachment
```

**Solutions**:

1. **Check file path**:
   - Use absolute paths for attachments.
   - `path.resolve('./my-file.txt')`

2. **File permissions**:
   - Ensure the Node.js process has read access to the file.

3. **File size limits**:
   - Signal has file size limits (around 100MB).
   - Check file size before sending.

---

## Bot Framework Issues

### Commands Not Working

**Problem**: Bot does not respond to commands

**Symptoms**:

- Sending `/hello` does nothing
- No errors in logs

**Solutions**:

1. **Command prefix**:
   - Default prefix is `/`.
   - Check if you customized it: `new SignalBot({ settings: { commandPrefix: '!' } })`

2. **Admin permissions**:
   - Some commands require admin rights.
   - Ensure your number is in the `admins` array.

3. **Group settings**:
   - If the bot is in a group, ensure it has permission to read messages.

### Bot Not Starting

**Problem**: `bot.start()` fails or exits immediately

**Symptoms**:

- Process exits with no error
- "Bot is ready!" message doesn't appear

**Solutions**:

1. **Missing `await`**:
   - `bot.start()` is an async function.
   - Make sure you are using `await bot.start()`.

2. **Invalid configuration**:
   - Check `phoneNumber` and `admins` are correctly set.
   - Enable debug logs for more details.

---

## Advanced Troubleshooting

### Enable Debug Logging

This is the most powerful tool for debugging.

```bash
# Enable SDK logs
DEBUG=signal-sdk node your-script.js

# Enable signal-cli logs (very verbose)
DEBUG=signal-cli node your-script.js

# Enable both
DEBUG=signal-sdk,signal-cli node your-script.js
```

### Manual signal-cli Testing

You can test signal-cli directly to isolate problems.

1. **Find signal-cli path**:

   ```javascript
   const { signalCliPath } = require("./dist/SignalCli");
   console.log(signalCliPath);
   ```

2. **Run a command**:

   ```bash
   # Example: list devices
   /path/to/signal-cli -a +XXXXXXXXXXX listDevices

   # Example: send a message
   /path/to/signal-cli -a +XXXXXXXXXXX send +YYYYYYYYYYY "Test"
   ```

3. **Test JSON-RPC mode**:

   ```bash
   # Start signal-cli in JSON-RPC mode
   /path/to/signal-cli -a +XXXXXXXXXXX jsonRpc

   # In another terminal, send a JSON-RPC request
   echo '{"jsonrpc":"2.0","method":"version","id":1}' | nc localhost 12345
   ```

   _(Replace `12345` with the port signal-cli is listening on)_

### Checking signal-cli Data Directory

signal-cli stores its data in a local directory.

- **Linux**: `~/.local/share/signal-cli`
- **macOS**: `~/Library/Application Support/signal-cli`
- **Windows**: `C:\Users\YourUser\AppData\Local\signal-cli`

You can inspect this directory for:

- `data/` - Account information, keys, etc.
- `attachments/` - Cached attachments
- `avatars/` - Cached avatars

**Warning**: Do not modify these files unless you know what you are doing. You could corrupt your Signal account data.

---

## Still Stuck?

If you've tried everything above, please [open an issue on GitHub](https://github.com/signal-sdk/signal-sdk/issues).

Please include:

1. **What you are trying to do**
2. **What you expected to happen**
3. **What actually happened**
4. **Code to reproduce the issue**
5. **Debug logs** (`DEBUG=signal-sdk,signal-cli ...`)

This will help us diagnose and fix the problem much faster.
