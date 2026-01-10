import { state } from './state.js';
import { formatMoney } from './utils.js';

// Period comparison data
let comparisonChartInstance = null;

export function renderAnalytics() {
    const container = document.getElementById('analytics-view');
    if (!container) return;

    const stats = calculateStats();
    const periodStats = calculatePeriodComparison();
    
    // Export buttons HTML
    const exportButtonsHTML = `
        <div class="analytics-toolbar" style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
            <button onclick="exportAnalyticsToCSV()" class="btn-export" style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; border-radius: 8px; color: white; cursor: pointer; font-size: 0.9rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Экспорт в CSV
            </button>
            <button onclick="exportAnalyticsToExcel()" class="btn-export" style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border: none; border-radius: 8px; color: white; cursor: pointer; font-size: 0.9rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                Экспорт в Excel
            </button>
            <button onclick="exportFinanceReport()" class="btn-export" style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border: none; border-radius: 8px; color: white; cursor: pointer; font-size: 0.9rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                Финансовый отчёт
            </button>
        </div>
    `;
    
    // KPI Cards HTML
    const kpiHTML = `
        <div class="kpi-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <div class="kpi-card" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; border: 1px solid var(--glass-border);">
                <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 5px;">Всего проектов</div>
                <div style="font-size: 2rem; font-weight: 700; color: var(--text-primary);">${stats.totalProjects}</div>
            </div>
            <div class="kpi-card" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; border: 1px solid var(--glass-border);">
                <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 5px;">В работе</div>
                <div style="font-size: 2rem; font-weight: 700; color: var(--accent-primary);">${stats.inProgress}</div>
            </div>
            <div class="kpi-card" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; border: 1px solid var(--glass-border);">
                <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 5px;">На проверке</div>
                <div style="font-size: 2rem; font-weight: 700; color: #f59e0b;">${stats.onReview}</div>
            </div>
            <div class="kpi-card" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; border: 1px solid var(--glass-border);">
                <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 5px;">Общая сумма</div>
                <div style="font-size: 2rem; font-weight: 700; color: #10b981;">$${stats.totalValue.toLocaleString()}</div>
            </div>
        </div>
    `;

    // Period comparison HTML
    const periodComparisonHTML = `
        <div class="period-comparison" style="background: rgba(40,40,40,0.6); padding: 20px; border-radius: 16px; border: 1px solid var(--glass-border); margin-bottom: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="font-size: 1.1rem; color: var(--text-primary);">📊 Сравнение периодов</h3>
                <div style="display: flex; gap: 10px;">
                    <span style="font-size: 0.85rem; color: var(--text-secondary);">Текущий месяц vs Прошлый</span>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-bottom: 20px;">
                <div style="text-align: center; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 10px;">
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 5px;">Доход (тек.)</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: #10b981;">$${periodStats.currentIncome.toLocaleString()}</div>
                    <div style="font-size: 0.75rem; color: ${periodStats.incomeChange >= 0 ? '#10b981' : '#ef4444'}; margin-top: 5px;">
                        ${periodStats.incomeChange >= 0 ? '↑' : '↓'} ${Math.abs(periodStats.incomeChange).toFixed(1)}%
                    </div>
                </div>
                <div style="text-align: center; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 10px;">
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 5px;">Расход (тек.)</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: #ef4444;">$${periodStats.currentExpense.toLocaleString()}</div>
                    <div style="font-size: 0.75rem; color: ${periodStats.expenseChange <= 0 ? '#10b981' : '#ef4444'}; margin-top: 5px;">
                        ${periodStats.expenseChange >= 0 ? '↑' : '↓'} ${Math.abs(periodStats.expenseChange).toFixed(1)}%
                    </div>
                </div>
                <div style="text-align: center; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 10px;">
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 5px;">Прибыль (тек.)</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: ${periodStats.currentProfit >= 0 ? '#10b981' : '#ef4444'};">$${periodStats.currentProfit.toLocaleString()}</div>
                    <div style="font-size: 0.75rem; color: ${periodStats.profitChange >= 0 ? '#10b981' : '#ef4444'}; margin-top: 5px;">
                        ${periodStats.profitChange >= 0 ? '↑' : '↓'} ${Math.abs(periodStats.profitChange).toFixed(1)}%
                    </div>
                </div>
                <div style="text-align: center; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 10px;">
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 5px;">Новых проектов</div>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--accent-primary);">${periodStats.currentProjects}</div>
                    <div style="font-size: 0.75rem; color: ${periodStats.projectsChange >= 0 ? '#10b981' : '#ef4444'}; margin-top: 5px;">
                        ${periodStats.projectsChange >= 0 ? '↑' : '↓'} ${Math.abs(periodStats.projectsChange).toFixed(1)}%
                    </div>
                </div>
            </div>
            <div style="height: 200px;">
                <canvas id="periodComparisonChart"></canvas>
            </div>
        </div>
    `;

    // Charts HTML
    const chartsHTML = `
        <div class="charts-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">
            
            <!-- Engineer Stats with enhanced visualization -->
            <div class="chart-container" style="background: rgba(40,40,40,0.6); padding: 20px; border-radius: 16px; border: 1px solid var(--glass-border);">
                <h3 style="margin-bottom: 20px; font-size: 1.1rem; color: var(--text-primary);">👷 Загрузка инженеров</h3>
                <div class="bar-chart">
                    ${stats.engineerStats.length > 0 ? stats.engineerStats.map((eng, i) => `
                        <div style="margin-bottom: 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; font-size: 0.9rem;">
                                <span style="display: flex; align-items: center; gap: 8px;">
                                    <span style="width: 24px; height: 24px; border-radius: 50%; background: ${getEngineerColor(i)}; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; color: white;">${eng.name.charAt(0).toUpperCase()}</span>
                                    ${eng.name}
                                </span>
                                <span style="display: flex; gap: 10px; align-items: center;">
                                    <span style="font-size: 0.8rem; color: var(--text-secondary);">${eng.count} пр.</span>
                                    <span style="font-size: 0.8rem; color: #10b981;">$${(eng.totalValue || 0).toLocaleString()}</span>
                                </span>
                            </div>
                            <div style="background: rgba(255,255,255,0.1); border-radius: 4px; height: 8px; overflow: hidden;">
                                <div style="background: ${getEngineerColor(i)}; width: ${(eng.count / stats.totalProjects * 100) || 0}%; height: 100%; border-radius: 4px; transition: width 0.5s ease;"></div>
                            </div>
                        </div>
                    `).join('') : '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">Нет данных по инженерам</div>'}
                </div>
            </div>

            <!-- Status Distribution -->
             <div class="chart-container" style="background: rgba(40,40,40,0.6); padding: 20px; border-radius: 16px; border: 1px solid var(--glass-border);">
                <h3 style="margin-bottom: 20px; font-size: 1.1rem; color: var(--text-primary);">📈 Статусы проектов</h3>
                <div class="bar-chart">
                    ${Object.entries(stats.statusCounts).map(([status, count]) => `
                        <div style="margin-bottom: 15px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.9rem;">
                                <span>${getStatusLabel(status)}</span>
                                <span style="opacity: 0.7;">${count}</span>
                            </div>
                            <div style="background: rgba(255,255,255,0.1); border-radius: 4px; height: 8px; overflow: hidden;">
                                <div style="background: ${getStatusColor(status)}; width: ${(count / stats.totalProjects * 100) || 0}%; height: 100%; border-radius: 4px;"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

        </div>
    `;

    container.innerHTML = `
        <h2 style="font-size: 1.8rem; font-weight: 700; margin-bottom: 30px; background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Аналитика</h2>
        ${exportButtonsHTML}
        ${kpiHTML}
        ${periodComparisonHTML}
        ${chartsHTML}
    `;

    // Render period comparison chart
    renderPeriodComparisonChart(periodStats);
}

// Calculate period comparison stats (current month vs last month)
function calculatePeriodComparison() {
    const transactions = state.transactions || [];
    const projects = state.projects || [];
    
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Calculate income/expense for each period
    let currentIncome = 0, currentExpense = 0;
    let lastIncome = 0, lastExpense = 0;
    let currentProjects = 0, lastProjects = 0;

    transactions.forEach(t => {
        const date = new Date(t.date);
        if (date >= currentMonthStart) {
            if (t.type === 'income') currentIncome += t.amount;
            else if (t.type === 'expense') currentExpense += t.amount;
        } else if (date >= lastMonthStart && date <= lastMonthEnd) {
            if (t.type === 'income') lastIncome += t.amount;
            else if (t.type === 'expense') lastExpense += t.amount;
        }
    });

    projects.forEach(p => {
        const date = new Date(p.createdAt);
        if (date >= currentMonthStart) currentProjects++;
        else if (date >= lastMonthStart && date <= lastMonthEnd) lastProjects++;
    });

    const calcChange = (current, last) => last === 0 ? (current > 0 ? 100 : 0) : ((current - last) / last * 100);

    return {
        currentIncome,
        currentExpense,
        currentProfit: currentIncome - currentExpense,
        currentProjects,
        lastIncome,
        lastExpense,
        lastProfit: lastIncome - lastExpense,
        lastProjects,
        incomeChange: calcChange(currentIncome, lastIncome),
        expenseChange: calcChange(currentExpense, lastExpense),
        profitChange: calcChange(currentIncome - currentExpense, lastIncome - lastExpense),
        projectsChange: calcChange(currentProjects, lastProjects)
    };
}

// Render period comparison chart
function renderPeriodComparisonChart(periodStats) {
    const ctx = document.getElementById('periodComparisonChart');
    if (!ctx) return;

    if (comparisonChartInstance) {
        comparisonChartInstance.destroy();
    }

    comparisonChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Доход', 'Расход', 'Прибыль'],
            datasets: [
                {
                    label: 'Прошлый месяц',
                    data: [periodStats.lastIncome, periodStats.lastExpense, periodStats.lastProfit],
                    backgroundColor: 'rgba(99, 102, 241, 0.6)',
                    borderColor: '#6366f1',
                    borderWidth: 1
                },
                {
                    label: 'Текущий месяц',
                    data: [periodStats.currentIncome, periodStats.currentExpense, periodStats.currentProfit],
                    backgroundColor: 'rgba(16, 185, 129, 0.6)',
                    borderColor: '#10b981',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#a0a0a0' }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#a0a0a0' }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#a0a0a0' }
                }
            }
        }
    });
}

// Export analytics data to CSV
export function exportAnalyticsToCSV() {
    const stats = calculateStats();
    const projects = state.projects || [];
    
    // Build CSV content
    let csv = '\uFEFF'; // BOM for UTF-8
    csv += 'Аналитика LineART - ' + new Date().toLocaleDateString('ru-RU') + '\n\n';
    
    // Summary
    csv += 'ОБЩАЯ СТАТИСТИКА\n';
    csv += 'Показатель,Значение\n';
    csv += `Всего проектов,${stats.totalProjects}\n`;
    csv += `В работе,${stats.inProgress}\n`;
    csv += `На проверке,${stats.onReview}\n`;
    csv += `Общая сумма,$${stats.totalValue}\n\n`;
    
    // Projects list
    csv += 'СПИСОК ПРОЕКТОВ\n';
    csv += 'Название,Клиент,Статус,Сумма,Валюта,Дата создания\n';
    projects.forEach(p => {
        csv += `"${p.name}","${p.client}","${getStatusLabel(p.status)}",${p.amount || 0},${p.currency || 'USD'},${new Date(p.createdAt).toLocaleDateString('ru-RU')}\n`;
    });
    csv += '\n';
    
    // Engineer stats
    csv += 'ЗАГРУЗКА ИНЖЕНЕРОВ\n';
    csv += 'Инженер,Количество проектов,Сумма проектов\n';
    stats.engineerStats.forEach(eng => {
        csv += `"${eng.name}",${eng.count},$${eng.totalValue || 0}\n`;
    });
    
    downloadFile(csv, 'analytics_' + new Date().toISOString().split('T')[0] + '.csv', 'text/csv;charset=utf-8');
    
    if (window.showToast) window.showToast('✅ CSV файл скачан!', 'success');
}

// Export analytics data to Excel (XLSX via HTML table)
export function exportAnalyticsToExcel() {
    const stats = calculateStats();
    const projects = state.projects || [];
    const periodStats = calculatePeriodComparison();
    
    // Build HTML table for Excel
    let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8"></head>
        <body>
        <h2>Аналитика LineART - ${new Date().toLocaleDateString('ru-RU')}</h2>
        
        <h3>Общая статистика</h3>
        <table border="1">
            <tr><th>Показатель</th><th>Значение</th></tr>
            <tr><td>Всего проектов</td><td>${stats.totalProjects}</td></tr>
            <tr><td>В работе</td><td>${stats.inProgress}</td></tr>
            <tr><td>На проверке</td><td>${stats.onReview}</td></tr>
            <tr><td>Общая сумма</td><td>$${stats.totalValue.toLocaleString()}</td></tr>
        </table>
        
        <h3>Сравнение периодов</h3>
        <table border="1">
            <tr><th>Показатель</th><th>Прошлый месяц</th><th>Текущий месяц</th><th>Изменение</th></tr>
            <tr><td>Доход</td><td>$${periodStats.lastIncome.toLocaleString()}</td><td>$${periodStats.currentIncome.toLocaleString()}</td><td>${periodStats.incomeChange.toFixed(1)}%</td></tr>
            <tr><td>Расход</td><td>$${periodStats.lastExpense.toLocaleString()}</td><td>$${periodStats.currentExpense.toLocaleString()}</td><td>${periodStats.expenseChange.toFixed(1)}%</td></tr>
            <tr><td>Прибыль</td><td>$${periodStats.lastProfit.toLocaleString()}</td><td>$${periodStats.currentProfit.toLocaleString()}</td><td>${periodStats.profitChange.toFixed(1)}%</td></tr>
            <tr><td>Новых проектов</td><td>${periodStats.lastProjects}</td><td>${periodStats.currentProjects}</td><td>${periodStats.projectsChange.toFixed(1)}%</td></tr>
        </table>
        
        <h3>Список проектов</h3>
        <table border="1">
            <tr><th>Название</th><th>Клиент</th><th>Статус</th><th>Сумма</th><th>Валюта</th><th>Дата создания</th></tr>
            ${projects.map(p => `<tr><td>${p.name}</td><td>${p.client}</td><td>${getStatusLabel(p.status)}</td><td>${p.amount || 0}</td><td>${p.currency || 'USD'}</td><td>${new Date(p.createdAt).toLocaleDateString('ru-RU')}</td></tr>`).join('')}
        </table>
        
        <h3>Загрузка инженеров</h3>
        <table border="1">
            <tr><th>Инженер</th><th>Количество проектов</th><th>Сумма проектов</th></tr>
            ${stats.engineerStats.map(eng => `<tr><td>${eng.name}</td><td>${eng.count}</td><td>$${(eng.totalValue || 0).toLocaleString()}</td></tr>`).join('')}
        </table>
        
        </body></html>
    `;
    
    downloadFile(html, 'analytics_' + new Date().toISOString().split('T')[0] + '.xls', 'application/vnd.ms-excel');
    
    if (window.showToast) window.showToast('✅ Excel файл скачан!', 'success');
}

