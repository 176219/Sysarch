const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use("/images", express.static("images"));

const adminAccount = {
    username: "admin",
    password: "admin123"
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "images/"); // make sure this folder exists
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

const db = new sqlite3.Database("users.db", (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log("Connected to SQLite database.");
    }
});

db.run(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    idNumber TEXT,
    lastName TEXT,
    firstName TEXT,
    middleName TEXT,
    email TEXT,
    password TEXT,
    address TEXT,
    course TEXT,
    yearLevel TEXT,
    profileImage TEXT,
    remainingSession INTEGER DEFAULT 30
)
`);

db.run(`CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    idNumber TEXT,
    purpose TEXT,
    lab TEXT,
    timeIn TEXT,
    timeOut TEXT,
    date TEXT
)`);

db.run(`
CREATE TABLE IF NOT EXISTS login_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    idNumber TEXT,
    loginTime TEXT,
    logoutTime TEXT
)
`);



//           ROUTES                   //



// register route

app.post("/register", (req, res) => {
    console.log("DATA RECEIVED", req.body);
    const {
        idNumber,
        lastName,
        firstName,
        middleName,
        email,
        password,
        address,
        course,
        yearLevel
    } = req.body;

    const sql = `
    INSERT INTO users (idNumber, lastName, firstName, middleName, email, password, address, course, yearLevel)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [idNumber, lastName, firstName, middleName, email, password, address, course, yearLevel], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json({ message: "User registered successfully!" });
    });
});


//login route

app.post("/login", (req, res) => {
    const { idNumber, password } = req.body;

    if(idNumber === adminAccount.username) {
        if(password !== adminAccount.password) {
            return res.status(400).json({ error: "Incorrect password" })
        }

        return res.json({
            role: "admin",
            user: adminAccount
        });
    }
    const sql = `SELECT * FROM users WHERE idNumber = ?`;
    db.get(sql, [idNumber], (err, row) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: "Database error" });
        }

        if (!row) {
            return res.status(400).json({ error: "ID Number not found" });
        }

   
        if (row.password !== password) {
            return res.status(400).json({ error: "Incorrect password" });
        }
        const now = new Date().toISOString();
        db.run(`
            INSERT INTO login_history (idNumber, loginTime)
            VALUES (?, ?)
        `, [idNumber, now]);
        res.json({
            role: "user",
            user: row,
        });
    });
});

//LOGOUT

app.post("/logout", (req, res) =>{
    const { idNumber } = req.body;
    const now = new Date().toISOString();
    const sql = `UPDATE login_history SET logoutTime = ? WHERE idNumber = ? AND logoutTime IS NULL ORDER BY id DESC LIMIT 1`;
    db.run(sql, [now, idNumber], function(err){
        if(err) return res.status(500).json({ error: err.message });
        res.json({ message: "logout recorded "})
    })
})

//update profile route
// update profile route (with image upload)
app.post("/update-profile", upload.single("profileImage"), (req, res) => {
    const {
        oldIdNumber,
        idNumber,
        lastName,
        firstName,
        middleName,
        yearLevel,
        course,
        email,
        address
    } = req.body;

    if (!oldIdNumber) {
        return res.status(400).json({ error: "oldIdNumber is required" });
    }

    const profileImage = req.file ? req.file.filename : null;

    const sql = `
        UPDATE users
        SET idNumber = ?,
            lastName = ?,
            firstName = ?,
            middleName = ?,
            yearLevel = ?,
            course = ?,
            email = ?,
            address = ?,
            profileImage = COALESCE(?, profileImage)
        WHERE idNumber = ?
    `;

    db.run(
        sql,
        [idNumber, lastName, firstName, middleName, yearLevel, course, email, address, profileImage, oldIdNumber],
        function (err) {
            if (err) {
                console.error(err.message);
                return res.status(500).json({ error: "Database error" });
            }

            if (this.changes === 0) {
                return res.status(400).json({ error: "No user found with that ID" });
            }

            res.json({ 
                success: true, 
                image: profileImage, 
                message: "Profile updated successfully!" 
            });
        }
    );
});

