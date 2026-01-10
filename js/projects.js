
import { state, currentProjectId, setCurrentProjectId, saveData, API_URL, currentStatusTarget, setCurrentStatusTarget } from './state.js';
import { MapManager } from './mapManager.js';
import { renderFinanceChart, toggleTransactionsVisibility } from './finance.js';
import { formatMoney, getStatusName, showToast, openModal, closeModal, populateSelect } from './utils.js';
import { notifyStatusChange, notifyNewFile, notifyNewComment, notifyNewProject } from './telegram.js';

// --- Projects Module ---

export function syncProject(project) {
    if (!project) return;
    fetch(`${API_URL}/save-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
    })
        .then(res => res.json())
        .then(data => {
            if (data.success && !project.folderName) {
                project.folderName = data.folderName;
                saveData();
            }
            console.log('Project synced:', project.name);
        })
        .catch(console.error);
}

export function loadProjectsFromServer(renderCallback) {
    fetch(API_URL + '/projects')
        .then(res => res.json())
        .then(serverProjects => {
            if (serverProjects && serverProjects.length > 0) {
                state.projects = serverProjects.map((p, index) => ({
                    ...p,
                    name: p.name || p.project,
                    id: p.id || (Date.now() + index),
                    sections: p.sections || [],
                    photos: p.photos || []
                }));
                saveData();
                // migrateAdvancesToTransactions is in finance.js, but circular dep if we import it.
                // We'll trust app.js to call migration or let it be.
                if (renderCallback) renderCallback();
            }
        })
        .catch(err => console.error('Failed to load projects from server:', err));
}

// Calculate project progress based on section statuses
export function calculateProjectProgress(project) {
    if (!project.sections || project.sections.length === 0) {
        // If no sections, use project status
        const statusProgress = {
            'in-progress': 25,
            'on-review': 50,
            'correction': 40,
            'accepted': 100,
            // Legacy
            'sketch': 25,
            'completed': 100,
            'delivered': 100
        };
        return statusProgress[project.status] || 0;
    }

    const sectionWeights = {
        'in-progress': 25,
        'on-review': 60,
        'correction': 40,
        'accepted': 100,
        // Legacy statuses
        'sketch': 25,
        'checked': 100,
        'completed': 100,
        'delivered': 100
    };

    let totalProgress = 0;
    project.sections.forEach(section => {
        const status = section.status || 'in-progress';
        totalProgress += sectionWeights[status] || 0;
    });

    return Math.round(totalProgress / project.sections.length);
}

export function renderProjects() {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;

    const searchTerm = document.getElementById('project-search')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('project-filter-status')?.value || 'all';
    const sortBy = document.getElementById('project-sort')?.value || 'date-desc';

    // --- ACCESS CONTROL: Restrict Engineer Visibility ---
    const userRole = localStorage.getItem('userRole');
    const userName = localStorage.getItem('userName');
    let visibleProjects = state.projects;

    if (userRole === 'engineer') {
        visibleProjects = state.projects.filter(project => {
            // Engineer sees project if they are assigned to ANY section
            return project.sections && project.sections.some(section => section.engineer === userName);
        });
    }
    // ----------------------------------------------------

    let filteredProjects = visibleProjects.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm) ||
            p.client.toLowerCase().includes(searchTerm) ||
            (p.address && p.address.toLowerCase().includes(searchTerm));

        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Sort projects
    const statusOrder = ['in-progress', 'on-review', 'correction', 'accepted', 'sketch', 'completed', 'delivered'];

    filteredProjects.sort((a, b) => {
        switch (sortBy) {
            case 'date-desc':
                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            case 'date-asc':
                return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
            case 'progress-desc':
                return calculateProjectProgress(b) - calculateProjectProgress(a);
            case 'progress-asc':
                return calculateProjectProgress(a) - calculateProjectProgress(b);
            case 'status':
                return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
            case 'name':
                return (a.name || '').localeCompare(b.name || '', 'ru');
            default:
                return 0;
        }
    });

    if (filteredProjects.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 20px;">Проекты не найдены</div>';
        return;
    }

    grid.innerHTML = filteredProjects.map(p => {
        const progress = calculateProjectProgress(p);
        const progressColor = progress < 30 ? 'var(--accent-danger)' :
            progress < 70 ? 'var(--accent-warning)' : 'var(--accent-success)';

        return `<div class="project-card" onclick="openProjectDetails('${p.id}')">
            <div class="project-header">
                <h3>${p.name}</h3>
                <span class="status-badge status-${p.status}">${getStatusName(p.status)}</span>
            </div>
            <p style="color: var(--text-secondary); margin-bottom: 5px; font-size: 0.9rem;">📍 ${p.address || 'Адрес не указан'}</p>
            <p style="color: var(--text-secondary); margin-bottom: 10px; font-size: 0.9rem;">👤 ${p.client}</p>
            
            <div class="progress-bar-container" style="margin: 10px 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.75rem;">
                    <span style="color: var(--text-secondary);">Прогресс</span>
                    <span style="color: ${progressColor}; font-weight: 600;">${progress}%</span>
                </div>
                <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                    <div style="width: ${progress}%; height: 100%; background: ${progressColor}; transition: width 0.3s ease;"></div>
                </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--glass-border);">
                <span style="font-weight: 600; color: var(--accent-primary);">${formatMoney(p.amount, p.currency)}</span>
                <span style="font-size: 0.85rem;">📅 ${new Date(p.createdAt).toLocaleDateString('ru-RU')}</span>
            </div>
        </div>`;
    }).join('');
}

// Current view mode
let currentViewMode = 'grid';

// Switch between grid and kanban views
export function switchProjectView(mode) {
    currentViewMode = mode;
    const gridView = document.getElementById('projects-grid');
    const kanbanView = document.getElementById('kanban-board');
    const gridBtn = document.getElementById('grid-view-btn');
    const kanbanBtn = document.getElementById('kanban-view-btn');

    if (mode === 'grid') {
        gridView.style.display = 'grid';
        kanbanView.style.display = 'none';
        gridBtn.classList.add('active');
        kanbanBtn.classList.remove('active');
        renderProjects();
    } else {
        gridView.style.display = 'none';
        kanbanView.style.display = 'grid';
        gridBtn.classList.remove('active');
        kanbanBtn.classList.add('active');
        renderKanban();
    }

    // Save preference
    localStorage.setItem('projectViewMode', mode);
}

// Render Kanban board
export function renderKanban() {
    const statuses = ['in-progress', 'on-review', 'correction', 'accepted'];
    const searchTerm = document.getElementById('project-search')?.value.toLowerCase() || '';

    // Filter projects
    let filteredProjects = state.projects.filter(p => {
        if (searchTerm && !p.name.toLowerCase().includes(searchTerm) && !p.client?.toLowerCase().includes(searchTerm)) {
            return false;
        }
        return true;
    });

    // Group projects by status
    const projectsByStatus = {};
    statuses.forEach(status => {
        projectsByStatus[status] = filteredProjects.filter(p => {
            // Map old statuses to new ones
            let projectStatus = p.status;
            if (projectStatus === 'sketch') projectStatus = 'in-progress';
            if (projectStatus === 'completed' || projectStatus === 'delivered' || projectStatus === 'checked') projectStatus = 'accepted';
            return projectStatus === status;
        });
    });

    // Render each column
    statuses.forEach(status => {
        const container = document.getElementById(`kanban-cards-${status}`);
        const countEl = document.getElementById(`kanban-count-${status}`);

        if (!container) return;

        const projects = projectsByStatus[status];
        countEl.textContent = projects.length;

        container.innerHTML = projects.map(p => {
            const progress = calculateProjectProgress(p);
            const progressColor = progress < 30 ? 'var(--accent-danger)' : progress < 70 ? 'var(--accent-warning)' : 'var(--accent-success)';

            return `
                <div class="kanban-card" 
                     draggable="true" 
                     data-project-id="${p.id}"
                     ondragstart="window.handleKanbanDragStart(event, '${p.id}')"
                     ondragend="window.handleKanbanDragEnd(event)"
                     onclick="openProjectDetails('${p.id}')">
                    <div class="kanban-card-title">${p.name}</div>
                    <div class="kanban-card-client">👤 ${p.client || 'Нет клиента'}</div>
                    <div class="kanban-card-footer">
                        <span>${formatMoney(p.amount, p.currency)}</span>
                        <div class="kanban-card-progress">
                            <div class="kanban-progress-bar">
                                <div class="kanban-progress-fill" style="width: ${progress}%; background: ${progressColor};"></div>
                            </div>
                            <span>${progress}%</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('') || '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">Нет проектов</div>';
    });

    // Setup drop zones
    setupKanbanDropZones();
}

