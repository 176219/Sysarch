document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const idNumber = form.idNumber.value.trim();
        const password = form.password.value.trim();

        try {
            const response = await fetch("http://localhost:3000/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idNumber, password })
            });

            const data = await response.json();

            if (response.ok) {
                if (data.role === "admin") {
                    localStorage.setItem("admin", JSON.stringify(data.user));
                    sessionStorage.setItem("adminWelcomeShown", "false");
                    window.location.href = "admin-dashboard.html";
                } else {
                    localStorage.setItem("user", JSON.stringify(data.user));
                    localStorage.setItem("loggedInId", data.user.idNumber);
                    localStorage.setItem("loginTime", Date.now().toString());
                    window.location.href = "dashboard.html";
                }
            } else {
                alert("Error: " + data.error);
            }
        } catch (error) {
            alert("Server not running!");
            console.error(error);
        }
    });

    loadLeaderboardPreview();
});

async function loadLeaderboardPreview() {
    const list = document.getElementById("lbPreviewList");
    try {
        const res  = await fetch("http://localhost:3000/admin/leaderboard");
        const data = await res.json();
        const top5 = data.slice(0, 5);

        if (!top5.length) {
            list.innerHTML = '<div class="lb-loading">No leaderboard data yet.</div>';
            return;
        }

        const trophyHTML = [
            '<i class="fa fa-trophy" style="color:#ffd700;font-size:16px;"></i>',
            '<i class="fa fa-trophy" style="color:#c0c0c0;font-size:16px;"></i>',
            '<i class="fa fa-trophy" style="color:#cd7f32;font-size:16px;"></i>'
        ];
        const rankClasses = ['rank-1', 'rank-2', 'rank-3'];

        list.innerHTML = top5.map((s, i) => {
            const rank      = i + 1;
            const rankBadge = rank <= 3
                ? `<span class="lb-rank-badge ${rankClasses[i]}">${trophyHTML[i]}</span>`
                : `<span class="lb-rank-badge rank-other">#${rank}</span>`;

            return `
                <div class="lb-preview-item ${rank <= 3 ? 'lb-top-' + rank : ''}">
                    ${rankBadge}
                    <div class="lb-info">
                        <span class="lb-name">${s.firstName} ${s.lastName}</span>
                        <span class="lb-course-chip">${s.course || '—'}</span>
                    </div>
                    <div class="lb-stats">
                        <span class="lb-points">${s.points}<span class="lb-points-unit"> PTS</span></span>
                        <span class="lb-sitins">${s.sitins} sit-in${s.sitins !== 1 ? 's' : ''}</span>
                    </div>
                </div>`;
        }).join('');

    } catch {
        list.innerHTML = '<div class="lb-loading">Could not load leaderboard.</div>';
    }
}

function toggleVisibility() {
    const passwordInput = document.getElementById("passwordField");
    const toggleIcon    = document.querySelector(".password-toggle");
    if (passwordInput.type === "password") {
        passwordInput.type    = "text";
        toggleIcon.textContent = "🚫";
    } else {
        passwordInput.type    = "password";
        toggleIcon.textContent = "🧿";
    }
}