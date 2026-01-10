
import { state } from './state.js';

export function formatMoney(amount, currency = 'USD') {
    if (!amount && amount !== 0) return '-';

    // Ensure amount is a number
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return '-';

    const formatter = new Intl.NumberFormat('ru-RU', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });

    const symbol = currency === 'USD' ? '$' : 'сум';
    return `${formatter.format(numAmount)} ${symbol}`;
}

export function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ru-RU');
}

export function getStatusName(status) {
    const statuses = {
        'in-progress': 'В процессе',
        'on-review': 'На проверку',
        'correction': 'На правку',
        'accepted': 'Принято',
        // Legacy statuses for backward compatibility
        'sketch': 'В процессе',
        'completed': 'Принято',
        'delivered': 'Принято',
        'checked': 'Принято'
    };
    return statuses[status] || status;
}

export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');
    toast.innerHTML = '<span class="toast-icon">' + icon + '</span><span class="toast-message">' + message + '</span>';

    container.appendChild(toast);

    // Remove after 10 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutToast 0.3s forwards';
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 10000);
}

export function openModal(id) {
    console.log('Opening modal:', id);
    const modal = document.getElementById(id);
    if (!modal) {
        console.error('Modal not found:', id);
        return;
    }
    modal.style.display = 'flex';
}

export function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'none';
        // Special cleanup for lightbox
        if (id === 'lightbox-modal' && window.handleLightboxKeys) {
            document.removeEventListener('keydown', window.handleLightboxKeys);
        }
    }
}

export function populateSelect(selectOrSelector, options, defaultOptionTest = 'Выберите', valueKey = 'name', textKey = 'name') {
    const select = typeof selectOrSelector === 'string' ? document.querySelector(selectOrSelector) : selectOrSelector;
    if (!select) return;

    if (!Array.isArray(options)) return;

    select.innerHTML = `<option value="" disabled selected>${defaultOptionTest}</option>` +
        options.map(item => `<option value="${item[valueKey]}">${item[textKey]}</option>`).join('');
}
