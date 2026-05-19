const BASE = 'http://localhost:3000';
const COLORS = ['#4e73df','#1cc88a','#ffc107','#e74c3c','#9b59b6','#2c3e70','#f39c12'];

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

// ── NOTIFICATION ──────────────────────────────────────────────────────────
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
    badge.textContent = unread;
    badge.style.display = unread > 0 ? 'flex' : 'none';
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

// ── HELPERS ───────────────────────────────────────────────────────────────
function parseMinutes(timeIn, timeOut) {
    if (!timeIn || !timeOut || timeOut === 'null' || timeOut === '') return 0;
    try {
        const toMins = t => {
            const clean = t.replace(/\s?(AM|PM)/i, '');
            const [h, m] = clean.split(':').map(Number);
            const isPM = /PM/i.test(t);
            return (isPM && h !== 12 ? h + 12 : (!isPM && h === 12 ? 0 : h)) * 60 + m;
        };
        return Math.max(0, toMins(timeOut) - toMins(timeIn));
    } catch { return 0; }
}

function fmtMins(mins) {
    if (mins <= 0) return '—';
    const h = Math.floor(mins / 60), m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── LOAD SUMMARY ──────────────────────────────────────────────────────────
let sessionChartInstance = null;

async function loadSummary() {
    const idNumber = localStorage.getItem('loggedInId');
    if (!idNumber) { window.location.href = 'login.html'; return; }

    try {
        // Fetch history + student profile in parallel
        const [histRes, studentRes] = await Promise.all([
            fetch(`${BASE}/history/${idNumber}`),
            fetch(`${BASE}/student/${idNumber}`)
        ]);
        const history = await histRes.json();
        const student = await studentRes.json();

        // ── COMPUTE STATS ──
        const totalSitins = history.length;
        let totalMins = 0;
        const purposeMap = {};

        history.forEach(row => {
            const mins = parseMinutes(row.timeIn, row.timeOut);
            totalMins += mins;
            const p = row.purpose || 'Other';
            purposeMap[p] = (purposeMap[p] || 0) + 1;
        });

        const avgMins = totalSitins > 0 ? Math.round(totalMins / totalSitins) : 0;
        const remaining = student.remainingSession ?? 30;
        const used = 30 - remaining;

        // Points formula (same as leaderboard)
        const timeBonus = Math.min(Math.floor(totalMins / 20), 5);
        const longBonus = totalMins >= 120 ? 2 : 0;
        const points = totalSitins + timeBonus + longBonus;

        // ── STAT CARDS ──
        document.getElementById('statTotalSitins').textContent = totalSitins;
        document.getElementById('statTotalHours').textContent  = fmtMins(totalMins);
        document.getElementById('statPoints').textContent      = points;
        document.getElementById('statAvgSession').textContent  = fmtMins(avgMins);

        // ── SESSION GAUGE ──
        document.getElementById('gaugeLabel').textContent       = remaining;
        document.getElementById('sessionUsed').textContent      = used;
        document.getElementById('sessionRemaining').textContent = remaining;
        renderSessionGauge(used, remaining);

        // ── RECENT ACTIVITY ──
        renderRecentActivity(history.slice(0, 8));

        // ── PURPOSE BREAKDOWN ──
        renderPurposeBreakdown(purposeMap, totalSitins);

    } catch (err) {
        console.error('Summary error:', err);
    }
}

function renderSessionGauge(used, remaining) {
    const ctx = document.getElementById('sessionChart').getContext('2d');
    if (sessionChartInstance) sessionChartInstance.destroy();

    const pct = used / 30;
    const gaugeColor = pct >= 0.9 ? '#e74c3c' : pct >= 0.6 ? '#ffc107' : '#1cc88a';

    sessionChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [used, remaining],
                backgroundColor: [gaugeColor, '#f0f2f5'],
                borderWidth: 0,
                circumference: 180,
                rotation: 270
            }]
        },
        options: {
            cutout: '78%',
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            animation: { animateRotate: true }
        }
    });
}

function renderRecentActivity(rows) {
    const el = document.getElementById('recentActivity');
    if (!rows.length) {
        el.innerHTML = '<div class="empty-state">No sit-in records yet.</div>';
        return;
    }

    const tableRows = rows.map(r => {
        const isDone = r.timeOut && r.timeOut !== 'null' && r.timeOut !== '';
        const statusBadge = isDone
            ? `<span class="status-done">Done</span>`
            : `<span class="status-active">Active</span>`;
        const duration = isDone ? fmtMins(parseMinutes(r.timeIn, r.timeOut)) : '—';

        return `
            <tr>
                <td>${r.date || '—'}</td>
                <td>${r.purpose || '—'}</td>
                <td>${r.lab || '—'}</td>
                <td>${r.timeIn || '—'}</td>
                <td>${r.timeOut && r.timeOut !== 'null' ? r.timeOut : '—'}</td>
                <td>${duration}</td>
                <td>${statusBadge}</td>
            </tr>`;
    }).join('');

    el.innerHTML = `
        <table class="activity-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Purpose</th>
                    <th>Lab</th>
                    <th>Time In</th>
                    <th>Time Out</th>
                    <th>Duration</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
        </table>`;
}

function renderPurposeBreakdown(purposeMap, total) {
    const el = document.getElementById('purposeBreakdown');
    const entries = Object.entries(purposeMap).sort((a,b) => b[1] - a[1]);

    if (!entries.length) {
        el.innerHTML = '<div class="empty-state">No data yet.</div>';
        return;
    }

    el.innerHTML = `<div class="purpose-list">${
        entries.map(([name, count], i) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return `
                <div class="purpose-item">
                    <div class="purpose-top">
                        <span class="purpose-name">${name}</span>
                        <span class="purpose-count">${count} (${pct}%)</span>
                    </div>
                    <div class="progress-bar-wrap">
                        <div class="progress-bar-fill" style="width:${pct}%;background:${COLORS[i % COLORS.length]};"></div>
                    </div>
                </div>`;
        }).join('')
    }</div>`;
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

// ── INIT ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadSummary);