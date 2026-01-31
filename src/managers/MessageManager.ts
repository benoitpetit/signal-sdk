import { BaseManager } from './BaseManager';
import {
    SendMessageOptions,
    SendResponse,
    Message,
    ReceiveOptions,
    ReceiptType,
    PollCreateOptions,
    PollVoteOptions,
    PollTerminateOptions,
    GetAttachmentOptions,
    UploadProgress,
} from '../interfaces';
import { validateRecipient, validateMessage, validateTimestamp, validateGroupId } from '../validators';
import { MessageError } from '../errors';

export class MessageManager extends BaseManager {
    async sendMessage(
        recipient: string,
        message: string,
        options: Omit<SendMessageOptions, 'message'> = {},
    ): Promise<SendResponse> {
        const params: any = {
            message,
            account: this.account,
        };

        if (this.isGroupId(recipient)) {
            params.groupId = recipient;
        } else {
            params.recipients = [recipient];
        }

        if (options.attachments && options.attachments.length > 0) {
            params.attachments = options.attachments;
        }
        if (options.expiresInSeconds) {
            params.expiresInSeconds = options.expiresInSeconds;
        }
        if (options.isViewOnce) {
            params.viewOnce = options.isViewOnce;
        }

        if (options.mentions && options.mentions.length > 0) {
            params.mentions = options.mentions.map((m) => ({
                start: m.start,
                length: m.length,
                number: m.recipient || m.number,
            }));
        }

        if (options.textStyles && options.textStyles.length > 0) {
            params.textStyles = options.textStyles.map((ts) => ({
                start: ts.start,
                length: ts.length,
                style: ts.style,
            }));
        }

        if (options.quote) {
            params.quoteTimestamp = options.quote.timestamp;
            params.quoteAuthor = options.quote.author;
            if (options.quote.text) {
                params.quoteMessage = options.quote.text;
            }
            if (options.quote.mentions && options.quote.mentions.length > 0) {
                params.quoteMentions = options.quote.mentions.map((m) => ({
                    start: m.start,
                    length: m.length,
                    number: m.recipient || m.number,
                }));
            }
            if (options.quote.textStyles && options.quote.textStyles.length > 0) {
                params.quoteTextStyles = options.quote.textStyles.map((ts) => ({
                    start: ts.start,
                    length: ts.length,
                    style: ts.style,
                }));
            }
        }

        if (options.previewUrl) {
            params.previewUrl = options.previewUrl;
        }
        if (options.previewTitle) {
            params.previewTitle = options.previewTitle;
        }
        if (options.previewDescription) {
            params.previewDescription = options.previewDescription;
        }
        if (options.previewImage) {
            params.previewImage = options.previewImage;
        }

        if (options.editTimestamp) {
            params.editTimestamp = options.editTimestamp;
        }

        if (options.storyTimestamp && options.storyAuthor) {
            params.storyTimestamp = options.storyTimestamp;
            params.storyAuthor = options.storyAuthor;
        }

        if (options.noteToSelf) {
            params.noteToSelf = options.noteToSelf;
        }

        if (options.endSession) {
            params.endSession = options.endSession;
        }

        return this.sendRequest('send', params);
    }

    async sendReaction(
        recipient: string,
        targetAuthor: string,
        targetTimestamp: number,
        emoji: string,
        remove: boolean = false,
        isStory: boolean = false,
    ): Promise<SendResponse> {
        const params: any = {
            emoji,
            targetAuthor,
            targetTimestamp,
            remove,
            account: this.account,
        };
        if (isStory) {
            params.story = true;
        }
        if (this.isGroupId(recipient)) {
            params.groupId = recipient;
        } else {
            params.recipients = [recipient];
        }
        return this.sendRequest('sendReaction', params);
    }

    async sendTyping(recipient: string, stop: boolean = false): Promise<void> {
        const params: any = { when: !stop, account: this.account };
        if (this.isGroupId(recipient)) {
            params.groupId = recipient;
        } else {
            params.recipients = [recipient];
        }
        await this.sendRequest('sendTyping', params);
    }

    async remoteDeleteMessage(recipient: string, targetTimestamp: number): Promise<void> {
        const params: any = { targetTimestamp, account: this.account };
        if (this.isGroupId(recipient)) {
            params.groupId = recipient;
        } else {
            params.recipients = [recipient];
        }
        await this.sendRequest('remoteDelete', params);
    }

    async sendReceipt(recipient: string, targetTimestamp: number, type: ReceiptType = 'read'): Promise<void> {
        await this.sendRequest('sendReceipt', { account: this.account, recipient, targetTimestamp, type });
    }

    async receive(options: ReceiveOptions = {}): Promise<Message[]> {
        const params: any = { account: this.account };

        if (options.timeout !== undefined) {
            params.timeout = options.timeout;
        }

        if (options.maxMessages !== undefined) {
            params.maxMessages = options.maxMessages;
        }

        if (options.ignoreAttachments) {
            params.ignoreAttachments = true;
        }

        if (options.ignoreStories) {
            params.ignoreStories = true;
        }

        if (options.sendReadReceipts) {
            params.sendReadReceipts = true;
        }

        try {
            const result = await this.sendRequest('receive', params);

            if (Array.isArray(result)) {
                return result.map((envelope) => this.parseEnvelope(envelope));
            }

            return [];
        } catch (error) {
            this.logger.error('Failed to receive messages:', error);
            throw error;
        }
    }

