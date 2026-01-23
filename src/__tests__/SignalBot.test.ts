import { SignalBot } from '../SignalBot';
import { BotConfig, BotCommand } from '../interfaces';

describe('SignalBot', () => {
    let bot: SignalBot;
    let mockConfig: BotConfig;

    beforeEach(() => {
        mockConfig = {
            phoneNumber: '+1234567890',
            admins: ['+0987654321'],
            group: {
                name: 'Test Bot Group',
                createIfNotExists: false
            }
        };
    });

    afterEach(async () => {
        if (bot) {
            await bot.stop();
            // Clean up all listeners
            bot.removeAllListeners();
            bot.getSignalCli().removeAllListeners();
        }
        // Clear all timers
        jest.clearAllTimers();
    });

    test('should create bot with minimal config', () => {
        bot = new SignalBot({
            phoneNumber: '+1234567890'
        });

        expect(bot).toBeDefined();
        expect(bot.isAdmin('+1234567890')).toBe(false);
    });

    test('should create bot with full config', () => {
        bot = new SignalBot(mockConfig);

        expect(bot).toBeDefined();
        expect(bot.isAdmin('+0987654321')).toBe(true);
        expect(bot.getBotGroupId()).toBeNull();
    });

    test('should add and remove commands', () => {
        bot = new SignalBot(mockConfig);

        const testCommand = {
            name: 'test',
            description: 'Test command',
            handler: jest.fn()
        };

        bot.addCommand(testCommand);
        const commands = bot.getCommands();
        expect(commands.some((cmd: BotCommand) => cmd.name === 'test')).toBe(true);

        const removed = bot.removeCommand('test');
        expect(removed).toBe(true);

        const commandsAfter = bot.getCommands();
        expect(commandsAfter.some((cmd: BotCommand) => cmd.name === 'test')).toBe(false);
    });

    test('should have default commands', () => {
        bot = new SignalBot(mockConfig);

        const commands = bot.getCommands();
        const commandNames = commands.map((cmd: BotCommand) => cmd.name);

        expect(commandNames).toContain('help');
        expect(commandNames).toContain('stats');
        expect(commandNames).toContain('ping');
        expect(commandNames).toContain('info');
    });

    test('should emit ready event when started', (done) => {
        bot = new SignalBot({
            phoneNumber: '+1234567890',
            group: {
                name: 'Test Group',
                createIfNotExists: false
            }
        });

        // Mock SignalCli methods to avoid actual Signal operations
        const mockSignalCli = bot.getSignalCli();
        jest.spyOn(mockSignalCli, 'listDevices').mockResolvedValue([
            { id: 1, name: 'Test Device', created: Date.now(), lastSeen: Date.now() }
        ]);
        jest.spyOn(mockSignalCli, 'startDaemon').mockImplementation(() => { });
        jest.spyOn(mockSignalCli, 'connect').mockResolvedValue(undefined);
        jest.spyOn(mockSignalCli, 'on').mockReturnValue(mockSignalCli);

        bot.on('ready', () => {
            expect(true).toBe(true);
            done();
        });

        bot.start().catch(done);
    });

    test('should get stats', () => {
        bot = new SignalBot(mockConfig);

        const stats = bot.getStats();

        expect(stats).toHaveProperty('messagesReceived');
        expect(stats).toHaveProperty('commandsExecuted');
        expect(stats).toHaveProperty('startTime');
        expect(stats).toHaveProperty('lastActivity');
        expect(stats).toHaveProperty('activeUsers');

        expect(stats.messagesReceived).toBe(0);
        expect(stats.commandsExecuted).toBe(0);
        expect(stats.activeUsers).toBe(0);
    });

    test('should handle admin permissions', () => {
        bot = new SignalBot({
            phoneNumber: '+1234567890',
            admins: ['+0987654321', '+1111111111']
        });

        expect(bot.isAdmin('+0987654321')).toBe(true);
        expect(bot.isAdmin('+1111111111')).toBe(true);
        expect(bot.isAdmin('+9999999999')).toBe(false);
    });
});
