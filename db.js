const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false 
  }
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error("=== [PG CONNECT ERROR]: Ошибка подключения к базе ===", err.message);
  }
  console.log("=== [PG CONNECT SUCCESS]: Успешное прямое подключение к Supabase ===");
  release();
});

module.exports = pool;
