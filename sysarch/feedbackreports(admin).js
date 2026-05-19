const SESSION_DURATION = 60;

function openModal(modalId) { document.getElementById(modalId).style.display = 'flex'; }
function closeModal(modalId) { document.getElementById(modalId).style.display = 'none'; }

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
                timeLeftText = remaining > 0 ? `${remaining} minutes left` : "Session expired";
            }

            document.getElementById('infoBody').innerHTML = `
                <p><b>ID Number:</b> ${data.idNumber}</p>
                <p><b>Name:</b> ${data.firstName} ${data.lastName}</p>
                <p><b>Course:</b> ${data.course || 'N/A'}</p>
                <p><b>Email:</b> ${data.email || 'N/A'}</p>
                <p><b>Year:</b> ${data.yearLevel || 'N/A'}</p>
                <p><b>Address:</b> ${data.address || 'N/A'}</p>
                <p><b>Sessions Left:</b> <span class="badge badge-session">${data.remainingSession ?? 30}</span></p>
                <p><b>Time Left:</b> <span style="color:#007bff;font-weight:bold;">${timeLeftText}</span></p>
            `;
            openModal('studentInfoModal');
        } else {
            Swal.fire('Oops!', 'Student not found.', 'warning');
        }
    } catch (e) {
        Swal.fire('Error', 'Server Error', 'error');
    }
}


function openGenericSitInForm() {
    document.getElementById('genIdNumber').value = "";
    document.getElementById('genFullName').value = "";
    document.getElementById('genLab').value = "524";
    document.getElementById('genRemaining').value = "";
    openModal('genericSitInModal');
}

async function autoFillStudent() {
    const idInput      = document.getElementById('genIdNumber');
    const nameInput    = document.getElementById('genFullName');
    const sessionInput = document.getElementById('genRemaining');
    const idNumber     = idInput.value.trim();

    if (idNumber === "") {
        nameInput.value    = "";
        sessionInput.value = "";
        return;
    }

    try {
        const res = await fetch(`http://localhost:3000/get-student/${idNumber}`);
        if (res.ok) {
            const data = await res.json();
            nameInput.value    = `${data.firstName} ${data.lastName}`;
            sessionInput.value = data.remainingSession ?? 30;
        } else {
            nameInput.value    = "";
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
        purpose:  document.getElementById('genPurpose').value,
        lab:      document.getElementById('genLab').value
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
            if (typeof fetchSitIns === "function") fetchSitIns();
            if (typeof loadDashboardStats === "function") loadDashboardStats();
        } else {
            const txt = await res.text();
            Swal.fire('Error', txt, 'error');
        }
    } catch (err) {
        console.error("Submission error:", err);
        Swal.fire('Error', 'Connection to server failed.', 'error');
    }
}

// Build star HTML from a numeric rating
function buildStars(rating) {
    rating = Math.min(parseInt(rating) || 0, 5);
    const filled = '★'.repeat(rating);
    const empty  = '☆'.repeat(5 - rating);
    return `
        <span class="stars-filled">${filled}</span>
        <span class="stars-empty">${empty}</span>
        <span class="stars-label">(${rating}/5)</span>
    `;
}

// Fetch and render feedback from the server
async function loadFeedback() {
    try {
        const response = await fetch("http://localhost:3000/api/feedback");
        const feedback = await response.json();

        const tbody = document.getElementById("feedbackBody");

        if (feedback.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;padding:20px;color:#888;">
                        No feedback reports yet.
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = feedback.map(f => `
            <tr>
                <td><b>${f.idNumber}</b></td>
                <td>${f.lab}</td>
                <td>${f.date}</td>
                <td class="star-cell">${buildStars(f.rating)}</td>
                <td>${f.message}</td>
            </tr>
        `).join("");

    } catch (err) {
        console.error("Error loading feedback:", err);
    }
}

// Live filter for the search box
function filterFeedback() {
    const input = document.getElementById("feedbackSearch").value.toUpperCase();
    const rows  = document.getElementById("feedbackBody").getElementsByTagName("tr");

    for (let row of rows) {
        row.style.display = row.innerText.toUpperCase().includes(input) ? "" : "none";
    }
}

document.addEventListener("DOMContentLoaded", loadFeedback);

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
            window.location.href = "login.html";
        }
    });
}