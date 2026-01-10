const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true }, // 'telegram', 'drive', 'general'
    value: { type: mongoose.Schema.Types.Mixed }, // JSON payload
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Settings', settingsSchema);
