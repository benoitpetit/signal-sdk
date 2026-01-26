# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2026-01-26

### Added - signal-cli v0.13.23 Compatibility

#### Device Management Enhancement

- `updateDevice()` - Update linked device names (new in signal-cli v0.13.23)
- New interface `UpdateDeviceOptions` with `deviceId` and `deviceName` parameters
- Comprehensive example in `examples/sdk/19-device-management.js`

### Changed

- **Updated signal-cli compatibility to v0.13.23**
- Updated installation script to download signal-cli v0.13.23 binaries
- Updated all documentation references to signal-cli v0.13.23
- Enhanced device management capabilities

### Improved

- Better device management with name update support
- Improved multi-device account support
- Updated tests to cover new updateDevice() functionality

### Compatibility

- Maintains 100% feature coverage with signal-cli v0.13.23
- All existing poll features (sendPollCreate, sendPollVote, sendPollTerminate) remain fully functional
- Backward compatible with existing code

## [0.1.0] - 2026-01-22

### Major Release - Enhanced Features

This major version brings significant improvements with 100% signal-cli feature coverage and robust infrastructure.

### Added - New Features

#### Polls

- `sendPollCreate()` - Create polls with multiple options
- `sendPollVote()` - Vote on existing polls
- `sendPollTerminate()` - Close/terminate a poll

#### Advanced Attachment Management

- `getAttachment()` - Retrieve attachments in base64
- `getAvatar()` - Retrieve avatars (contact, profile, group)
- `getSticker()` - Retrieve sticker data

#### Enhanced Account Management

- `updateAccount()` - Complete account update (username, device name, privacy)
- `listAccountsDetailed()` - Detailed list of all local accounts

#### Synchronization

- `sendContacts()` - Synchronize contacts with linked devices
- `listGroupsDetailed()` - List groups with filtering and details

#### Robust Error Handling System

- Typed error hierarchy: `SignalError`, `ConnectionError`, `AuthenticationError`, `RateLimitError`, `ValidationError`, `TimeoutError`, `GroupError`, `MessageError`
- Errors with codes and detailed context

#### Retry and Resilience

- `withRetry()` - Utility for retry with exponential backoff
- `withTimeout()` - Wrapper for timeouts
- Global and per-operation retry configuration

#### Client-Side Rate Limiting

- `RateLimiter` - Class to limit concurrent requests
- Automatic protection against Signal rate limits

#### Input Validation

- Strict validation of all inputs
- Reusable validation functions
- User input sanitization

#### Centralized Configuration

- `SignalCliConfig` interface for complete configuration
- Automatic configuration validation

#### Structured Logging

- Configurable `Logger` class with levels
- Console and file support

### 📚 Documentation

- Comprehensive documentation in `docs/` folder with 13 guides
- Complete API reference with corrected method signatures
- Updated all documentation to require Node.js 18+ (aligned with package.json)
- Fixed API documentation inconsistencies (sendPollVote, sendPollTerminate)
- Corrected all example phone numbers to valid E.164 format
- Updated getting started guide, installation guide, and troubleshooting guide

### 🧪 Tests

- **225 passing tests** across 9 test suites
- **57.52% overall code coverage**
- Module coverage: validators (100%), config (100%), errors (100%), retry (96.15%), SignalCli (68.68%), SignalBot (24.33%)
- Comprehensive test suites: validators, config, errors, retry, SignalCli core, integration, methods, SignalBot core and additional features

### 🔧 Fixed

- **Phone Number Validation**: All examples now use valid E.164 international format
- **API Documentation**: Corrected sendPollVote signature (pollAuthor, pollTimestamp, optionIndexes)
- **API Documentation**: Corrected sendPollTerminate signature (pollTimestamp in options)
- **Node.js Version**: Unified requirement to 18+ across all documentation (README, docs, examples)
- **Code Examples**: Fixed poll voting examples with correct parameters in 08-polls.js
- **Example Code**: Corrected 3 invalid phone numbers (+0xxx) to valid E.164 format in SDK examples

