
import { state, loadData } from './state.js';
import { openModal, closeModal, showToast, formatMoney } from './utils.js';
import { initDashboardMap, toggleDashboardMapFullscreen, MapManager, toggleProjectMapFullscreen } from './mapManager.js';
import {
    renderProjects, setupProjectListeners, loadProjectsFromServer,
    openProjectDetails, closeProjectDetails, deleteSection, deleteFile, downloadFile, deletePhoto,
    deleteAdditionalPerson, handleSectionFileUpload, deleteCurrentProject,
    handleDragOver, handleDragLeave, handleSectionDrop, handleGalleryDrop, handleGalleryFileUpload,
    openNewProjectModal, openNewSectionModal, openAdditionalPersonModal, openHistoryModal,
    openStatusModal, changeStatus, editCurrentProject, renderProjectDetailsSafe,
    completeFileUpload, toggleFileComment, previewOrDownload, calculateProjectProgress,
    switchProjectView, renderKanban, handleKanbanDragStart, handleKanbanDragEnd,
    addProjectComment, renderComments, addProjectHistory
} from './projects.js';
import { renderFinances, renderFinanceChart, setupFinanceListeners, migrateAdvancesToTransactions, calculateTotals } from './finance.js';
import {
    renderClients, renderEmployees, setupPersonListeners, restoreRegistryFromProjects, openNewEmployeeModal,
    openClientDetailsPage, closeClientDetailsPage, openEngineerDetailsPage, closeEngineerDetailsPage
} from './persons.js';
import { SearchManager } from './search.js';
import { renderAnalytics } from './analytics.js';
import { exportAllProjects, openImportDialog } from './backup.js';
import { openTelegramSettings, saveTelegramSettings, sendTestNotification, refreshTelegramChats, notifyStatusChange, notifyNewFile, notifyNewComment } from './telegram.js';
import { renderCalendar, prevPeriod, nextPeriod, goToToday, showDayDetails } from './calendar.js';
import { openDocumentMenu, showProjectQRCode, copyProjectLink, downloadQRCode, generateContract, generateInvoice, generateAct } from './documents.js';
import { openAutoRemindersSettings, saveAutoRemindersConfig, sendAllReminders } from './autoReminders.js';
import { archiveProject } from './projects.js';



// --- Mobile Menu Toggle ---
function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}
window.toggleMobileMenu = toggleMobileMenu;

// Close menu when clicking a nav item (on mobile)
document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar && sidebar.classList.contains('active')) {
                    toggleMobileMenu();
                }
            }
        });
    });
});

// --- Telegram Linking ---
function openLinkTelegramModal() {
    openModal('link-telegram-modal');
}

