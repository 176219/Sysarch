const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

const adminAccount = {
    username: "admin",
    password: "admin123"
}

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
    yearLevel TEXT
)
`);




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

        res.json({
            role: "user",
            user: row,
        });
    });
});

app.post("/update-profile", (req, res) => {
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

    
    const sql = `
        UPDATE users
        SET idNumber = ?,
            lastName = ?,
            firstName = ?,
            middleName = ?,
            yearLevel = ?,
            course = ?,
            email = ?,
            address = ?
        WHERE idNumber = ?
    `;

    db.run(
        sql,
        [idNumber, lastName, firstName, middleName, yearLevel, course, email, address, oldIdNumber],
        function (err) {
            if (err) {
                console.error(err.message);
                return res.status(500).json({ error: "Database error" });
            }

            if (this.changes === 0) {
                return res.status(400).json({ error: "No user found with that ID" });
            }

            res.json({ success: true, message: "Profile updated successfully!" });
        }
    );
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});