// Setup Kanban drop zones
function setupKanbanDropZones() {
    const columns = document.querySelectorAll('.kanban-column');

    columns.forEach(column => {
        column.ondragover = (e) => {
            e.preventDefault();
            column.classList.add('drag-over');
        };

        column.ondragleave = (e) => {
            column.classList.remove('drag-over');
        };

        column.ondrop = (e) => {
            e.preventDefault();
            column.classList.remove('drag-over');

            const projectId = e.dataTransfer.getData('text/plain');
            const newStatus = column.dataset.status;

            if (projectId && newStatus) {
                updateProjectStatus(projectId, newStatus);
            }
        };
    });
}

// Handle kanban drag start
export function handleKanbanDragStart(e, projectId) {
    e.dataTransfer.setData('text/plain', projectId);
    e.target.classList.add('dragging');
}

// Handle kanban drag end
export function handleKanbanDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('drag-over'));
}

// Update project status (for kanban drag & drop)
async function updateProjectStatus(projectId, newStatus) {
    const project = state.projects.find(p => p.id.toString() === projectId.toString());
    if (!project) return;

    const oldStatus = project.status;
    project.status = newStatus;

    // Add to history
    if (!project.history) project.history = [];
    project.history.push({
        date: new Date().toISOString(),
        action: `Статус изменен: ${getStatusName(oldStatus)} → ${getStatusName(newStatus)}`,
        user: localStorage.getItem('userName') || 'Система'
    });

    // Save to server
    try {
        saveData();
        syncProject(project);

        showToast(`Статус изменён на "${getStatusName(newStatus)}"`, 'success');
        renderKanban();
        renderProjects();
    } catch (err) {
        console.error('Error saving:', err);
        showToast('Ошибка сохранения', 'error');
    }
}

