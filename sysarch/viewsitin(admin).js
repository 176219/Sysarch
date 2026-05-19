let allRecords = [];
let filteredRecords = [];
let currentPage = 1;
let entriesPerPage = 10;
const SESSION_DURATION = 60;

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
// --- 1. DATA FETCHING ---
async function fetchSitIns() {
    const tbody = document.getElementById('sitInTableBody');
    tbody.innerHTML = `<tr><td colspan="8">Loading sit-in records...</td></tr>`;

    try {
        const res = await fetch('http://localhost:3000/get-sitin');
        allRecords = await res.json();
        applySearch();
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" style="color:red;">Server error. Please check your connection.</td></tr>`;
    }
}

// --- INIT ---
window.onload = function () {
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    fetchSitIns();
};

// --- MODALS ---
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

let _searchModalTimer;

function openSearchModal() {
    openModal('searchModal');
    document.getElementById('modalSearchInput').focus();
}

async function searchModalAutoFill() {
    const id   = document.getElementById('modalSearchInput').value.trim();
    const drop = document.getElementById('searchModalDropdown');

    if (!id) { drop.style.display = 'none'; return; }

    clearTimeout(_searchModalTimer);
    _searchModalTimer = setTimeout(async () => {
        drop.innerHTML = `<div class="sit-drop-empty"><i class="fa fa-spinner fa-spin"></i> Searching...</div>`;
        drop.style.display = 'block';

        try {
            const res  = await fetch(`http://localhost:3000/search-students?q=${encodeURIComponent(id)}`);
            const data = await res.json();

            if (!res.ok || !data.length) {
                drop.innerHTML = `<div class="sit-drop-empty">No students found for "<b>${id}</b>".</div>`;
                return;
            }

            drop.innerHTML = data.map(s => `
                <div class="sit-drop-item" onclick="selectSearchModalStudent(${JSON.stringify(s).replace(/"/g, '&quot;')})">
                    <div class="sit-drop-avatar">${s.firstName[0]}${s.lastName[0]}</div>
                    <div class="sit-drop-info">
                        <div class="sit-drop-name">${s.firstName} ${s.lastName}</div>
                        <div class="sit-drop-meta">${s.idNumber} · ${s.course || ''} ${s.yearLevel || ''}</div>
                    </div>
                    <div class="sit-drop-sessions">${s.remainingSession ?? 30} sessions</div>
                </div>`).join('');

        } catch (e) {
            drop.innerHTML = `<div class="sit-drop-empty" style="color:#dc3545;"><i class="fa fa-exclamation-circle"></i> Server error.</div>`;
        }
    }, 200);
}

function selectSearchModalStudent(s) {
    document.getElementById('modalSearchInput').value = s.idNumber;
    document.getElementById('searchModalDropdown').style.display = 'none';
    executeSearch();
}

