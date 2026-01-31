/**
 * Multi-Account Manager for Signal SDK
 *
 * Manages multiple Signal accounts simultaneously with event routing
 * and isolated process management.
 */

import { SignalCli } from './SignalCli';
import { EventEmitter } from 'events';
import { Message } from './interfaces';
import { Logger, SignalCliConfig } from './config';

/**
 * Configuration for a managed account
 */
export interface ManagedAccount {
    /** Account phone number */
    account: string;
    /** SignalCli instance */
    instance: SignalCli;
    /** Whether the account is connected */
    connected: boolean;
    /** Last activity timestamp */
    lastActivity: number;
}

/**
 * Options for MultiAccountManager
 */
export interface MultiAccountOptions {
    /** Path to signal-cli executable */
    signalCliPath?: string;
    /** Data directory for all accounts */
    dataPath?: string;
    /** Enable verbose logging */
    verbose?: boolean;
    /** Auto-reconnect on failure */
    autoReconnect?: boolean;
}

/**
 * Multi-Account Manager
 *
 * Manages multiple Signal accounts with event routing and lifecycle management.
 *
 * @example
 * ```typescript
 * const manager = new MultiAccountManager({
 *   dataPath: '/path/to/data',
 *   autoReconnect: true
 * });
 *
 * // Add accounts
 * await manager.addAccount('+33123456789');
 * await manager.addAccount('+33987654321');
 *
 * // Listen to events from all accounts
 * manager.on('message', (account, message) => {
 *   console.log(`Message from ${account}: ${message.text}`);
 * });
 *
 * // Connect all accounts
 * await manager.connectAll();
 *
 * // Send from specific account
 * await manager.sendMessage('+33123456789', '+33111111111', 'Hello!');
 * ```
 */
export class MultiAccountManager extends EventEmitter {
    private accounts: Map<string, ManagedAccount> = new Map();
    private options: MultiAccountOptions;
    private logger: Logger;

    constructor(options: MultiAccountOptions = {}) {
        super();
        this.options = options;
        this.logger = new Logger({
            level: options.verbose ? 'debug' : 'info',
            enableFile: false,
        });

        this.logger.info('MultiAccountManager initialized');
    }

    /**
     * Add an account to the manager
     *
     * @param account - Phone number of the account
     * @param config - Optional SignalCli configuration
     * @returns The SignalCli instance
     */
    async addAccount(account: string, config: Partial<SignalCliConfig> = {}): Promise<SignalCli> {
        if (this.accounts.has(account)) {
            throw new Error(`Account ${account} already exists`);
        }

        this.logger.info(`Adding account: ${account}`);

        // Create SignalCli instance with merged config
        const signalConfig: SignalCliConfig = {
            signalCliPath: this.options.signalCliPath,
            verbose: this.options.verbose,
            ...config,
        };

        const instance = new SignalCli(account, undefined, signalConfig);

        // Forward events from this instance
        this.setupEventForwarding(account, instance);

        // Store the managed account
        const managedAccount: ManagedAccount = {
            account,
            instance,
            connected: false,
            lastActivity: Date.now(),
        };

        this.accounts.set(account, managedAccount);
        this.emit('accountAdded', account);

        this.logger.info(`Account ${account} added successfully`);
        return instance;
    }

    /**
     * Remove an account from the manager
     *
     * @param account - Phone number of the account
     */
    async removeAccount(account: string): Promise<void> {
        const managedAccount = this.accounts.get(account);
        if (!managedAccount) {
            throw new Error(`Account ${account} not found`);
        }

        this.logger.info(`Removing account: ${account}`);

        // Disconnect if connected
        if (managedAccount.connected) {
            await managedAccount.instance.disconnect();
        }

        // Remove all listeners
        managedAccount.instance.removeAllListeners();

        // Remove from map
        this.accounts.delete(account);
        this.emit('accountRemoved', account);

        this.logger.info(`Account ${account} removed successfully`);
    }

    /**
     * Get a specific account instance
     *
     * @param account - Phone number of the account
     * @returns The SignalCli instance
     */
    getAccount(account: string): SignalCli | undefined {
        return this.accounts.get(account)?.instance;
    }

    /**
     * Get all managed accounts
     *
     * @returns Array of account phone numbers
     */
    getAccounts(): string[] {
        return Array.from(this.accounts.keys());
    }

    /**
     * Check if an account exists
     *
     * @param account - Phone number of the account
     * @returns True if the account exists
     */
    hasAccount(account: string): boolean {
        return this.accounts.has(account);
    }

