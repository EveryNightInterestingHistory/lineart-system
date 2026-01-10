// Drag & Drop Module for Sections
// ================================

import { state, saveData, currentProjectId } from './state.js';
import { showToast } from './utils.js';

let draggedItem = null;
let draggedIndex = null;

// Initialize drag and drop for sections
export function initSectionDragDrop() {
    const container = document.getElementById('detail-sections-list');
    if (!container) return;
    
    const sections = container.querySelectorAll('.section-card');
    
    sections.forEach((section, index) => {
        section.setAttribute('draggable', 'true');
        section.dataset.index = index;
        
        section.addEventListener('dragstart', handleDragStart);
        section.addEventListener('dragend', handleDragEnd);
        section.addEventListener('dragover', handleDragOver);
        section.addEventListener('dragenter', handleDragEnter);
        section.addEventListener('dragleave', handleDragLeave);
        section.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    draggedItem = this;
    draggedIndex = parseInt(this.dataset.index);
    
    this.style.opacity = '0.5';
    this.classList.add('dragging');
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedIndex);
}

function handleDragEnd(e) {
    this.style.opacity = '1';
    this.classList.remove('dragging');
    
    // Remove all drag-over styles
    document.querySelectorAll('.section-card').forEach(section => {
        section.classList.remove('drag-over');
    });
    
    draggedItem = null;
    draggedIndex = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    if (this !== draggedItem) {
        this.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    this.classList.remove('drag-over');
    
    if (this === draggedItem) return;
    
    const fromIndex = draggedIndex;
    const toIndex = parseInt(this.dataset.index);
    
    // Reorder sections in project
    reorderSections(fromIndex, toIndex);
}

// Reorder sections in project data
function reorderSections(fromIndex, toIndex) {
    const projectId = currentProjectId;
    const project = state.projects.find(p => p.id.toString() === projectId.toString());
    
    if (!project || !project.sections) return;
    
    // Remove from old position
    const [movedSection] = project.sections.splice(fromIndex, 1);
    
    // Insert at new position
    project.sections.splice(toIndex, 0, movedSection);
    
    // Save and re-render
    saveData();
    
    // Re-render sections
    if (window.renderProjectDetailsSafe) {
        window.renderProjectDetailsSafe(project);
    }
    
    showToast('✅ Порядок разделов изменён', 'success');
}

// Add drag handle icon to section cards
export function addDragHandles() {
    const sections = document.querySelectorAll('.section-card');
    
    sections.forEach(section => {
        // Check if handle already exists
        if (section.querySelector('.drag-handle')) return;
        
        const handle = document.createElement('div');
        handle.className = 'drag-handle';
        handle.innerHTML = '⋮⋮';
        handle.title = 'Перетащите для изменения порядка';
        handle.style.cssText = `
            position: absolute;
            left: 8px;
            top: 50%;
            transform: translateY(-50%);
            cursor: grab;
            color: var(--text-secondary);
            font-size: 16px;
            opacity: 0.5;
            transition: opacity 0.2s;
            user-select: none;
        `;
        
        handle.addEventListener('mouseenter', () => handle.style.opacity = '1');
        handle.addEventListener('mouseleave', () => handle.style.opacity = '0.5');
        
        section.style.position = 'relative';
        section.style.paddingLeft = '30px';
        section.insertBefore(handle, section.firstChild);
    });
}

// CSS for drag states (inject once)
export function injectDragDropStyles() {
    if (document.getElementById('drag-drop-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'drag-drop-styles';
    style.textContent = `
        .section-card {
            transition: transform 0.2s, box-shadow 0.2s;
            cursor: move;
        }
        
        .section-card.dragging {
            transform: scale(1.02);
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            z-index: 1000;
        }
        
        .section-card.drag-over {
            border-color: var(--accent-primary) !important;
            background: rgba(99, 102, 241, 0.1) !important;
        }
        
        .drag-handle:active {
            cursor: grabbing;
        }
    `;
    document.head.appendChild(style);
}

// Initialize everything
export function initDragDrop() {
    injectDragDropStyles();
    
    // Delay to ensure DOM is ready
    setTimeout(() => {
        initSectionDragDrop();
        addDragHandles();
    }, 100);
}

// Expose to window
window.initDragDrop = initDragDrop;
window.initSectionDragDrop = initSectionDragDrop;