app.post("/make-reservation", (req, res) => {
    const { idNumber, purpose, lab, timeIn, date } = req.body;

    db.get(`SELECT remainingSession FROM users WHERE idNumber = ?`, [idNumber], (err, user) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (!user) return res.status(404).json({ message: "Student ID not found!" });
        if (user.remainingSession <= 0) return res.status(400).json({ message: "No sessions left!" });

        // 2. Insert the reservation
        const sql = `INSERT INTO reservations (idNumber, purpose, lab, timeIn, date) VALUES (?, ?, ?, ?, ?)`;
        db.run(sql, [idNumber, purpose, lab, timeIn, date], function(err) {
            if (err) return res.status(500).json({ message: err.message });

            db.run(`UPDATE users SET remainingSession = remainingSession - 1 WHERE idNumber = ?`, [idNumber], (err) => {
                if (err) return res.status(500).json({ message: "Failed to deduct session" });
                res.json({ message: "Reservation successful!" });
            });
        });
    });
});

app.get("/history/:idNumber", (req, res) => {
    const idNumber = req.params.idNumber;
    db.all(`
        SELECT r.idNumber, 
               u.firstName || ' ' || u.lastName AS name, 
               r.purpose, 
               r.lab, 
               r.timeIn, 
               r.timeOut, 
               r.date,
               (SELECT logoutTime 
                FROM login_history lh 
                WHERE lh.idNumber = r.idNumber AND lh.loginTime <= r.timeIn 
                ORDER BY lh.loginTime DESC LIMIT 1
               ) AS logoutTime
        FROM reservations r 
        JOIN users u ON r.idNumber = u.idNumber
        WHERE r.idNumber = ? 
        ORDER BY r.date DESC, r.timeIn DESC
    `, [idNumber], (err, rows) => {
        if(err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get("/admin/students", (req, res) => {
    db.all(`SELECT idNumber, firstName, lastName, course, yearLevel, remainingSession FROM users WHERE idNumber != 'Admin' ORDER BY lastName ASC`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get(["/student/:idNumber", "/get-student/:idNumber"], (req, res) => {
    const sql = `
        SELECT 
            idNumber, 
            firstName, 
            lastName, 
            middleName, 
            course, 
            yearLevel, 
            email, 
            address, 
            remainingSession, 
            profileImage
        FROM users 
        WHERE idNumber = ?
    `;
    
    db.get(sql, [req.params.idNumber], (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!user) {
            return res.status(404).json({ message: "Student not found." });
        }
        res.json(user);
    });
});

app.get("/get-sitin", (req, res) => {
    const sql = `
        SELECT r.id as sitInId, r.idNumber, u.firstName, u.lastName, 
               r.purpose, r.lab, r.timeIn, r.timeOut, r.date,
               u.remainingSession
        FROM reservations r
        JOIN users u ON r.idNumber = u.idNumber
        ORDER BY r.date DESC, r.timeIn DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST a new sit-in
app.post("/sit-in", (req, res) => {
    const { idNumber, purpose, lab } = req.body;
    const timeIn = new Date().toLocaleTimeString();
    const date = new Date().toLocaleDateString();

    db.get(`SELECT remainingSession FROM users WHERE idNumber = ?`, [idNumber], (err, user) => {
        if (err) return res.status(500).send("Database error");
        if (!user) return res.status(404).send("Student not found");
        if (user.remainingSession <= 0) return res.status(400).send("No sessions left!");

        db.run(
            `INSERT INTO reservations (idNumber, purpose, lab, timeIn, date) VALUES (?, ?, ?, ?, ?)`,
            [idNumber, purpose, lab, timeIn, date],
            function(err) {
                if (err) return res.status(500).send(err.message);
                db.run(`UPDATE users SET remainingSession = remainingSession - 1 WHERE idNumber = ?`, [idNumber]);
                res.json({ message: "Sit-in recorded!" });
            }
        );
    });
});


app.post("/time-out", (req, res) => {
    const { idNumber, sitInId } = req.body;
    const timeOut = new Date().toLocaleTimeString();

    db.run(
        `UPDATE reservations SET timeOut = ? WHERE id = ? AND idNumber = ?`,
        [timeOut, sitInId, idNumber],
        function(err) {
            if (err) return res.status(500).send(err.message);
            res.json({ message: "Timed out successfully" });
        }
    );
});

app.delete("/delete-student/:idNumber", (req, res) => {
    db.run(`DELETE FROM users WHERE idNumber = ?`, [req.params.idNumber], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Student deleted" });
    });
});

app.post("/reset-sessions", (req, res) => {
    db.run(`UPDATE users SET remainingSession = 30`, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Sessions reset" });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});