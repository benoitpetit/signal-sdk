# Documentation Overview

This documentation is organized around the lifecycle of a Signal SDK integration.

## Start Here

1. [Installation & Setup](./installation.md) — install the SDK, signal-cli v0.14.8, and the required Java runtime.
2. [Device Linking](./device-linking.md) — link a Signal account before sending or receiving messages.
3. [Getting Started](./getting-started.md) — create a client and send a first message.
4. [Examples Guide](./examples-guide.md) — run the included SDK and bot examples.

## Reference and Guides

- [API Reference](./api-reference.md) — public classes, methods, options, events, and types.
- [Advanced Features](./advanced-features.md) — messaging, accounts, groups, polls, and daemon modes.
- [SignalBot Framework](./signalbot-framework.md) — commands, permissions, lifecycle, and middleware.
- [Robust Infrastructure](./robust-infrastructure.md) — validation, retrying, rate limiting, logging, and configuration.
- [Troubleshooting](./troubleshooting.md) — common installation and runtime failures.
- [FAQ](./faq.md) — concise answers to frequently asked questions.

## Current Compatibility

SDK v0.2.6 is aligned with signal-cli v0.14.8. On macOS and Windows, the bundled JVM distribution requires Java 25 or later. Linux uses the native signal-cli binary installed by the package post-install script.

## Keeping Documentation Accurate

Documentation describes the published API and intentionally avoids historical test counts and implementation-phase labels. Before a release, verify the examples, API reference, changelog, and installation requirements against the current package version.
