import { BaseManager } from './BaseManager';
import {
    AccountConfiguration,
    UpdateAccountOptions,
    AccountUpdateResult,
    PaymentNotificationData,
    SendResponse,
    RateLimitChallengeResult,
} from '../interfaces';
import { validatePhoneNumber, validateRecipient, validateRecoveryKey, validateTotpToken } from '../validators';
import { SignalError, ValidationError } from '../errors';

export class AccountManager extends BaseManager {
    constructor(
        sendRequest: <T = unknown>(method: string, params?: unknown) => Promise<T>,
        account: string | undefined,
        logger: import('../config').Logger,
        config: Required<import('../config').SignalCliConfig>,
        private readonly runCliCommand?: (args: string[]) => Promise<string>,
    ) {
        super(sendRequest, account, logger, config);
    }

    async register(number: string, voice?: boolean, captcha?: string, reregister?: boolean): Promise<void> {
        validatePhoneNumber(number);
        if (this.runCliCommand) {
            const args = ['-a', number, 'register'];
            if (voice) args.push('--voice');
            if (captcha) args.push('--captcha', captcha);
            if (reregister) args.push('--reregister');
            await this.runCliCommand(args);
            return;
        }

        const params: Record<string, unknown> = { account: number, voice, captcha };
        if (reregister) params.reregister = true;
        await this.sendRequest('register', params);
    }

    /**
     * Recovers an existing account with the Account Key and Recovery Key shown by
     * Signal Android (signal-cli v0.14.9+).
     *
     * Runs the signal-cli CLI directly because the upstream JSON-RPC manual excludes the
     * `register` command. Recovery requires `-a` to be the account's ACI (Account Key),
     * accepted as 32 hexadecimal characters or as a UUID with dashes; `-a` must not be a
     * phone number. `--reregister` is required when the local account is still marked as
     * registered, and `--totp` is needed if upstream reports that a TOTP token is required.
     *
     * @param aci Account Key (ACI) of the account to recover
     * @param recoveryKey 64-character Recovery Key from Signal Android
     * @param options Optional flags: totp (six-digit token), reregister (default true, mirrors --reregister)
     */
    async registerWithRecoveryKey(
        aci: string,
        recoveryKey: string,
        options: { totp?: string; reregister?: boolean } = {},
    ): Promise<void> {
        if (
            typeof aci !== 'string' ||
            !/^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(aci)
        ) {
            throw new ValidationError('ACI must be a Signal UUID', 'aci');
        }
        validateRecoveryKey(recoveryKey);
        if (options.totp) {
            validateTotpToken(options.totp);
        }

        if (!this.runCliCommand) {
            throw new SignalError('Recovery registration requires a configured signal-cli binary');
        }

        const args = ['-a', aci, 'register', '--recovery-key', recoveryKey];
        // Required only when the local account is still marked as registered.
        if (options.reregister) args.push('--reregister');
        if (options.totp) args.push('--totp', options.totp);
        await this.runCliCommand(args);
    }

    async verify(number: string, verificationCode: string, pin?: string): Promise<void> {
        validatePhoneNumber(number);
        if (this.runCliCommand) {
            const args = ['-a', number, 'verify', verificationCode];
            if (pin) args.push('--pin', pin);
            await this.runCliCommand(args);
            return;
        }

        await this.sendRequest('verify', { account: number, verificationCode, pin });
    }

    async updateProfile(
        givenName: string,
        about?: string,
        aboutEmoji?: string,
        avatar?: string,
        options: { familyName?: string; mobileCoinAddress?: string; removeAvatar?: boolean } = {},
    ): Promise<void> {
        const params: Record<string, unknown> = { account: this.account, givenName };
        if (about) params.about = about;
        if (aboutEmoji) params.aboutEmoji = aboutEmoji;
        if (avatar) params.avatar = avatar;
        if (options.familyName) params.familyName = options.familyName;
        if (options.mobileCoinAddress) params.mobileCoinAddress = options.mobileCoinAddress;
        if (options.removeAvatar) params.removeAvatar = true;

        await this.sendRequest('updateProfile', params);
    }

    async unregister(): Promise<void> {
        await this.sendRequest('unregister', { account: this.account });
    }

    async deleteLocalAccountData(): Promise<void> {
        await this.sendRequest('deleteLocalAccountData', { account: this.account });
    }

