const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const stream = require('stream');

/**
 * Загружает файл в Google Drive
 * @param {string|Buffer} fileSource - Путь к файлу или Buffer
 * @param {string} fileName - Имя файла в Google Drive
 * @param {string} folderId - ID папки в Google Drive (опционально)
 * @param {string} mimeType - MIME-тип файла
 * @returns {Promise<Object>} - Информация о загруженном файле
 */
/**
 * Helper to get authenticated Google Auth client
 */
function getAuthClient() {
    const credentialsEnv = process.env.GOOGLE_DRIVE_CREDENTIALS;

    // Check if environment variable is a JSON string
    if (credentialsEnv && credentialsEnv.trim().startsWith('{')) {
        return new google.auth.GoogleAuth({
            credentials: JSON.parse(credentialsEnv),
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });
    }

    // Fallback to file path
    const credentialsPath = credentialsEnv || path.join(__dirname, '../google-credentials.json');
    if (!fs.existsSync(credentialsPath)) {
        throw new Error('Google Drive credentials failed (File not found & ENV not JSON)');
    }

    return new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
}

/**
 * Загружает файл в Google Drive
 * @param {string|Buffer} fileSource - Путь к файлу или Buffer
 * @param {string} fileName - Имя файла в Google Drive
 * @param {string} folderId - ID папки в Google Drive (опционально)
 * @param {string} mimeType - MIME-тип файла
 * @returns {Promise<Object>} - Информация о загруженном файле
 */
async function uploadToGoogleDrive(fileSource, fileName, folderId = null, mimeType = 'application/octet-stream') {
    try {
        const auth = getAuthClient();
        const drive = google.drive({ version: 'v3', auth });

        // Метаданные файла
        const fileMetadata = {
            name: fileName,
            parents: folderId ? [folderId] : undefined
        };

        // Подготовка тела запроса (Stream)
        let mediaBody;
        if (Buffer.isBuffer(fileSource)) {
            mediaBody = new stream.PassThrough();
            mediaBody.end(fileSource);
        } else {
            mediaBody = fs.createReadStream(fileSource);
        }

        const media = {
            mimeType: mimeType,
            body: mediaBody
        };

        // Загрузка файла
        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink, webContentLink'
        });

        // Установка прав доступа (опционально - только для публичных ссылок)
        if (process.env.GOOGLE_DRIVE_PUBLIC === 'true') {
            await drive.permissions.create({
                fileId: response.data.id,
                requestBody: {
                    role: 'reader',
                    type: 'anyone'
                }
            });
        }

        console.log('File uploaded to Google Drive:', response.data);

        return {
            fileId: response.data.id,
            fileName: response.data.name,
            webViewLink: response.data.webViewLink,
            downloadLink: response.data.webContentLink,
            success: true
        };

    } catch (error) {
        console.error('Error uploading to Google Drive:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Создает папку в Google Drive (если не существует)
 * @param {string} folderName - Имя папки
 * @param {string} parentFolderId - ID родительской папки (опционально)
 * @returns {Promise<string>} - ID созданной/найденной папки
 */
async function createOrFindFolder(folderName, parentFolderId = null) {
    try {
        console.log(`🔍 DEBUG: createOrFindFolder called for '${folderName}'. Parent: ${parentFolderId}`);

        const auth = getAuthClient();
        const drive = google.drive({ version: 'v3', auth });

        // Поиск существующей папки
        let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
        if (parentFolderId) {
            query += ` and '${parentFolderId}' in parents`;
        }

        console.log(`🔍 DEBUG: Drive Search Query: ${query}`);

        const searchResponse = await drive.files.list({
            q: query,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (searchResponse.data.files.length > 0) {
            console.log('✅ Folder found:', searchResponse.data.files[0].id);
            return searchResponse.data.files[0].id;
        }

        console.log(`⚠️ Folder not found. Creating new one... (Parent: ${parentFolderId})`);

        // Создание новой папки
        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: parentFolderId ? [parentFolderId] : []
        };

        console.log(`🔍 DEBUG: Creating folder with metadata:`, JSON.stringify(fileMetadata));

        const createResponse = await drive.files.create({
            requestBody: fileMetadata,
            fields: 'id' // 'id, parents' to debug
        });

        console.log('✅ Folder created:', createResponse.data.id);
        return createResponse.data.id;

    } catch (error) {
        console.error('❌ Error creating/finding folder:', error);
        throw error;
    }
}

/**
 * Проверяет, настроен ли Google Drive
 * @returns {boolean}
 */
function isConfigured() {
    const creds = process.env.GOOGLE_DRIVE_CREDENTIALS;
    if (creds && creds.trim().startsWith('{')) return true;

    const credentialsPath = creds || path.join(__dirname, '../google-credentials.json');
    return fs.existsSync(credentialsPath);
}

module.exports = {
    uploadToGoogleDrive,
    createOrFindFolder,
    isConfigured
};
