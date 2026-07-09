const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Позволяет подключаться к Supabase напрямую без локального файла сертификата
  }
});

// Проверка подключения при старте, чтобы сразу видеть ошибки в логах Render
pool.connect((err, client, release) => {
  if (err) {
    return console.error("=== [PG CONNECT ERROR]: Ошибка подключения к базе ===", err.message);
  }
  console.log("=== [PG CONNECT SUCCESS]: Успешное прямое подключение к Supabase ===");
  release();
});

module.exports = pool;
