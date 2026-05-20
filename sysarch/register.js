
function togglePass(id) {
    const input = document.getElementById(id);
    const icon = input.nextElementSibling;

    if (input.type === "password") {
        input.type = "text";
        icon.textContent = "🚫";
    } else {
        input.type = "password";
        icon.textContent = "🧿";
    }
}


document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("registerForm");

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const password = form.password.value;
        const confirmPassword = form.confirmPassword.value;

        
        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

       
        const userData = {
            idNumber: form.idNumber.value.trim(),
            lastName: form.lastName.value.trim(),
            firstName: form.firstName.value.trim(),
            middleName: form.middleName.value.trim(),
            email: form.email.value.trim(),
            password: password,
            address: form.address.value.trim(),
            course: form.course.value.trim(),
            yearLevel: form.yearLevel.value.trim()
        };

        try {
            const response = await fetch("http://localhost:3000/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message);
                window.location.href = "login.html";
            } else {
                alert("Error: " + data.error);
            }
        } catch (error) {
            alert("Server not running!");
            console.error(error);
        }
    });
});