# Test organization

The test suite is grouped by responsibility through stable file names. All
tests remain deterministic and use mocked transports unless a test is
explicitly marked as a future live integration test.

## Focused commands

```bash
npm test                  # Run the complete suite
npm run test:signal-cli  # SignalCli transports, API and compatibility
npm run test:bot         # SignalBot and MediaManager
npm run test:managers    # Domain managers and multi-account behavior
npm run test:watch       # Iterate interactively
npm run test:coverage    # Coverage report
```

## Naming rules

- `SignalCli.core.test.ts`, `basic.test.ts`, `api.test.ts`: public facade behavior.
- `SignalCli.transport.test.ts`: stdio, Unix socket, TCP, HTTP and lifecycle behavior.
- `SignalCli.workflows.test.ts`: multi-step mocked workflows.
- `SignalCli.v*.test.ts` and `signal-cli-*.test.ts`: upstream compatibility contracts.
- `SignalBot.features.test.ts` and `SignalBot.lifecycle.test.ts`: bot behavior and lifecycle.
- `manager-regressions.test.ts`: cross-manager regression coverage that does not belong to one domain.
- Focused domain files such as `validators.test.ts`, `retry.test.ts` and `MediaManager.test.ts` cover one module.

Keep new tests close to the behavior they protect. Add a compatibility suite
only when the behavior is tied to an upstream signal-cli version or response
shape.
