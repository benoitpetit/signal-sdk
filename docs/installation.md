# Installation & Setup

## Prerequisites

Before installing the Signal SDK, ensure you have the following requirements:

### System Requirements

1. **Node.js** (version 16 or later)

   - Check your version: `node --version`
   - Download: [https://nodejs.org/](https://nodejs.org/)

2. **Java Runtime Environment (JRE)**
   - Required by signal-cli (automatically downloaded by the SDK)
   - Check if installed: `java --version`

### Java Installation by Platform

#### Ubuntu/Debian

```bash
sudo apt update
sudo apt install default-jre
```

#### macOS

```bash
# Using Homebrew
brew install openjdk

# Or download from Oracle
# https://www.oracle.com/java/technologies/downloads/
```

#### Windows

1. Download from [Oracle Java](https://www.oracle.com/java/technologies/downloads/)
2. Or install via Chocolatey: `choco install openjdk`

## Installation

### Option 1: NPM (Recommended)

```bash
npm install signal-sdk
```

### Option 2: Yarn

```bash
yarn add signal-sdk
```

### Option 3: Clone & Build from Source

```bash
git clone https://github.com/signal-sdk/signal-sdk.git
cd signal-sdk
npm install
npm run build
```

## Post-Installation Setup

### Signal CLI Integration

The Signal SDK includes signal-cli binaries and handles the setup automatically. You don't need to install signal-cli separately.

**What's included:**

- signal-cli v0.13.17 binaries (located in `bin/` directory)
- All required Java libraries
- Cross-platform compatibility (Windows, macOS, Linux)

### First Steps

After installation, you need to link your device to Signal:

```bash
# Link your device using the CLI
npx signal-sdk connect

# Or run the example script
node node_modules/signal-sdk/examples/sdk/00-device-linking.js
```

## Verification

Verify your installation works:

```javascript
const { SignalCli } = require("signal-sdk");

console.log("Signal SDK installed successfully!");
console.log("Next step: Link your device with QR code");
console.log("Run: npx signal-sdk connect");
```

## Environment Setup

Create a `.env` file for configuration:

```bash
# .env file
SIGNAL_PHONE_NUMBER="+33111111111"
SIGNAL_CLI_PATH="./bin/signal-cli"  # Optional, auto-detected
```

## Project Structure

After installation, your project should look like:

```
my-signal-app/
├── node_modules/
│   └── signal-sdk/
├── .env
├── package.json
└── my-app.js
```

## Next Steps

**IMPORTANT**: The next step is to link your device. This is a mandatory one-time setup.

**Continue to the [Device Linking Guide](./device-linking.md)**
