const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    id: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: String,
    amount: { type: Number, required: true }, // In USD
    amountUZS: Number,
    currency: { type: String, default: 'USD' },
    description: String,
    project: String, // Project Name
    projectId: String,
    client: String,
    isAdvance: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
