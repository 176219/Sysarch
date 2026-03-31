document.addEventListener("DOMContentLoaded", () => {
    const userData = localStorage.getItem("user");
    let originalID = "";

    const profileInput = document.getElementById("edit-profileImage");
    const preview = document.getElementById("profilePreview");

    if (!userData || userData === "undefined") {
        window.location.href = "index.html";
        return;
    }

    const user = JSON.parse(userData);
    originalID = user.idNumber;

    // Fill in form fields
    document.getElementById("edit-id").value = user.idNumber || "";
    document.getElementById("edit-lastName").value = user.lastName || "";
    document.getElementById("edit-firstName").value = user.firstName || "";
    document.getElementById("edit-middleName").value = user.middleName || "";
    document.getElementById("edit-yearLevel").value = user.yearLevel || "";
    document.getElementById("edit-course").value = user.course || "";
    document.getElementById("edit-email").value = user.email || "";
    document.getElementById("edit-address").value = user.address || "";

    // Load profile image
    preview.src = user.profileImage
        ? `http://localhost:3000/images/${user.profileImage}`
        : "images/default.png";

    // Preview selected image
    profileInput.addEventListener("change", () => {
        const file = profileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Submit form
    document.getElementById("editProfileForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append("oldIdNumber", originalID);
        formData.append("idNumber", document.getElementById("edit-id").value);
        formData.append("lastName", document.getElementById("edit-lastName").value);
        formData.append("firstName", document.getElementById("edit-firstName").value);
        formData.append("middleName", document.getElementById("edit-middleName").value);
        formData.append("yearLevel", document.getElementById("edit-yearLevel").value);
        formData.append("course", document.getElementById("edit-course").value);
        formData.append("email", document.getElementById("edit-email").value);
        formData.append("address", document.getElementById("edit-address").value);

        if (profileInput.files[0]) {
            formData.append("profileImage", profileInput.files[0]);
        }

        try {
            const response = await fetch("http://localhost:3000/update-profile", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                // update localStorage
                user.idNumber = document.getElementById("edit-id").value;
                user.lastName = document.getElementById("edit-lastName").value;
                user.firstName = document.getElementById("edit-firstName").value;
                user.middleName = document.getElementById("edit-middleName").value;
                user.yearLevel = document.getElementById("edit-yearLevel").value;
                user.course = document.getElementById("edit-course").value;
                user.email = document.getElementById("edit-email").value;
                user.address = document.getElementById("edit-address").value;
                if (data.image) user.profileImage = data.image;

                localStorage.setItem("user", JSON.stringify(user));

                alert("Profile updated successfully!");
                window.location.href = "dashboard.html";
            } else {
                alert(data.error || "Update failed!");
            }
        } catch (error) {
            console.error(error);
            alert("Connection error! Is your server running?");
        }
    });
});