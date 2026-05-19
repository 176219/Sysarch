const SESSION_DURATION = 60;

function openModal(id)  { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

    // ── Search ──────────────────────────────────────────────
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
    // ── Generic Sit-In (Admin) ───────────────────────────────
    function openGenericSitInForm() {
        document.getElementById('genIdNumber').value  = "";
        document.getElementById('genFullName').value  = "";
        document.getElementById('genLab').value       = "524";
        document.getElementById('genRemaining').value = "";
        openModal('genericSitInModal');
    }

    async function autoFillStudent() {
        const id = document.getElementById('genIdNumber').value.trim();
        if (!id) {
            document.getElementById('genFullName').value  = "";
            document.getElementById('genRemaining').value = "";
            return;
        }
        try {
            const res  = await fetch(`http://localhost:3000/get-student/${id}`);
            if (res.ok) {
                const data = await res.json();
                document.getElementById('genFullName').value  = `${data.firstName} ${data.lastName}`;
                document.getElementById('genRemaining').value = data.remainingSession ?? 30;
            } else {
                document.getElementById('genFullName').value  = "";
                document.getElementById('genRemaining').value = "";
            }
        } catch (e) { console.error("Live search error:", e); }
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
                await Swal.fire({ icon: 'success', title: 'Sit-in recorded!', confirmButtonText: 'OK' });
                closeModal('genericSitInModal');
                document.getElementById('genIdNumber').value = "";
            } else {
                const txt = await res.text();
                Swal.fire('Error', txt, 'error');
            }
        } catch (err) {
            Swal.fire('Error', 'Connection to server failed.', 'error');
        }
    }

    // ── Fetch & Render Reservation Requests ─────────────────
    async function fetchReservations() {
        try {
            const res  = await fetch("http://localhost:3000/admin/reservations");
            const data = await res.json();

            const labFilter   = document.getElementById("labFilter").value;
            const requestBody = document.getElementById("requestBody");
            const logBody     = document.getElementById("logBody");

            requestBody.innerHTML = "";
            logBody.innerHTML     = "";

            // Filter by selected lab
            const filtered = data.filter(r => r.lab === labFilter);

            // Count pending for the badge
            const pendingItems = filtered.filter(r => r.status === 'Pending');
            document.getElementById('pendingCount').textContent = pendingItems.length;
            document.getElementById('logCount').textContent     = filtered.length;

            if (filtered.length === 0) {
                requestBody.innerHTML = `<div class="empty-state"><i class="fa fa-inbox"></i>No reservation requests for Lab ${labFilter}</div>`;
                logBody.innerHTML     = `<div class="empty-state"><i class="fa fa-list"></i>No logs for Lab ${labFilter}</div>`;
                return;
            }

            let hasPending = false;

            filtered.forEach(rev => {

                // ── Requests Panel (Pending only) ──
                if (rev.status === 'Pending') {
                    hasPending = true;
                    requestBody.innerHTML += `
                        <div class="res-card" id="req-card-${rev.id}">
                            <p><b>ID Number:</b> ${rev.idNumber}</p>
                            <p><b>Name:</b> ${rev.studentName || 'N/A'}</p>
                            <p><b>Reservation Date:</b> ${rev.date || 'N/A'}</p>
                            <p><b>Reservation Time:</b> ${rev.timeIn || 'N/A'}</p>
                            <p><b>Laboratory:</b> ${rev.lab}</p>
                            <p><b>Computer Number:</b> ${rev.pcNumber || 'N/A'}</p>
                            <p><b>Purpose:</b> ${rev.purpose}</p>
                            <div class="action-btns">
                                <button class="btn-accept" onclick="updateStatus(${rev.id}, 'Accepted')">
                                    <i class="fa fa-check"></i> Accept
                                </button>
                                <button class="btn-deny" onclick="updateStatus(${rev.id}, 'Denied')">
                                    <i class="fa fa-times"></i> Deny
                                </button>
                            </div>
                        </div>`;
                }

                // ── Logs Panel (All statuses) ──
                const statusClass = `status-${rev.status.toLowerCase()}`;
                logBody.innerHTML += `
                    <div class="log-entry">
                        <p><b>ID Number:</b> ${rev.idNumber}</p>
                        <p><b>Name:</b> ${rev.studentName || 'N/A'}</p>
                        <p><b>Reservation Date:</b> ${rev.date || 'N/A'}</p>
                        <p><b>Reservation Time:</b> ${rev.timeIn || 'N/A'}</p>
                        <p><b>Laboratory:</b> ${rev.lab} &nbsp;|&nbsp; <b>PC:</b> ${rev.pcNumber || 'N/A'}</p>
                        <p><b>Purpose:</b> ${rev.purpose}</p>
                        <p><b>Status:</b> <span class="${statusClass}">${rev.status}</span></p>
                    </div>`;
            });

            if (!hasPending) {
                requestBody.innerHTML = `<div class="empty-state"><i class="fa fa-check-circle"></i>No pending requests for Lab ${labFilter}</div>`;
            }

        } catch (err) {
            console.error("Load error:", err);
            Swal.fire('Error', 'Could not load reservations. Make sure server.js is running.', 'error');
        }
    }

    // ── Accept or Deny ───────────────────────────────────────
    async function updateStatus(id, newStatus) {
        const actionText = newStatus === 'Accepted' ? 'accept' : 'deny';
        const { isConfirmed } = await Swal.fire({
            title: `${newStatus === 'Accepted' ? 'Accept' : 'Deny'} Reservation?`,
            text: newStatus === 'Accepted'
                ? 'This will record the sit-in and deduct one session from the student.'
                : 'This will deny the reservation request.',
            icon: newStatus === 'Accepted' ? 'question' : 'warning',
            showCancelButton: true,
            confirmButtonColor: newStatus === 'Accepted' ? '#28a745' : '#dc3545',
            confirmButtonText: `Yes, ${actionText} it!`
        });

        if (!isConfirmed) return;

        try {
            const res  = await fetch("http://localhost:3000/admin/update-reservation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: newStatus })
            });
            const data = await res.json();

            if (res.ok) {
                await Swal.fire({
                    icon: newStatus === 'Accepted' ? 'success' : 'info',
                    title: newStatus === 'Accepted' ? 'Accepted!' : 'Denied',
                    text: data.message,
                    timer: 2000,
                    showConfirmButton: false
                });
                fetchReservations(); // Refresh the panels
            } else {
                Swal.fire('Error', data.message || 'Something went wrong.', 'error');
            }
        } catch (err) {
            Swal.fire('Error', 'Connection failed. Check server.js is running.', 'error');
        }
    }

    // ── Logout ───────────────────────────────────────────────
    function logout() {
        Swal.fire({
            title: 'Logout Admin?',
            text: "Are you sure you want to end your admin session?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, logout!',
            cancelButtonText: 'Stay'
        }).then((result) => {
            if (result.isConfirmed) {
                sessionStorage.removeItem("adminWelcomeShown");
                window.location.href = "index.html";
            }
        });
    }

    // ── On Load ──────────────────────────────────────────────
    document.addEventListener("DOMContentLoaded", () => {
        fetchReservations();
        // Auto-refresh every 30 seconds
        setInterval(fetchReservations, 30000);
    });