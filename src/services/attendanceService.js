import pool from '../config/database.js';
import { generateId } from '../utils/generateId.js';
import { sendPointsNotificationEmail } from './emailService.js';

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const formatDuration = (minutes) => {
  if (!minutes) return '0 menit';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} menit`;
  if (m === 0) return `${h} jam`;
  return `${h} jam ${m} menit`;
};

// ─── HELPER: validasi token (statis QR atau token generated) ─────────────────
const isValidToken = async (inputToken, type) => {
  // Cek token generated dari DB terlebih dahulu
  try {
    const key = `${type}_token_generated`;
    const genResult = await pool.query('SELECT token FROM system_tokens WHERE key = $1', [key]);
    if (genResult.rows[0] && genResult.rows[0].token === inputToken) return true;
  } catch { /* tabel belum ada, lanjut */ }

  // Cek token QR statis dari DB
  try {
    const staticKey = `${type}_qr_static`;
    const staticResult = await pool.query('SELECT token FROM system_tokens WHERE key = $1', [staticKey]);
    if (staticResult.rows[0] && staticResult.rows[0].token === inputToken) return true;
  } catch { /* tabel belum ada */ }

  return false;
};

// ─── CHECK IN ────────────────────────────────────────────────────────────────
export const checkIn = async (userId, qrToken, activity) => {
  const valid = await isValidToken(qrToken, 'checkin');
  if (!valid) {
    throw { statusCode: 400, message: 'Token check-in tidak valid.' };
  }

  const today = getTodayDateString();

  const existing = await pool.query(
    'SELECT id, status FROM attendances WHERE user_id = $1 AND visit_date = $2',
    [userId, today]
  );

  if (existing.rows[0]) {
    const { status } = existing.rows[0];
    if (status === 'pending')  throw { statusCode: 409, message: 'Anda sudah check-in hari ini. Menunggu persetujuan admin.' };
    if (status === 'approved') throw { statusCode: 409, message: 'Anda sudah check-in dan disetujui hari ini.' };
    if (status === 'rejected') throw { statusCode: 409, message: 'Check-in Anda hari ini ditolak admin.' };
  }

  const id = generateId();
  const result = await pool.query(
    `INSERT INTO attendances (id, user_id, visit_date, check_in_time, status, activity)
     VALUES ($1, $2, $3, NOW(), 'pending', $4)
     RETURNING id, visit_date, check_in_time, status, activity`,
    [id, userId, today, activity || null]
  );

  return result.rows[0];
};

// ─── CHECK OUT ────────────────────────────────────────────────────────────────
export const checkOut = async (userId, qrToken) => {
  const valid = await isValidToken(qrToken, 'checkout');
  if (!valid) {
    throw { statusCode: 400, message: 'Token check-out tidak valid.' };
  }

  const today = getTodayDateString();

  const attendanceResult = await pool.query(
    `SELECT a.*, u.email, u.name, u.total_points
     FROM attendances a JOIN users u ON a.user_id = u.id
     WHERE a.user_id = $1 AND a.visit_date = $2`,
    [userId, today]
  );

  const attendance = attendanceResult.rows[0];
  if (!attendance) throw { statusCode: 404, message: 'Anda belum check-in hari ini.' };
  if (attendance.status === 'pending')  throw { statusCode: 400, message: 'Check-in Anda belum disetujui admin.' };
  if (attendance.status === 'rejected') throw { statusCode: 400, message: 'Check-in Anda ditolak oleh admin.' };
  if (attendance.check_out_time) throw { statusCode: 409, message: 'Anda sudah check-out hari ini.' };

  const checkInTime = new Date(attendance.check_in_time);
  const checkOutTime = new Date();
  const durationMinutes = Math.max(1, Math.round((checkOutTime - checkInTime) / 60000));

  const updatedAttendance = await pool.query(
    `UPDATE attendances
     SET check_out_time = NOW(), duration_minutes = $1, point_awarded = true, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [durationMinutes, attendance.id]
  );

  const userResult = await pool.query(
    `UPDATE users
     SET total_points = total_points + 1, total_visits = total_visits + 1, updated_at = NOW()
     WHERE id = $1
     RETURNING total_points, total_visits, name, email`,
    [userId]
  );

  const { total_points, total_visits, name, email } = userResult.rows[0];

  if (total_points % 5 === 0) {
    sendPointsNotificationEmail(email, name, total_points).catch((err) =>
      console.error('[Email] Gagal kirim notifikasi poin:', err.message)
    );
  }

  return {
    attendance: updatedAttendance.rows[0],
    durationMinutes,
    durationText: formatDuration(durationMinutes),
    pointAwarded: true,
    totalPoints: total_points,
    totalVisits: total_visits,
  };
};

