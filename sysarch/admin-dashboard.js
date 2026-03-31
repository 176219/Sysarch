window.onload = function() {

    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    fetchSitIns();
}

function closeModalOnOutsideClick(event, modalId) {
    const modal = document.getElementById(modalId);
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

function openSearchModal() {
    document.getElementById('searchModal').style.display = 'flex';
    document.getElementById('modalSearchInput').focus();
}

function closeSearchModal() {
    document.getElementById('searchModal').style.display = 'none';
}

function openSitInModal() {
    document.getElementById('sitInModal').style.display = 'flex';
}

function closeSitInModal() {
    document.getElementById('sitInModal').style.display = 'none';
}

async function executeSearch() {
    const id = document.getElementById('modalSearchInput').value.trim();
    if (!id) return Swal.fire('Error', 'Please enter an ID', 'error');

    try {
        const res = await fetch(`http://localhost:3000/get-student/${id}`);
        const data = await res.json();

        if (res.ok) {
            document.getElementById('sitIdNumber').value = data.idNumber;

            const fullName = `${data.firstName || data.firstname || ''} ${data.lastName || data.lastname || ''}`.trim();
            document.getElementById('sitStudentName').value = fullName || "N/A";

            document.getElementById('sitRemaining').value = data.remainingSession || 30;

            closeSearchModal();
            document.getElementById('sitInModal').style.display = 'flex';
        } else {
            Swal.fire('Oops!', 'Student not found in database.', 'warning');
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Connection Error', 'Is your server running?', 'error');
    }
}

async function submitSitIn() {
    const payload = {
        idNumber: document.getElementById('sitIdNumber').value,
        purpose: document.getElementById('sitPurpose').value,
        lab: document.getElementById('sitLab').value
    };

    if (!payload.lab) {
        return Swal.fire('Warning', 'Please assign a Lab Room', 'warning');
    }

    try {
        const res = await fetch('http://localhost:3000/sit-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            Swal.fire('Success', 'Student is now sitting-in!', 'success');
            closeSitInModal();

            const count = document.getElementById('currentSitIn');
            count.innerText = parseInt(count.innerText) + 1;
        } else {
            const err = await res.text();
            Swal.fire('Error', err || 'Failed to submit sit-in', 'error');
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'Could not process sit-in.', 'error');
    }
}

window.onload = function() {
    const hasShownWelcome = sessionStorage.getItem("adminWelcomeShown");

    if (hasShownWelcome === "false") {
        Swal.fire({
            title: 'Welcome back, Admin!',
            text: 'You have successfully logged into the CCS Monitoring System.',
            icon: 'success',
            confirmButtonColor: '#0056b3',

        });

        sessionStorage.setItem("adminWelcomeShown", "true");
    }
};

function logout() {
    Swal.fire({
        title: 'Are you sure?',
        text: "You will be logged out.",
        icon: 'warning',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#dd3333',
        showCancelButton: true,
        confirmButtonText: 'Yes, logout'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = "login.html";
        }
    });
}


//chart//
const ctx = document.getElementById('statsChart').getContext('2d');
new Chart(ctx, {
    type: 'doughnut',
    data: {
        labels: ['BSIT', 'BSCS', 'BSIS'],
        datasets: [{
            data: [65, 25, 10],
            backgroundColor: ['#0056b3', '#ffc107', '#28a745']
        }]
    },
    options: {
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' }
        }
    }
});