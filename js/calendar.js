// Calendar Module - Deadline Calendar
// ====================================

import { state, saveData } from './state.js';
import { getStatusName, showToast } from './utils.js';

// Calendar Config
let currentView = 'month'; // 'month', 'week'
let currentDate = new Date(); // Center point for view

// Constants
const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];
const dayNamesShort = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const dayNamesFull = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

// --- Helper Functions ---

function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function formatDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}


function parseTime(text) {
    // Try to find range HH:MM - HH:MM
    const rangeMatch = text.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (rangeMatch) {
        return {
            startH: parseInt(rangeMatch[1]),
            startM: parseInt(rangeMatch[2]),
            endH: parseInt(rangeMatch[3]),
            endM: parseInt(rangeMatch[4]),
            str: rangeMatch[0],
            isRange: true
        };
    }

    // Single time
    const match = text.match(/(\d{1,2}):(\d{2})/);
    if (match) {
        return {
            startH: parseInt(match[1]),
            startM: parseInt(match[2]),
            str: match[0],
            isRange: false
        };
    }
    return null;
}

// --- Data Gathering ---

function getAllItems() {
    const items = [];
    
    // Projects
    state.projects.forEach(project => {
        if (!project.sections) return;
        project.sections.forEach(section => {
            if (section.dueDate) {
                // Default project duration 1 hour
                items.push({
                    type: 'deadline',
                    id: `${project.id}_${section.id}`,
                    date: section.dueDate,
                    time: section.dueTime || '09:00',
                    durationMins: 60, 
                    title: `${project.name}: ${section.name}`,
                    status: section.status || 'in-progress',
                    color: 'var(--accent-primary)',
                    projectId: project.id
                });
            }
        });
    });

    // Tasks
    if (state.tasks) {
        state.tasks.forEach(task => {
            const timeData = parseTime(task.text);
            let time = '10:00';
            let durationMins = 60; // Default 1h
            let cleanText = task.text;

            if (timeData) {
                time = `${String(timeData.startH).padStart(2,'0')}:${String(timeData.startM).padStart(2,'0')}`;
                cleanText = task.text.replace(timeData.str, '').trim();
                
                if (timeData.isRange) {
                    const startMins = timeData.startH * 60 + timeData.startM;
                    const endMins = timeData.endH * 60 + timeData.endM;
                    durationMins = endMins - startMins;
                    if (durationMins < 15) durationMins = 15; // Min size
                }
            }
            
            items.push({
                type: 'task',
                id: task.id,
                date: task.date,
                time: time,
                durationMins: durationMins,
                title: cleanText || 'Без названия',
                status: task.status || 'pending',
                color: task.color || 'var(--accent-info)',
                originalText: task.text
            });
        });
    }
    
    return items;
}



// --- Rendering ---


// --- Drag & Drop Creation State ---
let dragState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    startYRel: 0, // Relative to column top
    currentYRel: 0,
    column: null,
    dateStr: null,
    ghostEl: null,
    startTime: null // {h, m}
};

// --- Drag Handlers ---

function handleMouseDown(e) {
    const col = e.target.closest('.day-column');
    if (!col) return;
    if (e.target.closest('.week-event-card')) return; // Ignore if clicking existing event

    dragState.isDragging = false; // Will be true only after move
    dragState.startX = e.clientX;
    dragState.startY = e.clientY;
    dragState.column = col;
    dragState.dateStr = col.dataset.date;
    
    // Calc relative Y
    const rect = col.getBoundingClientRect();
    dragState.startYRel = e.clientY - rect.top;
    
    // Snap to nearest 15 mins (12.5px)
    // 50px = 60 mins -> 1px = 1.2 mins
    // 12.5px = 15 mins
    const snapY = Math.floor(dragState.startYRel / 12.5) * 12.5;
    dragState.startYRel = snapY;
    
    // Calculate start time
    const minsFrom7 = (snapY / 50) * 60;
    const totalMins = (7 * 60) + minsFrom7;
    dragState.startTime = {
        h: Math.floor(totalMins / 60),
        m: Math.floor(totalMins % 60)
    };

    // Attach global listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
}

