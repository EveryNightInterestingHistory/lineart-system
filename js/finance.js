
import { state, currentProjectId, saveData } from './state.js';
import { formatMoney, openModal, closeModal, showToast } from './utils.js';
import { renderProjectDetailsSafe, syncProject } from './projects.js';
// Chart.js is loaded globally in index.html
// import { Chart } from 'https://cdn.jsdelivr.net/npm/chart.js@auto/+esm';

// --- Finance Module ---

export function calculateTotals(items) {
    const totals = { USD: 0, UZS: 0 };
    items.forEach(item => {
        const curr = item.currency || 'USD';
        const amt = item.amount || 0;
        if (totals[curr] !== undefined) {
            totals[curr] += amt;
        }
    });
    return totals;
}

export function calculateProjectFinances(project) {
    const projectTransactions = state.transactions.filter(t => t.projectId && t.projectId.toString() === project.id.toString());
    const income = projectTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = projectTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return {
        income,
        expense,
        profit: income - expense,
        currency: project.currency || 'USD'
    };
}

export function renderFinances() {
    const list = document.getElementById('transaction-list');
    if (!list) return;

    list.innerHTML = state.projects.slice().reverse().map(project => {
        const finances = calculateProjectFinances(project);
        return `<li class="transaction-item" onclick="window.openProjectDetails('${project.id}')" style="cursor: pointer;">
            <div>
                <div style="font-weight: 600; font-size: 1.1rem;">${project.name}</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">${project.client}</div>
            </div>
            <div style="display: flex; gap: 20px; text-align: right;">
                <div class="finance-summary-item">
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">Доход</div>
                    <div style="color: var(--accent-success);">${formatMoney(finances.income, finances.currency)}</div>
                </div>
                <div class="finance-summary-item">
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">Расход</div>
                    <div style="color: var(--accent-danger);">${formatMoney(finances.expense, finances.currency)}</div>
                </div>
                <div class="finance-summary-item">
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">Прибыль</div>
                    <div style="font-weight: 600; color: ${finances.profit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'};">
                        ${formatMoney(finances.profit, finances.currency)}
                    </div>
                </div>
            </div>
        </li>`;
    }).join('');

    const incomeTotals = calculateTotals(state.transactions.filter(t => t.type === 'income'));
    const expenseTotals = calculateTotals(state.transactions.filter(t => t.type === 'expense'));

    const els = {
        totalIncomeUSD: document.getElementById('total-income-usd'),
        totalIncomeUZS: document.getElementById('total-income-uzs'),
        totalExpenseUSD: document.getElementById('total-expense-usd'),
        totalExpenseUZS: document.getElementById('total-expense-uzs'),
        totalNetUSD: document.getElementById('total-net-usd'),
        totalNetUZS: document.getElementById('total-net-uzs')
    };

    if (els.totalIncomeUSD) els.totalIncomeUSD.innerText = formatMoney(incomeTotals.USD, 'USD');
    if (els.totalIncomeUZS) els.totalIncomeUZS.innerText = formatMoney(incomeTotals.UZS, 'UZS');
    if (els.totalExpenseUSD) els.totalExpenseUSD.innerText = formatMoney(expenseTotals.USD, 'USD');
    if (els.totalExpenseUZS) els.totalExpenseUZS.innerText = formatMoney(expenseTotals.UZS, 'UZS');
    if (els.totalNetUSD) els.totalNetUSD.innerText = formatMoney(incomeTotals.USD - expenseTotals.USD, 'USD');
    if (els.totalNetUZS) els.totalNetUZS.innerText = formatMoney(incomeTotals.UZS - expenseTotals.UZS, 'UZS');
}

export function migrateAdvancesToTransactions() {
    let migrated = false;
    state.projects.forEach(project => {
        if (project.advance && project.advance > 0) {
            const hasAdvanceTransaction = state.transactions.some(t =>
                t.projectId && t.projectId.toString() === project.id.toString() &&
                t.type === 'income' &&
                (t.description === 'Аванс' || t.description === 'Advance')
            );

            if (!hasAdvanceTransaction) {
                const newTransaction = {
                    id: (Date.now() + Math.random()).toString(),
                    projectId: project.id.toString(),
                    type: 'income',
                    description: 'Аванс',
                    amount: parseFloat(project.advance),
                    currency: project.currency || 'USD',
                    date: project.createdAt ? new Date(project.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
                };
                state.transactions.push(newTransaction);
                migrated = true;
                console.log('Migrated advance for project ' + project.name + ': ' + project.advance);
            }
        }
    });
    return migrated;
}

let financeChartInstance = null;

export function renderFinanceChart(project, paid, expenses, total) {
    try {
        const ctx = document.getElementById('financeChart');
        if (!ctx) return;

        if (financeChartInstance) {
            financeChartInstance.destroy();
            financeChartInstance = null;
        }

        const transactions = state.transactions.filter(t =>
            t.projectId && t.projectId.toString() === project.id.toString()
        );

        const monthlyData = {};
        const allDates = transactions.map(t => new Date(t.date));

        if (allDates.length === 0) {
            const now = new Date();
            const key = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
            monthlyData[key] = { income: 0, expense: 0 };
        } else {
            allDates.sort((a, b) => a - b);
            const startDate = allDates[0];
            const endDate = new Date();

            let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
            while (current <= endDate) {
                const key = current.getFullYear() + '-' + String(current.getMonth() + 1).padStart(2, '0');
                monthlyData[key] = { income: 0, expense: 0 };
                current.setMonth(current.getMonth() + 1);
            }

            transactions.forEach(t => {
                const date = new Date(t.date);
                const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
                if (monthlyData[key]) {
                    if (t.type === 'income') monthlyData[key].income += t.amount;
                    if (t.type === 'expense') monthlyData[key].expense += t.amount;
                }
            });
        }

        const labels = Object.keys(monthlyData).sort();
        const incomeData = labels.map(k => monthlyData[k].income);
        const expenseData = labels.map(k => monthlyData[k].expense);

        const displayLabels = labels.map(k => {
            const [year, month] = k.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1);
            return date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' });
        });

        financeChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: displayLabels,
                datasets: [
                    {
                        label: 'Доходы',
                        data: incomeData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Расходы',
                        data: expenseData,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#a0a0a0' } },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    label += formatMoney(context.parsed.y, project.currency || 'USD');
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#a0a0a0' }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: '#a0a0a0',
                            callback: function (value) { return value.toLocaleString(); }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });

    } catch (e) {
        console.error('Error rendering finance chart:', e);
        const container = document.getElementById('finance-chart-container');
        if (container) container.innerHTML = '<div style="color: var(--accent-danger);">Ошибка отображения графика</div>';
    }
}

