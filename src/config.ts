/**
 * Configuration management for Signal SDK
 * Provides centralized configuration with validation
 */

export interface SignalCliConfig {
    /** Path to signal-cli binary */
    signalCliPath?: string;
    /** Signal account phone number */
    account?: string;
    /** Connection timeout in milliseconds */
    connectionTimeout?: number;
    /** Request timeout in milliseconds */
    requestTimeout?: number;
    /** Enable retry on failures */
    enableRetry?: boolean;
    /** Maximum retry attempts */
    maxRetries?: number;
    /** Initial retry delay in milliseconds */
    retryDelay?: number;
    /** Enable detailed logging */
    verbose?: boolean;
    /** Rate limit: max concurrent requests */
    maxConcurrentRequests?: number;
    /** Rate limit: minimum interval between requests (ms) */
    minRequestInterval?: number;
    /** Auto-reconnect on connection loss */
    autoReconnect?: boolean;
    /** Trust new identities mode */
    trustNewIdentities?: 'on-first-use' | 'always' | 'never';
    /** Disable send log (for message resending) */
    disableSendLog?: boolean;
    /** Daemon connection mode: json-rpc (default), unix-socket, tcp, http */
    daemonMode?: 'json-rpc' | 'unix-socket' | 'tcp' | 'http';
    /** Unix socket path (for unix-socket mode) */
    socketPath?: string;
    /** TCP host (for tcp mode) */
    tcpHost?: string;
    /** TCP port (for tcp or http mode) */
    tcpPort?: number;
    /** HTTP base URL (for http mode) */
    httpBaseUrl?: string;
    /** Enable circuit breaker for JSON-RPC requests (fail-fast on repeated failures) */
    circuitBreakerEnabled?: boolean;
    /** Consecutive failures before the circuit breaker opens */
    circuitBreakerFailureThreshold?: number;
    /** Time in ms before an open circuit breaker allows probe requests */
    circuitBreakerResetTimeout?: number;
}

export const DEFAULT_CONFIG: Required<
    Omit<SignalCliConfig, 'socketPath' | 'tcpHost' | 'tcpPort' | 'httpBaseUrl'> & {
        socketPath: string;
        tcpHost: string;
        tcpPort: number;
        httpBaseUrl: string;
    }
> = {
    signalCliPath: '',
    account: '',
    connectionTimeout: 30000,
    requestTimeout: 60000,
    enableRetry: true,
    maxRetries: 3,
    retryDelay: 1000,
    verbose: false,
    maxConcurrentRequests: 5,
    minRequestInterval: 100,
    autoReconnect: true,
    trustNewIdentities: 'on-first-use',
    disableSendLog: false,
    daemonMode: 'json-rpc',
    socketPath: '/tmp/signal-cli.sock',
    tcpHost: 'localhost',
    tcpPort: 7583,
    httpBaseUrl: 'http://localhost:8080',
    circuitBreakerEnabled: false,
    circuitBreakerFailureThreshold: 5,
    circuitBreakerResetTimeout: 30000,
};

/**
 * Validates and merges configuration with defaults
 * @param userConfig User-provided configuration
 * @returns Validated configuration
 */
export function validateConfig(userConfig: SignalCliConfig = {}): Required<SignalCliConfig> {
    const config = { ...DEFAULT_CONFIG, ...userConfig };

    // Validate numeric values
    if (config.connectionTimeout < 0) {
        throw new Error('connectionTimeout must be non-negative');
    }

    if (config.requestTimeout < 0) {
        throw new Error('requestTimeout must be non-negative');
    }

    if (config.maxRetries < 0) {
        throw new Error('maxRetries must be non-negative');
    }

    if (config.retryDelay < 0) {
        throw new Error('retryDelay must be non-negative');
    }

    if (config.maxConcurrentRequests < 1) {
        throw new Error('maxConcurrentRequests must be at least 1');
    }

    if (config.minRequestInterval < 0) {
        throw new Error('minRequestInterval must be non-negative');
    }

    if (config.circuitBreakerFailureThreshold < 1) {
        throw new Error('circuitBreakerFailureThreshold must be at least 1');
    }

    if (config.circuitBreakerResetTimeout < 0) {
        throw new Error('circuitBreakerResetTimeout must be non-negative');
    }

    return config;
}

/**
 * Logger configuration and utilities
 */
export interface LoggerConfig {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableConsole: boolean;
    includeTimestamp: boolean;
    includeLevel: boolean;
    /** Redact phone numbers and other sensitive patterns from log output */
    redactSensitiveData?: boolean;
    /** Static structured context appended to every log entry (e.g. account, component) */
    context?: Record<string, unknown>;
}

export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
    level: 'info',
    enableConsole: true,
    includeTimestamp: true,
    includeLevel: true,
    redactSensitiveData: false,
};

/**
 * Simple logger implementation
 */
export class Logger {
    private config: LoggerConfig;
    private levels = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
    };

    constructor(config: Partial<LoggerConfig> = {}) {
        this.config = { ...DEFAULT_LOGGER_CONFIG, ...config };
    }

    private shouldLog(level: keyof typeof this.levels): boolean {
        return this.levels[level] >= this.levels[this.config.level];
    }

    /**
     * Create a child logger that inherits this logger's configuration
     * and adds static structured context to every entry.
     */
    child(context: Record<string, unknown>): Logger {
        return new Logger({
            ...this.config,
            context: { ...this.config.context, ...context },
        });
    }

    private redact(value: string): string {
        if (!this.config.redactSensitiveData) {
            return value;
        }
        // Redact E.164 phone numbers, keeping country code prefix and last 2 digits for diagnostics
        return value.replace(/\+(\d{1,3})\d{4,12}(\d{2})\b/g, '+$1***$2');
    }

    private format(level: string, message: string, data?: unknown): string {
        const parts: string[] = [];

        if (this.config.includeTimestamp) {
            parts.push(`[${new Date().toISOString()}]`);
        }

        if (this.config.includeLevel) {
            parts.push(`[${level.toUpperCase()}]`);
        }

        if (this.config.context && Object.keys(this.config.context).length > 0) {
            const contextStr = Object.entries(this.config.context)
                .map(([key, value]) => `${key}=${String(value)}`)
                .join(' ');
            parts.push(`[${this.redact(contextStr)}]`);
        }

        parts.push(this.redact(message));

        if (data !== undefined) {
            parts.push(this.redact(JSON.stringify(data, null, 2)));
        }

        return parts.join(' ');
    }

    debug(message: string, data?: unknown): void {
        if (this.shouldLog('debug') && this.config.enableConsole) {
            console.debug(this.format('debug', message, data));
        }
    }

    info(message: string, data?: unknown): void {
        if (this.shouldLog('info') && this.config.enableConsole) {
            console.info(this.format('info', message, data));
        }
    }

    warn(message: string, data?: unknown): void {
        if (this.shouldLog('warn') && this.config.enableConsole) {
            console.warn(this.format('warn', message, data));
        }
    }

    error(message: string, data?: unknown): void {
        if (this.shouldLog('error') && this.config.enableConsole) {
            console.error(this.format('error', message, data));
        }
    }
}