function handleMouseMove(e) {
    if (!dragState.column) return;

    const diffY = e.clientY - dragState.startY;
    if (!dragState.isDragging && Math.abs(diffY) > 5) {
        dragState.isDragging = true;
        // Create ghost element
        createGhostElement();
    }

    if (dragState.isDragging) {
        e.preventDefault();
        const rect = dragState.column.getBoundingClientRect();
        let currentRel = e.clientY - rect.top;
        
        // Constrain
        if (currentRel < dragState.startYRel) currentRel = dragState.startYRel + 10; // Min height
        
        dragState.currentYRel = currentRel;
        updateGhostElement();
    }
}

function handleMouseUp(e) {
    if (dragState.column) {
        if (dragState.isDragging) {
            // End Drag
            finishDragCreation();
        } else {
            // It was a click - use start time from dragState directly
            const timeStr = formatTime(dragState.startTime);
            showDayDetails(dragState.dateStr, timeStr);
        }
    }
    
    // Cleanup
    if (dragState.ghostEl) dragState.ghostEl.remove();
    dragState = { isDragging: false, startX: 0, startY: 0, column: null, ghostEl: null, startTime: null };
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
}

function createGhostElement() {
    const ghost = document.createElement('div');
    ghost.className = 'week-event-card ghost-event';
    ghost.style.position = 'absolute';
    ghost.style.background = 'rgba(0, 184, 148, 0.4)'; // Neon green Transp
    ghost.style.border = '1px dashed #00b894';
    ghost.style.top = dragState.startYRel + 'px';
    ghost.style.left = '2px';
    ghost.style.right = '2px';
    ghost.style.zIndex = '100';
    ghost.style.pointerEvents = 'none';
    ghost.innerText = formatTime(dragState.startTime);
    
    dragState.column.appendChild(ghost);
    dragState.ghostEl = ghost;
}

function updateGhostElement() {
    if (!dragState.ghostEl) return;
    
    const height = dragState.currentYRel - dragState.startYRel;
    dragState.ghostEl.style.height = height + 'px';
    
    // Calc end time
    const startMins = dragState.startTime.h * 60 + dragState.startTime.m;
    const durationMins = (height / 50) * 60;
    const endMins = startMins + durationMins;
    
    const endH = Math.floor(endMins / 60);
    const endM = Math.floor(endMins % 60);
    
    dragState.ghostEl.innerText = `${formatTime(dragState.startTime)} - ${formatTime({h: endH, m: endM})}`;
}

function finishDragCreation() {
    const height = dragState.currentYRel - dragState.startYRel;
    const durationMins = Math.round((height / 50) * 60);
    
    // Valid duration check (> 15 mins)
    if (durationMins < 15) return;
    
    const startStr = formatTime(dragState.startTime);
    const startMins = dragState.startTime.h * 60 + dragState.startTime.m;
    const endMins = startMins + durationMins;
    const endStr = formatTime({h: Math.floor(endMins/60), m: Math.floor(endMins%60)});
    
    // Open Modal with pre-filled duration
    showDayDetails(dragState.dateStr, startStr, endStr);
}

function formatTime(t) {
    return `${String(t.h).padStart(2,'0')}:${String(t.m).padStart(2,'0')}`;
}


// --- Updated Render Functions ---

export function renderCalendar() {
    const container = document.getElementById('calendar-container');
    if (!container) return;
    
    const headerHtml = renderHeader();
    const bodyHtml = currentView === 'month' ? renderMonthView() : renderWeekView();
    
    container.innerHTML = `
        ${headerHtml}
        <div class="calendar-body">
            ${bodyHtml}
        </div>
        ${renderSidebar()}
    `;
    
    // Attach Drag Listeners if Week View
    if (currentView === 'week') {
        const grid = container.querySelector('.week-grid-container');
        if (grid) {
            grid.addEventListener('mousedown', handleMouseDown);
        }
    }
}


