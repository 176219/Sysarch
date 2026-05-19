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
                <div style="font-size:11px; color:#888;">${a.author} | ${a.date}</div>
                <div style="font-size:13px; color:#222; margin-top:3px;">${a.content}</div>
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
                <div style="font-size:14px;color:#888;">${a.author} | ${a.date}</div>
                <div style="font-size:14px;color:#222;margin-top:3px;font-family:'Sora',sans-serif;">${a.content}</div>
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

async function loadAnnouncements() {
    try {
        const res = await fetch('http://localhost:3000/announcements');
        const announcements = await res.json();
        const list = document.getElementById('announcementList');

        if (announcements.length === 0) {
            list.innerHTML = '<p style="color:#aaa; text-align:center;">No announcements yet.</p>';
            return;
        }

        list.innerHTML = announcements.map(a => `
            <div class="announcement-item">
                <medium style="color: #4e73df; font-weight: bold; font-family: 'Sora', sans-serif;">${a.author} | ${a.date}</medium>
                <p style="margin-top: 15px; font-family: 'Sora', sans-serif;">${a.content}</p>
            </div>
        `).join('');
    } catch (err) {
        console.error('Failed to load announcements:', err);
    }
}


document.addEventListener("DOMContentLoaded", async () => {

    const idNumber = localStorage.getItem("loggedInId");

        if (!idNumber) {
            window.location.href = "login.html";
            return;
        }

    try {
        const res = await fetch(`http://localhost:3000/student/${idNumber}`);
        const user = await res.json();

        console.log(user);

        if (!res.ok) {
            window.location.href = "login.html";
            return;
        }

         loadAnnouncements();


// ✅ LOGIN POPUP & RECORD HISTORY

        const profileUpdated = sessionStorage.getItem("profileUpdated");
        if (profileUpdated) {
            sessionStorage.removeItem("profileUpdated");

            Swal.fire({
                icon: 'success',
                title: 'Profile Updated!',
                text: 'Your changes have been saved successfully.',
                confirmButtonColor: '#0056b3',
                showConfirmButton: true,
                allowOutsideClick: false,
                allowEscapeKey: false
            });
        }

        document.getElementById("display-id").textContent = user.idNumber;
        document.getElementById("display-name").textContent = 
            `${user.firstName} ${user.middleName} ${user.lastName}`;
        document.getElementById("display-course").textContent = user.course;
        document.getElementById("display-email").textContent = user.email;
        document.getElementById("display-yearLevel").textContent = user.yearLevel;
        document.getElementById("display-address").textContent = user.address;
        
        const sessionDisplay = document.getElementById("display-session");

        if (sessionDisplay) {
            const totalSession = user.remainingSession || 0;

            sessionDisplay.textContent = `${totalSession} Sessions`;

            if (totalSession === 0) {
                sessionDisplay.style.color = "red";
                sessionDisplay.textContent = "No Sessions";
            }
        }
        
        if(document.getElementById("display-sessions")){
            document.getElementById("display-sessions").textContent = user.remainingSession;
        }

        if (user.profilePhoto) {
            document.getElementById("profilePhoto").src = user.profilePhoto;
            document.getElementById("profilePhoto").style.display = "block";
            document.getElementById("noPhotoPlaceholder").style.display = "none";
        }

    } catch (err) {
        console.error(err);
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