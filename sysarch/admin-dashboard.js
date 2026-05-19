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

    let myChart = null;

    async function loadDashboardStats() {
        try {
            const response = await fetch('http://localhost:3000/admin/dashboard-data');
            const data = await response.json();
            
            document.getElementById('totalRegistered').innerText = data.registered || 0;
            document.getElementById('currentSitIn').innerText = data.currentSitin || 0;
            document.getElementById('totalSitInCount').innerText = data.totalSitin || 0;

            const labels = data.chartData.length > 0 ? data.chartData.map(item => item.purpose) : ['No Data'];
            const counts = data.chartData.length > 0 ? data.chartData.map(item => item.count) : [1];

            const ctx = document.getElementById('statsChart').getContext('2d');
            if (myChart) myChart.destroy();

            const gradient = ctx.createLinearGradient(0, 0, 500, 0);
            gradient.addColorStop(0, '#4e73df');
            gradient.addColorStop(1, '#224abe');

            myChart = new Chart(ctx, {
                type: 'doughnut',
                data: { 
                    labels: labels, 
                    datasets: [{ 
                        data: counts, 
                        backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e'],
                        hoverBackgroundColor: ['#2e59d9', '#17a673', '#2c9faf', '#f4b619'],
                        hoverBorderColor: "rgba(234, 236, 244, 1)",
                        borderWidth: 1,
                    }] 
                },
                options: { 
                    maintainAspectRatio: false,
                    cutout: '75%',
                    plugins: { 
                        legend: { 
                            display: true,
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 20,
                                font: { family: "'Nunito', sans-serif", size: 14 }
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
            const res = await fetch('http://localhost:3000/announcements');
            const announcements = await res.json();
            const list = document.getElementById('announcementList');

            if (announcements.length === 0) {
                list.innerHTML = '<p style="color:#aaa;">No announcements yet.</p>';
                return;
            }

            list.innerHTML = announcements.map(a => `
            <div class="announcement-item">
                <small style="color: #4e73df; font-weight: bold; font-size: 16px,">
                    ${a.author} | ${a.date}
                </small>
                <p style="margin-top: 5px;">${a.content}</p>

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
            const res = await fetch('http://localhost:3000/admin/announcement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
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
            const res = await fetch(`http://localhost:3000/admin/announcement/${id}`, {
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
                const res = await fetch('http://localhost:3000/sit-in', {
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

    window.onload = function() {
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
    };

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

            window.location.href = "index.html";

        } catch (err) {
            console.error("Admin logout error:", err);

            sessionStorage.clear();
            localStorage.removeItem("adminId");

            window.location.href = "index.html";
        }
    }   