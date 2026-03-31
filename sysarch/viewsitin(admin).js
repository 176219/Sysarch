let allRecords = [];
let filteredRecords = [];
let currentPage = 1;
let entriesPerPage = 10;

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

// --- MODALS ---

window.onload = function() {
    // Make sure all modals are hidden on load
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    fetchSitIns();
}

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
async function executeSearch() {
    const id = document.getElementById('modalSearchInput').value.trim();

    if (!id) {
        return Swal.fire('Error', 'Please enter an ID', 'error');
    }

    try {
        const res = await fetch(`http://localhost:3000/get-student/${id}`);
        const data = await res.json();

        if (res.ok) {
            closeModal('searchModal');

            const infoBody = document.getElementById('infoBody');
            infoBody.innerHTML = `
                <div style="text-align:left; line-height:1.6;">
                    <p><b>ID Number:</b> ${data.idNumber}</p>
                    <p><b>Name:</b> ${data.firstName} ${data.lastName}</p>
                    <p><b>Course:</b> ${data.course || 'N/A'}</p>
                    <p><b>Email:</b> ${data.email || 'N/A'}</p>
                    <p><b>Year:</b> ${data.yearLevel || 'N/A'}</p>
                    <p><b>Address:</b> ${data.address || 'N/A'}</p>
                    <p><b>Sessions Left:</b> 
                        <span class="badge badge-session">
                            ${data.remainingSession ?? 30}
                        </span>
                    </p>
                </div>
            `;

            openModal('studentInfoModal');
        } else {
            Swal.fire('Oops!', 'Student not found.', 'warning');
        }
    } catch (e) {
        Swal.fire('Error', 'Server Error. Check if your backend is running.', 'error');
    }
}

// --- GENERIC SIT-IN ---
function openGenericSitInForm() {
    document.getElementById('genIdNumber').value = "";
    document.getElementById('genFullName').value = "";
    document.getElementById('genLab').value = "";
    document.getElementById('genRemaining').value = "30";

    openModal('genericSitInModal');
}

async function submitGenericSitIn() {
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
            Swal.fire({
                icon: 'success',
                title: 'Sit-in recorded!',
                timer: 1500,
                showConfirmButton: false
            });

            closeModal('genericSitInModal');
            fetchSitIns();
        } else {
            const txt = await res.text();
            Swal.fire('Error', txt, 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Connection failed.', 'error');
    }
}

// --- TIME OUT ---
async function timeOut(idNumber, sitInId) {
    try {
        const res = await fetch('http://localhost:3000/time-out', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idNumber, sitInId })
        });

        if (res.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Timed out!',
                timer: 1500,
                showConfirmButton: false
            });

            fetchSitIns();
        }
    } catch (e) {
        Swal.fire('Error', 'Connection failed.', 'error');
    }
}

// --- TABLE CONTROLS ---
function applySearch() {
    const val = document.getElementById('searchInput').value.toLowerCase();

    filteredRecords = allRecords.filter(r =>
        Object.values(r).some(v =>
            String(v).toLowerCase().includes(val)
        )
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
                            style="background:#dc3545; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">
                            Time Out
                           </button>`
                        : `<button disabled style="padding:5px 10px; border-radius:4px; cursor:not-allowed;">
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

    let html = '';

    for (let i = 1; i <= totalPages; i++) {
        html += `
            <button onclick="goToPage(${i})"
                style="
                    margin: 0 2px;
                    padding: 5px 10px;
                    cursor:pointer;
                    background: ${i === currentPage ? '#0056b3' : '#fff'};
                    color: ${i === currentPage ? '#fff' : '#000'};
                    border: 1px solid #ddd;
                ">
                ${i}
            </button>
        `;
    }

    container.innerHTML = html;
}

function goToPage(p) {
    currentPage = p;
    renderTable();
}

function sortTable(n) {
    const keyMap = ['id', 'idNumber', 'lastName', 'purpose', 'lab', 'remainingSession', 'timeOut'];
    const key = keyMap[n];

    filteredRecords.sort((a, b) => {
        let valA = a[key] || '';
        let valB = b[key] || '';

        return valA.toString().localeCompare(valB.toString(), undefined, { numeric: true });
    });

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

