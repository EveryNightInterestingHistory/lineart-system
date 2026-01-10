// Auto-Assignment Module
// ======================

import { state, saveData } from './state.js';
import { showToast, closeModal } from './utils.js';

// Get engineer workload
export function getEngineerWorkload() {
    const workload = {};
    
    // Initialize all engineers
    (state.employees || []).forEach(emp => {
        workload[emp.name] = {
            name: emp.name,
            position: emp.position || 'Инженер',
            totalSections: 0,
            activeSections: 0,
            overdueSections: 0,
            estimatedHours: 0,
            projects: new Set()
        };
    });
    
    // Count sections
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    state.projects.forEach(project => {
        if (project.status === 'archive' || project.status === 'completed') return;
        
        (project.sections || []).forEach(section => {
            if (!section.engineer || !workload[section.engineer]) return;
            
            const w = workload[section.engineer];
            w.totalSections++;
            w.projects.add(project.id);
            
            if (section.status === 'in-progress' || section.status === 'on-review') {
                w.activeSections++;
                
                // Estimate hours based on complexity (simple estimate)
                w.estimatedHours += 8; // Default 8 hours per active section
            }
            
            if (section.dueDate) {
                const due = new Date(section.dueDate);
                if (due < today && section.status !== 'accepted') {
                    w.overdueSections++;
                }
            }
        });
    });
    
    // Convert Sets to counts
    Object.values(workload).forEach(w => {
        w.projectCount = w.projects.size;
        delete w.projects;
    });
    
    return workload;
}

// Find best engineer for a section
export function findBestEngineer(sectionName = '', excludeEngineers = []) {
    const workload = getEngineerWorkload();
    const engineers = Object.values(workload).filter(e => !excludeEngineers.includes(e.name));
    
    if (engineers.length === 0) return null;
    
    // Sort by active sections (least busy first), then by overdue (least overdue first)
    engineers.sort((a, b) => {
        // Prefer engineers with no overdue sections
        if (a.overdueSections !== b.overdueSections) {
            return a.overdueSections - b.overdueSections;
        }
        // Then by active sections
        return a.activeSections - b.activeSections;
    });
    
    return engineers[0];
}

// Auto-assign section to least busy engineer
export function autoAssignSection(projectId, sectionId) {
    const project = state.projects.find(p => p.id.toString() === projectId.toString());
    const section = project?.sections?.find(s => s.id === sectionId);
    
    if (!section) {
        showToast('Раздел не найден', 'error');
        return null;
    }
    
    const bestEngineer = findBestEngineer(section.name);
    
    if (!bestEngineer) {
        showToast('Нет доступных инженеров', 'warning');
        return null;
    }
    
    section.engineer = bestEngineer.name;
    saveData();
    
    showToast(`✅ Назначен: ${bestEngineer.name}`, 'success');
    
    // Log activity
    if (window.logActivity) {
        window.logActivity('engineer_assigned', {
            projectName: project.name,
            details: `${section.name} → ${bestEngineer.name}`
        });
    }
    
    return bestEngineer;
}

// Auto-assign all unassigned sections in a project
export function autoAssignProject(projectId) {
    const project = state.projects.find(p => p.id.toString() === projectId.toString());
    if (!project || !project.sections) return;
    
    let assigned = 0;
    const excluded = [];
    
    project.sections.forEach(section => {
        if (!section.engineer) {
            const best = findBestEngineer(section.name, []);
            if (best) {
                section.engineer = best.name;
                assigned++;
            }
        }
    });
    
    if (assigned > 0) {
        saveData();
        showToast(`✅ Назначено ${assigned} разделов`, 'success');
    } else {
        showToast('Все разделы уже назначены', 'info');
    }
    
    return assigned;
}

// Render workload comparison for assignment
export function renderWorkloadComparison() {
    const workload = getEngineerWorkload();
    const engineers = Object.values(workload);
    
    if (engineers.length === 0) {
        return '<p style="color: var(--text-secondary);">Нет инженеров в системе</p>';
    }
    
    const maxActive = Math.max(...engineers.map(e => e.activeSections), 1);
    
    return `
        <div style="display: flex; flex-direction: column; gap: 10px;">
            ${engineers.sort((a, b) => a.activeSections - b.activeSections).map(eng => {
                const percent = (eng.activeSections / maxActive) * 100;
                const color = eng.overdueSections > 0 ? 'var(--accent-danger)' : 
                              eng.activeSections > 5 ? 'var(--accent-warning)' : 'var(--accent-success)';
                
                return `
                    <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; border: 1px solid var(--glass-border);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <div>
                                <span style="font-weight: 600;">${eng.name}</span>
                                <span style="color: var(--text-secondary); font-size: 0.8rem;"> (${eng.position})</span>
                            </div>
                            <div style="text-align: right;">
                                <span style="font-weight: 700; color: ${color};">${eng.activeSections}</span>
                                <span style="color: var(--text-secondary); font-size: 0.8rem;"> активных</span>
                            </div>
                        </div>
                        <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                            <div style="height: 100%; width: ${percent}%; background: ${color}; border-radius: 3px;"></div>
                        </div>
                        <div style="display: flex; gap: 15px; margin-top: 8px; font-size: 0.75rem; color: var(--text-secondary);">
                            <span>📁 ${eng.projectCount} проектов</span>
                            <span>📋 ${eng.totalSections} всего</span>
                            ${eng.overdueSections > 0 ? `<span style="color: var(--accent-danger);">⚠️ ${eng.overdueSections} просрочено</span>` : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Open auto-assign modal
export function openAutoAssignModal(projectId) {
    const project = state.projects.find(p => p.id.toString() === projectId.toString());
    if (!project) return;
    
    const unassigned = (project.sections || []).filter(s => !s.engineer);
    
    let modal = document.getElementById('auto-assign-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'auto-assign-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <span class="close" onclick="closeModal('auto-assign-modal')">&times;</span>
            <h2>🤖 Автоназначение</h2>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">
                Проект: <strong>${project.name}</strong><br>
                Неназначенных разделов: <strong>${unassigned.length}</strong>
            </p>
            
            <h3 style="font-size: 1rem; margin-bottom: 15px;">📊 Загруженность инженеров</h3>
            ${renderWorkloadComparison()}
            
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button class="btn-primary" onclick="autoAssignProject('${projectId}'); closeModal('auto-assign-modal'); if(window.renderProjectDetailsSafe) window.renderProjectDetailsSafe(state.projects.find(p=>p.id=='${projectId}'));" ${unassigned.length === 0 ? 'disabled style="opacity: 0.5;"' : ''}>
                    🤖 Назначить автоматически
                </button>
                <button class="btn-secondary" onclick="closeModal('auto-assign-modal')">Отмена</button>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

// Expose to window
window.autoAssignSection = autoAssignSection;
window.autoAssignProject = autoAssignProject;
window.openAutoAssignModal = openAutoAssignModal;
window.findBestEngineer = findBestEngineer;
window.getEngineerWorkload = getEngineerWorkload;
window.renderWorkloadComparison = renderWorkloadComparison;
