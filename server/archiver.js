const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

/**
 * Создает ZIP-архив проекта со всеми файлами и PDF-отчётом
 * @param {Object} project - Объект проекта
 * @param {string} outputPath - Путь для сохранения ZIP-файла
 * @returns {Promise<string>} - Путь к созданному архиву
 */
async function createProjectArchive(project, outputPath) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Максимальное сжатие
        });

        output.on('close', () => {
            console.log(`Archive created: ${archive.pointer()} bytes`);
            resolve(outputPath);
        });

        archive.on('error', (err) => {
            reject(err);
        });

        archive.pipe(output);

        // Добавление PDF-отчёта
        const pdfPath = path.join(__dirname, '../temp', `${project.id}_report.pdf`);
        generatePDFReport(project, pdfPath)
            .then(() => {
                archive.file(pdfPath, { name: 'Отчёт_проекта.pdf' });

                // Добавление файлов проекта
                const projectFolder = path.join(__dirname, '../uploads', project.folderName || project.id.toString());
                
                if (fs.existsSync(projectFolder)) {
                    archive.directory(projectFolder, 'Файлы_проекта');
                }

                // Добавление метаданных (JSON)
                const metadata = JSON.stringify({
                    name: project.name,
                    client: project.client,
                    status: project.status,
                    createdAt: project.createdAt,
                    amount: project.amount,
                    currency: project.currency,
                    sections: project.sections?.length || 0,
                    exportedAt: new Date().toISOString()
                }, null, 2);

                archive.append(metadata, { name: 'metadata.json' });

                // Финализация архива
                archive.finalize();
            })
            .catch(reject);
    });
}

function generatePDFReport(project, outputPath) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(outputPath);

        stream.on('finish', resolve);
        stream.on('error', reject);

        doc.pipe(stream);

        // Заголовок
        doc.fontSize(24).text('Отчёт по проекту', { align: 'center' });
        doc.moveDown();
        doc.fontSize(18).text(project.name, { align: 'center' });
        doc.moveDown(2);

        // Основная информация
        doc.fontSize(12);
        doc.text(`Клиент: ${project.client || '-'}`);
        doc.text(`Адрес: ${project.address || '-'}`);
        doc.text(`Статус: ${getStatusName(project.status)}`);
        doc.text(`Создан: ${new Date(project.createdAt).toLocaleDateString('ru-RU')}`);
        
        if (project.amount) {
            doc.text(`Сумма договора: ${project.amount} ${project.currency || 'USD'}`);
        }

        doc.moveDown(2);

        // Разделы
        if (project.sections && project.sections.length > 0) {
            doc.fontSize(16).text('Разделы проекта:', { underline: true });
            doc.moveDown();
            doc.fontSize(11);

            project.sections.forEach((section, index) => {
                doc.text(`${index + 1}. ${section.name}`);
                if (section.engineer) {
                    doc.text(`   Инженер: ${section.engineer}`, { indent: 20 });
                }
                if (section.files && section.files.length > 0) {
                    doc.text(`   Файлов: ${section.files.length}`, { indent: 20 });
                }
                doc.moveDown(0.5);
            });
        }

        // История (последние 10 записей)
        if (project.history && project.history.length > 0) {
            doc.addPage();
            doc.fontSize(16).text('История изменений:', { underline: true });
            doc.moveDown();
            doc.fontSize(10);

            const recentHistory = project.history.slice(-10).reverse();
            recentHistory.forEach(entry => {
                const date = new Date(entry.date).toLocaleString('ru-RU');
                doc.text(`[${date}] ${entry.action}`, {
                    width: 500,
                    continued: false
                });
                doc.moveDown(0.3);
            });
        }

        // Комментарии
        if (project.comments && project.comments.length > 0) {
            doc.addPage();
            doc.fontSize(16).text('Комментарии:', { underline: true });
            doc.moveDown();
            doc.fontSize(10);

            project.comments.forEach(comment => {
                const date = new Date(comment.date).toLocaleString('ru-RU');
                doc.text(`[${date}] ${comment.author || 'User'}:`, { continued: false });
                doc.text(comment.text, { indent: 20 });
                doc.moveDown(0.5);
            });
        }

        // Футер
        doc.fontSize(8).text(`Отчёт сгенерирован: ${new Date().toLocaleString('ru-RU')}`, {
            align: 'center'
        });

        doc.end();
    });
}

function getStatusName(status) {
    const statuses = {
        'in-progress': 'В процессе',
        'on-review': 'На проверку',
        'correction': 'На правку',
        'accepted': 'Принято',
        'sketch': 'В процессе',
        'completed': 'Принято',
        'delivered': 'Принято'
    };
    return statuses[status] || status;
}

module.exports = {
    createProjectArchive,
    generatePDFReport
};
