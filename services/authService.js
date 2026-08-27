const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]), "utf8");
  }
  if (!fs.existsSync(SESSIONS_FILE)) {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify({}), "utf8");
  }
}

function readUsers() {
  ensureStorage();
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading users file:", err);
    return [];
  }
}

function writeUsers(users) {
  ensureStorage();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

function readSessions() {
  ensureStorage();
  try {
    const raw = fs.readFileSync(SESSIONS_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading sessions file:", err);
    return {};
  }
}

function writeSessions(sessions) {
  ensureStorage();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf8");
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}

function validateEmail(email) {
  if (!email || typeof email !== "string") return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim().toLowerCase());
}

async function register({ email, password, name }) {
  if (!email || !password) {
    const err = new Error("Email and password are required");
    err.status = 400;
    throw err;
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!validateEmail(cleanEmail)) {
    const err = new Error("Please enter a valid email address");
    err.status = 400;
    throw err;
  }

  if (password.length < 6) {
    const err = new Error("Password must be at least 6 characters long");
    err.status = 400;
    throw err;
  }

  const users = readUsers();
  const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    const err = new Error("An account with this email already exists");
    err.status = 409;
    throw err;
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const displayName = name && name.trim() ? name.trim() : cleanEmail.split("@")[0];

  const newUser = {
    id: crypto.randomUUID(),
    name: displayName,
    email: cleanEmail,
    salt,
    passwordHash,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeUsers(users);

  const token = crypto.randomBytes(32).toString("hex");
  const sessions = readSessions();
  sessions[token] = {
    userId: newUser.id,
    createdAt: new Date().toISOString()
  };
  writeSessions(sessions);

  return { user: sanitizeUser(newUser), token };
}

async function login({ email, password }) {
  if (!email || !password) {
    const err = new Error("Email and password are required");
    err.status = 400;
    throw err;
  }

  const cleanEmail = email.trim().toLowerCase();
  const users = readUsers();
  const user = users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }

  const checkHash = hashPassword(password, user.salt);
  if (checkHash !== user.passwordHash) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const sessions = readSessions();
  sessions[token] = {
    userId: user.id,
    createdAt: new Date().toISOString()
  };
  writeSessions(sessions);

  return { user: sanitizeUser(user), token };
}

async function getUserByToken(token) {
  if (!token) return null;
  const sessions = readSessions();
  const session = sessions[token];
  if (!session) return null;

  const users = readUsers();
  const user = users.find((u) => u.id === session.userId);
  return sanitizeUser(user);
}

async function logout(token) {
  if (!token) return true;
  const sessions = readSessions();
  if (sessions[token]) {
    delete sessions[token];
    writeSessions(sessions);
  }
  return true;
}

module.exports = {
  register,
  login,
  getUserByToken,
  logout
};
