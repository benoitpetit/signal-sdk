# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.8] - 2026-03-12

### Fixed - Critical Bugs

#### BUG-01: updateProfile() Parameter Fix
- **Breaking Change**: Renamed `name` parameter to `givenName` in `updateProfile()` to match signal-cli JSON-RPC specification
- signal-cli expects `givenName` and `familyName`, not `name`
- Previous implementation was silently failing as signal-cli doesn't recognize the `name` parameter

#### BUG-02: Duplicate ReceiveOptions Interface
- Removed duplicate `ReceiveOptions` interface declaration from `interfaces.ts`
- Removed unsupported `since?: number` field (not recognized by signal-cli)

#### BUG-03: Reconnection Options Preservation
- Fixed auto-reconnection in `handleProcessClose()` to preserve JSON-RPC options
- Now correctly passes `this.jsonRpcStartOptions` to `connect()` during reconnection
- Previously, reconnection would lose all flags (`ignoreAttachments`, `ignoreAvatars`, etc.)

#### PROB-04: trustIdentity() Parameter Fix
- **Breaking Change**: Fixed `trustIdentity()` to use `verifiedSafetyNumber` instead of `safetyNumber` + `verified`
- Removed `verified` parameter as signal-cli doesn't have a `--verified` flag
- Now matches signal-cli's expected parameter format

#### PROB-06: listContacts() Options Support
- `listContacts()` now accepts optional `ListContactsOptions` parameter
- Supports: `detailed`, `blocked`, `allRecipients`, `name`, `recipients`, `internal`

#### PROB-07: parseEnvelope() Text Attachment Support
- Added support for `textAttachment` in `parseEnvelope()` (v0.14.0+)
- Long messages are now correctly parsed from `data.textAttachment.text`

#### PROB-08: AccountConfiguration Cleanup
- Removed unsupported fields from `AccountConfiguration` interface:
  - `keepMutedChatsArchived`
  - `universalExpireTimer`
  - `phoneNumberSharingMode`
  - `phoneNumberDiscoverability`
- signal-cli only supports: `readReceipts`, `unidentifiedDeliveryIndicators`, `typingIndicators`, `linkPreviews`

### Added - New Features

#### FEAT-09: isArchived Field
- Added `isArchived?: boolean` to `GroupInfo` interface (v0.14.1+)
- Added `isArchived?: boolean` to `Contact` interface for consistency

#### FEAT-10: quitGroup() Delete Option
- `quitGroup()` now accepts optional `options?: { delete?: boolean }` parameter
- When `delete: true`, local group data is also deleted when quitting

#### FEAT-11: Pin/Unpin Events
- Added `'pin'` event emission in `emitDetailedEvents()` for message pinning
- Event is triggered when `envelope.dataMessage.pinnedMessageTimestamps` is present
- Added `pinnedMessageTimestamps?: number[]` to `Message` interface

#### FEAT-12: Register Reregister Option
- `register()` now accepts optional `reregister?: boolean` parameter
- Allows forcing re-registration of an already registered number

### Changed

#### GroupInfo Interface Unification (MINOR-17)
- **Breaking Change**: `GroupInfo` members now use `string[]` instead of `Address[]`
- Fields affected: `members`, `pendingMembers`, `requestingMembers`, `admins`, `banned`
- The `Address` interface is deprecated and will be removed in a future version
- This aligns `GroupInfo` with the actual signal-cli JSON-RPC response format

#### Updated Dependencies
- signal-cli version bumped to 0.14.1 in `install.js`
- Updated Java requirement from JDK 17+ to JDK 25+ in documentation

#### Documentation Updates
- Added clear documentation about `sendMessageWithProgress()` simulated progress
- Documented that progress callback provides artificial progress (0-100 in steps of 10)
- Real-time upload progress is not available via JSON-RPC

### Deprecated

#### StoryOptions Interface (FEAT-13)
- Marked `StoryOptions` interface as `@deprecated`
- No `sendStory()` method is currently implemented
- Interface kept for potential future implementation

### Additional Fixes (Post-analysis)
- **JsonRpcStartOptions**: Added `'on-connection'` value for `receiveMode`
- **quitGroup()**: Added `admins?: string[]` option to designate new admins before quitting (required when user is the only admin)
- **ContactManager**: Added `trustAllKnownKeys()` method for testing purposes
- **GroupUpdateOptions**: Added `linkState`, `memberLabelEmoji`, and `memberLabel` options
- **PinMessageOptions**: Added `story?: boolean` option

### Compatibility
- Updated for signal-cli v0.14.1 compatibility
- 468 passing unit and integration tests
- **Note**: This release contains breaking changes for `updateProfile()` and `trustIdentity()`

## [0.1.3] - 2026-01-31

### Added - Full Feature Parity with signal-cli v0.13.23

#### Story Interactions
- Support for story reactions in `sendReaction()` via the `isStory` parameter
- Updated `JsonRpcReactionParams` with `story` field support

#### Enhanced Link Previews
- Added comprehensive link preview fields to `sendMessage()`: `previewTitle`, `previewDescription`, and `previewImage`
- Allows manual specification of link preview metadata for better control

#### Advanced Contact Management
- Expanded `updateContact()` with support for multiple new fields:
  - `givenName` and `familyName`
  - `nickGivenName` and `nickFamilyName`
  - `note` (contact notes)
  - `expiration` (disappearing messages timer per contact)

#### Profile Management Improvements
- Updated `updateProfile()` with new options:
  - `familyName` support
  - `mobileCoinAddress` for Signal payments
  - `removeAvatar` flag for easier profile management

### Changed
- Improved type definitions in `interfaces.ts` to reflect the latest signal-cli JSON-RPC specifications
- Refactored `ContactManager.updateContact()` to use a more flexible parameter structure
- Updated `MessageManager.sendMessage()` to handle full link preview metadata

### Compatibility
- Achieves 100% parameter coverage for core signal-cli v0.13.23 JSON-RPC methods
- Fully backward compatible with version 0.1.2
- Verified with 393 passing unit and integration tests

## [0.1.2] - 2026-01-26

### Added - signal-cli v0.13.23 Compatibility

#### Device Management Enhancement

- `updateDevice()` - Update linked device names (new in signal-cli v0.13.23)
- New interface `UpdateDeviceOptions` with `deviceId` and `deviceName` parameters