function renderHeader() {
    const title = currentView === 'month' 
        ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
        : getWeekRangeTitle();

    return `
        <div class="calendar-header-toolbar">
            <div class="calendar-nav">
                <button class="btn-icon" onclick="prevPeriod()">&lt;</button>
                <button class="btn-secondary" onclick="goToToday()">Сегодня</button>
                <button class="btn-icon" onclick="nextPeriod()">&gt;</button>
                <h2 class="calendar-title-text">${title}</h2>
            </div>
            
            <div class="view-switcher">
                <button class="btn-sm ${currentView === 'month' ? 'active' : ''}" onclick="switchView('month')">Месяц</button>
                <button class="btn-sm ${currentView === 'week' ? 'active' : ''}" onclick="switchView('week')">Неделя</button>
            </div>
        </div>
    `;
}

function getWeekRangeTitle() {
    const start = getStartOfWeek(currentDate);
    const end = addDays(start, 6);
    const m1 = monthNames[start.getMonth()];
    const m2 = monthNames[end.getMonth()];
    
    if (start.getMonth() === end.getMonth()) {
        return `${m1} ${start.getFullYear()}`;
    }
    return `${m1.slice(0, 3)} - ${m2.slice(0, 3)} ${end.getFullYear()}`;
}

// --- Month View ---

function renderMonthView() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Mon start
    
    const items = getAllItems();
    const itemMap = {};
    items.forEach(i => {
        if (!itemMap[i.date]) itemMap[i.date] = [];
        itemMap[i.date].push(i);
    });

    let html = `
        <div class="month-grid-header">
            ${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => `<div>${d}</div>`).join('')}
        </div>
        <div class="month-grid">
    `;
    
    // Empty cells
    for (let i = 0; i < startOffset; i++) {
        html += `<div class="month-cell empty"></div>`;
    }
    
    // Days
    const todayStr = formatDateKey(new Date());
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = formatDateKey(new Date(year, month, day));
        const dayItems = itemMap[dateStr] || [];
        const isToday = dateStr === todayStr;
        
        html += `
            <div class="month-cell ${isToday ? 'today' : ''}" onclick="showDayDetails('${dateStr}')">
                <div class="cell-header">
                    <span class="day-num">${day}</span>
                </div>
                <div class="cell-content">
                    ${dayItems.slice(0, 3).map(item => `
                        <div class="month-event-chip ${item.type} ${item.status === 'completed' ? 'done' : ''}" 
                             style="border-left-color: ${item.color || 'var(--accent-primary)'}">
                            ${item.title}
                        </div>
                    `).join('')}
                    ${dayItems.length > 3 ? `<div class="more-label">+${dayItems.length - 3} еще</div>` : ''}
                </div>
            </div>
        `;
    }
    html += `</div>`;
    return html;
}

