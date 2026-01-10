require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const connectDB = require('./server/db');

// Models
const User = require('./server/models/User');
const Project = require('./server/models/Project');
// const Client = require('./server/models/Client'); // Future
// const Transaction = require('./server/models/Transaction'); // Future

// Services
const googleDrive = require('./server/googleDrive');
const telegramBot = require('./server/telegramBot');
const projectArchiver = require('./server/archiver');

// Connect to Database
connectDB();

// 🛠️ AUTO-CREATE ADMIN USER (Bootstrap for new DB)
const mongoose = require('mongoose');
mongoose.connection.once('open', async () => {
    try {
        const adminCount = await User.countDocuments({ username: 'Jahongir' });
        if (adminCount === 0) {
            console.log('⚡ Creating default admin user...');
            await User.create({
                username: 'Jahongir',
                password: '45144514', // Plain text for now
                role: 'admin',
                telegramChatId: null
            });
            console.log('✅ Default admin user created: Jahongir');
        } else {
            console.log('🔒 Admin user already exists');
        }
    } catch (err) {
        console.error('❌ Failed to create default admin:', err);
    }
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname)); // Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'projects'))); // Legacy support for local files

// =====================================================
// AUTHENTICATION (MongoDB)
// =====================================================

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Plain text password comparison (Upgrade to bcrypt later!)
        const user = await User.findOne({ username, password });

        if (user) {
            // 👑 FORCE ADMIN FOR OWNER (Jahongir)
            if (user.username === 'Jahongir' && user.role !== 'admin') {
                user.role = 'admin';
                await user.save();
                console.log('👑 Admin rights restored for Jahongir');
            }

            const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
            res.json({
                success: true,
                token,
                role: user.role,
                username: user.username,
                telegramChatId: user.telegramChatId
            });
        } else {
            res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Register User Endpoint
app.post('/api/register-user', async (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Missing credentials' });

    try {
        const exists = await User.findOne({ username });
        if (exists) return res.status(400).json({ success: false, message: 'Пользователь уже существует' });

        await User.create({ username, password, role: role || 'engineer' });
        res.json({ success: true, message: 'User registered' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Delete User Endpoint
app.post('/api/delete-user', async (req, res) => {
    const { username } = req.body;
    // Basic security: In real app, check if requester is admin via headers/token

    if (!username) return res.status(400).json({ success: false, message: 'Username required' });

    try {
        const deleted = await User.findOneAndDelete({ username });
        if (deleted) {
            console.log(`🗑️ User deleted: ${username}`);
            res.json({ success: true, message: 'User deleted' });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Telegram Link Endpoint
app.post('/api/link-telegram', async (req, res) => {
    const { username, code } = req.body;

    if (!telegramBot.isConfigured()) return res.status(400).json({ success: false, message: 'Bot not configured' });

    const chatId = telegramBot.verifyLinkCode(code);
    if (!chatId) {
        return res.status(400).json({ success: false, message: 'Неверный или устаревший код' });
    }

    try {
        await User.findOneAndUpdate({ username }, { telegramChatId: chatId });

        // Notify user via Telegram
        telegramBot.notifyAllUsers(`✅ Пользователь <b>${username}</b> успешно привязал Telegram!`);

        res.json({ success: true, message: 'Telegram привязан' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// General Notification Endpoint (used by Frontend)
app.post('/api/telegram/notify', (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false });

    // Send to all linked users
    telegramBot.notifyAllUsers(message);
    res.json({ success: true });
});

// ✅ GET Telegram Config (Fix for 404 error)
app.get('/api/telegram/config', async (req, res) => {
    // In future: load from User preferences or global config.
    // For now, return default "Enabled" state so frontend sends notifications.
    res.json({
        telegram: {
            enabled: true,
            notifications: {
                statusChange: true,
                newFile: true,
                newComment: true,
                deadline: true
            }
        }
    });
});

// Master Key Reset
app.post('/api/reset-password', async (req, res) => {
    const { username, newPassword, secretKey } = req.body;
    if (secretKey !== process.env.MASTER_KEY) {
        return res.status(403).json({ success: false, message: 'Invalid Master Key' });
    }

    try {
        let user = await User.findOne({ username });
        if (user) {
            user.password = newPassword;
            await user.save();
        } else {
            // Auto-create admin if not exists
            await User.create({ username, password: newPassword, role: 'admin' });
        }
        res.json({ success: true, message: 'Пароль сброшен' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// =====================================================
// PROJECTS API (MongoDB)
// =====================================================

// List Projects
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 });
        res.json(projects);
    } catch (err) {
        console.error('Error listing projects:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Save/Update Project
app.post('/api/save-project', async (req, res) => {
    try {
        const projectData = req.body;
        if (!projectData.id && !projectData.name) return res.status(400).send('Missing data');

        // Ensure ID
        if (!projectData.id) projectData.id = Date.now().toString();

        /* 
           Logic: Update if exists, Create if not.
           We use findOneAndUpdate with upsert: true.
        */

        // Fix: Ensure sections have IDs if missing
        if (projectData.sections) {
            projectData.sections = projectData.sections.map(s => ({
                ...s,
                id: s.id || Math.random().toString(36).substr(2, 9)
            }));
        }

        const updatedProject = await Project.findOneAndUpdate(
            { id: projectData.id },
            projectData,
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        // Notify Telegram if new project (basic check)
        // In a real app we'd compare createdAt, but upsert updates it.
        // For now, let's keep logic simple. Frontend sends notifications explicitly mostly.

        res.json({ success: true, folderName: updatedProject.folderName || projectData.name });
    } catch (err) {
        console.error('Error saving project:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Delete Project
app.post('/api/delete-project', async (req, res) => {
    const { id, folderName } = req.body; // Frontend sends folderName, but we prefer ID
    try {
        // If we have ID, allow delete by ID
        if (id) {
            await Project.deleteOne({ id });
        } else if (folderName) {
            // Legacy/Fallback
            await Project.deleteOne({ folderName });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// =====================================================
// FILE UPLOAD (Google Drive)
// =====================================================
// Upload logic remains similar, but we don't save to FS. It flies to Drive.

const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file' });

        const folderName = req.body.folderName || 'LineART Projects';
        const sectionName = req.body.sectionName || '';

        // 1. Create/Find Folder in Drive
        let projectFolderId;
        if (googleDrive.isConfigured()) {
            const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || null;
            projectFolderId = await googleDrive.createOrFindFolder(folderName, rootFolderId);
            if (sectionName) {
                const safeSection = sectionName.replace(/[^a-z0-9а-яё \-_]/gi, '').trim();
                projectFolderId = await googleDrive.createOrFindFolder(safeSection, projectFolderId);
            }
        } else {
            throw new Error('Google Drive not configured');
        }

        // 2. Upload
        const result = await googleDrive.uploadToGoogleDrive(
            req.file.buffer,
            req.file.originalname,
            projectFolderId,
            req.file.mimetype
        );

        if (result.success) {
            res.json({
                success: true,
                url: result.webViewLink,
                filename: req.file.originalname,
                driveId: result.fileId
            });

            // Notify Telegram about new file
            // We can do it here or let frontend do it. 
            // Frontend logic calls notifyNewFile, let's stick to that to avoid double notifications.
        } else {
            throw new Error(result.error);
        }

    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Delete File (Metadata update handled by frontend saving project, this is for cleanup if needed)
app.post('/api/delete-file', async (req, res) => {
    // With Drive, we might want to delete the file from Drive too.
    // Current frontend logic just removes it from the array and saves the project.
    // So this endpoint might not be strictly called unless we implement Drive deletion.
    // For now, let's return success to not break legacy calls.
    res.json({ success: true });
});

// =====================================================
// TELEGRAM & ARCHIVE
// =====================================================
// (Keep existing logic mostly, but use DB for settings if possible)

// Redirect root to index
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    if (telegramBot.isConfigured()) {
        telegramBot.initializeBot();
        console.log('Telegram Bot initialized');
    }
});
