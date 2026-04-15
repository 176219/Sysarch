    function openModal(modalId) { document.getElementById(modalId).style.display = 'flex'; }
    function closeModal(modalId) { document.getElementById(modalId).style.display = 'none'; }

    // --- Search Logic (New Flow) ---
    function openSearchModal() { openModal('searchModal'); document.getElementById('modalSearchInput').focus(); }
    
    async function executeSearch(event) {

        if (event) event.preventDefault();

        const id = document.getElementById('modalSearchInput').value.trim();
        if (!id) return Swal.fire('Error', 'Please enter an ID', 'error');

        try {1
            const res = await fetch(`http://localhost:3000/student/${id}`);
            const data = await res.json();

            if (res.ok) {
                closeModal('searchModal');
                
                const infoBody = document.getElementById('infoBody');
                infoBody.innerHTML = `
                    <p><b>ID Number:</b> ${data.idNumber}</p>
                    <p><b>Name:</b> ${data.firstName} ${data.lastName}</p>
                    <p><b>Course:</b> ${data.course || 'N/A'}</p>
                    <p><b>Email:</b> ${data.email || 'N/A'}</p>
                    <p><b>Year:</b> ${data.yearLevel || 'N/A'}</p>
                    <p><b>Address:</b> ${data.address || 'N/A'}</p>
                    <p><b>Sessions Left:</b> <span class="badge badge-session">${data.remainingSession ?? 30}</span></p>
                `;
                openModal('studentInfoModal');
            } else {
                Swal.fire('Oops!', 'Student not found.', 'warning');
            }
        } catch (e) { Swal.fire('Error', 'Server Error', 'error'); }
    }

    // --- Generic Sit-In Logic (Matches Image) ---
    function openGenericSitInForm() { 
        // Clear previous inputs when opening a blank form
        document.getElementById('genIdNumber').value = "";
        document.getElementById('genFullName').value = "";
        document.getElementById('genLab').value = "524"; // Default value for dropdown
        document.getElementById('genRemaining').value = "";
        openModal('genericSitInModal'); 
    }

    // NEW: Auto-fill function to show Name and Sessions as you type the ID
    async function autoFillStudent() {
        const idInput = document.getElementById('genIdNumber');
        const nameInput = document.getElementById('genFullName');
        const sessionInput = document.getElementById('genRemaining');
        
        const idNumber = idInput.value.trim();

        // LIVE CLEAR: If the user backspaces and the field is empty, clear everything
        if (idNumber === "") {
            nameInput.value = "";
            sessionInput.value = "";
            return;
        }

        try {
            // Fetch from your server.js endpoint
            const res = await fetch(`http://localhost:3000/get-student/${idNumber}`);
            
            if (res.ok) {
                const data = await res.json();
                // LIVE MATCH: If a student is found, display details
                nameInput.value = `${data.firstName} ${data.lastName}`;
                sessionInput.value = data.remainingSession ?? 30;
            } else {
                // LIVE DISAPPEAR: If the ID is partial or wrong, keep fields empty
                nameInput.value = "";
                sessionInput.value = "";
            }
        } catch (e) {
            // We stay silent during live typing to avoid error popups for every keystroke
            console.error("Live search error:", e);
        }
    }

    // Add 'e' as a parameter to handle the event
    async function submitGenericSitIn(e) {
        // 1. Prevent page reload if called from a form or button click
        if (e) e.preventDefault();

        const idInput = document.getElementById('genIdNumber');
        const labInput = document.getElementById('genLab');
        const purposeInput = document.getElementById('genPurpose');

        const payload = {
            idNumber: idInput.value.trim(),
            purpose: purposeInput.value,
            lab: labInput.value 
        };

        if (!payload.idNumber || !payload.lab) {
            return Swal.fire('Warning', 'ID Number and Lab are required.', 'warning');
        }

        try {
            const res = await fetch('http://localhost:3000/sit-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                // 2. Use 'await' so the code pauses while the alert is visible
                await Swal.fire({ 
                    icon: 'success', 
                    title: 'Sit-in recorded!', 
                    confirmButtonText: 'OK',
                    allowOutsideClick: false,
                    allowEscapeKey: false
                });

                closeModal('genericSitInModal');
                
                // 3. Optional: Clear inputs after success
                idInput.value = "";
                
                // 4. Check if fetchSitIns exists before calling to avoid errors
                if (typeof fetchSitIns === "function") {
                    fetchSitIns(); 
                }
                
                // Refresh stats on dashboard
                loadDashboardStats(); 

            } else {
                const txt = await res.text();
                Swal.fire('Error', txt, 'error');
            }
        } catch (err) { 
            console.error("Submission error:", err);
            Swal.fire('Error', 'Connection to server failed.', 'error'); 
        }
    }

        // Fetch feedback from the server
    async function loadFeedback() {
        try {
            // Updated to match the /api/feedback route in your server.js
            const response = await fetch("http://localhost:3000/api/feedback"); 
            const feedback = await response.json();

            const tbody = document.getElementById("feedbackBody");
            if (feedback.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No feedback reports yet.</td></tr>`;
                return;
            }

            tbody.innerHTML = feedback.map(f => `
                <tr>
                    <td><b>${f.idNumber}</b></td>
                    <td>${f.lab}</td>
                    <td>${f.date}</td>
                    <td>${f.message}</td>
                </tr>
            `).join("");

        } catch (err) {
            console.error("Error loading feedback:", err);
        }
    }

        // Live filter for the search box
    function filterFeedback() {
        const input = document.getElementById("feedbackSearch").value.toUpperCase();
        const rows = document.getElementById("feedbackBody").getElementsByTagName("tr");
            
        for (let row of rows) {
            const text = row.innerText.toUpperCase();
            row.style.display = text.includes(input) ? "" : "none";
        }
    }

        // Initialize on page load
    document.addEventListener("DOMContentLoaded", loadFeedback);

    function logout() {
        Swal.fire({
            title: 'Logout Admin?',
            text: "Are you sure you want to end your admin session?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, logout admin!',
            cancelButtonText: 'Stay logged in'
        }).then((result) => {
            if (result.isConfirmed) {
                // Clear admin session data
                sessionStorage.removeItem("adminWelcomeShown");
                window.location.href = "index.html";
            }
        });
    }