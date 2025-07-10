# SignalBot Framework

Build powerful Signal bots with minimal code using the SignalBot framework. This guide covers everything from basic bot setup to advanced features and production deployment.

## Overview

SignalBot is a high-level framework built on top of SignalCli that simplifies bot development. It provides:

- **Command System** - Built-in command parsing and routing
- **Admin Controls** - Role-based permissions
- **Anti-Spam** - Built-in rate limiting and spam protection
- **Auto-Management** - Automatic group creation and management
- **Event Handling** - Rich event system for custom logic
- **Error Recovery** - Automatic reconnection and error handling

## Quick Start

### Basic Bot Setup

```javascript
const { SignalBot } = require("signal-sdk");

const bot = new SignalBot({
  phoneNumber: "+33111111111",
  admins: ["+33000000000", "+33200000000"],
  group: {
    name: "My Awesome Bot",
    createIfNotExists: true,
    description: "A bot that does cool things!",
  },
});

// Add a simple command
bot.addCommand({
  name: "hello",
  description: "Say hello",
  handler: async (message, args) => {
    const name = args.join(" ") || "World";
    return `Hello ${name}!`;
  },
});

// Start the bot
await bot.start();
console.log("Bot is running!");
```

### Built-in Commands

Every SignalBot automatically includes these commands:

- `/help` - List all available commands
- `/ping` - Test bot responsiveness
- `/stats` - Show bot statistics
- `/admin help` - Admin-only commands (for admins only)

## Configuration Options

### Bot Configuration

```javascript
const bot = new SignalBot({
  // Required
  phoneNumber: "+33111111111",

  // Admin users (full access)
  admins: ["+33000000000"],

  // Group settings
  group: {
    name: "Bot Group",
    createIfNotExists: true,
    description: "My bot group",
    avatar: "./group-avatar.jpg", // Optional
  },

  // Anti-spam settings
  rateLimit: {
    maxMessages: 10, // Max messages per window
    windowMs: 60000, // Time window (1 minute)
    banDuration: 300000, // Ban duration (5 minutes)
  },

  // Bot behavior
  commandPrefix: "/", // Default command prefix
  caseSensitive: false, // Case-insensitive commands
  allowDM: true, // Allow direct messages
  logLevel: "info", // Logging level
});
```

### Environment Variables

Create a `.env` file for sensitive data:

```bash
SIGNAL_PHONE_NUMBER="+33111111111"
BOT_ADMINS="+33000000000,+33200000000"
GROUP_NAME="My Bot Group"
```

And use them in your code:

```javascript
require("dotenv").config();

const bot = new SignalBot({
  phoneNumber: process.env.SIGNAL_PHONE_NUMBER,
  admins: process.env.BOT_ADMINS.split(","),
  group: {
    name: process.env.GROUP_NAME,
  },
});
```

## Command System

### Adding Commands

Use `bot.addCommand()` to add new commands.

```javascript
bot.addCommand({
  name: "weather",
  description: "Get the weather for a city",
  usage: "<city>",
  handler: async (message, args) => {
    if (args.length === 0) {
      return "Please provide a city. Usage: /weather <city>";
    }
    const city = args.join(" ");
    // Fetch weather from an API...
    return `The weather in ${city} is sunny.`;
  },
});
```

### Command Properties

| Property      | Type       | Description                                   |
| ------------- | ---------- | --------------------------------------------- |
| `name`        | `string`   | Command name (e.g., 'hello')                  |
| `description` | `string`   | Description for `/help` command               |
| `handler`     | `function` | Async function to execute the command         |
| `usage`       | `string`   | Optional usage instructions                   |
| `adminOnly`   | `boolean`  | Restrict command to admins (default: `false`) |
| `aliases`     | `string[]` | Alternative names for the command             |
| `cooldown`    | `number`   | Per-user cooldown in seconds                  |

### Command Handler

The `handler` function receives two arguments:

1.  `message`: The full message object (`IMessage`).
2.  `args`: An array of arguments passed to the command.

The handler should return a `string` or `Promise<string>` to be sent as a reply.

### Sub-commands

Create nested commands for better organization.

```javascript
bot.addCommand({
  name: "admin",
  description: "Admin commands",
  adminOnly: true,
  subCommands: [
    {
      name: "broadcast",
      description: "Send a message to all users",
      handler: async (message, args) => {
        const text = args.join(" ");
        // ... broadcast logic ...
        return "Broadcast sent!";
      },
    },
    {
      name: "restart",
      description: "Restart the bot",
      handler: async () => {
        await bot.gracefulShutdown();
        process.exit(0);
      },
    },
  ],
});
```

Usage: `/admin broadcast Hello everyone!`

## Event System

Listen to events using `bot.on()`.