async function executeSearch(event) {
    if (event) event.preventDefault();

    const id = document.getElementById('modalSearchInput').value.trim();
    if (!id) return Swal.fire('Error', 'Please enter an ID', 'error');

    try {
        const res = await fetch(`http://localhost:3000/student/${id}`);
        const data = await res.json();

        if (res.ok) {
            closeModal('searchModal');
            
            const profilePhotoHtml = data.profilePhoto 
                ? `<img src="${data.profilePhoto}" alt="Avatar" style="width:70px; height:70px; border-radius:50%; object-fit:cover; margin-bottom:10px;">`
                : `<div class="user-avatar" style="width:70px; height:70px; font-size:24px; margin:0 auto 10px; display:flex; align-items:center; justify-content:center; background:#4e73df; color:white; border-radius:50%; font-weight:bold;">${data.firstName[0]}${data.lastName[0]}</div>`;

            const infoHtml = `
                <div style="text-align:center; margin-bottom:15px;">
                    ${profilePhotoHtml}
                    <h3 style="margin:5px 0 2px; color:var(--text-main); font-family:'Sora', sans-serif;">${data.firstName} ${data.lastName}</h3>
                    <span class="badge badge-session" style="background:#4e73df; color:white; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:700;">${data.idNumber}</span>
                </div>
                <div class="student-profile-card" style="margin:0; padding:15px; background:var(--bg-card-alt); border-left:5px solid #4e73df; border-radius:8px;">
                    <div class="profile-meta" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; font-family:'Plus Jakarta Sans', sans-serif;">
                        <div class="meta-item"><label style="display:block; font-size:9px; text-transform:uppercase; color:var(--text-muted); font-weight:800; margin-bottom:2px;">Middle Name</label><span style="font-weight:600; color:var(--text-main); font-size:13px;">${data.middleName || 'N/A'}</span></div>
                        <div class="meta-item"><label style="display:block; font-size:9px; text-transform:uppercase; color:var(--text-muted); font-weight:800; margin-bottom:2px;">Email</label><span style="font-weight:600; color:var(--text-main); font-size:13px; word-break:break-all;">${data.email || 'N/A'}</span></div>
                        <div class="meta-item"><label style="display:block; font-size:9px; text-transform:uppercase; color:var(--text-muted); font-weight:800; margin-bottom:2px;">Address</label><span style="font-weight:600; color:var(--text-main); font-size:13px;">${data.address || 'N/A'}</span></div>
                        <div class="meta-item"><label style="display:block; font-size:9px; text-transform:uppercase; color:var(--text-muted); font-weight:800; margin-bottom:2px;">Course</label><span style="font-weight:600; color:var(--text-main); font-size:13px;">${data.course || 'N/A'}</span></div>
                        <div class="meta-item"><label style="display:block; font-size:9px; text-transform:uppercase; color:var(--text-muted); font-weight:800; margin-bottom:2px;">Year Level</label><span style="font-weight:600; color:var(--text-main); font-size:13px;">${data.yearLevel || 'N/A'}</span></div>
                        <div class="meta-item"><label style="display:block; font-size:9px; text-transform:uppercase; color:var(--text-muted); font-weight:800; margin-bottom:2px;">Remaining</label><span style="color:#1cc88a; font-weight:800; font-size:13px;">${data.remainingSession ?? 30} Sessions</span></div>
                    </div>
                </div>
            `;
            document.getElementById('infoBody').innerHTML = infoHtml;
            openModal('studentInfoModal');
        } else {
            Swal.fire('Error', data.message || 'Student not found', 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Unable to fetch student info', 'error');
    }
}
// --- GENERIC SIT-IN ---
function openGenericSitInForm() {
    document.getElementById('genIdNumber').value = "";
    document.getElementById('genFullName').value = "";
    document.getElementById('genLab').value = "";
    document.getElementById('genRemaining').value = "";
    openModal('genericSitInModal');
}

// Auto-fill name and sessions as the admin types the student ID
async function autoFillStudent() {
    const idNumber = document.getElementById('genIdNumber').value.trim();
    const nameInput = document.getElementById('genFullName');
    const sessionInput = document.getElementById('genRemaining');

    if (idNumber === "") {
        nameInput.value = "";
        sessionInput.value = "";
        return;
    }

    try {
        const res = await fetch(`http://localhost:3000/get-student/${idNumber}`);
        if (res.ok) {
            const data = await res.json();
            nameInput.value = `${data.firstName} ${data.lastName}`;
            sessionInput.value = data.remainingSession ?? 30;
        } else {
            nameInput.value = "";
            sessionInput.value = "";
        }
    } catch (e) {
        console.error("Live search error:", e);
    }
}

async function submitGenericSitIn(e) {
    if (e) e.preventDefault();

    const payload = {
        idNumber: document.getElementById('genIdNumber').value.trim(),
        purpose: document.getElementById('genPurpose').value,
        lab: document.getElementById('genLab').value.trim()
    };

    if (!payload.idNumber || !payload.lab) {
        return Swal.fire('Warning', 'ID Number and Lab are required.', 'warning');
    }

    try {
        const res = await fetch('http://localhost:3000/sit-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            await Swal.fire({
                icon: 'success',
                title: 'Sit-in recorded!',
                confirmButtonText: 'OK',
                allowOutsideClick: false,
                allowEscapeKey: false
            });

            closeModal('genericSitInModal');
            document.getElementById('genIdNumber').value = "";
            fetchSitIns();
            loadDashboardStats();
        } else {
            const txt = await res.text();
            Swal.fire('Error', txt, 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'Connection to server failed.', 'error');
    }
}

// --- TIME OUT ---
async function timeOut(idNumber, sitInId) {
    const confirm = await Swal.fire({
        title: 'Time Out?',
        text: `End session for student ${idNumber}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Yes, Time Out'
    });

    if (!confirm.isConfirmed) return;

    try {
        const res = await fetch('http://localhost:3000/time-out', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idNumber, sitInId })
        });

        if (res.ok) {
            Swal.fire({ icon: 'success', title: 'Timed out!', timer: 1500, showConfirmButton: false });
            fetchSitIns();
        } else {
            Swal.fire('Error', 'Failed to time out.', 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Connection failed.', 'error');
    }
}

// --- TABLE CONTROLS ---
function applySearch() {
    const val = document.getElementById('searchInput').value.toLowerCase();
    filteredRecords = allRecords.filter(r =>
        Object.values(r).some(v => String(v).toLowerCase().includes(val))
    );
    currentPage = 1;
    renderTable();
}

function changeEntries() {
    entriesPerPage = parseInt(document.getElementById('entriesSelect').value);
    currentPage = 1;
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('sitInTableBody');
    const start = (currentPage - 1) * entriesPerPage;
    const pageData = filteredRecords.slice(start, start + entriesPerPage);

    if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No records found.</td></tr>`;
        updatePagination(0);
        return;
    }

    tbody.innerHTML = pageData.map(r => {
        const sessions = r.remainingSession ?? 30;
        const isActive = !r.timeOut && !r.time_out;
        const currentSitId = r.sitInId ?? r.id;

        return `
            <tr>
                <td>${currentSitId ?? '—'}</td>
                <td>${r.idNumber}</td>
                <td>${r.firstName ?? ''} ${r.lastName ?? ''}</td>
                <td>${r.purpose}</td>
                <td>${r.lab}</td>
                <td><span class="badge badge-session">${sessions}</span></td>
                <td>
                    ${isActive
                        ? '<span class="badge badge-active">Active</span>'
                        : '<span class="badge badge-timeout">Timed Out</span>'}
                </td>
                <td>
                    ${isActive
                        ? `<button onclick="timeOut('${r.idNumber}', '${currentSitId}')"
                            style="background:#dc3545;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;">
                            Time Out
                           </button>`
                        : `<button disabled
                            style="padding:5px 10px;border-radius:4px;cursor:not-allowed;background:#ccc;border:none;">
                            Done
                           </button>`}
                </td>
            </tr>
        `;
    }).join('');

    document.getElementById('paginationInfo').textContent =
        `Showing ${start + 1} to ${Math.min(start + entriesPerPage, filteredRecords.length)} of ${filteredRecords.length} entries`;

    updatePagination(filteredRecords.length);
}

function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / entriesPerPage);
    const container = document.getElementById('paginationBtns');

    container.innerHTML = Array.from({ length: totalPages }, (_, i) => i + 1).map(i => `
        <button onclick="goToPage(${i})"
            style="margin:0 2px;padding:5px 10px;cursor:pointer;
                   background:${i === currentPage ? '#0056b3' : '#fff'};
                   color:${i === currentPage ? '#fff' : '#000'};
                   border:1px solid #ddd;border-radius:4px;">
            ${i}
        </button>
    `).join('');
}

function goToPage(p) {
    currentPage = p;
    renderTable();
}

function sortTable(n) {
    const keyMap = ['id', 'idNumber', 'lastName', 'purpose', 'lab', 'remainingSession', 'timeOut'];
    const key = keyMap[n];
    filteredRecords.sort((a, b) =>
        (a[key] || '').toString().localeCompare((b[key] || '').toString(), undefined, { numeric: true })
    );
    renderTable();
}

// --- LOGOUT ---
function logout() {
    Swal.fire({
        title: 'Logout Admin?',
        text: "You will be returned to the login screen.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, logout'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = "login.html";
        }
    });
}