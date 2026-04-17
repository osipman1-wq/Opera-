import pool from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-change-in-production';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

function generateUid(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function signToken(uid: string, email: string): string {
  return jwt.sign({ uid, email }, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): { uid: string; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { uid: string; email: string };
  } catch {
    return null;
  }
}

export async function registerUser(email: string, password: string, displayName: string) {
  const existing = await pool.query('SELECT uid FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw new Error('Email already registered.');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const uid = generateUid();
  const result = await pool.query(
    'INSERT INTO users (uid, email, display_name, password_hash, provider) VALUES ($1, $2, $3, $4, $5) RETURNING uid, email, display_name, photo_url',
    [uid, email.toLowerCase(), displayName, passwordHash, 'email']
  );
  return result.rows[0];
}

export async function loginUser(email: string, password: string) {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  if (result.rows.length === 0) {
    throw new Error('Invalid email or password.');
  }
  const user = result.rows[0];
  if (!user.password_hash) {
    throw new Error('This account uses Google Sign-In. Please log in with Google.');
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new Error('Invalid email or password.');
  }
  return { uid: user.uid, email: user.email, display_name: user.display_name, photo_url: user.photo_url };
}

export async function loginWithGoogle(idToken: string) {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google Sign-In is not configured on this server.');
  }
  const client = new OAuth2Client(GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error('Invalid Google token.');
  }

  const existing = await pool.query('SELECT * FROM users WHERE email = $1', [payload.email]);
  if (existing.rows.length > 0) {
    const user = existing.rows[0];
    await pool.query(
      'UPDATE users SET display_name = $1, photo_url = $2 WHERE uid = $3',
      [payload.name || user.display_name, payload.picture || user.photo_url, user.uid]
    );
    return { uid: user.uid, email: user.email, display_name: payload.name || user.display_name, photo_url: payload.picture || user.photo_url };
  }

  const uid = generateUid();
  const result = await pool.query(
    'INSERT INTO users (uid, email, display_name, photo_url, provider) VALUES ($1, $2, $3, $4, $5) RETURNING uid, email, display_name, photo_url',
    [uid, payload.email, payload.name || 'Google User', payload.picture || null, 'google']
  );
  return result.rows[0];
}

export async function getUserByUid(uid: string) {
  const result = await pool.query(
    'SELECT uid, email, display_name, photo_url, provider FROM users WHERE uid = $1',
    [uid]
  );
  return result.rows[0] || null;
}
