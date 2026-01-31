import { SignalCli } from '../SignalCli';
import { validateSanitizedString } from '../validators';
import { ValidationError } from '../errors';

describe('Security - Injection Prevention', () => {
    describe('validateSanitizedString', () => {
        const unsafeStrings = [
            'device; rm -rf /',
            'device & echo "hacked"',
            'device | cat /etc/passwd',
            'device && ls',
            '$(whoami)',
            '`id`',
            'device > output.txt',
            'device < input.txt',
            'device\nnewline',
            'device\rreturn',
            'device\ttab',
            'device"quote',
            "device'quote",
            'device(paren)',
            'device{brace}',
            'device[bracket]',
            'device\\backslash',
            'device!exclamation',
            'device$dollar',
        ];

        unsafeStrings.forEach((input) => {
            it(`should throw ValidationError for unsafe input: "${input}"`, () => {
                expect(() => validateSanitizedString(input)).toThrow(ValidationError);
            });
        });

        it('should allow safe alphanumeric strings', () => {
            expect(() => validateSanitizedString('MyDevice123')).not.toThrow();
            expect(() => validateSanitizedString('device-name_dot.123')).not.toThrow();
        });
    });

    describe('SignalCli Security', () => {
        it('should throw error if account number contains injection in constructor', () => {
            const maliciousAccount = '+33123456789; rm -rf /';
            expect(() => new SignalCli(maliciousAccount)).toThrow();
        });

        it('should throw error if device name contains injection in deviceLink', async () => {
            const signal = new SignalCli('+1234567890');
            const maliciousName = 'phone & echo hacked';

            await expect(signal.deviceLink({ name: maliciousName })).rejects.toThrow(/contains unsafe characters/);
        });
    });
});
