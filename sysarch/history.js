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

    let html = '';

    _resNotifs.forEach(n => {
        const isAccepted = n.message.startsWith('✅');
        html += `
            <div onclick="markResNotifRead(${n.id})" style="padding:12px 14px;border-bottom:1px solid #eee;cursor:pointer;
                background:${n.isRead ? 'white' : (isAccepted ? '#eaf7ee' : '#fdf0f0')};">
                <div style="font-size:14px;color:#888;">Reservation Update | ${n.createdAt || ''}</div>
                <div style="font-size:14px;color:${n.isRead ? '#888' : '#222'};margin-top:3px;font-family:'Sora',sans-serif;">${n.message}</div>
            </div>`;
    });

    _announcements.forEach(a => {
        html += `
            <div onclick="markOneRead(${a.id})" style="padding:12px 14px;border-bottom:1px solid #eee;cursor:pointer;
                background:${!readIds.includes(a.id) ? '#eaf3fb' : 'white'}">
                <div style="font-size:14px;color:#888;">${a.createdAt}</div>
                <div style="font-size:14px;color:#222;margin-top:3px;font-family:'Sora',sans-serif;">${a.message}</div>
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


    let allData      = [];
    let filteredData = [];
    let currentPage  = 1;
    let perPage      = 10;
    let sortCol      = null;
    let sortDir      = "asc";

    function formatTime(timeStr) {
        if (!timeStr || timeStr === "null" || timeStr === "---") return "---";
        if (timeStr.includes("AM") || timeStr.includes("PM")) return timeStr; 

        try {
            let [hours, minutes] = timeStr.split(':');
            hours = parseInt(hours);
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; 
            return `${hours}:${minutes.substring(0,2)} ${ampm}`;
        } catch (e) {
            return timeStr;
        }
    }

    async function loadData() {
        const idNumber = localStorage.getItem("loggedInId");
        // Get name from localStorage. If it's missing, defaults to "Student"
        const sessionName = localStorage.getItem("userName") || "Student";

        if (!idNumber) { 
            window.location.href = "login.html"; 
            return; 
        }

        try {
            const res = await fetch(`http://localhost:3000/history/${idNumber}`);
            let rawData = await res.json();
            
            if (!Array.isArray(rawData)) {
                allData = [];
            } else {
                allData = rawData.map(row => {
                    return {
                        ...row,
                        // Fix the name using the session data
                        displayName: sessionName,
                        // Ensure Login and Logout are formatted to AM/PM
                        displayIn: formatTime(row.timeIn || row.login || "---"),
                        displayOut: (row.timeOut && row.timeOut !== "null") ? formatTime(row.timeOut) : "None"
                    };
                });
            }
        } catch(e) {
            allData = [];
            console.error("Failed to load history:", e);
        }

        filteredData = [...allData];
        updateSortIcons();
        render();
    }

    function render() {
        const start = (currentPage - 1) * perPage;
        const end   = Math.min(start + perPage, filteredData.length);
        const slice = filteredData.slice(start, end);
        const tbody = document.getElementById("historyData");
        const total = filteredData.length;

        if (slice.length === 0) {
            tbody.innerHTML = `<tr class="empty-row"><td colspan="8">No records found.</td></tr>`;
            document.getElementById("entryInfo").textContent = "Showing 0 to 0 of 0 entries";
        } else {
            tbody.innerHTML = slice.map(row => {

                const fullName = (row.firstName && row.lastName) 
                    ? `${row.firstName} ${row.lastName}` 
                    : 'Student';

                return `
                    <tr>
                        <td><b style="font-family: 'Sora', sans-serif;">${row.idNumber || 'N/A'}</b></td>
                        <td>${fullName}</td> 
                        <td>${row.purpose || 'N/A'}</td>
                        <td>${row.lab || 'N/A'}</td>
                        <td>${row.displayIn || row.timeIn}</td> 
                        <td>${row.displayOut || row.timeOut || 'None'}</td>
                        <td>${row.date || 'N/A'}</td>
                        <td><button class="feedback-btn" onclick="openFeedbackPopup('${row.idNumber}', '${row.lab}')">Feedback</button></td>
                    </tr>
                `;
            }).join("");
            
            document.getElementById("entryInfo").textContent =
                `Showing ${start + 1} to ${end} of ${total} ${total === 1 ? "entry" : "entries"}`;
        }

        renderPagination();
    }

    let _fbIdNumber = '';
    let _fbLab = '';

    function openFeedbackPopup(idNumber, lab) {
        _fbIdNumber = idNumber;
        _fbLab = lab;
        document.querySelectorAll('#starPicker input[type="radio"]').forEach(r => r.checked = false);
        document.getElementById('fbMessage').value = '';
        document.querySelector('.fb-modal-header span').innerHTML =
            `<i class="fa fa-star"></i> Submit Feedback for ${lab}`;
        document.getElementById('feedbackModal').classList.add('open');
    }

    function closeFeedbackModal() {
        document.getElementById('feedbackModal').classList.remove('open');
    }

    document.getElementById('feedbackModal').addEventListener('click', function(e) {
        if (e.target === this) closeFeedbackModal();
    });

    async function submitFeedbackModal() {
        const ratingEl = document.querySelector('#starPicker input[type="radio"]:checked');
        const message  = document.getElementById('fbMessage').value.trim();

        if (!ratingEl) {
            Swal.fire({ icon: 'warning', title: 'Rating Required', text: 'Please select a star rating before submitting.', confirmButtonColor: '#2c3e70' });
            return;
        }
        if (!message) {
            Swal.fire({ icon: 'warning', title: 'Message Required', text: 'Please write a message before submitting.', confirmButtonColor: '#2c3e70' });
            return;
        }

        closeFeedbackModal();

        try {
            const response = await fetch("http://localhost:3000/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    idNumber: _fbIdNumber,
                    lab:      _fbLab,
                    rating:   parseInt(ratingEl.value),
                    message:  message
                })
            });

            if (response.ok) {
                Swal.fire({ icon: 'success', title: 'Thank You!', text: 'Your feedback has been sent to the admin.', confirmButtonColor: '#28a745' });
            } else {
                throw new Error("Failed to send");
            }
        } catch (err) {
            console.error("Feedback error:", err);
            Swal.fire('Error', 'Could not send feedback. Is the server running?', 'error');
        }
    }

    function renderPagination() {
        const totalPages = Math.ceil(filteredData.length / perPage) || 1;
        const pg = document.getElementById("pagination");
        let html = "";

        html += `<button onclick="goPage(1)" ${currentPage===1?"disabled":""}>«</button>`;
        html += `<button onclick="goPage(${currentPage-1})" ${currentPage===1?"disabled":""}>‹</button>`;

        pageRange(currentPage, totalPages).forEach(p => {
            html += p === "…"
                ? `<button disabled>…</button>`
                : `<button class="${p===currentPage?"active":""}" onclick="goPage(${p})">${p}</button>`;
        });

        html += `<button onclick="goPage(${currentPage+1})" ${currentPage===totalPages?"disabled":""}>›</button>`;
        html += `<button onclick="goPage(${totalPages})" ${currentPage===totalPages?"disabled":""}>»</button>`;
        pg.innerHTML = html;
    }

    function pageRange(cur, total) {
        if (total <= 7) return Array.from({length: total}, (_, i) => i + 1);
        if (cur <= 4)       return [1,2,3,4,5,"…",total];
        if (cur >= total-3) return [1,"…",total-4,total-3,total-2,total-1,total];
        return [1,"…",cur-1,cur,cur+1,"…",total];
    }

    function goPage(p) {
        const totalPages = Math.ceil(filteredData.length / perPage) || 1;
        currentPage = Math.max(1, Math.min(p, totalPages));
        render();
    }

    document.getElementById("tableSearch").addEventListener("input", function() {
        const q = this.value.trim().toLowerCase();
        filteredData = allData.filter(row =>
            Object.values(row).some(v => String(v).toLowerCase().includes(q))
        );
        applySort();
        currentPage = 1;
        render();
    });

    document.getElementById("entryCount").addEventListener("change", function() {
        perPage = parseInt(this.value);
        currentPage = 1;
        render();
    });

    document.querySelectorAll("th[data-col]").forEach(th => {
        th.addEventListener("click", function() {
            const col = this.dataset.col;
            sortDir = (sortCol === col && sortDir === "asc") ? "desc" : "asc";
            sortCol = col;
            applySort();
            updateSortIcons();
            render();
        });
    });

    function applySort() {
        if (!sortCol) return;
        filteredData.sort((a, b) => {
            let va = String(a[sortCol] || "").toLowerCase();
            let vb = String(b[sortCol] || "").toLowerCase();
            return sortDir === "asc"
                ? va.localeCompare(vb, undefined, {numeric: true})
                : vb.localeCompare(va, undefined, {numeric: true});
        });
    }

    function updateSortIcons() {
        ["idNumber","displayName","purpose","lab","displayIn","displayOut","date"].forEach(c => {
            const el = document.getElementById(`sort-${c}`);
            if (!el) return;
            el.className = "sort-icon" + (sortCol === c ? " " + sortDir : "");
        });
    }

    loadData();
    
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