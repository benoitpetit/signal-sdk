# Signal SDK Examples

This directory contains comprehensive examples demonstrating how to use the Signal SDK and SignalBot framework. All examples are production-ready and demonstrate best practices.

## Structure

```
examples/
├── sdk/                          # Pure SDK examples
│   ├── 00-device-linking.js      # Device linking with QR code
│   ├── 01-basic-usage.js         # Basic SDK functionality
│   ├── 02-quick-start.js         # Quick start guide
│   ├── 03-group-management.js    # Group operations
│   ├── 04-contact-management.js  # Contact operations
│   └── 05-file-handling.js       # File operations
├── bot/                          # SignalBot framework examples
│   ├── 01-minimal-bot.js         # Minimal bot implementation
│   └── 02-advanced-bot.js        # Advanced bot with full features
├── advanced/                     # Advanced examples (coming soon)
│   ├── 01-custom-commands.js     # Custom command system
│   ├── 02-state-management.js    # Persistent state
│   ├── 03-webhook-integration.js # Webhook integration
│   └── 04-multi-account.js       # Multiple accounts
└── README.md                     # This file
```

## Getting Started

### Prerequisites

1. **signal-cli setup (automatic!)**
   **Good news!** signal-cli is automatically downloaded and managed by the SDK!

   You only need:

   - **Node.js** (version 16+)
   - **Java Runtime Environment** (signal-cli requirement)

   Install Java if needed:

   ```bash
   # Ubuntu/Debian
   sudo apt update && sudo apt install default-jre

   # macOS with Homebrew
   brew install openjdk
   ```

2. **Device linking (FIRST STEP!)**
   Before using any examples, link this device to your Signal account:

   ```bash
   # Quick method using CLI
   npx signal-sdk connect

   # Or run the example script
   node examples/sdk/00-device-linking.js
   ```

   This will display a QR code in your terminal to scan with your phone.

3. **Environment variables**
   Create a `.env` file in the project root:

   ```env
   SIGNAL_PHONE_NUMBER="+33111111111"
   SIGNAL_ADMIN_NUMBER="+33000000000"
   SIGNAL_RECIPIENT_NUMBER="+33000000000"
   SIGNAL_TEST_MEMBER="+33000000000"
   SIGNAL_TEST_CONTACT="+33000000000"
   SIGNAL_GROUP_NAME="My Test Group"
   ```

4. **Dependencies**
   ```bash
   npm install
   npm run build
   ```

## SDK Examples

### 0. Device Linking (`sdk/00-device-linking.js`)

**Perfect for:** First-time setup, linking new devices

**Features:**

- QR code display in terminal
- Auto-install qrcode-terminal if missing
- Step-by-step linking instructions
- No phone number required initially
- Graceful error handling

**Run:**

```bash
node examples/sdk/00-device-linking.js
```

**Important:** Run this FIRST before any other examples!

### 1. Basic Usage (`sdk/01-basic-usage.js`)

**Perfect for:** First-time users, understanding core concepts

**Features:**

- Connect to signal-cli
- Send messages
- List contacts and groups
- Send reactions and typing indicators
- Listen for messages
- Error handling

**Run:**

```bash
node examples/sdk/01-basic-usage.js
```

### 2. Quick Start (`sdk/02-quick-start.js`)

**Perfect for:** Rapid prototyping, simple integrations

**Features:**

- Minimal setup
- Send messages and files
- Basic info retrieval
- Clean shutdown

**Run:**

```bash
node examples/sdk/02-quick-start.js
```

### 3. Group Management (`sdk/03-group-management.js`)

**Perfect for:** Group-based applications, team management

**Features:**

- List existing groups
- Create new groups
- Update group details
- Manage members
- Group permissions
- Send group messages

**Run:**

```bash
node examples/sdk/03-group-management.js
```

### 4. Contact Management (`sdk/04-contact-management.js`)

**Perfect for:** Contact-based applications, CRM integration

**Features:**

- List contacts
- Update contact information
- Block/unblock contacts
- Identity verification
- Send receipts
- Contact profiles

**Run:**

```bash
node examples/sdk/04-contact-management.js
```

### 5. File Handling (`sdk/05-file-handling.js`)

**Perfect for:** File sharing, media applications

**Features:**

- Send local files
- Multiple file attachments
- Download and send images
- Create temporary files
- File validation
- Error handling

**Run:**

```bash
node examples/sdk/05-file-handling.js
```

## Bot Examples

### 1. Minimal Bot (`bot/01-minimal-bot.js`)

**Perfect for:** Bot beginners, simple automation

**Features:**

- Basic command system
- Simple responses
- Event handling
- Clean architecture

**Commands:**

- `/hello` - Greeting
- `/ping` - Test responsiveness
- `/echo` - Repeat messages
- `/time` - Current time
- `/info` - Bot information

