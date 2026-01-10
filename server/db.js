const mongoose = require('mongoose');

// Defaults if environment variables are missing
const DEFAULT_URI = 'mongodb+srv://admin:pass@cluster0.mongodb.net/lineart?retryWrites=true&w=majority';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || DEFAULT_URI, {
            // Options are no longer needed in Mongoose 6+ but keeping for safety
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error(`Error connecting to MongoDB: ${err.message}`);
        // Do not exit process, just log error so app can still run in offline/fallback mode if designed so
        // But for this app, DB is critical.
    }
};

module.exports = connectDB;
