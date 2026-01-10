// Before/After Gallery Comparison Module
// ======================================

import { state, saveData, currentProjectId } from './state.js';
import { showToast, closeModal } from './utils.js';

// Initialize gallery comparison for a project
export function initGalleryComparison(projectId) {
    const project = state.projects.find(p => p.id.toString() === projectId.toString());
    if (!project) return;
    
    // Ensure gallery structure
    if (!project.gallery) project.gallery = [];
    if (!project.galleryComparisons) project.galleryComparisons = [];
}

// Add comparison pair
export function addComparisonPair(projectId, beforeImageUrl, afterImageUrl, title = '') {
    const project = state.projects.find(p => p.id.toString() === projectId.toString());
    if (!project) return;
    
    if (!project.galleryComparisons) project.galleryComparisons = [];
    
    project.galleryComparisons.push({
        id: Date.now().toString(),
        before: beforeImageUrl,
        after: afterImageUrl,
        title: title || `Сравнение ${project.galleryComparisons.length + 1}`,
        createdAt: new Date().toISOString()
    });
    
    saveData();
    showToast('✅ Сравнение добавлено!', 'success');
}

// Render comparison slider
export function renderComparisonSlider(comparison) {
    return `
        <div class="comparison-container" style="position: relative; width: 100%; aspect-ratio: 16/10; overflow: hidden; border-radius: 12px; cursor: ew-resize;">
            <!-- After image (background) -->
            <div class="comparison-after" style="position: absolute; inset: 0;">
                <img src="${comparison.after}" alt="После" style="width: 100%; height: 100%; object-fit: cover;">
                <span style="position: absolute; bottom: 10px; right: 10px; background: rgba(16,185,129,0.9); color: white; padding: 4px 12px; border-radius: 4px; font-size: 0.8rem;">ПОСЛЕ</span>
            </div>
            
            <!-- Before image (overlay with clip) -->
            <div class="comparison-before" data-id="${comparison.id}" style="position: absolute; inset: 0; width: 50%; overflow: hidden;">
                <img src="${comparison.before}" alt="До" style="width: 200%; height: 100%; object-fit: cover;">
                <span style="position: absolute; bottom: 10px; left: 10px; background: rgba(239,68,68,0.9); color: white; padding: 4px 12px; border-radius: 4px; font-size: 0.8rem;">ДО</span>
            </div>
            
            <!-- Slider handle -->
            <div class="comparison-handle" data-id="${comparison.id}" style="position: absolute; top: 0; bottom: 0; left: 50%; width: 4px; background: white; box-shadow: 0 0 10px rgba(0,0,0,0.5); cursor: ew-resize; transform: translateX(-50%);">
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                    <span style="font-size: 14px;">⟷</span>
                </div>
            </div>
        </div>
        <div style="text-align: center; margin-top: 10px; color: var(--text-secondary); font-size: 0.9rem;">${comparison.title}</div>
    `;
}

// Initialize slider interactivity
export function initComparisonSliders() {
    document.querySelectorAll('.comparison-container').forEach(container => {
        let isDown = false;
        
        const onMove = (e) => {
            if (!isDown) return;
            
            const rect = container.getBoundingClientRect();
            const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
            const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
            
            const beforeDiv = container.querySelector('.comparison-before');
            const handle = container.querySelector('.comparison-handle');
            
            if (beforeDiv) beforeDiv.style.width = `${percent}%`;
            if (handle) handle.style.left = `${percent}%`;
        };
        
        container.addEventListener('mousedown', () => isDown = true);
        container.addEventListener('touchstart', () => isDown = true);
        document.addEventListener('mouseup', () => isDown = false);
        document.addEventListener('touchend', () => isDown = false);
        container.addEventListener('mousemove', onMove);
        container.addEventListener('touchmove', onMove);
    });
}

// Render gallery with comparisons section
export function renderGalleryWithComparisons(project) {
    const comparisons = project.galleryComparisons || [];
    
    if (comparisons.length === 0) {
        return `
            <div style="text-align: center; color: var(--text-secondary); padding: 30px;">
                <p>Нет сравнений "До/После"</p>
                <button class="btn-secondary" onclick="openAddComparisonModal('${project.id}')" style="margin-top: 10px;">
                    + Добавить сравнение
                </button>
            </div>
        `;
    }
    
    return `
        <div style="display: grid; gap: 20px;">
            ${comparisons.map(comp => `
                <div class="comparison-card" style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; border: 1px solid var(--glass-border);">
                    ${renderComparisonSlider(comp)}
                    <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
                        <button class="btn-delete-icon" onclick="deleteComparison('${project.id}', '${comp.id}')" title="Удалить">🗑</button>
                    </div>
                </div>
            `).join('')}
        </div>
        <div style="text-align: center; margin-top: 15px;">
            <button class="btn-secondary" onclick="openAddComparisonModal('${project.id}')">
                + Добавить сравнение
            </button>
        </div>
    `;
}

