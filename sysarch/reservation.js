    /* ══ DARK / LIGHT MODE ══ */
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.getElementById('themeIcon').className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
    function toggleTheme() {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        localStorage.setItem('ccs_theme', next);
        applyTheme(next);
        const icon = document.getElementById('themeIcon');
        icon.style.transform = 'rotate(360deg)';
        icon.style.transition = 'transform 0.4s ease';
        setTimeout(() => { icon.style.transform = ''; icon.style.transition = ''; }, 400);
    }
    (function() { applyTheme(localStorage.getItem('ccs_theme') || 'light'); })();

    /* ══ NOTIFICATIONS ══ */
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
        const idNumber = localStorage.getItem('loggedInId');
        if (idNumber) {
            fetch(`http://localhost:3000/notifications/read-all/${idNumber}`, { method: 'POST' })
                .then(() => { _resNotifs.forEach(n => n.isRead = 1); renderCombinedNotifs(); })
                .catch(() => {});
        }
    }

    function renderNotifs() { renderCombinedNotifs(); }

    async function pollAnnouncements() {
        try {
            const res = await fetch('http://localhost:3000/announcements');
            _announcements = await res.json();
            renderCombinedNotifs();
        } catch(e) {}
    }

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
        const readIds     = getReadIds();
        const unreadAnn   = _announcements.filter(a => !readIds.includes(a.id)).length;
        const unreadRes   = _resNotifs.filter(n => n.isRead === 0).length;
        const totalUnread = unreadAnn + unreadRes;

        const badge = document.getElementById('notifBadge');
        badge.textContent = totalUnread;
        badge.style.display = totalUnread > 0 ? 'flex' : 'none';

        let html = '';
        _resNotifs.forEach(n => {
            const isAccepted = n.message.startsWith('✅');
            html += `
                <div onclick="markResNotifRead(${n.id})" style="padding:12px 14px;border-bottom:1px solid #eee;cursor:pointer;
                    background:${n.isRead ? 'white' : (isAccepted ? '#eaf7ee' : '#fdf0f0')};">
                    <div style="font-size:11px; color:#888;">Reservation Update | ${n.createdAt || ''}</div>
                    <div style="font-size:13px;color:${n.isRead ? '#888' : '#222'};margin-top:3px;">${n.message}</div>
                </div>`;
        });
        _announcements.forEach(a => {
            html += `
                <div onclick="markOneRead(${a.id})" style="padding:12px 14px;border-bottom:1px solid #eee;cursor:pointer;
                    background:${!readIds.includes(a.id) ? '#eaf3fb' : 'white'}">
                    <div style="font-size:11px; color:#888;">${a.author} | ${a.date}</div>
                    <div style="font-size:13px;color:#222;margin-top:3px;">${a.content}</div>
                </div>`;
        });
        document.getElementById('notifList').innerHTML = html ||
            '<p style="text-align:center;color:#aaa;padding:20px;font-size:13px;">No notifications yet.</p>';
    }

    function markOneRead(id) {
        const ids = getReadIds();
        if (!ids.includes(id)) { ids.push(id); saveReadIds(ids); renderCombinedNotifs(); }
    }

    async function markResNotifRead(id) {
        try {
            await fetch(`http://localhost:3000/notifications/read/${id}`, { method: 'POST' });
            const n = _resNotifs.find(x => x.id === id);
            if (n) n.isRead = 1;
            renderCombinedNotifs();
        } catch(e) {}
    }

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

    pollAnnouncements();
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
    setInterval(pollAnnouncements, 30000);
    setInterval(checkForNewResNotifs, 15000);

    /* ══════════════════════════════════════════════════
       PC GRID — fetches real statuses from the database
    ══════════════════════════════════════════════════ */
    /* ══════════════════════════════════════════════════
       PC GRID — fetches real statuses from the database
    ══════════════════════════════════════════════════ */
    async function updateSoftwareList(labName) {
        const softwareListEl = document.getElementById('room-software-list');
        if (!softwareListEl) return;

        try {
            const rawSoftware = localStorage.getItem('ccs_software') || '[]';
            const softwareList = JSON.parse(rawSoftware);
            const normalizedLab = labName.replace(/\D/g, ''); // e.g. "Lab 524" -> "524"
            
            // Filter software where lab is registered
            const roomSoftware = softwareList.filter(s => {
                // software has a labs array/list e.g. ["524", "526"] or similar representation
                if (Array.isArray(s.labs)) {
                    return s.labs.includes(normalizedLab);
                }
                if (typeof s.labs === 'string') {
                    return s.labs.split(',').map(x => x.trim()).includes(normalizedLab);
                }
                return false;
            });

            if (roomSoftware.length === 0) {
                softwareListEl.innerHTML = `<span style="color: var(--text-muted);">No software registered for this lab room</span>`;
            } else {
                softwareListEl.innerHTML = roomSoftware.map(s => {
                    const statusText = s.status || 'Installed';
                    const isInstalling = statusText.toLowerCase().includes('installing');
                    const badgeColor = isInstalling ? 'background: #ffeeba; color: #856404; border: 1px solid #ffeeba;' : 'background: #c3e6cb; color: #155724; border: 1px solid #c3e6cb;';
                    return `
                        <div style="display: flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 4px; font-weight: 600; font-size: 12px; ${badgeColor}">
                            <i class="fa ${isInstalling ? 'fa-spinner fa-spin' : 'fa-check-circle'}"></i>
                            <span>${s.name}</span>
                        </div>
                    `;
                }).join('');
            }
        } catch(e) {
            console.error("Error reading room software list:", e);
            softwareListEl.innerHTML = `<span style="color: #dc3545;">Error loading software info</span>`;
        }
    }

    async function onLabChange() {
        const lab = document.getElementById('res-lab').value;
        updateSoftwareList(lab);
        generatePCGrid();
    }

    async function generatePCGrid() {
        const pcGrid = document.getElementById('pc-grid');
        const lab    = document.getElementById('res-lab').value;

        // Reset selection
        document.getElementById("res-pc-number").value = "";
        document.getElementById("pc-selected-label").style.display = "none";

        // Show loading skeletons (6x6 grid with 3 visual vertical dividers: 9 total grid columns)
        // Col indices 1, 2, 3, 4, 5, 6, 7, 8, 9 (1-based)
        // Aisles are between columns 1&2 (col 2), columns 3&4 (col 5), and columns 5&6 (col 8)
        pcGrid.innerHTML = '';
        
        let pcIndex = 1;
        // 6 rows, 9 columns (6 PC columns + 3 aisle columns)
        for (let row = 0; row < 6; row++) {
            for (let col = 1; col <= 9; col++) {
                if (col === 2 || col === 5 || col === 8) {
                    // It's an aisle separator
                    const aisle = document.createElement('div');
                    aisle.style.width = '12px';
                    aisle.style.display = 'flex';
                    aisle.style.justifyContent = 'center';
                    aisle.style.alignItems = 'center';
                    const line = document.createElement('div');
                    line.style.width = '2px';
                    line.style.height = '80%';
                    line.style.background = 'var(--border-color)';
                    line.style.opacity = '0.5';
                    aisle.appendChild(line);
                    pcGrid.appendChild(aisle);
                } else {
                    const btn = document.createElement('button');
                    btn.type      = 'button';
                    btn.innerText = `PC${pcIndex}`;
                    btn.className = 'pc-grid-btn loading-skeleton';
                    btn.disabled  = true;
                    pcGrid.appendChild(btn);
                    pcIndex++;
                }
            }
        }

        // Fetch statuses from server
        let statusMap = {};
        try {
            const res  = await fetch(`http://localhost:3000/admin/pc-status/${encodeURIComponent(lab)}`);
            const rows = await res.json();
            rows.forEach(r => { statusMap[r.pcNumber] = r.status; });
        } catch(e) {
            console.warn('Could not fetch PC statuses, showing all as available');
        }

        // Build real grid
        pcGrid.innerHTML = '';
        pcIndex = 1;
        for (let row = 0; row < 6; row++) {
            for (let col = 1; col <= 9; col++) {
                if (col === 2 || col === 5 || col === 8) {
                    const aisle = document.createElement('div');
                    aisle.style.width = '12px';
                    aisle.style.display = 'flex';
                    aisle.style.justifyContent = 'center';
                    aisle.style.alignItems = 'center';
                    const line = document.createElement('div');
                    line.style.width = '2px';
                    line.style.height = '80%';
                    line.style.background = 'var(--border-color)';
                    line.style.opacity = '0.5';
                    aisle.appendChild(line);
                    pcGrid.appendChild(aisle);
                } else {
                    const pcLabel  = `PC${pcIndex}`;
                    const status   = statusMap[pcLabel] || 'Available';
                    const canSelect = status === 'Available';

                    const btn = document.createElement('button');
                    btn.type      = 'button';
                    btn.className = `pc-grid-btn ${status.toLowerCase().replace(/\s+/g, '')}`;
                    btn.disabled  = !canSelect;
                    btn.title     = canSelect ? `Select ${pcLabel}` : `${pcLabel} — ${status}`;

                    if (status === 'Under Maintenance') {
                        btn.innerHTML = `<i class="fa-solid fa-wrench" style="font-size: 11px;"></i><span>${pcLabel}</span>`;
                    } else if (status === 'Out of Order') {
                        btn.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="font-size: 11px;"></i><span>${pcLabel}</span>`;
                    } else {
                        btn.innerHTML = `<span>${pcLabel}</span>`;
                    }

                    if (canSelect) {
                        btn.onclick = function () {
                            // Deselect all
                            document.querySelectorAll('#pc-grid .pc-grid-btn.selected').forEach(b => {
                                b.classList.remove('selected');
                            });
                            // Select this one
                            btn.classList.add('selected');
                            document.getElementById('res-pc-number').value = pcLabel;

                            // Show selected label
                            document.getElementById('pc-selected-label').style.display = 'block';
                            document.getElementById('pc-selected-name').textContent = pcLabel;
                        };
                    }

                    pcGrid.appendChild(btn);
                    pcIndex++;
                }
            }
        }
    }

    /* ══ RESERVATION SUBMIT ══ */
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

        if (!reservationData.pcNumber) {
            Swal.fire('Wait!', 'Please select an available workstation first.', 'warning');
            return;
        }
        if (!reservationData.purpose || !reservationData.lab || !reservationData.timeIn || !reservationData.date) {
            Swal.fire('Wait!', 'Please fill in all the reservation details.', 'warning');
            return;
        }

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
        } catch(error) {
            Swal.fire('Server Error', 'Make sure your server.js is running.', 'error');
        }
    }

    /* ══ ON LOAD ══ */
    document.addEventListener("DOMContentLoaded", async () => {
        const idNumber = localStorage.getItem("loggedInId");
        if (!idNumber) { window.location.href = "login.html"; return; }

        const now = new Date();
        document.getElementById("res-date").value = now.toLocaleDateString('en-CA');
        document.getElementById("res-time").value = now.toTimeString().slice(0, 5);

        try {
            const res = await fetch(`http://localhost:3000/student/${idNumber}`);
            if (res.ok) {
                const user = await res.json();
                document.getElementById("res-id").value       = user.idNumber || "";
                document.getElementById("res-name").value     = `${user.firstName} ${user.lastName}`;
                document.getElementById("res-sessions").value = user.remainingSession ?? 0;
            }
        } catch(err) { console.error("Error fetching student data:", err); }

        // Load PC grid and software for default lab on page open
        onLabChange();
    });

    /* ══ LOGOUT ══ */
    async function logout() {
        const studentId = localStorage.getItem('loggedInId');
        const { isConfirmed } = await Swal.fire({
            title: 'Logout?', text: "This will end your current lab session and log you out.",
            icon: 'warning', showCancelButton: true,
            confirmButtonColor: '#0056b3', confirmButtonText: 'Yes, Logout!'
        });
        if (isConfirmed) {
            try {
                if (studentId) {
                    await fetch("http://localhost:3000/record-final-logout", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ idNumber: studentId })
                    });
                }
                localStorage.removeItem('loggedInId');
                localStorage.removeItem('sessionExpiry');
                sessionStorage.clear();
                await Swal.fire({ icon: 'success', title: 'Logged Out', text: 'Your session has been closed.', timer: 1500, showConfirmButton: false });
                window.location.href = 'login.html';
            } catch(err) {
                localStorage.removeItem('loggedInId');
                window.location.href = 'login.html';
            }
        }
    }