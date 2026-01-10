// Gantt Chart & Project Planning Module
// =====================================

import { state, saveData } from './state.js';
import { showToast, closeModal } from './utils.js';

// Render Gantt-like timeline for projects
export function renderGanttChart(containerId = 'gantt-container') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const projects = state.projects.filter(p => 
        p.status !== 'archive' && p.startDate && p.deadline
    );
    
    if (projects.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 30px;">Нет проектов с датами для отображения</p>';
        return;
    }
    
    // Calculate date range
    const allDates = projects.flatMap(p => [new Date(p.startDate), new Date(p.deadline)]);
    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));
    
    // Add padding
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);
    
    const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
    
    // Generate month headers
    const months = [];
    let current = new Date(minDate);
    while (current <= maxDate) {
        const monthKey = `${current.getFullYear()}-${current.getMonth()}`;
        if (!months.find(m => m.key === monthKey)) {
            months.push({
                key: monthKey,
                label: current.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' }),
                start: new Date(current)
            });
        }
        current.setDate(current.getDate() + 1);
    }
    
    container.innerHTML = `
        <div class="gantt-chart" style="overflow-x: auto; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid var(--glass-border);">
            <!-- Header with months -->
            <div class="gantt-header" style="display: flex; border-bottom: 1px solid var(--glass-border); min-width: ${totalDays * 4}px;">
                <div style="width: 200px; flex-shrink: 0; padding: 12px; font-weight: 600; background: rgba(255,255,255,0.03);">Проект</div>
                <div style="flex: 1; display: flex;">
                    ${generateDayHeaders(minDate, maxDate)}
                </div>
            </div>
            
            <!-- Project rows -->
            ${projects.map(project => {
                const start = new Date(project.startDate);
                const end = new Date(project.deadline);
                const startOffset = Math.ceil((start - minDate) / (1000 * 60 * 60 * 24));
                const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                
                const progress = calculateProjectProgress(project);
                const color = getProjectColor(project.status);
                
                return `
                    <div class="gantt-row" style="display: flex; min-height: 50px; border-bottom: 1px solid var(--glass-border);">
                        <div style="width: 200px; flex-shrink: 0; padding: 12px; display: flex; align-items: center; gap: 8px; cursor: pointer;" onclick="window.openProjectDetails && window.openProjectDetails('${project.id}')">
                            <span style="font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${project.name}</span>
                        </div>
                        <div style="flex: 1; position: relative; min-width: ${totalDays * 4}px;">
                            <div class="gantt-bar" 
                                style="position: absolute; top: 50%; transform: translateY(-50%); left: ${startOffset * 4}px; width: ${duration * 4}px; height: 28px; background: ${color}; border-radius: 6px; display: flex; align-items: center; overflow: hidden; cursor: pointer;"
                                onclick="showProjectTooltip(event, '${project.id}')"
                                title="${project.name}: ${new Date(project.startDate).toLocaleDateString('ru-RU')} - ${new Date(project.deadline).toLocaleDateString('ru-RU')}">
                                <div style="height: 100%; width: ${progress}%; background: rgba(255,255,255,0.3); border-radius: 6px 0 0 6px;"></div>
                                <span style="position: absolute; left: 8px; font-size: 0.7rem; color: white; font-weight: 600;">${progress}%</span>
                            </div>
                            ${renderMilestones(project, minDate)}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
        
        <div style="display: flex; gap: 15px; margin-top: 15px; color: var(--text-secondary); font-size: 0.8rem;">
            <span>🟢 В работе</span>
            <span>🟡 На проверке</span>
            <span>🔵 Принято</span>
            <span>🔷 Веха</span>
        </div>
    `;
}

// Generate day headers
function generateDayHeaders(minDate, maxDate) {
    let html = '';
    let current = new Date(minDate);
    let currentMonth = -1;
    
    while (current <= maxDate) {
        if (current.getMonth() !== currentMonth) {
            currentMonth = current.getMonth();
            const monthLabel = current.toLocaleDateString('ru-RU', { month: 'short' });
            html += `<div style="padding: 8px; font-size: 0.7rem; color: var(--text-secondary); border-left: 1px solid var(--glass-border); min-width: 50px;">${monthLabel}</div>`;
        }
        current.setDate(current.getDate() + 7); // Weekly markers
    }
    
    return html;
}

// Calculate project progress
function calculateProjectProgress(project) {
    if (!project.sections || project.sections.length === 0) return 0;
    const completed = project.sections.filter(s => s.status === 'accepted').length;
    return Math.round((completed / project.sections.length) * 100);
}

// Get project color based on status
function getProjectColor(status) {
    const colors = {
        'in-progress': 'linear-gradient(90deg, #10b981, #059669)',
        'on-review': 'linear-gradient(90deg, #f59e0b, #d97706)',
        'accepted': 'linear-gradient(90deg, #3b82f6, #2563eb)',
        'completed': 'linear-gradient(90deg, #3b82f6, #2563eb)',
        'archive': 'linear-gradient(90deg, #6b7280, #4b5563)'
    };
    return colors[status] || colors['in-progress'];
}

// Render milestones on Gantt chart
function renderMilestones(project, minDate) {
    if (!project.milestones || project.milestones.length === 0) return '';
    
    return project.milestones.map(m => {
        const mDate = new Date(m.date);
        const offset = Math.ceil((mDate - minDate) / (1000 * 60 * 60 * 24));
        const completed = m.completed ? 'background: #3b82f6' : 'background: #6366f1';
        
        return `
            <div class="milestone-marker" 
                style="position: absolute; top: 50%; left: ${offset * 4}px; transform: translate(-50%, -50%); width: 12px; height: 12px; ${completed}; border-radius: 2px; transform: rotate(45deg); cursor: pointer; z-index: 10;"
                title="${m.name}: ${mDate.toLocaleDateString('ru-RU')}"
                onclick="event.stopPropagation(); showMilestoneDetails('${project.id}', '${m.id}')">
            </div>
        `;
    }).join('');
}

// Show Gantt modal
export function openGanttModal() {
    let modal = document.getElementById('gantt-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'gantt-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 95vw; max-height: 90vh;">
            <span class="close" onclick="closeModal('gantt-modal')">&times;</span>
            <h2>📊 Gantt-диаграмма проектов</h2>
            <div id="gantt-container" style="margin-top: 15px;"></div>
        </div>
    `;
    
    modal.style.display = 'flex';
    
    setTimeout(() => renderGanttChart('gantt-container'), 100);
}