```javascript
// Listen for new members joining the group
bot.on("groupMemberJoined", (event) => {
  console.log(`${event.member.number} joined the group.`);
  bot.sendMessage(event.groupId, `Welcome ${event.member.number}!`);
});

// Listen for all incoming messages
bot.on("message", (message) => {
  if (message.body.toLowerCase().includes("thank you")) {
    bot.sendReaction(message, "👍");
  }
});
```

### Common Events

| Event               | Description                   |
| ------------------- | ----------------------------- |
| `ready`             | Bot is connected and ready    |
| `message`           | Any incoming message          |
| `command`           | A command is executed         |
| `groupCreated`      | Bot created a new group       |
| `groupMemberJoined` | A new member joined the group |
| `groupMemberLeft`   | A member left the group       |
| `error`             | An error occurred             |

## Group Management

The bot can automatically create and manage a Signal group.

### Auto-Create Group

If `group.createIfNotExists` is `true`, the bot will:

1.  Check if a group with `group.name` exists.
2.  If not, create it and invite all `admins`.
3.  Set the group description and avatar.

### Welcoming New Members

```javascript
bot.on("groupMemberJoined", (event) => {
  bot.sendMessage(
    event.groupId,
    `Welcome to the group, ${event.member.number}! Please read the rules.`
  );
});
```

### Group Admin Commands

You can create commands to manage the group.

```javascript
bot.addCommand({
  name: "kick",
  description: "Remove a user from the group",
  adminOnly: true,
  usage: "<number>",
  handler: async (message, args) => {
    const number = args[0];
    if (!number) return "Please provide a number to kick.";

    await bot.removeGroupMember(bot.group.id, number);
    return `${number} has been kicked from the group.`;
  },
});
```

## State Management

For bots that need to remember information, you can implement state management.

### Simple In-Memory State

```javascript
const userStates = {};

bot.addCommand({
  name: "remind",
  description: "Set a reminder",
  handler: async (message, args) => {
    const reminder = args.join(" ");
    userStates[message.source] = { reminder };
    return "Reminder set!";
  },
});

bot.addCommand({
  name: "myreminder",
  description: "Get your reminder",
  handler: async (message) => {
    const state = userStates[message.source];
    return state
      ? `Your reminder: ${state.reminder}`
      : "You have no reminder set.";
  },
});
```

### Persistent State with Files

For more robust state, save to a file.

```javascript
const fs = require("fs");
const path = require("path");

const STATE_FILE = path.join(__dirname, "bot-state.json");

let state = {};

// Load state on startup
if (fs.existsSync(STATE_FILE)) {
  state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
}

// Save state whenever it changes
function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// Example command using persistent state
bot.addCommand({
  name: "setcity",
  handler: async (message, args) => {
    const city = args.join(" ");
    state[message.source] = { city };
    saveState();
    return `Your city is set to ${city}.`;
  },
});
```

## Advanced Topics

### Middleware

Intercept commands before they are executed.

```javascript
// Log every command execution
bot.use(async (command, message, next) => {
  console.log(`Executing command: ${command.name} by ${message.source}`);
  await next();
  console.log(`Finished command: ${command.name}`);
});

// Add a custom property to the message object
bot.use(async (command, message, next) => {
  message.customData = { executionTime: new Date() };
  await next();
});
```

### Customizing Help Command

You can override the default `/help` command.

```javascript
bot.addCommand({
  name: "help",
  description: "Show this help message",
  handler: async () => {
    let helpText = "Here are the available commands:\n\n";
    bot.commands.forEach((cmd) => {
      helpText += `*${bot.commandPrefix}${cmd.name}*: ${cmd.description}\n`;
    });
    return helpText;
  },
});
```

### Graceful Shutdown

Ensure your bot shuts down cleanly.

```javascript
process.on("SIGINT", async () => {
  console.log("Shutting down bot...");
  await bot.gracefulShutdown();
  process.exit(0);
});
```

## Production Best Practices

1.  **Use Environment Variables**: Never hardcode phone numbers or API keys.
2.  **Persistent State**: Use a file or database for state that needs to survive restarts.
3.  **Error Handling**: Implement robust error handling and logging.
4.  **Process Manager**: Use a process manager like `pm2` to keep your bot running.
    ```bash
    npm install pm2 -g
    pm2 start my-bot.js
    ```
5.  **Logging**: Use a proper logging library like `winston` or `pino`.
6.  **Security**:
    - Carefully manage admin permissions.
    - Validate all user input.
    - Be cautious with commands that execute shell commands or access the filesystem.

---

This framework provides a solid foundation for building anything from simple notification bots to complex, interactive assistants. For more details, check out the [advanced bot example](../examples/bot/02-advanced-bot.js).