**Run:**

```bash
node examples/bot/01-minimal-bot.js
```

### 2. Advanced Bot (`bot/02-advanced-bot.js`)

**Perfect for:** Production bots, complex automation

**Features:**

- Advanced command system
- User permissions
- State management
- Error logging
- Admin panel
- File handling
- Statistics tracking

**Commands:**

- **General:** `/help`, `/ping`, `/stats`, `/uptime`
- **Admin:** `/admin`, `/broadcast`, `/logs`
- **Groups:** `/groupinfo`
- **Fun:** `/weather`, `/joke`, `/quote`
- **Files:** `/sendfile`

**Run:**

```bash
node examples/bot/02-advanced-bot.js
```

## Configuration

### Environment Variables

| Variable                  | Description              | Required      | Example          |
| ------------------------- | ------------------------ | ------------- | ---------------- |
| `SIGNAL_PHONE_NUMBER`     | Your Signal phone number | Yes           | `"+33111111111"` |
| `SIGNAL_ADMIN_NUMBER`     | Bot admin phone number   | Yes           | `"+33000000000"` |
| `SIGNAL_RECIPIENT_NUMBER` | Test recipient           | SDK only      | `"+33000000000"` |
| `SIGNAL_TEST_MEMBER`      | Test group member        | Groups only   | `"+33000000000"` |
| `SIGNAL_TEST_CONTACT`     | Test contact             | Contacts only | `"+33000000000"` |
| `SIGNAL_GROUP_NAME`       | Bot group name           | Bots only     | `"My Bot Group"` |

### signal-cli Configuration

Ensure signal-cli is properly configured:

```bash
# Check installation
signal-cli --version

# List accounts
signal-cli listAccounts

# Test JSON-RPC mode
echo '{"jsonrpc": "2.0", "method": "version", "id": "test"}' | signal-cli -a +33111111111 jsonRpc
```

## Common Use Cases

### Simple Message Sending

```javascript
const { SignalCli } = require("./dist/SignalCli");
const signal = new SignalCli("+33111111111");
await signal.connect();
await signal.sendMessage("+33000000000", "Hello from Signal SDK!");
```

### Basic Bot

```javascript
const { SignalBot } = require("./dist/SignalBot");
const bot = new SignalBot({
  phoneNumber: "+33111111111",
  admins: ["+33000000000"],
});
bot.addCommand({
  name: "hello",
  handler: async () => "Hello World!",
});
await bot.start();
```

### File Sending

```javascript
await signal.sendMessage("+33000000000", "Here is a file:", {
  attachments: ["package.json"],
});
```

## Troubleshooting

### Common Issues

1. **"signal-cli not found"**

   - Install signal-cli from [official releases](https://github.com/AsamK/signal-cli/releases)
   - Add to PATH or use full path

2. **"Account not registered"**

   ```bash
   signal-cli register +33111111111
   signal-cli verify +33111111111
   ```

3. **"Permission denied"**

   - Check file permissions
   - Verify signal-cli has proper permissions

4. **"Connection failed"**

   - Check internet connection
   - Verify signal-cli is working: `signal-cli --version`
   - Try manual JSON-RPC test

5. **"Group not found"**
   - Verify group exists
   - Check group permissions
   - Use existing group ID

### Debug Mode

Enable debug logging:

```bash
DEBUG=signal-sdk node examples/sdk/01-basic-usage.js
```

### Test signal-cli

```bash
# Test basic functionality
signal-cli -a +33111111111 send +33000000000 "Test message"

# Test JSON-RPC
echo '{"jsonrpc": "2.0", "method": "listGroups", "id": "test"}' | signal-cli -a +33111111111 jsonRpc
```

## Learning Path

1. **Start with:** `sdk/01-basic-usage.js` - Learn core concepts
2. **Then try:** `sdk/02-quick-start.js` - Understand simplified usage
3. **Explore:** `sdk/03-group-management.js` - Group operations
4. **Advanced:** `sdk/04-contact-management.js` - Contact operations
5. **Files:** `sdk/05-file-handling.js` - File operations
6. **Bots:** `bot/01-minimal-bot.js` - Basic bot framework
7. **Production:** `bot/02-advanced-bot.js` - Advanced bot features

## Contributing

Want to add more examples? Please:

1. Follow the existing structure
2. Include comprehensive documentation
3. Add proper error handling
4. Test thoroughly
5. Update this README

## License

These examples are provided under the same license as the Signal SDK project.

## Support

- **Documentation:** [Main README](../README.md)
- **Issues:** [GitHub Issues](https://github.com/signal-sdk/signal-sdk/issues)
- **Examples:** This directory
- **API Reference:** [TypeScript Definitions](../src/interfaces.ts)

---

**Happy coding with Signal SDK!**
