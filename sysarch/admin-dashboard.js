    const BASE = 'http://localhost:3000';

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

        // Dynamically update statsChart options on theme switch
        if (myChart) {
            const isDark = theme === 'dark';
            const tickColor = isDark ? '#b0b8cc' : '#858796';
            const gridColor = isDark ? '#2a2f47' : '#eaecf4';
            
            myChart.options.scales.x.ticks.color = tickColor;
            myChart.options.scales.x.grid.color = gridColor;
            myChart.options.scales.y.ticks.color = tickColor;
            myChart.options.scales.y.grid.color = gridColor;
            
            if (myChart.options.plugins && myChart.options.plugins.tooltip) {
                myChart.options.plugins.tooltip.backgroundColor = isDark ? '#1f2330' : '#ffffff';
                myChart.options.plugins.tooltip.titleColor = isDark ? '#ffffff' : '#333333';
                myChart.options.plugins.tooltip.bodyColor = isDark ? '#e0e6f0' : '#666666';
                myChart.options.plugins.tooltip.borderColor = isDark ? '#3a3f5c' : '#dddfeb';
            }
            
            myChart.update();
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

    let myChart = null;

    async function loadDashboardStats() {
        try {
            const response = await fetch(`${BASE}/admin/dashboard-data`);
            const data = await response.json();
            
            document.getElementById('totalRegistered').innerText = data.registered || 0;
            document.getElementById('currentSitIn').innerText = data.currentSitin || 0;
            document.getElementById('totalSitInCount').innerText = data.totalSitinToday || 0;

            const ctx = document.getElementById('statsChart').getContext('2d');
            if (myChart) myChart.destroy();

            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const tickColor = isDark ? '#b0b8cc' : '#858796';
            const gridColor = isDark ? '#2a2f47' : '#eaecf4';

            myChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Registered Students', 'Currently Sit-in', 'Total Sit-in Today'],
                    datasets: [{
                        label: 'Count',
                        data: [
                            data.registered || 0,
                            data.currentSitin || 0,
                            data.totalSitinToday || 0
                        ],
                        backgroundColor: [
                            'rgba(78, 115, 223, 0.85)',  // Blue
                            'rgba(28, 200, 138, 0.85)',  // Green
                            'rgba(54, 185, 204, 0.85)'   // Teal
                        ],
                        borderColor: [
                            '#4e73df',
                            '#1cc88a',
                            '#36b9cc'
                        ],
                        borderWidth: 1.5,
                        borderRadius: 8,
                        borderSkipped: false,
                        maxBarThickness: 50
                    }]
                },
                options: {
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: isDark ? '#1f2330' : '#ffffff',
                            titleColor: isDark ? '#ffffff' : '#333333',
                            bodyColor: isDark ? '#e0e6f0' : '#666666',
                            borderColor: isDark ? '#3a3f5c' : '#dddfeb',
                            borderWidth: 1,
                            padding: 10,
                            displayColors: false,
                            callbacks: {
                                label: function(context) {
                                    return `Count: ${context.parsed.y}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                color: gridColor,
                                drawOnChartArea: false
                            },
                            ticks: {
                                color: tickColor,
                                font: {
                                    family: "'Plus Jakarta Sans', sans-serif",
                                    weight: '600',
                                    size: 11
                                }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: gridColor,
                                drawBorder: false
                            },
                            ticks: {
                                color: tickColor,
                                stepSize: 1,
                                font: {
                                    family: "'Plus Jakarta Sans', sans-serif",
                                    size: 11
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) { 
            console.error("Stats Error:", error); 
        }
    }

    async function loadAnnouncements() {
        try {
            const res = await fetch(`${BASE}/api/announcements`);
            const announcements = await res.json();
            const list = document.getElementById('announcementList');

            if (announcements.length === 0) {
                list.innerHTML = '<p style="color:#aaa;">No announcements yet.</p>';
                return;
            }

            list.innerHTML = announcements.map(a => `
            <div class="announcement-item">
                <small style="color: #4e73df; font-weight: bold; font-size: 14px;">
                    CCS Admin | ${new Date(a.createdAt).toLocaleDateString()}
                </small>
                <p style="margin-top: 5px;">${a.message}</p>

                <button class="delete-btn" onclick="deleteAnnouncement('${a.id}')">
                    <i class="fa fa-trash"></i> Delete
                </button>
            </div>
        `).join('');
        } catch (err) {
            console.error(err);
        }
    }

    async function postAnnouncement() {
        const content = document.getElementById('announcementText').value.trim();
        if (!content) return Swal.fire('Error', 'Cannot post empty announcement', 'error');
        try {
            const res = await fetch(`${BASE}/api/announcements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: content })
            });
            if (res.ok) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Posted!',
                    confirmButtonText: 'OK',
                    allowOutsideClick: false,
                    allowEscapeKey: false
                });
                document.getElementById('announcementText').value = '';
                loadAnnouncements();
            }
        } catch (e) { console.error(e); }
    }

    async function deleteAnnouncement(id) {
        const { isConfirmed } = await Swal.fire({
            title: 'Delete Announcement?',
            text: "This action cannot be undone.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, Delete!',
            cancelButtonText: 'Cancel',
            allowOutsideClick: false,
            allowEscapeKey: false
        });

        if (!isConfirmed) return;

        try {
            const res = await fetch(`${BASE}/api/announcements/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Deleted',
                    text: 'Announcement removed successfully.',
                    confirmButtonText: 'OK',
                    allowOutsideClick: false,
                    allowEscapeKey: false
                });
                loadAnnouncements();

            } else {
                await Swal.fire({
                    icon: 'error',
                    title: 'Failed',
                    text: 'Failed to delete announcement.'
                });
            }

        } catch (err) {
            console.error("Delete error:", err);

            await Swal.fire({
                icon: 'error',
                title: 'Server Error',
                text: 'Something went wrong.'
            });
        }
    }

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
            const res  = await fetch(`${BASE}/search-students?q=${encodeURIComponent(id)}`);
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
        const res = await fetch(`${BASE}/student/${id}`);
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

        function selectStudent(data) {
            document.getElementById('searchResultsList').innerHTML = '';
            document.getElementById('studentDetailsBox').style.display = 'block';
            document.getElementById('uniFooter').style.display = 'flex';

            document.getElementById('uniIdSearch').value = data.idNumber;

            const remaining = data.remainingSession ?? 30;
            document.getElementById('accountInfoDisplay').innerHTML = `
                <span class="profile-name">${data.firstName} ${data.lastName}</span>
                <div class="profile-meta">
                    <div class="meta-item"><label>ID Number</label><span>${data.idNumber}</span></div>
                    <div class="meta-item"><label>Remaining Sessions</label>
                        <span style="color:${remaining <= 0 ? '#dc3545' : '#1cc88a'}; font-weight:700;">
                            ${remaining} / 30
                        </span>
                    </div>
                </div>
                ${remaining <= 0 ? '<p style="color:#dc3545; font-size:12px; margin-top:8px;"><i class="fa fa-exclamation-triangle"></i> This student has no remaining sessions.</p>' : ''}`;

            const confirmBtn = document.querySelector('#uniFooter .btn-confirm');
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
                    loadDashboardStats();
                } else {
                    const txt = await res.text();
                    Swal.fire('Error', txt, 'error');
                }
            } catch (e) { Swal.fire('Error', 'Connection failed.', 'error'); }
        }

    document.addEventListener("DOMContentLoaded", () => {
        loadDashboardStats();
        loadAnnouncements();

        if (!sessionStorage.getItem("adminWelcomeShown")) {
            Swal.fire({
                title: 'Welcome, Admin!',
                text: 'System analytics and student records are ready.',
                icon: 'success',
                confirmButtonColor: '#0056b3',
                background: '#fff',
            });

            sessionStorage.setItem("adminWelcomeShown", "true");
        }
    });

    async function logout() {
        const { isConfirmed } = await Swal.fire({
            title: 'Logout Admin?',
            text: "This will end your admin session.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, Logout!',
            cancelButtonText: 'Stay Logged In'
        });

        if (!isConfirmed) return;

        try {

            sessionStorage.removeItem("adminWelcomeShown");
            localStorage.removeItem("adminId");
            sessionStorage.clear();

            await Swal.fire({
                icon: 'success',
                title: 'Logged Out',
                text: 'Admin session ended successfully.',
                timer: 1500,
                showConfirmButton: false
            });

            window.location.href = "login.html";

        } catch (err) {
            console.error("Admin logout error:", err);

            sessionStorage.clear();
            localStorage.removeItem("adminId");

            window.location.href = "login.html";
        }
    }   