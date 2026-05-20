const express = require("express");
const router = express.Router();

const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// =======================
// REGISTER
// =======================

// async function init() {
//   await pool.query(`
//     CREATE TABLE IF NOT EXISTS users (
//       id SERIAL PRIMARY KEY,
//       email VARCHAR(255) UNIQUE NOT NULL,
//       password TEXT NOT NULL,
//       nickname VARCHAR(30) UNIQUE NOT NULL,
//       created_at TIMESTAMP DEFAULT NOW()
//     );
//   `);

//   await pool.query(`
//     CREATE TABLE IF NOT EXISTS scores (
//       id SERIAL PRIMARY KEY,
//       user_id INTEGER UNIQUE REFERENCES users(id),
//       score INTEGER NOT NULL DEFAULT 0
//     );
//   `);

//   console.log("Tables ready");
// }

// init();

router.post("/register", async (req, res) => {
  try {
    const { email, password, nickname } = req.body;

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (email, password, nickname)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      [email, hash, nickname]
    );

    const userId = result.rows[0].id;

    await pool.query(
      `INSERT INTO scores (user_id, score) VALUES ($1, 0)`,
      [userId]
    );

    const token = jwt.sign(
      { id: userId },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Register error" });
  }
});

// =======================
// LOGIN
// =======================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(400).json({ error: "Wrong password" });
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Login error" });
  }
});

module.exports = router;