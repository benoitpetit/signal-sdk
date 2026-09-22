import * as sdk from '../index';

describe('public package entrypoint', () => {
    it('re-exports the supported public API', () => {
        expect(sdk.SignalCli).toBeDefined();
        expect(sdk.SignalBot).toBeDefined();
        expect(sdk.MultiAccountManager).toBeDefined();
        expect(sdk.ValidationError).toBeDefined();
        expect(sdk.withRetry).toBeDefined();
        expect(sdk.validatePhoneNumber).toBeDefined();
        expect(sdk.DEFAULT_CONFIG).toBeDefined();
    });
});