// Updated renderWeekView to add data-date to columns and REMOVE onclick (handled by mousedown)
function renderWeekView() {
    const startOfWeek = getStartOfWeek(currentDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
        days.push(addDays(startOfWeek, i));
    }
    
    const items = getAllItems();
    const hours = Array.from({length: 17}, (_, i) => i + 7); // 07:00 to 23:00
    
    let html = `<div class="week-layout">`;
    // ... Header Row ...
    html += `<div class="week-header-row"><div class="time-col-header"></div>`;
    days.forEach(d => {
        const isToday = formatDateKey(d) === formatDateKey(new Date());
        html += `
            <div class="day-col-header ${isToday ? 'today' : ''}">
                <div class="day-name">${dayNamesShort[d.getDay()]}</div>
                <div class="day-date">${d.getDate()}</div>
            </div>
        `;
    });
    html += `</div>`; 
    
    html += `<div class="week-grid-container">`;
    
    // Time Column
    html += `<div class="time-column">`;
    hours.forEach(h => {
        html += `<div class="time-slot-label">${String(h).padStart(2,'0')}:00</div>`;
    });
    html += `</div>`;
    
    // Day Columns
    days.forEach(day => {
        const dateStr = formatDateKey(day);
        const dayItems = items.filter(i => i.date === dateStr);
        
        // Added data-date, REMOVED onclick="handleTimeClick..."
        html += `<div class="day-column" data-date="${dateStr}">`;
        
        hours.forEach(h => {
            html += `<div class="grid-line"></div>`;
        });
        
        dayItems.forEach(item => {


            const timeParts = item.time.split(':');
            const h = parseInt(timeParts[0]);
            const m = parseInt(timeParts[1]);
            
            // Calculate Position
            // Start hour is 7. If event is at 6, it might be cut off, but assuming 7-23 range
            if (h < 7) return; 
            
            const startOffsetPixels = ((h - 7) * 60 + m) * (50 / 60); // 50px per hour
            
            // Calc height from duration (50px = 60mins)
            const durationPx = (item.durationMins || 60) * (50 / 60);
            
            // Intra Colors
            const bgColor = item.type === 'deadline' ? 'rgba(9, 132, 227, 0.25)' : 'rgba(0, 184, 148, 0.25)';
            const borderColor = item.type === 'deadline' ? '#0984e3' : '#00b894';
                
            html += `
                <div class="week-event-card" 
                     style="top: ${startOffsetPixels}px; height: ${durationPx}px; background: ${bgColor}; border-left: 2px solid ${borderColor}; box-shadow: 0 0 5px ${bgColor};"
                     onclick="event.stopPropagation(); openEventDetails('${item.id}', '${item.type}')">
                    <div class="event-time">${item.time}</div>
                    <div class="event-title">${item.title}</div>
                </div>
            `;
        });
        html += `</div>`;
    });
    
    html += `</div></div>`;
    return html;
}


function renderSidebar() {
    // Hidden sidebar for now, or just simple legend
    return ''; 
}

// --- Interaction ---

function getItemsForDate(dateStr) {
    const items = getAllItems();
    return items.filter(i => i.date === dateStr);
}

export function switchView(view) {
    currentView = view;
    renderCalendar();
}

export function prevPeriod() {
    if (currentView === 'month') {
        currentDate.setMonth(currentDate.getMonth() - 1);
    } else {
        currentDate.setDate(currentDate.getDate() - 7);
    }
    renderCalendar();
}

export function nextPeriod() {
    if (currentView === 'month') {
        currentDate.setMonth(currentDate.getMonth() + 1);
    } else {
        currentDate.setDate(currentDate.getDate() + 7);
    }
    renderCalendar();
}

export function goToToday() {
    currentDate = new Date();
    renderCalendar();
}

