# Advanced Features

Master advanced Signal SDK features and techniques for power users. This guide covers performance optimization, custom implementations, security patterns, and production strategies.

## Overview

This guide covers advanced topics for developers who want to:

- **Optimize Performance** - Maximize throughput and minimize latency
- **Enhance Security** - Implement robust security patterns
- **Custom Architectures** - Build custom Signal implementations
- **Monitor & Debug** - Advanced logging and monitoring
- **Scale Production** - Deploy at scale with high availability

## Performance Optimization

### Connection Pooling

```javascript
const { SignalCli } = require('signal-sdk');

class SignalPool {
    constructor(phoneNumbers, poolSize = 3) {
        this.pools = new Map();
        this.poolSize = poolSize;
        
        phoneNumbers.forEach(phone => {
            this.pools.set(phone, {
                connections: [],
                activeIndex: 0
            });
        });
    }
    
    async getConnection(phoneNumber) {
        const pool = this.pools.get(phoneNumber);
        if (!pool) throw new Error(`No pool for ${phoneNumber}`);
        
        // Create connections if needed
        if (pool.connections.length < this.poolSize) {
            const signal = new SignalCli(undefined, phoneNumber);
            await signal.connect();
            pool.connections.push(signal);
        }
        
        // Round-robin selection
        const connection = pool.connections[pool.activeIndex];
        pool.activeIndex = (pool.activeIndex + 1) % pool.connections.length;
        
        return connection;
    }
    
    async sendMessage(phoneNumber, recipient, message, options = {}) {
        const signal = await this.getConnection(phoneNumber);
        return signal.sendMessage(recipient, message, options);
    }
    
    async shutdown() {
        for (const [phone, pool] of this.pools) {
            await Promise.all(pool.connections.map(conn => conn.gracefulShutdown()));
        }
    }
}

// Usage
const pool = new SignalPool(['+33111111111', '+33222222222']);
await pool.sendMessage('+33111111111', '+33000000000', 'Hello!');
```

### Batch Operations

```javascript
class BatchProcessor {
    constructor(signalCli, batchSize = 10, delayMs = 100) {
        this.signal = signalCli;
        this.batchSize = batchSize;
        this.delayMs = delayMs;
        this.queue = [];
        this.processing = false;
    }
    
    async addMessage(recipient, message, options = {}) {
        return new Promise((resolve, reject) => {
            this.queue.push({ recipient, message, options, resolve, reject });
            this.processQueue();
        });
    }
    
    async processQueue() {
        if (this.processing || this.queue.length === 0) return;
        
        this.processing = true;
        
        while (this.queue.length > 0) {
            const batch = this.queue.splice(0, this.batchSize);
            
            await Promise.all(batch.map(async (item) => {
                try {
                    const result = await this.signal.sendMessage(
                        item.recipient, 
                        item.message, 
                        item.options
                    );
                    item.resolve(result);
                } catch (error) {
                    item.reject(error);
                }
            }));
            
            // Delay between batches to avoid rate limiting
            if (this.queue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, this.delayMs));
            }
        }
        
        this.processing = false;
    }
}

// Usage
const batch = new BatchProcessor(signal, 5, 200);

// Queue multiple messages
const promises = [
    batch.addMessage('+33000000001', 'Hello 1'),
    batch.addMessage('+33000000002', 'Hello 2'),
    batch.addMessage('+33000000003', 'Hello 3')
];

await Promise.all(promises);
```

### Message Queuing

