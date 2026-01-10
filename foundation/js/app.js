import { Viewer } from './Viewer.js';

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('canvas-container');
    const viewer = new Viewer(container);

    // Inputs
    const inputWidth = document.getElementById('width');
    const inputLength = document.getElementById('length');
    const inputHeight = document.getElementById('height');
    const inputGrid = document.getElementById('show-grid');
    const inputTransparent = document.getElementById('transparent');

    function update() {
        const w = parseFloat(inputWidth.value) || 1000;
        const l = parseFloat(inputLength.value) || 1000;
        const h = parseFloat(inputHeight.value) || 500;
        const transparent = inputTransparent.checked;

        viewer.updateFoundation(w, l, h, transparent);
    }

    inputWidth.addEventListener('input', update);
    inputLength.addEventListener('input', update);
    inputHeight.addEventListener('input', update);
    inputTransparent.addEventListener('change', update);

    inputGrid.addEventListener('change', (e) => {
        viewer.setGridVisibility(e.target.checked);
    });

    // Toolbar Buttons
    document.getElementById('btn-view-top').addEventListener('click', () => viewer.setView('top'));
    document.getElementById('btn-view-3d').addEventListener('click', () => viewer.setView('3d'));

    // Handle tool activation (visual only for now)
    const toolBtns = document.querySelectorAll('.tool-btn');
    toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Only toggle active state for tool group, not view buttons
            if (btn.id.startsWith('btn-view')) return;

            toolBtns.forEach(b => {
                if (!b.id.startsWith('btn-view')) b.classList.remove('active');
            });
            btn.classList.add('active');
        });
    });

    // Initial update
    update();
});
