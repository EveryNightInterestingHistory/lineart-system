// Client Rating & Analytics Module
// =================================

import { state } from './state.js';
import { formatMoney } from './utils.js';

// Calculate client statistics
export function getClientStats() {
    const clientStats = {};
    
    state.projects.forEach(project => {
        const clientName = project.client || 'Неизвестный';
        
        if (!clientStats[clientName]) {
            clientStats[clientName] = {
                name: clientName,
                projectCount: 0,
                totalAmount: 0,
                completedProjects: 0,
                activeProjects: 0,
                currencies: {}
            };
        }
        
        clientStats[clientName].projectCount++;
        
        const currency = project.currency || 'USD';
        const amount = project.amount || 0;
        
        if (!clientStats[clientName].currencies[currency]) {
            clientStats[clientName].currencies[currency] = 0;
        }
        clientStats[clientName].currencies[currency] += amount;
        clientStats[clientName].totalAmount += amount;
        
        if (project.status === 'completed' || project.status === 'delivered' || project.status === 'accepted') {
            clientStats[clientName].completedProjects++;
        } else if (project.status !== 'archive') {
            clientStats[clientName].activeProjects++;
        }
    });
    
    // Convert to array and sort by total amount
    return Object.values(clientStats).sort((a, b) => b.totalAmount - a.totalAmount);
}

// Render client rating cards
export function renderClientRating() {
    const clients = getClientStats();
    const topClients = clients.slice(0, 10);
    
    if (topClients.length === 0) {
        return '<p style="color: var(--text-secondary); text-align: center;">Нет данных о клиентах</p>';
    }
    
    const maxAmount = topClients[0]?.totalAmount || 1;
    
    return `
        <div style="display: flex; flex-direction: column; gap: 12px;">
            ${topClients.map((client, index) => {
                const percent = (client.totalAmount / maxAmount) * 100;
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                
                // Format amounts by currency
                const amountStrings = Object.entries(client.currencies)
                    .map(([cur, amt]) => formatMoney(amt, cur))
                    .join(' + ');
                
                return `
                    <div style="background: rgba(255,255,255,0.03); padding: 12px 15px; border-radius: 10px; border: 1px solid var(--glass-border);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 1.2rem;">${medal}</span>
                                <div>
                                    <div style="font-weight: 600;">${client.name}</div>
                                    <div style="font-size: 0.8rem; color: var(--text-secondary);">
                                        ${client.projectCount} проект(ов) • ${client.activeProjects} активных
                                    </div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-weight: 700; color: var(--accent-success);">${amountStrings}</div>
                            </div>
                        </div>
                        <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                            <div style="height: 100%; width: ${percent}%; background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary)); border-radius: 3px;"></div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Calculate monthly income data
export function getMonthlyIncomeData(months = 6) {
    const data = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        let income = 0;
        let expense = 0;
        
        // Sum transactions in this month
        (state.transactions || []).forEach(t => {
            const txDate = new Date(t.date);
            if (txDate >= month && txDate <= monthEnd) {
                if (t.type === 'income') {
                    income += t.amount || 0;
                } else if (t.type === 'expense') {
                    expense += t.amount || 0;
                }
            }
        });
        
        data.push({
            month: month.toLocaleDateString('ru-RU', { month: 'short' }),
            year: month.getFullYear(),
            income,
            expense,
            profit: income - expense
        });
    }
    
    return data;
}

// Render monthly income chart
export function renderMonthlyIncomeChart(canvasId = 'monthly-income-chart') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const data = getMonthlyIncomeData(6);
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if exists
    if (window.monthlyIncomeChartInstance) {
        window.monthlyIncomeChartInstance.destroy();
    }
    
    window.monthlyIncomeChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.month),
            datasets: [
                {
                    label: 'Доход',
                    data: data.map(d => d.income),
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderRadius: 6
                },
                {
                    label: 'Расход',
                    data: data.map(d => d.expense),
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#a0a0a0' }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#a0a0a0' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                y: {
                    ticks: { color: '#a0a0a0' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
            }
        }
    });
}

// Open client rating modal
export function openClientRatingModal() {
    let modal = document.getElementById('client-rating-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'client-rating-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <span class="close" onclick="closeModal('client-rating-modal')">&times;</span>
            <h2>🏆 Рейтинг клиентов</h2>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">Топ-10 клиентов по сумме заказов</p>
            
            ${renderClientRating()}
        </div>
    `;
    
    modal.style.display = 'flex';
}

// Expose to window
window.openClientRatingModal = openClientRatingModal;
window.renderClientRating = renderClientRating;
window.renderMonthlyIncomeChart = renderMonthlyIncomeChart;
window.getClientStats = getClientStats;
