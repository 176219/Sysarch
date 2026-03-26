document.addEventListener("DOMContentLoaded", () => {
    const sessionData = localStorage.getItem("user");

    // 🔒 Redirect if not logged in
    if (!sessionData) {
        window.location.href = "login.html";
        return;
    }

    const user = JSON.parse(sessionData);

    // 👤 Display user info
    document.getElementById("display-name").textContent =
        user.firstName + " " + user.middleName + " " + user.lastName;
    document.getElementById("display-email").textContent = user.email;
    document.getElementById("display-address").textContent = user.address;
    document.getElementById("display-course").textContent = user.course;
    document.getElementById("display-yearLevel").textContent = user.yearLevel;
    document.getElementById("display-id").textContent = user.idNumber;

    // 🎉 SHOW WELCOME ONLY AFTER LOGIN
    if (localStorage.getItem("justLoggedIn") === "true") {
        Swal.fire({
            icon: 'success',
            title: `Welcome, ${user.firstName}! 👋`,
            timer: 1500,
            showConfirmButton: false
        });

        localStorage.removeItem("justLoggedIn");
    }

    // 🧹 Reset alert flags ONLY on fresh login
    if (!localStorage.getItem("loginTime")) {
        localStorage.setItem("loginTime", Date.now().toString());
        localStorage.removeItem("alertShown");
        localStorage.removeItem("warningShown");
        localStorage.removeItem("expiredShown");
    }

    const timerEl = document.getElementById("session-timer");
    const wrapperEl = document.getElementById("session-timer-wrapper");
    const statusEl = document.getElementById("timer-status");

    function updateTimer() {
        const loginTime = parseInt(localStorage.getItem("loginTime"), 10);
        if (!loginTime) return;

        const elapsed = Math.floor((Date.now() - loginTime) / 1000);

        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;

        timerEl.textContent =
            String(hours).padStart(2, "0") + ":" +
            String(minutes).padStart(2, "0") + ":" +
            String(seconds).padStart(2, "0");

        // 🚨 SESSION EXPIRED (1 hour)
        if (elapsed >= 3600) {
            wrapperEl.className = "session-timer-wrapper timer-danger";
            statusEl.textContent = "Session expired!";

            if (!localStorage.getItem("expiredShown")) {
                localStorage.setItem("expiredShown", "true");

                Swal.fire({
                    icon: 'error',
                    title: 'Session Expired',
                    text: 'You exceeded 1 hour session.',
                    confirmButtonText: 'Logout'
                }).then(() => {
                    logout();
                });
            }
        }

        // ⚠️ WARNING (45 minutes)
        else if (elapsed >= 2700) {
            wrapperEl.className = "session-timer-wrapper timer-warning";

            const remaining = 3600 - elapsed;
            const remMin = Math.floor(remaining / 60);
            const remSec = remaining % 60;

            statusEl.textContent =
                `${String(remMin).padStart(2,"0")}:${String(remSec).padStart(2,"0")} remaining`;

            if (!localStorage.getItem("warningShown")) {
                localStorage.setItem("warningShown", "true");

                Swal.fire({
                    icon: 'warning',
                    title: 'Session Warning',
                    text: 'Only 15 minutes remaining!',
                    timer: 2500,
                    showConfirmButton: false
                });
            }
        }

        // ✅ NORMAL
        else {
            wrapperEl.className = "session-timer-wrapper timer-normal";
            statusEl.textContent = "Session active";
        }
    }

    // ▶️ Start timer
    updateTimer();
    setInterval(updateTimer, 1000);
});


// 🔴 GLOBAL LOGOUT FUNCTION
function logout(event) {
    if (event) event.preventDefault(); // prevent instant redirect

    Swal.fire({
        title: 'Are you sure?',
        text: "You will be logged out.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#dd3333',
        confirmButtonText: 'Yes, logout'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.clear();
            window.location.href = "login.html";
        }
    });
}