// Open modal to add comparison
export function openAddComparisonModal(projectId) {
    let modal = document.getElementById('add-comparison-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'add-comparison-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <span class="close" onclick="closeModal('add-comparison-modal')">&times;</span>
            <h2>📷 Добавить сравнение До/После</h2>
            
            <form id="add-comparison-form" onsubmit="event.preventDefault(); submitComparison('${projectId}');">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: var(--text-secondary);">Название</label>
                    <input type="text" id="comparison-title" placeholder="Например: Фасад здания" 
                        style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-primary);">
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: var(--text-secondary);">Фото "До"</label>
                        <div class="upload-zone" id="before-upload" style="border: 2px dashed var(--glass-border); border-radius: 8px; padding: 30px; text-align: center; cursor: pointer;">
                            <input type="file" id="before-file" accept="image/*" style="display: none;" onchange="previewComparisonImage('before', this)">
                            <div id="before-preview" style="display: none;"></div>
                            <div id="before-placeholder">
                                <span style="font-size: 2rem;">📷</span>
                                <p style="color: var(--text-secondary); margin-top: 5px;">ДО</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: var(--text-secondary);">Фото "После"</label>
                        <div class="upload-zone" id="after-upload" style="border: 2px dashed var(--glass-border); border-radius: 8px; padding: 30px; text-align: center; cursor: pointer;">
                            <input type="file" id="after-file" accept="image/*" style="display: none;" onchange="previewComparisonImage('after', this)">
                            <div id="after-preview" style="display: none;"></div>
                            <div id="after-placeholder">
                                <span style="font-size: 2rem;">📷</span>
                                <p style="color: var(--text-secondary); margin-top: 5px;">ПОСЛЕ</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <button type="submit" class="btn-primary" style="width: 100%;">✅ Добавить сравнение</button>
            </form>
        </div>
    `;
    
    modal.style.display = 'flex';
    
    // Add click handlers for upload zones
    setTimeout(() => {
        document.getElementById('before-upload').onclick = () => document.getElementById('before-file').click();
        document.getElementById('after-upload').onclick = () => document.getElementById('after-file').click();
    }, 100);
}

// Preview image in upload zone
export function previewComparisonImage(type, input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById(`${type}-preview`);
        const placeholder = document.getElementById(`${type}-placeholder`);
        
        preview.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 120px; border-radius: 4px;">`;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

// Submit comparison
export async function submitComparison(projectId) {
    const title = document.getElementById('comparison-title').value;
    const beforeFile = document.getElementById('before-file').files[0];
    const afterFile = document.getElementById('after-file').files[0];
    
    if (!beforeFile || !afterFile) {
        showToast('Загрузите оба изображения', 'warning');
        return;
    }
    
    // Convert to base64 for storage (simplified - in production use server upload)
    const beforeUrl = await fileToBase64(beforeFile);
    const afterUrl = await fileToBase64(afterFile);
    
    addComparisonPair(projectId, beforeUrl, afterUrl, title);
    closeModal('add-comparison-modal');
    
    // Re-render gallery
    if (window.renderProjectDetailsSafe) {
        const project = state.projects.find(p => p.id.toString() === projectId.toString());
        if (project) window.renderProjectDetailsSafe(project);
    }
}

// Delete comparison
export function deleteComparison(projectId, comparisonId) {
    const project = state.projects.find(p => p.id.toString() === projectId.toString());
    if (!project || !project.galleryComparisons) return;
    
    project.galleryComparisons = project.galleryComparisons.filter(c => c.id !== comparisonId);
    saveData();
    
    // Re-render
    if (window.renderProjectDetailsSafe) {
        window.renderProjectDetailsSafe(project);
    }
    
    showToast('Сравнение удалено', 'info');
}

// Helper: file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Expose to window
window.openAddComparisonModal = openAddComparisonModal;
window.previewComparisonImage = previewComparisonImage;
window.submitComparison = submitComparison;
window.deleteComparison = deleteComparison;
window.initComparisonSliders = initComparisonSliders;
window.renderGalleryWithComparisons = renderGalleryWithComparisons;
