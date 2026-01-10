
export const state = {
    projects: [],
    clients: [],
    transactions: [],
    employees: [],
    tasks: []
};

// Internal variables often used in global scope in original app
export let currentProjectId = null;
export let currentStatusTarget = null;
export const API_URL = '/api';

export function setCurrentProjectId(id) {
    currentProjectId = id;
}

export function setCurrentStatusTarget(target) {
    currentStatusTarget = target;
}

export function loadData() {
    try {
        state.projects = JSON.parse(localStorage.getItem('projects')) || [];
        state.clients = JSON.parse(localStorage.getItem('clients')) || [];
        state.transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        state.employees = JSON.parse(localStorage.getItem('employees')) || [];
        state.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    } catch (e) {
        console.error('Error loading state from localStorage:', e);
    }
}

export function saveData(renderCallback) {
    try {
        localStorage.setItem('projects', JSON.stringify(state.projects));
        localStorage.setItem('clients', JSON.stringify(state.clients));
        localStorage.setItem('transactions', JSON.stringify(state.transactions));
        localStorage.setItem('employees', JSON.stringify(state.employees));
        localStorage.setItem('tasks', JSON.stringify(state.tasks));
    } catch (e) {
        console.error('Error saving to localStorage:', e);
        if (e.name === 'QuotaExceededError') {
            alert('Ошибка: Недостаточно места в локальном хранилище! Данные не сохранены.');
        }
    }

    if (renderCallback) renderCallback();
}
