// Time Tracking Module
// =====================

import { state, saveData, currentProjectId } from './state.js';
import { showToast } from './utils.js';

// Timer state
let activeTimerInterval = null;
let activeTimerProjectId = null;
let activeTimerStartTime = null;

// Initialize time tracking for a project
export function initTimeTracking() {
    if (!state.timeTracking) {
        state.timeTracking = {};
    }
}

// Get tracked time for a project (in seconds)
export function getProjectTrackedTime(projectId) {
    initTimeTracking();
    const tracking = state.timeTracking[projectId];
    if (!tracking) return 0;
    
    let total = tracking.totalSeconds || 0;
    
    // Add active session time if this project is being tracked
    if (activeTimerProjectId === projectId && activeTimerStartTime) {
        total += Math.floor((Date.now() - activeTimerStartTime) / 1000);
    }
    
    return total;
}

// Format seconds as HH:MM:SS
export function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
        return `${hrs}ч ${mins.toString().padStart(2, '0')}м`;
    }
    return `${mins}м ${secs.toString().padStart(2, '0')}с`;
}

// Start timer for a project
export function startTimer(projectId) {
    if (activeTimerProjectId && activeTimerProjectId !== projectId) {
        // Stop existing timer first
        stopTimer();
    }
    
    if (activeTimerProjectId === projectId) {
        // Already tracking this project
        return;
    }
    
    activeTimerProjectId = projectId;
    activeTimerStartTime = Date.now();
    
    // Update UI every second
    activeTimerInterval = setInterval(() => {
        updateTimerDisplay(projectId);
    }, 1000);
    
    // Initialize tracking for project if needed
    initTimeTracking();
    if (!state.timeTracking[projectId]) {
        state.timeTracking[projectId] = { 
            totalSeconds: 0, 
            sessions: [],
            lastStarted: null 
        };
    }
    state.timeTracking[projectId].lastStarted = activeTimerStartTime;
    
    updateTimerUI(projectId, true);
    showToast('⏱️ Таймер запущен', 'info');
}

// Stop timer
export function stopTimer() {
    if (!activeTimerProjectId || !activeTimerStartTime) return;
    
    const projectId = activeTimerProjectId;
    const elapsed = Math.floor((Date.now() - activeTimerStartTime) / 1000);
    
    // Save session
    initTimeTracking();
    if (!state.timeTracking[projectId]) {
        state.timeTracking[projectId] = { totalSeconds: 0, sessions: [] };
    }
    
    state.timeTracking[projectId].totalSeconds += elapsed;
    state.timeTracking[projectId].sessions.push({
        start: activeTimerStartTime,
        end: Date.now(),
        duration: elapsed
    });
    state.timeTracking[projectId].lastStarted = null;
    
    saveData();
    
    // Clear timer
    if (activeTimerInterval) {
        clearInterval(activeTimerInterval);
        activeTimerInterval = null;
    }
    
    updateTimerUI(projectId, false);
    activeTimerProjectId = null;
    activeTimerStartTime = null;
    
    showToast(`⏱️ Записано: ${formatTime(elapsed)}`, 'success');
}

// Toggle timer
export function toggleTimer(projectId) {
    if (activeTimerProjectId === projectId) {
        stopTimer();
    } else {
        startTimer(projectId);
    }
}

// Check if project timer is active
export function isTimerActive(projectId) {
    return activeTimerProjectId === projectId;
}

// Update timer display
function updateTimerDisplay(projectId) {
    const timerDisplay = document.getElementById('project-timer-display');
    if (timerDisplay) {
        const totalTime = getProjectTrackedTime(projectId);
        timerDisplay.textContent = formatTime(totalTime);
    }
}

// Update timer UI (button state)
function updateTimerUI(projectId, isActive) {
    const timerBtn = document.getElementById('project-timer-btn');
    const timerDisplay = document.getElementById('project-timer-display');
    
    if (timerBtn) {
        timerBtn.innerHTML = isActive 
            ? `<span class="timer-pulse"></span> ⏸️ Остановить`
            : `▶️ Начать`;
        timerBtn.className = isActive ? 'btn-timer active' : 'btn-timer';
    }
    
    if (timerDisplay) {
        const totalTime = getProjectTrackedTime(projectId);
        timerDisplay.textContent = formatTime(totalTime);
    }
}

// Render timer widget for project details page
export function renderTimerWidget(projectId) {
    const totalTime = getProjectTrackedTime(projectId);
    const isActive = isTimerActive(projectId);
    
    return `
        <div class="timer-widget" style="display: flex; align-items: center; gap: 15px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 12px; border: 1px solid var(--glass-border);">
            <div style="display: flex; flex-direction: column;">
                <span style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 4px;">⏱️ Время на проекте</span>
                <span id="project-timer-display" style="font-size: 1.5rem; font-weight: 700; font-family: monospace; color: ${isActive ? 'var(--accent-primary)' : 'var(--text-primary)'};">
                    ${formatTime(totalTime)}
                </span>
            </div>
            <button id="project-timer-btn" class="btn-timer ${isActive ? 'active' : ''}" onclick="toggleProjectTimer('${projectId}')" style="padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; font-size: 0.9rem; background: ${isActive ? 'var(--accent-danger)' : 'var(--accent-primary)'}; color: white;">
                ${isActive ? '<span class="timer-pulse"></span> ⏸️ Остановить' : '▶️ Начать'}
            </button>
        </div>
    `;
}

// Get time tracking summary for project
export function getTimeTrackingSummary(projectId) {
    initTimeTracking();
    const tracking = state.timeTracking[projectId];
    
    if (!tracking || tracking.sessions.length === 0) {
        return {
            totalTime: 0,
            sessionCount: 0,
            averageSession: 0,
            lastSession: null
        };
    }
    
    const totalTime = tracking.totalSeconds;
    const sessionCount = tracking.sessions.length;
    const averageSession = Math.floor(totalTime / sessionCount);
    const lastSession = tracking.sessions[tracking.sessions.length - 1];
    
    return {
        totalTime,
        sessionCount,
        averageSession,
        lastSession
    };
}

// Expose to window
window.startTimer = startTimer;
window.stopTimer = stopTimer;
window.toggleProjectTimer = toggleTimer;
window.getProjectTrackedTime = getProjectTrackedTime;
window.formatTime = formatTime;
