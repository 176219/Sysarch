const BASE_URL = 'http://localhost:3000';
const SESSION_DURATION = 60;

function openModal(id)  { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

/* ══════════════════════════════════════
   DARK / LIGHT MODE
══════════════════════════════════════ */
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

/* ══════════════════════════════════════
   NAVBAR LIVE SEARCH
══════════════════════════════════════ */
let _navTimer;
let _navSelectedId = null;

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
            const res  = await fetch(`${BASE_URL}/search-students?q=${encodeURIComponent(id)}`);
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
        const res = await fetch(`${BASE_URL}/student/${id}`);
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

/* ══════════════════════════════════════
   ADD STUDENT
══════════════════════════════════════ */
function addStudent() {
    ['add-idNumber','add-lastName','add-firstName','add-middleName',
     'add-yearLevel','add-course','add-email','add-address','add-password']
    .forEach(id => document.getElementById(id).value = '');
    openModal('addStudentModal');
}

function toggleAddPass() {
    const input = document.getElementById('add-password');
    input.type  = input.type === 'password' ? 'text' : 'password';
    input.nextElementSibling.textContent = input.type === 'password' ? '🧿' : '🚫';
}

async function submitAddStudent() {
    const payload = {
        idNumber:   document.getElementById('add-idNumber').value.trim(),
        lastName:   document.getElementById('add-lastName').value.trim(),
        firstName:  document.getElementById('add-firstName').value.trim(),
        middleName: document.getElementById('add-middleName').value.trim(),
        yearLevel:  document.getElementById('add-yearLevel').value.trim(),
        course:     document.getElementById('add-course').value.trim(),
        email:      document.getElementById('add-email').value.trim(),
        address:    document.getElementById('add-address').value.trim(),
        password:   document.getElementById('add-password').value.trim()
    };

    if (!payload.idNumber || !payload.lastName || !payload.firstName || !payload.password) {
        return Swal.fire('Warning', 'ID, Name, and Password are required.', 'warning');
    }

    try {
        const res  = await fetch(`${BASE_URL}/register`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload)
        });

        // handle both JSON and plain-text error responses safely
        const contentType = res.headers.get('content-type') || '';
        const body = contentType.includes('application/json') ? await res.json() : await res.text();

        if (res.ok) {
            await Swal.fire({ icon: 'success', title: 'Student Registered!', timer: 1500, showConfirmButton: false });
            closeModal('addStudentModal');
            fetchStudents();
        } else {
            const msg = typeof body === 'object' ? (body.error || body.message || 'Failed to register.') : body;
            Swal.fire('Error', msg || 'Failed to register student.', 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Connection failed. Is the server running?', 'error');
    }
}

/* ══════════════════════════════════════
   FETCH / RENDER STUDENTS TABLE
══════════════════════════════════════ */
async function fetchStudents() {
    try {
        const res      = await fetch(`${BASE_URL}/admin/students`);
        const students = await res.json();
        document.getElementById('studentTableBody').innerHTML = students.map(s => `
            <tr>
                <td>${s.idNumber}</td>
                <td>${s.firstName} ${s.lastName}</td>
                <td>${s.yearLevel}</td>
                <td>${s.course}</td>
                <td><span class="badge-session">${s.remainingSession ?? 30}</span></td>
                <td>
                    <button class="action-btn btn-edit" onclick="editStudent('${s.idNumber}')">
                        <i class="fa fa-pencil"></i> Edit
                    </button>
                    <button class="action-btn btn-delete" onclick="deleteStudent('${s.idNumber}')">
                        <i class="fa fa-trash"></i> Delete
                    </button>
                </td>
            </tr>`).join('');
    } catch (e) {
        console.error('fetchStudents error:', e);
    }
}

/* ══════════════════════════════════════
   EDIT STUDENT
══════════════════════════════════════ */
let _editingId = null;

async function editStudent(idNumber) {
    try {
        const res = await fetch(`${BASE_URL}/get-student/${idNumber}`);
        const s   = await res.json();
        _editingId = idNumber;

        document.getElementById('editDrawerAvatar').textContent =
            (s.firstName[0] + s.lastName[0]).toUpperCase();
        document.getElementById('editDrawerSubtitle').textContent =
            `${s.idNumber} · ${s.course || '—'}`;

        document.getElementById('edit-firstName').value = s.firstName  || '';
        document.getElementById('edit-lastName').value  = s.lastName   || '';
        document.getElementById('edit-email').value     = s.email      || '';
        document.getElementById('edit-address').value   = s.address    || '';
        document.getElementById('edit-course').value    = s.course     || '';
        document.getElementById('edit-yearLevel').value = s.yearLevel  || '';

        document.getElementById('editDrawerOverlay').style.display = 'flex';
    } catch (e) {
        Swal.fire('Error', 'Could not load student data.', 'error');
    }
}

function closeEditDrawer() {
    document.getElementById('editDrawerOverlay').style.display = 'none';
    _editingId = null;
}

async function saveEditStudent() {
    const btn = document.getElementById('editSaveBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="ti ti-loader" style="font-size:15px;"></i> Saving…';

    const payload = {
        oldIdNumber: _editingId,
        idNumber:    _editingId,
        firstName:   document.getElementById('edit-firstName').value.trim(),
        lastName:    document.getElementById('edit-lastName').value.trim(),
        email:       document.getElementById('edit-email').value.trim(),
        address:     document.getElementById('edit-address').value.trim(),
        course:      document.getElementById('edit-course').value.trim(),
        yearLevel:   document.getElementById('edit-yearLevel').value.trim(),
    };

    try {
        const res = await fetch(`${BASE_URL}/update-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeEditDrawer();
            Swal.fire({ icon: 'success', title: 'Student updated!', timer: 1500, showConfirmButton: false });
            fetchStudents();
        } else {
            Swal.fire('Error', 'Failed to update student.', 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Connection failed.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ti ti-device-floppy" style="font-size:15px;"></i> Save changes';
    }
}

/* ══════════════════════════════════════
   DELETE STUDENT
══════════════════════════════════════ */
async function deleteStudent(idNumber) {
    const { isConfirmed } = await Swal.fire({
        title: 'Delete Student?',
        text:  `This will permanently delete student ${idNumber}.`,
        icon:  'warning', showCancelButton: true,
        confirmButtonColor: '#dc3545', confirmButtonText: 'Yes, delete'
    });
    if (!isConfirmed) return;

    try {
        const res = await fetch(`${BASE_URL}/delete-student/${idNumber}`, { method: 'DELETE' });
        if (res.ok) {
            Swal.fire({ icon: 'success', title: 'Student deleted!', timer: 1500, showConfirmButton: false });
            fetchStudents();
        } else {
            Swal.fire('Error', 'Failed to delete student.', 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Connection failed.', 'error');
    }
}

/* ══════════════════════════════════════
   RESET ALL SESSIONS
══════════════════════════════════════ */
async function resetAllSessions() {
    const { isConfirmed } = await Swal.fire({
        title: 'Reset All Sessions?',
        text:  "This will reset every student's sessions back to 30.",
        icon:  'warning', showCancelButton: true,
        confirmButtonColor: '#dc3545', confirmButtonText: 'Yes, reset all'
    });
    if (!isConfirmed) return;

    try {
        const res = await fetch(`${BASE_URL}/reset-sessions`, { method: 'POST' });
        if (res.ok) {
            Swal.fire({ icon: 'success', title: 'Sessions reset!', timer: 1500, showConfirmButton: false });
            fetchStudents();
        } else {
            Swal.fire('Error', 'Failed to reset sessions.', 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Connection failed.', 'error');
    }
}

/* ══════════════════════════════════════
   FILTER TABLE
══════════════════════════════════════ */
function filterTable() {
    const val  = document.getElementById('tableSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#studentTableBody tr');
    rows.forEach(r => r.style.display = r.innerText.toLowerCase().includes(val) ? '' : 'none');
}

/* ══════════════════════════════════════
   LOGOUT
══════════════════════════════════════ */
function logout() {
    Swal.fire({
        title: 'Logout Admin?',
        text:  'Are you sure you want to end your admin session?',
        icon:  'warning', showCancelButton: true,
        confirmButtonColor: '#d33', cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, logout!', cancelButtonText: 'Cancel'
    }).then(result => {
        if (result.isConfirmed) {
            sessionStorage.removeItem('adminWelcomeShown');
            window.location.href = 'login.html';
        }
    });
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
window.onload = function () {
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    fetchStudents();
};