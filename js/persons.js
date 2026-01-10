
import { state, currentProjectId, saveData } from './state.js';
import { syncProject, renderProjectDetailsSafe } from './projects.js';
import { formatMoney, getStatusName, showToast, openModal, closeModal, populateSelect } from './utils.js';

// --- Persons Module (Clients & Employees) ---

export function restoreRegistryFromProjects() {
    console.log('Restoring registry from projects...');
    let changesMade = false;

    // Restore Clients
    state.projects.forEach(p => {
        if (p.client) {
            const clientName = p.client.trim();
            const exists = state.clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
            if (!exists) {
                console.log('Restoring client:', clientName);
                state.clients.push({
                    id: Date.now() + Math.random().toString(),
                    name: clientName,
                    phone: '',
                    telegram: ''
                });
                changesMade = true;
            }
        }

        // Restore Engineers from Sections
        if (p.sections) {
            p.sections.forEach(s => {
                if (s.engineer) {
                    const engName = s.engineer.trim();
                    const exists = state.employees.find(e => e.name.toLowerCase() === engName.toLowerCase());
                    if (!exists) {
                        console.log('Restoring engineer:', engName);
                        state.employees.push({
                            id: Date.now() + Math.random().toString(),
                            name: engName,
                            position: 'Инженер',
                            phone: ''
                        });
                        changesMade = true;
                    }
                }
            });
        }

        // Restore Engineers from Contracts (if any keys in engineerContracts are not in sections)
        if (p.engineerContracts) {
            Object.keys(p.engineerContracts).forEach(engName => {
                const exists = state.employees.find(e => e.name.toLowerCase() === engName.toLowerCase());
                if (!exists) {
                    console.log('Restoring engineer from contract:', engName);
                    state.employees.push({
                        id: Date.now() + Math.random().toString(),
                        name: engName,
                        position: 'Инженер',
                        phone: ''
                    });
                    changesMade = true;
                }
            });
        }
    });

    if (changesMade) {
        saveData();
    }
}

export function renderClients() {
    const list = document.getElementById('clients-list');
    if (!list) return;

    list.innerHTML = state.clients.map(c => {
        const clientProjects = state.projects.filter(p => p.client && p.client.trim().toLowerCase() === c.name.trim().toLowerCase());
        const activeProjects = clientProjects.filter(p => p.status === 'in-progress' || p.status === 'sketch').length;

        return `
        <div class="compact-card client-card" onclick="window.openClientDetailsPage('${c.id}')" style="cursor: pointer;">
            <div class="compact-header">
                <div>
                    <h3 class="compact-title">${c.name}</h3>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">
                        ${clientProjects.length} проектов (${activeProjects} активных)
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--glass-border);">
                <div class="compact-row">
                    <span class="icon">📞</span> ${c.phone || '<span style="color: var(--text-secondary);">-</span>'}
                </div>
                <div class="compact-row">
                    <span class="icon">✈️</span> ${c.telegram || '<span style="color: var(--text-secondary);">-</span>'}
                </div>
            </div>
        </div>
        `;
    }).join('');
}

export function renderEmployees() {
    const list = document.getElementById('employees-list');
    if (!list) return;

    list.innerHTML = state.employees.map(e => `
        <div class="card employee-card" onclick="window.openEngineerDetailsPage('${e.id}')" style="cursor: pointer;">
            <div class="card-header">
                <h3>${e.name}</h3>
                <div class="actions">
                    <button class="btn-icon-sm" onclick="event.stopPropagation(); window.editEmployee('${e.id}')">✎</button>
                    <button class="btn-icon-sm admin-only" onclick="event.stopPropagation(); window.deleteEmployee('${e.id}')" style="color: var(--accent-danger);">🗑</button>
                </div>
            </div>
            <div class="card-body">
                <p><strong>Должность:</strong> ${e.position}</p>
                <p><strong>Телефон:</strong> ${e.phone || '-'}</p>
            </div>
        </div>
    `).join('');
}

