document.addEventListener("DOMContentLoaded", () => {
    const userData = localStorage.getItem("user");
    let originalID = ""; 

    if (userData && userData !== "undefined") {
        try {
            const user = JSON.parse(userData);
            originalID = user.idNumber; 


            document.getElementById("edit-id").value = originalID || "";
            document.getElementById("edit-lastName").value = user.lastName || "";
            document.getElementById("edit-firstName").value = user.firstName || "";
            document.getElementById("edit-middleName").value = user.middleName || "";
            document.getElementById("edit-yearLevel").value = user.yearLevel || "";
            document.getElementById("edit-course").value = user.course || "";
            document.getElementById("edit-email").value = user.email || "";
            document.getElementById("edit-address").value = user.address || "";
        } catch (error) {
            console.error("Error parsing user data:", error);
        }
    } else {
        window.location.href = "index.html"; 
    }

    document.getElementById("editProfileForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const updatedUser = {
            oldIdNumber: originalID,
            idNumber: document.getElementById("edit-id").value,
            lastName: document.getElementById("edit-lastName").value,
            firstName: document.getElementById("edit-firstName").value,
            middleName: document.getElementById("edit-middleName").value,
            yearLevel: document.getElementById("edit-yearLevel").value,
            course: document.getElementById("edit-course").value,
            email: document.getElementById("edit-email").value,
            address: document.getElementById("edit-address").value
        };

        try {
            const response = await fetch("http://localhost:3000/update-profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedUser)
            });

            if (response.ok) {
  
                localStorage.setItem("user", JSON.stringify(updatedUser));
                alert("Profile and ID updated successfully!");
                window.location.href = "dashboard.html";
            } else {
                alert("Update failed. Check if the new ID already exists.");
            }
        } catch (error) {
            alert("Connection error! Is your 'node server.js' running?");
        }
    });
});