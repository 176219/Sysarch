document.addEventListener("DOMContentLoaded", () => {
    const sessionData = localStorage.getItem("user");

    if (sessionData) {
        const user = JSON.parse(sessionData);

        document.getElementById("display-name").textContent = user.firstName + " " + user.middleName +" "+ user.lastName;
        document.getElementById("display-email").textContent = user.email;
        document.getElementById("display-address").textContent = user.address;
        document.getElementById("display-course").textContent = user.course;
        document.getElementById("display-yearLevel").textContent = user.yearLevel;

        if(document.getElementById("display-id")) {
            document.getElementById("display-id").textContent = user.idNumber;
        }
           if (!localStorage.getItem("loginTime")) {
            localStorage.setItem("loginTime", Date.now().toString());
        }

        const timerEl   = document.getElementById("session-timer");
        const wrapperEl = document.getElementById("session-timer-wrapper");
        const statusEl  = document.getElementById("timer-status");

        function updateTimer() {
            const loginTime = parseInt(localStorage.getItem("loginTime"), 10);
            if (!loginTime || !timerEl) return;

            const elapsed = Math.floor((Date.now() - loginTime) / 1000);
            const hours   = Math.floor(elapsed / 3600);
            const minutes = Math.floor((elapsed % 3600) / 60);
            const seconds = elapsed % 60;

            timerEl.textContent =
                String(hours).padStart(2, "0") + ":" +
                String(minutes).padStart(2, "0") + ":" +
                String(seconds).padStart(2, "0");

            if (elapsed >= 3600) {
                wrapperEl.className = "session-timer-wrapper timer-danger";
                statusEl.textContent = "⚠️ Session limit exceeded!";
            } else if (elapsed >= 2700) {
                wrapperEl.className = "session-timer-wrapper timer-warning";
                const remaining = 3600 - elapsed;
                const remMin = Math.floor(remaining / 60);
                const remSec = remaining % 60;
                statusEl.textContent =
                    `⚡ ${String(remMin).padStart(2,"0")}:${String(remSec).padStart(2,"0")} remaining`;
            } else {
                wrapperEl.className = "session-timer-wrapper timer-normal";
                statusEl.textContent = "Session active";
            }
        }

        updateTimer();
        setInterval(updateTimer, 1000);

       
        const logoutBtn = document.getElementById("logout-btn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                localStorage.removeItem("loginTime");
                localStorage.removeItem("user");
            });
        }

    } else {
        window.location.href = "login.html";
    }
});