### 📝 Improvements

- Uniformized README with consistent professional tone
- Updated README badges to reflect current test statistics (225 tests, 57.52% coverage)
- Improved quality metrics presentation without version-specific language
- Consistent E.164 phone number format (+33xxx) throughout all examples and documentation

---

## [0.0.9] - 2026-01-21

### Fixed

- **Issue #6**: Removed unused dependency `duckduckgo-chat-interface` from package.json
- **Issue #5**: Fixed missing "dist" folder in published npm package by adding prepublishOnly script
- **Issue #2**: Fixed UTF-8 character encoding for non-ASCII characters (accents, emojis) in messages
- **Issue #1**: Fixed signal-cli pairing and connection issues with improved error handling

### Technical Changes

- Updated package.json to include only necessary dependencies
- Added build step before publishing to ensure dist folder is present
- Improved character encoding handling for international characters
- Enhanced device linking process reliability

---

## [0.0.8]

### Fixed

- **Windows Path Handling**: Fixed execution issues on Windows when signal-cli path contains spaces by properly quoting paths in cmd.exe calls
- **UTF-8 Encoding**: Fixed character encoding issues for non-ASCII characters (accents, emojis) in messages by explicitly using UTF-8 encoding for data streams
- **Device Linking**: Improved Windows compatibility for device linking process
- **Cross-platform Compatibility**: Enhanced reliability across Windows, macOS, and Linux platforms

### Technical Changes

- Updated spawn calls to use quoted paths on Windows: `spawn('cmd.exe', ['/c', '"path with spaces"'])`
- Changed data stream handling to use UTF-8 encoding: `data.toString('utf8')`
- Updated unit tests to reflect Windows path quoting behavior

## [0.0.7]

### Updated

- **Updated signal-cli compatibility to v0.13.22**
- Enhanced JSON-RPC handling for file lock conflicts (improved stability)
- Added support for `isExpirationUpdate` field in message serialization

### Fixed

- Updated installation script to download signal-cli v0.13.22 binaries
- Improved Windows compatibility by using npm tar package instead of system tar command (fixes long path issues)

### Technical Changes

- Updated bundled signal-cli binaries to v0.13.22
- Added `isExpirationUpdate?: boolean` to Message interface for complete JSON-RPC compatibility
- Improved error handling for concurrent access scenarios

### Compatibility

- Maintains 100% feature coverage with signal-cli v0.13.22
- All existing APIs remain functional and compatible
- Backward compatible with previous versions

## [0.0.6]

### Updated

- **Updated signal-cli compatibility to v0.13.18**
- Enhanced error handling and connection stability based on upstream improvements
- Improved rate limit handling for username queries
- Better error messages for missing pre-keys and account verification failures

### Fixed

- Fixed signal-cli installation script to correctly extract binaries
- Corrected signal-cli binary path resolution for cross-platform compatibility
- Fixed automatic permission setting for signal-cli executable

### Technical Changes

- Updated bundled signal-cli binaries to v0.13.18
- Improved daemon connection management and shutdown handling
- Fixed installation script to use system tar command for better compatibility
- Updated binary paths from `bin/bin/signal-cli` to `bin/signal-cli` to match actual archive structure

### Compatibility

- Maintains 100% feature coverage with signal-cli v0.13.18
- All existing APIs remain functional and compatible
- View-once message support already implemented and working
- Username support in getUserStatus method already implemented and working

## [0.0.5] - Previous Release

### Added

- Complete signal-cli v0.13.17 compatibility
- 100% feature coverage including all JSON-RPC methods
- View-once message support
- Advanced user status checking with username support
- Comprehensive bot framework
- File attachment handling
- Group management capabilities
- Contact management features
- Payment notification support
- Custom sticker pack management

### Features

- TypeScript support with full type definitions
- JSON-RPC communication with signal-cli daemon
- Real-time message and event handling
- Built-in command system for bots
- Admin controls and permissions
- Cross-platform compatibility (Linux, macOS, Windows)
- Automatic signal-cli binary installation
- Device linking CLI tools
