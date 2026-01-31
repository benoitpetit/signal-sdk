import { SignalBot } from '../SignalBot';
import { SignalCli } from '../SignalCli';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import { EventEmitter } from 'events';

jest.mock('../SignalCli');
jest.mock('fs');
jest.mock('https');
jest.mock('http');

describe('SignalBot Coverage', () => {
    let bot: SignalBot;
    let mockSignalCli: jest.Mocked<SignalCli>;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Create a real EventEmitter and mix in mocked SignalCli methods
        const emitter = new EventEmitter();
        mockSignalCli = Object.assign(emitter, {
            connect: jest.fn(),
            disconnect: jest.fn(),
            gracefulShutdown: jest.fn(),
            listDevices: jest.fn(),
            sendMessage: jest.fn(),
            sendReaction: jest.fn(),
            sendReceipt: jest.fn(),
            updateGroup: jest.fn(),
            createGroup: jest.fn(),
            listGroups: jest.fn(),
        }) as any;
        
        (SignalCli as any).mockImplementation(() => mockSignalCli);
        
        bot = new SignalBot({
            phoneNumber: '+1234567890',
            admins: ['+admin'],
            settings: {
                cooldownSeconds: 1
            }
        });
    });

    describe('Image Download and Management', () => {
        it('should download image successfully from URL', async () => {
            const mockResponse: any = new EventEmitter();
            mockResponse.statusCode = 200;
            mockResponse.pipe = jest.fn();
            mockResponse.headers = {};
            
            const mockFile: any = new EventEmitter();
            mockFile.close = jest.fn();
            (fs.createWriteStream as jest.Mock).mockReturnValue(mockFile);
            
            const mockRequest: any = new EventEmitter();
            const getMock = jest.spyOn(https, 'get').mockImplementation((url: any, cb: any) => {
                cb(mockResponse);
                return mockRequest;
            });

            const downloadPromise = bot.downloadImageFromUrl('https://example.com/image.jpg');
            
            mockResponse.emit('end');
            mockFile.emit('finish');
            
            const path = await downloadPromise;
            expect(path).toBeDefined();
            expect(getMock).toHaveBeenCalled();
        });

        it('should handle redirects during image download', async () => {
            const mockRedirectResponse: any = new EventEmitter();
            mockRedirectResponse.statusCode = 301;
            mockRedirectResponse.headers = { location: 'https://new-url.com/image.jpg' };
            
            const mockSuccessResponse: any = new EventEmitter();
            mockSuccessResponse.statusCode = 200;
            mockSuccessResponse.pipe = jest.fn();
            mockSuccessResponse.headers = {};
            
            const mockFile: any = new EventEmitter();
            mockFile.close = jest.fn();
            (fs.createWriteStream as jest.Mock).mockReturnValue(mockFile);
            
            const mockRequest: any = new EventEmitter();
            let callCount = 0;
            jest.spyOn(https, 'get').mockImplementation((url: any, cb: any) => {
                if (callCount === 0) {
                    callCount++;
                    cb(mockRedirectResponse);
                } else {
                    cb(mockSuccessResponse);
                }
                return mockRequest;
            });

            const downloadPromise = bot.downloadImageFromUrl('https://example.com/redirect');
            mockFile.emit('finish');
            
            const path = await downloadPromise;
            expect(path).toBeDefined();
        });

        it('should process base64 avatars', async () => {
            const base64Avatar = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
            (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
            
            const result = await (bot as any).processGroupAvatar(base64Avatar);
            expect(result).toContain('bot_avatar_');
            expect(fs.writeFileSync).toHaveBeenCalled();
        });

        it('should process local file avatars', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            const result = await (bot as any).processGroupAvatar('/path/to/avatar.jpg');
            expect(result).toBe('/path/to/avatar.jpg');
        });
    });

    describe('Message and Command Handling', () => {
        it('should ignore own messages', async () => {
            const ownMessage = {
                envelope: {
                    sourceNumber: '+1234567890',
                    dataMessage: { message: 'hello' },
                    timestamp: Date.now()
                }
            };
            
            await (bot as any).handleMessage(ownMessage);
            expect(bot.getStats().messagesReceived).toBe(0);
        });

        it('should process authorized group messages', async () => {
            (bot as any).botGroupId = 'authorized-group';
            const groupMessage = {
                envelope: {
                    sourceNumber: '+someone',
                    dataMessage: { 
                        message: 'hello',
                        groupInfo: { groupId: 'authorized-group' }
                    },
                    timestamp: Date.now()
                }
            };
            
            await (bot as any).handleMessage(groupMessage);
            expect(bot.getStats().messagesReceived).toBe(1);
        });

        it('should ignore unauthorized group messages', async () => {
            (bot as any).botGroupId = 'authorized-group';
            const groupMessage = {
                envelope: {
                    sourceNumber: '+someone',
                    dataMessage: { 
                        message: 'hello',
                        groupInfo: { groupId: 'unauthorized-group' }
                    },
                    timestamp: Date.now()
                }
            };
            
            await (bot as any).handleMessage(groupMessage);
            expect(bot.getStats().messagesReceived).toBe(0);
        });

        it('should handle commands with cooldown', async () => {
            const handler = jest.fn().mockResolvedValue('Response');
            bot.addCommand({
                name: 'test',
                description: 'test',
                handler
            });

            const message = {
                id: '1',
                source: '+user',
                text: '/test',
                timestamp: Date.now(),
                isFromAdmin: false
            };

            await (bot as any).handleCommand(message);
            expect(handler).toHaveBeenCalledTimes(1);

            // Immediate second call should hit cooldown
            await (bot as any).handleCommand(message);
            expect(handler).toHaveBeenCalledTimes(1);
        });

        it('should enforce adminOnly commands', async () => {
            const handler = jest.fn().mockResolvedValue('Secret');
            bot.addCommand({
                name: 'admincmd',
                description: 'admin only',
                adminOnly: true,
                handler
            });

            const message = {
                id: '1',
                source: '+user',
                text: '/admincmd',
                timestamp: Date.now(),
                isFromAdmin: false
            };

            await (bot as any).handleCommand(message);
            
            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe('Action Queue and Process Management', () => {
        it('should process action queue sequentially', async () => {
            mockSignalCli.sendMessage.mockResolvedValue({ results: [], timestamp: Date.now() });
            
            await bot.sendMessage('+user1', 'msg1');
            await bot.sendMessage('+user2', 'msg2');
            
            // Wait for queue to process
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            expect(mockSignalCli.sendMessage).toHaveBeenCalledTimes(2);
        });

        it('should handle sendMessageWithAttachment and cleanup', async () => {
            jest.useFakeTimers();
            mockSignalCli.sendMessage.mockResolvedValue({ results: [], timestamp: Date.now() });
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            
            await bot.sendMessageWithAttachment('+user', 'msg', ['/tmp/file'], ['/tmp/file']);
            
            // Allow queue to start processing
            jest.advanceTimersByTime(100);
            
            expect(mockSignalCli.sendMessage).toHaveBeenCalled();
            
            // Advance timers to trigger cleanup
            jest.advanceTimersByTime(2500);
            
            expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/file');
            jest.useRealTimers();
        });

        it('should handle daemon events', () => {
            const logSpy = jest.spyOn(console, 'log').mockImplementation();
            (bot as any).setupEventHandlers();
            
            mockSignalCli.emit('log', { level: 'info', message: 'test log' });
            expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('test log'));
            
            mockSignalCli.emit('close', 1);
            expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('error code 1'));
            logSpy.mockRestore();
        });
    });

    describe('Startup and Shutdown', () => {
        it('should start gracefully', async () => {
            mockSignalCli.connect.mockResolvedValue(undefined);
            mockSignalCli.listDevices.mockResolvedValue([{ id: 1 } as any]);
            
            await bot.start();
            expect(mockSignalCli.connect).toHaveBeenCalled();
            expect(bot.getStats()).toBeDefined();
        });

        it('should throw error if no devices linked on start', async () => {
            mockSignalCli.connect.mockResolvedValue(undefined);
            mockSignalCli.listDevices.mockResolvedValue([]);
            
            await expect(bot.start()).rejects.toThrow('link the bot first');
        });

        it('should shutdown gracefully', async () => {
            await bot.gracefulShutdown();
            expect(mockSignalCli.gracefulShutdown).toHaveBeenCalled();
        });

        it('should stop bot and clear timers', async () => {
            const timer = setTimeout(() => {}, 10000);
            (bot as any).activeTimers.push(timer);
            
            await bot.stop();
            expect((bot as any).isRunning).toBe(false);
            expect((bot as any).activeTimers.length).toBe(0);
        });
    });

    describe('Group Management', () => {
        beforeEach(() => {
            bot = new SignalBot({
                phoneNumber: '+1234567890',
                admins: ['+admin1'],
                group: {
                    name: 'Test Group',
                    createIfNotExists: true,
                    initialMembers: ['+member1']
                }
            });
        });

        it('should setup group and add missing admins if it already exists', async () => {
            mockSignalCli.listGroups.mockResolvedValue([{
                name: 'Test Group',
                groupId: 'group-id',
                isMember: true,
                members: ['+1234567890'] // +admin1 is missing
            } as any]);

            await (bot as any).setupBotGroup();
            expect((bot as any).botGroupId).toBe('group-id');
            expect(mockSignalCli.updateGroup).toHaveBeenCalledWith('group-id', expect.objectContaining({
                addMembers: ['+admin1']
            }));
        });

        it('should create group if it does not exist', async () => {
            mockSignalCli.listGroups.mockResolvedValue([]);
            mockSignalCli.createGroup.mockResolvedValue({
                groupId: 'new-group-id'
            } as any);

            await (bot as any).setupBotGroup();
            expect((bot as any).botGroupId).toBe('new-group-id');
            expect(mockSignalCli.createGroup).toHaveBeenCalled();
        });
    });

    describe('Utility and Helpers', () => {
        it('should format uptime correctly', () => {
            const botAny = bot as any;
            expect(botAny.formatUptime(1000)).toBe('1s');
            expect(botAny.formatUptime(61000)).toBe('1m 1s');
            expect(botAny.formatUptime(3661000)).toBe('1h 1m');
            expect(botAny.formatUptime(90000000)).toBe('1d 1h 0m');
        });

        it('should handle errors in action queue', async () => {
            const logSpy = jest.spyOn(console, 'log').mockImplementation();
            mockSignalCli.sendMessage.mockRejectedValue(new Error('Send failed'));
            
            await bot.sendMessage('+user', 'test');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to execute action'));
            logSpy.mockRestore();
        });

        it('should send welcome message to admins', async () => {
            const sendMessageSpy = jest.spyOn(bot, 'sendMessage').mockResolvedValue();
            await (bot as any).sendWelcomeMessage();
            expect(sendMessageSpy).toHaveBeenCalled();
        });
    });

    describe('handleMessage edge cases', () => {
        it('should handle messages with groupInfo variants', async () => {
            (bot as any).botGroupId = 'target-id';
            const msg = {
                envelope: {
                    sourceNumber: '+someone',
                    dataMessage: {
                        message: 'hello',
                        groupInfo: { id: 'target-id' } // uses 'id' instead of 'groupId'
                    },
                    timestamp: Date.now()
                }
            };
            await (bot as any).handleMessage(msg);
            expect(bot.getStats().messagesReceived).toBe(1);
        });

        it('should ignore messages with no text and no attachments', async () => {
            const msg = {
                envelope: {
                    sourceNumber: '+someone',
                    dataMessage: {
                        message: '',
                        attachments: undefined // Use undefined to hit the check
                    },
                    timestamp: Date.now()
                }
            };
            await (bot as any).handleMessage(msg);
            expect(bot.getStats().messagesReceived).toBe(0);
        });
    });

    describe('sendMessageWithImage', () => {
        it('should download and send image', async () => {
            const downloadSpy = jest.spyOn(bot, 'downloadImageFromUrl').mockResolvedValue('/tmp/downloaded.jpg');
            const processQueueSpy = jest.spyOn(bot as any, 'processActionQueue').mockImplementation();
            
            await bot.sendMessageWithImage('+recipient', 'caption', 'https://example.com/img.png');
            
            expect(downloadSpy).toHaveBeenCalledWith('https://example.com/img.png', 'bot_image');
            expect((bot as any).actionQueue).toContainEqual(expect.objectContaining({
                type: 'sendMessageWithAttachment',
                attachments: ['/tmp/downloaded.jpg']
            }));
        });
    });

    describe('Action Queue edge cases', () => {
        it('should handle sendReaction action', async () => {
            await bot.sendReaction('+rec', '+author', 123, '😀');
            await new Promise(resolve => setTimeout(resolve, 500));
            expect(mockSignalCli.sendReaction).toHaveBeenCalled();
        });

        it('should handle non-data messages', async () => {
            const msg = { envelope: { receiptMessage: {} } };
            await (bot as any).handleMessage(msg);
            expect(bot.getStats().messagesReceived).toBe(0);
        });
    });
});
