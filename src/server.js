require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
  })
);
app.use(express.json());

const INITIAL_PASSWORD = process.env.INITIAL_PASSWORD || "Password123!";
const INITIAL_USER = {
  id: 1,
  email: "demo@example.com",
  displayName: "Demo User",
  bio: "Default bio cho người dùng demo.",
  role: "user",
};

const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "mass_assignment_demo",
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
};

let pool;

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const ensureDatabase = async () => {
  const { database, ...connectionConfig } = DB_CONFIG;
  const adminConnection = await mysql.createConnection(connectionConfig);
  await adminConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
  await adminConnection.end();
};

const ensureUsersTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      email VARCHAR(255) NOT NULL UNIQUE,
      displayName VARCHAR(100) NOT NULL,
      bio TEXT NOT NULL,
      passwordHash VARCHAR(255) NOT NULL,
      role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
};

const ensurePasswordColumn = async () => {
  const [columns] = await pool.query(
    "SHOW COLUMNS FROM users LIKE 'passwordHash'"
  );
  if (!columns.length) {
    await pool.query(
      "ALTER TABLE users ADD COLUMN passwordHash VARCHAR(255) NOT NULL AFTER bio"
    );
  }
  const [needsUpdate] = await pool.query(
    "SELECT COUNT(*) AS total FROM users WHERE passwordHash = '' OR passwordHash IS NULL"
  );
  if (needsUpdate[0].total > 0) {
    const passwordHash = await bcrypt.hash(INITIAL_PASSWORD, 10);
    await pool.query(
      "UPDATE users SET passwordHash = ? WHERE passwordHash = '' OR passwordHash IS NULL",
      [passwordHash]
    );
  }
};

const seedUser = async () => {
  const [rows] = await pool.query("SELECT COUNT(*) AS total FROM users");
  if (rows[0].total === 0) {
    const passwordHash = await bcrypt.hash(INITIAL_PASSWORD, 10);
    await pool.query("INSERT INTO users SET ?", [
      { ...INITIAL_USER, passwordHash },
    ]);
  }
};

const initDatabaseLayer = async () => {
  await ensureDatabase();
  pool = mysql.createPool(DB_CONFIG);
  await ensureUsersTable();
  await ensurePasswordColumn();
  await seedUser();
};

const getUserById = async (userId) => {
  const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [userId]);
  return rows[0];
};

const getUserByEmail = async (email) => {
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
    email,
  ]);
  return rows[0];
};

const updateUserRecord = async (userId, payload) => {
  await pool.query("UPDATE users SET ? WHERE id = ?", [payload, userId]);
  return getUserById(userId);
};

const createUserRecord = async ({ email, password, displayName, bio }) => {
  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await pool.query("INSERT INTO users SET ?", [
    {
      email,
      displayName,
      bio,
      passwordHash,
      role: "user",
    },
  ]);
  return getUserById(result.insertId);
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
};

// List users (for demo purposes only)
app.get(
  "/api/users",
  asyncHandler(async (_req, res) => {
    const [rows] = await pool.query(
      "SELECT id, email, displayName, bio, role, createdAt, updatedAt FROM users ORDER BY id"
    );
    res.json(rows);
  })
);

// Register user
app.post(
  "/api/auth/register",
  asyncHandler(async (req, res) => {
    const { email, password, displayName, bio = "" } = req.body;

    if (!email || !password || !displayName) {
      return res
        .status(400)
        .json({ message: "email, password, displayName là bắt buộc" });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "Email đã tồn tại" });
    }

    const user = await createUserRecord({
      email,
      password,
      displayName,
      bio,
    });

    res.status(201).json({
      message: "Đăng ký thành công",
      user: sanitizeUser(user),
    });
  })
);

// Login user
app.post(
  "/api/auth/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Thiếu email hoặc password" });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Sai thông tin đăng nhập" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Sai thông tin đăng nhập" });
    }

    res.json({
      message: "Đăng nhập thành công",
      user: sanitizeUser(user),
    });
  })
);

// Unsafe profile update – vulnerable to mass assignment
app.post(
  "/api/profile/v1",
  asyncHandler(async (req, res) => {
    const { userId, ...payload } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "Thiếu userId" });
    }

    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({ message: "User không tồn tại" });
    }

    if (!Object.keys(payload).length) {
      return res.status(400).json({ message: "Không có dữ liệu để cập nhật" });
    }

    const updatedUser = await updateUserRecord(userId, payload);

    return res.json({
      message: "Profile saved (unsafe)",
      user: sanitizeUser(updatedUser),
      note: "Bất kỳ field nào trong JSON (vd: role) đều được ghi vào DB.",
    });
  })
);

// Safe profile update – uses explicit whitelist
app.post(
  "/api/profile/v2",
  asyncHandler(async (req, res) => {
    const { userId, ...payload } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "Thiếu userId" });
    }

    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({ message: "User không tồn tại" });
    }

    const allowedFields = ["displayName", "bio"];
    const sanitized = {};

    for (const field of allowedFields) {
      if (payload[field] !== undefined) {
        sanitized[field] = payload[field];
      }
    }

    if (!Object.keys(sanitized).length) {
      return res
        .status(400)
        .json({ message: "Không có field hợp lệ để cập nhật" });
    }

    const updatedUser = await updateUserRecord(userId, sanitized);

    return res.json({
      message: "Profile saved (safe)",
      user: sanitizeUser(updatedUser),
      note: "Chỉ những field trong whitelist mới được ghi.",
    });
  })
);

// Reset demo data
app.post(
  "/api/reset",
  asyncHandler(async (_req, res) => {
    await pool.query("TRUNCATE TABLE users");
    await seedUser();
    res.json({ message: "Users reset" });
  })
);

app.use((err, _req, res, _next) => {
  console.error(err);
  res
    .status(500)
    .json({ message: "Internal Server Error", details: err.message });
});

initDatabaseLayer()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Demo server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database layer:", err);
    process.exit(1);
  });
