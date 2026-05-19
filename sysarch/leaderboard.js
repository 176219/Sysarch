const BASE = 'http://localhost:3000';

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
 
// Load saved theme on page start
(function() {
    const saved = localStorage.getItem('ccs_theme') || 'light';
    applyTheme(saved);
})();

// ── NOTIFICATION SYSTEM ──────────────────────────────────────────────
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

function markAllRead() {
    saveReadIds(_announcements.map(a => a.id));
    renderNotifs();
}

function renderNotifs() {
    const readIds = getReadIds();
    const unread = _announcements.filter(a => !readIds.includes(a.id)).length;
    const badge = document.getElementById('notifBadge');
    badge.textContent = unread;
    badge.style.display = unread > 0 ? 'flex' : 'none';

    document.getElementById('notifList').innerHTML = _announcements.length
        ? _announcements.map(a => `
            <div onclick="markOneRead(${a.id})" style="padding:12px 14px; border-bottom:1px solid #eee;
                cursor:pointer; background:${!readIds.includes(a.id) ? '#eaf3fb' : 'white'}">
                <div style="font-size:11px; color:#888;">${a.createdAt}</div>
                <div style="font-size:13px; color:#222; margin-top:3px;">${a.message}</div>
            </div>`).join('')
        : '<p style="text-align:center;color:#aaa;padding:20px;font-size:13px;">No announcements yet.</p>';
}

function markOneRead(id) {
    const ids = getReadIds();
    if (!ids.includes(id)) { ids.push(id); saveReadIds(ids); renderNotifs(); }
}

async function pollAnnouncements() {
    try {
        const res = await fetch(`${BASE}/api/announcements`);
        _announcements = await res.json();
        renderNotifs();
    } catch(e) {}
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

// ── LEADERBOARD LOGIC ─────────────────────────────────────────────────
async function loadLeaderboard() {
    const myId = localStorage.getItem('loggedInId');
    if (!myId) { window.location.href = 'login.html'; return; }

    try {
        const res = await fetch(`${BASE}/admin/leaderboard`);
        if (!res.ok) throw new Error('Server error');
        const data = await res.json(); // [{ idNumber, firstName, lastName, course, sitins, points }, ...]

        renderTable(data, myId);
        renderMyRank(data, myId);
    } catch (err) {
        console.error('Leaderboard error:', err);
        document.getElementById('leaderboardContent').innerHTML =
            '<div class="lb-loading"><i class="fa fa-exclamation-circle" style="color:#e74c3c;animation:none;"></i>Could not load leaderboard.<br><small>Make sure the server is running.</small></div>';
    }
}

function renderTable(data, myId) {
    const container = document.getElementById('leaderboardContent');

    if (!data.length) {
        container.innerHTML = '<div class="empty-lb"><i class="fa fa-ghost"></i><br>No data yet. Be the first to sit in!</div>';
        return;
    }

    const trophyIcons = ['trophy-1', 'trophy-2', 'trophy-3'];
    const rankClasses = ['rank-1', 'rank-2', 'rank-3'];

    const rows = data.map((s, i) => {
        const rank  = i + 1;
        const isMe  = s.idNumber === myId;
        const rankBadgeClass = rank <= 3 ? rankClasses[rank - 1] : 'rank-other';
        const rowClass       = isMe ? 'current-user-row' : '';
        const meLabel        = isMe ? ' <span style="font-size:14px;background:#4e73df;color:#fff;padding:1px 6px;border-radius:8px;vertical-align:middle;">You</span>' : '';

        return `
            <tr class="${rowClass}">
                <td><span class="rank-badge ${rankBadgeClass}">${rank <= 3 ? '<i class="fa fa-trophy ' + (trophyIcons[rank-1]) + '"></i>' : '#' + rank}</span></td>
                <td>${s.firstName} ${s.lastName}${meLabel}</td>
                <td><span class="course-chip">${s.course || '—'}</span></td>
                <td>${s.sitins}</td>
                <td><span class="points-badge">${s.points}</span></td>
            </tr>`;
    }).join('');

    container.innerHTML = `
        <table class="lb-table">
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Sit-ins</th>
                    <th>Points</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
}

function renderMyRank(data, myId) {
    const idx = data.findIndex(s => s.idNumber === myId);
    const me  = data[idx];

    document.getElementById('totalStudents').textContent = data.length;

    if (!me) {
        document.getElementById('yourRankNumber').textContent = '—';
        document.getElementById('yourRankNumber').style.color = '#aaa';
        document.getElementById('yourPoints').textContent     = '0';
        document.getElementById('yourSitins').textContent     = '0';
        return;
    }

    const rank = idx + 1;
    const rankColors = { 1: '#ffd700', 2: '#c0c0c0', 3: '#cd7f32' };
    document.getElementById('yourRankNumber').textContent = `#${rank}`;
    document.getElementById('yourRankNumber').style.color = rankColors[rank] || '#4e73df';
    document.getElementById('yourPoints').textContent     = me.points;
    document.getElementById('yourSitins').textContent     = me.sitins;
}

// ── LOGOUT ─────────────────────────────────────────────────────────────
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

// ── INIT ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadLeaderboard);