export function toggleFinanceVisibility() {
    const content = document.getElementById('finance-content-wrapper');
    if (content) {
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
    }
}

export function toggleTransactionsVisibility() {
    const list = document.getElementById('detail-transaction-list');
    if (list) {
        list.style.display = list.style.display === 'none' ? 'block' : 'none';
    }
}

// --- Window Bindings for HTML Access ---

window.openTransactionModal = (projectId = null) => {
    const modal = document.getElementById('transaction-modal');
    const form = document.getElementById('transaction-form');
    if (!modal || !form) return;

    form.reset();

    const dateInput = form.querySelector('input[name="date"]');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    const projectSelect = document.getElementById('transaction-project-select');
    if (projectSelect) {
        projectSelect.innerHTML = '<option value="">-- Без проекта --</option>' +
            state.projects.map(p => '<option value="' + p.id + '">' + p.name + '</option>').join('');

        if (projectId) {
            projectSelect.value = projectId;
            projectSelect.style.display = 'none';
        } else {
            projectSelect.style.display = 'block';
        }
    }
    openModal('transaction-modal');
};

window.openProjectExpenseModal = () => {
    if (!currentProjectId) {
        alert('Ошибка: Проект не выбран');
        return;
    }

    const projectIdInput = document.getElementById('expense-project-id');
    if (projectIdInput) {
        projectIdInput.value = currentProjectId;
    }

    const engineerSelect = document.getElementById('expense-engineer-select');
    if (engineerSelect) {
        engineerSelect.innerHTML = '<option value="">-- Общий расход --</option>' +
            (state.employees || []).map(e => '<option value="' + e.name + '">' + e.name + '</option>').join('');
    }

    openModal('project-expense-modal');
};

// --- Event Listeners Setup ---

export function setupFinanceListeners() {
    // Transaction Form
    const transactionForm = document.getElementById('transaction-form');
    if (transactionForm) {
        transactionForm.addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                const formData = new FormData(e.target);
                const projectId = formData.get('projectId');

                const newTransaction = {
                    id: Date.now().toString(),
                    projectId: projectId ? projectId.toString() : null,
                    type: formData.get('type'),
                    description: formData.get('description'),
                    amount: parseFloat(formData.get('amount')),
                    currency: formData.get('currency'),
                    date: formData.get('date')
                };

                state.transactions.push(newTransaction);
                saveData();
                closeModal('transaction-modal');
                e.target.reset();

                // Update UI
                if (currentProjectId && (newTransaction.projectId && newTransaction.projectId.toString() === currentProjectId.toString())) {
                    const project = state.projects.find(p => p.id.toString() === currentProjectId.toString());
                    if (project) {
                        renderProjectDetailsSafe(project);
                    }
                } else {
                    if (window.render) window.render(); // Global render if available, likely app.js binds it or we invoke specific renderers
                    // renderFinances(); // At least this
                }

                // We should probably rely on a global render trigger or specific updates.
                // Assuming app.js will set window.render or we call renderFinances() here.
                renderFinances();
                showToast('Операция добавлена!', 'success');
            } catch (err) {
                console.error(err);
                showToast('Ошибка: ' + err.message, 'error');
            }
        });
    }

    // Project Expense Form
    const projectExpenseForm = document.getElementById('project-expense-form');
    if (projectExpenseForm) {
        projectExpenseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                const formData = new FormData(e.target);
                const projectId = document.getElementById('expense-project-id').value;
                const engineer = formData.get('engineer');
                const description = formData.get('description');
                const amount = parseFloat(formData.get('amount'));
                const currency = formData.get('currency');

                if (!projectId || !description || !amount) {
                    showToast('Пожалуйста, заполните описание и сумму', 'error');
                    return;
                }

                const newTransaction = {
                    id: Date.now().toString(),
                    projectId: projectId.toString(),
                    type: 'expense',
                    engineer: engineer,
                    description: description,
                    amount: amount,
                    currency: currency,
                    date: new Date(Date.now() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0]
                };

                state.transactions.push(newTransaction);

                const project = state.projects.find(p => p.id.toString() === projectId.toString());
                if (project) {
                    if (!project.history) project.history = [];
                    const engineerText = engineer ? ` (${engineer})` : ' (общий расход)';
                    project.history.push({
                        date: new Date().toISOString(),
                        action: 'expense',
                        text: `Расход: ${description}${engineerText} - ${amount} ${currency}`
                    });
                }

                saveData();
                closeModal('project-expense-modal');
                e.target.reset();

                if (currentProjectId && currentProjectId.toString() === projectId.toString()) {
                    renderProjectDetailsSafe(project);
                }
                showToast('Расход добавлен!', 'success');
            } catch (err) {
                console.error('Error saving expense:', err);
                showToast('Ошибка при сохранении расхода: ' + err.message, 'error');
            }
        });
    }
}
