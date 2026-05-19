/* ══════════════════════════════════════
   DARK / LIGHT MODE
══════════════════════════════════════ */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icon  = document.getElementById('themeIcon');
    const label = document.getElementById('themeLabel');
    if (theme === 'dark') {
        icon.className  = 'fa-solid fa-sun';
    } else {
        icon.className  = 'fa-solid fa-moon';
    }
}
 
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next    = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('ccs_theme', next);
    applyTheme(next);
 
    // Animate the icon on toggle
    const icon = document.getElementById('themeIcon');
    icon.style.transform = 'rotate(360deg)';
    icon.style.transition = 'transform 0.4s ease';
    setTimeout(() => { icon.style.transform = ''; icon.style.transition = ''; }, 400);
}
 
(function() { applyTheme(localStorage.getItem('ccs_theme') || 'light'); })();

const BASE = 'http://localhost:3000';

// Labs config — add or rename as needed to match your actual lab names
const LABS_CONFIG = [
    { name: 'Lab 524', alias: 'Laboratory 524', capacity: 40 },
    { name: 'Lab 525', alias: 'Laboratory 525', capacity: 40 },
    { name: 'Lab 526', alias: 'Laboratory 526', capacity: 40 },
    { name: 'Lab 527', alias: 'Laboratory 527', capacity: 40 },
    { name: 'Lab 528', alias: 'Laboratory 528', capacity: 40 },
];

/* ── Default software list (also reads from software.html localStorage) ── */
const DEFAULT_SOFTWARE = [
    { name: 'Microsoft Office 365', desc: 'Word, Excel, PowerPoint', icon: 'fa-file-word',    color: '#d94f3d', bg: '#d94f3d22' },
    { name: 'Visual Studio Code',   desc: 'Code editor',             icon: 'fa-code',          color: '#007acc', bg: '#007acc22' },
    { name: 'NetBeans IDE',         desc: 'Java development',        icon: 'fa-coffee',        color: '#f39c12', bg: '#f39c1222' },
    { name: 'XAMPP',                desc: 'Local PHP server',        icon: 'fa-server',        color: '#e74c3c', bg: '#e74c3c22' },
    { name: 'Python 3.x',           desc: 'Interpreter + IDLE',      icon: 'fa-python',        color: '#3776ab', bg: '#3776ab22' },
    { name: 'Android Studio',       desc: 'Mobile development',      icon: 'fa-android',       color: '#3ddc84', bg: '#3ddc8422' },
    { name: 'MySQL Workbench',      desc: 'Database management',     icon: 'fa-database',      color: '#00758f', bg: '#00758f22' },
    { name: 'Figma (Browser)',      desc: 'UI/UX design',            icon: 'fa-pen-ruler',     color: '#a259ff', bg: '#a259ff22' },
    { name: 'Google Chrome',        desc: 'Web browser',             icon: 'fa-globe',         color: '#4285f4', bg: '#4285f422' },
    { name: 'Cisco Packet Tracer',  desc: 'Network simulation',      icon: 'fa-network-wired', color: '#1ba0d8', bg: '#1ba0d822' },
    { name: 'Adobe Photoshop',      desc: 'Photo editing',           icon: 'fa-image',         color: '#31a8ff', bg: '#31a8ff22' },
    { name: 'VMware Workstation',   desc: 'Virtual machines',        icon: 'fa-hard-drive',    color: '#607078', bg: '#60707822' },
];

// ── NOTIFICATION ─────────────────────────────────────────────────────────
let _announcements = [];
function toggleNotifDropdown(e) {
    e.preventDefault();
    const d = document.getElementById('notifDropdown');
    d.style.display = d.style.display === 'block' ? 'none' : 'block';
}
document.addEventListener('click', (e) => {
    if (!e.target.closest('li:has(#notifDropdown)')) {
        const d = document.getElementById('notifDropdown');
        if (d) d.style.display = 'none';
    }
});
function getReadIds() { return JSON.parse(localStorage.getItem('readIds') || '[]'); }
function saveReadIds(ids) { localStorage.setItem('readIds', JSON.stringify(ids)); }
function markAllRead() { saveReadIds(_announcements.map(a => a.id)); renderNotifs(); }
function renderNotifs() {
    const readIds = getReadIds();
    const unread = _announcements.filter(a => !readIds.includes(a.id)).length;
    const badge = document.getElementById('notifBadge');
    badge.textContent = unread; badge.style.display = unread > 0 ? 'flex' : 'none';
    document.getElementById('notifList').innerHTML = _announcements.length
        ? _announcements.map(a => `
            <div onclick="markOneRead(${a.id})" style="padding:12px 14px;border-bottom:1px solid #eee;
                cursor:pointer;background:${!readIds.includes(a.id) ? '#eaf3fb' : 'white'}">
                <div style="font-size:11px;color:#888;">${a.createdAt}</div>
                <div style="font-size:13px;color:#222;margin-top:3px;">${a.message}</div>
            </div>`).join('')
        : '<p style="text-align:center;color:#aaa;padding:20px;font-size:13px;">No announcements yet.</p>';
}
function markOneRead(id) {
    const ids = getReadIds();
    if (!ids.includes(id)) { ids.push(id); saveReadIds(ids); renderNotifs(); }
}
async function pollAnnouncements() {
    try { const r = await fetch(`${BASE}/api/announcements`); _announcements = await r.json(); renderNotifs(); } catch(e) {}
}
pollAnnouncements();
setInterval(pollAnnouncements, 30000);

