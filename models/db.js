import pkg from "pg";
const { Pool } = pkg;
import crypto from "crypto";

export const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
  port: 5432,
});


// PIN ハッシュ
export function hashPin(pin) {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

// テーブル初期化
export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        pin TEXT NOT NULL,
        is_staff BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        category TEXT,
        name TEXT,
        total_qty INTEGER DEFAULT 1,
        note TEXT
      );

      CREATE TABLE IF NOT EXISTS lenders (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS loans (
        id SERIAL PRIMARY KEY,
        item_id INTEGER REFERENCES items(id),
        lender_id INTEGER REFERENCES lenders(id),
        qty INTEGER NOT NULL,
        room TEXT NOT NULL,
        staff_id INTEGER REFERENCES users(id),
        borrowed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        returned_at TIMESTAMP
      );
    `);
  } finally {
    client.release();
  }
}
