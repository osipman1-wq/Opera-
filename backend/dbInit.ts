import pool from './db.js';

const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    password_hash TEXT,
    photo_url TEXT,
    provider TEXT DEFAULT 'email',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS articles (
    id SERIAL PRIMARY KEY,
    user_uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    title TEXT,
    topic TEXT,
    category TEXT,
    content TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS ebooks (
    id SERIAL PRIMARY KEY,
    user_uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    title TEXT,
    author_name TEXT,
    publisher TEXT,
    type TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
];

export async function initDatabase() {
  console.log('[DB] Initializing database tables...');
  try {
    for (const sql of TABLES) {
      await pool.query(sql);
    }
    console.log('[DB] All tables created/verified successfully.');
  } catch (err: any) {
    console.error('[DB] Failed to initialize tables:', err.message);
    throw err;
  }
}
