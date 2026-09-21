# Maintenance Guide

This project is split into a transport core and focused managers. Keeping that
boundary clear makes new signal-cli features easier to review and test.

## How the code is organized

```text
src/index.ts
  ├─ SignalCli              transport, lifecycle, JSON-RPC and public facade
  ├─ SignalBot              commands, message routing and bot lifecycle
  │  └─ bot/MediaManager    downloads, avatars and temporary-file cleanup
  ├─ MultiAccountManager    account collection and event routing
  ├─ managers/              domain operations built on one RPC callback
  ├─ validators.ts          input and security validation
  ├─ retry.ts               retry, circuit breaker and rate limiting
  ├─ config.ts              defaults and logging
  └─ interfaces.ts          public TypeScript contract
```

`SignalCli` owns the connection and delegates domain work to managers. A new
Signal operation should normally live in the relevant manager, then be exposed
by the `SignalCli` facade when that keeps the public API consistent. Keep
JSON-RPC parameter shaping in one place; do not duplicate it in examples or
bots.

`SignalBot` remains the public facade for bot applications, while media
handling lives in `bot/MediaManager`. Keep network downloads, size limits and
temporary-file cleanup in that component; keep commands, message routing and
Signal lifecycle decisions in `SignalBot`. This separation lets media edge
cases be tested without starting a Signal daemon.

SignalBot event handlers are attached once per running lifecycle and detached
on stop. Preserve this rule when adding new Signal events to avoid duplicate
message processing after a restart.

## Safe change workflow

1. Update the public interface and the manager implementation together.
2. Add one happy-path test and one validation or transport-failure test.
3. For lifecycle changes, add a regression test with fake timers for reconnects,
   queues, or cleanup.
4. Update the relevant guide and API reference with a runnable example.
5. Run the quality gate:

   ```bash
   npm run check
   ```

For a release candidate, run `npm run release:check`. It repeats the quality
gate and validates the package contents with `npm pack --dry-run`.

For faster iteration, use `npm run build`, `npm run lint`, or
`npm run test:coverage` separately.

The latest local coverage run validated 664 tests across 32 suites:

| Scope | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| All files | 90.92% | 79.23% | 91.43% | 91.42% |
| `SignalBot.ts` | 87.21% | 63.44% | 92.30% | 87.68% |
| `bot/MediaManager.ts` | 97.05% | 90.47% | 100.00% | 96.96% |

These figures are a snapshot, not a second source of truth: rerun
`npm run test:coverage` after changes and inspect the generated report.

## Testing boundaries

- Unit tests mock `SignalCli` or the RPC callback and never need a real Signal
  account.
- Connection tests cover JSON-RPC stdio, Unix sockets, TCP, and HTTP with
  deterministic mocks.
- Bot tests assert emitted events, queued actions, cleanup, and error handling.
- Global coverage thresholds make a new low-coverage module visible immediately.

## Current limitations

- `sendMessageWithProgress()` reports simulated progress because signal-cli does
  not expose upload progress through JSON-RPC.
- `SignalBot` forwards `groupUpdate` events, but signal-cli does not provide a
  member join/leave diff in the notification. The old `welcomeNewMembers` option
  is retained only for source compatibility and has no effect.
- HTTP mode reconnects its SSE event stream when `autoReconnect` is enabled.
- Image downloads reject private literal addresses and enforce a 25 MB limit,
  but production deployments should still apply network egress controls for DNS
  rebinding protection.
- Logger output is console-based. Redirect process output when persistent logs
  are required.