async function submitTelegramCode() {
    const code = document.getElementById('telegram-link-code').value;
    if (!code) return showToast('Введите код', 'error');

    const username = localStorage.getItem('userName'); // Assuming we store username locally

    try {
        const res = await fetch('/api/link-telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, code })
        });
        const data = await res.json();

        if (data.success) {
            showToast('✅ Telegram успешно привязан!', 'success');
            closeModal('link-telegram-modal');
        } else {
            showToast('❌ Ошибка: ' + data.message, 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('❌ Ошибка сети', 'error');
    }
}
window.openLinkTelegramModal = openLinkTelegramModal;
window.submitTelegramCode = submitTelegramCode;


// --- Window Bindings for Utilities ---
window.openModal = openModal;
window.closeModal = closeModal;
window.showToast = showToast;
window.formatMoney = formatMoney;

// --- Window Bindings for Map ---
window.toggleDashboardMapFullscreen = toggleDashboardMapFullscreen;
window.toggleProjectMapFullscreen = toggleProjectMapFullscreen;
window.MapManager = MapManager; // Expose for onclick handlers in HTML

// --- Window Bindings for Projects (for inline HTML onclicks) ---
window.openProjectDetails = openProjectDetails;
window.closeProjectDetails = closeProjectDetails;
window.deleteSection = deleteSection;
window.deleteFile = deleteFile;
window.downloadFile = downloadFile;
window.deletePhoto = deletePhoto;
window.deleteAdditionalPerson = deleteAdditionalPerson;
window.handleSectionFileUpload = handleSectionFileUpload;
window.completeFileUpload = completeFileUpload;
window.toggleFileComment = toggleFileComment;
window.previewOrDownload = previewOrDownload;
window.deleteCurrentProject = deleteCurrentProject;
window.editCurrentProject = editCurrentProject;
window.handleDragOver = handleDragOver;
window.handleDragLeave = handleDragLeave;
window.handleSectionDrop = handleSectionDrop;
window.handleGalleryDrop = handleGalleryDrop;
window.handleGalleryFileUpload = handleGalleryFileUpload;
window.openNewProjectModal = openNewProjectModal;
window.openNewSectionModal = openNewSectionModal;
window.openAdditionalPersonModal = openAdditionalPersonModal;
window.openHistoryModal = openHistoryModal;
window.openNewEmployeeModal = openNewEmployeeModal;
window.openStatusModal = openStatusModal;
window.changeStatus = changeStatus;
window.switchProjectView = switchProjectView;
window.renderKanban = renderKanban;
window.handleKanbanDragStart = handleKanbanDragStart;
window.handleKanbanDragEnd = handleKanbanDragEnd;
window.addProjectComment = addProjectComment;
window.renderComments = renderComments;
window.addProjectHistory = addProjectHistory;
window.handleKanbanDragStart = handleKanbanDragStart;
window.handleKanbanDragStart = handleKanbanDragStart;
window.handleKanbanDragEnd = handleKanbanDragEnd;
window.renderProjectDetailsSafe = renderProjectDetailsSafe;
window.archiveProject = archiveProject;

// --- Window Bindings for Documents ---
window.openDocumentMenu = openDocumentMenu;
window.showProjectQRCode = showProjectQRCode;
window.copyProjectLink = copyProjectLink;
window.downloadQRCode = downloadQRCode;
window.generateContract = generateContract;
window.generateInvoice = generateInvoice;
window.generateAct = generateAct;

// --- Window Bindings for AutoReminders ---
window.openAutoRemindersSettings = openAutoRemindersSettings;
window.saveAutoRemindersConfig = saveAutoRemindersConfig;
window.sendAllReminders = sendAllReminders;

// --- Window Bindings for Persons ---
window.openClientDetailsPage = openClientDetailsPage;
window.closeClientDetailsPage = closeClientDetailsPage;
window.openEngineerDetailsPage = openEngineerDetailsPage;
window.closeEngineerDetailsPage = closeEngineerDetailsPage;

// --- Access Control ---
function checkUserAccess() {
    const role = localStorage.getItem('userRole');
    if (role === 'engineer') {
        // Hide Analytics button
        const analyticsBtn = document.querySelector('.nav-item[data-tab="analytics"]');
        if (analyticsBtn) analyticsBtn.style.display = 'none';

        // Hide Gantt button
        const ganttBtn = document.querySelector('.nav-item[onclick="openGanttModal()"]');
        if (ganttBtn) ganttBtn.style.display = 'none';

        // Hide Finances button (usually engineers don't need this either)
        const financesBtn = document.querySelector('.nav-item[data-tab="finances"]');
        if (financesBtn) financesBtn.style.display = 'none';

        // Override Gantt modal opening
        window.openGanttModal = function () {
            showToast('⛔ Доступ к диаграмме Gantt ограничен для инженеров', 'error');
        };

        // Redirect if on restricted tab
        const currentTab = document.querySelector('.nav-item.active');
        if (currentTab && (currentTab.dataset.tab === 'analytics' || currentTab.dataset.tab === 'finances')) {
            switchTab('dashboard');
        }
    }
}

// Check access on load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(checkUserAccess, 200);
});