```javascript
const Queue = require('bull');
const redis = require('redis');

class MessageQueue {
    constructor(signalCli, redisConfig = {}) {
        this.signal = signalCli;
        this.queue = new Queue('message queue', {
            redis: redisConfig
        });
        
        this.setupProcessor();
    }
    
    setupProcessor() {
        this.queue.process('sendMessage', async (job) => {
            const { recipient, message, options } = job.data;
            
            try {
                const result = await this.signal.sendMessage(recipient, message, options);
                return result;
            } catch (error) {
                throw error;
            }
        });
        
        this.queue.on('completed', (job, result) => {
            console.log(`- Message sent: ${job.data.recipient}`);
        });
        
        this.queue.on('failed', (job, error) => {
            console.error(`ERROR: Message failed: ${job.data.recipient}`, error);
        });
    }
    
    async queueMessage(recipient, message, options = {}, jobOptions = {}) {
        return this.queue.add('sendMessage', 
            { recipient, message, options }, 
            {
                delay: jobOptions.delay || 0,
                attempts: jobOptions.retries || 3,
                backoff: 'exponential',
                ...jobOptions
            }
        );
    }
    
    async getStats() {
        return {
            waiting: await this.queue.getWaiting(),
            active: await this.queue.getActive(),
            completed: await this.queue.getCompleted(),
            failed: await this.queue.getFailed()
        };
    }
}

// Usage with Redis
const messageQueue = new MessageQueue(signal, {
    host: 'localhost',
    port: 6379
});

// Queue message with 30 second delay
await messageQueue.queueMessage(
    '+33000000000', 
    'Delayed message', 
    {},
    { delay: 30000 }
);
```

## Custom JSON-RPC Implementation

### Direct JSON-RPC Client

```javascript
const net = require('net');
const { EventEmitter } = require('events');

class SignalRPC extends EventEmitter {
    constructor(socketPath = '/tmp/signal-cli-rpc') {
        super();
        this.socketPath = socketPath;
        this.socket = null;
        this.requestId = 0;
        this.pendingRequests = new Map();
    }
    
    async connect() {
        return new Promise((resolve, reject) => {
            this.socket = net.createConnection(this.socketPath);
            
            this.socket.on('connect', () => {
                console.log('🔌 Connected to Signal RPC');
                resolve();
            });
            
            this.socket.on('data', (data) => {
                this.handleResponse(data.toString());
            });
            
            this.socket.on('error', reject);
        });
    }
    
    handleResponse(data) {
        const lines = data.trim().split('\n');
        
        lines.forEach(line => {
            try {
                const response = JSON.parse(line);
                
                if (response.id && this.pendingRequests.has(response.id)) {
                    const { resolve, reject } = this.pendingRequests.get(response.id);
                    this.pendingRequests.delete(response.id);
                    
                    if (response.error) {
                        reject(new Error(response.error.message));
                    } else {
                        resolve(response.result);
                    }
                } else if (response.method) {
                    // Handle notifications
                    this.emit(response.method, response.params);
                }
            } catch (error) {
                console.error('Failed to parse RPC response:', error);
            }
        });
    }
    
    async call(method, params = {}) {
        const id = ++this.requestId;
        const request = {
            jsonrpc: '2.0',
            method,
            params,
            id
        };
        
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
            this.socket.write(JSON.stringify(request) + '\n');
            
            // Timeout after 30 seconds
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error('RPC call timeout'));
                }
            }, 30000);
        });
    }
    
    async sendMessage(recipient, message, attachments = []) {
        return this.call('send', {
            recipient,
            message,
            attachments
        });
    }
    
    async createGroup(name, members = []) {
        return this.call('createGroup', {
            name,
            members
        });
    }
    
    disconnect() {
        if (this.socket) {
            this.socket.end();
        }
    }
}

// Usage
const rpc = new SignalRPC();
await rpc.connect();

// Listen for incoming messages
rpc.on('receive', (params) => {
    console.log('📨 Message received:', params);
});

await rpc.sendMessage('+33000000000', 'Hello via RPC!');
```

### WebSocket Bridge