export function openClientDetailsPage(clientId, pushState = true) {
    const client = state.clients.find(c => c.id.toString() === clientId.toString());
    if (!client) return;

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('client-details-view').classList.add('active');

    document.getElementById('client-page-name').innerText = client.name;
    document.getElementById('client-page-phone').innerHTML = client.phone || '<span style="color: var(--text-secondary);">Не указан</span>';

    const telegramLink = document.getElementById('client-page-telegram');
    if (client.telegram) {
        let href = client.telegram;
        if (!href.startsWith('http') && !href.startsWith('tg://')) {
            href = 'https://t.me/' + href.replace('@', '');
        }
        telegramLink.innerText = client.telegram;
        telegramLink.href = href;
        telegramLink.style.display = 'inline';
    } else {
        telegramLink.innerText = 'Не указан';
        telegramLink.removeAttribute('href');
        telegramLink.style.display = 'inline';
    }

    const clientProjects = state.projects.filter(p => p.client && p.client.trim().toLowerCase() === client.name.trim().toLowerCase());
    const activeProjects = clientProjects.filter(p => p.status === 'in-progress' || p.status === 'sketch').length;

    document.getElementById('client-page-total-projects').innerText = clientProjects.length;
    document.getElementById('client-page-active-projects').innerText = activeProjects;

    const totalRevenueUSD = clientProjects.filter(p => (!p.currency || p.currency === 'USD')).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const totalRevenueUZS = clientProjects.filter(p => p.currency === 'UZS').reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    document.getElementById('client-page-revenue-usd').innerText = formatMoney(totalRevenueUSD, 'USD');
    document.getElementById('client-page-revenue-uzs').innerText = formatMoney(totalRevenueUZS, 'UZS');

    const historyList = document.getElementById('client-projects-list');
    if (clientProjects.length === 0) {
        historyList.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 20px;">Нет проектов</div>';
    } else {
        historyList.innerHTML = clientProjects.map(p =>
            `<div class="compact-card" onclick="window.openProjectDetails('${p.id}')" style="cursor: pointer;">
                <div class="compact-header">
                    <h3 class="compact-title">${p.name}</h3>
                    <span class="status-badge status-${p.status}">${getStatusName(p.status)}</span>
                </div>
                <div class="compact-row">
                    <span style="font-weight: 600; color: var(--accent-primary);">${formatMoney(p.amount, p.currency)}</span>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">${new Date(p.createdAt).toLocaleDateString('ru-RU')}</span>
                </div>
            </div>`
        ).join('');
    }

    document.getElementById('client-page-edit-btn').onclick = () => window.editClient(client.id);
    document.getElementById('client-page-delete-btn').onclick = () => window.deleteClient(client.id);

    if (pushState) {
        history.pushState({ view: 'client-details', id: clientId }, '', `?view=client-details&id=${clientId}`);
    }
}

export function closeClientDetailsPage() {
    if (history.state && history.state.view === 'client-details') {
        history.back();
    } else {
        history.pushState({ view: 'clients' }, '', '?view=clients');
        window.dispatchEvent(new Event('popstate'));
    }
}

