
import { state, currentProjectId } from './state.js';
import { showToast, openModal, closeModal } from './utils.js';
import { saveData } from './state.js';

// --- Менеджер Карты (Map Manager) ---
export const MapManager = {
    map: null,
    drawLayer: null, // LayerGroup for drawing elements
    projectLayer: null, // LayerGroup for saved elements

    state: {
        mode: 'view', // 'view', 'marker', 'contour'
        isEditing: false, // Overall edit mode state
        isFullscreen: false,
        markers: [], // Temporary markers for contour
        polyline: null, // Temporary polyline for contour
        projectId: null
    },

    // Initialization
    init(project) {
        if (!project) return;
        this.state.projectId = project.id;

        // Reset state on init
        this.state.isEditing = false;
        this.state.mode = 'view';
        this.state.isFullscreen = false;

        // Ensure fullscreen classes are removed
        const wrapper = document.getElementById('map-wrapper');
        if (wrapper) {
            wrapper.classList.remove('fullscreen');
            // Cleanup parent view class
            const parentView = wrapper.closest('.view');
            if (parentView) parentView.classList.remove('view-fullscreen-active');
        }
        document.body.classList.remove('map-fullscreen-active');

        console.log('MapManager.init started for project', project.id);

        const mapElementId = 'project-map';
        if (!document.getElementById(mapElementId)) return;

        // Cleanup existing map
        if (this.map) {
            this.map.remove();
            this.map = null;
        }

        // Coordinates (Default Tashkent or Project Location)
        const lat = project.lat || 41.2995;
        const lng = project.lng || 69.2401;
        const zoom = project.lat ? 17 : 13;

        // Create Map
        this.map = L.map(mapElementId, {
            zoomControl: false, // We use custom zoom or scroll
            attributionControl: false,
            maxZoom: 18 // Restrict global zoom to prevent grey screen
        }).setView([lat, lng], zoom);

        L.control.attribution({ prefix: false }).addTo(this.map);

        // Layers
        // maxNativeZoom allows zooming past the available tiles (digital zoom)
        const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            maxNativeZoom: 19
        });
        const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            maxNativeZoom: 17 // ArcGIS usually good up to 17/18, digital zoom after that
        });

        osm.addTo(this.map);

        // Layer Control
        L.control.layers({ "Схема": osm, "Спутник": satellite }, null, { position: 'topright' }).addTo(this.map);
        L.control.zoom({ position: 'bottomright' }).addTo(this.map);

        // Feature Groups
        this.projectLayer = L.layerGroup().addTo(this.map);
        this.drawLayer = L.layerGroup().addTo(this.map);

        // Render Data
        this.renderProjectData(project);

        // Events
        this.map.on('click', (e) => this.handleClick(e));

        // Right-Click to Undo (Context Menu)
        this.map.on('contextmenu', (e) => {
            if (this.state.mode === 'contour') {
                this.undoLastPoint();
            }
        });

        // Fix Render issues
        setTimeout(() => this.map.invalidateSize(), 200);

        this.updateUI();
    },

    // Render Project Elements
    renderProjectData(project) {
        this.projectLayer.clearLayers();

        // 1. Marker
        if (project.lat && project.lng) {
            const marker = L.marker([project.lat, project.lng], {
                draggable: this.state.isEditing,
                icon: L.divIcon({
                    className: 'custom-project-marker',
                    html: `<div style="background: var(--accent-primary); width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);"></div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            });

            if (marker.dragging) {
                if (this.state.isEditing) {
                    marker.dragging.enable();
                } else {
                    marker.dragging.disable();
                }
            }

            marker.bindTooltip(project.name || 'Объект', { direction: 'top', offset: [0, -20] });
            marker.addTo(this.projectLayer);

            marker.on('dragend', (e) => {
                if (this.state.isEditing) {
                    const ll = e.target.getLatLng();
                    this.updateProjectCoordinates(ll.lat, ll.lng);
                }
            });
        }

        // 2. Contour
        if (project.contour && project.contour.length > 0) {
            L.polygon(project.contour, {
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.2,
                weight: 2
            }).addTo(this.projectLayer);

            // Calculate Area
            const area = this.calculateArea(project.contour.map(p => ({ lat: p[0], lng: p[1] })));
            this.updateAreaDisplay(area);
        } else {
            this.updateAreaDisplay(0);
        }
    },

    // Interaction Switcher
    startEdit() {
        this.state.isEditing = true;
        this.renderProjectData(state.projects.find(p => p.id.toString() === this.state.projectId.toString()));
        this.updateUI();
        showToast('Режим редактирования (beta)', 'info');
    },

    cancelEdit() {
        this.state.isEditing = false;
        this.resetInternalState();
        this.renderProjectData(state.projects.find(p => p.id.toString() === this.state.projectId.toString()));
        this.updateUI();
    },

    save() {
        // If we were drawing a contour, save it
        if (this.state.mode === 'contour') {
            if (this.state.markers.length < 3) {
                showToast('Контур должен содержать минимум 3 точки', 'warning');
                return;
            }
            const coords = this.state.markers.map(m => [m.getLatLng().lat, m.getLatLng().lng]);
            this.updateProjectContour(coords);
            showToast('Контур сохранен', 'success');
        }

        saveData();

        this.state.isEditing = false;
        this.resetInternalState();
        this.renderProjectData(state.projects.find(p => p.id.toString() === this.state.projectId.toString()));
        this.updateUI();
    },

    // Mode Switching within Edit
    setMode(mode) {
        if (!this.state.isEditing) return;

        console.log('Setting mode to:', mode);
        this.state.mode = mode;
        this.resetInternalState();

        if (mode === 'contour') {
            showToast('Кликайте по карте для создания точек', 'info');
        } else if (mode === 'marker') {
            showToast('Кликните для установки метки', 'info');
        }

        this.updateUI();
    },

    resetInternalState() {
        console.log('Resetting internal state (clearing drawing layers)');
        this.state.markers = [];
        this.state.polyline = null;
        if (this.drawLayer) this.drawLayer.clearLayers();
    },

    // Map Click Handler
    handleClick(e) {
        if (!this.state.isEditing) return;
        console.log('Map click processed:', e.latlng, this.state.mode);

        if (this.state.mode === 'marker') {
            this.updateProjectCoordinates(e.latlng.lat, e.latlng.lng);
            this.renderProjectData({ ...state.projects.find(p => p.id.toString() === this.state.projectId.toString()), lat: e.latlng.lat, lng: e.latlng.lng });
        }
        else if (this.state.mode === 'contour') {
            this.addContourPoint(e.latlng);
        }
    },

    // Contour Logic
    addContourPoint(latlng) {
        const marker = L.marker(latlng, {
            icon: L.divIcon({
                className: 'vertex-marker',
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            }),
            draggable: true
        }).addTo(this.drawLayer);

        marker.on('drag', () => this.updateContourVisuals());
        marker.on('contextmenu', () => {
            this.drawLayer.removeLayer(marker);
            this.state.markers = this.state.markers.filter(m => m !== marker);
            this.updateContourVisuals();
        });

        this.state.markers.push(marker);
        this.updateContourVisuals();
    },

    undoLastPoint() {
        if (this.state.markers.length > 0) {
            const m = this.state.markers.pop();
            this.drawLayer.removeLayer(m);
            this.updateContourVisuals();
        }
    },

    clear() {
        if (this.state.mode === 'contour') {
            this.state.markers = [];
            this.drawLayer.clearLayers();
            this.updateContourVisuals();
        } else if (this.state.mode === 'marker') {
            this.updateProjectCoordinates(null, null);
            this.renderProjectData(state.projects.find(p => p.id.toString() === this.state.projectId.toString()));
        }
    },

    updateContourVisuals() {
        const latlngs = this.state.markers.map(m => m.getLatLng());

        if (this.state.polyline) this.state.polyline.remove();

        if (latlngs.length > 0) {
            this.state.polyline = L.polygon(latlngs, {
                color: 'var(--accent-primary)',
                dashArray: '5, 10',
                fillColor: 'var(--accent-primary)',
                fillOpacity: 0.1
            }).addTo(this.drawLayer);
        }

        if (latlngs.length > 2) {
            const area = this.calculateArea(latlngs);
            this.updateAreaDisplay(area, true);
        }
    },

    // UI Updates
    updateUI() {
        const viewDock = document.getElementById('map-view-dock');
        const editDock = document.getElementById('map-edit-dock');

        if (this.state.isEditing) {
            if (viewDock) viewDock.style.display = 'none';
            if (editDock) editDock.style.display = 'flex';
        } else {
            if (viewDock) viewDock.style.display = 'flex';
            if (editDock) editDock.style.display = 'none';
        }

        const btnMarker = document.getElementById('btn-add-marker');
        const btnContour = document.getElementById('btn-draw-contour');

        if (btnMarker) btnMarker.classList.toggle('active', this.state.mode === 'marker');
        if (btnContour) btnContour.classList.toggle('active', this.state.mode === 'contour');

        const mapDiv = document.getElementById('project-map');
        if (mapDiv) {
            mapDiv.style.cursor = (this.state.mode === 'marker' || this.state.mode === 'contour') ? 'crosshair' : 'grab';
        }

        const toast = document.getElementById('map-instruction-toast');
        if (toast) toast.style.display = 'none';
    },

    updateProjectCoordinates(lat, lng) {
        const p = state.projects.find(x => x.id.toString() === this.state.projectId.toString());
        if (p) {
            if (lat === null) { delete p.lat; delete p.lng; }
            else { p.lat = lat; p.lng = lng; }
        }
    },

    updateProjectContour(coords) {
        const p = state.projects.find(x => x.id.toString() === this.state.projectId.toString());
        if (p) p.contour = coords;
    },

    calculateArea(coords) {
        let area = 0;
        const R = 6378137;
        if (coords.length < 3) return 0;
        for (let i = 0; i < coords.length; i++) {
            const p1 = coords[i];
            const p2 = coords[(i + 1) % coords.length];
            area += ((p2.lng - p1.lng) * Math.PI / 180) *
                (2 + Math.sin(p1.lat * Math.PI / 180) + Math.sin(p2.lat * Math.PI / 180));
        }
        return Math.abs(area * R * R / 2);
    },

    calculatePerimeter(coords) {
        let perimeter = 0;
        if (coords.length < 2) return 0;
        for (let i = 0; i < coords.length; i++) {
            const p1 = coords[i];
            const p2 = coords[(i + 1) % coords.length];
            const dist = L.latLng(p1.lat, p1.lng).distanceTo(L.latLng(p2.lat, p2.lng));
            perimeter += dist;
        }
        return perimeter;
    },

    updateAreaDisplay(area, isDraft = false) {
        const el = document.getElementById('map-info-area');
        if (el) {
            if (area > 0) {
                el.style.display = 'block';

                let perimeter = 0;
                let latlngs = [];

                if (this.state.isEditing && this.state.markers.length > 0) {
                    latlngs = this.state.markers.map(m => ({ lat: m.getLatLng().lat, lng: m.getLatLng().lng }));
                } else if (!this.state.isEditing && this.state.projectId) {
                    const p = state.projects.find(x => x.id.toString() === this.state.projectId.toString());
                    if (p && p.contour) {
                        latlngs = p.contour.map(c => ({ lat: c[0], lng: c[1] }));
                    }
                }

                if (latlngs.length > 2) {
                    perimeter = this.calculatePerimeter(latlngs);
                }

                const m2 = Math.round(area).toLocaleString() + ' м²';
                const km2 = (area / 1000000).toFixed(4) + ' км²';
                const ha = (area / 10000).toFixed(2) + ' га';
                const perimText = Math.round(perimeter).toLocaleString() + ' м';

                el.innerHTML = `
                    <div style="font-weight:600; font-size:1.1em">${ha}</div>
                    <div style="font-size:0.85em; opacity:0.9; margin-top:2px">${m2} • ${km2}</div>
                    <div style="font-size:0.8em; opacity:0.7; margin-top:2px">Периметр: ${perimText}</div>
                `;
            } else {
                if (!isDraft) el.style.display = 'none';
            }
        }
    },

    toggleFullscreen() {
        this.state.isFullscreen = !this.state.isFullscreen;
        const wrapper = document.getElementById('map-wrapper');
        const btn = document.getElementById('btn-toggle-fullscreen');

        if (wrapper) wrapper.classList.toggle('fullscreen', this.state.isFullscreen);
        document.body.classList.toggle('map-fullscreen-active', this.state.isFullscreen);

        // Remove transform from parent view to fix position:fixed
        const parentView = wrapper.closest('.view');
        if (parentView) {
            parentView.classList.toggle('view-fullscreen-active', this.state.isFullscreen);
        }

        if (this.state.isFullscreen) {
            if (btn) btn.innerHTML = '✖';
            if (!this.state.isEditing) {
                this.startEdit();
            }
        } else {
            if (btn) btn.innerHTML = '⛶';
        }
        if (this.map) setTimeout(() => this.map.invalidateSize(), 200);
    },

    async search() {
        const input = document.getElementById('map-search-input');
        const resDiv = document.getElementById('map-search-results');
        if (!input || !resDiv) return;

        const q = input.value;
        if (!q.trim()) return;

        resDiv.style.display = 'block';
        resDiv.innerHTML = '<div class="search-result-item">Поиск...</div>';

        try {
            const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`);
            const data = await resp.json();

            if (data && data.length > 0) {
                resDiv.innerHTML = '';
                data.slice(0, 5).forEach(item => {
                    const el = document.createElement('div');
                    el.className = 'search-result-item';
                    el.innerHTML = `<strong>${item.display_name.split(',')[0]}</strong><br><small>${item.display_name}</small>`;
                    el.onclick = () => {
                        this.map.setView([item.lat, item.lon], 16);
                        resDiv.style.display = 'none';
                        L.marker([item.lat, item.lon]).addTo(this.map).bindPopup(item.display_name).openPopup();
                    };
                    resDiv.appendChild(el);
                });
            } else {
                resDiv.innerHTML = '<div class="search-result-item">Ничего не найдено</div>';
            }
        } catch (e) {
            console.error(e);
            resDiv.innerHTML = '<div class="search-result-item">Ошибка поиска</div>';
        }
    }
};

// Dashboard Map Logic
let dashboardMap = null;

let dashboardMapEscHandler = null;

export function initDashboardMap() {
    const mapContainer = document.getElementById('dashboard-map');
    if (!mapContainer) return;

    // Reset fullscreen state if re-initializing
    const wrapper = document.getElementById('dashboard-map-wrapper');
    if (wrapper) {
        wrapper.classList.remove('fullscreen');
        const parentView = wrapper.closest('.view');
        if (parentView) parentView.classList.remove('view-fullscreen-active');
    }
    document.body.classList.remove('map-fullscreen-active');

    if (dashboardMap) {
        dashboardMap.remove();
        dashboardMap = null;
    }

    if (!dashboardMap) {
        dashboardMap = L.map('dashboard-map', {
            zoomControl: false,
            attributionControl: false
        }).setView([41.2995, 69.2401], 12);

        L.control.attribution({ prefix: false }).addTo(dashboardMap);

        const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            maxNativeZoom: 19
        });
        const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            maxNativeZoom: 17
        });

        osm.addTo(dashboardMap);

        L.control.layers({ "Схема": osm, "Спутник": satellite }, null, { position: 'topright' }).addTo(dashboardMap);
        L.control.zoom({ position: 'bottomright' }).addTo(dashboardMap);
    }

    // Render markers with current filter
    renderDashboardMapMarkers();

    // Fix map sizing - multiple calls to ensure proper rendering
    setTimeout(() => {
        dashboardMap.invalidateSize();
    }, 100);
    setTimeout(() => {
        dashboardMap.invalidateSize();
    }, 300);
    setTimeout(() => {
        dashboardMap.invalidateSize();
    }, 500);
}