```javascript
const WebSocket = require('ws');
const { SignalCli } = require('signal-sdk');

class SignalWebSocketBridge {
    constructor(port = 8080, phoneNumber) {
        this.port = port;
        this.phoneNumber = phoneNumber;
        this.signal = null;
        this.wss = null;
        this.clients = new Set();
    }
    
    async start() {
        // Initialize Signal
        this.signal = new SignalCli(undefined, this.phoneNumber);
        await this.signal.connect();
        
        // Setup WebSocket server
        this.wss = new WebSocket.Server({ port: this.port });
        
        this.wss.on('connection', (ws) => {
            console.log('👤 Client connected');
            this.clients.add(ws);
            
            ws.on('message', async (data) => {
                try {
                    const request = JSON.parse(data);
                    await this.handleRequest(ws, request);
                } catch (error) {
                    this.sendError(ws, error.message);
                }
            });
            
            ws.on('close', () => {
                console.log('👤 Client disconnected');
                this.clients.delete(ws);
            });
        });
        
        // Forward Signal messages to all clients
        this.signal.on('message', (message) => {
            this.broadcast('message', message);
        });
        
        console.log(`- WebSocket bridge running on port ${this.port}`);
    }
    
    async handleRequest(ws, request) {
        const { id, method, params } = request;
        
        try {
            let result;
            
            switch (method) {
                case 'sendMessage':
                    result = await this.signal.sendMessage(
                        params.recipient, 
                        params.message, 
                        params.options
                    );
                    break;
                    
                case 'createGroup':
                    result = await this.signal.createGroup(
                        params.name, 
                        params.members
                    );
                    break;
                    
                case 'getContacts':
                    result = await this.signal.getContacts();
                    break;
                    
                default:
                    throw new Error(`Unknown method: ${method}`);
            }
            
            this.sendResponse(ws, id, result);
        } catch (error) {
            this.sendError(ws, error.message, id);
        }
    }
    
    sendResponse(ws, id, result) {
        ws.send(JSON.stringify({
            id,
            result,
            error: null
        }));
    }
    
    sendError(ws, message, id = null) {
        ws.send(JSON.stringify({
            id,
            result: null,
            error: { message }
        }));
    }
    
    broadcast(event, data) {
        const message = JSON.stringify({ event, data });
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
    
    async stop() {
        if (this.wss) {
            this.wss.close();
        }
        if (this.signal) {
            await this.signal.gracefulShutdown();
        }
    }
}

// Usage
const bridge = new SignalWebSocketBridge(8080, '+33111111111');
await bridge.start();
```

## Security Patterns

### Message Encryption

```javascript
const crypto = require('crypto');

class SecureSignalBot {
    constructor(signalBot, encryptionKey) {
        this.bot = signalBot;
        this.key = crypto.scryptSync(encryptionKey, 'salt', 32);
        this.setupSecureHandlers();
    }
    
    setupSecureHandlers() {
        // Intercept outgoing messages
        const originalSendMessage = this.bot.sendMessage.bind(this.bot);
        this.bot.sendMessage = async (recipient, message, options = {}) => {
            if (options.encrypt) {
                message = this.encrypt(message);
            }
            return originalSendMessage(recipient, message, options);
        };
        
        // Decrypt incoming messages
        this.bot.on('message', (message) => {
            if (this.isEncrypted(message.text)) {
                try {
                    message.decryptedText = this.decrypt(message.text);
                    this.bot.emit('secureMessage', message);
                } catch (error) {
                    console.error('Failed to decrypt message:', error);
                }
            }
        });
    }
    
    encrypt(text) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher('aes-256-cbc', this.key);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return `🔒${iv.toString('hex')}:${encrypted}`;
    }
    
    decrypt(encryptedText) {
        if (!encryptedText.startsWith('🔒')) {
            throw new Error('Not an encrypted message');
        }
        
        const content = encryptedText.substring(2);
        const [ivHex, encrypted] = content.split(':');
        
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', this.key, iv);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }
    
    isEncrypted(text) {
        return text && text.startsWith('🔒');
    }
}

// Usage
const secureBot = new SecureSignalBot(bot, 'my-secret-key');

// Send encrypted message
await secureBot.bot.sendMessage('+33000000000', 'Secret message', { 
    encrypt: true 
});

// Handle decrypted messages
secureBot.bot.on('secureMessage', (message) => {
    console.log('🔓 Decrypted:', message.decryptedText);
});
```

### Access Control

