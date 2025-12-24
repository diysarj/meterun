// State Management
const state = {
    user: null, // { goal, level, recentDist, recentTime, targetTime }
    plan: null, // Generated schedule
    progress: {}, // { "week-day": boolean }
    startDate: null,
};

// DOM Elements
const views = {
    onboarding: document.getElementById("onboarding"),
    dashboard: document.getElementById("dashboard"),
};
const forms = {
    setup: document.getElementById("setup-form"),
};
const display = {
    schedule: document.getElementById("schedule-container"),
    progressText: document.getElementById("progress-text"),
    progressFill: document.getElementById("progress-fill"),
    statGoal: document.getElementById("stat-goal"),
    statPace: document.getElementById("stat-pace"),
    statWeeks: document.getElementById("stat-weeks"),
    resetBtn: document.getElementById("reset-btn"),
    modal: document.getElementById("reset-modal"),
    btnCancel: document.getElementById("cancel-reset"),
    btnConfirm: document.getElementById("confirm-reset"),
};

// Plan Templates (Duration only) - REMOVED
// Dynamic calculation is used instead.

// Initialization
document.addEventListener("DOMContentLoaded", () => {
    loadState();
    if (state.plan) {
        showDashboard();
    } else {
        showOnboarding();
    }
});

// Event Listeners
forms.setup.addEventListener("submit", handleSetup);
display.resetBtn.addEventListener("click", () => toggleModal(true));
display.btnCancel.addEventListener("click", () => toggleModal(false));
display.btnConfirm.addEventListener("click", resetApp);
document.getElementById("cta-btn")?.addEventListener("click", () => {
    document
        .getElementById("onboarding")
        .scrollIntoView({ behavior: "smooth" });
});

// Core Logic
function handleSetup(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const user = {
        goal: formData.get("distance"),
        level: document.getElementById("level").value,
        recentDist: parseFloat(document.getElementById("recent-dist").value),
        recentTime: parseFloat(document.getElementById("recent-time").value),
        targetTime: parseFloat(document.getElementById("target-time").value),
    };

    const plan = generatePlan(user);

    state.user = user;
    state.plan = plan;
    state.startDate = new Date().toISOString();
    state.progress = {};

    saveState();
    showDashboard();
}