export function openEngineerDetailsPage(engineerId, pushState = true) {
    const engineer = state.employees.find(e => e.id.toString() === engineerId.toString());
    if (!engineer) return;

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('engineer-details-view').classList.add('active');

    document.getElementById('engineer-page-name').innerText = engineer.name;
    document.getElementById('engineer-page-position').innerText = engineer.position || '-';
    document.getElementById('engineer-page-phone').innerText = engineer.phone || '-';

    const engineerProjects = state.projects.filter(p =>
        p.sections && p.sections.some(s => s.engineer === engineer.name)
    );

    document.getElementById('engineer-page-total-projects').innerText = engineerProjects.length;

    const statusCounts = {};
    engineerProjects.forEach(p => {
        const s = p.status || 'sketch';
        statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    const statusList = document.getElementById('engineer-page-status-list');
    if (statusList) {
        if (engineerProjects.length === 0) {
            statusList.style.display = 'none';
        } else {
            statusList.style.display = 'flex';
            statusList.innerHTML = Object.entries(statusCounts).map(([status, count]) =>
                `<div>${getStatusName(status)}: <span style="color: var(--text-primary); font-weight: 500;">${count}</span></div>`
            ).join('');
        }
    }

    // ... (rest of logic remains same, just ensuring pushState is at end)

    // Recalculating totals for completeness (code block truncation in original view makes full replace risky without full context, assume logic below matches)
    // Actually, to be safe, I should preserve the logic I saw in previous steps. 
    // I'll copy the logic from the read file to be safe.

    let totalContractUSD = 0;
    let totalContractUZS = 0;
    let totalPaidUSD = 0;
    let totalPaidUZS = 0;

    engineerProjects.forEach(p => {
        const currency = p.currency || 'USD';
        const contractAmount = (p.engineerContracts && p.engineerContracts[engineer.name]) || 0;
        if (currency === 'USD') totalContractUSD += contractAmount;
        else totalContractUZS += contractAmount;

        const paid = state.transactions.filter(t =>
            t.projectId == p.id &&
            t.type === 'expense' &&
            t.engineer === engineer.name
        ).reduce((sum, t) => sum + t.amount, 0);

        if (currency === 'USD') totalPaidUSD += paid;
        else totalPaidUZS += paid;
    });

    document.getElementById('engineer-page-contract-usd').innerText = formatMoney(totalContractUSD, 'USD');
    document.getElementById('engineer-page-contract-uzs').innerText = formatMoney(totalContractUZS, 'UZS');
    document.getElementById('engineer-page-paid-usd').innerText = formatMoney(totalPaidUSD, 'USD');
    document.getElementById('engineer-page-paid-uzs').innerText = formatMoney(totalPaidUZS, 'UZS');

    const historyList = document.getElementById('engineer-projects-list');
    if (engineerProjects.length === 0) {
        historyList.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 20px;">Нет проектов</div>';
    } else {
        historyList.innerHTML = engineerProjects.map(p => {
            const sections = p.sections.filter(s => s.engineer === engineer.name).map(s => s.name).join(', ');
            const currency = p.currency || 'USD';
            const contractAmount = (p.engineerContracts && p.engineerContracts[engineer.name]) || 0;
            const paid = state.transactions.filter(t =>
                t.projectId == p.id &&
                t.type === 'expense' &&
                t.engineer === engineer.name
            ).reduce((sum, t) => sum + t.amount, 0);

            return `
            <div class="compact-card" onclick="window.openProjectDetails('${p.id}')" style="cursor: pointer;">
                <div class="compact-header">
                    <h3 class="compact-title">${p.name}</h3>
                    <span class="status-badge status-${p.status}">${getStatusName(p.status)}</span>
                </div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 5px;">Разделы: ${sections}</div>
                <div class="compact-row">
                    <span style="font-size: 0.85rem;">Договор: ${formatMoney(contractAmount, currency)}</span>
                    <span style="font-size: 0.85rem;">Оплачено: ${formatMoney(paid, currency)}</span>
                </div>
            </div>`;
        }).join('');
    }

    if (pushState) {
        history.pushState({ view: 'engineer-details', id: engineerId }, '', `?view=engineer-details&id=${engineerId}`);
    }
}

export function openEngineerStats(engineerName) {
    const engineer = state.employees.find(e => e.name === engineerName);
    const project = state.projects.find(p => p.id.toString() === currentProjectId.toString());

    document.getElementById('stats-engineer-name').innerText = engineerName;
    document.getElementById('stats-engineer-position').innerText = engineer ? engineer.position : 'Инженер';
    document.getElementById('stats-engineer-phone').innerText = engineer ? (engineer.phone || '-') : '-';

    let revenue = 0;
    let currency = 'USD';

    if (project) {
        currency = project.currency || 'USD';
        const contractAmount = (project.engineerContracts && project.engineerContracts[engineerName]) || 0;

        document.getElementById('contract-display-value').innerText = formatMoney(contractAmount, currency).replace(currency, '').trim();
        document.querySelector('.contract-view .currency-symbol').innerText = currency === 'USD' ? '$' : 'сум';

        const contractInput = document.getElementById('engineer-contract-amount');
        contractInput.value = contractAmount;
        contractInput.dataset.engineer = engineerName;

        document.getElementById('contract-view-mode').style.display = 'flex';
        document.getElementById('contract-edit-mode').style.display = 'none';

        const expenses = state.transactions.filter(t =>
            t.projectId && t.projectId.toString() === project.id.toString() &&
            t.type === 'expense' &&
            t.engineer === engineerName
        );
        revenue = expenses.reduce((sum, t) => sum + t.amount, 0);

        const sectionsContainer = document.getElementById('stats-engineer-sections');
        const engineerSections = (project.sections || []).filter(s => s.engineer === engineerName);

        if (engineerSections.length === 0) {
            sectionsContainer.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.9rem;">Нет назначенных разделов</div>';
        } else {
            sectionsContainer.innerHTML = engineerSections.map(s =>
                `<div class="compact-list-item">
                    <div>
                        <div class="main-text">${s.name}</div>
                        <div class="sub-text">${getStatusName(s.status || 'sketch')}</div>
                    </div>
                </div>`
            ).join('');
        }

        const transactionsContainer = document.getElementById('stats-engineer-transactions');
        if (expenses.length === 0) {
            transactionsContainer.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.9rem;">Нет выплат</div>';
        } else {
            transactionsContainer.innerHTML = expenses.slice().reverse().map(t =>
                `<div class="compact-list-item">
                    <div>
                        <div class="main-text">${t.description}</div>
                        <div class="sub-text">${t.date}</div>
                    </div>
                    <div class="amount">-${formatMoney(t.amount, t.currency)}</div>
                </div>`
            ).join('');
        }
    }

    document.getElementById('stats-engineer-revenue').innerText = formatMoney(revenue, currency);
    openModal('engineer-stats-modal');
}

export function deleteClient(id) {
    if (confirm('Удалить клиента?')) {
        state.clients = state.clients.filter(c => c.id != id);
        saveData();
        renderClients();
        closeModal('client-details-modal');
        closeClientDetailsPage();
    }
}

export function editClient(id) {
    const client = state.clients.find(c => c.id == id);
    if (!client) return;

    const form = document.getElementById('client-form');
    form.querySelector('[name="id"]').value = client.id;
    form.querySelector('[name="name"]').value = client.name;
    form.querySelector('[name="phone"]').value = client.phone || '';
    form.querySelector('[name="telegram"]').value = client.telegram || '';

    document.querySelector('#client-details-modal h2').innerText = 'Редактирование клиента';
    openModal('client-details-modal');
}

export function editEmployee(id) {
    const employee = state.employees.find(e => e.id === id);
    if (!employee) return;

    const form = document.getElementById('employee-form');
    form.querySelector('[name="id"]').value = employee.id;
    form.querySelector('[name="name"]').value = employee.name;
    form.querySelector('[name="position"]').value = employee.position;
    form.querySelector('[name="phone"]').value = employee.phone || '';

    document.querySelector('#employee-modal h2').innerText = 'Редактирование инженера';
    openModal('employee-modal');
}

export async function deleteEmployee(id) {
    const employee = state.employees.find(e => e.id === id);
    if (!employee) return;

    if (confirm(`Удалить сотрудника ${employee.name}?`)) {
        // 1. Try to delete from DB (Login access)
        if (employee.username) {
            try {
                const res = await fetch('/api/delete-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: employee.username })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('✅ Пользователь удален из базы', 'success');
                } else {
                    console.warn('DB Delete failed:', data.message);
                }
            } catch (err) {
                console.error('Network error during delete:', err);
            }
        } else {
            console.log('No username linked, removing only from local list.');
        }

        // 2. Remove from Local List
        state.employees = state.employees.filter(e => e.id !== id);
        saveData();
        renderEmployees();
    }
}

export function toggleContractEdit() {
    document.getElementById('contract-view-mode').style.display = 'none';
    const editMode = document.getElementById('contract-edit-mode');
    editMode.style.display = 'flex';
    const input = document.getElementById('engineer-contract-amount');
    input.focus();
}

export function saveContractEdit() {
    const input = document.getElementById('engineer-contract-amount');
    const amount = parseFloat(input.value);
    const engineerName = input.dataset.engineer;
    const project = state.projects.find(p => p.id.toString() === currentProjectId.toString());

    if (project && engineerName) {
        if (!project.engineerContracts) {
            project.engineerContracts = {};
        }
        project.engineerContracts[engineerName] = amount || 0;
        saveData();
        syncProject(project);

        const currency = project.currency || 'USD';
        document.getElementById('contract-display-value').innerText = formatMoney(amount || 0, currency).replace(currency, '').trim();

        document.getElementById('contract-edit-mode').style.display = 'none';
        document.getElementById('contract-view-mode').style.display = 'flex';
    }
}

export function addEngineerPayment() {
    const engineerName = document.getElementById('engineer-contract-amount').dataset.engineer;
    const amountInput = document.getElementById('engineer-payment-amount');
    const amount = parseFloat(amountInput.value);
    const project = state.projects.find(p => p.id.toString() === currentProjectId.toString());

    if (!amount || amount <= 0) {
        alert('Введите корректную сумму выплаты');
        return;
    }

    if (!confirm('Выплатить ' + amount + ' ' + (project.currency || 'USD') + ' инженеру ' + engineerName + '?')) {
        return;
    }

    if (project && engineerName) {
        const transaction = {
            id: Date.now(),
            projectId: project.id,
            type: 'expense',
            description: 'Выплата по договору',
            amount: amount,
            currency: project.currency || 'USD',
            date: new Date().toISOString().split('T')[0],
            engineer: engineerName
        };

        state.transactions.push(transaction);
        saveData();

        amountInput.value = '';

        const btn = document.querySelector('#engineer-payment-amount').nextElementSibling;
        const originalText = btn.innerText;
        btn.innerText = '✓ Выплачено';
        btn.style.background = 'var(--accent-success)';
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.background = '';
        }, 2000);

        openEngineerStats(engineerName);
        renderProjectDetailsSafe(project);
    }
}

