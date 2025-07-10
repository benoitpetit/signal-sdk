# Examples Guide

This guide walks you through all the examples provided with the Signal SDK, from basic usage to advanced bot development.

## Getting Started

> **Important**: Before running any examples, ensure you have [linked your device](./device-linking.md) using the QR code process.

### Quick Setup

1. **Link Device** (one-time setup):

   ```bash
   node examples/sdk/00-device-linking.js
   ```

2. **Set Environment Variable**:

   ```bash
   echo 'SIGNAL_PHONE_NUMBER="+33111111111"' > .env
   ```

3. **Run Examples**:
   ```bash
   node examples/sdk/01-basic-usage.js
   ```

---

## Examples Structure

```
examples/
├── sdk/                    # Core SDK examples
│   ├── 00-device-linking.js      # REQUIRED FIRST STEP
│   ├── 01-basic-usage.js         # Basic messaging
│   ├── 02-quick-start.js         # Quick start guide
│   ├── 03-group-management.js    # Groups & management
│   ├── 04-contact-management.js  # Contacts & blocking
│   └── 05-file-handling.js       # Files & attachments
├── bot/                    # Bot framework examples
│   ├── 01-minimal-bot.js         # Simple bot setup
│   └── 02-advanced-bot.js        # Full-featured bot
└── advanced/               # Advanced techniques
    └── (coming soon)
```

---

## SDK Examples

### 00-device-linking.js - Device Linking (REQUIRED)

**Purpose**: Links your device to Signal using QR code

**Run First**: This is mandatory before any other examples work.

```bash
node examples/sdk/00-device-linking.js
```

**What it does**:

- Generates QR code in terminal
- Provides linking instructions
- Handles the device linking process
- Sets up connection for other examples

**Key Features**:

- Terminal QR code display
- Cross-platform compatibility
- Error handling & troubleshooting
- Progress feedback

**Expected Output**:

```
Signal SDK - Device Linking
===============================

1. Starting device linking process...
2. Initializing Signal SDK...
3. Generating QR code for device linking...

QR CODE - SCAN WITH YOUR PHONE:
═══════════════════════════════════
██████████████  ██  ██████████████
██          ██      ██          ██
██  ██████  ██  ██  ██  ██████  ██
[QR code display]
═══════════════════════════════════

Instructions:
1. Open Signal on your phone
2. Go to Settings → Linked devices
3. Tap "Link new device"
4. Scan the QR code above
5. Confirm on your phone

Waiting for you to scan... (will time out in 90 seconds)
```

### 01-basic-usage.js - Basic Messaging

**Purpose**: Demonstrates core messaging features

```bash
node examples/sdk/01-basic-usage.js
```

**What it does**:

- Connects to Signal
- Sends a text message
- Sends a reaction to a message
- Sends a typing indicator
- Lists contacts and groups
- Listens for incoming messages

**Key Features**:

- Sending messages
- Sending reactions
- Sending typing indicators
- Listing contacts & groups
- Receiving messages

### 02-quick-start.js - Quick Start

**Purpose**: A minimal example for quick integration

```bash
node examples/sdk/02-quick-start.js
```

**What it does**:

- Minimal setup
- Sends a message and a file
- Retrieves basic account info
- Cleanly shuts down

**Key Features**:

- Simplified setup
- Sending messages & files
- Basic info retrieval

### 03-group-management.js - Group Management

**Purpose**: Demonstrates group creation and management

```bash
node examples/sdk/03-group-management.js
```

**What it does**:

- Lists existing groups
- Creates a new group
- Updates group details (name, description, avatar)
- Manages group members (add, remove)
- Manages group permissions
- Sends a message to the group

**Key Features**:

- Group creation & updates
- Member management
- Permission controls

### 04-contact-management.js - Contact Management

**Purpose**: Demonstrates contact management features

```bash
node examples/sdk/04-contact-management.js
```

**What it does**:

- Lists all contacts
- Updates a contact's name
- Blocks and unblocks a contact
- Verifies contact identity
- Sends read receipts

**Key Features**:

- Contact listing & updating
- Blocking/unblocking
- Identity verification

### 05-file-handling.js - File Handling

**Purpose**: Demonstrates sending and receiving files

```bash
node examples/sdk/05-file-handling.js
```

**What it does**:

- Sends a local file as an attachment
- Sends multiple files at once
- Downloads an image from a URL and sends it
- Creates a temporary file to send

**Key Features**:

- Sending local files
- Sending multiple attachments
- Downloading and sending remote files

---

## Bot Examples

### 01-minimal-bot.js - Minimal Bot

**Purpose**: A simple, easy-to-understand bot

```bash
node examples/bot/01-minimal-bot.js
```

**What it does**:

- Sets up a basic bot with a command system
- Responds to simple commands like `/hello`, `/ping`, `/echo`
- Demonstrates basic event handling

**Key Features**:

- Basic command system
- Simple command handlers
- Clean, minimal architecture

### 02-advanced-bot.js - Advanced Bot

**Purpose**: A production-ready bot with advanced features

```bash
node examples/bot/02-advanced-bot.js
```

**What it does**:

- Implements an advanced command system with sub-commands
- Manages user permissions (admins)
- Includes state management for tracking stats
- Provides robust error logging
- Handles files and administrative tasks

**Key Features**:

- Advanced command system
- User permissions
- State management
- Error logging & admin panel

---

## How to Customize Examples

1. **Copy an example file**:
   ```bash
   cp examples/sdk/01-basic-usage.js my-app.js
   ```
2. **Modify the code**:
   - Change recipient numbers
   - Customize message content
   - Add new logic
3. **Run your custom script**:
   ```bash
   node my-app.js
   ```

These examples are designed to be a starting point for your own applications. Feel free to modify and extend them to fit your needs.
