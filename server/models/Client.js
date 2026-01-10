const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    id: { type: String, required: true }, // Timestamp ID
    name: { type: String, required: true },
    type: { type: String, enum: ['individual', 'legal'], default: 'individual' },
    phone: String,
    rating: { type: String, enum: ['vip', 'active', 'problem', 'blacklist', 'lead'], default: 'lead' },
    source: String, // 'instagram', 'referral', etc.
    notes: String,
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Client', clientSchema);