let _resNotifs = [];

async function pollResNotifs() {
    const idNumber = localStorage.getItem('loggedInId');
    if (!idNumber) return;
    try {
        const res = await fetch(`http://localhost:3000/notifications/${idNumber}`);
        _resNotifs = await res.json();
        renderCombinedNotifs();
    } catch(e) {}
}

function renderCombinedNotifs() {
    const readIds    = getReadIds();
    const unreadAnn  = _announcements.filter(a => !readIds.includes(a.id)).length;
    const unreadRes  = _resNotifs.filter(n => n.isRead === 0).length;
    const totalUnread = unreadAnn + unreadRes;

    const badge = document.getElementById('notifBadge');
    badge.textContent = totalUnread;
    badge.style.display = totalUnread > 0 ? 'flex' : 'none';

    let html = '';

    _resNotifs.forEach(n => {
        const isAccepted = n.message.startsWith('✅');
        html += `
            <div onclick="markResNotifRead(${n.id})" style="padding:12px 14px;border-bottom:1px solid #eee;cursor:pointer;
                background:${n.isRead ? 'white' : (isAccepted ? '#eaf7ee' : '#fdf0f0')};">
                <div style="font-size:14px;color:#888;">Reservation Update | ${n.createdAt || ''}</div>
                <div style="font-size:14px;color:${n.isRead ? '#888' : '#222'};margin-top:3px;font-family:'Sora',sans-serif;">${n.message}</div>
            </div>`;
    });

    _announcements.forEach(a => {
        html += `
            <div onclick="markOneRead(${a.id})" style="padding:12px 14px;border-bottom:1px solid #eee;cursor:pointer;
                background:${!readIds.includes(a.id) ? '#eaf3fb' : 'white'}">
                <div style="font-size:14px;color:#888;">${a.createdAt}</div>
                <div style="font-size:14px;color:#222;margin-top:3px;font-family:'Sora',sans-serif;">${a.message}</div>
            </div>`;
    });

    document.getElementById('notifList').innerHTML = html ||
        '<p style="text-align:center;color:#aaa;padding:20px;font-size:13px;">No notifications yet.</p>';
}

async function markResNotifRead(id) {
    try {
        await fetch(`http://localhost:3000/notifications/read/${id}`, { method: 'POST' });
        const n = _resNotifs.find(x => x.id === id);
        if (n) n.isRead = 1;
        renderCombinedNotifs();
    } catch(e) {}
}

// Override markAllRead to also clear reservation notifs
const _origMarkAllRead = markAllRead;
window.markAllRead = function() {
    _origMarkAllRead();
    const idNumber = localStorage.getItem('loggedInId');
    if (idNumber) {
        fetch(`http://localhost:3000/notifications/read-all/${idNumber}`, { method: 'POST' })
            .then(() => { _resNotifs.forEach(n => n.isRead = 1); renderCombinedNotifs(); })
            .catch(() => {});
    }
};

// Override renderNotifs so announcements also trigger a combined re-render
const _origRenderNotifs = renderNotifs;
window.renderNotifs = function() {
    _origRenderNotifs();
    renderCombinedNotifs();
};

// SweetAlert popup when a new accept/deny arrives
let _lastResNotifCount = 0;
async function checkForNewResNotifs() {
    const idNumber = localStorage.getItem('loggedInId');
    if (!idNumber) return;
    try {
        const res    = await fetch(`http://localhost:3000/notifications/${idNumber}`);
        const notifs = await res.json();
        const unread = notifs.filter(n => n.isRead === 0);
        if (unread.length > _lastResNotifCount && _lastResNotifCount !== -1) {
            const latest     = unread[0];
            const isAccepted = latest.message.startsWith('✅');
            Swal.fire({
                icon: isAccepted ? 'success' : 'error',
                title: isAccepted ? 'Reservation Accepted!' : 'Reservation Denied',
                text: latest.message.replace(/^[✅❌]\s*/, ''),
                confirmButtonColor: isAccepted ? '#28a745' : '#dc3545',
                confirmButtonText: 'OK'
            });
        }
        _lastResNotifCount = unread.length;
        _resNotifs = notifs;
        renderCombinedNotifs();
    } catch(e) {}
}

pollResNotifs();
setTimeout(async () => {
    const idNumber = localStorage.getItem('loggedInId');
    if (!idNumber) return;
    try {
        const res    = await fetch(`http://localhost:3000/notifications/${idNumber}`);
        const notifs = await res.json();
        _lastResNotifCount = notifs.filter(n => n.isRead === 0).length;
    } catch(e) { _lastResNotifCount = 0; }
}, 500);
setInterval(checkForNewResNotifs, 15000);

