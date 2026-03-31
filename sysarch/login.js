document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    console.log("Login JS loaded");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const idNumber = form.idNumber.value;
        const password = form.password.value;

        console.log("Form submitted:", idNumber, password);

        try {
            const response = await fetch("http://localhost:3000/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idNumber, password })
            });

            const data = await response.json();

            if (response.ok) {
                if(data.role === "admin") {
                    localStorage.setItem("admin", JSON.stringify(data.user));
                    sessionStorage.setItem("adminWelcomeShown", "false");
                    window.location.href = "admin-dashboard.html";
                } else {
                    localStorage.setItem("user", JSON.stringify(data.user));
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
});


function toggleVisibility() {
    const passwordInput = document.getElementById("passwordField");
    const toggleIcon = document.querySelector(".password-toggle");

        if (passwordInput.type === "password") {
                passwordInput.type = "text";
                toggleIcon.textContent = "🚫";
        } else {
                passwordInput.type = "password";
                toggleIcon.textContent = "🧿";
        }
    }