function generatePlan(user) {
    // 1. Setup Targets
    const targetDistKm = user.goal === "5k" ? 5 : user.goal === "10k" ? 10 : 15;

    // Safety check: if recent distance is 0 or NaN, assume a safe minimum (e.g., 2km)
    let safeRecentDist = user.recentDist || 2;
    if (safeRecentDist < 1) safeRecentDist = 1;

    // Start 20% higher than recent to build confidence, but not insanely high
    let currentLongRun = Math.max(safeRecentDist * 1.2, 2);

    // End 10% higher than goal (over-distance training)
    const goalLongRun = targetDistKm * 1.1;

    // 2. Pace Logic
    const currentPaceDec = user.recentTime / safeRecentDist; // min/km
    const targetPaceDec = user.targetTime / targetDistKm; // min/km

    const paces = {
        easy: formatPace(currentPaceDec * 1.2), // 20% slower than current fit pace
        long: formatPace(currentPaceDec * 1.3), // 30% slower
        // Tempo is now dynamic
    };

    // 3. Dynamic Schedule Generation
    const schedule = [];
    const maxWeeks = 15; // Cap to ensure 16 weeks total (15 build + 1 taper)
    let weekCount = 1;
    let reachedGoal = false;

    // Helper for interpolation
    const startLongRun = currentLongRun;
    const totalDistDiff = goalLongRun - startLongRun;

    while (!reachedGoal && weekCount <= maxWeeks) {
        const isRecoveryWeek = weekCount % 4 === 0;
        const isTaperWeek = false;

        // Calculate Long Run Distance for this week
        let longRunDist;
        if (isRecoveryWeek) {
            longRunDist = currentLongRun * 0.75;
        } else {
            longRunDist = currentLongRun;
        }

        // Calculate Dynamic Tempo Pace
        // Progress Ratio based on distance volume
        let progressRatio = 0;
        if (totalDistDiff > 0) {
            progressRatio = (currentLongRun - startLongRun) / totalDistDiff;
        }
        if (progressRatio > 1) progressRatio = 1;

        // Linear interpolation: Start at Current Pace -> End at Target Pace
        // Note: Paces are time/km, so "Start" is higher number (slower) than "End".
        const currentTempoDec =
            currentPaceDec + (targetPaceDec - currentPaceDec) * progressRatio;
        const tempoPaceStr = formatPace(currentTempoDec);

        // Short runs are ~50% of long run
        const shortRunDist = longRunDist * 0.5;

        // Build Week Object
        const week = {
            id: weekCount,
            days: [],
        };

        const longRunStr = longRunDist.toFixed(1);
        const shortRunStr = shortRunDist.toFixed(1);

        // --- Weekly Pattern ---

        // Day 1: Easy Run
        week.days.push({
            day: "Monday",
            type: "run",
            title: `Easy Run ${shortRunStr}km`,
            desc: `Pace: ${paces.easy}/km. Relaxed effort.`,
        });

        // Day 2: Strength (Upper)
        week.days.push({
            day: "Tuesday",
            type: "strength",
            title: "Upper Body Strength",
            desc: "Push-ups, Rows, Planks. 30 mins.",
        });

        // Day 3: Workout (Tempo or Intervals)
        // If recovery week, keep it easy. If normal, do Tempo.
        if (isRecoveryWeek) {
            week.days.push({
                day: "Wednesday",
                type: "run",
                title: `Easy Run ${shortRunStr}km`,
                desc: `Pace: ${paces.easy}/km. Active recovery.`,
            });
        } else {
            week.days.push({
                day: "Wednesday",
                type: "run",
                title: `Tempo Run ${shortRunStr}km`,
                desc: `Pace: ${tempoPaceStr}/km. Training Pace.`,
            });
        }

        // Day 4: Strength (Legs)
        week.days.push({
            day: "Thursday",
            type: "strength",
            title: "Leg Strength",
            desc: "Squats, Lunges, Calf Raises.",
        });

        // Day 5: Rest
        week.days.push({
            day: "Friday",
            type: "rest",
            title: "Rest & Recovery",
            desc: "Stretch, foam roll, or light walk.",
        });

        // Day 6: Long Run
        week.days.push({
            day: "Saturday",
            type: "run",
            title: `Long Run ${longRunStr}km`,
            desc: `Pace: ${paces.long}/km. Build endurance.`,
        });

        // Day 7: Rest
        week.days.push({
            day: "Sunday",
            type: "rest",
            title: "Rest",
            desc: "Complete rest.",
        });

        schedule.push(week);

        // --- Progression Logic for NEXT week ---
        if (!isRecoveryWeek) {
            // Only increase if it wasn't a recovery week
            // 5% increase rule (User Requested)
            const nextDist = currentLongRun * 1.05;

            // Check if we reached goal
            if (currentLongRun >= goalLongRun) {
                reachedGoal = true;
            } else {
                currentLongRun = nextDist;
            }
        } else {
            // After recovery, start back at the distance we were at BEFORE recovery + a bit?
            // Or just continue progressive overload from the non-reduced base.
            // Simplified: currentLongRun stays at the "peak" level during recovery calculation,
            // so we just increase it for the next block.
            currentLongRun = currentLongRun * 1.05;
        }

        weekCount++;
    }

    // 4. Add Taper Week (Final Week)
    // The loop finishes when we hit volume, but we need a final week to rest before "Race Day"
    const taperWeek = {
        id: weekCount,
        days: [],
    };
    const taperShort = (targetDistKm * 0.3).toFixed(1);

    taperWeek.days.push({
        day: "Monday",
        type: "run",
        title: `Shakeout ${taperShort}km`,
        desc: `Easy pace.`,
    });
    taperWeek.days.push({
        day: "Tuesday",
        type: "rest",
        title: "Rest",
        desc: "Sleep well.",
    });
    taperWeek.days.push({
        day: "Wednesday",
        type: "run",
        title: `Easy ${taperShort}km`,
        desc: `Keep legs moving.`,
    });
    taperWeek.days.push({
        day: "Thursday",
        type: "rest",
        title: "Rest",
        desc: "Hydrate.",
    });
    taperWeek.days.push({
        day: "Friday",
        type: "rest",
        title: "Rest",
        desc: "Ready for tomorrow.",
    });
    taperWeek.days.push({
        day: "Saturday",
        type: "race",
        title: `RACE DAY: ${targetDistKm}K`,
        desc: `GOAL: ${user.targetTime} mins! You got this.`,
    });
    taperWeek.days.push({
        day: "Sunday",
        type: "rest",
        title: "Victory Rest",
        desc: "Celebrate!",
    });

    schedule.push(taperWeek);

    return schedule;
}

// UI Rendering
function showOnboarding() {
    views.onboarding.classList.add("active");
    views.onboarding.classList.remove("hidden");
    views.dashboard.classList.remove("active");
    views.dashboard.classList.add("hidden");
    display.resetBtn.hidden = true;
}

function showDashboard() {
    views.onboarding.classList.remove("active");
    views.onboarding.classList.add("hidden");
    views.dashboard.classList.add("active");
    views.dashboard.classList.remove("hidden");
    display.resetBtn.hidden = false;

    renderStats();
    renderSchedule();
    updateProgress();
}

