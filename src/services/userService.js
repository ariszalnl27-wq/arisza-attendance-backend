import bcrypt from 'bcryptjs';
import cloudinary from '../config/cloudinary.js';
import pool from '../config/database.js';

// ─── Helper: upload buffer ke Cloudinary ─────────────────────────────────────
// CATATAN: `transformation` TIDAK disertakan di upload options karena menyebabkan
// "Invalid Signature" — SDK menserialisasi array transformation berbeda dari yang
// diverifikasi Cloudinary server. Transformasi diterapkan via URL setelah upload.
const uploadToCloudinary = (buffer, userId) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'library/profiles',
        public_id: `user-${userId}`,
        overwrite: true,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    stream.end(buffer);
  });
};

// ─── Helper: bangun URL foto profil dengan transformasi on-the-fly ────────────
const buildProfilePhotoUrl = (userId) => {
  return cloudinary.url(`library/profiles/user-${userId}`, {
    secure: true,
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto:good', fetch_format: 'auto' },
    ],
  });
};

// ─── Helper: hapus foto lama dari Cloudinary ──────────────────────────────────
const deleteFromCloudinary = async (photoUrl) => {
  if (!photoUrl || photoUrl.startsWith('https://lh3.googleusercontent')) return;
  if (!photoUrl.includes('cloudinary.com')) return;

  try {
    // public_id ada di path setelah /upload/v<timestamp>/
    const match = photoUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/);
    if (match) await cloudinary.uploader.destroy(match[1]);
  } catch (err) {
    console.error('[Cloudinary] Gagal hapus foto lama:', err.message);
  }
};

// ─── GET PROFILE ──────────────────────────────────────────────────────────────
export const getProfile = async (userId) => {
  const result = await pool.query(
    `SELECT id, name, email, phone, institution, photo_url, role, auth_provider,
            total_points, total_visits, is_active, created_at, updated_at
     FROM users WHERE id = $1`,
    [userId],
  );
  if (!result.rows[0])
    throw { statusCode: 404, message: 'Pengguna tidak ditemukan.' };
  return result.rows[0];
};

// ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
export const updateProfile = async (userId, { name, phone, institution }) => {
  if (phone) {
    const phoneExists = await pool.query(
      'SELECT id FROM users WHERE phone = $1 AND id != $2',
      [phone, userId],
    );
    if (phoneExists.rows[0])
      throw { statusCode: 409, message: 'Nomor telepon sudah digunakan.' };
  }

  const fields = [];
  const values = [];
  let idx = 1;

  if (name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(name);
  }
  if (phone !== undefined) {
    fields.push(`phone = $${idx++}`);
    values.push(phone || null);
  }
  if (institution !== undefined) {
    fields.push(`institution = $${idx++}`);
    values.push(institution || null);
  }

  if (fields.length === 0)
    throw { statusCode: 400, message: 'Tidak ada field yang diubah.' };

  fields.push('updated_at = NOW()');
  values.push(userId);

  const result = await pool.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
     RETURNING id, name, email, phone, institution, photo_url, role, total_points, total_visits`,
    values,
  );
  return result.rows[0];
};

// ─── UPDATE PROFILE PHOTO (via Cloudinary) ───────────────────────────────────
export const updateProfilePhoto = async (userId, fileBuffer, mimetype) => {
  // Ambil URL foto lama untuk dihapus
  const existing = await pool.query(
    'SELECT photo_url FROM users WHERE id = $1',
    [userId],
  );
  const oldPhotoUrl = existing.rows[0]?.photo_url;
  await deleteFromCloudinary(oldPhotoUrl);

  // Upload ke Cloudinary (tanpa transformation di options — lihat helper di atas)
  await uploadToCloudinary(fileBuffer, userId);

  // Bangun URL dengan transformasi on-the-fly via Cloudinary URL API
  const photoUrl = buildProfilePhotoUrl(userId);

  const updated = await pool.query(
    'UPDATE users SET photo_url = $1, updated_at = NOW() WHERE id = $2 RETURNING id, photo_url',
    [photoUrl, userId],
  );
  return updated.rows[0];
};

// ─── CHANGE PASSWORD ──────────────────────────────────────────────────────────
export const changePassword = async (
  userId,
  { current_password, new_password },
) => {
  const result = await pool.query(
    'SELECT password_hash, auth_provider FROM users WHERE id = $1',
    [userId],
  );
  const user = result.rows[0];
  if (!user) throw { statusCode: 404, message: 'Pengguna tidak ditemukan.' };

  if (user.auth_provider === 'google' || !user.password_hash) {
    throw {
      statusCode: 400,
      message: 'Akun Google tidak bisa ubah password di sini.',
    };
  }

  const isValid = await bcrypt.compare(current_password, user.password_hash);
  if (!isValid)
    throw { statusCode: 400, message: 'Password saat ini tidak sesuai.' };

  const passwordHash = await bcrypt.hash(new_password, 12);
  await pool.query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [passwordHash, userId],
  );
};
