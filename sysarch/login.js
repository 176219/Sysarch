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
                alert(data.message);
                window.location.href = "placeholder.html";
            } else {
                alert("Error: " + data.error);
            }
        } catch (error) {
            alert("Server not running!");
            console.error(error);
        }
    });
});