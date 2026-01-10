// PDF Export Module
// ==================

import { state } from './state.js';
import { formatMoney, formatDate, getStatusName } from './utils.js';

// Generate PDF report for a project
export async function generateProjectPDF(projectId) {
    const project = state.projects.find(p => p.id.toString() === projectId.toString());
    if (!project) {
        showToast('Проект не найден', 'error');
        return;
    }
    
    showToast('📄 Генерация PDF отчёта...', 'info');
    
    // Create HTML content for PDF
    const html = await generatePDFContent(project);
    
    // Open print dialog (native PDF)
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for images to load, then print
    printWindow.onload = () => {
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };
}

// Generate HTML content for PDF
async function generatePDFContent(project) {
    const client = state.clients?.find(c => c.name === project.client) || {};
    const sections = project.sections || [];
    
    // Calculate progress
    const completedSections = sections.filter(s => s.status === 'accepted').length;
    const progress = sections.length > 0 ? Math.round((completedSections / sections.length) * 100) : 0;
    
    // Get photos
    const photos = project.photos || [];
    
    return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Отчёт: ${project.name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            font-size: 12pt;
            line-height: 1.6;
            color: #1a1a2e;
            padding: 40px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo { font-size: 28pt; font-weight: bold; color: #3b82f6; }
        .date { color: #666; font-size: 10pt; }
        h1 { font-size: 22pt; margin-bottom: 10px; }
        h2 { 
            font-size: 14pt; 
            color: #3b82f6; 
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
            margin: 25px 0 15px 0;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        .info-box {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        .info-label { color: #64748b; font-size: 10pt; margin-bottom: 4px; }
        .info-value { font-size: 14pt; font-weight: 600; }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 10pt;
            font-weight: 600;
        }
        .status-in-progress { background: #dbeafe; color: #1d4ed8; }
        .status-accepted { background: #d1fae5; color: #047857; }
        .status-on-review { background: #fef3c7; color: #b45309; }
        .progress-bar {
            height: 20px;
            background: #e2e8f0;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            border-radius: 10px;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 15px 0;
        }
        th, td { 
            padding: 10px 12px; 
            text-align: left; 
            border-bottom: 1px solid #e2e8f0;
        }
        th { background: #f8fafc; font-weight: 600; color: #64748b; }
        .gallery {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-top: 15px;
        }
        .gallery img {
            width: 100%;
            height: 150px;
            object-fit: cover;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 10pt;
        }
        @media print {
            body { padding: 20px; }
            .page-break { page-break-before: always; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="logo">LineART</div>
            <div class="date">Дата создания отчёта: ${new Date().toLocaleDateString('ru-RU')}</div>
        </div>
        <span class="status-badge status-${project.status || 'in-progress'}">${getStatusName(project.status || 'in-progress')}</span>
    </div>
    
    <h1>${project.name}</h1>
    
    <div class="info-grid">
        <div class="info-box">
            <div class="info-label">Клиент</div>
            <div class="info-value">${project.client || 'Не указан'}</div>
        </div>
        <div class="info-box">
            <div class="info-label">Стоимость проекта</div>
            <div class="info-value">${formatMoney(project.amount, project.currency)}</div>
        </div>
        <div class="info-box">
            <div class="info-label">Дата начала</div>
            <div class="info-value">${formatDate(project.startDate)}</div>
        </div>
        <div class="info-box">
            <div class="info-label">Дедлайн</div>
            <div class="info-value">${formatDate(project.deadline)}</div>
        </div>
    </div>
    
    <h2>📊 Прогресс проекта (${progress}%)</h2>
    <div class="progress-bar">
        <div class="progress-fill" style="width: ${progress}%;"></div>
    </div>
    <p style="color: #64748b;">Завершено ${completedSections} из ${sections.length} разделов</p>
    
    <h2>📁 Разделы проекта</h2>
    <table>
        <thead>
            <tr>
                <th>Раздел</th>
                <th>Статус</th>
                <th>Инженер</th>
                <th>Дедлайн</th>
            </tr>
        </thead>
        <tbody>
            ${sections.map(section => `
                <tr>
                    <td>${section.name}</td>
                    <td><span class="status-badge status-${section.status || 'in-progress'}">${getStatusName(section.status || 'in-progress')}</span></td>
                    <td>${section.engineer || '—'}</td>
                    <td>${formatDate(section.dueDate) || '—'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    ${project.address ? `
        <h2>📍 Адрес</h2>
        <p>${project.address}</p>
    ` : ''}
    
    ${photos.length > 0 ? `
        <h2 class="page-break">📷 Галерея проекта</h2>
        <div class="gallery">
            ${photos.slice(0, 9).map(photo => {
                const src = typeof photo === 'string' ? photo : photo.url;
                return `<img src="${src}" alt="Фото проекта">`;
            }).join('')}
        </div>
        ${photos.length > 9 ? `<p style="color: #64748b; margin-top: 10px;">И ещё ${photos.length - 9} фото...</p>` : ''}
    ` : ''}
    
    <div class="footer">
        <p>Отчёт сгенерирован системой LineART</p>
        <p>${new Date().toLocaleString('ru-RU')}</p>
    </div>
</body>
</html>
    `;
}

// Helper toast
function showToast(message, type) {
    if (window.showToast) {
        window.showToast(message, type);
    }
}

// Expose to window
window.generateProjectPDF = generateProjectPDF;
