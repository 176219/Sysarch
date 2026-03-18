const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

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
    address TEXT
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
        address
    } = req.body;

    const sql = `
    INSERT INTO users (idNumber, lastName, firstName, middleName, email, password, address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [idNumber, lastName, firstName, middleName, email, password, address], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json({ message: "User registered successfully!" });
    });
});

app.post("/login", (req, res) => {
    const { idNumber, password } = req.body;

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

        
        res.json({ message: "Login successful!" });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});