```javascript
class AccessControlBot {
    constructor(signalBot) {
        this.bot = signalBot;
        this.permissions = new Map();
        this.sessions = new Map();
        this.setupAccessControl();
    }
    
    setupAccessControl() {
        this.bot.addMiddleware(async (message, next) => {
            if (!await this.checkPermission(message)) {
                this.bot.sendMessage(message.source, 'ERROR: Access denied');
                return;
            }
            await next();
        });
    }
    
    async checkPermission(message) {
        const user = message.source;
        const command = message.text.split(' ')[0];
        
        // Check if user is authenticated
        if (!this.isAuthenticated(user)) {
            if (command === '/login') {
                return true; // Allow login command
            }
            this.bot.sendMessage(user, 'Please login first: /login <password>');
            return false;
        }
        
        // Check command permissions
        const userRole = this.getUserRole(user);
        const requiredRole = this.getCommandRole(command);
        
        return this.hasPermission(userRole, requiredRole);
    }
    
    isAuthenticated(user) {
        return this.sessions.has(user) && 
               this.sessions.get(user).expires > Date.now();
    }
    
    authenticate(user, password) {
        // In production, use proper password hashing
        const validPasswords = {
            'admin': 'admin123',
            'user': 'user123'
        };
        
        for (const [role, pass] of Object.entries(validPasswords)) {
            if (password === pass) {
                this.sessions.set(user, {
                    role,
                    expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
                });
                return role;
            }
        }
        
        return null;
    }
    
    getUserRole(user) {
        const session = this.sessions.get(user);
        return session ? session.role : null;
    }
    
    getCommandRole(command) {
        const roleMap = {
            '/admin': 'admin',
            '/ban': 'admin',
            '/kick': 'admin',
            '/stats': 'user',
            '/help': 'user'
        };
        
        return roleMap[command] || 'user';
    }
    
    hasPermission(userRole, requiredRole) {
        const hierarchy = { 'admin': 2, 'user': 1 };
        return hierarchy[userRole] >= hierarchy[requiredRole];
    }
    
    setupCommands() {
        this.bot.addCommand({
            name: 'login',
            description: 'Authenticate user',
            handler: async (message, args) => {
                const password = args.join(' ');
                const role = this.authenticate(message.source, password);
                
                if (role) {
                    return `Logged in as ${role}`;
                } else {
                    return 'ERROR: Invalid password';
                }
            }
        });
        
        this.bot.addCommand({
            name: 'logout',
            description: 'End session',
            handler: async (message) => {
                this.sessions.delete(message.source);
                return 'Logged out successfully';
            }
        });
        
        this.bot.addCommand({
            name: 'whoami',
            description: 'Show current role',
            handler: async (message) => {
                const role = this.getUserRole(message.source);
                return role ? `You are: ${role}` : 'ERROR: Not authenticated';
            }
        });
    }
}

// Usage
const accessBot = new AccessControlBot(bot);
accessBot.setupCommands();
```

## Monitoring & Analytics

### Advanced Logging

```javascript
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

class SignalLogger {
    constructor() {
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                }),
                new DailyRotateFile({
                    filename: 'logs/signal-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    maxSize: '20m',
                    maxFiles: '14d'
                }),
                new DailyRotateFile({
                    filename: 'logs/signal-error-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    level: 'error',
                    maxSize: '20m',
                    maxFiles: '30d'
                })
            ]
        });
    }
    
    logMessage(direction, source, destination, message, metadata = {}) {
        this.logger.info('Message', {
            direction, // 'incoming' or 'outgoing'
            source,
            destination,
            message: message.substring(0, 100), // Truncate for privacy
            messageLength: message.length,
            timestamp: new Date().toISOString(),
            ...metadata
        });
    }
    
    logCommand(user, command, args, success, responseTime) {
        this.logger.info('Command', {
            user,
            command,
            args: args.join(' '),
            success,
            responseTime,
            timestamp: new Date().toISOString()
        });
    }
    
    logError(error, context = {}) {
        this.logger.error('Error', {
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString()
        });
    }
    
    logMetrics(metrics) {
        this.logger.info('Metrics', {
            type: 'metrics',
            ...metrics,
            timestamp: new Date().toISOString()
        });
    }
}

// Usage with SignalBot
const logger = new SignalLogger();

bot.on('message', (message) => {
    logger.logMessage('incoming', message.source, 'bot', message.text, {
        groupId: message.groupId,
        hasAttachments: message.attachments.length > 0
    });
});

// Wrap command handlers with logging
const originalAddCommand = bot.addCommand.bind(bot);
bot.addCommand = (commandConfig) => {
    const originalHandler = commandConfig.handler;
    commandConfig.handler = async (message, args) => {
        const startTime = Date.now();
        let success = false;
        
        try {
            const result = await originalHandler(message, args);
            success = true;
            return result;
        } catch (error) {
            logger.logError(error, { command: commandConfig.name, user: message.source });
            throw error;
        } finally {
            const responseTime = Date.now() - startTime;
            logger.logCommand(message.source, commandConfig.name, args, success, responseTime);
        }
    };
    
    originalAddCommand(commandConfig);
};
```

