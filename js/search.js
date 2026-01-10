
import { state } from './state.js';
import { openProjectDetails } from './projects.js';
import { openClientDetailsPage, openEngineerDetailsPage } from './persons.js';
import { formatMoney, getStatusName } from './utils.js';

export class SearchManager {
    constructor() {
        this.isOpen = false;
        this.selectedIndex = 0;
        this.results = [];
        this.init();
    }

    init() {
        this.injectModal();
        this.bindEvents();
    }

    injectModal() {
        const modalHtml = `
            <div id="global-search-modal" class="search-modal" style="display: none;">
                <div class="search-content">
                    <div class="search-header">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input type="text" id="global-search-input" placeholder="Поиск проектов, клиентов, инженеров..." autocomplete="off">
                        <span class="search-hint">ESC для выхода</span>
                    </div>
                    <div id="global-search-results" class="search-results">
                        <!-- Results go here -->
                        <div class="search-empty-state">Начните вводить текст для поиска...</div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.modal = document.getElementById('global-search-modal');
        this.input = document.getElementById('global-search-input');
        this.resultsContainer = document.getElementById('global-search-results');
    }

    bindEvents() {
        // Toggle keydown
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.toggle();
            }
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
            if (this.isOpen) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.moveSelection(1);
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.moveSelection(-1);
                }
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.selectResult();
                }
            }
        });

        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        // Input handling
        this.input.addEventListener('input', (e) => this.handleSearch(e.target.value));
    }

    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    }

    open() {
        this.isOpen = true;
        this.modal.style.display = 'flex';
        this.input.focus();
        this.input.value = '';
        this.results = [];
        this.renderResults();
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.isOpen = false;
        this.modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    handleSearch(query) {
        if (!query.trim()) {
            this.results = [];
            this.renderResults();
            return;
        }

        const term = query.toLowerCase();
        this.results = [];

        // Search Projects
        state.projects.forEach(p => {
            if (p.name.toLowerCase().includes(term) || (p.address && p.address.toLowerCase().includes(term))) {
                this.results.push({
                    type: 'project',
                    id: p.id,
                    title: p.name,
                    subtitle: p.address || 'Нет адреса',
                    status: p.status,
                    metadata: formatMoney(p.amount, p.currency)
                });
            }
        });

        // Search Clients
        state.clients.forEach(c => {
            if (c.name.toLowerCase().includes(term) || (c.phone && c.phone.includes(term))) {
                this.results.push({
                    type: 'client',
                    id: c.id,
                    title: c.name,
                    subtitle: c.phone || 'Нет телефона',
                    metadata: 'Клиент'
                });
            }
        });

        // Search Engineers
        state.employees.forEach(e => {
            if (e.name.toLowerCase().includes(term)) {
                this.results.push({
                    type: 'engineer',
                    id: e.id,
                    title: e.name,
                    subtitle: e.position || 'Инженер',
                    metadata: 'Сотрудник'
                });
            }
        });

        this.selectedIndex = 0;
        this.renderResults();
    }

    renderResults() {
        if (this.results.length === 0) {
            const query = this.input.value;
            this.resultsContainer.innerHTML = query
                ? '<div class="search-empty-state">Ничего не найдено</div>'
                : '<div class="search-empty-state">Начните вводить текст для поиска...</div>';
            return;
        }

        this.resultsContainer.innerHTML = this.results.map((item, index) => `
            <div class="search-result-item ${index === this.selectedIndex ? 'selected' : ''}" data-index="${index}">
                <div class="result-icon ${item.type}">
                    ${this.getIconForType(item.type)}
                </div>
                <div class="result-info">
                    <div class="result-title">${item.title}</div>
                    <div class="result-subtitle">${item.subtitle}</div>
                </div>
                <div class="result-meta">
                    ${item.status ? `<span class="status-badge status-${item.status} mini">${getStatusName(item.status)}</span>` : ''}
                    <span class="meta-text">${item.metadata}</span>
                </div>
            </div>
        `).join('');

        // Add click listeners
        this.resultsContainer.querySelectorAll('.search-result-item').forEach(el => {
            el.addEventListener('click', () => {
                this.selectedIndex = parseInt(el.dataset.index);
                this.selectResult();
            });
            el.addEventListener('mousemove', () => {
                this.selectedIndex = parseInt(el.dataset.index);
                this.updateSelection();
            });
        });
    }

    getIconForType(type) {
        if (type === 'project') return '🏠';
        if (type === 'client') return '👤';
        if (type === 'engineer') return '👷';
        return '📄';
    }

    moveSelection(direction) {
        if (this.results.length === 0) return;
        this.selectedIndex = (this.selectedIndex + direction + this.results.length) % this.results.length;
        this.updateSelection();
        this.ensureVisible();
    }

    updateSelection() {
        const items = this.resultsContainer.querySelectorAll('.search-result-item');
        items.forEach((el, idx) => {
            if (idx === this.selectedIndex) el.classList.add('selected');
            else el.classList.remove('selected');
        });
    }

    ensureVisible() {
        const selected = this.resultsContainer.querySelector('.selected');
        if (selected) {
            selected.scrollIntoView({ block: 'nearest' });
        }
    }

    selectResult() {
        if (this.results.length === 0) return;
        const item = this.results[this.selectedIndex];

        switch (item.type) {
            case 'project':
                openProjectDetails(item.id);
                break;
            case 'client':
                openClientDetailsPage(item.id);
                break;
            case 'engineer':
                openEngineerDetailsPage(item.id);
                break;
        }
        this.close();
    }
}
