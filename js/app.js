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

// --- FIREBASE LOGIC & APP STATE ---
const auth = firebase.auth();
let userDeviceId = null;
let feederRef = null;

// Authenticate and bind user's device
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'index.html'; // Redirect to login if not authenticated
        return;
    }
    
    // Fetch Device ID associated with User
    const userRef = firebase.database().ref('users/' + user.uid);
    const snap = await userRef.once('value');
    if (snap.exists() && snap.val().deviceId) {
        userDeviceId = snap.val().deviceId;
        feederRef = firebase.database().ref('devices/' + userDeviceId);
        
        // Start listening to this device's node
        initializeRealtimeListeners();
    } else {
        // Attempt recovery if device is missing
        let manualDevice = prompt("No device linked! This sometimes happens due to an interrupted signup. Please enter your Device ID to link it now:");
        if (manualDevice) {
            manualDevice = manualDevice.trim();
            try {
                const devRef = firebase.database().ref('devices/' + manualDevice);
                const devSnap = await devRef.once('value');
                if (devSnap.exists()) {
                    if (devSnap.child('owner').exists() && devSnap.child('owner').val() !== user.uid) {
                        alert("This Device ID is already registered to another user.");
                    } else {
                        await firebase.database().ref('users/' + user.uid).set({ deviceId: manualDevice });
                        await devRef.child('owner').set(user.uid);
                        alert("Device linked successfully!");
                        window.location.reload();
                    }
                } else {
                    alert("Device ID not found in database.");
                }
            } catch (err) {
                alert("Error linking device: " + err.message);
            }
        } else {
            alert("No device linked to this account!");
        }
    }
});

function initializeRealtimeListeners() {
    // Status
    feederRef.child('status').on('value', (snapshot) => {
        const data = snapshot.val() || { feedLevel: 0, lastFeedingTime: '--', nextFeedingTime: '--' };
        updateStatusCards(data);
    });

    // Schedule (Dashboard list)
    feederRef.child('schedule').on('value', (snapshot) => {
        const data = snapshot.val();
        renderSchedule(data);
    });

    // Logs (grouped by day)
    feederRef.child('logs').orderByChild('timestamp').limitToLast(50).on('value', (snapshot) => {
        const data = snapshot.val();
        renderLogsGrouped(data);
    });
}

// Feed Now Button
btnFeedNow.addEventListener('click', () => {
    if (!feederRef) return;
    feederRef.child('control').update({ dispense_now: true, trigger_time: Date.now() });
    alert('Dispense command sent to device!');
});

// Logout Button
document.getElementById('btn-logout').addEventListener('click', () => {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
});

// Dynamic Schedule Form - Adding time inputs based on dropdown
const timesCountSelect = document.getElementById('schedule-times-count');
const dynamicTimeInputsContainer = document.getElementById('dynamic-time-inputs');

if(timesCountSelect) {
    timesCountSelect.addEventListener('change', (e) => {
        const count = parseInt(e.target.value);
        dynamicTimeInputsContainer.innerHTML = '';
        
        for(let i = 1; i <= count; i++) {
            dynamicTimeInputsContainer.innerHTML += `
                <div>
                    <label style="display:inline-block; width: 60px;">Time ${i}:</label>
                    <input type="time" class="schedule-time-input" required style="padding:8px; border:1px solid #ccc; border-radius:4px;">
                </div>
            `;
        }
    });
}

// Handle New Schedule Submission
document.getElementById('schedule-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if(!feederRef) return alert("Device not connected yet.");

    const checkboxes = document.querySelectorAll('input[name="days"]:checked');
    const timeInputs = document.querySelectorAll('.schedule-time-input');
    const amount = document.getElementById('schedule-amount').value;

    if(checkboxes.length === 0) return alert("Please select at least one day.");
    if(timeInputs.length === 0) return;
    
    checkboxes.forEach(cb => {
        timeInputs.forEach(timeInput => {
            const time = timeInput.value;
            if(!time) return;

            // Format time to 12-hour AM/PM for display
            let [h, m] = time.split(':');
            let ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            const formattedTime = `${h}:${m} ${ampm}`;

            feederRef.child('schedule').push({
                day: cb.value,
                time: formattedTime,
                rawTime: time,
                amount: parseInt(amount)
            });
        });
    });

    alert("Schedules successfully added!");
    
    // Reset form and reset dynamic inputs back to 1
    e.target.reset();
    timesCountSelect.value = "1";
    timesCountSelect.dispatchEvent(new Event('change'));
});