// Re-check on dynamic updates (optional, but good for SPA)
const originalSwitchTab = window.switchTab; // Ensure we capture it if it exists globally
// Note: switchTab might be defined in index.html or another script, we need to be careful not to break it.
// Since switchTab invokes UI changes, we rely on the specific tab clicks being hidden.


// --- Main Render Function ---
function render() {
    renderProjects();
    renderFinances();
    renderClients();
    renderEmployees();
    renderDashboard();
}
window.render = render; // Expose global render

// --- Dashboard Logic ---
// --- Dashboard Logic ---
function renderDashboard() {
    // Active Projects
    const activeProjects = state.projects.filter(p => p.status === 'in-progress' || p.status === 'sketch').length;
    const activeEl = document.getElementById('stat-active-projects');
    if (activeEl) activeEl.innerText = activeProjects;

    // Finances (USD & UZS)
    const incomeUSD = state.transactions.filter(t => t.type === 'income' && (__getCurrency(t) === 'USD')).reduce((sum, t) => sum + t.amount, 0);
    const incomeUZS = state.transactions.filter(t => t.type === 'income' && (__getCurrency(t) === 'UZS')).reduce((sum, t) => sum + t.amount, 0);

    const expenseUSD = state.transactions.filter(t => t.type === 'expense' && (__getCurrency(t) === 'USD')).reduce((sum, t) => sum + t.amount, 0);
    const expenseUZS = state.transactions.filter(t => t.type === 'expense' && (__getCurrency(t) === 'UZS')).reduce((sum, t) => sum + t.amount, 0);

    const profitUSD = incomeUSD - expenseUSD;
    const profitUZS = incomeUZS - expenseUZS;

    // Revenue
    const revUsdEl = document.getElementById('stat-revenue-usd');
    if (revUsdEl) revUsdEl.innerText = formatMoney(incomeUSD, 'USD');

    const revUzsEl = document.getElementById('stat-revenue-uzs');
    if (revUzsEl) revUzsEl.innerText = formatMoney(incomeUZS, 'UZS');

    // Profit
    const profitUsdEl = document.getElementById('stat-profit-usd');
    if (profitUsdEl) profitUsdEl.innerText = formatMoney(profitUSD, 'USD');

    const profitUzsEl = document.getElementById('stat-profit-uzs');
    if (profitUzsEl) profitUzsEl.innerText = formatMoney(profitUZS, 'UZS');

    // Recent Activity
    const activityList = document.getElementById('recent-activity');
    if (activityList) {
        // Collect activities from project history and transactions
        let activities = [];

        state.projects.forEach(p => {
            if (p.history) {
                p.history.forEach(h => {
                    activities.push({
                        date: new Date(h.date),
                        text: h.text, // "Project Name: Action"
                        type: 'history',
                        projectName: p.name
                    });
                });
            }
            if (p.createdAt) { // Add creation event if not in history
                activities.push({
                    date: new Date(p.createdAt),
                    text: `Создан проект: ${p.name}`,
                    type: 'create',
                    projectName: p.name
                });
            }
        });

        state.transactions.forEach(t => {
            activities.push({
                date: new Date(t.date),
                text: `${t.type === 'income' ? 'Доход' : 'Расход'}: ${t.description} (${formatMoney(t.amount, t.currency || 'USD')})`,
                type: 'transaction'
            });
        });

        //Sort desc
        activities.sort((a, b) => b.date - a.date);

        activityList.innerHTML = activities.slice(0, 10).map(a => `
            <li class="activity-item">
                <div class="activity-text">${a.text}</div>
                <div class="activity-date">${a.date.toLocaleDateString('ru-RU')}</div>
            </li>
        `).join('');
    }

    // Render financial chart
    setTimeout(updateDashboardChart, 100);
}
window.renderDashboard = renderDashboard;

// Dashboard Finance Chart
let dashboardFinanceChart = null;

