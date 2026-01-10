// Keyboard Shortcuts Module
// ==========================

import { showToast } from './utils.js';

// Shortcut definitions
const shortcuts = {
    // Navigation
    'g+d': { action: () => switchTab('dashboard'), description: 'Перейти на Дашборд' },
    'g+p': { action: () => switchTab('projects'), description: 'Перейти к Проектам' },
    'g+c': { action: () => switchTab('calendar'), description: 'Перейти к Календарю' },
    'g+a': { action: () => switchTab('analytics'), description: 'Перейти к Аналитике' },
    'g+f': { action: () => switchTab('finances'), description: 'Перейти к Финансам' },
    
    // Actions
    'n': { action: () => openNewProjectModal(), description: 'Новый проект', requiresNoFocus: true },
    '/': { action: () => focusSearch(), description: 'Поиск', requiresNoFocus: true },
    'Escape': { action: () => closeAllModals(), description: 'Закрыть модальные окна' },
    '?': { action: () => showShortcutsHelp(), description: 'Показать справку по горячим клавишам' },
    
    // Project details
    'e': { action: () => editCurrentProject(), description: 'Редактировать проект', requiresProjectView: true },
    'q': { action: () => showProjectQRCode(currentProjectId), description: 'Показать QR-код', requiresProjectView: true }
};

// Key sequence tracking
let keySequence = '';
let sequenceTimer = null;

// Initialize keyboard shortcuts
export function initKeyboardShortcuts() {
    document.addEventListener('keydown', handleKeyDown);
    injectShortcutsStyles();
}

function handleKeyDown(e) {
    // Skip if typing in input/textarea
    if (e.target.matches('input, textarea, select')) {
        if (e.key === 'Escape') {
            e.target.blur();
        }
        return;
    }
    
    // Skip if modifier keys (except for specific combos)
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    
    // Clear sequence timer
    if (sequenceTimer) clearTimeout(sequenceTimer);
    
    // Build key sequence (e.g., "g+p")
    const key = e.key.toLowerCase();
    
    if (keySequence) {
        keySequence += '+' + key;
    } else {
        keySequence = key;
    }
    
    // Check for matching shortcut
    const shortcut = shortcuts[keySequence] || shortcuts[key];
    
    if (shortcut) {
        e.preventDefault();
        
        // Check conditions
        if (shortcut.requiresNoFocus) {
            // Already checked above
        }
        
        if (shortcut.requiresProjectView) {
            const projectView = document.getElementById('project-details-view');
            if (!projectView?.classList.contains('active')) {
                keySequence = '';
                return;
            }
        }
        
        shortcut.action();
        keySequence = '';
        return;
    }
    
    // Reset sequence after 1 second
    sequenceTimer = setTimeout(() => {
        keySequence = '';
    }, 1000);
}

// Helper functions
function switchTab(tab) {
    const navItem = document.querySelector(`.nav-item[data-tab="${tab}"]`);
    if (navItem) navItem.click();
}

function focusSearch() {
    const search = document.getElementById('project-search');
    if (search) {
        switchTab('projects');
        setTimeout(() => search.focus(), 100);
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

function openNewProjectModal() {
    if (window.openNewProjectModal) window.openNewProjectModal();
}

function editCurrentProject() {
    if (window.editCurrentProject) window.editCurrentProject();
}

// Show shortcuts help modal
export function showShortcutsHelp() {
    let modal = document.getElementById('shortcuts-help-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'shortcuts-help-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    const groups = {
        'Навигация': [
            ['G → D', 'Дашборд'],
            ['G → P', 'Проекты'],
            ['G → C', 'Календарь'],
            ['G → A', 'Аналитика'],
            ['G → F', 'Финансы']
        ],
        'Действия': [
            ['N', 'Новый проект'],
            ['/', 'Поиск'],
            ['Esc', 'Закрыть окно'],
            ['?', 'Справка']
        ],
        'В проекте': [
            ['E', 'Редактировать'],
            ['Q', 'QR-код']
        ]
    };
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <span class="close" onclick="closeModal('shortcuts-help-modal')">&times;</span>
            <h2>⌨️ Горячие клавиши</h2>
            
            ${Object.entries(groups).map(([group, items]) => `
                <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 10px; text-transform: uppercase;">${group}</h3>
                    <div style="display: grid; gap: 8px;">
                        ${items.map(([key, desc]) => `
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: var(--text-secondary);">${desc}</span>
                                <kbd style="background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 4px; font-family: monospace; font-size: 0.85rem;">${key}</kbd>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
            
            <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 10px;">
                💡 Для последовательных клавиш (G → D) нажмите сначала G, затем D в течение секунды.
            </p>
        </div>
    `;
    
    modal.style.display = 'flex';
}

// Inject styles
function injectShortcutsStyles() {
    if (document.getElementById('shortcuts-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'shortcuts-styles';
    style.textContent = `
        kbd {
            background: rgba(255,255,255,0.1);
            border: 1px solid var(--glass-border);
            border-radius: 4px;
            padding: 2px 6px;
            font-family: monospace;
            font-size: 0.8rem;
        }
    `;
    document.head.appendChild(style);
}

// Expose to window
window.showShortcutsHelp = showShortcutsHelp;
window.initKeyboardShortcuts = initKeyboardShortcuts;

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initKeyboardShortcuts, 500);
});
