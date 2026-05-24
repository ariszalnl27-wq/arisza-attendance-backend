import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import pool from '../config/database.js';
import { generateId } from '../utils/generateId.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { sendPasswordResetEmail } from './emailService.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── Helper: buat token pair & simpan refresh token ─────────────────────────
const createTokenPair = async (user) => {
  const payload = { id: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const tokenId = generateId();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)',
    [tokenId, user.id, refreshToken, expiresAt]
  );

  return { accessToken, refreshToken };
};

// ─── Helper: format user aman (tanpa password) ───────────────────────────────
const safeUser = (user) => {
  const { password_hash, ...rest } = user;
  return rest;
};

// ─── REGISTER ────────────────────────────────────────────────────────────────
export const register = async ({ name, email, phone, institution, password }) => {
  // Cek email sudah terdaftar
  const emailExists = await pool.query('SELECT id, auth_provider FROM users WHERE email = $1', [email]);
  if (emailExists.rows[0]) {
    if (emailExists.rows[0].auth_provider === 'google') {
      throw { statusCode: 409, message: 'Email ini terdaftar via Google. Gunakan login Google.' };
    }
    throw { statusCode: 409, message: 'Email sudah terdaftar.' };
  }

  // Cek phone unik jika diisi
  if (phone) {
    const phoneExists = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (phoneExists.rows[0]) throw { statusCode: 409, message: 'Nomor telepon sudah terdaftar.' };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = generateId();

  const result = await pool.query(
    `INSERT INTO users (id, name, email, phone, institution, password_hash, auth_provider)
     VALUES ($1, $2, $3, $4, $5, $6, 'email')
     RETURNING id, name, email, phone, institution, role, total_points, total_visits, created_at`,
    [id, name, email, phone || null, institution || null, passwordHash]
  );

  return result.rows[0];
};

// ─── LOGIN (email/phone + password) ──────────────────────────────────────────
export const login = async ({ identifier, password }) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE (email = $1 OR phone = $1) AND is_active = true',
    [identifier]
  );

  const user = result.rows[0];
  if (!user) throw { statusCode: 401, message: 'Email/nomor telepon atau password salah.' };

  // Google user tidak punya password
  if (user.auth_provider === 'google' || !user.password_hash) {
    throw { statusCode: 401, message: 'Akun ini terdaftar via Google. Gunakan login Google.' };
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) throw { statusCode: 401, message: 'Email/nomor telepon atau password salah.' };

  const tokens = await createTokenPair(user);
  return { user: safeUser(user), ...tokens };
};

// ─── GOOGLE OAUTH ─────────────────────────────────────────────────────────────
export const googleAuth = async (accessToken) => {
  // Ambil info user dari Google menggunakan access token
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw { statusCode: 401, message: 'Token Google tidak valid.' };
  }

  const googleUser = await response.json();
  const { sub: googleId, email, name, picture } = googleUser;

  if (!email) throw { statusCode: 400, message: 'Tidak dapat mengambil email dari akun Google.' };

  // Cari user berdasarkan google_id
  let userResult = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
  let isNewUser = false;

  if (!userResult.rows[0]) {
    // Cek apakah email sudah terdaftar manual
    const emailResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (emailResult.rows[0]) {
      const existing = emailResult.rows[0];
      if (!existing.is_active) {
        throw { statusCode: 401, message: 'Akun Anda telah dinonaktifkan.' };
      }
      // Link google_id ke akun yang sudah ada
      await pool.query(
        'UPDATE users SET google_id = $1, photo_url = COALESCE(photo_url, $2), auth_provider = $3, updated_at = NOW() WHERE id = $4',
        [googleId, picture, existing.auth_provider === 'email' ? 'email' : 'google', existing.id]
      );
      userResult = await pool.query('SELECT * FROM users WHERE id = $1', [existing.id]);
    } else {
      // Buat user baru dari Google — tandai sebagai pengguna baru
      isNewUser = true;
      const id = generateId();
      await pool.query(
        `INSERT INTO users (id, name, email, google_id, photo_url, auth_provider)
         VALUES ($1, $2, $3, $4, $5, 'google')`,
        [id, name, email, googleId, picture]
      );
      userResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    }
  }

  const user = userResult.rows[0];
  if (!user.is_active) throw { statusCode: 401, message: 'Akun Anda telah dinonaktifkan.' };

  // Update foto dari Google jika belum ada foto lokal
  if (picture && (!user.photo_url || user.photo_url.startsWith('https://lh3.googleusercontent'))) {
    await pool.query('UPDATE users SET photo_url = $1 WHERE id = $2', [picture, user.id]);
    user.photo_url = picture;
  }

  const tokens = await createTokenPair(user);
  return { user: safeUser(user), ...tokens, isNewUser };
};

// ─── REFRESH TOKEN ────────────────────────────────────────────────────────────
export const refreshToken = async (token) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw { statusCode: 401, message: 'Refresh token tidak valid atau kedaluwarsa.' };
  }

  const result = await pool.query(
    'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
    [token]
  );
  if (!result.rows[0]) throw { statusCode: 401, message: 'Refresh token tidak ditemukan atau kedaluwarsa.' };

  const userResult = await pool.query('SELECT id, role, is_active FROM users WHERE id = $1', [decoded.id]);
  const user = userResult.rows[0];
  if (!user || !user.is_active) throw { statusCode: 401, message: 'Pengguna tidak aktif.' };

  const accessToken = signAccessToken({ id: user.id, role: user.role });
  return { accessToken };
};

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
export const logout = async (token) => {
  await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
};

export const logoutAll = async (userId) => {
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
};

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
export const forgotPassword = async (email) => {
  const result = await pool.query(
    "SELECT id, name, email, auth_provider FROM users WHERE email = $1 AND is_active = true",
    [email]
  );
  const user = result.rows[0];

  // Security: tidak reveal apakah email terdaftar atau tidak
  if (!user) return;

  // Google user tidak punya password untuk direset
  if (user.auth_provider === 'google') return;

  // Hapus token lama
  await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);

  const token = generateId() + generateId();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 jam

  await pool.query(
    'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)',
    [generateId(), user.id, token, expiresAt]
  );

  // Error kirim email di-throw agar terlihat di log
  await sendPasswordResetEmail(user.email, user.name, token);
};

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
export const resetPassword = async ({ token, new_password }) => {
  const result = await pool.query(
    `SELECT prt.*, u.id as uid FROM password_reset_tokens prt
     JOIN users u ON prt.user_id = u.id
     WHERE prt.token = $1 AND prt.expires_at > NOW() AND prt.is_used = false`,
    [token]
  );

  const record = result.rows[0];
  if (!record) throw { statusCode: 400, message: 'Token tidak valid atau sudah kedaluwarsa.' };

  const passwordHash = await bcrypt.hash(new_password, 12);

  await pool.query(
    'UPDATE users SET password_hash = $1, auth_provider = $2, updated_at = NOW() WHERE id = $3',
    [passwordHash, 'email', record.user_id]
  );

  await pool.query('UPDATE password_reset_tokens SET is_used = true WHERE id = $1', [record.id]);
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [record.user_id]);
};