export function renderProjectDetailsSafe(project) {
    console.log('renderProjectDetailsSafe started', project);
    if (!project) {
        console.error('renderProjectDetailsSafe called with null project');
        return;
    }

    try {

        // Basic Info
        document.getElementById('detail-project-name').innerText = project.name;

        // Correction Alert
        const correctionAlert = document.getElementById('detail-correction-alert');
        if (correctionAlert) {
            if (project.status === 'correction' && project.lastCorrectionComment) {
                correctionAlert.style.display = 'block';
                correctionAlert.innerHTML = `<strong>⚠️ Требуются правки:</strong> ${project.lastCorrectionComment}`;
            } else {
                correctionAlert.style.display = 'none';
            }
        }
        document.getElementById('detail-project-address').innerText = project.address || 'Адрес не указан';

        // Description
        const descriptionEl = document.getElementById('detail-project-description');
        if (descriptionEl) {
            const desc = project.description ? project.description.trim() : '';
            descriptionEl.innerText = desc;
            descriptionEl.style.display = desc.length > 0 ? 'block' : 'none';
        }

        const clientEl = document.getElementById('detail-project-client');
        clientEl.innerText = project.client;
        clientEl.className = 'clickable-client';
        clientEl.onclick = () => {
            if (window.openClientDetailsPage) window.openClientDetailsPage(state.clients.find(c => c.name === project.client)?.id);
            else console.warn("window.openClientDetailsPage not found");
        };

        const statusEl = document.getElementById('detail-project-status');
        statusEl.className = `status-badge status-${project.status}`;
        statusEl.innerText = getStatusName(project.status);
        statusEl.style.cursor = 'pointer';
        statusEl.onclick = () => {
            if (window.openStatusModal) window.openStatusModal('project');
        };
        document.getElementById('detail-project-created').innerText = `Создан: ${new Date(project.createdAt).toLocaleDateString('ru-RU')}`;

        // Finances
        const total = project.amount || 0;
        const currency = project.currency || 'USD';

        let projectTransactions = [];
        if (state.transactions) {
            projectTransactions = state.transactions.filter(t => t.projectId && t.projectId.toString() === project.id.toString());
        }
        const paid = projectTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expenses = projectTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const profit = paid - expenses;

        const percent = total > 0 ? Math.round((paid / total) * 100) : 0;
        const balance = total - paid;

        document.getElementById('detail-finance-total').innerText = formatMoney(total, currency);
        document.getElementById('detail-finance-paid').innerText = formatMoney(paid, currency);
        document.getElementById('detail-finance-expenses').innerText = formatMoney(expenses, currency);
        document.getElementById('detail-finance-profit').innerText = formatMoney(profit, currency);
        document.getElementById('detail-finance-balance').innerText = formatMoney(balance, currency);
        document.getElementById('detail-finance-percent').innerText = `${percent}%`;
        document.getElementById('detail-finance-bar').style.width = `${Math.min(percent, 100)}%`;

        renderFinanceChart(project, paid, expenses, total);

        // We export initProjectMap from MapManager, but here we can just call MapManager.init
        try {
            MapManager.init(project);
        } catch (mapErr) {
            console.error('MapManager.init failed:', mapErr);
        }

        // Transactions List
        const transList = document.getElementById('detail-transaction-list');
        if (transList) {
            transList.innerHTML = projectTransactions.slice().reverse().map(t => `
            <li class="transaction-item">
                <div>
                    <div style="font-weight: 500;">${t.description}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${t.date}</div>
                </div>
                <div class="transaction-amount ${t.type}">
                    ${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount, t.currency)}
                </div>
            </li>
        `).join('');
        }

        // Additional Persons List
        const personsList = document.getElementById('detail-additional-persons-list');
        if (personsList) {
            personsList.innerHTML = (project.additionalPersons || []).map(p => `
            <div class="contact-item" style="padding: 8px; display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid transparent;">
                <div style="overflow: hidden;">
                    <div class="contact-name" style="font-size: 0.9rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</div>
                    ${p.position ? `<div class="contact-position" style="font-size: 0.75rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.position}</div>` : ''}
                    ${p.phone ? `<div class="contact-phone" style="font-size: 0.75rem;"><a href="tel:${p.phone}" style="color: var(--accent-primary); text-decoration: none;">${p.phone}</a></div>` : ''}
                </div>
                <button class="btn-delete-icon admin-only" onclick="window.deleteAdditionalPerson('${p.id}')" title="Удалить">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        `).join('');
        }

        // Sections List
        const sectionsList = document.getElementById('detail-sections-list');
        if (sectionsList) {
            const today = new Date().toISOString().split('T')[0];

            sectionsList.innerHTML = (project.sections || []).map(section => {
                // Calculate deadline status
                let deadlineHtml = '';
                const isOverdue = section.dueDate && section.dueDate < today && section.status !== 'completed' && section.status !== 'delivered';
                const isDueSoon = section.dueDate && !isOverdue && section.dueDate <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                if (section.dueDate) {
                    const deadlineColor = isOverdue ? 'var(--accent-danger)' : isDueSoon ? 'var(--accent-warning)' : 'var(--text-secondary)';
                    const deadlineIcon = isOverdue ? '⚠️' : '📅';
                    const formattedDate = new Date(section.dueDate).toLocaleDateString('ru-RU');

                    deadlineHtml = `
                        <div style="display: flex; align-items: center; gap: 5px; font-size: 0.8rem; color: ${deadlineColor}; margin-bottom: 10px;">
                            <span>${deadlineIcon}</span>
                            <span>Дедлайн: ${formattedDate}</span>
                            ${isOverdue ? '<span style="background: var(--accent-danger); color: white; padding: 1px 6px; border-radius: 4px; font-size: 0.7rem;">Просрочен</span>' : ''}
                            ${isDueSoon ? '<span style="background: var(--accent-warning); color: white; padding: 1px 6px; border-radius: 4px; font-size: 0.7rem;">Скоро</span>' : ''}
                        </div>
                    `;
                }

                // Generate files HTML
                const filesHtml = (section.files || []).map(file => {
                    const fileName = typeof file === 'string' ? file : file.name;
                    const fileComment = typeof file === 'object' ? (file.comment || '') : '';
                    const hasComment = fileComment.length > 0;
                    const fileId = typeof file === 'object' && file.id ? file.id : fileName.replace(/[^a-zA-Z0-9]/g, '_');

                    return `
                        <div class="file-chip-wrapper" style="display: flex; flex-direction: column; gap: 5px;">
                            <div class="file-chip" style="display: flex; align-items: center; gap: 5px; background: rgba(255,255,255,0.05); padding: 5px 10px; border-radius: 20px; font-size: 0.85rem;">
                                <span style="cursor: pointer; display: flex; align-items: center; gap: 6px;" onclick="window.previewOrDownload('${section.id}', '${fileName}')" title="Открыть">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                    ${fileName}
                                </span>
                                <button class="btn-preview-icon" onclick="window.previewOrDownload('${section.id}', '${fileName}')" title="Просмотр" style="background: none; border: none; cursor: pointer; padding: 2px; display: flex; align-items: center; color: var(--text-secondary);">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                </button>
                                ${hasComment ? `
                                <button class="btn-comment-icon" onclick="window.toggleFileComment('${section.id}_${fileId}')" title="Показать комментарий" style="background: none; border: none; cursor: pointer; padding: 2px; display: flex; align-items: center; color: var(--accent-primary);">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                </button>
                                ` : ''}
                                <button class="btn-download-icon" onclick="downloadFile('${section.id}', '${fileName}')" title="Скачать файл">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                </button>
                                <button class="btn-delete-icon admin-only" onclick="deleteFile('${section.id}', '${fileName}')" title="Удалить файл" style="padding: 2px;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                            ${hasComment ? `
                            <div id="file-comment-${section.id}_${fileId}" class="file-comment-box" style="display: none; background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 8px; font-size: 0.8rem; color: var(--text-secondary); border-left: 2px solid var(--accent-primary); max-width: 200px; word-wrap: break-word;">
                                💬 ${fileComment}
                            </div>
                            ` : ''}
                        </div>
                    `;
                }).join('');

                return `
            <div class="section-item" style="border: 1px solid ${isOverdue ? 'var(--accent-danger)' : 'var(--glass-border)'}; border-radius: 12px; padding: 15px; margin-bottom: 10px; background: rgba(255,255,255,0.02);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <h4 style="margin: 0; font-size: 1rem;">${section.name}</h4>
                        ${section.name !== 'Документы' ? `<span class="status-badge status-${section.status || 'in-progress'}" style="font-size: 0.7rem; cursor: pointer;" onclick="window.openStatusModal('section', '${section.id}')">${getStatusName(section.status || 'in-progress')}</span>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${section.engineer ? `<button class="btn-chip" onclick="window.openEngineerStats('${section.engineer}')">👷‍♂️ ${section.engineer}</button>` : '<span style="color: var(--text-secondary); font-size: 0.8rem;">Нет инженера</span>'}
                        <button class="btn-delete-icon admin-only" onclick="deleteSection('${section.id}')" title="Удалить раздел">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                </div>
                ${deadlineHtml}
                <div class="section-files" style="display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-start;">
                    ${filesHtml}
                    ${(localStorage.getItem('userRole') !== 'engineer' || section.engineer === localStorage.getItem('userName')) ? `
                    <label class="btn-dashed-sm" style="cursor: pointer; border: 1px dashed var(--text-secondary); padding: 5px 10px; border-radius: 20px; font-size: 0.85rem; color: var(--text-secondary); display: flex; align-items: center; gap: 5px;">
                        + Файл
                        <input type="file" style="display: none;" onchange="window.handleSectionFileUpload(this, '${section.id}')">
                    </label>` : ''}
                </div>
                
                <!-- Drop Zone for Drag & Drop -->
                ${(localStorage.getItem('userRole') !== 'engineer' || section.engineer === localStorage.getItem('userName')) ? `
                <div class="drop-zone" 
                     data-section-id="${section.id}"
                     ondragover="window.handleDragOver(event)"
                     ondragleave="window.handleDragLeave(event)"
                     ondrop="window.handleSectionDrop(event, '${section.id}')"
                     style="margin-top: 10px; padding: 15px; border: 2px dashed var(--glass-border); border-radius: 8px; text-align: center; color: var(--text-secondary); font-size: 0.85rem; transition: all 0.3s ease; cursor: pointer;">
                    <span>📁 Перетащите файлы сюда</span>
                </div>` : ''}
            </div>
            `;
            }).join('');
        }

        // Gallery
        const galleryGrid = document.getElementById('detail-gallery-grid');
        if (galleryGrid) {
            window.currentLightboxImages = (project.photos || []).map(photo => {
                // Fix legacy localhost URLs
                if (typeof photo === 'string' && photo.includes('/uploads/') && (photo.includes('localhost') || photo.includes('127.0.0.1'))) {
                    return photo.substring(photo.indexOf('/uploads/'));
                }

                if (!photo.startsWith('http')) {
                    const folder = project.folderName || '';
                    return `${API_URL.replace('/api', '')}/uploads/${folder}/gallery/${photo}`;
                }
                return photo;
            });

            galleryGrid.innerHTML = (project.photos || []).map((photo, index) => {
                let src = window.currentLightboxImages[index];
                return `
            <div class="gallery-item" onclick="openLightbox(${index})">
            <img src="${src}" alt="Project Photo">
                <div class="gallery-actions">
                    <button class="btn-icon-sm" onclick="event.stopPropagation(); downloadFile('${src}', '${photo}')" title="Скачать">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </button>
                    <button class="btn-delete-icon admin-only" onclick="event.stopPropagation(); deletePhoto('${photo}')" title="Удалить">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </div>`;
            }).join('');
        }

        renderComments(project);
    } catch (err) {
        console.error('CRITICAL ERROR in renderProjectDetailsSafe:', err);
        showToast('Ошибка отображения проекта: ' + err.message, 'error');
    }
    console.log('renderProjectDetailsSafe finished');
}

export function openProjectDetails(id, pushState = true) {
    try {
        console.log('Opening project:', id);
        setCurrentProjectId(id.toString());
        window.currentProjectId = id.toString(); // Expose to window for inline HTML handlers
        const project = state.projects.find(p => p.id.toString() === currentProjectId);

        if (!project) {
            alert('Проект не найден!');
            return;
        }

        if (!project.sections) project.sections = [];

        let docsSection = project.sections.find(s => s.name === 'Документы');
        if (!docsSection) {
            docsSection = { id: Date.now().toString(), name: 'Документы', engineer: '', files: [] };
            project.sections.unshift(docsSection);
            saveData();
        }

        renderProjectDetailsSafe(project);

        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.getElementById('project-details-view').classList.add('active');
        document.getElementById('page-title').innerText = 'Детали проекта';

        if (pushState) {
            history.pushState({ view: 'project-details', id: id }, '', `?view=project-details&id=${id}`);
        }
    } catch (e) {
        console.error(e);
        alert('Ошибка при открытии проекта: ' + e.message);
    }
}

export function closeProjectDetails() {
    if (history.state && history.state.view === 'project-details') {
        history.back();
    } else {
        history.pushState({ view: 'projects' }, '', '?view=projects');
        window.dispatchEvent(new Event('popstate'));
    }
}

export function deleteCurrentProject() {
    if (confirm('Вы уверены, что хотите удалить этот проект?')) {
        const project = state.projects.find(p => p.id.toString() === currentProjectId.toString());

        if (project && project.folderName) {
            fetch(API_URL + '/delete-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folderName: project.folderName })
            }).catch(console.error);
        }

        state.projects = state.projects.filter(p => p.id.toString() !== currentProjectId.toString());
        saveData();
        closeProjectDetails();
        // Trigger app render?
        // We can dispatch event or assume app.js will handle listener if we emit event?
        // Simple way: if assigned to window, we assume calling global render() is available, OR we import it (cycle).
        // Since we are creating modules, we should avoid cycle.
        // But for now, let's reload the page, or export a re-render signal.
        if (window.render) window.render();
    }
}

export function uploadFile(file, project, subfolder, callback) {
    const formData = new FormData();
    formData.append('folderName', project.folderName || '');
    formData.append('sectionName', subfolder);
    formData.append('file', file);

    fetch(API_URL + '/upload', {
        method: 'POST',
        body: formData
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                callback(data);
            } else {
                showToast('Ошибка загрузки: ' + data.message, 'error');
            }
        })
        .catch(err => {
            console.error(err);
            showToast('Ошибка сервера при загрузке', 'error');
        });
}

// Handlers for File Uploads (assigned to window for drag/drop)
// Temporary storage for pending file upload
let pendingFileUpload = null;

export function handleSectionFileUpload(input, sectionId) {
    const files = input.files ? input.files : [input];
    if (!files || files.length === 0) return;

    const file = files[0];
    const project = state.projects.find(p => p.id.toString() === currentProjectId.toString());
    if (!project) return;

    const section = project.sections.find(s => s.id === sectionId);
    if (!section) return;

    // Store pending upload data
    pendingFileUpload = {
        file: file,
        project: project,
        section: section,
        sectionId: sectionId
    };

    // Show modal for comment input
    document.getElementById('file-comment-section-id').value = sectionId;
    document.getElementById('file-comment-filename').textContent = file.name;
    document.getElementById('file-comment-text').value = '';

    // Open modal using the standard openModal function
    openModal('file-comment-modal');

    // Clear input so same file can be selected again if cancelled
    input.value = '';
}

// Complete the file upload with comment
export function completeFileUpload(comment) {
    if (!pendingFileUpload) return;

    const { file, project, section } = pendingFileUpload;

    uploadFile(file, project, section.name, (data) => {
        if (!section.files) section.files = [];
        section.files.push({
            id: Date.now().toString(),
            name: data.filename,
            path: data.url,
            comment: comment || ''
        });
        addProjectHistory(project.id, 'file_upload', `Загружен файл "${data.filename}" в раздел "${section.name}"`);

        // Send Telegram notification
        notifyNewFile(project.name, section.name, data.filename);

        saveData();
        syncProject(project);
        renderProjectDetailsSafe(project);
        showToast('Файл загружен!', 'success');
    });

    pendingFileUpload = null;
}

// Toggle file comment visibility
export function toggleFileComment(fileId) {
    const commentBox = document.getElementById('file-comment-' + fileId);
    if (commentBox) {
        const isVisible = commentBox.style.display !== 'none';
        commentBox.style.display = isVisible ? 'none' : 'block';
    }
}

// Preview or download file based on type
export function previewOrDownload(sectionId, fileName) {
    const project = state.projects.find(p => p.id.toString() === currentProjectId.toString());
    if (!project) return;

    const section = project.sections.find(s => s.id === sectionId);
    if (!section || !section.files) return;

    const file = section.files.find(f => {
        const name = typeof f === 'string' ? f : f.name;
        return name === fileName;
    });

    if (!file) return;

    const filePath = typeof file === 'object' ? file.path : null;
    if (!filePath) {
        // If no path, just download
        downloadFile(sectionId, fileName);
        return;
    }

    // Use previewFile function from global scope
    if (window.previewFile) {
        window.previewFile(filePath, fileName);
    } else {
        downloadFile(sectionId, fileName);
    }
}

export function handleGalleryFileUpload(input) {
    const files = input.files ? Array.from(input.files) : [input];
    if (!files || files.length === 0) return;

    const project = state.projects.find(p => p.id.toString() === currentProjectId.toString());
    if (!project) return;

    let uploadedCount = 0;
    files.forEach(file => {
        uploadFile(file, project, 'gallery', (data) => {
            if (!project.photos) project.photos = [];
            project.photos.push(data.filename);
            uploadedCount++;

            if (uploadedCount === files.length) {
                if (files.length === 1) {
                    addProjectHistory(project.id, 'file_upload', `Загружено фото "${files[0].name}" в галерею`);
                } else {
                    addProjectHistory(project.id, 'file_upload', `Загружено фото в галерею: ${files.length} шт.`);
                }
                saveData();
                syncProject(project);
                renderProjectDetailsSafe(project);
                showToast('Фото загружено!', 'success');
            }
        });
    });
}

export function deleteSection(sectionId) {
    if (!confirm('Удалить этот раздел?')) return;
    const project = state.projects.find(p => p.id.toString() === currentProjectId.toString());
    if (!project) return;

    project.sections = project.sections.filter(s => s.id !== sectionId);
    saveData();
    syncProject(project);
    renderProjectDetailsSafe(project);
    showToast('Раздел удален', 'info');
}

export function deleteFile(sectionId, fileName) {
    window.showConfirmModal('Удалить файл?', `Вы уверены, что хотите удалить "${fileName}"?`, () => {
        const project = state.projects.find(p => p.id.toString() === currentProjectId.toString());
        if (!project) return;

        const section = project.sections.find(s => s.id === sectionId);
        if (section) {
            section.files = section.files.filter(f => (typeof f === 'string' ? f : f.name) !== fileName);
            addProjectHistory(project.id, 'file_delete', `Удален файл "${fileName}" из раздела "${section.name}"`);
            saveData();
            syncProject(project);
            renderProjectDetailsSafe(project);
            showToast('Файл удален', 'info');
        }
    });
}

export function downloadFile(sectionIdOrPath, fileName) {
    // Helper to sanitize path from localhost references
    const sanitizePath = (p) => {
        if (p && p.includes('/uploads/') && (p.includes('localhost') || p.includes('127.0.0.1'))) {
            return p.substring(p.indexOf('/uploads/'));
        }
        return p;
    };

    // If first arg is path (http...) or relative path, use it.
    // The legacy code used args flexibly.
    // We assume if it contains slashes, it's a path/URL, not a section ID.
    if (sectionIdOrPath && (sectionIdOrPath.startsWith('http') || sectionIdOrPath.includes('/'))) {
        const link = document.createElement('a');
        link.href = sanitizePath(sectionIdOrPath);
        link.download = fileName;
        link.target = '_blank';
        link.click();
    } else {
        // Find file in section
        const project = state.projects.find(p => p.id.toString() === currentProjectId.toString());
        if (!project) return;
        const section = project.sections.find(s => s.id === sectionIdOrPath);
        if (!section) return;

        const fileObj = section.files.find(f => (typeof f === 'string' ? f : f.name) === fileName);
        if (fileObj) {
            const folder = project.folderName || '';
            let path = fileObj.path;

            // Fix legacy paths
            path = sanitizePath(path);

            if (!path) {
                path = `${API_URL.replace('/api', '')}/uploads/${folder}/${section.name}/${fileName}`;
            }

            const link = document.createElement('a');
            link.href = path;
            link.download = fileName;
            link.target = '_blank';
            link.click();
        }
    }
}

export function deletePhoto(photoName) {
    if (!confirm('Удалить это фото?')) return;
    const project = state.projects.find(p => p.id.toString() === currentProjectId.toString());
    if (!project) return;

    // Remove from local state
    project.photos = project.photos.filter(p => p !== photoName);

    saveData();
    syncProject(project);

    renderProjectDetailsSafe(project);
}

// --- Event Listeners Setup ---
export function setupProjectListeners() {
    // Project Form
    const projectForm = document.getElementById('project-form');
    if (projectForm) {
        projectForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const id = formData.get('id');

            // Logic extracted from app.js
            try {
                if (id) {
                    // Edit
                    const project = state.projects.find(p => p.id.toString() === id.toString());
                    if (project) {
                        project.name = formData.get('name');
                        project.client = formData.get('client');
                        project.address = formData.get('address');
                        project.description = formData.get('description');
                        project.amount = parseFloat(formData.get('amount'));
                        project.currency = formData.get('currency');
                        project.lat = formData.get('lat') ? parseFloat(formData.get('lat')) : project.lat;
                        project.lng = formData.get('lng') ? parseFloat(formData.get('lng')) : project.lng;

                        saveData();
                        syncProject(project); // Sync to server
                        showToast('Проект обновлен!', 'success');
                    }
                } else {
                    // Create
                    const newProject = {
                        id: Date.now().toString(),
                        name: formData.get('name'),
                        client: formData.get('client'),
                        address: formData.get('address'),
                        description: formData.get('description'),
                        amount: parseFloat(formData.get('amount')),
                        currency: formData.get('currency'),
                        status: 'in-progress',
                        createdAt: new Date().toISOString(),
                        history: [],
                        sections: [],
                        photos: [],
                        additionalPersons: [],
                        lat: formData.get('lat') ? parseFloat(formData.get('lat')) : undefined,
                        lng: formData.get('lng') ? parseFloat(formData.get('lng')) : undefined
                    };

                    state.projects.push(newProject);
                    saveData();
                    syncProject(newProject);

                    // Notify Telegram
                    notifyNewProject(newProject);

                    showToast('Проект создан!', 'success');
                }

                closeModal('project-modal');
                e.target.reset();
                renderProjects();
                if (window.renderDashboard) window.renderDashboard();
            } catch (err) {
                console.error(err);
                showToast('Ошибка: ' + err.message, 'error');
            }
        });
    }

    // Section Form
    const sectionForm = document.getElementById('section-form');
    if (sectionForm) {
        sectionForm.addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                const formData = new FormData(e.target);
                const name = formData.get('name');
                const engineer = formData.get('engineer');
                const status = formData.get('status') || 'in-progress';
                const startDate = formData.get('startDate') || null;
                const dueDate = formData.get('dueDate') || null;

                if (!name) {
                    showToast('Пожалуйста, введите название раздела', 'error');
                    return;
                }

                if (!currentProjectId) {
                    alert('Проект не выбран'); return;
                }

                const project = state.projects.find(p => p.id.toString() === currentProjectId.toString());
                if (!project) {
                    alert('Ошибка: проект не найден');
                    return;
                }

                if (!project.sections) project.sections = [];

                const newSection = {
                    id: Date.now().toString(),
                    name: name,
                    engineer: engineer || '',
                    status: status,
                    startDate: startDate,
                    dueDate: dueDate,
                    files: []
                };

                project.sections.push(newSection);

                // Add to history
                if (!project.history) project.history = [];
                project.history.push({
                    date: new Date().toISOString(),
                    action: 'section',
                    text: `Создан раздел: ${name}` + (engineer ? ` (Инженер: ${engineer})` : '')
                });

                saveData();
                syncProject(project);
                closeModal('section-modal');
                e.target.reset();
                renderProjectDetailsSafe(project);

            } catch (err) {
                console.error('Error creating section:', err);
                alert('Ошибка при создании раздела: ' + err.message);
            }
        });
    }

    // Additional Person Form
    const additionalPersonForm = document.getElementById('additional-person-form');
    if (additionalPersonForm) {
        additionalPersonForm.addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                const formData = new FormData(e.target);
                const name = formData.get('name');
                const position = formData.get('position');
                const phone = formData.get('phone');

                if (!name) {
                    showToast('Пожалуйста, введите имя', 'error');
                    return;
                }

                const project = state.projects.find(p => p.id.toString() === currentProjectId.toString());
                if (!project) {
                    showToast('Ошибка: проект не найден', 'error');
                    return;
                }

                if (!project.additionalPersons) project.additionalPersons = [];

                const newPerson = {
                    id: Date.now().toString(),
                    name: name,
                    position: position || '',
                    phone: phone || ''
                };

                project.additionalPersons.push(newPerson);

                saveData();
                syncProject(project);
                closeModal('additional-person-modal');
                e.target.reset();
                renderProjectDetailsSafe(project);
                showToast('Контакт добавлен!', 'success');

            } catch (err) {
                console.error('Error adding person:', err);
                showToast('Ошибка при добавлении контакта: ' + err.message, 'error');
            }
        });
    }
}


// Drag & Drop Global Handlers (Assigned to window)
// Drag & Drop Global Handlers (Assigned to window in app.js)
export function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('drag-over');
}

export function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
}

export function handleSectionDrop(e, sectionId) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
        handleSectionFileUpload({ files: files }, sectionId);
    }
}

export function handleGalleryDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
        handleGalleryFileUpload({ files: files });
    }
}

export function deleteAdditionalPerson(personId) {
    if (!confirm('Удалить контакт?')) return;
    const project = state.projects.find(p => p.id.toString() === currentProjectId.toString());
    if (!project) return;

    if (project.additionalPersons) {
        project.additionalPersons = project.additionalPersons.filter(p => p.id !== personId);
        saveData();
        syncProject(project); // Ensure sync
        renderProjectDetailsSafe(project);
    }
}


export function editCurrentProject() {
    const project = state.projects.find(p => p.id.toString() === currentProjectId.toString());
    if (!project) return;

    populateSelect('select[name="client"]', state.clients, 'Выберите клиента', 'name', 'name');

    const form = document.getElementById('project-form');
    form.querySelector('[name="id"]').value = project.id;
    form.querySelector('[name="name"]').value = project.name;
    form.querySelector('[name="address"]').value = project.address || '';
    form.querySelector('[name="description"]').value = project.description || '';

    // Ensure options exist before setting value
    const clientSelect = form.querySelector('[name="client"]');
    if (clientSelect) clientSelect.value = project.client;

    form.querySelector('[name="amount"]').value = project.amount || '';
    form.querySelector('[name="currency"]').value = project.currency || 'USD';
    form.querySelector('[name="status"]').value = project.status || 'in-progress';

    document.querySelector('#project-modal h2').innerText = 'Редактирование проекта';
    openModal('project-modal');
}

export function openNewProjectModal() {
    populateSelect('select[name="client"]', state.clients, 'Выберите клиента', 'name', 'name');
    openModal('project-modal');
}

export function openNewSectionModal() {
    if (!currentProjectId) {
        alert('Сначала выберите проект!');
        return;
    }
    populateSelect('#section-engineer-select', state.employees, 'Выберите инженера', 'name', 'name');
    openModal('section-modal');
}

export function openAdditionalPersonModal() {
    if (!currentProjectId) {
        alert('Сначала выберите проект!');
        return;
    }
    openModal('additional-person-modal');
}

export function openHistoryModal() {
    const historyList = document.getElementById('project-history-list');
    const project = state.projects.find(p => p.id.toString() === currentProjectId.toString());

    if (historyList && project && project.history) {
        historyList.innerHTML = project.history.slice().reverse().map(h => `
            <div class="history-item" style="display: flex; gap: 12px; align-items: start; padding: 10px; border-bottom: 1px solid var(--glass-border);">
                <div style="font-size: 1.2rem; line-height: 1;">${h.icon || '📝'}</div>
                <div style="flex: 1;">
                    <div style="font-weight: 500; margin-bottom: 4px;">${h.text}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${new Date(h.date).toLocaleString('ru-RU')}</div>
                </div>
            </div>
        `).join('');
    } else if (historyList) {
        historyList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">История пуста</div>';
    }
    openModal('history-modal');
}

export function openStatusModal(type, id) {
    setCurrentStatusTarget({ type, id });
    const modal = document.getElementById('status-change-modal');
    if (!modal) return;

    const optionsContainer = modal.querySelector('.status-options');
    optionsContainer.innerHTML = '';

    const statuses = ['in-progress', 'on-review', 'correction', 'accepted'];

    statuses.forEach(status => {
        const btn = document.createElement('button');
        btn.className = `btn-status status-${status}`;
        btn.innerText = getStatusName(status);
        btn.style.width = '100%';
        btn.style.padding = '12px';
        btn.style.textAlign = 'left';
        btn.style.border = '1px solid var(--glass-border)';
        btn.style.borderRadius = '8px';
        btn.style.marginBottom = '8px';
        btn.style.cursor = 'pointer';

        // Add minimal hover effect inline or rely on CSS class
        btn.onmouseover = () => btn.style.opacity = '0.8';
        btn.onmouseout = () => btn.style.opacity = '1';

        btn.onclick = () => changeStatus(status);
        optionsContainer.appendChild(btn);
    });

    openModal('status-change-modal');
}

export function changeStatus(newStatus) {
    if (!currentStatusTarget) return;

    const { type, id } = currentStatusTarget;

    if (type === 'project') {
        let project;
        if (id) {
            project = state.projects.find(p => p.id.toString() === id.toString());
        } else {
            project = state.projects.find(p => p.id.toString() === currentProjectId);
        }

        if (project) {
            let comment = '';
            if (newStatus === 'correction') {
                comment = prompt('Введите комментарий к правкам:', '');
                if (comment === null) return; // Cancelled
                if (!comment.trim()) {
                    alert('Комментарий обязателен для статуса "На правку"');
                    return;
                }
            }

            project.status = newStatus;

            let actionText = `Статус изменен на "${getStatusName(newStatus)}"`;
            if (comment) {
                actionText += `. Примечание: ${comment}`;
                project.lastCorrectionComment = comment;
            }

            addProjectHistory(project.id, 'status_change', actionText);

            // AUTO-ARCHIVE: Архивация при статусе "Принято"
            if (newStatus === 'accepted') {
                archiveProject(project.id, project.name);
            }

            // Send Telegram notification
            const oldStatusName = getStatusName(project.status);
            notifyStatusChange(project.name, oldStatusName, getStatusName(newStatus));

            saveData();
            // Re-render
            if (document.getElementById('project-details-view').classList.contains('active')) {
                renderProjectDetailsSafe(project);
            }
            if (window.render) window.render(); // Update lists
        }
    } else if (type === 'section') {
        const project = state.projects.find(p => p.id.toString() === currentProjectId);
        if (project && project.sections) {
            const section = project.sections.find(s => s.id === id);
            if (section) {
                section.status = newStatus;
                saveData();
                renderProjectDetailsSafe(project);
            }
        }
    }

    closeModal('status-change-modal');
    syncProject(state.projects.find(p => p.id.toString() === currentProjectId));
}

export function addProjectComment() {
    const input = document.getElementById('new-comment-input');
    const text = input.value.trim();
    if (!text) return;

    const project = state.projects.find(p => p.id.toString() === currentProjectId.toString());
    if (!project) return;

    if (!project.comments) project.comments = [];

    const comment = {
        id: Date.now().toString(),
        text: text,
        date: new Date().toISOString(),
        author: 'Admin' // В будущем можно брать из профиля текущего пользователя
    };

    project.comments.unshift(comment);

    // Add history record
    if (window.addProjectHistory) {
        window.addProjectHistory(project.id, 'comment', `Добавлен комментарий: ${text.substring(0, 20)}${text.length > 20 ? '...' : ''}`);
    }

    // Send Telegram notification
    const author = localStorage.getItem('userName') || 'Система';
    notifyNewComment(project.name, text, author);

    saveData();
    syncProject(project);

    input.value = '';
    renderComments(project);
    showToast('Комментарий добавлен', 'success');
}

export function renderComments(project) {
    const container = document.getElementById('project-comments-list');
    if (!container) return;

    if (!project.comments || project.comments.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">Нет комментариев</div>';
        return;
    }

    container.innerHTML = project.comments.map(c => `
        <div class="comment-item" style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.8rem; color: var(--text-secondary);">
                <span style="font-weight: 600; color: var(--accent-primary);">${c.author || 'User'}</span>
                <span>${new Date(c.date).toLocaleString('ru-RU')}</span>
            </div>
            <div style="white-space: pre-wrap; word-break: break-word;">${c.text}</div>
        </div>
    `).join('');
}

export function addProjectHistory(projectId, actionType, text) {
    const project = state.projects.find(p => p.id.toString() === projectId.toString());
    if (!project) return;

    if (!project.history) project.history = [];

    // Icon mapping
    const icons = {
        'status_change': '🔄',
        'file_upload': '📎',
        'file_delete': '🗑️',
        'comment': '💬',
        'create': '✨',
        'update': '✏️',
        'other': '📝'
    };

    project.history.push({
        date: new Date().toISOString(),
        action: actionType,
        text: text,
        icon: icons[actionType] || icons['other']
    });

    saveData();
}

/**
 * Архивирует проект и отправляет в Google Drive + Telegram
 * @param {string} projectId - ID проекта
 * @param {string} projectName - Название проекта
 */
export async function archiveProject(projectId, projectName) {
    try {
        showToast('📦 Архивация проекта...', 'info');

        const response = await fetch(`${API_URL}/archive-project`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId })
        });

        const result = await response.json();

        if (result.success) {
            let message = `✅ Проект "${projectName}" архивирован!\n\n`;

            if (result.googleDrive?.success) {
                message = `☁️ Проект загружен в <a href="${result.googleDrive.link}" target="_blank">Google Drive</a>`;
                showToast(message, 'success');
            } else if (result.googleDrive?.error === 'Not configured') {
                showToast('⚠️ Google Drive не настроен. Архив создан локально.', 'warning');
            } else {
                showToast('⚠️ Ошибка загрузки в Google Drive: ' + result.googleDrive?.error, 'warning');
            }

            if (result.telegram?.success) {
                setTimeout(() => {
                    showToast('📲 Архив отправлен в Telegram', 'success');
                }, 1000);
            } else if (result.telegram?.error !== 'Not configured') {
                console.warn('Telegram send failed:', result.telegram?.error);
            }

            // Add history record
            addProjectHistory(projectId, 'archive', `Проект архивирован автоматически`);

        } else {
            showToast('❌ Ошибка архивации: ' + result.message, 'error');
        }

    } catch (error) {
        console.error('Archive error:', error);
        showToast('❌ Ошибка архивации: ' + error.message, 'error');
    }
}