// Current map filter state
let mapStatusFilter = 'all';

// Get marker color based on status
function getStatusMarkerColor(status) {
    const colors = {
        'in-progress': '#6366f1',
        'on-review': '#f59e0b',
        'correction': '#ef4444',
        'accepted': '#10b981',
        'archive': '#6b7280'
    };
    return colors[status] || '#6366f1';
}

// Create colored marker icon
function createColoredMarker(color) {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
}

// Render map markers with filter
export function renderDashboardMapMarkers(statusFilter = mapStatusFilter) {
    if (!dashboardMap) return;

    mapStatusFilter = statusFilter;

    // Clear existing markers (but keep tile layers)
    dashboardMap.eachLayer((layer) => {
        if (!layer._url) {
            dashboardMap.removeLayer(layer);
        }
    });

    const bounds = L.latLngBounds();
    let hasLayers = false;

    const getMapTooltip = (p) => {
        const statusLabels = {
            'in-progress': 'В процессе',
            'on-review': 'На проверку',
            'correction': 'На правку',
            'accepted': 'Принято',
            'archive': 'Архив'
        };
        return `
            <div style="text-align: center;">
                <div style="font-weight: 600; margin-bottom: 4px;">${p.name}</div>
                <div style="font-size: 0.85rem; color: #666; margin-bottom: 2px;">Заказчик: ${p.client || 'Не указан'}</div>
                <div style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; background: ${getStatusMarkerColor(p.status)}20; color: ${getStatusMarkerColor(p.status)};">${statusLabels[p.status] || p.status}</div>
            </div>
        `;
    };

    // Filter projects
    const filteredProjects = state.projects.filter(p => {
        if (statusFilter === 'all') return true;
        return p.status === statusFilter;
    });

    filteredProjects.forEach(project => {
        if (project.lat && project.lng) {
            const markerColor = getStatusMarkerColor(project.status);
            const marker = L.marker([project.lat, project.lng], {
                icon: createColoredMarker(markerColor)
            }).addTo(dashboardMap);

            marker.bindTooltip(getMapTooltip(project), {
                direction: 'top',
                className: 'custom-map-tooltip'
            });
            marker.on('click', () => {
                if (window.openProjectDetails) window.openProjectDetails(project.id);
            });
            bounds.extend([project.lat, project.lng]);
            hasLayers = true;
        }

        if (project.contour && project.contour.length > 0) {
            const markerColor = getStatusMarkerColor(project.status);
            const polygon = L.polygon(project.contour, {
                color: markerColor,
                fillColor: markerColor,
                fillOpacity: 0.2
            }).addTo(dashboardMap);

            polygon.on('click', () => {
                if (window.openProjectDetails) window.openProjectDetails(project.id);
            });

            project.contour.forEach(point => bounds.extend(point));
            hasLayers = true;
        }
    });

    if (hasLayers) {
        dashboardMap.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Set map filter
export function setMapFilter(status) {
    mapStatusFilter = status;
    renderDashboardMapMarkers(status);

    // Update filter buttons
    document.querySelectorAll('.map-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === status);
    });
}

// Expose to window
window.setMapFilter = setMapFilter;
window.renderDashboardMapMarkers = renderDashboardMapMarkers;

export function toggleDashboardMapFullscreen() {
    const wrapper = document.getElementById('dashboard-map-wrapper');
    const btn = document.getElementById('dashboard-map-fullscreen-btn');

    if (!wrapper) return;

    wrapper.classList.toggle('fullscreen');
    const isFullscreen = wrapper.classList.contains('fullscreen');
    document.body.classList.toggle('map-fullscreen-active', isFullscreen);

    // Remove transform from parent view to fix position:fixed
    const parentView = wrapper.closest('.view');
    if (parentView) {
        parentView.classList.toggle('view-fullscreen-active', isFullscreen);
    }

    // Also handle immediate parent chart-card if it has styles
    const parentCard = wrapper.closest('.chart-card');
    if (parentCard) {
        parentCard.style.transform = isFullscreen ? 'none' : '';
        parentCard.style.filter = isFullscreen ? 'none' : '';
        parentCard.style.backdropFilter = isFullscreen ? 'none' : '';
        parentCard.style.webkitBackdropFilter = isFullscreen ? 'none' : '';
        parentCard.style.zIndex = isFullscreen ? '99999' : '';
    }

    if (btn) {
        btn.innerText = isFullscreen ? '✖' : '⛶';
        btn.title = isFullscreen ? 'Выйти' : 'На весь экран';

        if (isFullscreen) {
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-danger');
            dashboardMapEscHandler = (e) => {
                if (e.key === 'Escape') toggleDashboardMapFullscreen();
            };
            document.addEventListener('keydown', dashboardMapEscHandler);
        } else {
            btn.classList.remove('btn-danger');
            btn.classList.add('btn-secondary');
            if (dashboardMapEscHandler) document.removeEventListener('keydown', dashboardMapEscHandler);
        }
    }

    if (dashboardMap) {
        setTimeout(() => {
            dashboardMap.invalidateSize();
        }, 300);
    }
}

export function toggleProjectMapFullscreen() {
    MapManager.toggleFullscreen();
}
