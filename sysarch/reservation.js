document.addEventListener("DOMContentLoaded", async () => {
    const sessionData = localStorage.getItem("user");
    if (!sessionData) return window.location.href = "login.html";

    const user = JSON.parse(sessionData);

    // Auto-fill
    document.getElementById("res-id").value = user.idNumber;
    document.getElementById("res-name").value = `${user.firstName} ${user.lastName}`;
    document.getElementById("res-sessions").value = user.remainingSession || "30";

    // Lock fields
    ["res-id","res-name","res-sessions"].forEach(id => document.getElementById(id).readOnly = true);

    // Submit
    document.getElementById("reservationForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const reservationData = {
            idNumber: user.idNumber,
            purpose: document.getElementById("res-purpose").value,
            lab: document.getElementById("res-lab").value,
            timeIn: document.getElementById("res-time").value,
            date: document.getElementById("res-date").value
        };

        try {
            const response = await fetch("http://localhost:3000/make-reservation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reservationData)
            });

            const result = await response.json();
            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: result.message,
                    timer: 3000,
                    showConfirmButton: false
                }).then(() => window.location.href = "history.html");
            } else {
                Swal.fire('Failed', result.message || 'Submission failed.', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Server not running!', 'error');
        }
    });
});