function renderStats() {
    const targetDistKm =
        state.user.goal === "5k" ? 5 : state.user.goal === "10k" ? 10 : 15;
    const paceDec = state.user.targetTime / targetDistKm;

    display.statGoal.textContent = state.user.goal.toUpperCase();
    display.statPace.textContent = formatPace(paceDec) + "/km";
    display.statWeeks.textContent = state.plan.length;
}

function calculateUnlockedWeek() {
    const startDate = new Date(state.startDate);
    const now = new Date();
    const diffTime = Math.max(0, now - startDate);
    const weeksPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    let maxUnlockedWeek = weeksPassed + 1;

    for (let i = 0; i < state.plan.length; i++) {
        const weekNum = i + 1;
        if (weekNum <= maxUnlockedWeek) {
            let allCompleted = true;
            state.plan[i].days.forEach((day, dIndex) => {
                const dayId = `w${i}-d${dIndex}`;
                if (!state.progress[dayId]) allCompleted = false;
            });

            if (allCompleted) {
                if (maxUnlockedWeek < weekNum + 1) {
                    maxUnlockedWeek = weekNum + 1;
                }
            }
        }
    }
    return maxUnlockedWeek;
}

function updateLockUI() {
    const maxUnlockedWeek = calculateUnlockedWeek();

    document.querySelectorAll(".week-container").forEach((weekEl) => {
        const weekId = parseInt(weekEl.dataset.weekId);

        if (weekId > maxUnlockedWeek) {
            weekEl.classList.add("locked");
            weekEl.open = false;
        } else {
            weekEl.classList.remove("locked");
            // Auto-open the current max unlocked week if it ends up being this one
            if (weekId === maxUnlockedWeek) weekEl.open = true;
        }
    });
}

function renderSchedule() {
    display.schedule.innerHTML = "";

    const maxUnlockedWeek = calculateUnlockedWeek();

    state.plan.forEach((week, wIndex) => {
        const weekEl = document.createElement("details");
        weekEl.className = "week-container";
        weekEl.dataset.weekId = week.id;

        // Logic: specific week id vs max unlocked week
        // week.id is 1-based.
        if (week.id > maxUnlockedWeek) {
            weekEl.classList.add("locked");
            weekEl.open = false; // Force closed
        } else {
            // open the LATEST unlocked week by default if it's the current one in focus
            if (week.id === maxUnlockedWeek) weekEl.open = true;
        }

        const summary = document.createElement("summary");
        summary.className = "week-title";
        summary.textContent = `Week ${week.id}`;
        weekEl.appendChild(summary);

        const content = document.createElement("div");
        content.className = "week-content";

        week.days.forEach((day, dIndex) => {
            const dayId = `w${wIndex}-d${dIndex}`;
            const isCompleted = state.progress[dayId] || false;

            const dayCard = document.createElement("div");
            dayCard.className = `day-card ${isCompleted ? "completed" : ""}`;

            dayCard.innerHTML = `
                <div class="day-info">
                    <div class="day-name">${day.day}</div>
                    <div class="workout-title">${day.title}</div>
                    <div class="workout-desc">${day.desc}</div>
                </div>
                <label class="check-container">
                    <input type="checkbox" class="check-input" 
                        data-id="${dayId}" 
                        ${isCompleted ? "checked" : ""}>
                    <div class="check-box">
                        <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                </label>
            `;

            content.appendChild(dayCard);
        });

        weekEl.appendChild(content);
        display.schedule.appendChild(weekEl);
    });

    // Attach event listeners to new checkboxes
    document.querySelectorAll(".check-input").forEach((cb) => {
        cb.addEventListener("change", toggleDay);
    });
}

function toggleDay(e) {
    const id = e.target.dataset.id;
    state.progress[id] = e.target.checked;

    // Visual update
    const card = e.target.closest(".day-card");
    if (e.target.checked) {
        card.classList.add("completed");
    } else {
        card.classList.remove("completed");
    }

    saveState();
    updateProgress();
    // Update lock status without full re-render
    updateLockUI();
}

function updateProgress() {
    const totalDays = state.plan.length * 7;
    const completedDays = Object.values(state.progress).filter(Boolean).length;
    const percent = Math.round((completedDays / totalDays) * 100);

    display.progressText.textContent = `${percent}%`;
    display.progressFill.style.width = `${percent}%`;
}

// Helpers
function formatPace(decimalMin) {
    const min = Math.floor(decimalMin);
    const sec = Math.round((decimalMin - min) * 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
}

function saveState() {
    localStorage.setItem("meterun_state", JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem("meterun_state");
    if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(state, parsed);
    }
}

function resetApp() {
    localStorage.removeItem("meterun_state");
    location.reload();
}

function toggleModal(show) {
    if (show) {
        display.modal.classList.remove("hidden");
        // Small delay to allow display:block to apply before opacity transition
        setTimeout(() => display.modal.classList.add("active"), 10);
    } else {
        display.modal.classList.remove("active");
        setTimeout(() => display.modal.classList.add("hidden"), 300);
    }
}