// Export financial report
export function exportFinanceReport() {
    const transactions = state.transactions || [];
    const projects = state.projects || [];
    
    let csv = '\uFEFF'; // BOM for UTF-8
    csv += 'Финансовый отчёт LineART - ' + new Date().toLocaleDateString('ru-RU') + '\n\n';
    
    // Calculate totals
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    csv += 'ИТОГИ\n';
    csv += `Общий доход,$${income}\n`;
    csv += `Общий расход,$${expense}\n`;
    csv += `Чистая прибыль,$${income - expense}\n\n`;
    
    // All transactions
    csv += 'ВСЕ ТРАНЗАКЦИИ\n';
    csv += 'Дата,Тип,Описание,Сумма,Валюта,Проект\n';
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(t => {
        const project = projects.find(p => p.id?.toString() === t.projectId?.toString());
        csv += `${t.date},${t.type === 'income' ? 'Доход' : 'Расход'},"${t.description}",${t.amount},${t.currency || 'USD'},"${project?.name || '-'}"\n`;
    });
    
    downloadFile(csv, 'finance_report_' + new Date().toISOString().split('T')[0] + '.csv', 'text/csv;charset=utf-8');
    
    if (window.showToast) window.showToast('✅ Финансовый отчёт скачан!', 'success');
}

