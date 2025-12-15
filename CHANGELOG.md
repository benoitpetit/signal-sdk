# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
