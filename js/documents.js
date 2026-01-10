// QR Code & Document Generation Module
// =====================================

import { state, currentProjectId } from './state.js';
import { showToast, formatMoney, closeModal } from './utils.js';

// Generate QR code URL for project (uses external API)
export function generateProjectQRCode(projectId) {
    const baseUrl = window.location.origin;
    const projectUrl = `${baseUrl}/#project=${projectId}`;
    
    // Using QR Server API (free, no key needed)
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(projectUrl)}`;
    
    return qrApiUrl;
}

// Show QR code modal for project
export function showProjectQRCode(projectId) {
    const project = state.projects.find(p => p.id.toString() === projectId.toString());
    if (!project) {
        showToast('Проект не найден', 'error');
        return;
    }
    
    const qrUrl = generateProjectQRCode(projectId);
    const projectUrl = `${window.location.origin}/#project=${projectId}`;
    
    // Create modal
    let modal = document.getElementById('qr-code-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'qr-code-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px; text-align: center;">
            <span class="close" onclick="closeModal('qr-code-modal')">&times;</span>
            <h2>📱 QR-код проекта</h2>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">${project.name}</p>
            
            <div style="background: white; padding: 20px; border-radius: 12px; display: inline-block; margin-bottom: 20px;">
                <img src="${qrUrl}" alt="QR Code" style="width: 200px; height: 200px;">
            </div>
            
            <div style="margin-bottom: 20px;">
                <input type="text" value="${projectUrl}" readonly 
                    style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); text-align: center; font-size: 0.85rem;">
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button class="btn-secondary" onclick="copyProjectLink('${projectId}')" style="flex: 1;">
                    📋 Копировать ссылку
                </button>
                <button class="btn-primary" onclick="downloadQRCode('${projectId}')" style="flex: 1;">
                    💾 Скачать QR
                </button>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

// Copy project link to clipboard
export function copyProjectLink(projectId) {
    const projectUrl = `${window.location.origin}/#project=${projectId}`;
    navigator.clipboard.writeText(projectUrl).then(() => {
        showToast('✅ Ссылка скопирована!', 'success');
    }).catch(() => {
        showToast('Не удалось скопировать', 'error');
    });
}

// Download QR code as image
export function downloadQRCode(projectId) {
    const project = state.projects.find(p => p.id.toString() === projectId.toString());
    const qrUrl = generateProjectQRCode(projectId);
    
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `QR_${project?.name || projectId}.png`;
    link.click();
    
    showToast('✅ QR-код скачан!', 'success');
}

// ===========================================
// DOCUMENT GENERATION
// ===========================================