/* ══ RENDER SOFTWARE ══ */
function renderSoftware() {
    let registered = [];
    try { registered = JSON.parse(localStorage.getItem('ccs_software') || '[]'); } catch(e) {}
    const list = registered.length > 0 ? registered : DEFAULT_SOFTWARE;
 
    document.getElementById('softwareGrid').innerHTML = list.map(sw => {
        const name  = sw.name  || 'Unknown';
        const desc  = sw.desc  || sw.category || '';
        const icon  = sw.icon  || 'fa-box';
        const color = sw.color || '#4e73df';
        const bg    = sw.bg    || color + '22';
        return `
            <div class="sw-card">
                <div class="sw-icon" style="background:${bg};color:${color};">
                    <i class="fa-solid ${icon}"></i>
                </div>
                <div>
                    <span class="sw-name">${name}</span>
                    <span class="sw-desc">${desc}</span>
                    <span class="sw-installed"><i class="fa fa-circle-check"></i> Installed</span>
                </div>
            </div>`;
    }).join('');
}

// ── LOAD LAB STATUS ───────────────────────────────────────────────────────
async function loadLabStatus() {
    try {
        const res = await fetch(`${BASE}/get-sitin`);
        const sitins = await res.json();
 
        const labMap = {};
        sitins.forEach(s => {
            const key = s.lab || 'Unknown';
            if (!labMap[key]) labMap[key] = [];
            labMap[key].push(s);
        });
 
        const labs = LABS_CONFIG.map(cfg => ({
            ...cfg,
            students: labMap[cfg.name] || labMap[cfg.alias] || []
        }));
 
        // add any unknown labs from DB
        Object.keys(labMap).forEach(k => {
            if (!LABS_CONFIG.find(l => l.name === k || l.alias === k))
                labs.push({ name: k, alias: k, capacity: 40, students: labMap[k] });
        });
 
        document.getElementById('labsGrid').innerHTML = labs.map(lab => {
            const count = lab.students.length;
            const cap   = lab.capacity;
            const free  = cap - count;
            const pct   = Math.min(Math.round((count / cap) * 100), 100);
 
            const fillCls = pct >= 90 ? 'fill-high' : pct >= 50 ? 'fill-medium' : 'fill-low';
            const iconCls = count === 0 ? '' : count >= cap ? 'full' : 'occupied';
            const tagCls  = count === 0 ? '' : count >= cap ? 'warn' : 'busy';
            const iconFA  = count === 0 ? 'fa-desktop' : count >= cap ? 'fa-ban' : 'fa-users';
            const tagTxt  = count === 0 ? `${free} free` : count >= cap ? 'Full' : `${free} free`;
 
            return `
                <div class="room-card">
                    <div class="room-top">
                        <div class="room-icon ${iconCls}"><i class="fa ${iconFA}"></i></div>
                        <div>
                            <div class="room-name">${lab.alias}</div>
                            <div class="room-meta">${count} / ${cap} PCs available</div>
                        </div>
                    </div>
                    <div class="room-bar-wrap">
                        <div class="room-bar-fill ${fillCls}" style="width:${pct}%;"></div>
                    </div>
                    <div class="room-foot">
                        <span class="room-free-tag ${tagCls}">${tagTxt}</span>
                        <span class="room-count">${count} in use</span>
                    </div>
                </div>`;
        }).join('');
 
        const now = new Date();
        document.getElementById('lastUpdated').textContent =
            `Last updated: ${now.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' })}`;
 
    } catch(err) {
        document.getElementById('labsGrid').innerHTML = `
            <div class="empty-state">
                <i class="fa fa-exclamation-circle" style="color:#e74c3c;"></i>
                Could not load lab status. Make sure the server is running.
            </div>`;
    }
}

// ── LOGOUT ───────────────────────────────────────────────────────────────
async function logout() {
    const studentId = localStorage.getItem('loggedInId');
    
    const { isConfirmed } = await Swal.fire({
        title: 'Logout?',
        text: "This will end your current lab session and log you out.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#0056b3',
        confirmButtonText: 'Yes, Logout!'
    });

    if (isConfirmed) {
        try {
            if (studentId) {
                await fetch("http://localhost:3000/logout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ idNumber: studentId })
                });
            }

            localStorage.removeItem('loggedInId');
            localStorage.removeItem('sessionExpiry');
            sessionStorage.clear();

            await Swal.fire({
                icon: 'success',
                title: 'Logged Out',
                text: 'Your session has been closed.',
                timer: 1500,
                showConfirmButton: false
            });
            window.location.href = 'login.html';
        } catch (err) {
            console.error("Logout error:", err);
            localStorage.removeItem('loggedInId');
            window.location.href = 'login.html';
        }
    }
}

// ── INIT + AUTO-REFRESH ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const idNumber = localStorage.getItem('loggedInId');
    if (!idNumber) { window.location.href = 'login.html'; return; }
    pollAnnouncements();
    setInterval(pollAnnouncements, 30000);
    renderSoftware();
    loadLabStatus();
    setInterval(loadLabStatus, 30000);
});