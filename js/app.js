// DOM Elements
const timeEl = document.getElementById('clock-time');
const ampmEl = document.getElementById('clock-ampm');
const dateEl = document.getElementById('clock-date');

const feedPercentageEl = document.getElementById('feed-percentage');
const feedStatusText = document.getElementById('feed-status-text');
const feedProgressBar = document.getElementById('feed-progress-bar');

const lastFeedingTimeEl = document.getElementById('last-feeding-time');
const lastFeedingAmountEl = document.getElementById('last-feeding-amount');
const nextFeedingTimeEl = document.getElementById('next-feeding-time');
const nextFeedingCountdownEl = document.getElementById('next-feeding-countdown');

const scheduleListEl = document.getElementById('schedule-list');
const logsListEl = document.getElementById('logs-list');
const btnFeedNow = document.getElementById('btn-manual-feed');

// Live Clock Function
function updateClock() {
    const now = new Date();
    
    // Time format
    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;
    
    timeEl.textContent = `${hours}:${minutes}:${seconds}`;
    ampmEl.textContent = ampm;
    
    // Date format
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const date = now.getDate();
    const year = now.getFullYear();
    
    // Calculate week of month (simple approach)
    const weekOfMonth = Math.ceil((date - 1 - now.getDay()) / 7) + 1;
    
    dateEl.textContent = `Today • ${dayName}, Week ${weekOfMonth}`;
}

setInterval(updateClock, 1000);
updateClock();

// SPA Navigation Logic
const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
const pageSections = document.querySelectorAll('.page-section');
const pageTitleEl = document.getElementById('page-title');

const sectionTitles = {
    'dashboard': 'Admin Dashboard',
    'live-monitor': 'Live Monitor',
    'schedule': 'Schedule Management',
    'logs': 'System Logs',
    'inventory': 'Inventory',
    'settings': 'Settings'
};

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Remove active class from all nav items
        navItems.forEach(nav => nav.classList.remove('active'));
        
        // Add active class to clicked item
        item.classList.add('active');
        
        // Hide all sections
        pageSections.forEach(section => {
            section.style.display = 'none';
        });
        
        // Show target section
        const targetId = item.getAttribute('data-target');
        const targetSection = document.getElementById('section-' + targetId);
        if (targetSection) {
            targetSection.style.display = 'block';
        }

        // Update title
        if (sectionTitles[targetId]) {
            pageTitleEl.textContent = sectionTitles[targetId];
        }
    });
});

// --- FIREBASE LOGIC (with fallback mock handling) ---

const feederRef = database.ref('feeder');

// Listen for status changes
feederRef.child('status').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        updateStatusCards(data);
    } else {
        // Mock data initialization if empty
        initMockData();
    }
}, (error) => {
    console.error("Firebase read failed: ", error);
});

// Listen for schedule
feederRef.child('schedule').on('value', (snapshot) => {
    const data = snapshot.val();
    renderSchedule(data);
});

// Listen for logs
feederRef.child('logs').limitToLast(5).on('value', (snapshot) => {
    const data = snapshot.val();
    renderLogs(data);
});

// Feed Now Button
btnFeedNow.addEventListener('click', () => {
    // Send a command to Firebase that the hardware will listen to
    feederRef.child('control').update({
        dispense_now: true,
        trigger_time: Date.now()
    });
    alert('Dispense command sent!');
});

// Helper Functions
function updateStatusCards(data) {
    // Feed Level
    const level = data.feedLevel || 0;
    feedPercentageEl.textContent = level;
    feedProgressBar.style.width = `${level}%`;
    
    if (level <= 20) {
        feedStatusText.textContent = 'Low';
        feedStatusText.style.color = 'var(--color-feed-low)';
        feedProgressBar.classList.add('low');
    } else {
        feedStatusText.textContent = 'Healthy';
        feedStatusText.style.color = 'var(--text-muted)';
        feedProgressBar.classList.remove('low');
    }
    
    // Last / Next Feeding
    lastFeedingTimeEl.textContent = data.lastFeedingTime || '--:-- --';
    lastFeedingAmountEl.textContent = data.lastFeedingAmount || '--';
    nextFeedingTimeEl.textContent = data.nextFeedingTime || '--:-- --';
    
    // Countdown calculation (simplified for mock implementation)
    // In a real app, you'd match server time to the next scheduled time natively
    nextFeedingCountdownEl.textContent = data.nextFeedingCountdown || '--h --m';
}

function renderSchedule(data) {
    scheduleListEl.innerHTML = '';
    if (!data) {
        scheduleListEl.innerHTML = '<li>No schedules found.</li>';
        return;
    }
    
    // Assuming data is an object of schedules
    for (const key in data) {
        const item = data[key];
        const li = document.createElement('li');
        li.innerHTML = `
            <i class="far fa-calendar-check schedule-icon"></i>
            <span class="schedule-day">${item.day}</span>
            <span class="schedule-time">${item.time}</span>
            <span class="schedule-amount">${item.amount} g</span>
        `;
        scheduleListEl.appendChild(li);
    }
}

function renderLogs(data) {
    logsListEl.innerHTML = '';
    if (!data) {
        logsListEl.innerHTML = '<li>No recent logs.</li>';
        return;
    }
    
    // Convert object to array and reverse to show newest first
    const logsArray = Object.keys(data).map(key => data[key]).reverse();
    
    logsArray.forEach(log => {
        const li = document.createElement('li');
        let iconClass = 'fas fa-check-circle completed';
        if (log.type === 'warning') iconClass = 'fas fa-exclamation-triangle warning';
        if (log.type === 'error') iconClass = 'fas fa-times-circle error';
        
        li.innerHTML = `
            <i class="${iconClass} log-icon"></i>
            <span class="log-time">${log.time}</span>
            <span class="log-message">${log.message}</span>
        `;
        logsListEl.appendChild(li);
    });
}

// Initial Mock Data insertion (Only runs if Firebase DB is empty on load)
function initMockData() {
    feederRef.set({
        status: {
            feedLevel: 18,
            feedLevelStatus: "Low",
            lastFeedingTime: "08:00 AM",
            lastFeedingAmount: 250,
            nextFeedingTime: "08:00 PM",
            nextFeedingCountdown: "9h 36m"
        },
        schedule: {
            s1: { day: "Mon", time: "8:00 AM", amount: 250 },
            s2: { day: "Mon", time: "8:00 PM", amount: 250 },
            s3: { day: "Tue", time: "8:00 AM", amount: 250 },
            s4: { day: "Tue", time: "8:00 PM", amount: 250 }
        },
        logs: {
            l1: { time: "10:00:00 AM", message: "250 g Completed", type: "success" },
            l2: { time: "08:00:00 AM", message: "250 g Completed", type: "success" },
            l3: { time: "07:59:50 AM", message: "Low Feed 18%", type: "warning" },
            l4: { time: "Yesterday", message: "Schedule Updated", type: "info" }
        },
        control: {
            dispense_now: false
        }
    });
}
