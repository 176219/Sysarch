document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.querySelector(".logout");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (event) => {
            event.preventDefault(); // 🚨 THIS STOPS THE INSTANT REDIRECT
            await logout();
        });
    }
});

window.logout = async function () {
    const result = await Swal.fire({
        title: 'Logout?',
        text: "Are you sure you want to end your session?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Logout!'
    });

    if (!result.isConfirmed) return;

    const user = JSON.parse(localStorage.getItem("user"));

    if (user && user.idNumber) {
        try {
            await fetch("http://localhost:3000/logout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    idNumber: user.idNumber
                })
            });
        } catch (err) {
            console.error(err);
        }
    }

    localStorage.clear();
    window.location.href = "login.html";
};