// Updated showDayDetails to accept optional time range
export function showDayDetails(dateStr, startTime = null, endTime = null) {
    const items = getItemsForDate(dateStr);
    const date = new Date(dateStr);
    const modal = document.getElementById('day-details-modal');
    if (!modal) return;
    const content = modal.querySelector('.modal-content');
    if (!content) return;
    
    let timePlaceholder = "пример '14:00 Встреча'";
    let timeValue = "";
    if (startTime) {
        timeValue = `${startTime} `;
        if (endTime) timeValue += `- ${endTime} `;
    }

    let html = `
        <span class="close" onclick="closeModal('day-details-modal')">&times;</span>
        <h2>📅 ${date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
        
        <div style="margin-bottom: 20px; display: flex; gap: 10px;">
            <input type="text" id="new-task-input" value="${timeValue}" placeholder="Добавить задачу (${timePlaceholder})..." class="form-input" style="flex: 1;">
            <button class="btn-primary" onclick="addCalendarTask('${dateStr}')">OK</button>
        </div>
    `;
    
    // ... items list (same as before) ...
    if (items.length === 0) {
        html += '<p style="text-align: center; color: var(--text-secondary); padding: 10px;">Нет событий</p>';
    } else {
        html += `<div class="day-deadlines">`;
        items.forEach(d => {
            // ... rendering items (same as before) ...
             if (d.type === 'deadline') {
                const statusClass = d.status === 'accepted' ? 'accepted' : (d.status === 'completed' ? 'completed' : 'in-progress'); 
                html += `
                    <div class="day-deadline-item ${statusClass}" onclick="openProjectDetails('${d.projectId}'); closeModal('day-details-modal');">
                        <div class="item-header">
                            <span class="item-project">${d.title}</span>
                            <span class="item-status status-${d.status}">${getStatusName(d.status)}</span>
                        </div>
                        <div class="item-engineer">Time: ${d.time}</div>
                    </div>
                `;
            } else {
                const isCompleted = d.status === 'completed';
                html += `
                    <div class="day-deadline-item ${isCompleted ? 'completed' : ''}" style="border-left-color: ${d.color};">
                        <div class="item-header" style="justify-content: space-between;">
                            <span class="item-project" style="font-weight: normal; ${isCompleted ? 'text-decoration: line-through; color: var(--text-secondary);' : ''}">${d.originalText || d.title}</span>
                            <div style="display: flex; gap: 5px;">
                                <button class="btn-icon-sm" onclick="toggleTaskStatus('${d.id}')" title="${isCompleted ? 'Вернуть' : 'Выполнить'}">
                                    ${isCompleted ? '↩️' : '✅'}
                                </button>
                                <button class="btn-delete-icon" onclick="deleteCalendarTask('${d.id}')" title="Удалить">
                                    ❌
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
        html += '</div>';
    }
    
    content.innerHTML = html;
    modal.style.display = 'flex';
    setTimeout(() => {
        const input = document.getElementById('new-task-input');
        if (input) {
            input.focus();
            // Move cursor to end
            const len = input.value.length;
            input.setSelectionRange(len, len);
        }
    }, 100);
}

// ... handleTimeClick, openEventDetails ...
// handleTimeClick remains as fallback for single clicks (via handleMouseUp)

export function handleTimeClick(e, dateStr) {
    // If called directly from click event (fallback), calculate time
    let timeStr = "";
    if (e && e.currentTarget) {
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const hourOffset = Math.floor(y / 50); 
        const hour = 7 + hourOffset;
        timeStr = `${String(hour).padStart(2,'0')}:00`;
    }
    showDayDetails(dateStr, timeStr);
}


export function openEventDetails(id, type) {
    if (type === 'task') {
        const task = state.tasks.find(t => t.id === id);
        if (task) {
            showDayDetails(task.date);
        }
    } else {
        // Parse ID "projectId_sectionId"
        const [pid, sid] = id.split('_');
        window.openProjectDetails(pid);
    }
}

// Add new manual task
export function addCalendarTask(dateStr) {
    const input = document.getElementById('new-task-input');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;
    
    if (!state.tasks) state.tasks = [];
    
    state.tasks.push({
        id: Date.now().toString(),
        date: dateStr,
        text: text,
        status: 'pending'
    });
    
    saveData();
    closeModal('day-details-modal'); // Close modal after adding
    renderCalendar(); // Refresh calendar view
    showToast('Задача добавлена ✅');
}

// Delete manual task
export function deleteCalendarTask(taskId) {
    if (!confirm('Удалить задачу?')) return;
    
    const task = state.tasks.find(t => t.id === taskId);
    const dateStr = task ? task.date : null;
    
    state.tasks = state.tasks.filter(t => t.id !== taskId);
    saveData();
    
    if (dateStr) showDayDetails(dateStr); // Refresh if we know the date
    else closeModal('day-details-modal');
    
    renderCalendar();
}

// Toggle task status
export function toggleTaskStatus(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
        task.status = task.status === 'completed' ? 'pending' : 'completed';
        saveData();
        showDayDetails(task.date); // Refresh modal
        renderCalendar();
    }
}

// Export all needed functions
window.switchView = switchView;
window.prevPeriod = prevPeriod;
window.nextPeriod = nextPeriod;
window.goToToday = goToToday;
window.showDayDetails = showDayDetails;
window.handleTimeClick = handleTimeClick;
window.openEventDetails = openEventDetails;
window.renderCalendar = renderCalendar;
window.addCalendarTask = addCalendarTask;
window.deleteCalendarTask = deleteCalendarTask;
window.toggleTaskStatus = toggleTaskStatus;


