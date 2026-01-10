// Auto-Reminders Module
// ======================

import { state } from './state.js';
import { showToast } from './utils.js';
import { sendTelegramNotification } from './telegram.js';

// Get reminder settings
export function getReminderConfig() {
    return {
        paymentReminder: localStorage.getItem('autoRemindPayment') === 'true',
        paymentDaysBefore: parseInt(localStorage.getItem('paymentReminderDays') || '7'),
        deadlineReminder: localStorage.getItem('autoRemindDeadline') !== 'false',
        deadlineDaysBefore: parseInt(localStorage.getItem('deadlineReminderDays') || '3')
    };
}

// Save reminder config
export function saveReminderConfig(config) {
    localStorage.setItem('autoRemindPayment', config.paymentReminder ? 'true' : 'false');
    localStorage.setItem('paymentReminderDays', config.paymentDaysBefore.toString());
    localStorage.setItem('autoRemindDeadline', config.deadlineReminder ? 'true' : 'false');
    localStorage.setItem('deadlineReminderDays', config.deadlineDaysBefore.toString());
    showToast('✅ Настройки автонапоминаний сохранены', 'success');
}

// Check for payment reminders
export function checkPaymentReminders() {
    const config = getReminderConfig();
    if (!config.paymentReminder) return [];
    
    const reminders = [];
    const today = new Date();
    
    state.projects.forEach(project => {
        if (project.status === 'completed' || project.status === 'archive') return;
        
        const totalAmount = project.amount || 0;
        const transactions = state.transactions?.filter(t => t.projectId === project.id) || [];
        const paidAmount = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + (t.amount || 0), 0);
        
        const remainingAmount = totalAmount - paidAmount;
        const paymentPercent = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
        
        // Remind if less than 50% paid and project is active
        if (remainingAmount > 0 && paymentPercent < 50) {
            reminders.push({
                type: 'payment',
                projectId: project.id,
                projectName: project.name,
                client: project.client,
                remainingAmount,
                currency: project.currency || 'USD',
                paymentPercent: paymentPercent.toFixed(0)
            });
        }
    });
    
    return reminders;
}