function updateDashboardChart() {
    const canvas = document.getElementById('dashboard-finance-chart');
    if (!canvas) return;

    const periodSelect = document.getElementById('chart-period');
    const months = periodSelect ? parseInt(periodSelect.value) : 6;

    // Get month labels and data
    const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const labels = [];
    const incomeData = [];
    const expenseData = [];
    const profitData = [];

    const today = new Date();

    for (let i = months - 1; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        labels.push(monthNames[date.getMonth()] + ' ' + date.getFullYear().toString().slice(-2));

        // Calculate income/expense for this month from transactions
        let monthIncome = 0;
        let monthExpense = 0;

        state.transactions.forEach(t => {
            if (!t.date) return;
            const tDate = new Date(t.date);
            const tMonthKey = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;

            if (tMonthKey === monthKey) {
                // Convert to USD for consistent display (rough conversion)
                let amount = t.amount || 0;
                if (t.currency === 'UZS') {
                    amount = amount / 12500; // Approximate conversion
                }

                if (t.type === 'income') {
                    monthIncome += amount;
                } else if (t.type === 'expense') {
                    monthExpense += amount;
                }
            }
        });

        incomeData.push(Math.round(monthIncome));
        expenseData.push(Math.round(monthExpense));
        profitData.push(Math.round(monthIncome - monthExpense));
    }

    // Destroy existing chart
    if (dashboardFinanceChart) {
        dashboardFinanceChart.destroy();
    }

    const ctx = canvas.getContext('2d');

    // Create gradients
    const incomeGradient = ctx.createLinearGradient(0, 0, 0, 350);
    incomeGradient.addColorStop(0, 'rgba(16, 185, 129, 0.8)');
    incomeGradient.addColorStop(1, 'rgba(16, 185, 129, 0.2)');

    const expenseGradient = ctx.createLinearGradient(0, 0, 0, 350);
    expenseGradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
    expenseGradient.addColorStop(1, 'rgba(239, 68, 68, 0.2)');

    dashboardFinanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Доходы',
                    data: incomeData,
                    backgroundColor: incomeGradient,
                    borderColor: '#10b981',
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false
                },
                {
                    label: 'Расходы',
                    data: expenseData,
                    backgroundColor: expenseGradient,
                    borderColor: '#ef4444',
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false
                },
                {
                    label: 'Прибыль',
                    data: profitData,
                    type: 'line',
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(30, 30, 30, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#ccc',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function (context) {
                            return context.dataset.label + ': $' + context.raw.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: 'rgba(255,255,255,0.6)',
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255,255,255,0.05)'
                    },
                    ticks: {
                        color: 'rgba(255,255,255,0.6)',
                        font: {
                            size: 11
                        },
                        callback: function (value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
}

window.updateDashboardChart = updateDashboardChart;

function __getCurrency(t) {
    return t.currency || 'USD';
}

// --- File Comment Form Handler ---
function setupFileCommentFormListener() {
    const form = document.getElementById('file-comment-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const comment = document.getElementById('file-comment-text').value.trim();
            completeFileUpload(comment);
            closeModal('file-comment-modal');
        });
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('App initializing...');
    checkAuth(); // Check auth and apply permissions
    loadData(); // Load local storage

    // Migrate old data if needed
    migrateAdvancesToTransactions();

    // Setup Listeners
    setupProjectListeners();
    setupFinanceListeners();
    setupPersonListeners();
    setupFileCommentFormListener();

    // Init Map (Dashboard map is lightweight)
    initDashboardMap();

    // Render Initial State
    render();

    // Setup Navigation Tabs
    setupNavigation();



    // Load from server (sync)
    loadProjectsFromServer(() => {
        restoreRegistryFromProjects();
        migrateAdvancesToTransactions();
        render();
        // Setup History Handling after initial load
        setupHistoryHandling();
        // Init Global Search
        window.searchManager = new SearchManager();
        // Check deadlines after loading
        checkDeadlines();
    });
});

