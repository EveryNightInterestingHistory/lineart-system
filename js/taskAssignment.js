// Task Assignment Module
// ======================

import { state, saveData } from './state.js';
import { showToast, closeModal } from './utils.js';

// Get all tasks for an engineer
export function getEngineerTasks(engineerName) {
    const tasks = [];
    
    state.projects.forEach(project => {
        if (!project.sections) return;
        
        project.sections.forEach(section => {
            if (section.engineer === engineerName) {
                tasks.push({
                    projectId: project.id,
                    projectName: project.name,
                    sectionId: section.id,
                    sectionName: section.name,
                    status: section.status || 'in-progress',
                    dueDate: section.dueDate,
                    priority: section.priority || 'normal'
                });
            }
        });
    });
    
    // Sort by due date
    tasks.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
    });
    
    return tasks;
}

// Get workload summary for all engineers
export function getEngineersWorkload() {
    const workload = {};
    
    state.projects.forEach(project => {
        if (!project.sections) return;
        if (project.status === 'completed' || project.status === 'archive') return;
        
        project.sections.forEach(section => {
            if (!section.engineer) return;
            
            if (!workload[section.engineer]) {
                workload[section.engineer] = {
                    total: 0,
                    inProgress: 0,
                    overdue: 0,
                    upcoming: 0
                };
            }
            
            workload[section.engineer].total++;
            
            if (section.status === 'in-progress') {
                workload[section.engineer].inProgress++;
            }
            
            if (section.dueDate) {
                const due = new Date(section.dueDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const daysLeft = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
                
                if (daysLeft < 0 && section.status !== 'accepted') {
                    workload[section.engineer].overdue++;
                } else if (daysLeft <= 3 && daysLeft >= 0) {
                    workload[section.engineer].upcoming++;
                }
            }
        });
    });
    
    return workload;
}

// Render engineer workload cards
export function renderEngineerWorkloadCards() {
    const workload = getEngineersWorkload();
    const engineers = state.employees || [];
    
    return engineers.map(eng => {
        const w = workload[eng.name] || { total: 0, inProgress: 0, overdue: 0, upcoming: 0 };
        
        return `
            <div class="workload-card" onclick="showEngineerTasks('${eng.name}')" style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; border: 1px solid var(--glass-border); cursor: pointer; transition: transform 0.2s;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white;">
                        ${eng.name.charAt(0)}
                    </div>
                    <div>
                        <div style="font-weight: 600;">${eng.name}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${eng.position || 'Инженер'}</div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 0.85rem;">
                    <div style="text-align: center; padding: 8px; background: rgba(99,102,241,0.1); border-radius: 6px;">
                        <div style="font-weight: 700; color: #6366f1;">${w.total}</div>
                        <div style="color: var(--text-secondary); font-size: 0.75rem;">Всего</div>
                    </div>
                    <div style="text-align: center; padding: 8px; background: rgba(245,158,11,0.1); border-radius: 6px;">
                        <div style="font-weight: 700; color: #f59e0b;">${w.inProgress}</div>
                        <div style="color: var(--text-secondary); font-size: 0.75rem;">В работе</div>
                    </div>
                    ${w.overdue > 0 ? `
                        <div style="text-align: center; padding: 8px; background: rgba(239,68,68,0.1); border-radius: 6px; grid-column: span 2;">
                            <div style="font-weight: 700; color: #ef4444;">⚠️ ${w.overdue} просрочено</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Show engineer tasks modal
export function showEngineerTasks(engineerName) {
    const tasks = getEngineerTasks(engineerName);
    
    let modal = document.getElementById('engineer-tasks-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'engineer-tasks-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <span class="close" onclick="closeModal('engineer-tasks-modal')">&times;</span>
            <h2>📋 Задачи: ${engineerName}</h2>
            
            ${tasks.length === 0 
                ? '<p style="color: var(--text-secondary); text-align: center; padding: 30px;">Нет назначенных задач</p>'
                : `
                    <div style="max-height: 400px; overflow-y: auto;">
                        ${tasks.map(task => {
                            let statusColor = '#6366f1';
                            let statusBg = 'rgba(99,102,241,0.1)';
                            let dueBadge = '';
                            
                            if (task.dueDate) {
                                const due = new Date(task.dueDate);
                                const daysLeft = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
                                
                                if (daysLeft < 0) {
                                    statusColor = '#ef4444';
                                    statusBg = 'rgba(239,68,68,0.1)';
                                    dueBadge = `<span style="color: #ef4444; font-size: 0.8rem;">⚠️ Просрочено ${Math.abs(daysLeft)} дн.</span>`;
                                } else if (daysLeft === 0) {
                                    statusColor = '#f59e0b';
                                    dueBadge = `<span style="color: #f59e0b; font-size: 0.8rem;">🔔 Сегодня</span>`;
                                } else if (daysLeft <= 3) {
                                    statusColor = '#f59e0b';
                                    dueBadge = `<span style="color: #f59e0b; font-size: 0.8rem;">📅 ${daysLeft} дн.</span>`;
                                } else {
                                    dueBadge = `<span style="color: var(--text-secondary); font-size: 0.8rem;">📅 ${new Date(task.dueDate).toLocaleDateString('ru-RU')}</span>`;
                                }
                            }
                            
                            return `
                                <div style="padding: 12px; background: ${statusBg}; border-left: 3px solid ${statusColor}; border-radius: 6px; margin-bottom: 10px;">
                                    <div style="display: flex; justify-content: space-between; align-items: start;">
                                        <div>
                                            <div style="font-weight: 600; margin-bottom: 4px;">${task.sectionName}</div>
                                            <div style="font-size: 0.85rem; color: var(--text-secondary);">${task.projectName}</div>
                                        </div>
                                        ${dueBadge}
                                    </div>
                                    <div style="margin-top: 8px;">
                                        <button class="btn-sm" onclick="window.openProjectDetails('${task.projectId}'); closeModal('engineer-tasks-modal');">
                                            Открыть проект
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `
            }
        </div>
    `;
    
    modal.style.display = 'flex';
}

// Quick assign engineer to section
export function openQuickAssignModal(projectId, sectionId) {
    const project = state.projects.find(p => p.id.toString() === projectId.toString());
    const section = project?.sections?.find(s => s.id === sectionId);
    if (!project || !section) return;
    
    const engineers = state.employees || [];
    
    let modal = document.getElementById('quick-assign-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'quick-assign-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <span class="close" onclick="closeModal('quick-assign-modal')">&times;</span>
            <h2>👷 Назначить исполнителя</h2>
            <p style="color: var(--text-secondary); margin-bottom: 15px;">${section.name}</p>
            
            <div style="display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto;">
                ${engineers.map(eng => {
                    const workload = getEngineersWorkload()[eng.name] || { total: 0 };
                    const isSelected = section.engineer === eng.name;
                    
                    return `
                        <button onclick="assignEngineer('${projectId}', '${sectionId}', '${eng.name}')" 
                            style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: ${isSelected ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)'}; border: 1px solid ${isSelected ? '#6366f1' : 'var(--glass-border)'}; border-radius: 8px; cursor: pointer; text-align: left; color: var(--text-primary);">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                                    ${eng.name.charAt(0)}
                                </div>
                                <div>
                                    <div style="font-weight: 600;">${eng.name}</div>
                                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${eng.position || 'Инженер'}</div>
                                </div>
                            </div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary);">
                                ${workload.total} задач
                            </div>
                        </button>
                    `;
                }).join('')}
            </div>
            
            ${section.engineer ? `
                <button onclick="assignEngineer('${projectId}', '${sectionId}', '')" 
                    style="width: 100%; margin-top: 15px; padding: 10px; background: rgba(239,68,68,0.1); border: 1px solid #ef4444; border-radius: 8px; color: #ef4444; cursor: pointer;">
                    ✖ Снять назначение
                </button>
            ` : ''}
        </div>
    `;
    
    modal.style.display = 'flex';
}

// Assign engineer to section
export function assignEngineer(projectId, sectionId, engineerName) {
    const project = state.projects.find(p => p.id.toString() === projectId.toString());
    const section = project?.sections?.find(s => s.id === sectionId);
    
    if (!section) return;
    
    section.engineer = engineerName;
    saveData();
    
    closeModal('quick-assign-modal');
    showToast(engineerName ? `✅ Назначен: ${engineerName}` : 'Назначение снято', 'success');
    
    // Re-render project
    if (window.renderProjectDetailsSafe) {
        window.renderProjectDetailsSafe(project);
    }
}

// Expose to window
window.showEngineerTasks = showEngineerTasks;
window.openQuickAssignModal = openQuickAssignModal;
window.assignEngineer = assignEngineer;
window.getEngineersWorkload = getEngineersWorkload;
window.renderEngineerWorkloadCards = renderEngineerWorkloadCards;
