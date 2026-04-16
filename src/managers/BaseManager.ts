import { SignalCliConfig, Logger } from '../config';

export abstract class BaseManager {
    constructor(
        protected readonly sendRequest: <T = unknown>(method: string, params?: unknown) => Promise<T>,
        protected readonly account: string | undefined,
        protected readonly logger: Logger,
        protected readonly config: Required<SignalCliConfig>,
    ) {}

    protected isGroupId(recipient: string): boolean {
        return (
            recipient.includes('=') ||
            recipient.includes('/') ||
            (recipient.includes('+') && !recipient.startsWith('+'))
        );
    }
}
