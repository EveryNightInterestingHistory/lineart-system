// Backup & Restore Module for LineART
import { state } from './state.js';

/**
 * Export all projects as ZIP backup file with all uploaded files
 */
export async function exportAllProjects() {
    try {
        showToast('⏳ Создание резервной копии...', 'info');
        
        // Use full backup endpoint that includes all files
        const response = await fetch('/api/backup-full');
        if (!response.ok) throw new Error('Backup failed');
        
        const blob = await response.blob();
        const filename = `lineart-backup-full-${new Date().toISOString().split('T')[0]}.zip`;
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast('✅ Резервная копия скачана (ZIP с файлами)!', 'success');
    } catch (err) {
        console.error('Export error:', err);
        showToast('❌ Ошибка экспорта', 'error');
    }
}

/**
 * Import projects from JSON backup file
 * @param {File} file - JSON backup file
 * @param {boolean} overwrite - Overwrite existing projects
 */
export async function importProjects(file, overwrite = false) {
    try {
        showToast('⏳ Импортирование данных...', 'info');
        
        const text = await file.text();
        const backup = JSON.parse(text);
        
        // Validate backup format
        if (!backup.projects || !Array.isArray(backup.projects)) {
            throw new Error('Invalid backup format');
        }
        
        const response = await fetch('/api/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projects: backup.projects,
                overwrite: overwrite
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`✅ ${result.message}`, 'success');
            // Reload projects
            if (window.loadProjects) {
                await window.loadProjects();
            }
            // Refresh current view
            if (window.renderProjects) {
                window.renderProjects();
            }
        } else {
            throw new Error(result.message || 'Import failed');
        }
    } catch (err) {
        console.error('Import error:', err);
        showToast('❌ Ошибка импорта: ' + err.message, 'error');
    }
}

/**
 * Open file picker and import selected backup
 */
export function openImportDialog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Ask about overwrite
            const overwrite = confirm(
                'Перезаписать существующие проекты?\n\n' +
                'OK - Заменить существующие проекты\n' +
                'Отмена - Пропустить дубликаты'
            );
            await importProjects(file, overwrite);
        }
    };
    
    input.click();
}

// Helper: Show toast notification
function showToast(message, type = 'info') {
    // Check if toast container exists
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:10px;';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
        background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#6366f1'};
    `;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Export to window for global access
window.exportAllProjects = exportAllProjects;
window.openImportDialog = openImportDialog;
