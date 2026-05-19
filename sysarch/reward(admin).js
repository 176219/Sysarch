/* ═══════════════════════════════════════════════════════════════
   reward.js  –  Reward / Leaderboard page (admin)
   Includes: theme toggle, modal helpers, student search modal,
             leaderboard table, award points, unified sit-in modal,
             reset sessions, logout
   ═══════════════════════════════════════════════════════════════ */

const BASE             = 'http://localhost:3000';
const SESSION_DURATION = 60;

/* ── MODAL HELPERS ──────────────────────────────────────────────────────── */
function openModal(id)  { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

/* ── STUDENT SEARCH MODAL ───────────────────────────────────────────────── */
function openSearchModal() {
    openModal('searchModal');
    document.getElementById('modalSearchInput').focus();
}

async function executeSearch(event) {
    if (event) event.preventDefault();

    const id = document.getElementById('modalSearchInput').value.trim();
    if (!id) return Swal.fire('Error', 'Please enter an ID', 'error');

    try {
        const res  = await fetch(`${BASE}/student/${id}`);
        const data = await res.json();

        if (res.ok) {
            closeModal('searchModal');

            let timeLeftText = 'No active session';
            if (data.timeIn && !data.timeOut) {
                const diffMinutes = Math.floor((new Date() - new Date(data.timeIn)) / 60000);
                const remaining   = SESSION_DURATION - diffMinutes;
                timeLeftText = remaining > 0 ? `${remaining} minutes left` : 'Session expired';
            }

            document.getElementById('infoBody').innerHTML = `
                <p><b>ID Number:</b> ${data.idNumber}</p>
                <p><b>Name:</b> ${data.firstName} ${data.lastName}</p>
                <p><b>Course:</b> ${data.course   || 'N/A'}</p>
                <p><b>Email:</b> ${data.email     || 'N/A'}</p>
                <p><b>Year:</b> ${data.yearLevel  || 'N/A'}</p>
                <p><b>Address:</b> ${data.address || 'N/A'}</p>
                <p><b>Sessions Left:</b>
                    <span class="badge badge-session">${data.remainingSession ?? 30}</span>
                </p>
                <p><b>Time Left:</b>
                    <span style="color:#007bff;font-weight:bold;">${timeLeftText}</span>
                </p>`;

            openModal('studentInfoModal');
        } else {
            Swal.fire('Oops!', 'Student not found.', 'warning');
        }
    } catch (e) {
        Swal.fire('Error', 'Server Error', 'error');
    }
}

/* ── DARK / LIGHT THEME ─────────────────────────────────────────────────── */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.getElementById('themeIcon');
    icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

function toggleTheme() {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem('ccs_theme', next);
    applyTheme(next);

    const icon = document.getElementById('themeIcon');
    icon.style.transform  = 'rotate(360deg)';
    icon.style.transition = 'transform 0.4s ease';
    setTimeout(() => { icon.style.transform = ''; icon.style.transition = ''; }, 400);
}

(function () {
    applyTheme(localStorage.getItem('ccs_theme') || 'light');
})();

/* ── LOAD LEADERBOARD ────────────────────────────────────────────────────── */
async function loadLeaderboard() {
    try {
        const res  = await fetch(`${BASE}/admin/leaderboard`);
        const data = await res.json();
        renderTable(data);
    } catch {
        document.getElementById('leaderboardContainer').innerHTML =
            '<div class="table-empty"><i class="fa fa-exclamation-circle" style="color:#e74c3c;"></i><br>Could not load. Is the server running?</div>';
    }
}

function fmtMins(mins) {
    if (!mins || mins <= 0) return '—';
    const h = Math.floor(mins / 60), m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function renderTable(data) {
    const container = document.getElementById('leaderboardContainer');
    if (!data.length) {
        container.innerHTML = '<div class="table-empty">No student data yet.</div>';
        return;
    }

    const pipClass  = ['pip-1', 'pip-2', 'pip-3'];
    const trophyClr = ['#ffd700', '#c0c0c0', '#cd7f32'];

    const rows = data.map((s, i) => {
        const rank = i + 1;
        const pip  = rank <= 3
            ? `<span class="rank-pip ${pipClass[rank - 1]}"><i class="fa fa-trophy" style="color:${trophyClr[rank - 1]};font-size:13px;"></i></span>`
            : `<span class="rank-pip pip-n">#${rank}</span>`;

        const totalMins   = s.totalMinutes   || 0;
        const longestMins = s.longestMinutes  || 0;
        const avgMins     = s.sitins > 0 && totalMins > 0 ? Math.round(totalMins / s.sitins) : 0;

        const breakdown = `+${s.sitins} completions<br>+${Math.min(Math.floor(totalMins / 20), 5)} time bonus<br>+${totalMins >= 120 ? 2 : 0} long bonus<br>+${s.manualPoints || 0} manual`;

        return `<tr>
            <td>${pip}</td>
            <td>
                <div class="student-name" style="font-family:'Sora',sans-serif;">${s.firstName} ${s.lastName}</div>
                <div class="student-id"   style="font-family:'Sora',sans-serif;">${s.idNumber}</div>
            </td>
            <td><span class="course-chip">${s.course || '—'}</span></td>
            <td><b style="font-family:'Sora',sans-serif;">${s.sitins}</b></td>
            <td>
                <div class="hours-val" style="font-family:'Sora',sans-serif;">${fmtMins(totalMins)}</div>
                <div class="hours-sub" style="font-family:'Sora',sans-serif;">Longest: ${fmtMins(longestMins)}</div>
            </td>
            <td>${avgMins > 0 ? avgMins + 'm' : '—'}</td>
            <td>
                <div class="tooltip-wrap">
                    <span class="pts-val"  style="font-family:'Sora',sans-serif;">${s.points}</span>
                    <span class="pts-unit">PTS</span>
                    <div class="tooltip-box" style="font-family:'Sora',sans-serif;">${breakdown}</div>
                </div>
            </td>
            <td>
                <button class="btn-add-pts" onclick="quickAddPoints('${s.idNumber}','${s.firstName} ${s.lastName}')">
                    <i class="fa fa-plus"></i> Points
                </button>
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <table class="rw-table">
            <thead>
                <tr>
                    <th>Rank</th><th>Student</th><th>Course</th><th>Sit-ins</th>
                    <th>Total Hours</th><th>Avg Session</th><th>Points</th><th>Action</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
}

/* ── AWARD POINTS (form) ────────────────────────────────────────────────── */
async function awardPoints() {
    const idNumber = document.getElementById('awardStudentId').value.trim();
    const points   = parseInt(document.getElementById('awardPoints').value);
    const reason   = document.getElementById('awardReason').value.trim();

    if (!idNumber)          { Swal.fire('Missing', 'Please enter a Student ID.', 'warning'); return; }
    if (!points || points < 1) { Swal.fire('Invalid', 'Points must be at least 1.', 'warning'); return; }

    try {
        const res = await fetch(`${BASE}/admin/add-points`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idNumber, points })
        });
        if (!res.ok) throw new Error();
        await Swal.fire({
            icon: 'success',
            title: `+${points} Points Awarded!`,
            text: reason ? `Reason: ${reason}` : `Points added to ${idNumber}.`,
            timer: 2000, showConfirmButton: false
        });
        document.getElementById('awardStudentId').value = '';
        document.getElementById('awardPoints').value    = '10';
        document.getElementById('awardReason').value    = '';
        loadLeaderboard();
    } catch {
        Swal.fire('Error', 'Could not award points. Check the student ID or server.', 'error');
    }
}

/* ── QUICK ADD POINTS (table button) ────────────────────────────────────── */
async function quickAddPoints(idNumber, name) {
    const { value: pts, isConfirmed } = await Swal.fire({
        title: 'Add Points',
        html: `<p style="margin-bottom:10px;color:#555;">Student: <b>${name}</b></p>
               <input id="swalPts" type="number" min="1" max="100" value="1"
               class="swal2-input" placeholder="Points to add" style="width:80%;">`,
        showCancelButton: true,
        confirmButtonColor: '#1cc88a',
        confirmButtonText: '<i class="fa fa-plus"></i> Add Points',
        preConfirm: () => {
            const v = parseInt(document.getElementById('swalPts').value);
            if (!v || v < 1) { Swal.showValidationMessage('Enter a valid number (min 1)'); return false; }
            return v;
        }
    });
    if (!isConfirmed) return;

    try {
        const res = await fetch(`${BASE}/admin/add-points`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idNumber, points: pts })
        });
        if (!res.ok) throw new Error();
        await Swal.fire({ icon: 'success', title: `+${pts} Points Added!`, timer: 1500, showConfirmButton: false });
        loadLeaderboard();
    } catch {
        Swal.fire('Error', 'Could not add points.', 'error');
    }
}

/* ── RESET ALL SESSIONS ─────────────────────────────────────────────────── */
async function confirmResetSessions() {
    const { isConfirmed } = await Swal.fire({
        title: 'Reset All Sessions?',
        text: 'This will set all student sessions back to 30.',
        icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#4e73df', confirmButtonText: 'Yes, Reset!'
    });
    if (!isConfirmed) return;

    try {
        const res = await fetch(`${BASE}/admin/reset-sessions`, { method: 'POST' });
        if (!res.ok) throw new Error();
        await Swal.fire({ icon: 'success', title: 'Sessions Reset!', text: 'All students reset to 30 sessions.', timer: 1800, showConfirmButton: false });
    } catch {
        Swal.fire('Error', 'Could not reset sessions.', 'error');
    }
}

/* ── UNIFIED SIT-IN MODAL ───────────────────────────────────────────────── */
function openUnifiedModal() {
    document.getElementById('unifiedSitInModal').style.display = 'flex';
    document.getElementById('searchResultsList').innerHTML     = '';
    document.getElementById('studentDetailsBox').style.display = 'none';
    document.getElementById('uniFooter').style.display         = 'none';
    document.getElementById('uniIdSearch').value               = '';
}

let searchTimer;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('uniIdSearch').addEventListener('input', function () {
        clearTimeout(searchTimer);
        if (!this.value.trim()) {
            document.getElementById('searchResultsList').innerHTML     = '';
            document.getElementById('studentDetailsBox').style.display = 'none';
            document.getElementById('uniFooter').style.display         = 'none';
            return;
        }
        searchTimer = setTimeout(searchAndPopulate, 300);
    });
    loadLeaderboard();
});

async function searchAndPopulate() {
    const query   = document.getElementById('uniIdSearch').value.trim();
    const list    = document.getElementById('searchResultsList');
    const details = document.getElementById('studentDetailsBox');
    if (!query) return;

    try {
        const res  = await fetch(`${BASE}/search-students?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        if (res.ok && data.length > 0) {
            list.innerHTML = data.map(student => {
                const initials = (student.firstName[0] + student.lastName[0]).toUpperCase();
                return `
                    <div class="search-result-item" onclick='selectStudent(${JSON.stringify(student)})'>
                        <div class="user-avatar">${initials}</div>
                        <div class="user-info-text">
                            <span class="name">${student.firstName} ${student.lastName}</span>
                            <div class="meta">
                                <span>ID: ${student.idNumber}</span>
                                <span>${student.course} ${student.yearLevel}</span>
                            </div>
                        </div>
                        <div class="user-status-badges">
                            <span class="badge-sessions">${student.remainingSession ?? 30} sessions</span>
                            <span style="color:#4e73df;font-size:10px;">Click to select</span>
                        </div>
                    </div>`;
            }).join('');
            details.style.display                          = 'none';
            document.getElementById('uniFooter').style.display = 'none';
        } else {
            list.innerHTML = '<p style="text-align:center;color:#858796;font-size:12px;padding:10px;">No student found.</p>';
        }
    } catch (e) { console.error('Search Error:', e); }
}

function selectStudent(data) {
    document.getElementById('searchResultsList').innerHTML     = '';
    document.getElementById('studentDetailsBox').style.display = 'block';
    document.getElementById('uniFooter').style.display         = 'flex';
    document.getElementById('uniIdSearch').value               = data.idNumber;

    const remaining = data.remainingSession ?? 30;
    document.getElementById('accountInfoDisplay').innerHTML = `
        <span class="profile-name">${data.firstName} ${data.lastName}</span>
        <div class="profile-meta">
            <div class="meta-item"><label>ID Number</label><span>${data.idNumber}</span></div>
            <div class="meta-item"><label>Remaining Sessions</label>
                <span style="color:${remaining <= 0 ? '#dc3545' : '#1cc88a'};font-weight:700;">
                    ${remaining} / 30
                </span>
            </div>
        </div>
        ${remaining <= 0 ? '<p style="color:#dc3545;font-size:12px;margin-top:8px;"><i class="fa fa-exclamation-triangle"></i> This student has no remaining sessions.</p>' : ''}`;

    const confirmBtn         = document.querySelector('#uniFooter .btn-confirm');
    confirmBtn.disabled      = remaining <= 0;
    confirmBtn.style.opacity = remaining <= 0 ? '0.5' : '1';
    confirmBtn.style.cursor  = remaining <= 0 ? 'not-allowed' : 'pointer';
}

async function submitUnifiedSitIn() {
    const idNumber = document.getElementById('uniIdSearch').value.trim();
    const purpose  = document.getElementById('uniPurpose').value;
    const lab      = document.getElementById('uniLab').value;

    if (!idNumber) return Swal.fire('Warning', 'No student selected. Please search and click a student first.', 'warning');

    try {
        const res = await fetch(`${BASE}/sit-in`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idNumber, purpose, lab })
        });
        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Sit-in Recorded!', timer: 1500, showConfirmButton: false });
            closeModal('unifiedSitInModal');
        } else {
            const txt = await res.text();
            Swal.fire('Error', txt, 'error');
        }
    } catch (e) { Swal.fire('Error', 'Connection failed.', 'error'); }
}

/* ── LOGOUT ─────────────────────────────────────────────────────────────── */
async function logout() {
    const { isConfirmed } = await Swal.fire({
        title: 'Logout Admin?',
        text: 'This will end your admin session.',
        icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#d33', cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, Logout!', cancelButtonText: 'Stay Logged In'
    });
    if (!isConfirmed) return;

    try {
        sessionStorage.removeItem('adminWelcomeShown');
        localStorage.removeItem('adminId');
        sessionStorage.clear();
        await Swal.fire({ icon: 'success', title: 'Logged Out', text: 'Admin session ended successfully.', timer: 1500, showConfirmButton: false });
        window.location.href = 'login.html';
    } catch (err) {
        console.error('Admin logout error:', err);
        sessionStorage.clear();
        localStorage.removeItem('adminId');
        window.location.href = 'login.html';
    }
}