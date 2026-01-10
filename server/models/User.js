const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // In production, hash this!
    role: { type: String, enum: ['admin', 'engineer', 'manager'], default: 'engineer' },
    telegramChatId: { type: String },
    fullName: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
