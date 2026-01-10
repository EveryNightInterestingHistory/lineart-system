require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./server/db');
const User = require('./server/models/User');

async function promoteToAdmin() {
    await connectDB();

    const username = 'Jahongir';

    try {
        const user = await User.findOneAndUpdate(
            { username: username },
            { role: 'admin' },
            { new: true }
        );

        if (user) {
            console.log(`✅ Пользователь ${username} теперь ${user.role}!`);
        } else {
            console.log(`❌ Пользователь ${username} не найден.`);
        }
    } catch (err) {
        console.error(err);
    }

    process.exit();
}

promoteToAdmin();
