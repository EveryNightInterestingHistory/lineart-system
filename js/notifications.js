// Notifications Module - Browser Push Notifications & Reminders
// =============================================================

import { state } from './state.js';
import { showToast } from './utils.js';

// Check if browser supports notifications
export function isBrowserNotificationSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator;
}

// Request notification permission
export async function requestNotificationPermission() {
    if (!isBrowserNotificationSupported()) {
        showToast('⚠️ Ваш браузер не поддерживает уведомления', 'warning');
        return false;
    }
    
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
        showToast('✅ Уведомления включены!', 'success');
        localStorage.setItem('notificationsEnabled', 'true');
        return true;
    } else if (permission === 'denied') {
        showToast('❌ Уведомления заблокированы в настройках браузера', 'error');
        localStorage.setItem('notificationsEnabled', 'false');
        return false;
    }
    
    return false;
}

// Check notification permission status
export function getNotificationPermission() {
    if (!isBrowserNotificationSupported()) return 'unsupported';
    return Notification.permission;
}

// Show browser notification
export function showBrowserNotification(title, options = {}) {
    if (Notification.permission !== 'granted') {
        console.log('Notifications not permitted');
        return;
    }
    
    const defaultOptions = {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        requireInteraction: false,
        ...options
    };
    
    const notification = new Notification(title, defaultOptions);
    
    notification.onclick = function(event) {
        event.preventDefault();
        window.focus();
        notification.close();
        
        if (options.onclick) {
            options.onclick(event);
        }
    };
    
    return notification;
}

// Notify about deadline
export function notifyDeadline(projectName, sectionName, daysLeft, projectId) {
    const isOverdue = daysLeft < 0;
    const emoji = isOverdue ? '⚠️' : (daysLeft <= 1 ? '🔔' : '📅');
    
    let title, body;
    
    if (isOverdue) {
        title = `${emoji} Просрочен дедлайн!`;
        body = `${projectName} - ${sectionName}\nПросрочено на ${Math.abs(daysLeft)} дн.`;
    } else if (daysLeft === 0) {
        title = `${emoji} Дедлайн сегодня!`;
        body = `${projectName} - ${sectionName}`;
    } else if (daysLeft === 1) {
        title = `${emoji} Дедлайн завтра!`;
        body = `${projectName} - ${sectionName}`;
    } else {
        title = `${emoji} Приближается дедлайн`;
        body = `${projectName} - ${sectionName}\nОсталось: ${daysLeft} дн.`;
    }
    
    showBrowserNotification(title, {
        body,
        tag: `deadline-${projectId}-${sectionName}`,
        data: { projectId },
        onclick: () => {
            if (window.openProjectDetails) {
                window.openProjectDetails(projectId);
            }
        }
    });
}

