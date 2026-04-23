// --- INITIALIZE ---
document.addEventListener("DOMContentLoaded", () => {
    loadReports();
});

const SESSION_DURATION_MINUTES = 60;

// --- LOAD REPORTS ---
async function loadReports() {
    const dateVal = document.getElementById("dateFilter").value;
    let url = "http://localhost:3000/admin/reports";

    if (dateVal) {
        url += `?date=${dateVal}`;
    }

    try {
        const res = await fetch(url);
        const data = await res.json();
        const body = document.getElementById("reportsBody");

        if (!Array.isArray(data) || data.length === 0) {
            body.innerHTML = `<tr><td colspan="8" style="text-align:center;">No records found.</td></tr>`;
            return;
        }

        body.innerHTML = data.map((r, index) => `
            <tr>
                <td>${index + 1}</td>
                <td><b>${r.idNumber}</b></td>
                <td>${r.firstName} ${r.lastName}</td>
                <td>${r.purpose || 'N/A'}</td>
                <td>${r.lab || 'N/A'}</td>
                <td>${r.timeIn || '—'}</td>
                <td>${r.timeOut
                    ? r.timeOut
                    : '<span style="color:red;font-weight:bold;">Still Active</span>'}</td>
                <td>${r.date || '—'}</td>
            </tr>
        `).join("");

    } catch (err) {
        console.error("Error loading reports:", err);
        document.getElementById("reportsBody").innerHTML =
            `<tr><td colspan="8" style="color:red;text-align:center;">Server error. Please check your connection.</td></tr>`;
    }
}

// --- LIVE SEARCH FILTER ---
function filterTable() {
    const input = document.getElementById("reportSearch").value.toUpperCase();
    const rows = document.getElementById("reportsBody").getElementsByTagName("tr");

    for (let row of rows) {
        row.style.display = row.innerText.toUpperCase().includes(input) ? "" : "none";
    }
}

// --- PRINT REPORTS ---
function printReports() {
    window.print();
}

// --- EXPORT TO CSV ---
function exportCSV() {
    const rows = document.querySelectorAll("#reportsBody tr");
    const headers = ["#", "ID Number", "Name", "Purpose", "Lab", "Time In", "Time Out", "Date"];

    const csvLines = [headers.join(",")];

    rows.forEach(row => {
        const cells = row.querySelectorAll("td");
        if (cells.length === 0) return;
        const line = Array.from(cells).map(td => `"${td.innerText.replace(/"/g, '""')}"`).join(",");
        csvLines.push(line);
    });

    const blob = new Blob([csvLines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sit-in-reports-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// --- MODAL HELPERS ---
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// --- SEARCH STUDENT MODAL ---
function openSearchModal() {
    openModal('searchModal');
    document.getElementById('modalSearchInput').focus();
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
    document.getElementById('genLab').value = "524";
    document.getElementById('genRemaining').value = "";
    openModal('genericSitInModal');
}

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
        lab: document.getElementById('genLab').value
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
            loadReports();
        } else {
            const txt = await res.text();
            Swal.fire('Error', txt, 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'Connection to server failed.', 'error');
    }
}

// --- LOGOUT ---
function logout() {
    Swal.fire({
        title: 'Logout Admin?',
        text: "Are you sure you want to end your admin session?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, logout admin!',
        cancelButtonText: 'Stay logged in'
    }).then((result) => {
        if (result.isConfirmed) {
            sessionStorage.removeItem("adminWelcomeShown");
            window.location.href = "index.html";
        }
    });
}