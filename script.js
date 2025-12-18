let tasks = [];
let editingTaskId = null;
const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#3b82f6", "#1e293b"];

document.addEventListener("DOMContentLoaded", () => {
    const stored = localStorage.getItem("proTimelineTasks");
    if (stored) tasks = JSON.parse(stored);
    
    if (tasks.length === 0) {
        tasks.push(
            { id: Date.now(), name: "Sleep 😴", start: "00:00", end: "07:00", color: "#1e293b" },
            { id: Date.now()+1, name: "ENSTI Study Session 📖", start: "08:30", end: "11:00", color: "#6366f1" }
        );
    }
    
    initColorPicker();
    renderTimeline();
    startClock();
});

function renderTimeline() {
    const container = document.getElementById("timeline-container");
    container.innerHTML = "";
    const statsList = document.getElementById("stats-list");
    statsList.innerHTML = "";
    
    tasks.sort((a, b) => timeToMin(a.start) - timeToMin(b.start));

    let currentMin = 0;
    const fullSchedule = [];

    tasks.forEach(task => {
        const taskStart = timeToMin(task.start);
        const taskEnd = timeToMin(task.end);

        if (taskStart > currentMin) {
            fullSchedule.push({
                type: "free",
                start: minToTime(currentMin),
                end: minToTime(taskStart),
                duration: taskStart - currentMin
            });
        }

        fullSchedule.push({
            type: "task",
            data: task,
            duration: taskEnd - taskStart
        });

        currentMin = taskEnd;
    });

    if (currentMin < 1440) {
        fullSchedule.push({
            type: "free",
            start: minToTime(currentMin),
            end: "24:00",
            duration: 1440 - currentMin
        });
    }

    fullSchedule.forEach(item => {
        const el = document.createElement("div");
        el.className = item.type === "task" ? "time-block" : "time-block free-time";
        const height = Math.max(50, item.duration * 1.5); 
        el.style.height = `${height}px`;

        if (item.type === "task") {
            el.style.backgroundColor = hexToRgba(item.data.color, 0.1);
            el.style.borderLeft = `4px solid ${item.data.color}`;
            el.innerHTML = `
                <div class="time-sidebar">
                    <div>${item.data.start}</div>
                    <div style="font-size:0.6rem; opacity:0.5;">to</div>
                    <div>${item.data.end}</div>
                </div>
                <div class="time-content">
                    <h4 style="color:${item.data.color}">${item.data.name}</h4>
                    <span>${formatDuration(item.duration)}</span>
                </div>
            `;
            el.onclick = () => openModal(item.data);
            
            const li = document.createElement("li");
            li.className = "stat-row";
            li.innerHTML = `<span>${item.data.name}</span> <span>${formatDuration(item.duration)}</span>`;
            statsList.appendChild(li);
        } else {
            el.innerHTML = `
                <div class="time-sidebar">${item.start}</div>
                <div class="time-content">
                    <h4 style="opacity:0.4;">Gap</h4>
                    <span>${formatDuration(item.duration)}</span>
                </div>
            `;
            el.onclick = () => openModal(null, item.start, item.end); 
        }
        container.appendChild(el);
    });
    saveData();
}

function startClock() {
    const clockEl = document.getElementById("digital-clock");
    const dateEl = document.getElementById("date-display");
    const fill = document.getElementById("progress-fill");
    const text = document.getElementById("progress-text");

    setInterval(() => {
        const now = new Date();
        clockEl.innerText = now.toLocaleTimeString('en-US', {hour12: false});
        
        const dateOptions = { weekday: 'long', month: 'short', day: '2-digit' };
        dateEl.innerText = now.toLocaleDateString('en-US', dateOptions);
        
        const totalMinutes = now.getHours() * 60 + now.getMinutes();
        const percent = (totalMinutes / 1440) * 100;
        fill.style.width = `${percent}%`;
        text.innerText = `${Math.floor(percent)}%`;
    }, 1000);
}

const modal = document.getElementById("task-modal");
const inpName = document.getElementById("inp-name");
const inpStart = document.getElementById("inp-start");
const inpEnd = document.getElementById("inp-end");
const inpColor = document.getElementById("inp-color");
const deleteBtn = document.getElementById("delete-task-btn");

function initColorPicker() {
    const container = document.getElementById("color-options");
    COLORS.forEach(c => {
        const d = document.createElement("div");
        d.className = "color-circle";
        d.style.backgroundColor = c;
        d.onclick = () => {
            document.querySelectorAll(".color-circle").forEach(x => x.classList.remove("selected"));
            d.classList.add("selected");
            inpColor.value = c;
        };
        container.appendChild(d);
    });
}

function openModal(task = null, freeStart = "", freeEnd = "") {
    modal.style.display = "flex";
    if (task) {
        editingTaskId = task.id;
        document.getElementById("modal-title").innerText = "Edit Activity";
        inpName.value = task.name;
        inpStart.value = task.start;
        inpEnd.value = task.end;
        inpColor.value = task.color;
        deleteBtn.style.display = "block";
    } else {
        editingTaskId = null;
        document.getElementById("modal-title").innerText = "Add Activity";
        inpName.value = "";
        inpStart.value = freeStart || "09:00";
        inpEnd.value = freeEnd || "10:00";
        deleteBtn.style.display = "none";
    }
}

document.getElementById("close-modal").onclick = () => modal.style.display = "none";
modal.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };

document.getElementById("save-task-btn").onclick = () => {
    const name = inpName.value;
    const start = inpStart.value;
    const end = inpEnd.value;
    const color = inpColor.value;

    if (!name || !start || !end) return alert("Please fill all fields");
    if (timeToMin(start) >= timeToMin(end)) return alert("End time must be after start time");

    const newStart = timeToMin(start);
    const newEnd = timeToMin(end);
    const otherTasks = tasks.filter(t => t.id !== editingTaskId);
    const hasOverlap = otherTasks.some(t => {
        const tStart = timeToMin(t.start);
        const tEnd = timeToMin(t.end);
        return (newStart < tEnd && newEnd > tStart);
    });

    if (hasOverlap) return alert("Time conflict detected!");

    if (editingTaskId) {
        const idx = tasks.findIndex(t => t.id === editingTaskId);
        tasks[idx] = { ...tasks[idx], name, start, end, color };
    } else {
        tasks.push({ id: Date.now(), name, start, end, color });
    }

    modal.style.display = "none";
    renderTimeline();
};

deleteBtn.onclick = () => {
    if (confirm("Remove this activity?")) {
        tasks = tasks.filter(t => t.id !== editingTaskId);
        modal.style.display = "none";
        renderTimeline();
    }
};

document.getElementById("resetBtn").onclick = () => {
    if(confirm("Wipe the entire day?")) {
        tasks = [];
        renderTimeline();
    }
};

document.getElementById("darkModeBtn").onclick = () => document.body.classList.toggle("dark-mode");
document.getElementById("add-task-btn").onclick = () => openModal();

function saveData() { localStorage.setItem("proTimelineTasks", JSON.stringify(tasks)); }
function timeToMin(t) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function minToTime(min) { 
    const h = Math.floor(min / 60).toString().padStart(2, '0');
    const m = (min % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
}
function formatDuration(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}