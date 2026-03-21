document.addEventListener("DOMContentLoaded", () => {
    const sessionData = localStorage.getItem("user");

    if (sessionData) {
        const user = JSON.parse(sessionData);

        document.getElementById("display-name").textContent = user.firstName + " " + user.middleName +" "+ user.lastName;
        document.getElementById("display-email").textContent = user.email;
        document.getElementById("display-address").textContent = user.address;
        document.getElementById("display-course").textContent = user.course;
        document.getElementById("display-yearLevel").textContent = user.yearLevel;

        if(document.getElementById("display-id")) {
            document.getElementById("display-id").textContent = user.idNumber;
        }
    } else {
        window.location.href = "login.html";
    }
});

