# Robust Infrastructure

The Signal SDK includes enterprise-grade features for reliable applications. This guide covers the robust infrastructure that ensures reliability, performance, and maintainability.

## Table of Contents

- [Error Handling](#error-handling)
- [Retry Mechanism](#retry-mechanism)
- [Rate Limiting](#rate-limiting)
- [Input Validation](#input-validation)
- [Logging System](#logging-system)
- [Configuration Management](#configuration-management)
- [Best Practices](#best-practices)

---

## Error Handling

The SDK provides a comprehensive error hierarchy for precise error handling and debugging.

### Error Types

```typescript
import {
  SignalError, // Base error class
  ConnectionError, // Network/connection issues
  AuthenticationError, // Authentication failures
  RateLimitError, // Rate limiting errors
  ValidationError, // Input validation failures
  TimeoutError, // Operation timeouts
  GroupError, // Group operation errors
  MessageError, // Message sending errors
} from "signal-sdk";
```

### Error Handling Patterns

```typescript
import { SignalCli, ConnectionError, ValidationError } from "signal-sdk";

const signal = new SignalCli("+1234567890");

try {
  await signal.sendMessage(recipient, message);
} catch (error) {
  if (error instanceof ConnectionError) {
    console.error("Connection failed:", error.message);
    // Implement reconnection logic
  } else if (error instanceof ValidationError) {
    console.error("Invalid input:", error.message);
    // Handle validation error
  } else if (error instanceof RateLimitError) {
    console.error("Rate limited:", error.message);
    console.log("Retry after:", error.retryAfter);
    // Wait and retry
  } else {
    console.error("Unknown error:", error);
  }
}
```

### Error Properties

All errors extend `SignalError` with these properties:

- `message`: Human-readable error description
- `code`: Error code for programmatic handling
- `details`: Additional error context
- `originalError`: Original error if wrapped

---

## Retry Mechanism

Automatic retry with exponential backoff for transient failures.

### Configuration

```typescript
import { SignalCli } from "signal-sdk";

const signal = new SignalCli("+1234567890", undefined, {
  retryConfig: {
    maxAttempts: 5, // Maximum retry attempts
    initialDelay: 1000, // Initial delay in ms
    maxDelay: 60000, // Maximum delay in ms
    backoffMultiplier: 2, // Exponential backoff multiplier
    timeout: 30000, // Operation timeout in ms
  },
});
```

### Retry Strategy

The SDK automatically retries on:

- Connection errors
- Timeout errors
- Server errors (5xx)

Does NOT retry on:

- Validation errors (client-side)
- Authentication errors
- Rate limit errors (uses rate limiter instead)

### Custom Retry Logic

```typescript
import { withRetry } from "signal-sdk";

// Custom operation with retry
const result = await withRetry(
  async () => {
    return await someOperation();
  },
  {
    maxAttempts: 3,
    initialDelay: 500,
    onRetry: (attempt, error) => {
      console.log(`Retry attempt ${attempt}: ${error.message}`);
    },
  },
);
```

### Timeout Handling

```typescript
import { withTimeout, TimeoutError } from "signal-sdk";

try {
  const result = await withTimeout(
    signal.sendMessage(recipient, message),
    10000, // 10 second timeout
  );
} catch (error) {
  if (error instanceof TimeoutError) {
    console.error("Operation timed out");
  }
}
```

---

## Rate Limiting

Client-side rate limiting prevents hitting Signal API limits.

### Configuration

```typescript
import { SignalCli } from "signal-sdk";

const signal = new SignalCli("+1234567890", undefined, {
  rateLimiter: {
    maxConcurrent: 5, // Maximum concurrent operations
    minInterval: 200, // Minimum interval between requests (ms)
  },
});
```

### Rate Limiter Usage

```typescript
import { RateLimiter } from "signal-sdk";

// Create custom rate limiter
const limiter = new RateLimiter(3, 500); // 3 concurrent, 500ms interval

// Execute operations with rate limiting
const results = await Promise.all([
  limiter.execute(() => signal.sendMessage(user1, "Hello")),
  limiter.execute(() => signal.sendMessage(user2, "Hello")),
  limiter.execute(() => signal.sendMessage(user3, "Hello")),
  limiter.execute(() => signal.sendMessage(user4, "Hello")),
  limiter.execute(() => signal.sendMessage(user5, "Hello")),
]);

// Only 3 will execute concurrently, with 500ms between batches
```

### Bulk Operations

```typescript
const recipients = ["+1111111111", "+2222222222", "+3333333333" /* ... */];

// Rate limiter automatically handles batching
for (const recipient of recipients) {
  await signal.sendMessage(recipient, "Bulk message");
  // Automatically rate-limited
}
```

---

## Input Validation

Comprehensive input validation prevents errors before API calls.

### Validation Functions

```typescript
import {
  validatePhoneNumber,
  validateGroupId,
  validateRecipient,
  validateMessage,
  validateTimestamp,
  validateEmoji,
  sanitizeInput,
} from "signal-sdk";

// Validate phone number (E.164 format)
try {
  validatePhoneNumber("+1234567890");
} catch (error) {
  console.error("Invalid phone number:", error.message);
}

// Validate recipient (phone, UUID, or username)
validateRecipient("+1234567890");
validateRecipient("john.doe");
validateRecipient("uuid:abc-123-def");

// Validate and sanitize message
const message = "  Hello <script>alert('xss')</script>  ";
const safe = sanitizeInput(message);
validateMessage(safe);

// Validate emoji for reactions
validateEmoji("👍"); // Valid
validateEmoji("test"); // Throws ValidationError
```

### Automatic Validation

All SDK methods automatically validate inputs:

```typescript
// These throw ValidationError if inputs are invalid
await signal.sendMessage("invalid", "message"); // Throws
await signal.sendReaction(recipient, author, -1, "invalid"); // Throws
await signal.createGroup("", []); // Throws (empty name)
```

---

## Logging System

Professional structured logging for debugging and monitoring.

### Logger Configuration

```typescript
import { Logger, SignalCli } from "signal-sdk";

// Create logger with level
const logger = new Logger("debug"); // Levels: debug, info, warn, error

// Use with SignalCli
const signal = new SignalCli("+1234567890", undefined, {
  logger: logger,
});
```

### Log Levels

```typescript
const logger = new Logger("info");

logger.debug("Detailed debug information"); // Not shown (below 'info')
logger.info("Informational message"); // Shown
logger.warn("Warning message"); // Shown
logger.error("Error occurred", { error: err }); // Shown
```

### Custom Logging

```typescript
// Implement custom logger
class CustomLogger extends Logger {
  log(level: string, message: string, meta?: any): void {
    // Send to external logging service
    externalService.log({
      timestamp: new Date(),
      level,
      message,
      meta,
    });
  }
}

const signal = new SignalCli("+1234567890", undefined, {
  logger: new CustomLogger("info"),
});
```

### Log Output

```
[2024-01-21T10:30:45.123Z] [INFO] - Connecting to signal-cli daemon
[2024-01-21T10:30:45.456Z] [INFO] - Connected successfully
[2024-01-21T10:30:46.789Z] [DEBUG] - Sending message to +1234567890
[2024-01-21T10:30:47.012Z] [WARN] - Rate limit approaching, throttling
[2024-01-21T10:30:50.345Z] [ERROR] - Connection failed, retrying...
```

---

## Configuration Management

Centralized configuration for all SDK settings.

### Complete Configuration

```typescript
import { SignalCli, Logger, validateConfig } from "signal-sdk";

const config = {
  // Retry configuration
  retryConfig: {
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 60000,
    backoffMultiplier: 2,
    timeout: 30000,
  },

  // Rate limiting
  rateLimiter: {
    maxConcurrent: 5,
    minInterval: 200,
  },

  // Logging
  logger: new Logger("info"),

  // Global timeout
  timeout: 30000,
};

// Validate configuration
validateConfig(config);

// Use configuration
const signal = new SignalCli("+1234567890", undefined, config);
```

### Environment-Based Configuration

```typescript
const config = {
  retryConfig: {
    maxAttempts: process.env.NODE_ENV === "production" ? 5 : 2,
    initialDelay: 1000,
    maxDelay: process.env.NODE_ENV === "production" ? 60000 : 10000,
  },
  rateLimiter: {
    maxConcurrent: process.env.NODE_ENV === "production" ? 10 : 3,
  },
  logger: new Logger(process.env.LOG_LEVEL || "info"),
};
```

---

## Best Practices

### 1. Always Use Configuration in Production

```typescript
// Don't: Use defaults in production
const signal = new SignalCli("+1234567890");

// Do: Configure for production
const signal = new SignalCli("+1234567890", undefined, {
  retryConfig: { maxAttempts: 5 },
  rateLimiter: { maxConcurrent: 10 },
  logger: new Logger("info"),
});
```

### 2. Handle Errors Gracefully

```typescript
// Don't: Ignore errors
await signal.sendMessage(recipient, message).catch(() => {});

// Do: Handle specific errors
try {
  await signal.sendMessage(recipient, message);
} catch (error) {
  if (error instanceof RateLimitError) {
    await sleep(error.retryAfter);
    await signal.sendMessage(recipient, message);
  } else {
    logger.error("Failed to send message", { error });
    throw error;
  }
}
```

### 3. Validate Inputs Early

```typescript
// Don't: Let API calls fail
await signal.sendMessage(userInput, message);

// Do: Validate first
try {
  validatePhoneNumber(userInput);
  const sanitized = sanitizeInput(message);
  await signal.sendMessage(userInput, sanitized);
} catch (error) {
  if (error instanceof ValidationError) {
    return "Invalid input, please check your data";
  }
  throw error;
}
```

### 4. Use Structured Logging

```typescript
// Don't: Use console.log
console.log("Sending message to", recipient);

// Do: Use logger with context
logger.info("Sending message", {
  recipient: recipient,
  messageLength: message.length,
  hasAttachments: options.attachments?.length > 0,
});
```

### 5. Monitor Rate Limits

```typescript
// Track rate limit metrics
const limiter = new RateLimiter(5, 200);

let requestCount = 0;
const originalExecute = limiter.execute.bind(limiter);

limiter.execute = async (operation) => {
  requestCount++;
  if (requestCount % 100 === 0) {
    logger.info("Rate limiter stats", { requestCount });
  }
  return originalExecute(operation);
};
```

### 6. Implement Health Checks

```typescript
async function healthCheck(signal: SignalCli): Promise<boolean> {
  try {
    // Test connection
    await withTimeout(signal.listAccounts(), 5000);
    return true;
  } catch (error) {
    logger.error("Health check failed", { error });
    return false;
  }
}

// Periodic health checks
setInterval(async () => {
  const healthy = await healthCheck(signal);
  if (!healthy) {
    // Reconnect or alert
    await signal.disconnect();
    await signal.connect();
  }
}, 60000); // Every minute
```

### 7. Graceful Shutdown

```typescript
// Handle shutdown signals
process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM, shutting down gracefully");
  await signal.gracefulShutdown();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("Received SIGINT, shutting down gracefully");
  await signal.gracefulShutdown();
  process.exit(0);
});
```

---

## Deployment Checklist

- [ ] Configure retry with appropriate max attempts
- [ ] Set up rate limiting for your use case
- [ ] Implement comprehensive error handling
- [ ] Use structured logging with appropriate levels
- [ ] Validate all user inputs
- [ ] Monitor health and performance metrics
- [ ] Implement graceful shutdown
- [ ] Set reasonable timeouts
- [ ] Test error scenarios
- [ ] Document your configuration

---

## Next Steps

- Review [API Reference](./api-reference.md) for all available methods
- Check [Advanced Features](./advanced-features.md) for specific use cases
- See [IMPROVEMENTS.md](../IMPROVEMENTS.md) for feature details
- Read [IMPROVEMENTS.md](../IMPROVEMENTS.md) for feature details
