require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const connectDB = require('./server/db');

// Models
const Project = require('./server/models/Project');
const User = require('./server/models/User');
// const Transaction = require('./server/models/Transaction'); // If needed

const PROJECTS_ROOT = path.join(__dirname, 'projects');
const CREDS_PATH = path.join(__dirname, 'creds.json');

async function migrate() {
    console.log('🔄 Starting Migration...');
    await connectDB();

    // 1. Migrate Users
    console.log('👤 Migrating Users...');
    try {
        if (fs.existsSync(CREDS_PATH)) {
            const creds = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8'));
            if (creds.users) {
                for (const u of creds.users) {
                    const exists = await User.findOne({ username: u.username });
                    if (!exists) {
                        await User.create({
                            username: u.username,
                            password: u.password,
                            role: u.role || 'engineer'
                        });
                        console.log(`   + User info: ${u.username}`);
                    } else {
                        console.log(`   . User exists: ${u.username}`);
                    }
                }
            }
        }
    } catch (err) {
        console.error('UserId migration error:', err.message);
    }

    // 2. Migrate Projects
    console.log('🏗️ Migrating Projects...');
    try {
        const folders = await fsPromises.readdir(PROJECTS_ROOT);

        for (const folder of folders) {
            const dataPath = path.join(PROJECTS_ROOT, folder, 'data.json');
            try {
                // Check if file exists
                await fsPromises.access(dataPath);
                const content = await fsPromises.readFile(dataPath, 'utf8');
                const p = JSON.parse(content);

                if (!p.id) p.id = Date.now().toString(); // Ensure ID

                // Check by ID or Name
                const exists = await Project.findOne({
                    $or: [{ id: p.id }, { name: p.name, client: p.client }]
                });

                if (!exists) {
                    // Normalize sections
                    if (p.sections) {
                        p.sections = p.sections.map(s => ({
                            ...s,
                            id: s.id || Math.random().toString(36).substr(2, 9),
                            status: s.status || 'in-progress'
                        }));
                    }

                    await Project.create({
                        ...p,
                        folderName: folder // Keep reference to old folder for files
                    });
                    console.log(`   + Project: ${p.name}`);
                } else {
                    console.log(`   . Project exists: ${p.name}`);
                }

            } catch (err) {
                // Skip empty folders or read errors
                // console.log(`Skipping folder ${folder}: ${err.message}`);
            }
        }
    } catch (err) {
        console.error('Project migration error:', err.message);
    }

    console.log('✅ Migration Compeleted!');
    process.exit(0);
}

migrate();
