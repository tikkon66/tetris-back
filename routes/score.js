const express = require("express");
const router = express.Router();

const pool = require("../db");
const jwt = require("jsonwebtoken");

// =======================
// AUTH MIDDLEWARE
// =======================
function auth(req, res, next) {
    try {
        const header = req.headers.authorization;

        if (!header) {
            return res.status(401).json({ error: "No token" });
        }

        const token = header.split(" ")[1];
        const user = jwt.verify(token, process.env.JWT_SECRET);
        req.user = user;

        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid token" });
    }
}

// =======================
// HELPER FUNCTIONS
// =======================
async function getScore(userId) {
    const result = await pool.query(
        `SELECT score FROM scores WHERE user_id = $1`,
        [userId]
    );
    return result.rows[0]?.score || 0;
}

async function getTable(res) {
    try {
        const scores = await pool.query(`SELECT * FROM scores`);
        console.log(scores.rows);

        const users = await pool.query(`SELECT * FROM users`);
        console.log(users.rows);
    } catch (error) {
        console.log(error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Debug table error" });
        }
    }
}

// =======================
// ROUTES
// =======================

// 1. GET NICKNAME
router.post("/getnick", auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT nickname FROM users WHERE id = $1`,
            [req.user.id]
        );
        const nickname = result.rows[0]?.nickname || "";
        res.json({ nickname });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Get nick error" });
    }
});

// 2. GET SCORE
router.post("/getscore", auth, async (req, res) => {
    try {
        const score = await getScore(req.user.id);
        res.json({ score });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Server error" });
    }
});

// 3. UPDATE SCORE
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
            return res.json({ message: "Record updated" });
        }

        res.json({ message: "Not beaten" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Save error" });
    }
});

// 4. LEADERBOARD
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
        console.log(error);
        res.status(500).json({ error: "Leaderboard error" });
    }
});

// 5. PATCH NICKNAME
router.patch("/nickname", auth, async (req, res) => {
    try {
        await getTable(res);
        const { nickname } = req.body;

        await pool.query(
            `
            UPDATE users
            SET nickname = $1
            WHERE id = $2
            `,
            [nickname, req.user.id]
        );

        res.json({ message: "Nickname updated" });
        await getTable(res);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Nickname error" });
    }
});

// Экспорт роутера должен быть СТРОГО в самом конце файла!
module.exports = router;
