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

    let _announcements = [];

    function toggleNotifDropdown(e) {
        e.preventDefault();
        const d = document.getElementById('notifDropdown');
        d.style.display = d.style.display === 'block' ? 'none' : 'block';
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('li:has(#notifDropdown)')) {
            const d = document.getElementById('notifDropdown');
            if (d) d.style.display = 'none';
        }
    });

    function getReadIds() { return JSON.parse(localStorage.getItem('readIds') || '[]'); }
    function saveReadIds(ids) { localStorage.setItem('readIds', JSON.stringify(ids)); }

    function markAllRead() {
        saveReadIds(_announcements.map(a => a.id));
        renderNotifs();
    }

    function renderNotifs() {
        const readIds = getReadIds();
        const unread = _announcements.filter(a => !readIds.includes(a.id)).length;
        const badge = document.getElementById('notifBadge');
        badge.textContent = unread;
        badge.style.display = unread > 0 ? 'flex' : 'none';

        document.getElementById('notifList').innerHTML = _announcements.length
            ? _announcements.map(a => `
                <div onclick="markOneRead(${a.id})" style="padding:12px 14px; border-bottom:1px solid #eee;
                    cursor:pointer; background:${!readIds.includes(a.id) ? '#eaf3fb' : 'white'}">
                    <div style="font-size:11px; color:#888;">${a.createdAt}</div>
                    <div style="font-size:13px; color:#222; margin-top:3px;">${a.message}</div>
                </div>`).join('')
            : '<p style="text-align:center;color:#aaa;padding:20px;font-size:13px;">No announcements yet.</p>';
    }

    function markOneRead(id) {
        const ids = getReadIds();
        if (!ids.includes(id)) { ids.push(id); saveReadIds(ids); renderNotifs(); }
    }

    async function pollAnnouncements() {
        try {
            const res = await fetch('http://localhost:3000/api/announcements');
            _announcements = await res.json();
            renderNotifs();
        } catch(e) {}
    }

    pollAnnouncements();
    setInterval(pollAnnouncements, 30000);

    // ── Reservation Status Notifications (merged into notifList) ──
    let _resNotifs = [];

    async function pollResNotifs() {
        const idNumber = localStorage.getItem('loggedInId');
        if (!idNumber) return;
        try {
            const res = await fetch(`http://localhost:3000/notifications/${idNumber}`);
            _resNotifs = await res.json();
            renderCombinedNotifs();
        } catch(e) {}
    }

    function renderCombinedNotifs() {
        const readIds    = getReadIds();
        const unreadAnn  = _announcements.filter(a => !readIds.includes(a.id)).length;
        const unreadRes  = _resNotifs.filter(n => n.isRead === 0).length;
        const totalUnread = unreadAnn + unreadRes;

        const badge = document.getElementById('notifBadge');
        badge.textContent = totalUnread;
        badge.style.display = totalUnread > 0 ? 'flex' : 'none';

        // Build combined list: reservation notifs first (most actionable), then announcements
        let html = '';

        _resNotifs.forEach(n => {
            const isAccepted = n.message.startsWith('✅');
            html += `
                <div onclick="markResNotifRead(${n.id})" style="padding:12px 14px;border-bottom:1px solid #eee;cursor:pointer;
                    background:${n.isRead ? 'white' : (isAccepted ? '#eaf7ee' : '#fdf0f0')};">
                    <div style="font-size:14px;color:#888;">Reservation Update | ${n.createdAt || ''}</div>
                    <div style="font-size:14px;color:${n.isRead ? '#888' : '#222'};margin-top:3px; font-family: 'Sora', sans-serif;">${n.message}</div>
                </div>`;
        });

        _announcements.forEach(a => {
            html += `
                <div onclick="markOneRead(${a.id})" style="padding:12px 14px;border-bottom:1px solid #eee;cursor:pointer;
                    background:${!readIds.includes(a.id) ? '#eaf3fb' : 'white'}">
                    <div style="font-size:14px;color:#888;">${a.createdAt}</div>
                    <div style="font-size:14px;color:#222;margin-top:3px; font-family: 'Sora', sans-serif;">${a.message}</div>
                </div>`;
        });

        document.getElementById('notifList').innerHTML = html ||
            '<p style="text-align:center;color:#aaa;padding:20px;font-size:13px;">No notifications yet.</p>';
    }

    async function markResNotifRead(id) {
        try {
            await fetch(`http://localhost:3000/notifications/read/${id}`, { method: 'POST' });
            const n = _resNotifs.find(x => x.id === id);
            if (n) n.isRead = 1;
            renderCombinedNotifs();
        } catch(e) {}
    }

    // Override markAllRead to also clear reservation notifs
    const _origMarkAllRead = markAllRead;
    window.markAllRead = function() {
        _origMarkAllRead();
        const idNumber = localStorage.getItem('loggedInId');
        if (idNumber) {
            fetch(`http://localhost:3000/notifications/read-all/${idNumber}`, { method: 'POST' })
                .then(() => { _resNotifs.forEach(n => n.isRead = 1); renderCombinedNotifs(); })
                .catch(() => {});
        }
    };

    // Override renderNotifs so announcements also trigger a combined re-render
    const _origRenderNotifs = renderNotifs;
    window.renderNotifs = function() {
        _origRenderNotifs();
        renderCombinedNotifs();
    };

    // SweetAlert popup when a new accept/deny arrives
    let _lastResNotifCount = 0;
    async function checkForNewResNotifs() {
        const idNumber = localStorage.getItem('loggedInId');
        if (!idNumber) return;
        try {
            const res    = await fetch(`http://localhost:3000/notifications/${idNumber}`);
            const notifs = await res.json();
            const unread = notifs.filter(n => n.isRead === 0);
            if (unread.length > _lastResNotifCount && _lastResNotifCount !== -1) {
                const latest     = unread[0];
                const isAccepted = latest.message.startsWith('✅');
                Swal.fire({
                    icon: isAccepted ? 'success' : 'error',
                    title: isAccepted ? 'Reservation Accepted!' : 'Reservation Denied',
                    text: latest.message.replace(/^[✅❌]\s*/, ''),
                    confirmButtonColor: isAccepted ? '#28a745' : '#dc3545',
                    confirmButtonText: 'OK'
                });
            }
            _lastResNotifCount = unread.length;
            _resNotifs = notifs;
            renderCombinedNotifs();
        } catch(e) {}
    }

    pollResNotifs();
    setTimeout(async () => {
        const idNumber = localStorage.getItem('loggedInId');
        if (!idNumber) return;
        try {
            const res    = await fetch(`http://localhost:3000/notifications/${idNumber}`);
            const notifs = await res.json();
            _lastResNotifCount = notifs.filter(n => n.isRead === 0).length;
        } catch(e) { _lastResNotifCount = 0; }
    }, 500);
    setInterval(checkForNewResNotifs, 15000);

    function generatePCGrid() {
        const pcContainer = document.getElementById('pc-selection-container');
        const pcGrid      = document.getElementById('pc-grid');
        const labSelect   = document.getElementById('res-lab');
 
        if (labSelect.value) {
            pcContainer.style.display = 'block';
            pcGrid.innerHTML = '';
            document.getElementById("res-pc-number").value = "";
 
            for (let i = 1; i <= 45; i++) {
                const btn = document.createElement('button');
                btn.type      = 'button';
                btn.innerText = `PC${i}`;
                btn.style.cssText = "padding: 8px 5px; font-size: 12px; cursor: pointer; border: 1px solid #ddd; border-radius: 6px; background: #fff; transition: 0.2s;";
                
                btn.onclick = function () {
                    document.querySelectorAll('#pc-grid button').forEach(b => {
                        b.style.background = '#fff';
                        b.style.color      = '#000';
                    });
                    this.style.background = '#1cc88a';
                    this.style.color      = 'white';
                    document.getElementById('res-pc-number').value = `PC${i}`;
                };
                
                pcGrid.appendChild(btn);
            }
        } else {
            pcContainer.style.display = 'none';
        }
    }
 
    document.getElementById('res-lab').addEventListener('change', generatePCGrid);

    async function handleReservation(e) {
        if (e) e.preventDefault();
 
        const reservationData = {
            idNumber:         document.getElementById("res-id").value.trim(),
            studentName:      document.getElementById("res-name").value.trim(),
            purpose:          document.getElementById("res-purpose").value,
            lab:              document.getElementById("res-lab").value,
            pcNumber:         document.getElementById("res-pc-number").value,
            timeIn:           document.getElementById("res-time").value,
            date:             document.getElementById("res-date").value,
            remainingSession: document.getElementById("res-sessions").value
        };
        // Validations
        if (!reservationData.pcNumber) {
            Swal.fire('Wait!', 'Please select a workstation (PC1–PC45).', 'warning');
            return;
        }
        if (!reservationData.purpose || !reservationData.lab || !reservationData.timeIn || !reservationData.date) {
            Swal.fire('Wait!', 'Please fill in all the reservation details.', 'warning');
            return;
        }
 
        // Confirm before submitting
        const { isConfirmed } = await Swal.fire({
            title: 'Submit Reservation?',
            html: `
                <b>Lab:</b> ${reservationData.lab} &nbsp; <b>PC:</b> ${reservationData.pcNumber}<br>
                <b>Purpose:</b> ${reservationData.purpose}<br>
                <b>Date:</b> ${reservationData.date} &nbsp; <b>Time:</b> ${reservationData.timeIn}<br><br>
                <small style="color:#856404">⚠️ Your session will only be deducted after admin approval.</small>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            confirmButtonText: 'Yes, Submit!'
        });
 
        if (!isConfirmed) return;
 
        try {
            const response = await fetch("http://localhost:3000/make-reservation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reservationData)
            });
 
            const resultData = await response.json();
 
            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Request Submitted!',
                    html: 'Your reservation request is now <b>Pending</b>.<br>The admin will review and approve it shortly.',
                    confirmButtonColor: '#0056b3',
                    confirmButtonText: 'OK'
                });
            } else {
                Swal.fire('Error', resultData.message || 'Could not submit reservation. Try again.', 'error');
            }
        } catch (error) {
            console.error("Fetch error:", error);
            Swal.fire('Server Error', 'Make sure your server.js is running.', 'error');
        }
    }

 
    document.addEventListener("DOMContentLoaded", async () => {
        const idNumber = localStorage.getItem("loggedInId");
        if (!idNumber) {
            window.location.href = "reservation.html";
            return;
        }
 
        try {
            const res = await fetch(`http://localhost:3000/student/${idNumber}`);
            if (res.ok) {
                const user = await res.json();
                document.getElementById("res-id").value       = user.idNumber || "";
                document.getElementById("res-name").value     = `${user.firstName} ${user.lastName}`;
                document.getElementById("res-sessions").value = user.remainingSession ?? 0;
            }
        } catch (err) {
            console.error("Error fetching student data:", err);
        }
 
    });

async function logout() {
    const studentId = localStorage.getItem('loggedInId');
    
    const { isConfirmed } = await Swal.fire({
        title: 'Logout?',
        text: "This will end your current lab session and log you out.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#0056b3',
        confirmButtonText: 'Yes, Logout!'
    });

    if (isConfirmed) {
        try {
            if (studentId) {
                await fetch("http://localhost:3000/logout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ idNumber: studentId })
                });
            }

            localStorage.removeItem('loggedInId');
            localStorage.removeItem('sessionExpiry');
            sessionStorage.clear();

            await Swal.fire({
                icon: 'success',
                title: 'Logged Out',
                text: 'Your session has been closed.',
                timer: 1500,
                showConfirmButton: false
            });
            window.location.href = 'login.html';
        } catch (err) {
            console.error("Logout error:", err);
            localStorage.removeItem('loggedInId');
            window.location.href = 'login.html';
        }
    }
}