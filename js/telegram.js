// Telegram Notifications Client Module
// ====================================

// Send notification to Telegram
export async function sendTelegramNotification(type, message) {
    try {
        const response = await fetch('/api/telegram/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, message })
        });
        return await response.json();
    } catch (err) {
        console.error('Telegram notification error:', err);
        return { success: false, error: err.message };
    }
}

// Notify about status change
export async function notifyStatusChange(projectName, oldStatus, newStatus) {
    const statusLabels = {
        'in-progress': 'В процессе',
        'on-review': 'На проверку',
        'correction': 'На правку',
        'accepted': 'Принято',
        'archive': 'Архив'
    };
    
    const message = `📋 <b>Смена статуса проекта</b>\n\n` +
        `Проект: <b>${projectName}</b>\n` +
        `${statusLabels[oldStatus] || oldStatus} → ${statusLabels[newStatus] || newStatus}`;
    
    return sendTelegramNotification('statusChange', message);
}

// Notify about new file
export async function notifyNewFile(projectName, sectionName, fileName) {
    const message = `📁 <b>Новый файл загружен</b>\n\n` +
        `Проект: <b>${projectName}</b>\n` +
        `Раздел: ${sectionName}\n` +
        `Файл: ${fileName}`;
    
    return sendTelegramNotification('newFile', message);
}

// Notify about new comment
export async function notifyNewComment(projectName, comment, author) {
    const message = `💬 <b>Новый комментарий</b>\n\n` +
        `Проект: <b>${projectName}</b>\n` +
        `От: ${author || 'Система'}\n` +
        `Сообщение: ${comment}`;
    
    return sendTelegramNotification('newComment', message);
}

// Notify about deadline
export async function notifyDeadline(projectName, sectionName, dueDate, isOverdue) {
    const emoji = isOverdue ? '⚠️' : '📅';
    const title = isOverdue ? 'Просроченный дедлайн' : 'Приближающийся дедлайн';
    
    const message = `${emoji} <b>${title}</b>\n\n` +
        `Проект: <b>${projectName}</b>\n` +
        `Раздел: ${sectionName}\n` +
        `Дата: ${dueDate}`;
    
    return sendTelegramNotification('deadline', message);
}

// Open Telegram settings modal
export async function openTelegramSettings() {
    // Load current config
    const response = await fetch('/api/telegram/config');
    const config = await response.json();
    
    // Get chats from bot updates
    const updatesResponse = await fetch('/api/telegram/updates');
    const updates = await updatesResponse.json();
    
    const modal = document.getElementById('telegram-settings-modal');
    if (!modal) {
        console.error('Telegram settings modal not found');
        return;
    }
    
    // Populate form
    document.getElementById('tg-enabled').checked = config.enabled || false;
    document.getElementById('tg-status-change').checked = config.notifications?.statusChange ?? true;
    document.getElementById('tg-new-file').checked = config.notifications?.newFile ?? true;
    document.getElementById('tg-new-comment').checked = config.notifications?.newComment ?? true;
    document.getElementById('tg-deadline').checked = config.notifications?.deadline ?? true;
    
    // Show available chats
    const chatsList = document.getElementById('tg-chats-list');
    if (chatsList && updates.success && updates.chats?.length) {
        chatsList.innerHTML = updates.chats.map(chat => `
            <div class="chat-item" style="display: flex; align-items: center; gap: 10px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 8px;">
                <input type="checkbox" 
                       id="chat-${chat.id}" 
                       value="${chat.id}" 
                       ${config.chatIds?.includes(chat.id) ? 'checked' : ''}>
                <label for="chat-${chat.id}">
                    ${chat.firstName || ''} ${chat.lastName || ''} 
                    ${chat.username ? `(@${chat.username})` : ''}
                </label>
            </div>
        `).join('');
    } else {
        chatsList.innerHTML = `
            <div style="color: var(--text-secondary); padding: 15px; text-align: center;">
                Чаты не найдены. Напишите боту /start в Telegram, затем нажмите "Обновить"
            </div>
        `;
    }
    
    modal.style.display = 'flex';
}

// Save Telegram settings
export async function saveTelegramSettings() {
    // Collect checked chat IDs
    const chatCheckboxes = document.querySelectorAll('#tg-chats-list input[type="checkbox"]:checked');
    const chatIds = Array.from(chatCheckboxes).map(cb => parseInt(cb.value));
    
    const config = {
        enabled: document.getElementById('tg-enabled').checked,
        chatIds: chatIds,
        notifications: {
            statusChange: document.getElementById('tg-status-change').checked,
            newFile: document.getElementById('tg-new-file').checked,
            newComment: document.getElementById('tg-new-comment').checked,
            deadline: document.getElementById('tg-deadline').checked
        }
    };
    
    const response = await fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    });
    
    const result = await response.json();
    if (result.success) {
        showToast('✅ Настройки Telegram сохранены', 'success');
        closeModal('telegram-settings-modal');
    } else {
        showToast('❌ Ошибка сохранения', 'error');
    }
}

// Send test notification
export async function sendTestNotification() {
    const response = await fetch('/api/telegram/test', { method: 'POST' });
    const result = await response.json();
    
    if (result.success) {
        showToast('✅ Тестовое сообщение отправлено!', 'success');
    } else {
        showToast('❌ Ошибка: ' + (result.reason || result.message), 'error');
    }
}

// Refresh chats list
export async function refreshTelegramChats() {
    showToast('🔄 Обновление списка чатов...', 'info');
    await openTelegramSettings();
}

// Helper: show toast
function showToast(message, type = 'info') {
    if (window.showToast) {
        window.showToast(message, type);
    } else {
        console.log(message);
    }
}

// Helper: close modal
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

// Expose to window
window.openTelegramSettings = openTelegramSettings;
window.saveTelegramSettings = saveTelegramSettings;
window.sendTestNotification = sendTestNotification;
window.refreshTelegramChats = refreshTelegramChats;