// Check all deadlines and notify
export function checkAndNotifyDeadlines() {
    if (Notification.permission !== 'granted') return;
    
    const reminderDays = parseInt(localStorage.getItem('deadlineReminderDays') || '3');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const projects = state.projects || [];
    const notified = JSON.parse(localStorage.getItem('notifiedDeadlines') || '{}');
    const todayKey = today.toISOString().split('T')[0];
    
    projects.forEach(project => {
        if (!project.sections) return;
        
        project.sections.forEach(section => {
            if (!section.dueDate) return;
            if (section.status === 'accepted' || section.status === 'completed') return;
            
            const dueDate = new Date(section.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            
            const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            const notificationKey = `${project.id}-${section.id}-${todayKey}`;
            
            // Notify if within reminder window and not already notified today
            if (daysLeft <= reminderDays && !notified[notificationKey]) {
                notifyDeadline(project.name, section.name, daysLeft, project.id);
                notified[notificationKey] = true;
            }
        });
    });
    
    // Save notification state
    localStorage.setItem('notifiedDeadlines', JSON.stringify(notified));
}

// Settings for reminders
export function getReminderSettings() {
    return {
        enabled: localStorage.getItem('notificationsEnabled') === 'true',
        reminderDays: parseInt(localStorage.getItem('deadlineReminderDays') || '3'),
        notifyOnStatusChange: localStorage.getItem('notifyOnStatusChange') !== 'false',
        notifyOnNewFile: localStorage.getItem('notifyOnNewFile') !== 'false',
        notifyOnComment: localStorage.getItem('notifyOnComment') !== 'false'
    };
}

// Save reminder settings
export function saveReminderSettings(settings) {
    localStorage.setItem('notificationsEnabled', settings.enabled ? 'true' : 'false');
    localStorage.setItem('deadlineReminderDays', settings.reminderDays.toString());
    localStorage.setItem('notifyOnStatusChange', settings.notifyOnStatusChange ? 'true' : 'false');
    localStorage.setItem('notifyOnNewFile', settings.notifyOnNewFile ? 'true' : 'false');
    localStorage.setItem('notifyOnComment', settings.notifyOnComment ? 'true' : 'false');
    showToast('✅ Настройки уведомлений сохранены', 'success');
}

// Open notifications settings modal
export function openNotificationSettings() {
    const modal = document.getElementById('notification-settings-modal');
    if (!modal) {
        console.error('Notification settings modal not found');
        return;
    }
    
    const settings = getReminderSettings();
    const permissionStatus = getNotificationPermission();
    
    const content = modal.querySelector('.modal-content');
    content.innerHTML = `
        <span class="close" onclick="closeModal('notification-settings-modal')">&times;</span>
        <h2>🔔 Настройки уведомлений</h2>
        
        <div style="margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                <span>Статус браузера:</span>
                <span style="padding: 4px 10px; border-radius: 4px; font-size: 0.85rem;
                    background: ${permissionStatus === 'granted' ? '#10b98120' : permissionStatus === 'denied' ? '#ef444420' : '#f59e0b20'};
                    color: ${permissionStatus === 'granted' ? '#10b981' : permissionStatus === 'denied' ? '#ef4444' : '#f59e0b'};">
                    ${permissionStatus === 'granted' ? '✅ Разрешено' : permissionStatus === 'denied' ? '❌ Заблокировано' : '⏳ Не определено'}
                </span>
                ${permissionStatus !== 'granted' ? `
                    <button onclick="requestNotificationPermission()" class="btn-sm" style="margin-left: auto;">
                        Включить
                    </button>
                ` : ''}
            </div>
        </div>
        
        <form id="notification-settings-form" onsubmit="event.preventDefault(); saveNotificationSettingsForm();">
            <div class="form-group" style="margin-bottom: 15px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" id="notify-enabled" ${settings.enabled ? 'checked' : ''}>
                    <span>Включить уведомления</span>
                </label>
            </div>
            
            <div class="form-group" style="margin-bottom: 15px;">
                <label>Напоминать за N дней до дедлайна:</label>
                <select id="reminder-days" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); margin-top: 5px;">
                    <option value="1" ${settings.reminderDays === 1 ? 'selected' : ''}>1 день</option>
                    <option value="2" ${settings.reminderDays === 2 ? 'selected' : ''}>2 дня</option>
                    <option value="3" ${settings.reminderDays === 3 ? 'selected' : ''}>3 дня</option>
                    <option value="5" ${settings.reminderDays === 5 ? 'selected' : ''}>5 дней</option>
                    <option value="7" ${settings.reminderDays === 7 ? 'selected' : ''}>7 дней</option>
                </select>
            </div>
            
            <div class="form-group" style="margin-bottom: 15px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" id="notify-status" ${settings.notifyOnStatusChange ? 'checked' : ''}>
                    <span>Уведомлять о смене статуса</span>
                </label>
            </div>
            
            <div class="form-group" style="margin-bottom: 15px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" id="notify-file" ${settings.notifyOnNewFile ? 'checked' : ''}>
                    <span>Уведомлять о новых файлах</span>
                </label>
            </div>
            
            <div class="form-group" style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" id="notify-comment" ${settings.notifyOnComment ? 'checked' : ''}>
                    <span>Уведомлять о комментариях</span>
                </label>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button type="submit" class="btn-primary" style="flex: 1;">
                    💾 Сохранить
                </button>
                <button type="button" onclick="testBrowserNotification()" class="btn-secondary" style="flex: 1;">
                    🔔 Тест
                </button>
            </div>
        </form>
    `;
    
    modal.style.display = 'flex';
}

// Save settings from form
export function saveNotificationSettingsForm() {
    const settings = {
        enabled: document.getElementById('notify-enabled').checked,
        reminderDays: parseInt(document.getElementById('reminder-days').value),
        notifyOnStatusChange: document.getElementById('notify-status').checked,
        notifyOnNewFile: document.getElementById('notify-file').checked,
        notifyOnComment: document.getElementById('notify-comment').checked
    };
    
    saveReminderSettings(settings);
    closeModal('notification-settings-modal');
}

// Test browser notification
export function testBrowserNotification() {
    if (Notification.permission !== 'granted') {
        requestNotificationPermission().then(granted => {
            if (granted) {
                showBrowserNotification('🔔 Тестовое уведомление', {
                    body: 'Уведомления работают корректно!'
                });
            }
        });
    } else {
        showBrowserNotification('🔔 Тестовое уведомление', {
            body: 'Уведомления работают корректно!'
        });
    }
}

// Helper to close modal
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

// Initialize: schedule periodic deadline checks
export function initNotifications() {
    // Check deadlines immediately
    setTimeout(() => {
        checkAndNotifyDeadlines();
    }, 5000);
    
    // Check every hour
    setInterval(() => {
        checkAndNotifyDeadlines();
    }, 60 * 60 * 1000);
}

// Expose to window
window.requestNotificationPermission = requestNotificationPermission;
window.openNotificationSettings = openNotificationSettings;
window.saveNotificationSettingsForm = saveNotificationSettingsForm;
window.testBrowserNotification = testBrowserNotification;
