// Project Templates Module
// =========================

import { state, saveData } from './state.js';
import { showToast, openModal, closeModal } from './utils.js';

// Initialize templates storage
export function initTemplates() {
    if (!state.templates) {
        state.templates = [];
    }
}

// Get all templates
export function getTemplates() {
    initTemplates();
    return state.templates;
}

// Save current project as template
export function saveAsTemplate(projectId, templateName) {
    const project = state.projects.find(p => p.id.toString() === projectId.toString());
    if (!project) {
        showToast('Проект не найден', 'error');
        return false;
    }
    
    initTemplates();
    
    const template = {
        id: Date.now().toString(),
        name: templateName || `Шаблон: ${project.name}`,
        createdAt: new Date().toISOString(),
        baseProject: project.name,
        sections: (project.sections || []).map(s => ({
            name: s.name,
            engineer: '', // Don't copy engineer assignment
            dueDate: null,
            files: []
        })),
        description: project.description || '',
        defaultPriority: project.priority || 'medium',
        defaultTags: project.tags || []
    };
    
    state.templates.push(template);
    saveData();
    
    showToast('✅ Шаблон сохранён!', 'success');
    return template.id;
}

// Create project from template
export function createProjectFromTemplate(templateId, callback) {
    initTemplates();
    const template = state.templates.find(t => t.id === templateId);
    
    if (!template) {
        showToast('Шаблон не найден', 'error');
        return null;
    }
    
    // Return template data for project creation form
    return {
        sections: template.sections.map(s => ({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            name: s.name,
            engineer: '',
            files: [],
            status: 'in-progress'
        })),
        description: template.description,
        priority: template.defaultPriority,
        tags: template.defaultTags
    };
}

// Delete template
export function deleteTemplate(templateId) {
    initTemplates();
    state.templates = state.templates.filter(t => t.id !== templateId);
    saveData();
    showToast('Шаблон удалён', 'info');
}

// Render templates list for selection
export function renderTemplatesList() {
    initTemplates();
    
    if (state.templates.length === 0) {
        return '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">Нет сохранённых шаблонов</div>';
    }
    
    return state.templates.map(t => `
        <div class="template-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 10px; border: 1px solid var(--glass-border);">
            <div>
                <div style="font-weight: 600; margin-bottom: 4px;">${t.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">
                    ${t.sections.length} разделов • ${new Date(t.createdAt).toLocaleDateString('ru-RU')}
                </div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="btn-sm" onclick="useTemplate('${t.id}')">Использовать</button>
                <button class="btn-delete-icon" onclick="deleteTemplate('${t.id}')" title="Удалить">🗑</button>
            </div>
        </div>
    `).join('');
}

// Open template selection modal
export function openTemplateModal() {
    const modal = document.getElementById('template-modal');
    if (!modal) return;
    
    const content = modal.querySelector('.modal-content');
    content.innerHTML = `
        <span class="close" onclick="closeModal('template-modal')">&times;</span>
        <h2>📋 Шаблоны проектов</h2>
        
        <div style="margin-bottom: 20px;">
            ${renderTemplatesList()}
        </div>
        
        <div style="border-top: 1px solid var(--glass-border); padding-top: 15px;">
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 10px;">
                💡 Чтобы создать шаблон, откройте проект и нажмите "Сохранить как шаблон" в меню.
            </p>
        </div>
    `;
    
    modal.style.display = 'flex';
}

// Open save as template dialog
export function openSaveTemplateDialog(projectId) {
    const project = state.projects.find(p => p.id.toString() === projectId.toString());
    if (!project) return;
    
    const modal = document.getElementById('save-template-modal');
    if (!modal) {
        // Create modal dynamically
        const newModal = document.createElement('div');
        newModal.id = 'save-template-modal';
        newModal.className = 'modal';
        newModal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <span class="close" onclick="closeModal('save-template-modal')">&times;</span>
                <h2>💾 Сохранить как шаблон</h2>
                
                <form id="save-template-form" onsubmit="event.preventDefault(); confirmSaveTemplate();">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: var(--text-secondary);">Название шаблона</label>
                        <input type="text" id="template-name-input" value="Шаблон: ${project.name}" 
                            style="width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary);">
                    </div>
                    
                    <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                        <div style="font-size: 0.85rem; color: var(--text-secondary);">Будет сохранено:</div>
                        <ul style="margin: 8px 0 0 20px; font-size: 0.9rem;">
                            <li>${project.sections?.length || 0} разделов</li>
                            <li>Описание проекта</li>
                            <li>Приоритет и теги</li>
                        </ul>
                    </div>
                    
                    <input type="hidden" id="template-project-id" value="${projectId}">
                    
                    <button type="submit" class="btn-primary" style="width: 100%;">💾 Сохранить шаблон</button>
                </form>
            </div>
        `;
        document.body.appendChild(newModal);
    }
    
    document.getElementById('save-template-modal').style.display = 'flex';
}

// Confirm save template
export function confirmSaveTemplate() {
    const projectId = document.getElementById('template-project-id').value;
    const templateName = document.getElementById('template-name-input').value;
    
    if (saveAsTemplate(projectId, templateName)) {
        closeModal('save-template-modal');
    }
}

// Use template to pre-fill new project
export function useTemplate(templateId) {
    const templateData = createProjectFromTemplate(templateId);
    if (!templateData) return;
    
    closeModal('template-modal');
    
    // Store template data for new project form
    window.pendingTemplateData = templateData;
    
    // Open new project modal
    if (window.openNewProjectModal) {
        window.openNewProjectModal();
    }
    
    showToast('📋 Шаблон применён к новому проекту', 'info');
}

// Expose to window
window.saveAsTemplate = saveAsTemplate;
window.deleteTemplate = deleteTemplate;
window.openTemplateModal = openTemplateModal;
window.openSaveTemplateDialog = openSaveTemplateDialog;
window.confirmSaveTemplate = confirmSaveTemplate;
window.useTemplate = useTemplate;
