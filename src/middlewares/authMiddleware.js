import { verifyAccessToken } from '../utils/jwt.js';
import pool from '../config/database.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Akses ditolak. Token tidak ditemukan.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    // Pastikan user masih aktif di database
    const result = await pool.query(
      'SELECT id, name, email, phone, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (!result.rows[0]) {
      return res.status(401).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    if (!result.rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'Akun Anda telah dinonaktifkan.' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token telah kedaluwarsa.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Token tidak valid.' });
    }
    next(err);
  }
};