// Contract template
function getContractTemplate(project, client) {
    const today = new Date().toLocaleDateString('ru-RU');
    const currency = project.currency || 'USD';
    const amount = formatMoney(project.amount || 0, currency);
    
    return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Договор - ${project.name}</title>
    <style>
        body { font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.6; margin: 40px; }
        h1 { text-align: center; font-size: 18px; margin-bottom: 30px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 20px; }
        .section-title { font-weight: bold; margin-bottom: 10px; }
        .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
        .signature-block { width: 45%; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #000; padding: 8px; text-align: left; }
        th { background: #f0f0f0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>ДОГОВОР №___</h1>
        <p>на выполнение проектных работ</p>
        <p>г. Ташкент &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${today}</p>
    </div>
    
    <div class="section">
        <p><strong>Заказчик:</strong> ${client?.name || project.client || '________________________'}</p>
        <p><strong>Исполнитель:</strong> LineART Studio</p>
    </div>
    
    <div class="section">
        <p class="section-title">1. ПРЕДМЕТ ДОГОВОРА</p>
        <p>1.1. Исполнитель обязуется выполнить проектные работы по объекту:</p>
        <p><strong>Название проекта:</strong> ${project.name}</p>
        <p><strong>Адрес объекта:</strong> ${project.address || 'Не указан'}</p>
        ${project.description ? `<p><strong>Описание:</strong> ${project.description}</p>` : ''}
    </div>
    
    <div class="section">
        <p class="section-title">2. СОСТАВ РАБОТ</p>
        <table>
            <tr><th>№</th><th>Раздел</th><th>Исполнитель</th></tr>
            ${(project.sections || []).map((s, i) => `
                <tr><td>${i + 1}</td><td>${s.name}</td><td>${s.engineer || 'Не назначен'}</td></tr>
            `).join('')}
        </table>
    </div>
    
    <div class="section">
        <p class="section-title">3. СТОИМОСТЬ РАБОТ</p>
        <p>3.1. Общая стоимость работ составляет: <strong>${amount}</strong></p>
        <p>3.2. Оплата производится в следующем порядке:</p>
        <p>- Аванс 50% при подписании договора</p>
        <p>- Окончательный расчёт 50% после сдачи работ</p>
    </div>
    
    <div class="section">
        <p class="section-title">4. СРОКИ ВЫПОЛНЕНИЯ</p>
        <p>4.1. Срок выполнения работ: _______ рабочих дней с момента получения аванса.</p>
    </div>
    
    <div class="signatures">
        <div class="signature-block">
            <p><strong>ЗАКАЗЧИК:</strong></p>
            <p>________________________</p>
            <p>${client?.name || project.client || ''}</p>
            <p>Тел: ${client?.phone || ''}</p>
        </div>
        <div class="signature-block">
            <p><strong>ИСПОЛНИТЕЛЬ:</strong></p>
            <p>________________________</p>
            <p>LineART Studio</p>
        </div>
    </div>
</body>
</html>
    `;
}

// Generate and download contract
export function generateContract(projectId) {
    const project = state.projects.find(p => p.id.toString() === projectId.toString());
    if (!project) {
        showToast('Проект не найден', 'error');
        return;
    }
    
    const client = state.clients?.find(c => c.name === project.client);
    const html = getContractTemplate(project, client);
    
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `Договор_${project.name}_${new Date().toISOString().split('T')[0]}.html`;
    link.click();
    
    URL.revokeObjectURL(url);
    showToast('✅ Договор сгенерирован!', 'success');
}

// Invoice/Act template
function getInvoiceTemplate(project, type = 'invoice') {
    const today = new Date().toLocaleDateString('ru-RU');
    const currency = project.currency || 'USD';
    const amount = formatMoney(project.amount || 0, currency);
    const title = type === 'invoice' ? 'СЧЁТ НА ОПЛАТУ' : 'АКТ ВЫПОЛНЕННЫХ РАБОТ';
    
    return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>${title} - ${project.name}</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 14px; margin: 40px; }
        h1 { text-align: center; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #000; padding: 10px; text-align: left; }
        th { background: #f5f5f5; }
        .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
        .signature { margin-top: 50px; }
    </style>
</head>
<body>
    <h1>${title} №___</h1>
    <p><strong>Дата:</strong> ${today}</p>
    <p><strong>Проект:</strong> ${project.name}</p>
    <p><strong>Заказчик:</strong> ${project.client}</p>
    
    <table>
        <tr><th>№</th><th>Наименование работ</th><th>Сумма</th></tr>
        ${(project.sections || []).map((s, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${s.name}</td>
                <td>${formatMoney((project.amount || 0) / (project.sections?.length || 1), currency)}</td>
            </tr>
        `).join('')}
    </table>
    
    <p class="total">ИТОГО: ${amount}</p>
    
    <div class="signature">
        <p>Исполнитель: ________________________ / LineART Studio /</p>
        ${type === 'act' ? '<p style="margin-top: 30px;">Заказчик: ________________________ / ' + project.client + ' /</p>' : ''}
    </div>
</body>
</html>
    `;
}

// Generate invoice
export function generateInvoice(projectId) {
    const project = state.projects.find(p => p.id.toString() === projectId.toString());
    if (!project) return;
    
    const html = getInvoiceTemplate(project, 'invoice');
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Счёт_${project.name}.html`;
    link.click();
    showToast('✅ Счёт сгенерирован!', 'success');
}

// Generate act
export function generateAct(projectId) {
    const project = state.projects.find(p => p.id.toString() === projectId.toString());
    if (!project) return;
    
    const html = getInvoiceTemplate(project, 'act');
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Акт_${project.name}.html`;
    link.click();
    showToast('✅ Акт сгенерирован!', 'success');
}

// Open document generation menu
export function openDocumentMenu(projectId) {
    const project = state.projects.find(p => p.id.toString() === projectId.toString());
    if (!project) return;
    
    let modal = document.getElementById('document-menu-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'document-menu-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <span class="close" onclick="closeModal('document-menu-modal')">&times;</span>
            <h2>📄 Документы</h2>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">${project.name}</p>
            
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <button class="btn-secondary" onclick="generateContract('${projectId}'); closeModal('document-menu-modal');" style="padding: 15px; text-align: left;">
                    📜 Сгенерировать договор
                </button>
                <button class="btn-secondary" onclick="generateInvoice('${projectId}'); closeModal('document-menu-modal');" style="padding: 15px; text-align: left;">
                    💵 Сгенерировать счёт
                </button>
                <button class="btn-secondary" onclick="generateAct('${projectId}'); closeModal('document-menu-modal');" style="padding: 15px; text-align: left;">
                    ✅ Сгенерировать акт
                </button>
                <hr style="border-color: var(--glass-border);">
                <button class="btn-secondary" onclick="showProjectQRCode('${projectId}'); closeModal('document-menu-modal');" style="padding: 15px; text-align: left;">
                    📱 Показать QR-код
                </button>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

// Expose to window
window.showProjectQRCode = showProjectQRCode;
window.copyProjectLink = copyProjectLink;
window.downloadQRCode = downloadQRCode;
window.generateContract = generateContract;
window.generateInvoice = generateInvoice;
window.generateAct = generateAct;
window.openDocumentMenu = openDocumentMenu;
