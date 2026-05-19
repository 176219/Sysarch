/* ═══════════════════════════════════════════════════════════════
   analytics.js  –  Analytics / Dashboard page (admin)
   Includes: theme toggle, modal helpers, student search modal,
             charts (time / purpose / lab), top students table,
             course breakdown, CSV export,
             unified sit-in modal, logout
   ═══════════════════════════════════════════════════════════════ */

const BASE             = 'http://localhost:3000';
const SESSION_DURATION = 60;
const COLORS           = ['#4e73df','#ffc107','#1cc88a','#e74c3c','#9b59b6','#e67e22','#3498db','#1abc9c'];

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

/* ── CHART DEFAULTS ─────────────────────────────────────────────────────── */
Chart.defaults.color       = '#555';
Chart.defaults.borderColor = '#e3e6f0';
Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";

let timeChartInst = null, purposeChartInst = null, labChartInst = null;
let _allSitins = [], _topStudents = [];

/* ── LOAD ALL DATA ───────────────────────────────────────────────────────── */
async function loadAll() {
    try {
        const [dashRes, sitinsRes, leaderRes] = await Promise.all([
            fetch(`${BASE}/admin/dashboard-data`),
            fetch(`${BASE}/admin/reports`),
            fetch(`${BASE}/admin/leaderboard`)
        ]);
        const dash   = await dashRes.json();
        _allSitins   = await sitinsRes.json();
        _topStudents = await leaderRes.json();

        document.getElementById('statRegistered').textContent  = dash.registered   ?? '—';
        document.getElementById('statTotalSitin').textContent  = dash.totalSitin   ?? '—';
        document.getElementById('statActiveNow').textContent   = dash.currentSitin ?? '—';

        renderTimeChart('daily');
        renderPurposeChart();
        renderLabChart();
        renderTopStudents();
        renderCourseTable();
    } catch (e) { console.error('Analytics error:', e); }
}

/* ── TIME CHART ─────────────────────────────────────────────────────────── */
function switchTime(mode, btn) {
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTimeChart(mode);
}

function renderTimeChart(mode) {
    const grouped = {};
    _allSitins.forEach(row => {
        if (!row.date) return;
        let key = row.date;
        if (mode === 'weekly') {
            const d = new Date(row.date);
            const w = Math.ceil((((d - new Date(d.getFullYear(), 0, 1)) / 86400000) + new Date(d.getFullYear(), 0, 1).getDay() + 1) / 7);
            key = `${d.getFullYear()}-W${String(w).padStart(2, '0')}`;
        } else if (mode === 'monthly') {
            key = row.date.slice(0, 7);
        }
        grouped[key] = (grouped[key] || 0) + 1;
    });

    const labels = Object.keys(grouped).sort();
    if (timeChartInst) timeChartInst.destroy();
    timeChartInst = new Chart(document.getElementById('timeChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Sit-ins',
                data: labels.map(k => grouped[k]),
                backgroundColor: '#4e73df',
                borderRadius: 5,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: '#f0f2f5' }, ticks: { color: '#858796' } },
                y: { grid: { color: '#f0f2f5' }, ticks: { color: '#858796', stepSize: 1 }, beginAtZero: true }
            }
        }
    });
}

/* ── PURPOSE CHART ──────────────────────────────────────────────────────── */
function renderPurposeChart() {
    const grouped = {};
    _allSitins.forEach(r => { const p = r.purpose || 'Other'; grouped[p] = (grouped[p] || 0) + 1; });
    const labels = Object.keys(grouped);
    if (purposeChartInst) purposeChartInst.destroy();
    purposeChartInst = new Chart(document.getElementById('purposeChart').getContext('2d'), {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{ data: labels.map(k => grouped[k]), backgroundColor: COLORS, borderColor: '#fff', borderWidth: 3 }]
        },
        options: {
            responsive: true, cutout: '60%',
            plugins: { legend: { position: 'bottom', labels: { color: '#555', boxWidth: 12, font: { size: 11 } } } }
        }
    });
}