    /**
     * Connect a specific account
     *
     * @param account - Phone number of the account
     */
    async connect(account: string): Promise<void> {
        const managedAccount = this.accounts.get(account);
        if (!managedAccount) {
            throw new Error(`Account ${account} not found`);
        }

        if (managedAccount.connected) {
            this.logger.warn(`Account ${account} already connected`);
            return;
        }

        this.logger.info(`Connecting account: ${account}`);

        try {
            await managedAccount.instance.connect();
            managedAccount.connected = true;
            managedAccount.lastActivity = Date.now();
            this.emit('accountConnected', account);

            this.logger.info(`Account ${account} connected successfully`);
        } catch (error) {
            this.logger.error(`Failed to connect account ${account}:`, error);

            if (this.options.autoReconnect) {
                this.logger.info(`Will retry connection for ${account}`);
                setTimeout(() => this.connect(account), 5000);
            }

            throw error;
        }
    }

    /**
     * Disconnect a specific account
     *
     * @param account - Phone number of the account
     */
    async disconnect(account: string): Promise<void> {
        const managedAccount = this.accounts.get(account);
        if (!managedAccount) {
            throw new Error(`Account ${account} not found`);
        }

        if (!managedAccount.connected) {
            this.logger.warn(`Account ${account} not connected`);
            return;
        }

        this.logger.info(`Disconnecting account: ${account}`);

        await managedAccount.instance.disconnect();
        managedAccount.connected = false;
        this.emit('accountDisconnected', account);

        this.logger.info(`Account ${account} disconnected`);
    }

    /**
     * Connect all accounts
     */
    async connectAll(): Promise<void> {
        this.logger.info('Connecting all accounts');

        const promises = Array.from(this.accounts.keys()).map((account) =>
            this.connect(account).catch((error) => {
                this.logger.error(`Failed to connect ${account}:`, error);
            }),
        );

        await Promise.all(promises);
        this.logger.info('All accounts connected');
    }

    /**
     * Disconnect all accounts
     */
    async disconnectAll(): Promise<void> {
        this.logger.info('Disconnecting all accounts');

        const promises = Array.from(this.accounts.keys()).map((account) =>
            this.disconnect(account).catch((error) => {
                this.logger.error(`Failed to disconnect ${account}:`, error);
            }),
        );

        await Promise.all(promises);
        this.logger.info('All accounts disconnected');
    }

    /**
     * Send a message from a specific account
     *
     * @param fromAccount - Account to send from
     * @param recipient - Recipient phone number or group ID
     * @param message - Message text
     * @param options - Send options
     */
    async sendMessage(fromAccount: string, recipient: string, message: string, options: any = {}): Promise<any> {
        const managedAccount = this.accounts.get(fromAccount);
        if (!managedAccount) {
            throw new Error(`Account ${fromAccount} not found`);
        }

        managedAccount.lastActivity = Date.now();
        return managedAccount.instance.sendMessage(recipient, message, options);
    }

    /**
     * Get account status information
     *
     * @param account - Phone number of the account (optional)
     * @returns Status information for all or specific account
     */
    getStatus(account?: string): any {
        if (account) {
            const managedAccount = this.accounts.get(account);
            if (!managedAccount) {
                return null;
            }

            return {
                account: managedAccount.account,
                connected: managedAccount.connected,
                lastActivity: managedAccount.lastActivity,
                uptime: Date.now() - managedAccount.lastActivity,
            };
        }

        // Return status for all accounts
        const status: any = {
            totalAccounts: this.accounts.size,
            connectedAccounts: 0,
            accounts: [],
        };

        for (const [account, managed] of this.accounts) {
            if (managed.connected) {
                status.connectedAccounts++;
            }

            status.accounts.push({
                account,
                connected: managed.connected,
                lastActivity: managed.lastActivity,
                uptime: Date.now() - managed.lastActivity,
            });
        }

        return status;
    }

    /**
     * Setup event forwarding from an account instance
     *
     * @private
     */
    private setupEventForwarding(account: string, instance: SignalCli): void {
        // Forward all events with account prefix
        const events = ['message', 'receipt', 'typing', 'reaction', 'error', 'connected', 'disconnected'];

        events.forEach((event) => {
            instance.on(event, (...args: any[]) => {
                // Emit with account information
                this.emit(event, account, ...args);

                // Also emit a generic event with account
                this.emit('accountEvent', {
                    account,
                    event,
                    data: args,
                });

                // Update last activity
                const managedAccount = this.accounts.get(account);
                if (managedAccount) {
                    managedAccount.lastActivity = Date.now();
                }
            });
        });

        // Handle disconnection
        instance.on('disconnected', () => {
            const managedAccount = this.accounts.get(account);
            if (managedAccount) {
                managedAccount.connected = false;
            }

            // Auto-reconnect if enabled
            if (this.options.autoReconnect) {
                this.logger.info(`Auto-reconnecting account ${account}`);
                setTimeout(() => this.connect(account), 5000);
            }
        });
    }

    /**
     * Shutdown the manager and cleanup all accounts
     */
    async shutdown(): Promise<void> {
        this.logger.info('Shutting down MultiAccountManager');

        await this.disconnectAll();

        // Remove all accounts
        for (const account of this.accounts.keys()) {
            await this.removeAccount(account);
        }

        this.removeAllListeners();
        this.logger.info('MultiAccountManager shutdown complete');
    }
}
