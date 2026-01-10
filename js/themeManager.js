// Theme Manager Module
// =====================

// Get current theme
export function getCurrentTheme() {
    return localStorage.getItem('theme') || 'dark';
}

// Set theme
export function setTheme(theme) {
    localStorage.setItem('theme', theme);
    
    if (theme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
    
    updateThemeToggleButton();
}

// Toggle theme
export function toggleTheme() {
    const current = getCurrentTheme();
    const newTheme = current === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// Update toggle button icon
export function updateThemeToggleButton() {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
        const theme = getCurrentTheme();
        btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
        btn.title = theme === 'dark' ? 'Светлая тема' : 'Тёмная тема';
    }
}

// Initialize theme on page load
export function initTheme() {
    const theme = getCurrentTheme();
    if (theme === 'light') {
        document.body.classList.add('light-theme');
    }
    updateThemeToggleButton();
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', initTheme);

// Expose to window
window.toggleTheme = toggleTheme;
window.setTheme = setTheme;
window.initTheme = initTheme;
