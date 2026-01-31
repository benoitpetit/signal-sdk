import { SignalCliConfig, Logger } from '../config';

export abstract class BaseManager {
    constructor(
        protected readonly sendRequest: (method: string, params?: any) => Promise<any>,
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
