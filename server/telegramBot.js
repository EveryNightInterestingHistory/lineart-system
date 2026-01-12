require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const User = require('./models/User'); // Mongoose Model

let bot = null;
const pendingLinks = new Map(); // Store temporary codes: "12345" -> chatId

/**
 * Initialize Bot
 */
function initializeBot() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.warn('⚠️ Telegram Bot Token missing in .env');
        return;
    }

    // Polling allows the bot to receive messages without a webhook
    bot = new TelegramBot(token, { polling: true });

    console.log('🤖 Telegram Bot started (Polling mode)');

    // Handle /start command
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        const code = Math.floor(10000 + Math.random() * 90000).toString(); // 5-digit code

        pendingLinks.set(code, chatId);

        // Auto-expire code after 10 minutes
        setTimeout(() => pendingLinks.delete(code), 10 * 60 * 1000);

        bot.sendMessage(chatId, `🔐 **Привязка аккаунта LineART**\n\nВаш код: \`${code}\`\n\nВведите его в настройках профиля на сайте.`, {
            parse_mode: 'Markdown'
        });
    });

    // Handle simple messages
    bot.on('message', (msg) => {
        if (!msg.text || msg.text.startsWith('/')) return;
        // bot.sendMessage(msg.chat.id, "Я пока умею только /start для привязки аккаунта.");
    });

    // Error handling
    bot.on('polling_error', (error) => {
        if (error.code === 'ETELEGRAM' && error.message.includes('409 Conflict')) {
            // Suppress conflict errors (happens during re-deploy or conflicting instances)
            console.warn('⚠️ Telegram Conflict (409): Another instance is active. Ignoring.');
        } else {
            console.error('Telegram Polling Error:', error.code || error.message);
        }
    });
}

/**
 * Verify link code and return Chat ID
 * @param {string} code 
 * @returns {string|null} chatId or null
 */
function verifyLinkCode(code) {
    if (pendingLinks.has(code)) {
        const chatId = pendingLinks.get(code);
        pendingLinks.delete(code); // One-time use
        return chatId;
    }
    return null;
}

/**
 * Send notification to all linked users
 * @param {string} message 
 */
async function notifyAllUsers(message) {
    if (!bot) return;

    try {
        const users = await User.find({ telegramChatId: { $ne: null } });
        for (const user of users) {
            bot.sendMessage(user.telegramChatId, message, { parse_mode: 'HTML' })
                .catch(err => console.error(`Failed to send to ${user.username}:`, err.message));
        }
    } catch (err) {
        console.error('Notify error:', err);
    }
}

/**
 * Send file to all linked users (for Archives)
 */
async function sendFileToAll(filePath, caption) {
    if (!bot) return;
    try {
        const users = await User.find({ telegramChatId: { $ne: null } });
        for (const user of users) {
            bot.sendDocument(user.telegramChatId, filePath, { caption })
                .catch(err => console.error(`Failed to send doc to ${user.username}:`, err.message));
        }
    } catch (err) {
        console.error('Send file error:', err);
    }
}

// Exports
module.exports = {
    initializeBot: () => {
        if (!bot) initializeBot();
    },
    verifyLinkCode,
    notifyAllUsers,
    sendFileToAll,
    isConfigured: () => !!process.env.TELEGRAM_BOT_TOKEN
};
