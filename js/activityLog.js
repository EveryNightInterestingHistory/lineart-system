// Activity Log Module
// ====================

import { state, saveData } from './state.js';

// Get activity log from localStorage
export function getActivityLog() {
    try {
        return JSON.parse(localStorage.getItem('activityLog') || '[]');
    } catch {
        return [];
    }
}

// Save activity log
function saveActivityLog(log) {
    // Keep only last 200 entries
    const trimmed = log.slice(-200);
    localStorage.setItem('activityLog', JSON.stringify(trimmed));
}

// Log an activity
export function logActivity(action, details = {}) {
    const log = getActivityLog();
    
    const entry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        user: localStorage.getItem('userName') || 'Unknown',
        action,
        ...details
    };
    
    log.push(entry);
    saveActivityLog(log);
    
    return entry;
}

// Activity types
export const ActivityTypes = {
    PROJECT_CREATED: 'project_created',
    PROJECT_UPDATED: 'project_updated',
    PROJECT_DELETED: 'project_deleted',
    STATUS_CHANGED: 'status_changed',
    FILE_UPLOADED: 'file_uploaded',
    FILE_DELETED: 'file_deleted',
    SECTION_ADDED: 'section_added',
    SECTION_DELETED: 'section_deleted',
    COMMENT_ADDED: 'comment_added',
    ENGINEER_ASSIGNED: 'engineer_assigned',
    BACKUP_CREATED: 'backup_created',
    BACKUP_RESTORED: 'backup_restored'
};

// Format activity for display
export function formatActivity(entry) {
    const actionLabels = {
        'project_created': '➕ Создан проект',
        'project_updated': '✏️ Изменён проект',
        'project_deleted': '🗑️ Удалён проект',
        'status_changed': '🔄 Изменён статус',
        'file_uploaded': '📤 Загружен файл',
        'file_deleted': '🗑️ Удалён файл',
        'section_added': '📁 Добавлен раздел',
        'section_deleted': '🗑️ Удалён раздел',
        'comment_added': '💬 Добавлен комментарий',
        'engineer_assigned': '👷 Назначен инженер',
        'backup_created': '💾 Создана резервная копия',
        'backup_restored': '🔄 Восстановлено из копии'
    };
    
    return {
        label: actionLabels[entry.action] || entry.action,
        time: new Date(entry.timestamp).toLocaleString('ru-RU'),
        user: entry.user,
        project: entry.projectName || '',
        details: entry.details || ''
    };
}

// Render activity log modal
export function openActivityLogModal() {
    const log = getActivityLog().reverse().slice(0, 50);
    
    let modal = document.getElementById('activity-log-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'activity-log-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px; max-height: 80vh;">
            <span class="close" onclick="closeModal('activity-log-modal')">&times;</span>
            <h2>📋 История действий</h2>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <span style="color: var(--text-secondary); font-size: 0.85rem;">Последние 50 записей</span>
                <button class="btn-sm" onclick="clearActivityLog()">🗑️ Очистить</button>
            </div>
            
            <div style="max-height: 500px; overflow-y: auto;">
                ${log.length === 0 
                    ? '<p style="text-align: center; color: var(--text-secondary); padding: 30px;">Нет записей</p>'
                    : log.map(entry => {
                        const formatted = formatActivity(entry);
                        return `
                            <div style="padding: 12px; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: start;">
                                <div>
                                    <div style="font-weight: 600; margin-bottom: 4px;">${formatted.label}</div>
                                    ${formatted.project ? `<div style="font-size: 0.85rem; color: var(--text-secondary);">📁 ${formatted.project}</div>` : ''}
                                    ${formatted.details ? `<div style="font-size: 0.8rem; color: var(--text-secondary);">${formatted.details}</div>` : ''}
                                </div>
                                <div style="text-align: right; flex-shrink: 0;">
                                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${formatted.time}</div>
                                    <div style="font-size: 0.8rem; color: var(--accent-primary);">👤 ${formatted.user}</div>
                                </div>
                            </div>
                        `;
                    }).join('')
                }
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

// Clear activity log
export function clearActivityLog() {
    if (confirm('Вы уверены, что хотите очистить историю действий?')) {
        localStorage.setItem('activityLog', '[]');
        openActivityLogModal(); // Refresh
    }
}

// Expose to window
window.logActivity = logActivity;
window.openActivityLogModal = openActivityLogModal;
window.clearActivityLog = clearActivityLog;
window.ActivityTypes = ActivityTypes;
