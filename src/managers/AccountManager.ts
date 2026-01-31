import { BaseManager } from './BaseManager';
import {
    AccountConfiguration,
    UpdateAccountOptions,
    AccountUpdateResult,
    PaymentNotificationData,
    SendResponse,
    RateLimitChallengeResult,
} from '../interfaces';
import { validatePhoneNumber, validateRecipient } from '../validators';

export class AccountManager extends BaseManager {
    async register(number: string, voice?: boolean, captcha?: string): Promise<void> {
        await this.sendRequest('register', { account: number, voice, captcha });
    }

    async verify(number: string, token: string, pin?: string): Promise<void> {
        await this.sendRequest('verify', { account: number, token, pin });
    }

    async updateProfile(
        name: string,
        about?: string,
        aboutEmoji?: string,
        avatar?: string,
        options: { familyName?: string; mobileCoinAddress?: string; removeAvatar?: boolean } = {},
    ): Promise<void> {
        const params: any = { account: this.account, name };
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
        const result = await this.sendRequest('listAccounts');
        return result.accounts.map((acc: any) => acc.number);
    }

    async listAccountsDetailed(): Promise<Array<{ number: string; name?: string; uuid?: string }>> {
        this.logger.debug('Listing all accounts');
        const result = await this.sendRequest('listAccounts');
        return result.accounts || [];
    }

    async updateAccount(options: UpdateAccountOptions): Promise<AccountUpdateResult> {
        this.logger.debug('Updating account', options);

        const params: any = { account: this.account };

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
            const result = await this.sendRequest('updateAccount', params);
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

        const params: any = {
            receipt: paymentData.receipt,
            account: this.account,
        };

        if (paymentData.note) params.note = paymentData.note;

        if (this.isGroupId(recipient)) {
            params.groupId = recipient;
        } else {
            params.recipient = recipient;
        }

        return this.sendRequest('sendPaymentNotification', params);
    }

    async submitRateLimitChallenge(challenge: string, captcha: string): Promise<RateLimitChallengeResult> {
        const params = {
            account: this.account,
            challenge,
            captcha,
        };

        const result = await this.sendRequest('submitRateLimitChallenge', params);

        return {
            success: result.success || false,
            retryAfter: result.retryAfter,
            message: result.message,
        };
    }

    async startChangeNumber(newNumber: string, voice: boolean = false, captcha?: string): Promise<void> {
        this.logger.info(`Starting change number to ${newNumber} (voice: ${voice})`);
        validatePhoneNumber(newNumber);

        const params: any = {
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

        const params: any = {
            account: this.account,
            number: newNumber,
            verificationCode,
        };

        if (pin) params.pin = pin;
        await this.sendRequest('finishChangeNumber', params);
    }
}
