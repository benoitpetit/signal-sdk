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
│   ├── 05-file-handling.js       # Files & attachments
│   ├── 13-multi-account.js       # Multi-account management ✨ NEW
│   ├── 14-advanced-messaging.js  # Text styling, mentions, quotes ✨ NEW
│   ├── 15-identity-verification.js # Safety numbers ✨ NEW
│   ├── 16-username-management.js # Username features ✨ NEW
│   ├── 17-enhanced-parsing.js    # Profile & group parsing ✨ NEW
│   └── 18-phone-number-change-payment.js # Number change & payments ✨ NEW
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

- Sends files as attachments
- Downloads attachments from messages
- Handles different file types
- Manages file cleanup

**Key Features**:

- File attachments
- Download management
- Multiple file types

### 13-multi-account.js - Multi-Account Management

**Purpose**: Demonstrates managing multiple Signal accounts simultaneously

```bash
node examples/sdk/13-multi-account.js
```

**What it does**:

- Creates a MultiAccountManager instance
- Adds multiple Signal accounts
- Connects all accounts simultaneously
- Routes messages to/from different accounts
- Monitors status of all accounts
- Handles events per account

**Key Features**:

- Multi-account orchestration
- Event routing per account
- Simultaneous connections
- Status monitoring
- Account-specific messaging

**Use Cases**:

- Managing business and personal accounts
- Bot services with multiple numbers
- Testing and development
- Customer service with multiple agents

**Example Output**:

```
Multi-Account Manager Example
=============================

1. Adding accounts...
✓ Added account: +1234567890
✓ Added account: +1987654321

2. Connecting all accounts...
✓ All accounts connected

3. Checking account status...
Account: +1234567890 - Connected: true
Account: +1987654321 - Connected: true

4. Sending messages from different accounts...
✓ Message sent from +1234567890
✓ Message sent from +1987654321
```

### 14-advanced-messaging.js - Advanced Messaging Features

**Purpose**: Demonstrates advanced message options (text styling, mentions, quotes)

```bash
node examples/sdk/14-advanced-messaging.js
```

**What it does**:

- Sends messages with text styling (bold, italic, strikethrough)
- Adds mentions to messages
- Quotes previous messages
- Edits sent messages
- Replies to stories
- Generates link previews

**Key Features**:

- **Text Styling**: Bold, italic, strikethrough, monospace
- **Mentions**: Tag users with @mentions
- **Quotes**: Reply to specific messages with context
- **Edits**: Correct previously sent messages
- **Story Replies**: Respond to stories
- **Link Previews**: Rich URL previews

**Example Output**:

```
Advanced Messaging Features
===========================

1. Sending message with text styling...
Sent: **Bold text**, *italic text*, ~~strikethrough~~

2. Sending message with mention...
Sent: Hello @John, how are you?

3. Replying to a message (quote)...
Quoting: "Original message"
Sent: That's a great point!

4. Editing a previous message...
Sent corrected message

5. Replying to a story...
Sent story reply
```

### 15-identity-verification.js - Identity Verification

**Purpose**: Demonstrates safety number verification and identity management

```bash
node examples/sdk/15-identity-verification.js
```

**What it does**:

- Retrieves safety numbers for contacts
- Verifies safety numbers
- Lists untrusted identities
- Manages trust relationships
- Handles identity key changes

**Key Features**:

- Safety number retrieval
- Identity verification
- Trust management
- Security monitoring
- Key change detection

**Use Cases**:

- Verifying new contacts
- Monitoring identity changes
- Security-critical communications
- Compliance requirements

**Example Output**:

```
Identity Verification Example
=============================

1. Getting safety number for contact...
Contact: +1234567890
Safety Number: 12345 67890 12345 67890 12345 67890 12345 67890 12345 67890 12345 67890
Trusted: false

2. Verifying safety number...
✓ Safety number verified and marked as trusted

3. Listing untrusted identities...
Found 0 untrusted identities
```

### 16-username-management.js - Username Management

**Purpose**: Demonstrates Signal username features

```bash
node examples/sdk/16-username-management.js
```

**What it does**:

- Sets a Signal username
- Retrieves username link for sharing
- Deletes username
- Manages username privacy

**Key Features**:

- Username creation
- Username link generation
- Username deletion
- Privacy control

**Username Requirements**:

- Alphanumeric characters and dots only
- No spaces or special characters
- Must be unique across Signal
- Case-insensitive

**Use Cases**:

- Privacy-focused sharing (no phone number)
- Public contact information
- Professional accounts
- Bot services

**Example Output**:

```
Username Management Example
===========================

1. Setting username...
✓ Username set: john.doe.42
✓ Username link: https://signal.me/#u/john.doe.42

Share this link to let people contact you without revealing your phone number!

2. Getting username link...
Your username link: https://signal.me/#u/john.doe.42

3. Deleting username...
✓ Username deleted
```

### 17-enhanced-parsing.js - Enhanced Parsing

**Purpose**: Demonstrates enhanced contact and group parsing with additional fields

```bash
node examples/sdk/17-enhanced-parsing.js
```

**What it does**:

- Parses contact profiles with detailed information
- Extracts group details with advanced fields
- Retrieves pending and banned members
- Gets group invite links
- Accesses MobileCoin addresses

**Key Features**:

- **Contact Parsing**:
  - Given name and family name
  - MobileCoin payment address
  - Profile key and username
  - Registration status
- **Group Parsing**:
  - Pending members list
  - Banned members list
  - Group invite links
  - Group version and master key

**Use Cases**:

- Building contact directories
- Payment integrations
- Advanced group management
- Member moderation
- Invite link management

**Example Output**:

```
Enhanced Parsing Example
========================

1. Getting contacts with profiles...

Contact: John Doe
  Given Name: John
  Family Name: Doe
  Username: @john.doe.42
  MobileCoin: mc1abc123...
  Registered: true

2. Getting groups with details...

Group: Family Chat
  Members: 5
  Pending Members: 1
  Banned Members: 0
  Invite Link: https://signal.group/#abc123...
  Version: 2
```

**Key Features**:

- Enhanced profile parsing with givenName/familyName
- MobileCoin address extraction
- Detailed group membership information
- Helper methods for parsing

---

### 18-phone-number-change-payment.js - Phone Number Change & Payments ✨

**Purpose**: Demonstrates phone number change and payment notifications

```bash
node examples/sdk/18-phone-number-change-payment.js
```

**What it demonstrates**:

- Starting phone number change process (SMS or voice)
- Completing number change with verification code
- Handling captcha challenges
- Sending MobileCoin payment notifications
- Payment receipts with custom notes

**Key Features**:

- Two-step phone number verification
- Voice call and captcha support
- MobileCoin payment integration
- Error handling for rate limits

**Use Cases**:

- Migrating to a new phone number
- Cryptocurrency payment notifications
- Account recovery scenarios

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
