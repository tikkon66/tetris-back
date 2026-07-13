const express = require("express");
const router = express.Router();

const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nickname VARCHAR(30) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS scores (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        score INTEGER NOT NULL DEFAULT 0
      );
    `);

    console.log("=== [DATABASE]: Таблицы 'users' и 'scores' проверены и готовы ===");
  } catch (error) {
    console.error("=== [DATABASE ERROR]: Ошибка инициализации таблиц ===");
    console.error(error);
  }
}

router.get("/leaderboard", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        users.nickname,
        users.created_at,
        scores.score
      FROM scores
      JOIN users ON users.id = scores.user_id
      ORDER BY scores.score DESC
      LIMIT 100
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("=== LEADERBOARD ERROR ===");
    console.error(error);
    console.error(error.stack);

    res.status(500).json({
      message: error.message,
      code: error.code,
    });
  }
});
console.log("DATABASE_URL:", process.env.DATABASE_URL?.replace(/:(.*?)@/, ":***@"));
initDatabase();

function auth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

async function getScore(userId) {
  const result = await pool.query(
    `SELECT score FROM scores WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0]?.score || 0;
}

router.post("/register", async (req, res) => {
  try {
    const { email, password, nickname } = req.body;
    if (!email || !password || !nickname) {
      return res.status(400).json({ error: "Missing fields" });
    }

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
      `INSERT INTO scores (user_id, score) VALUES ($1, 0) ON CONFLICT DO NOTHING`,
      [userId]
    );

    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token });

  } catch (error) {
    console.error(error);
    if (error.code === "23505") { 
      return res.status(400).json({ error: "Email or Nickname already exists" });
    }
    res.status(500).json({ error: "Register error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: "Wrong password" });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Login error" });
  }
});

router.post("/getnick", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT nickname FROM users WHERE id = $1`,
      [req.user.id]
    );
    const nickname = result.rows[0]?.nickname || "Player";
    res.json({ nickname });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Get nick error" });
  }
});

router.post("/getscore", auth, async (req, res) => {
  try {
    const score = await getScore(req.user.id);
    res.json({ score });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/updatescore", auth, async (req, res) => {
  try {
    const { score } = req.body;
    const userId = req.user.id;

    const oldScore = await getScore(userId);

    if (score > oldScore) {
      await pool.query(
        `
        UPDATE scores
        SET score = $1
        WHERE user_id = $2
        `,
        [score, userId]
      );
      return res.json({ message: "Record updated", updated: true });
    }

    res.json({ message: "Not beaten", updated: false });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Save error" });
  }
});

router.get("/leaderboard", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        users.nickname,
        users.created_at,
        scores.score
      FROM scores
      JOIN users ON users.id = scores.user_id
      ORDER BY scores.score DESC
      LIMIT 100
    `);

    res.json(result.rows || []);
  } catch (error) {
    console.error("Leaderboard DB Error: ", error);
    res.status(500).json({ error: "Leaderboard error" });
  }
});

router.patch("/nickname", auth, async (req, res) => {
  try {
    const { nickname } = req.body;
    if (!nickname || nickname.length > 30) {
      return res.status(400).json({ error: "Invalid nickname" });
    }

    await pool.query(
      `
      UPDATE users
      SET nickname = $1
      WHERE id = $2
      `,
      [nickname, req.user.id]
    );

    res.json({ message: "Nickname updated" });
  } catch (error) {
    console.error(error);
    if (error.code === "23505") {
      return res.status(400).json({ error: "Nickname already taken" });
    }
    res.status(500).json({ error: "Nickname error" });
  }
});

module.exports = router;