### Performance Metrics

```javascript
class SignalMetrics {
    constructor() {
        this.metrics = {
            messages: { sent: 0, received: 0, failed: 0 },
            commands: { executed: 0, failed: 0 },
            connections: { active: 0, total: 0 },
            performance: { avgResponseTime: 0, responseTimeSum: 0, responseTimeCount: 0 }
        };
        
        this.startTime = Date.now();
        this.setupPeriodicReporting();
    }
    
    incrementMessage(type) {
        this.metrics.messages[type]++;
    }
    
    incrementCommand(success) {
        if (success) {
            this.metrics.commands.executed++;
        } else {
            this.metrics.commands.failed++;
        }
    }
    
    recordResponseTime(ms) {
        this.metrics.performance.responseTimeSum += ms;
        this.metrics.performance.responseTimeCount++;
        this.metrics.performance.avgResponseTime = 
            this.metrics.performance.responseTimeSum / this.metrics.performance.responseTimeCount;
    }
    
    getMetrics() {
        return {
            ...this.metrics,
            uptime: Date.now() - this.startTime,
            timestamp: Date.now()
        };
    }
    
    setupPeriodicReporting() {
        setInterval(() => {
            const metrics = this.getMetrics();
            console.log('Metrics Report:', metrics);
            
            // Send to monitoring service
            this.sendToMonitoring(metrics);
        }, 60000); // Every minute
    }
    
    async sendToMonitoring(metrics) {
        // Example: Send to external monitoring service
        try {
            await fetch('https://monitoring.example.com/metrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metrics)
            });
        } catch (error) {
            console.error('Failed to send metrics:', error);
        }
    }
}

// Usage
const metrics = new SignalMetrics();

bot.on('message', () => metrics.incrementMessage('received'));

// Wrap sendMessage to track sent messages
const originalSendMessage = bot.sendMessage.bind(bot);
bot.sendMessage = async (...args) => {
    try {
        const result = await originalSendMessage(...args);
        metrics.incrementMessage('sent');
        return result;
    } catch (error) {
        metrics.incrementMessage('failed');
        throw error;
    }
};
```

## Integration Patterns

### REST API Integration

```javascript
const express = require('express');
const { SignalBot } = require('signal-sdk');

class SignalRESTAPI {
    constructor(signalBot, port = 3000) {
        this.bot = signalBot;
        this.app = express();
        this.port = port;
        this.setupMiddleware();
        this.setupRoutes();
    }
    
    setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        // CORS
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            next();
        });
        
        // API Key authentication
        this.app.use((req, res, next) => {
            if (req.path === '/health') return next();
            
            const apiKey = req.headers['x-api-key'];
            if (!apiKey || apiKey !== process.env.API_KEY) {
                return res.status(401).json({ error: 'Invalid API key' });
            }
            next();
        });
    }
    
    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'healthy', uptime: process.uptime() });
        });
        
        // Send message
        this.app.post('/messages', async (req, res) => {
            try {
                const { recipient, message, attachments } = req.body;
                
                if (!recipient || !message) {
                    return res.status(400).json({ 
                        error: 'recipient and message are required' 
                    });
                }
                
                const result = await this.bot.sendMessage(recipient, message, {
                    attachments: attachments || []
                });
                
                res.json({ success: true, result });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // Get contacts
        this.app.get('/contacts', async (req, res) => {
            try {
                const contacts = await this.bot.signalCli.getContacts();
                res.json({ contacts });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // Create group
        this.app.post('/groups', async (req, res) => {
            try {
                const { name, members, description } = req.body;
                
                if (!name || !members) {
                    return res.status(400).json({ 
                        error: 'name and members are required' 
                    });
                }
                
                const group = await this.bot.signalCli.createGroup(name, members);
                
                if (description) {
                    await this.bot.signalCli.updateGroup(group.groupId, {
                        description
                    });
                }
                
                res.json({ success: true, group });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // Get statistics
        this.app.get('/stats', (req, res) => {
            const stats = this.bot.getStats();
            res.json({ stats });
        });
    }
    
    start() {
        this.app.listen(this.port, () => {
            console.log(`Signal REST API running on port ${this.port}`);
        });
    }
}

// Usage
const api = new SignalRESTAPI(bot, 3000);
api.start();
```

