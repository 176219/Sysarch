const SESSION_DURATION = 60;

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// --- Search Logic ---
function openSearchModal() { openModal('searchModal'); document.getElementById('modalSearchInput').focus(); }

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

// --- Sit-In Logic ---
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
        lab: document.getElementById('genLab').value.trim(),
        date: new Date().toLocaleDateString(),
        timeIn: new Date().toLocaleTimeString()
    };

    if (!payload.idNumber || !payload.lab) {
        return Swal.fire('Warning', 'ID Number and Lab are required.', 'warning');
    }

    try {
        const res = await fetch('http://localhost:3000/make-reservation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            Swal.fire('Success', 'Sit-in recorded!', 'success');
            closeModal('genericSitInModal');
            fetchStudents();
        } else {
            const txt = await res.text();
            Swal.fire('Error', txt, 'error');
        }
    } catch (e) { Swal.fire('Error', 'Connection failed.', 'error'); }
}

// --- Table Data Logic ---
async function fetchStudents() {
    try {
        const response = await fetch('http://localhost:3000/admin/students');
        const students = await response.json();
        const tableBody = document.getElementById("studentTableBody");

        tableBody.innerHTML = students.map(s => `
            <tr>
                <td>${s.idNumber}</td>
                <td>${s.firstName} ${s.lastName}</td>
                <td>${s.yearLevel}</td>
                <td>${s.course}</td>
                <td><span class="badge-session">${s.remainingSession ?? 30}</span></td>
                <td>
                    <button style="background:#007bff; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;" onclick="editStudent('${s.idNumber}')">Edit</button>
                    <button style="background:#dc3545; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;" onclick="deleteStudent('${s.idNumber}')">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error(error);
    }
}

// --- Add Student ---
function addStudent() {
    ['add-idNumber','add-lastName','add-firstName','add-middleName',
     'add-yearLevel','add-course','add-email','add-address','add-password']
    .forEach(id => document.getElementById(id).value = '');
    openModal('addStudentModal');
}

function toggleAddPass() {
    const input = document.getElementById('add-password');
    const icon = input.nextElementSibling;
    if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = '🚫';
    } else {
        input.type = 'password';
        icon.textContent = '🧿';
    }
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
        const res = await fetch('http://localhost:3000/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            Swal.fire({ icon: 'success', title: 'Student added!', timer: 1500, showConfirmButton: false });
            closeModal('addStudentModal');
            fetchStudents();
        } else {
            const err = await res.json();
            Swal.fire('Error', err.error || 'Failed to add student.', 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Connection failed.', 'error');
    }
}

// --- Edit Student ---
async function editStudent(idNumber) {
    try {
        const res = await fetch(`http://localhost:3000/get-student/${idNumber}`);
        const s = await res.json();

        Swal.fire({
            title: 'Edit Student',
            html: `
                <input id="swal-firstName" class="swal2-input" placeholder="First Name" value="${s.firstName}">
                <input id="swal-lastName" class="swal2-input" placeholder="Last Name" value="${s.lastName}">
                <input id="swal-email" class="swal2-input" placeholder="Email" value="${s.email || ''}">
                <input id="swal-course" class="swal2-input" placeholder="Course" value="${s.course || ''}">
                <input id="swal-yearLevel" class="swal2-input" placeholder="Year Level" value="${s.yearLevel || ''}">
                <input id="swal-address" class="swal2-input" placeholder="Address" value="${s.address || ''}">
            `,
            confirmButtonText: 'Save',
            showCancelButton: true,
            preConfirm: async () => {
                const payload = {
                    oldIdNumber: idNumber,
                    idNumber: idNumber,
                    firstName: document.getElementById('swal-firstName').value.trim(),
                    lastName: document.getElementById('swal-lastName').value.trim(),
                    email: document.getElementById('swal-email').value.trim(),
                    course: document.getElementById('swal-course').value.trim(),
                    yearLevel: document.getElementById('swal-yearLevel').value.trim(),
                    address: document.getElementById('swal-address').value.trim()
                };

                const res = await fetch('http://localhost:3000/update-profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    Swal.showValidationMessage('Failed to update student.');
                    return false;
                }

                return true;
            }
        }).then(result => {
            if (result.isConfirmed) {
                Swal.fire({ icon: 'success', title: 'Student updated!', timer: 1500, showConfirmButton: false });
                fetchStudents();
            }
        });
    } catch (e) {
        Swal.fire('Error', 'Could not load student data.', 'error');
    }
}

// --- Delete Student ---
async function deleteStudent(idNumber) {
    Swal.fire({
        title: 'Delete Student?',
        text: `This will permanently delete student ${idNumber}.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Yes, delete'
    }).then(async result => {
        if (result.isConfirmed) {
            try {
                const res = await fetch(`http://localhost:3000/delete-student/${idNumber}`, {
                    method: 'DELETE'
                });

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
    });
}

// --- Reset All Sessions ---
async function resetAllSessions() {
    Swal.fire({
        title: 'Reset All Sessions?',
        text: "This will reset every student's sessions back to 30.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Yes, reset all'
    }).then(async result => {
        if (result.isConfirmed) {
            try {
                const res = await fetch('http://localhost:3000/reset-sessions', {
                    method: 'POST'
                });

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
    });
}

// --- Filter Table ---
function filterTable() {
    const val = document.getElementById("tableSearch").value.toLowerCase();
    const rows = document.querySelectorAll("#studentTableBody tr");
    rows.forEach(r => r.style.display = r.innerText.toLowerCase().includes(val) ? "" : "none");
}

// --- Logout ---
function logout() {
    Swal.fire({
        title: 'Logout Admin?',
        text: "Are you sure you want to end your admin session?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, logout admin!',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            sessionStorage.removeItem("adminWelcomeShown");
            window.location.href = "login.html";
        }
    });
}

// --- Init ---
window.onload = function() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    fetchStudents();
}