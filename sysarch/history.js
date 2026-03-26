function logout(event) {
    if (event) event.preventDefault();

    Swal.fire({
        title: 'Logout?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.clear();
            window.location.href = "login.html";
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

    try {
        const res = await fetch(`http://localhost:3000/history/${user.idNumber}`);
        const data = await res.json();

        const table = document.getElementById("historyData");
        table.innerHTML = "";

        data.forEach(item => {
            const row = `
                <tr>
                    <td>${item.idNumber}</td>
                    <td>${item.name}</td>
                    <td>${item.purpose}</td>
                    <td>${item.lab}</td>
                    <td>${item.timeIn}</td>
                    <td>${item.timeOut || "-"}</td>
                    <td>${item.date}</td>
                    <td><button class="feedback-btn">Feedback</button></td>
                </tr>
            `;
            table.innerHTML += row;
        });

        document.getElementById("entryInfo").textContent =
            `Showing ${data.length} entries`;

    } catch (err) {
        Swal.fire('Error', 'Failed to load history', 'error');
    }
});