// =====================================================
// MILESTONES (Вехи проекта)
// =====================================================

// Add milestone to project
export function addMilestone(projectId, name, date, description = '') {
    const project = state.projects.find(p => p.id.toString() === projectId.toString());
    if (!project) return;
    
    if (!project.milestones) project.milestones = [];
    
    project.milestones.push({
        id: Date.now().toString(),
        name,
        date,
        description,
        completed: false,
        createdAt: new Date().toISOString()
    });
    
    saveData();
    showToast('✅ Веха добавлена', 'success');
}

// Toggle milestone completion
export function toggleMilestone(projectId, milestoneId) {
    const project = state.projects.find(p => p.id.toString() === projectId.toString());
    if (!project || !project.milestones) return;
    
    const milestone = project.milestones.find(m => m.id === milestoneId);
    if (milestone) {
        milestone.completed = !milestone.completed;
        saveData();
    }
}

// Delete milestone
export function deleteMilestone(projectId, milestoneId) {
    const project = state.projects.find(p => p.id.toString() === projectId.toString());
    if (!project || !project.milestones) return;
    
    project.milestones = project.milestones.filter(m => m.id !== milestoneId);
    saveData();
    showToast('Веха удалена', 'info');
}

// Open add milestone modal
export function openAddMilestoneModal(projectId) {
    let modal = document.getElementById('add-milestone-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'add-milestone-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <span class="close" onclick="closeModal('add-milestone-modal')">&times;</span>
            <h2>🔷 Добавить веху</h2>
            
            <form onsubmit="event.preventDefault(); submitMilestone('${projectId}');">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: var(--text-secondary);">Название*</label>
                    <input type="text" id="milestone-name" required placeholder="Например: Сдача чертежей"
                        style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary);">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: var(--text-secondary);">Дата*</label>
                    <input type="date" id="milestone-date" required
                        style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary);">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; color: var(--text-secondary);">Описание</label>
                    <textarea id="milestone-description" rows="2" placeholder="Необязательно"
                        style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary); resize: vertical;"></textarea>
                </div>
                
                <button type="submit" class="btn-primary" style="width: 100%;">✅ Добавить</button>
            </form>
        </div>
    `;
    
    modal.style.display = 'flex';
}

// Submit milestone form
export function submitMilestone(projectId) {
    const name = document.getElementById('milestone-name').value;
    const date = document.getElementById('milestone-date').value;
    const description = document.getElementById('milestone-description').value;
    
    if (!name || !date) return;
    
    addMilestone(projectId, name, date, description);
    closeModal('add-milestone-modal');
}

// Render milestones list for project
export function renderProjectMilestones(project) {
    const milestones = project.milestones || [];
    
    if (milestones.length === 0) {
        return `
            <div style="text-align: center; color: var(--text-secondary); padding: 20px;">
                <p>Нет вех</p>
                <button class="btn-sm" onclick="openAddMilestoneModal('${project.id}')" style="margin-top: 10px;">
                    + Добавить веху
                </button>
            </div>
        `;
    }
    
    // Sort by date
    const sorted = [...milestones].sort((a, b) => new Date(a.date) - new Date(b.date));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return `
        <div style="display: flex; flex-direction: column; gap: 10px;">
            ${sorted.map(m => {
                const mDate = new Date(m.date);
                const isPast = mDate < today && !m.completed;
                const statusColor = m.completed ? 'var(--accent-success)' : (isPast ? 'var(--accent-danger)' : 'var(--accent-primary)');
                
                return `
                    <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; border-left: 3px solid ${statusColor};">
                        <input type="checkbox" ${m.completed ? 'checked' : ''} onchange="toggleMilestone('${project.id}', '${m.id}')"
                            style="width: 18px; height: 18px; cursor: pointer;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; ${m.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${m.name}</div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary);">
                                ${mDate.toLocaleDateString('ru-RU')}
                                ${isPast ? '<span style="color: var(--accent-danger);"> (просрочено)</span>' : ''}
                            </div>
                        </div>
                        <button class="btn-delete-icon" onclick="deleteMilestone('${project.id}', '${m.id}')" title="Удалить">🗑</button>
                    </div>
                `;
            }).join('')}
        </div>
        <div style="text-align: center; margin-top: 10px;">
            <button class="btn-sm" onclick="openAddMilestoneModal('${project.id}')">+ Добавить веху</button>
        </div>
    `;
}

// Expose to window
window.openGanttModal = openGanttModal;
window.renderGanttChart = renderGanttChart;
window.openAddMilestoneModal = openAddMilestoneModal;
window.submitMilestone = submitMilestone;
window.toggleMilestone = toggleMilestone;
window.deleteMilestone = deleteMilestone;
window.renderProjectMilestones = renderProjectMilestones;