    private parseEnvelope(envelope: any): Message {
        const message: Message = {
            timestamp: envelope.timestamp || Date.now(),
            source: envelope.source || envelope.sourceNumber,
            sourceUuid: envelope.sourceUuid,
            sourceDevice: envelope.sourceDevice,
        };

        if (envelope.dataMessage) {
            const data = envelope.dataMessage;
            message.text = data.message || data.body;
            message.groupId = data.groupInfo?.groupId;
            message.attachments = data.attachments;
            message.mentions = data.mentions;
            message.quote = data.quote;
            message.reaction = data.reaction;
            message.sticker = data.sticker;
            message.expiresInSeconds = data.expiresInSeconds;
            message.viewOnce = data.viewOnce;
        }

        if (envelope.syncMessage) {
            message.syncMessage = envelope.syncMessage;
        }

        if (envelope.receiptMessage) {
            message.receipt = envelope.receiptMessage;
        }

        if (envelope.typingMessage) {
            message.typing = envelope.typingMessage;
        }

        return message;
    }

    async sendPollCreate(options: PollCreateOptions): Promise<SendResponse> {
        this.logger.debug('Sending poll create', options);

        validateMessage(options.question, 500);

        if (!options.options || options.options.length < 2) {
            throw new MessageError('Poll must have at least 2 options');
        }

        if (options.options.length > 10) {
            throw new MessageError('Poll cannot have more than 10 options');
        }

        const params: any = {
            question: options.question,
            options: options.options,
            account: this.account,
        };

        if (options.multiSelect !== undefined) {
            params.multiSelect = options.multiSelect;
        }

        if (options.groupId) {
            validateGroupId(options.groupId);
            params.groupId = options.groupId;
        } else if (options.recipients) {
            params.recipients = options.recipients.map((r) => {
                validateRecipient(r);
                return r;
            });
        } else {
            throw new MessageError('Must specify either recipients or groupId');
        }

        return this.sendRequest('sendPollCreate', params);
    }

    async sendPollVote(recipient: string, options: PollVoteOptions): Promise<SendResponse> {
        this.logger.debug('Sending poll vote', { recipient, options });

        validateRecipient(options.pollAuthor);
        validateTimestamp(options.pollTimestamp);

        if (!options.optionIndexes || options.optionIndexes.length === 0) {
            throw new MessageError('Must specify at least one option to vote for');
        }

        const params: any = {
            pollAuthor: options.pollAuthor,
            pollTimestamp: options.pollTimestamp,
            options: options.optionIndexes,
            account: this.account,
        };

        if (options.voteCount !== undefined) {
            params.voteCount = options.voteCount;
        }

        if (this.isGroupId(recipient)) {
            validateGroupId(recipient);
            params.groupId = recipient;
        } else {
            validateRecipient(recipient);
            params.recipient = recipient;
        }

        return this.sendRequest('sendPollVote', params);
    }

    async sendPollTerminate(recipient: string, options: PollTerminateOptions): Promise<SendResponse> {
        this.logger.debug('Sending poll terminate', { recipient, options });

        validateTimestamp(options.pollTimestamp);

        const params: any = {
            pollTimestamp: options.pollTimestamp,
            account: this.account,
        };

        if (this.isGroupId(recipient)) {
            validateGroupId(recipient);
            params.groupId = recipient;
        } else {
            validateRecipient(recipient);
            params.recipient = recipient;
        }

        return this.sendRequest('sendPollTerminate', params);
    }

    async getAttachment(options: GetAttachmentOptions): Promise<string> {
        this.logger.debug('Getting attachment', options);

        if (!options.id) {
            throw new MessageError('Attachment ID is required');
        }

        const params: any = {
            id: options.id,
            account: this.account,
        };

        if (options.groupId) {
            validateGroupId(options.groupId);
            params.groupId = options.groupId;
        } else if (options.recipient) {
            validateRecipient(options.recipient);
            params.recipient = options.recipient;
        }

        const result = await this.sendRequest('getAttachment', params);
        return result.data || result;
    }

    async sendMessageWithProgress(
        recipient: string,
        message: string,
        options: SendMessageOptions & {
            onProgress?: (progress: UploadProgress) => void;
        } = {},
    ): Promise<SendResponse> {
        const { onProgress, ...sendOptions } = options;

        if (onProgress && sendOptions.attachments && sendOptions.attachments.length > 0) {
            for (let i = 0; i <= 100; i += 10) {
                onProgress({
                    total: 100,
                    uploaded: i,
                    percentage: i,
                });
                await new Promise((resolve) => setTimeout(resolve, 50));
            }
        }

        return this.sendMessage(recipient, message, sendOptions);
    }
}