// Global Bindings
window.openClientDetailsPage = openClientDetailsPage;
window.openEngineerDetailsPage = openEngineerDetailsPage;
window.closeClientDetailsPage = closeClientDetailsPage;
window.deleteClient = deleteClient;
window.editClient = editClient;
window.editEmployee = editEmployee;
window.deleteEmployee = deleteEmployee;
window.openEngineerStats = openEngineerStats;
window.toggleContractEdit = toggleContractEdit;
window.saveContractEdit = saveContractEdit;
window.addEngineerPayment = addEngineerPayment;

export function setupPersonListeners() {
    // Client Form
    const clientForm = document.getElementById('client-form');
    if (clientForm) {
        clientForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const id = formData.get('id');
            const newClient = {
                id: id || Date.now().toString(),
                name: formData.get('name'),
                phone: formData.get('phone'),
                telegram: formData.get('telegram')
            };

            if (id) {
                const index = state.clients.findIndex(c => c.id == id);
                if (index !== -1) state.clients[index] = newClient;
            } else {
                state.clients.push(newClient);
            }
            saveData();
            renderClients();
            closeModal('client-details-modal');
            e.target.reset();
        });
    }

    // Employee Form
    const employeeForm = document.getElementById('employee-form');
    if (employeeForm) {
        employeeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const formData = new FormData(e.target);
                const id = formData.get('id');
                const name = formData.get('name');
                const position = formData.get('position');
                const phone = formData.get('phone');

                // Login credentials
                const username = formData.get('username');
                const password = formData.get('password');

                let registeredUsername = '';

                // Only register if username/password are provided and it's a new or existing user check?
                // For simplicity, always try to register if credentials are present.
                if (username && password) {
                    const response = await fetch('/api/register-user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password, role: 'engineer' })
                    });

                    const result = await response.json();
                    if (!result.success) {
                        throw new Error(result.message);
                    }
                    registeredUsername = username;
                    showToast('Пользователь зарегистрирован', 'success');
                }

                if (id) {
                    const emp = state.employees.find(e => e.id === id);
                    if (emp) {
                        emp.name = name;
                        emp.position = position;
                        emp.phone = phone;
                        if (registeredUsername) emp.username = registeredUsername; // Link to login
                    }
                } else {
                    state.employees.push({
                        id: Date.now().toString(),
                        name: name || 'Новый инженер',
                        position: position || 'Инженер',
                        phone: phone || '',
                        username: registeredUsername || ''
                    });
                }

                saveData();
                renderEmployees();
                closeModal('employee-modal');
                e.target.reset();
                showToast('Данные сохранены', 'success');
            } catch (err) {
                console.error(err);
                showToast('Ошибка: ' + err.message, 'error');
            }
        });
    }
}

export function openNewEmployeeModal() {
    // Reset form
    const form = document.getElementById('employee-form');
    if (form) form.reset();
    document.querySelector('#employee-modal h2').innerText = 'Новый инженер';
    openModal('employee-modal');
}

export function closeEngineerDetailsPage() {
    if (history.state && history.state.view === 'engineer-details') {
        history.back();
    } else {
        history.pushState({ view: 'employees' }, '', '?view=employees');
        window.dispatchEvent(new Event('popstate'));
    }
}