### Webhook Integration

```javascript
class WebhookManager {
    constructor(signalBot) {
        this.bot = signalBot;
        this.webhooks = new Map();
        this.setupEventHandlers();
    }
    
    setupEventHandlers() {
        this.bot.on('message', async (message) => {
            await this.triggerWebhooks('message', {
                source: message.source,
                text: message.text,
                groupId: message.groupId,
                timestamp: Date.now()
            });
        });
        
        this.bot.on('memberJoined', async (groupId, member) => {
            await this.triggerWebhooks('memberJoined', {
                groupId,
                member,
                timestamp: Date.now()
            });
        });
    }
    
    addWebhook(event, url, options = {}) {
        if (!this.webhooks.has(event)) {
            this.webhooks.set(event, []);
        }
        
        this.webhooks.get(event).push({
            url,
            headers: options.headers || {},
            retries: options.retries || 3,
            timeout: options.timeout || 5000
        });
    }
    
    async triggerWebhooks(event, data) {
        const webhooks = this.webhooks.get(event) || [];
        
        for (const webhook of webhooks) {
            await this.sendWebhook(webhook, { event, data });
        }
    }
    
    async sendWebhook(webhook, payload) {
        let attempts = 0;
        
        while (attempts < webhook.retries) {
            try {
                const response = await fetch(webhook.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...webhook.headers
                    },
                    body: JSON.stringify(payload),
                    timeout: webhook.timeout
                });
                
                if (response.ok) {
                    console.log(`- Webhook sent: ${webhook.url}`);
                    return;
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (error) {
                attempts++;
                console.error(`ERROR: Webhook failed (${attempts}/${webhook.retries}):`, error);

                if (attempts < webhook.retries) {
                    await new Promise(resolve => 
                        setTimeout(resolve, 1000 * attempts)
                    );
                }
            }
        }
    }
}

// Usage
const webhookManager = new WebhookManager(bot);

// Add webhooks for different events
webhookManager.addWebhook('message', 'https://api.example.com/signal/message', {
    headers: { 'Authorization': 'Bearer token123' },
    retries: 5
});

webhookManager.addWebhook('memberJoined', 'https://api.example.com/signal/join');
```

## Production Strategies

### High Availability Setup

```javascript
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);
    
    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    
    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        cluster.fork(); // Restart worker
    });
} else {
    // Worker process
    const { SignalBot } = require('signal-sdk');
    
    const bot = new SignalBot({
        phoneNumber: process.env.SIGNAL_PHONE_NUMBER,
        // ... other config
    });
    
    bot.start().then(() => {
        console.log(`Worker ${process.pid} started`);
    });
}
```

### Circuit Breaker Pattern

```javascript
class CircuitBreaker {
    constructor(threshold = 5, timeout = 60000, monitoringPeriod = 10000) {
        this.threshold = threshold;
        this.timeout = timeout;
        this.monitoringPeriod = monitoringPeriod;
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.nextAttempt = null;
    }
    
    async execute(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() >= this.nextAttempt) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error('Circuit breaker is OPEN');
            }
        }
        
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }
    
    onSuccess() {
        this.failureCount = 0;
        this.state = 'CLOSED';
    }
    
    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        
        if (this.failureCount >= this.threshold) {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.timeout;
        }
    }
    
    getState() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            nextAttempt: this.nextAttempt
        };
    }
}

// Usage with Signal
const circuitBreaker = new CircuitBreaker(3, 30000);

async function safeSendMessage(recipient, message) {
    return circuitBreaker.execute(async () => {
        return await bot.sendMessage(recipient, message);
    });
}
```

## Next Steps

- Explore the [Examples Guide](./examples-guide.md) for practical implementations
- Check the [API Reference](./api-reference.md) for complete method documentation  
- Build bots with the [SignalBot Framework](./signalbot-framework.md)
- Troubleshoot issues with the [Troubleshooting Guide](./troubleshooting.md)

---

**Ready for production?** These advanced patterns will help you build robust, scalable Signal applications! 