    async updateAccountConfiguration(config: AccountConfiguration): Promise<void> {
        await this.sendRequest('updateConfiguration', { account: this.account, ...config });
    }

    async setPin(pin: string): Promise<void> {
        await this.sendRequest('setPin', { account: this.account, pin });
    }

    async removePin(): Promise<void> {
        await this.sendRequest('removePin', { account: this.account });
    }

    async listAccounts(): Promise<string[]> {
        const result = await this.sendRequest<
            Array<{ number: string | null; aci?: string }> | { accounts: Array<{ number: string | null; aci?: string }> }
        >('listAccounts');
        const accounts = Array.isArray(result) ? result : result.accounts;
        return accounts.map((acc) => acc.number || acc.aci || '');
    }

    async listAccountsDetailed(): Promise<Array<{ number: string | null; name?: string; uuid?: string; aci?: string }>> {
        this.logger.debug('Listing all accounts');
        const result = await this.sendRequest<
            Array<{ number: string | null; name?: string; uuid?: string; aci?: string }> |
                { accounts: Array<{ number: string | null; name?: string; uuid?: string; aci?: string }> }
        >('listAccounts');
        return Array.isArray(result) ? result : result.accounts || [];
    }

    async updateAccount(options: UpdateAccountOptions): Promise<AccountUpdateResult> {
        this.logger.debug('Updating account', options);

        const params: Record<string, unknown> = { account: this.account };

        if (options.deviceName) params.deviceName = options.deviceName;
        if (options.username) params.username = options.username;
        if (options.deleteUsername) params.deleteUsername = true;
        if (options.unrestrictedUnidentifiedSender !== undefined) {
            params.unrestrictedUnidentifiedSender = options.unrestrictedUnidentifiedSender;
        }
        if (options.discoverableByNumber !== undefined) {
            params.discoverableByNumber = options.discoverableByNumber;
        }
        if (options.numberSharing !== undefined) {
            params.numberSharing = options.numberSharing;
        }

        try {
            const result = await this.sendRequest<{ username?: string; usernameLink?: string }>('updateAccount', params);
            return {
                success: true,
                username: result.username,
                usernameLink: result.usernameLink,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    async sendPaymentNotification(recipient: string, paymentData: PaymentNotificationData): Promise<SendResponse> {
        this.logger.info(`Sending payment notification to ${recipient}`);

        validateRecipient(recipient);

        if (!paymentData.receipt || paymentData.receipt.trim().length === 0) {
            throw new Error('Payment receipt is required');
        }
        if (this.isGroupId(recipient)) {
            throw new Error('Payment notifications require a phone number recipient');
        }

        const params: Record<string, unknown> = {
            recipient,
            receipt: paymentData.receipt,
            account: this.account,
        };

        if (paymentData.note) params.note = paymentData.note;

        return this.sendRequest('sendPaymentNotification', params);
    }

    async submitRateLimitChallenge(challenge: string, captcha: string): Promise<RateLimitChallengeResult> {
        const params = {
            account: this.account,
            challenge,
            captcha,
        };

        const result = await this.sendRequest<{ success?: boolean; retryAfter?: number; message?: string }>('submitRateLimitChallenge', params);

        return {
            success: result.success || false,
            retryAfter: result.retryAfter,
            message: result.message,
        };
    }

    async startChangeNumber(newNumber: string, voice: boolean = false, captcha?: string): Promise<void> {
        this.logger.info(`Starting change number to ${newNumber} (voice: ${voice})`);
        validatePhoneNumber(newNumber);

        const params: Record<string, unknown> = {
            account: this.account,
            number: newNumber,
            voice,
        };

        if (captcha) params.captcha = captcha;
        await this.sendRequest('startChangeNumber', params);
    }

    async finishChangeNumber(newNumber: string, verificationCode: string, pin?: string): Promise<void> {
        this.logger.info(`Finishing change number to ${newNumber}`);
        validatePhoneNumber(newNumber);

        if (!verificationCode || verificationCode.trim().length === 0) {
            throw new Error('Verification code is required');
        }

        const params: Record<string, unknown> = {
            account: this.account,
            number: newNumber,
            verificationCode,
        };

        if (pin) params.pin = pin;
        await this.sendRequest('finishChangeNumber', params);
    }
}
