function logout(event) {
    if (event) event.preventDefault();

    Swal.fire({
        title: 'Logout?',
        text: "Are you sure you want to end your session?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Logout!'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.clear();
            window.location.href = 'login.html';
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {

    const sessionData = localStorage.getItem("user");

    if (!sessionData) {
        window.location.href = "login.html";
        return;
    }

    const user = JSON.parse(sessionData);

    // ✅ AUTO FILL FORM (NO FETCH NEEDED)
    document.getElementById("res-id").value = user.idNumber;
    document.getElementById("res-name").value =
        `${user.firstName} ${user.lastName}`;
    document.getElementById("res-sessions").value =
        user.sessions || "30";

    // LOCK FIELDS
    document.getElementById("res-id").readOnly = true;
    document.getElementById("res-name").readOnly = true;
    document.getElementById("res-sessions").readOnly = true;

    // SUBMIT
    document.getElementById("reservationForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const reservationData = {
            idNumber: user.idNumber,
            name: `${user.firstName} ${user.lastName}`,
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

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'Reservation submitted!',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = "history.html";
                });
            } else {
                Swal.fire('Failed', 'Submission failed.', 'error');
            }

        } catch (error) {
            Swal.fire('Error', 'Server not running!', 'error');
        }
    });
});