// ─── STATUS HARI INI ──────────────────────────────────────────────────────────
export const getTodayStatus = async (userId) => {
  const today = getTodayDateString();
  const result = await pool.query(
    `SELECT id, visit_date, check_in_time, check_out_time,
            duration_minutes, point_awarded, status, admin_notes, activity
     FROM attendances WHERE user_id = $1 AND visit_date = $2`,
    [userId, today]
  );

  if (!result.rows[0]) return { status: 'not_checked_in', attendance: null };

  const att = result.rows[0];
  let currentStatus;
  if (att.status === 'pending')  currentStatus = 'pending_approval';
  else if (att.status === 'rejected') currentStatus = 'rejected';
  else if (att.check_out_time)   currentStatus = 'checked_out';
  else                           currentStatus = 'checked_in';

  return { status: currentStatus, attendance: att };
};

// ─── RIWAYAT KEHADIRAN ────────────────────────────────────────────────────────
export const getHistory = async (userId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;

  const [rowsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT id, visit_date, check_in_time, check_out_time,
              duration_minutes, point_awarded, status, admin_notes, activity
       FROM attendances WHERE user_id = $1
       ORDER BY visit_date DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
    pool.query('SELECT COUNT(*) FROM attendances WHERE user_id = $1', [userId]),
  ]);

  const total = parseInt(countResult.rows[0].count);
  return {
    attendances: rowsResult.rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// ─── RINGKASAN POIN ───────────────────────────────────────────────────────────
export const getPoints = async (userId) => {
  const [userResult, pendingResult, redeemedResult] = await Promise.all([
    pool.query('SELECT total_points, total_visits FROM users WHERE id = $1', [userId]),
    pool.query("SELECT COUNT(*) FROM point_redemptions WHERE user_id = $1 AND status = 'pending'", [userId]),
    pool.query("SELECT COALESCE(SUM(points_redeemed), 0) as total FROM point_redemptions WHERE user_id = $1 AND status = 'approved'", [userId]),
  ]);

  const { total_points, total_visits } = userResult.rows[0];
  const pendingRedemptions = parseInt(pendingResult.rows[0].count);
  const totalRedeemed = parseInt(redeemedResult.rows[0].total);
  const canRedeem = total_points >= 5;
  const pointsNeeded = canRedeem ? 0 : 5 - total_points;

  return { total_points, total_visits, total_redeemed: totalRedeemed, can_redeem: canRedeem, points_needed: pointsNeeded, pending_redemptions: pendingRedemptions };
};

// ─── TUKAR POIN ───────────────────────────────────────────────────────────────
export const redeemPoints = async (userId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query('SELECT total_points FROM users WHERE id = $1 FOR UPDATE', [userId]);
    const { total_points } = userResult.rows[0];
    if (total_points < 5) throw { statusCode: 400, message: `Poin tidak cukup. Anda memiliki ${total_points} poin.` };

    await client.query('UPDATE users SET total_points = total_points - 5, updated_at = NOW() WHERE id = $1', [userId]);

    const id = generateId();
    const result = await client.query(
      `INSERT INTO point_redemptions (id, user_id, points_redeemed) VALUES ($1, $2, 5) RETURNING *`,
      [id, userId]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ─── RIWAYAT PENUKARAN ────────────────────────────────────────────────────────
export const getRedemptions = async (userId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;

  const [rowsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT id, points_redeemed, status, admin_notes, processed_at, created_at
       FROM point_redemptions WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
    pool.query('SELECT COUNT(*) FROM point_redemptions WHERE user_id = $1', [userId]),
  ]);

  const total = parseInt(countResult.rows[0].count);
  return {
    redemptions: rowsResult.rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};
