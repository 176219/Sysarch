document.addEventListener("DOMContentLoaded", async () => {
    const sessionData = localStorage.getItem("user");
    if (!sessionData) return window.location.href = "login.html";

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
                    <td>
                        <button class="feedback-btn"
                            data-id="${item.idNumber}"
                            data-lab="${item.lab}"
                            data-date="${item.date}"
                            onclick="openFeedbackModal(this)">
                            Feedback
                        </button>
                    </td>
                </tr>
            `;
            table.innerHTML += row;
        });

        document.getElementById("entryInfo").textContent = `Showing ${data.length} entries`;
    } catch (err) {
        Swal.fire('Error', 'Failed to load history', 'error');
    }
});

function openFeedbackModal(btn) {
    document.getElementById("fb_idNumber").value = btn.dataset.id;
    document.getElementById("fb_lab").value = btn.dataset.lab;
    document.getElementById("fb_date").value = btn.dataset.date;
    document.getElementById("fb_rating").value = 5;
    document.getElementById("ratingDisplay").textContent = "5";
    document.getElementById("fb_message").value = "";
    document.getElementById("feedbackModal").style.display = "flex";
}

function closeFeedbackModal() {
    document.getElementById("feedbackModal").style.display = "none";
}

async function submitFeedback() {
    const payload = {
        idNumber: document.getElementById("fb_idNumber").value,
        lab:      document.getElementById("fb_lab").value,
        date:     document.getElementById("fb_date").value,
        rating:   parseInt(document.getElementById("fb_rating").value),
        message:  document.getElementById("fb_message").value.trim()
    };

    if (!payload.message) {
        return Swal.fire("Warning", "Please enter a message.", "warning");
    }

    try {
        const res = await fetch("http://localhost:3000/api/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeFeedbackModal();
            Swal.fire("Thank you!", "Your feedback has been submitted.", "success");
        } else {
            Swal.fire("Error", "Failed to submit feedback.", "error");
        }
    } catch (err) {
        Swal.fire("Error", "Could not connect to server.", "error");
    }
}