// Helper Functions
function updateStatusCards(data) {
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
    
    lastFeedingTimeEl.textContent = data.lastFeedingTime || '--:-- --';
    lastFeedingAmountEl.textContent = data.lastFeedingAmount || '--';
    nextFeedingTimeEl.textContent = data.nextFeedingTime || '--:-- --';
    nextFeedingCountdownEl.textContent = data.nextFeedingCountdown || '--h --m';
}

function renderSchedule(data) {
    scheduleListEl.innerHTML = '';
    const fullListEl = document.getElementById('full-schedule-list');
    if(fullListEl) fullListEl.innerHTML = '';

    if (!data) {
        const emptyMsg = '<li>No schedules found.</li>';
        scheduleListEl.innerHTML = emptyMsg;
        if(fullListEl) fullListEl.innerHTML = emptyMsg;
        return;
    }
    
    for (const key in data) {
        const item = data[key];
        const li = `<li style="display:flex; align-items:center; border-bottom:1px solid #eee; padding:15px 20px;">
            <i class="far fa-calendar-check schedule-icon" style="color:#F39C12; margin-right:15px;"></i>
            <span class="schedule-day" style="font-weight:bold; width:60px;">${item.day}</span>
            <span class="schedule-time" style="flex:1;">${item.time}</span>
            <span class="schedule-amount" style="font-weight:500;">${item.amount} g</span>
        </li>`;
        scheduleListEl.innerHTML += li;
        if(fullListEl) fullListEl.innerHTML += li;
    }
}

function renderLogsGrouped(data) {
    logsListEl.innerHTML = '';
    const fullLogsEl = document.getElementById('full-logs-list');
    if(fullLogsEl) fullLogsEl.innerHTML = '';

    if (!data) {
        logsListEl.innerHTML = '<li>No recent logs.</li>';
        if(fullLogsEl) fullLogsEl.innerHTML = '<li>No recent logs.</li>';
        return;
    }

    // Convert to array and group by date
    const logsArray = Object.keys(data).map(key => data[key]).reverse();
    const grouped = {};

    logsArray.forEach(log => {
        // Assume log.timestamp represents ms or date string. If not, fallback to log.date or "Unknown Date"
        const d = new Date(log.timestamp || Date.now()); 
        const dateString = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        if(!grouped[dateString]) grouped[dateString] = [];
        grouped[dateString].push(log);
    });

    for (let date in grouped) {
        // Print Header for Day
        if(fullLogsEl) fullLogsEl.innerHTML += `<div style="background:#f9f9f9; padding:8px; font-weight:bold; margin-top:10px; color:#555;">${date}</div>`;
        
        grouped[date].forEach(log => {
            let iconClass = 'fas fa-check-circle completed';
            if (log.type === 'warning') iconClass = 'fas fa-exclamation-triangle warning';
            if (log.type === 'error') iconClass = 'fas fa-times-circle error';
            
            const timeStr = log.time || new Date(log.timestamp).toLocaleTimeString();
            
            const li = `<li style="display:flex; align-items:center; border-bottom:1px solid #eee; padding:10px;">
                <i class="${iconClass} log-icon" style="margin-right:15px; color:${log.type==='warning'?'#F39C12':'#2EBA8A'}"></i>
                <span class="log-time" style="width:100px; font-size:12px;">${timeStr}</span>
                <span class="log-message" style="flex:1; color:#666;">${log.message}</span>
            </li>`;
            
            // Add to both limited dashboard list and full logs list
            if(logsListEl.children.length < 5) logsListEl.innerHTML += li; 
            if(fullLogsEl) fullLogsEl.innerHTML += li;
        });
    }
}