// Check for upcoming and overdue deadlines
function checkDeadlines() {
    const today = new Date().toISOString().split('T')[0];
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let overdueCount = 0;
    let upcomingCount = 0;

    state.projects.forEach(project => {
        if (!project.sections) return;

        project.sections.forEach(section => {
            if (!section.dueDate) return;
            if (section.status === 'completed' || section.status === 'delivered') return;

            if (section.dueDate < today) {
                overdueCount++;
            } else if (section.dueDate <= threeDaysFromNow) {
                upcomingCount++;
            }
        });
    });

    // Show notifications
    if (overdueCount > 0) {
        setTimeout(() => {
            showToast(`⚠️ ${overdueCount} ${overdueCount === 1 ? 'раздел просрочен' : 'разделов просрочено'}!`, 'error');
        }, 1000);
    }

    if (upcomingCount > 0) {
        setTimeout(() => {
            showToast(`📅 ${upcomingCount} ${upcomingCount === 1 ? 'дедлайн' : 'дедлайнов'} в ближайшие 3 дня`, 'warning');
        }, overdueCount > 0 ? 2500 : 1000);
    }
}

function checkAuth() {
    const token = localStorage.getItem('authToken');
    const role = localStorage.getItem('userRole') || 'admin';
    const username = localStorage.getItem('userName');

    if (!token) {
        window.location.replace('login.html');
        return;
    }

    // Update Profile UI
    const nameEl = document.querySelector('.user-info .name');
    const roleEl = document.querySelector('.user-info .role');

    if (nameEl) nameEl.innerText = username || 'Пользователь';
    if (roleEl) roleEl.innerText = role === 'admin' ? 'Администратор' : 'Инженер';

    applyRolePermissions(role);
}

function applyRolePermissions(role) {
    if (role === 'engineer') {
        document.body.classList.add('role-engineer');
        document.body.classList.remove('role-admin');

        // Hide Finances and Employees tabs
        const financeTab = document.querySelector('.nav-item[data-tab="finances"]');
        if (financeTab) financeTab.style.display = 'none';

        const employeesTab = document.querySelector('.nav-item[data-tab="employees"]');
        if (employeesTab) employeesTab.style.display = 'none';

        const clientsTab = document.querySelector('.nav-item[data-tab="clients"]');
        if (clientsTab) clientsTab.style.display = 'none';

        const dashboardTab = document.querySelector('.nav-item[data-tab="dashboard"]');
        if (dashboardTab) dashboardTab.style.display = 'none';

        // Additional restrictions can be handled via CSS using .role-engineer
    } else {
        document.body.classList.add('role-admin');
        document.body.classList.remove('role-engineer');
    }
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            // Push state on navigation click
            history.pushState({ view: tabId }, '', `?view=${tabId}`);
            handleLocationChange();
        });
    });
}

function handleLocationChange() {
    const urlParams = new URLSearchParams(window.location.search);
    let view = urlParams.get('view') || 'dashboard';
    const role = localStorage.getItem('userRole');

    // Redirect engineers from dashboard/forbidden pages to projects
    if (role === 'engineer' && (view === 'dashboard' || view === 'finances' || view === 'employees' || view === 'clients')) {
        view = 'projects';
        history.replaceState({ view: 'projects' }, '', '?view=projects');
    }

    // Update Tab UI
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === view);
    });

    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    // Show selected view
    const activeView = document.getElementById(`${view}-view`);
    if (activeView) activeView.classList.add('active');

    // Specific Render Calls
    if (view === 'dashboard') renderDashboard();
    if (view === 'projects') renderProjects();
    if (view === 'clients') renderClients();
    if (view === 'finances') renderFinances();
    if (view === 'employees') renderEmployees();
    if (view === 'analytics') renderAnalytics();
    if (view === 'calendar') renderCalendar();
    if (view === 'project-details') {
        const id = urlParams.get('id');
        if (id && window.openProjectDetails) {
            window.openProjectDetails(id, false);
        }
    }

    // Update Window Title (Fallback)
    document.title = 'LineART';
}

function setupHistoryHandling() {
    window.addEventListener('popstate', handleLocationChange);
    // Handle initial load
    handleLocationChange();
}
