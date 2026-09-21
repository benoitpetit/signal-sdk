# signal-cli Compatibility

This document compares the `signal-sdk` TypeScript facade with the commands and
JSON-RPC methods exposed by signal-cli. The reference is the upstream
`AsamK/signal-cli` repository and its manuals, checked on September 21, 2026.

## Supported Features

| signal-cli domain | SDK API | Status |
| --- | --- | --- |
| Message sending, attachments, quotes, mentions, styles, stickers and expiring messages | `sendMessage`, `sendMessageWithProgress` | Covered |
| Reactions, typing indicators, remote deletion and receipts | `sendReaction`, `sendTyping`, `remoteDeleteMessage`, `sendReceipt` | Covered |
| Receiving and polling | `receive`, `connect`, `message`, `typing`, `receipt`, `story` events | Covered |
| Stories, deletion and pinned-message management | `sendStory`, `deleteStory`, `pinMessage`, `unpinMessage` | Covered |
| Groups: creation, updates, members, administrators, bans, links, expiration and leaving | `createGroup`, `updateGroup`, `listGroups`, `joinGroup`, `quitGroup`, `terminateGroup` | Covered |
| Contacts, registration status, blocking, removal and identities | `listContacts`, `updateContact`, `getUserStatus`, `block`, `unblock`, `listIdentities`, `trustIdentity` | Covered |
| Profiles and avatars | `updateProfile`, `getAvatar`, profile helpers | Covered |
| Accounts, registration, verification, PIN, number changes and configuration | `register`, `verify`, `setPin`, `removePin`, `startChangeNumber`, `finishChangeNumber` | Covered |
| Linked devices and QR-code linking | `listDevices`, `addDevice`, `removeDevice`, `updateDevice`, `deviceLink`, `link`, `startLink`, `finishLink` | Covered |
| Sticker packs and media downloads | `listStickerPacks`, `addStickerPack`, `uploadStickerPack`, `getSticker`, `getAttachment` | Covered |
| Synchronization and message requests | `sendSyncRequest`, `sendContacts`, `sendMessageRequestResponse` | Covered |
| Payments and rate-limit challenges | `sendPaymentNotification`, `submitRateLimitChallenge` | Covered for individual recipients |
| Calls | `startCall`, `acceptCall`, `hangUpCall`, `sendCallRelayCandidates`, `listCalls`, `rejectCall` | Covered |
| HTTP daemon events | `daemonMode: 'http'`, automatic `/api/v1/events` consumption | Covered |

Upstream responses that exist in multiple shapes are normalized by the
managers. Account, status, identity, group and device lists are converted to
the public SDK interfaces, keeping version differences out of application code.

`listAccounts()` uses the ACI when a local account has no phone number.
`listAccountsDetailed()` preserves `number: null` and exposes `aci`, matching
signal-cli.

`register()` and `verify()` run the signal-cli commands directly because the
upstream JSON-RPC manual excludes those commands. `link()` follows the same
direct CLI path, while `startLink()` and `finishLink()` use the documented
multi-account JSON-RPC flow.

## Known Gaps

- The SDK provides JSON-RPC over stdin/stdout, Unix sockets, TCP and HTTP. The
  native D-Bus transport is not exposed as a dedicated transport. HTTP mode
  consumes signal-cli's `/api/v1/events` SSE stream automatically and retries
  the stream when `autoReconnect` is enabled.
- `sendMessageWithProgress()` reports simulated progress because JSON-RPC does
  not provide real-time attachment upload progress.
- Upstream payment notifications accept an individual recipient. The SDK
  therefore rejects group identifiers explicitly.
- `receiveMessages()` and `startDaemon()` remain deprecated aliases, but they
  delegate to the modern path instead of returning an empty result.

## D-Bus decision

D-Bus can add value for a Linux desktop or systemd integration that already
depends on a session or system bus. It exposes native signals for received
messages, sync messages and receipts, and provides an object-oriented API for
some account, device and group operations.

It is intentionally not part of the core SDK at this time. The upstream
interface is marked experimental, is Linux-specific, and uses D-Bus-specific
types such as object paths, structs and byte arrays for group identifiers.
Supporting it in the core would duplicate the JSON-RPC managers and add a
second lifecycle and event-mapping surface to maintain. The existing JSON-RPC
transports are cross-platform and cover the supported SDK feature set.

If a real Linux desktop or systemd use case appears, the maintainable path is
an optional adapter package with an explicit D-Bus dependency, Linux-only
contract tests, and conversions into the existing manager interfaces. This
keeps the default SDK small without closing the door on D-Bus integration.

## Upstream Update Checklist

1. Check JSON-RPC field names before changing a public interface. For example,
   verification uses `verificationCode`, groups use `id`, and devices use
   `createdTimestamp`/`lastSeenTimestamp`.
2. Add a contract test for the upstream response and a compatibility test for
   any still-supported legacy shape.
3. Update this table and `docs/api-reference.md` in the same change.
4. Run `npm run test:coverage`, `npm run lint` and `npm run build`.

The [upstream JSON-RPC documentation](https://github.com/AsamK/signal-cli/blob/master/man/signal-cli-jsonrpc.5.adoc),
[D-Bus manual](https://github.com/AsamK/signal-cli/blob/master/man/signal-cli-dbus.5.adoc)
and [CLI manual](https://github.com/AsamK/signal-cli/blob/master/man/signal-cli.1.adoc)
remain the references for supported options and versions.
