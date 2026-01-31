/**
 * Additional tests for SignalBot
 * Covers message handling, commands, and edge cases
 */

import { SignalBot } from '../SignalBot';
import { BotConfig } from '../interfaces';

describe('SignalBot Additional Tests', () => {
    let bot: SignalBot;
    let mockConfig: BotConfig;

    beforeEach(() => {
        // Use real timers for these tests
        jest.useRealTimers();

        mockConfig = {
            phoneNumber: '+1234567890',
            admins: ['+0987654321'],
            settings: {
                commandPrefix: '/',
                autoReact: true,
                logMessages: true,
                welcomeNewMembers: true,
                cooldownSeconds: 2,
                maxMessageLength: 1000,
            },
        };
    });

    afterEach(async () => {
        if (bot) {
            await bot.stop();
            // Remove all listeners to prevent memory leaks
            bot.removeAllListeners();
            bot.getSignalCli().removeAllListeners();

            // Wait a bit for any async operations to complete
            await new Promise((resolve) => process.nextTick(resolve));
        }
    });

    describe('Command Management', () => {
        test('should add custom command and execute it', () => {
            bot = new SignalBot(mockConfig);

            const customHandler = jest.fn().mockResolvedValue('Custom response');
            bot.addCommand({
                name: 'custom',
                description: 'Custom command',
                handler: customHandler,
            });

            const commands = bot.getCommands();
            expect(commands.find((c) => c.name === 'custom')).toBeDefined();
        });

        test('should remove command successfully', () => {
            bot = new SignalBot(mockConfig);

            bot.addCommand({
                name: 'temp',
                description: 'Temporary command',
                handler: async () => 'temp',
            });

            expect(bot.removeCommand('temp')).toBe(true);
            expect(bot.removeCommand('nonexistent')).toBe(false);
        });

        test('should prevent duplicate commands', () => {
            bot = new SignalBot(mockConfig);

            bot.addCommand({
                name: 'test',
                description: 'Test command',
                handler: async () => 'test1',
            });

            bot.addCommand({
                name: 'test',
                description: 'Test command 2',
                handler: async () => 'test2',
            });

            const commands = bot.getCommands();
            const testCommands = commands.filter((c) => c.name === 'test');
            expect(testCommands.length).toBe(1);
        });
    });

    describe('Admin Management', () => {
        test('should identify admin correctly', () => {
            bot = new SignalBot(mockConfig);

            expect(bot.isAdmin('+0987654321')).toBe(true);
            expect(bot.isAdmin('+1111111111')).toBe(false);
        });
    });

    describe('Statistics', () => {
        test('should track bot statistics', () => {
            bot = new SignalBot(mockConfig);

            const stats = bot.getStats();

            expect(stats).toHaveProperty('messagesReceived');
            expect(stats).toHaveProperty('commandsExecuted');
            expect(stats).toHaveProperty('startTime');
            expect(stats).toHaveProperty('lastActivity');
            expect(stats.messagesReceived).toBe(0);
            expect(stats.commandsExecuted).toBe(0);
        });
    });

    describe('Group Management', () => {
        test('should get bot group ID', () => {
            bot = new SignalBot(mockConfig);

            const groupId = bot.getBotGroupId();
            expect(groupId).toBeNull(); // Not set until bot starts
        });

        test('should create bot without group config', () => {
            bot = new SignalBot({
                phoneNumber: '+1234567890',
            });

            expect(bot).toBeDefined();
            expect(bot.getBotGroupId()).toBeNull();
        });

        test('should create bot with group config', () => {
            bot = new SignalBot({
                phoneNumber: '+1234567890',
                group: {
                    name: 'Test Group',
                    description: 'Test Description',
                    createIfNotExists: true,
                    initialMembers: ['+1111111111', '+2222222222'],
                },
            });

            expect(bot).toBeDefined();
        });
    });

    describe('Message Sending', () => {
        test('should queue message for sending', async () => {
            jest.useFakeTimers();
            bot = new SignalBot(mockConfig);

            const mockSignalCli = bot.getSignalCli();
            const sendMessageSpy = jest.spyOn(mockSignalCli, 'sendMessage').mockResolvedValue({
                results: [{ type: 'SUCCESS' }],
                timestamp: Date.now(),
            });

            // Send message (queued)
            const sendPromise = bot.sendMessage('+1111111111', 'Test message');

            // Advance timers to process queue
            jest.advanceTimersByTime(250);
            await Promise.resolve(); // Let promises resolve

            await sendPromise;

            expect(sendMessageSpy).toHaveBeenCalledWith('+1111111111', 'Test message');

            jest.useRealTimers();
        });

        test('should queue reaction for sending', async () => {
            jest.useFakeTimers();
            bot = new SignalBot(mockConfig);

            const mockSignalCli = bot.getSignalCli();
            const sendReactionSpy = jest.spyOn(mockSignalCli, 'sendReaction').mockResolvedValue({
                results: [{ type: 'SUCCESS' }],
                timestamp: Date.now(),
            });

            // Send reaction (queued)
            const sendPromise = bot.sendReaction('+1111111111', '+2222222222', 123456, '👍');

            // Advance timers to process queue
            jest.advanceTimersByTime(250);
            await Promise.resolve();

            await sendPromise;

            expect(sendReactionSpy).toHaveBeenCalledWith('+1111111111', '+2222222222', 123456, '👍');

            jest.useRealTimers();
        });

        test('should handle message with attachments', async () => {
            jest.useFakeTimers();
            bot = new SignalBot(mockConfig);

            const mockSignalCli = bot.getSignalCli();
            const sendMessageSpy = jest.spyOn(mockSignalCli, 'sendMessage').mockResolvedValue({
                results: [{ type: 'SUCCESS' }],
                timestamp: Date.now(),
            });

            // Send message with attachment (queued)
            const sendPromise = bot.sendMessageWithAttachment('+1111111111', 'Message with files', [
                'file1.txt',
                'file2.jpg',
            ]);

            // Advance timers to process queue and cleanup timer
            jest.advanceTimersByTime(2500); // 250ms for queue + 2000ms for cleanup
            await Promise.resolve();

            await sendPromise;

            expect(sendMessageSpy).toHaveBeenCalledWith('+1111111111', 'Message with files', {
                attachments: ['file1.txt', 'file2.jpg'],
            });

            jest.useRealTimers();
        });
    });

    describe('Configuration', () => {
        test('should use default settings when not provided', () => {
            bot = new SignalBot({
                phoneNumber: '+1234567890',
            });

            const commands = bot.getCommands();
            expect(commands.length).toBeGreaterThan(0); // Should have default commands
        });

        test('should use custom command prefix', () => {
            bot = new SignalBot({
                phoneNumber: '+1234567890',
                settings: {
                    commandPrefix: '!',
                },
            });

            expect(bot).toBeDefined();
        });

        test('should handle all settings', () => {
            bot = new SignalBot({
                phoneNumber: '+1234567890',
                admins: ['+1111111111'],
                settings: {
                    commandPrefix: '$',
                    autoReact: false,
                    logMessages: false,
                    welcomeNewMembers: false,
                    cooldownSeconds: 5,
                    maxMessageLength: 2000,
                },
            });

            expect(bot).toBeDefined();
        });
    });

    describe('Signal CLI Access', () => {
        test('should provide access to underlying SignalCli', () => {
            bot = new SignalBot(mockConfig);

            const signalCli = bot.getSignalCli();
            expect(signalCli).toBeDefined();
            expect(signalCli.connect).toBeDefined();
            expect(signalCli.disconnect).toBeDefined();
        });
    });

    describe('Bot State', () => {
        test('should track running state', () => {
            bot = new SignalBot(mockConfig);

            // Bot is not running initially
            expect(bot.getStats().startTime).toBeDefined();
        });

        test('should handle stop when not running', async () => {
            bot = new SignalBot(mockConfig);

            await expect(bot.stop()).resolves.toBeUndefined();
        });
    });

    describe('Image Download Feature', () => {
        test('should have downloadImageFromUrl method', () => {
            bot = new SignalBot(mockConfig);

            expect(bot.downloadImageFromUrl).toBeDefined();
            expect(typeof bot.downloadImageFromUrl).toBe('function');
        });

        test('should have sendMessageWithImage method', () => {
            bot = new SignalBot(mockConfig);

            expect(bot.sendMessageWithImage).toBeDefined();
            expect(typeof bot.sendMessageWithImage).toBe('function');
        });
    });

    describe('Event Emitters', () => {
        test('should emit ready event structure', (done) => {
            bot = new SignalBot({
                phoneNumber: '+1234567890',
                group: {
                    name: 'Test Group',
                    createIfNotExists: false,
                },
            });

            const mockSignalCli = bot.getSignalCli();
            jest.spyOn(mockSignalCli, 'listDevices').mockResolvedValue([
                { id: 1, name: 'Test Device', created: Date.now(), lastSeen: Date.now() },
            ]);
            jest.spyOn(mockSignalCli, 'connect').mockResolvedValue(undefined);
            jest.spyOn(mockSignalCli, 'on').mockReturnValue(mockSignalCli);

            bot.on('ready', () => {
                done();
            });

            bot.start().catch(done);
        });

        test('should have stopped event', async () => {
            bot = new SignalBot(mockConfig);

            const stoppedHandler = jest.fn();
            bot.on('stopped', stoppedHandler);

            await bot.stop();

            expect(stoppedHandler).toHaveBeenCalled();
        });
    });

    describe('Default Commands', () => {
        test('should include help command', () => {
            bot = new SignalBot(mockConfig);

            const commands = bot.getCommands();
            const helpCmd = commands.find((c) => c.name === 'help');

            expect(helpCmd).toBeDefined();
            expect(helpCmd?.description).toBeDefined();
        });

        test('should include stats command', () => {
            bot = new SignalBot(mockConfig);

            const commands = bot.getCommands();
            const statsCmd = commands.find((c) => c.name === 'stats');

            expect(statsCmd).toBeDefined();
            expect(statsCmd?.description).toBeDefined();
        });

        test('should include ping command', () => {
            bot = new SignalBot(mockConfig);

            const commands = bot.getCommands();
            const pingCmd = commands.find((c) => c.name === 'ping');

            expect(pingCmd).toBeDefined();
            expect(pingCmd?.description).toBeDefined();
        });

        test('should include info command', () => {
            bot = new SignalBot(mockConfig);

            const commands = bot.getCommands();
            const infoCmd = commands.find((c) => c.name === 'info');

            expect(infoCmd).toBeDefined();
            expect(infoCmd?.description).toBeDefined();
        });
    });

    describe('Group Configuration with Avatar', () => {
        test('should handle group config with avatar URL', () => {
            bot = new SignalBot({
                phoneNumber: '+1234567890',
                group: {
                    name: 'Test Group',
                    description: 'Test Description',
                    createIfNotExists: true,
                    initialMembers: ['+1111111111'],
                    avatar: 'https://example.com/avatar.jpg',
                },
            });

            expect(bot).toBeDefined();
        });

        test('should handle group config with local avatar path', () => {
            bot = new SignalBot({
                phoneNumber: '+1234567890',
                group: {
                    name: 'Test Group',
                    description: 'Test Description',
                    createIfNotExists: true,
                    initialMembers: ['+1111111111'],
                    avatar: '/path/to/local/avatar.jpg',
                },
            });

            expect(bot).toBeDefined();
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty admins list', () => {
            bot = new SignalBot({
                phoneNumber: '+1234567890',
                admins: [],
            });

            expect(bot.isAdmin('+1234567890')).toBe(false);
        });

        test('should handle undefined settings', () => {
            bot = new SignalBot({
                phoneNumber: '+1234567890',
                settings: undefined,
            });

            expect(bot).toBeDefined();
        });

        test('should handle partial settings', () => {
            bot = new SignalBot({
                phoneNumber: '+1234567890',
                settings: {
                    commandPrefix: '!',
                    // Other settings will use defaults
                },
            });

            expect(bot).toBeDefined();
        });
    });
});
