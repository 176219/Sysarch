let allRecords = [];
let filteredRecords = [];
let currentPage = 1;
let entriesPerPage = 10;
const SESSION_DURATION = 60;

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

function openSearchModal() {
    openModal('searchModal');
    document.getElementById('modalSearchInput').value = "";
    document.getElementById('modalSearchInput').focus();
}

// --- SEARCH STUDENT ---
async function executeSearch(event) {
    if (event) event.preventDefault();

    const id = document.getElementById('modalSearchInput').value.trim();
    if (!id) return Swal.fire('Error', 'Please enter an ID', 'error');

    try {
        const res = await fetch(`http://localhost:3000/student/${id}`);
        const data = await res.json();

        if (res.ok) {
            closeModal('searchModal');

            let timeLeftText = "No active session";

            if (data.timeIn && !data.timeOut) {
                const timeIn = new Date(data.timeIn);
                const now = new Date();

                const diffMinutes = Math.floor((now - timeIn) / 60000);
                const remaining = SESSION_DURATION - diffMinutes;

                if (remaining > 0) {
                    timeLeftText = `${remaining} minutes left`;
                } else {
                    timeLeftText = "Session expired";
                }
            }

            document.getElementById('infoBody').innerHTML = `
                <p><b>ID Number:</b> ${data.idNumber}</p>
                <p><b>Name:</b> ${data.firstName} ${data.lastName}</p>
                <p><b>Course:</b> ${data.course || 'N/A'}</p>
                <p><b>Email:</b> ${data.email || 'N/A'}</p>
                <p><b>Year:</b> ${data.yearLevel || 'N/A'}</p>
                <p><b>Address:</b> ${data.address || 'N/A'}</p>
                <p><b>Sessions Left:</b> <span class="badge badge-session">${data.remainingSession ?? 30}</span></p>
                <p><b>Time Left:</b> 
                    <span style="color:#007bff;font-weight:bold;">${timeLeftText}</span>
                </p>
            `;
            openModal('studentInfoModal');
        } else {
            Swal.fire('Oops!', 'Student not found.', 'warning');
        }
    } catch (e) {
        Swal.fire('Error', 'Server Error', 'error');
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