// Helper: Download file
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Helper: Get engineer color
function getEngineerColor(index) {
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    return colors[index % colors.length];
}

function calculateStats() {
    const projects = state.projects || [];
    const totalProjects = projects.length;
    let totalValue = 0;
    const statusCounts = {
        'in-progress': 0,
        'on-review': 0,
        'correction': 0,
        'accepted': 0,
        'archive': 0
    };
    const engineerCounts = {};
    const engineerValues = {};

    projects.forEach(p => {
        // Value
        if (p.amount) totalValue += p.amount;

        // Status
        if (statusCounts.hasOwnProperty(p.status)) {
            statusCounts[p.status]++;
        } else {
            statusCounts['in-progress'] = (statusCounts['in-progress'] || 0) + 1; 
        }

        // Engineers (Sections)
        if (p.sections) {
            const engineersInProject = new Set();
            p.sections.forEach(s => {
                if (s.engineer) engineersInProject.add(s.engineer);
            });
            
            // Distribute project value among engineers
            const valuePerEngineer = engineersInProject.size > 0 ? (p.amount || 0) / engineersInProject.size : 0;
            
            engineersInProject.forEach(eng => {
                engineerCounts[eng] = (engineerCounts[eng] || 0) + 1;
                engineerValues[eng] = (engineerValues[eng] || 0) + valuePerEngineer;
            });
        }
    });

    // Format engineer stats for sorting with values
    const engineerStats = Object.entries(engineerCounts)
        .map(([name, count]) => ({ 
            name, 
            count, 
            totalValue: Math.round(engineerValues[name] || 0) 
        }))
        .sort((a, b) => b.count - a.count);

    return {
        totalProjects,
        totalValue,
        statusCounts,
        engineerStats,
        inProgress: statusCounts['in-progress'] + statusCounts['correction'],
        onReview: statusCounts['on-review']
    };
}

// Expose to window for onclick handlers
window.exportAnalyticsToCSV = exportAnalyticsToCSV;
window.exportAnalyticsToExcel = exportAnalyticsToExcel;
window.exportFinanceReport = exportFinanceReport;

function getStatusLabel(status) {
    const labels = {
        'in-progress': 'В процессе',
        'on-review': 'На проверке',
        'correction': 'На правку',
        'accepted': 'Принято',
        'archive': 'Архив'
    };
    return labels[status] || status;
}

function getStatusColor(status) {
    const colors = {
        'in-progress': 'var(--accent-primary)',
        'on-review': '#f59e0b',
        'correction': '#ef4444',
        'accepted': '#10b981',
        'archive': '#6b7280'
    };
    return colors[status] || '#ccc';
}