/* ── LAB CHART ──────────────────────────────────────────────────────────── */
function renderLabChart() {
    const grouped = {};
    _allSitins.forEach(r => { const l = r.lab || 'Unknown'; grouped[l] = (grouped[l] || 0) + 1; });
    const labels = Object.keys(grouped).sort();
    if (labChartInst) labChartInst.destroy();
    labChartInst = new Chart(document.getElementById('labChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{ label: 'Sit-ins', data: labels.map(k => grouped[k]), backgroundColor: COLORS, borderRadius: 5, borderSkipped: false }]
        },
        options: {
            indexAxis: 'y', responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: '#f0f2f5' }, ticks: { color: '#858796', stepSize: 1 }, beginAtZero: true },
                y: { grid: { display: false }, ticks: { color: '#333' } }
            }
        }
    });
}

/* ── TOP STUDENTS ────────────────────────────────────────────────────────── */
function renderTopStudents() {
    const container = document.getElementById('topStudentsContainer');
    const top       = _topStudents.slice(0, 8);
    if (!top.length) { container.innerHTML = '<div class="chart-empty">No student data yet.</div>'; return; }

    const pipClass  = ['pip-1', 'pip-2', 'pip-3'];
    const trophyClr = ['#ffd700', '#c0c0c0', '#cd7f32'];

    const rows = top.map((s, i) => {
        const rank = i + 1;
        const pip  = rank <= 3
            ? `<span class="rank-pip ${pipClass[rank - 1]}"><i class="fa fa-trophy" style="color:${trophyClr[rank - 1]};font-size:12px;"></i></span>`
            : `<span class="rank-pip pip-n">#${rank}</span>`;
        return `<tr>
            <td>${pip}</td>
            <td><b>${s.firstName} ${s.lastName}</b><br><span style="font-size:11px;color:#858796;">${s.idNumber}</span></td>
            <td>${s.course || '—'}</td>
            <td>${s.sitins}</td>
            <td><span class="pts-badge">${s.points} pts</span></td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <table class="an-table">
            <thead><tr><th>Rank</th><th>Student</th><th>Course</th><th>Sit-ins</th><th>Points</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

/* ── COURSE TABLE ────────────────────────────────────────────────────────── */
function renderCourseTable() {
    const courseMap = {};
    _topStudents.forEach(s => {
        const c = s.course || 'Unknown';
        if (!courseMap[c]) courseMap[c] = { sitins: 0, students: 0 };
        courseMap[c].sitins   += parseInt(s.sitins) || 0;
        courseMap[c].students += 1;
    });

    const entries   = Object.entries(courseMap).sort((a, b) => b[1].sitins - a[1].sitins);
    const max       = entries[0]?.[1].sitins || 1;
    const container = document.getElementById('courseContainer');
    if (!entries.length) { container.innerHTML = '<div class="chart-empty">No course data yet.</div>'; return; }

    const rows = entries.map(([course, val], i) => {
        const pct = Math.round((val.sitins / max) * 100);
        return `<tr>
            <td><b>${course}</b></td>
            <td style="color:#858796;">${val.students}</td>
            <td>${val.sitins}</td>
            <td style="min-width:100px;">
                <div class="course-bar-wrap">
                    <div class="course-bar-fill" style="width:${pct}%;background:${COLORS[i % COLORS.length]};"></div>
                </div>
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <table class="an-table">
            <thead><tr><th>Course</th><th>Students</th><th>Sit-ins</th><th>Share</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

/* ── EXPORT CSV ─────────────────────────────────────────────────────────── */
function exportCSV() {
    if (!_allSitins.length) { Swal.fire({ icon: 'info', title: 'No Data', text: 'Nothing to export yet.' }); return; }

    const headers = ['ID Number', 'First Name', 'Last Name', 'Purpose', 'Lab', 'Time In', 'Time Out', 'Date'];
    const rows    = _allSitins.map(r =>
        [r.idNumber, r.firstName, r.lastName, r.purpose, r.lab, r.timeIn, r.timeOut || '', r.date]
            .map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`)
            .join(',')
    );
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: `sitin_${new Date().toISOString().slice(0, 10)}.csv` }).click();
    URL.revokeObjectURL(url);
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
    loadAll();
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
            details.style.display                              = 'none';
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