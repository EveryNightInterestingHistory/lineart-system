// Engineer Calendar View Module
// ==============================

import { state } from './state.js';
import { closeModal } from './utils.js';

// Get calendar data for a month
export function getMonthCalendarData(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay() || 7; // Monday = 1
    
    const days = [];
    
    // Previous month padding
    for (let i = 1; i < startWeekday; i++) {
        days.push({ date: null, deadlines: [] });
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toISOString().split('T')[0];
        
        // Find all deadlines for this day
        const deadlines = [];
        
        state.projects.forEach(project => {
            if (!project.sections) return;
            
            project.sections.forEach(section => {
                if (!section.dueDate) return;
                
                const sectionDueDate = new Date(section.dueDate).toISOString().split('T')[0];
                if (sectionDueDate === dateStr) {
                    deadlines.push({
                        projectId: project.id,
                        projectName: project.name,
                        sectionName: section.name,
                        engineer: section.engineer,
                        status: section.status
                    });
                }
            });
        });
        
        days.push({ date: day, fullDate: dateStr, deadlines });
    }
    
    return days;
}

// Render engineer workload calendar
export function renderEngineerCalendar(year = null, month = null) {
    const today = new Date();
    year = year ?? today.getFullYear();
    month = month ?? today.getMonth();
    
    const days = getMonthCalendarData(year, month);
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    
    return `
        <div class="engineer-calendar" style="background: rgba(30,30,30,0.6); border-radius: 12px; padding: 20px; border: 1px solid var(--glass-border);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <button onclick="changeCalendarMonth(${year}, ${month - 1})" class="btn-sm">◀</button>
                <h3 style="margin: 0;">${monthNames[month]} ${year}</h3>
                <button onclick="changeCalendarMonth(${year}, ${month + 1})" class="btn-sm">▶</button>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; text-align: center;">
                <!-- Week days header -->
                <div style="font-weight: 600; color: var(--text-secondary); padding: 8px;">Пн</div>
                <div style="font-weight: 600; color: var(--text-secondary); padding: 8px;">Вт</div>
                <div style="font-weight: 600; color: var(--text-secondary); padding: 8px;">Ср</div>
                <div style="font-weight: 600; color: var(--text-secondary); padding: 8px;">Чт</div>
                <div style="font-weight: 600; color: var(--text-secondary); padding: 8px;">Пт</div>
                <div style="font-weight: 600; color: #ef4444; padding: 8px;">Сб</div>
                <div style="font-weight: 600; color: #ef4444; padding: 8px;">Вс</div>
                
                <!-- Days -->
                ${days.map(day => {
                    if (!day.date) {
                        return '<div style="padding: 10px;"></div>';
                    }
                    
                    const isToday = day.fullDate === today.toISOString().split('T')[0];
                    const hasDeadlines = day.deadlines.length > 0;
                    const overdueCount = day.deadlines.filter(d => 
                        new Date(day.fullDate) < today && d.status !== 'accepted'
                    ).length;
                    
                    let bgColor = 'rgba(255,255,255,0.03)';
                    if (isToday) bgColor = 'rgba(99,102,241,0.2)';
                    else if (overdueCount > 0) bgColor = 'rgba(239,68,68,0.15)';
                    else if (hasDeadlines) bgColor = 'rgba(245,158,11,0.1)';
                    
                    return `
                        <div onclick="showDayTasks('${day.fullDate}')" 
                            style="padding: 8px; min-height: 60px; background: ${bgColor}; border-radius: 6px; cursor: ${hasDeadlines ? 'pointer' : 'default'}; border: ${isToday ? '2px solid #6366f1' : '1px solid transparent'};">
                            <div style="font-weight: ${isToday ? '700' : '400'};">${day.date}</div>
                            ${hasDeadlines ? `
                                <div style="margin-top: 4px;">
                                    ${day.deadlines.slice(0, 2).map(d => `
                                        <div style="font-size: 0.65rem; padding: 2px 4px; background: ${d.status === 'accepted' ? 'var(--accent-success)' : 'var(--accent-primary)'}; color: white; border-radius: 3px; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                            ${d.engineer ? d.engineer.split(' ')[0] : '?'}
                                        </div>
                                    `).join('')}
                                    ${day.deadlines.length > 2 ? `<div style="font-size: 0.65rem; color: var(--text-secondary);">+${day.deadlines.length - 2}</div>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// Show tasks for a specific day
export function showDayTasks(dateStr) {
    const deadlines = [];
    
    state.projects.forEach(project => {
        if (!project.sections) return;
        
        project.sections.forEach(section => {
            if (!section.dueDate) return;
            
            const sectionDueDate = new Date(section.dueDate).toISOString().split('T')[0];
            if (sectionDueDate === dateStr) {
                deadlines.push({
                    projectId: project.id,
                    projectName: project.name,
                    sectionName: section.name,
                    engineer: section.engineer,
                    status: section.status
                });
            }
        });
    });
    
    if (deadlines.length === 0) return;
    
    let modal = document.getElementById('day-tasks-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'day-tasks-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    const formattedDate = new Date(dateStr).toLocaleDateString('ru-RU', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
    });
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <span class="close" onclick="closeModal('day-tasks-modal')">&times;</span>
            <h2>📅 ${formattedDate}</h2>
            
            <div style="display: flex; flex-direction: column; gap: 10px; max-height: 400px; overflow-y: auto;">
                ${deadlines.map(d => `
                    <div style="padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; border-left: 3px solid ${d.status === 'accepted' ? '#10b981' : '#f59e0b'};">
                        <div style="font-weight: 600;">${d.sectionName}</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">${d.projectName}</div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                            <span style="font-size: 0.8rem; color: var(--text-secondary);">👷 ${d.engineer || 'Не назначен'}</span>
                            <button class="btn-sm" onclick="window.openProjectDetails('${d.projectId}'); closeModal('day-tasks-modal');">Открыть</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

// Change calendar month
export function changeCalendarMonth(year, month) {
    if (month < 0) {
        year--;
        month = 11;
    } else if (month > 11) {
        year++;
        month = 0;
    }
    
    const container = document.getElementById('engineer-calendar-container');
    if (container) {
        container.innerHTML = renderEngineerCalendar(year, month);
    }
}

// Expose to window
window.showDayTasks = showDayTasks;
window.changeCalendarMonth = changeCalendarMonth;
window.renderEngineerCalendar = renderEngineerCalendar;