// Check for deadline reminders
export function checkDeadlineReminders() {
    const config = getReminderConfig();
    if (!config.deadlineReminder) return [];
    
    const reminders = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    state.projects.forEach(project => {
        if (project.status === 'completed' || project.status === 'archive') return;
        if (!project.sections) return;
        
        project.sections.forEach(section => {
            if (!section.dueDate) return;
            if (section.status === 'accepted' || section.status === 'completed') return;
            
            const dueDate = new Date(section.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            
            const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            if (daysLeft <= config.deadlineDaysBefore && daysLeft >= 0) {
                reminders.push({
                    type: 'deadline',
                    projectId: project.id,
                    projectName: project.name,
                    sectionName: section.name,
                    dueDate: section.dueDate,
                    daysLeft,
                    engineer: section.engineer
                });
            }
        });
    });
    
    return reminders;
}

// Send auto-reminder via Telegram
export async function sendAutoReminder(reminder) {
    const client = state.clients?.find(c => c.name === reminder.client);
    
    if (reminder.type === 'payment') {
        const message = `💵 Напоминание об оплате

Проект: ${reminder.projectName}
Остаток к оплате: ${reminder.remainingAmount.toLocaleString()} ${reminder.currency}
Оплачено: ${reminder.paymentPercent}%

Просим произвести оплату в ближайшее время.`;
        
        if (client?.telegram) {
            await sendTelegramNotification(message, 'payment_reminder');
        }
        return message;
    }
    
    if (reminder.type === 'deadline') {
        const daysText = reminder.daysLeft === 0 ? 'сегодня' : 
                         reminder.daysLeft === 1 ? 'завтра' : 
                         `через ${reminder.daysLeft} дн.`;
        
        const message = `⏰ Напоминание о дедлайне

Проект: ${reminder.projectName}
Раздел: ${reminder.sectionName}
Срок: ${new Date(reminder.dueDate).toLocaleDateString('ru-RU')} (${daysText})
${reminder.engineer ? `Исполнитель: ${reminder.engineer}` : ''}`;
        
        await sendTelegramNotification(message, 'deadline_reminder');
        return message;
    }
}

// Open auto-reminders settings modal
export function openAutoRemindersSettings() {
    const config = getReminderConfig();
    
    let modal = document.getElementById('auto-reminders-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'auto-reminders-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    const paymentReminders = checkPaymentReminders();
    const deadlineReminders = checkDeadlineReminders();
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 550px;">
            <span class="close" onclick="closeModal('auto-reminders-modal')">&times;</span>
            <h2>🔔 Автоматические напоминания</h2>
            
            <div style="margin-bottom: 20px;">
                <h3 style="font-size: 1rem; margin-bottom: 15px; color: var(--text-secondary);">Настройки</h3>
                
                <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; cursor: pointer;">
                    <input type="checkbox" id="auto-payment-reminder" ${config.paymentReminder ? 'checked' : ''}>
                    <span>Напоминать клиентам об оплате</span>
                </label>
                
                <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; cursor: pointer;">
                    <input type="checkbox" id="auto-deadline-reminder" ${config.deadlineReminder ? 'checked' : ''}>
                    <span>Напоминать о дедлайнах</span>
                </label>
                
                <div style="display: flex; gap: 15px; margin-top: 15px;">
                    <div style="flex: 1;">
                        <label style="font-size: 0.85rem; color: var(--text-secondary);">Дней до оплаты:</label>
                        <select id="payment-days" style="width: 100%; padding: 8px; margin-top: 5px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 6px; color: var(--text-primary);">
                            <option value="3" ${config.paymentDaysBefore === 3 ? 'selected' : ''}>3 дня</option>
                            <option value="7" ${config.paymentDaysBefore === 7 ? 'selected' : ''}>7 дней</option>
                            <option value="14" ${config.paymentDaysBefore === 14 ? 'selected' : ''}>14 дней</option>
                        </select>
                    </div>
                    <div style="flex: 1;">
                        <label style="font-size: 0.85rem; color: var(--text-secondary);">Дней до дедлайна:</label>
                        <select id="deadline-days" style="width: 100%; padding: 8px; margin-top: 5px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 6px; color: var(--text-primary);">
                            <option value="1" ${config.deadlineDaysBefore === 1 ? 'selected' : ''}>1 день</option>
                            <option value="3" ${config.deadlineDaysBefore === 3 ? 'selected' : ''}>3 дня</option>
                            <option value="5" ${config.deadlineDaysBefore === 5 ? 'selected' : ''}>5 дней</option>
                            <option value="7" ${config.deadlineDaysBefore === 7 ? 'selected' : ''}>7 дней</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div style="border-top: 1px solid var(--glass-border); padding-top: 15px; margin-bottom: 15px;">
                <h3 style="font-size: 1rem; margin-bottom: 10px;">📋 Текущие напоминания</h3>
                
                ${paymentReminders.length === 0 && deadlineReminders.length === 0 
                    ? '<p style="color: var(--text-secondary); font-size: 0.9rem;">Нет активных напоминаний</p>'
                    : `
                        <div style="max-height: 200px; overflow-y: auto;">
                            ${paymentReminders.map(r => `
                                <div style="padding: 10px; background: rgba(245,158,11,0.1); border-left: 3px solid #f59e0b; border-radius: 4px; margin-bottom: 8px;">
                                    <div style="font-weight: 600; font-size: 0.9rem;">💵 ${r.projectName}</div>
                                    <div style="font-size: 0.8rem; color: var(--text-secondary);">К оплате: ${r.remainingAmount.toLocaleString()} ${r.currency}</div>
                                </div>
                            `).join('')}
                            ${deadlineReminders.map(r => `
                                <div style="padding: 10px; background: rgba(239,68,68,0.1); border-left: 3px solid #ef4444; border-radius: 4px; margin-bottom: 8px;">
                                    <div style="font-weight: 600; font-size: 0.9rem;">⏰ ${r.projectName} - ${r.sectionName}</div>
                                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${r.daysLeft === 0 ? 'Сегодня!' : r.daysLeft === 1 ? 'Завтра' : `Через ${r.daysLeft} дн.`}</div>
                                </div>
                            `).join('')}
                        </div>
                    `
                }
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button class="btn-primary" onclick="saveAutoRemindersConfig()" style="flex: 1;">💾 Сохранить</button>
                <button class="btn-secondary" onclick="sendAllReminders()" style="flex: 1;">📤 Отправить все</button>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

// Save config from modal
export function saveAutoRemindersConfig() {
    const config = {
        paymentReminder: document.getElementById('auto-payment-reminder').checked,
        paymentDaysBefore: parseInt(document.getElementById('payment-days').value),
        deadlineReminder: document.getElementById('auto-deadline-reminder').checked,
        deadlineDaysBefore: parseInt(document.getElementById('deadline-days').value)
    };
    
    saveReminderConfig(config);
    closeModal('auto-reminders-modal');
}

// Send all pending reminders
export async function sendAllReminders() {
    const paymentReminders = checkPaymentReminders();
    const deadlineReminders = checkDeadlineReminders();
    
    let sent = 0;
    
    for (const reminder of [...paymentReminders, ...deadlineReminders]) {
        await sendAutoReminder(reminder);
        sent++;
    }
    
    showToast(`📤 Отправлено ${sent} напоминаний`, 'success');
    closeModal('auto-reminders-modal');
}

// Helper
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

// Expose to window
window.openAutoRemindersSettings = openAutoRemindersSettings;
window.saveAutoRemindersConfig = saveAutoRemindersConfig;
window.sendAllReminders = sendAllReminders;
