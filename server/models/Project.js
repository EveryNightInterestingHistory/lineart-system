const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    name: String,
    path: String, // URL (Google Drive)
    type: String, // 'file' or 'image'
    comment: String,
    uploadedBy: String,
    uploadedAt: { type: Date, default: Date.now }
});

const sectionSchema = new mongoose.Schema({
    id: String, // Keep string IDs for compatibility with frontend
    name: String, // "Эскизный проект", "Макет"
    engineer: String, // Username
    status: {
        type: String,
        enum: ['in-progress', 'on-review', 'correction', 'accepted', 'sketch', 'checked', 'completed', 'delivered'],
        default: 'in-progress'
    },
    dueDate: String, // YYYY-MM-DD
    dueTime: String, // HH:MM
    files: [fileSchema]
});

const projectSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Timestamp-based ID from frontend
    name: { type: String, required: true },
    client: { type: String, required: true },
    status: { type: String, default: 'in-progress' },
    address: String,
    contractAmount: Number,
    paidAmount: Number,
    manager: String, // Username
    folderName: String, // For Google Drive / Local folder reference
    sections: [sectionSchema],
    photos: [fileSchema], // Gallery
    latitude: Number,
    longitude: Number,
    history: [{
        date: { type: Date, default: Date.now },
        action: String,
        details: String,
        user: String
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', projectSchema);
