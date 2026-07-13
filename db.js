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
      error: error.message,
      code: error.code,
    });
  }
});
