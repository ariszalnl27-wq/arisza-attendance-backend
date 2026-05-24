import bcrypt from 'bcryptjs';
import ExcelJS from 'exceljs';
import pool from '../config/database.js';
import { generateId } from '../utils/generateId.js';
import { generateQRDataURL } from '../utils/qrGenerator.js';
import { sendRedemptionStatusEmail } from './emailService.js';

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
export const getDashboard = async () => {
  const today = new Date().toISOString().split('T')[0];
  const [users, activeToday, pendingCheckins, totalVisits, pendingRedemptions] = await Promise.all([
    pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE role = 'user') as regular FROM users WHERE is_active = true"),
    pool.query("SELECT COUNT(DISTINCT user_id) FROM attendances WHERE visit_date = $1", [today]),
    pool.query("SELECT COUNT(*) FROM attendances WHERE status = 'pending'"),
    pool.query("SELECT COUNT(*) FROM attendances WHERE status = 'approved' AND check_out_time IS NOT NULL"),
    pool.query("SELECT COUNT(*) FROM point_redemptions WHERE status = 'pending'"),
  ]);
  return {
    total_users: parseInt(users.rows[0].total),
    regular_users: parseInt(users.rows[0].regular),
    active_today: parseInt(activeToday.rows[0].count),
    pending_checkins: parseInt(pendingCheckins.rows[0].count),
    total_completed_visits: parseInt(totalVisits.rows[0].count),
    pending_redemptions: parseInt(pendingRedemptions.rows[0].count),
  };
};

// ─── KELOLA USER ──────────────────────────────────────────────────────────────
export const getUsers = async (page = 1, limit = 10, search = '') => {
  const offset = (page - 1) * limit;
  const searchParam = `%${search}%`;
  const [rowsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT id, name, email, phone, institution, photo_url, role, auth_provider,
              total_points, total_visits, is_active, created_at
       FROM users WHERE (name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1)
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [searchParam, limit, offset]
    ),
    pool.query(
      'SELECT COUNT(*) FROM users WHERE (name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1)',
      [searchParam]
    ),
  ]);
  const total = parseInt(countResult.rows[0].count);
  return { users: rowsResult.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const getUserById = async (id) => {
  const [userResult, attendancesResult, redemptionsResult, redeemedResult] = await Promise.all([
    pool.query(
      `SELECT id, name, email, phone, institution, photo_url, role, auth_provider,
              total_points, total_visits, is_active, created_at
       FROM users WHERE id = $1`, [id]
    ),
    pool.query(
      `SELECT id, visit_date, check_in_time, check_out_time, duration_minutes,
              point_awarded, status, activity
       FROM attendances WHERE user_id = $1 ORDER BY visit_date DESC LIMIT 10`, [id]
    ),
    pool.query(
      `SELECT id, points_redeemed, status, admin_notes, created_at
       FROM point_redemptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`, [id]
    ),
    pool.query(
      "SELECT COALESCE(SUM(points_redeemed),0) as total FROM point_redemptions WHERE user_id = $1 AND status = 'approved'",
      [id]
    ),
  ]);
  if (!userResult.rows[0]) throw { statusCode: 404, message: 'Pengguna tidak ditemukan.' };
  return {
    user: userResult.rows[0],
    totalPointsRedeemed: parseInt(redeemedResult.rows[0].total),
    recentAttendances: attendancesResult.rows,
    recentRedemptions: redemptionsResult.rows,
  };
};

export const updateUser = async (id, { name, phone, institution, is_active }) => {
  if (phone) {
    const phoneExists = await pool.query('SELECT id FROM users WHERE phone = $1 AND id != $2', [phone, id]);
    if (phoneExists.rows[0]) throw { statusCode: 409, message: 'Nomor telepon sudah digunakan.' };
  }
  const fields = []; const values = []; let idx = 1;
  if (name !== undefined)      { fields.push(`name = $${idx++}`);      values.push(name); }
  if (phone !== undefined)     { fields.push(`phone = $${idx++}`);     values.push(phone); }
  if (institution !== undefined){ fields.push(`institution = $${idx++}`); values.push(institution); }
  if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(is_active); }
  fields.push('updated_at = NOW()');
  values.push(id);
  const result = await pool.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
     RETURNING id, name, email, phone, institution, role, is_active, total_points, total_visits`,
    values
  );
  if (!result.rows[0]) throw { statusCode: 404, message: 'Pengguna tidak ditemukan.' };
  return result.rows[0];
};

export const deactivateUser = async (id) => {
  const result = await pool.query(
    "UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 AND role != 'admin' RETURNING id, name",
    [id]
  );
  if (!result.rows[0]) throw { statusCode: 404, message: 'Pengguna tidak ditemukan atau tidak dapat dinonaktifkan.' };
  return result.rows[0];
};

// ─── KELOLA KEHADIRAN ─────────────────────────────────────────────────────────
export const getAttendances = async ({ date, userId, status, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  const conditions = []; const values = []; let idx = 1;
  if (date)   { conditions.push(`a.visit_date = $${idx++}`); values.push(date); }
  if (userId) { conditions.push(`a.user_id = $${idx++}`);    values.push(userId); }
  if (status) { conditions.push(`a.status = $${idx++}`);     values.push(status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rowsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT a.id, a.visit_date, a.check_in_time, a.check_out_time,
              a.duration_minutes, a.point_awarded, a.status, a.admin_notes, a.activity,
              a.approved_at, u.id as user_id, u.name as user_name, u.email as user_email,
              u.phone as user_phone
       FROM attendances a JOIN users u ON a.user_id = u.id
       ${where} ORDER BY a.check_in_time DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    ),
    pool.query(`SELECT COUNT(*) FROM attendances a JOIN users u ON a.user_id = u.id ${where}`, values),
  ]);
  const total = parseInt(countResult.rows[0].count);
  return { attendances: rowsResult.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const approveAttendance = async (attendanceId, adminId, status, adminNotes) => {
  const existing = await pool.query('SELECT * FROM attendances WHERE id = $1', [attendanceId]);
  if (!existing.rows[0]) throw { statusCode: 404, message: 'Data kehadiran tidak ditemukan.' };
  if (existing.rows[0].status !== 'pending') throw { statusCode: 400, message: `Kehadiran sudah berstatus '${existing.rows[0].status}'.` };
  const result = await pool.query(
    `UPDATE attendances SET status = $1, approved_by = $2, approved_at = NOW(),
     admin_notes = $3, updated_at = NOW() WHERE id = $4 RETURNING *`,
    [status, adminId, adminNotes || null, attendanceId]
  );
  return result.rows[0];
};

// ─── KELOLA PENUKARAN ─────────────────────────────────────────────────────────
export const getRedemptions = async (status, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const condition = status ? 'WHERE pr.status = $1' : '';
  const params = status ? [status] : [];
  const limitIdx = params.length + 1;
  const [rowsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT pr.id, pr.points_redeemed, pr.status, pr.admin_notes, pr.processed_at, pr.created_at,
              u.id as user_id, u.name as user_name, u.email as user_email
       FROM point_redemptions pr JOIN users u ON pr.user_id = u.id
       ${condition} ORDER BY pr.created_at DESC LIMIT $${limitIdx} OFFSET $${limitIdx + 1}`,
      [...params, limit, offset]
    ),
    pool.query(`SELECT COUNT(*) FROM point_redemptions pr ${condition}`, params),
  ]);
  const total = parseInt(countResult.rows[0].count);
  return { redemptions: rowsResult.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const processRedemption = async (redemptionId, adminId, status, adminNotes) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      `SELECT pr.*, u.name as user_name, u.email as user_email
       FROM point_redemptions pr JOIN users u ON pr.user_id = u.id
       WHERE pr.id = $1 FOR UPDATE`, [redemptionId]
    );
    const redemption = existing.rows[0];
    if (!redemption) throw { statusCode: 404, message: 'Data penukaran tidak ditemukan.' };
    if (redemption.status !== 'pending') throw { statusCode: 400, message: `Penukaran sudah berstatus '${redemption.status}'.` };
    const updated = await client.query(
      `UPDATE point_redemptions SET status = $1, admin_notes = $2, processed_by = $3,
       processed_at = NOW(), updated_at = NOW() WHERE id = $4 RETURNING *`,
      [status, adminNotes || null, adminId, redemptionId]
    );
    if (status === 'rejected') {
      await client.query(
        'UPDATE users SET total_points = total_points + $1, updated_at = NOW() WHERE id = $2',
        [redemption.points_redeemed, redemption.user_id]
      );
    }
    await client.query('COMMIT');
    sendRedemptionStatusEmail(redemption.user_email, redemption.user_name, status, adminNotes, redemption.points_redeemed)
      .catch((err) => console.error('[Email] Gagal kirim email redemption:', err.message));
    return updated.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ─── BUAT ADMIN BARU ──────────────────────────────────────────────────────────
export const createAdmin = async ({ name, email, phone, password }) => {
  const emailExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (emailExists.rows[0]) throw { statusCode: 409, message: 'Email sudah terdaftar.' };
  if (phone) {
    const phoneExists = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (phoneExists.rows[0]) throw { statusCode: 409, message: 'Nomor telepon sudah terdaftar.' };
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const id = generateId();
  const result = await pool.query(
    `INSERT INTO users (id, name, email, phone, password_hash, role, auth_provider)
     VALUES ($1, $2, $3, $4, $5, 'admin', 'email')
     RETURNING id, name, email, phone, role, created_at`,
    [id, name, email, phone || null, passwordHash]
  );
  return result.rows[0];
};

// ─── QR CODE ──────────────────────────────────────────────────────────────────
export const getQRCodes = async () => {
  const checkinToken  = process.env.QR_CHECKIN_TOKEN;
  const checkoutToken = process.env.QR_CHECKOUT_TOKEN;
  if (!checkinToken || !checkoutToken) {
    throw { statusCode: 500, message: 'QR token belum dikonfigurasi di environment variables.' };
  }
  const [checkinQR, checkoutQR] = await Promise.all([
    generateQRDataURL(checkinToken),
    generateQRDataURL(checkoutToken),
  ]);
  return {
    checkin:  { qr_data_url: checkinQR,  token: checkinToken },
    checkout: { qr_data_url: checkoutQR, token: checkoutToken },
    note: 'QR ini bersifat statis. Cetak dan tempel di kasir perpustakaan.',
  };
};

// ─── EXPORT DATA USER KE EXCEL ───────────────────────────────────────────────
export const exportUsersExcel = async () => {
  const result = await pool.query(
    `SELECT u.id, u.name, u.institution, u.email, u.phone,
            u.total_visits, u.total_points,
            COALESCE(SUM(pr.points_redeemed) FILTER (WHERE pr.status = 'approved'), 0) AS total_points_redeemed
     FROM users u
     LEFT JOIN point_redemptions pr ON pr.user_id = u.id
     WHERE u.role = 'user'
     GROUP BY u.id
     ORDER BY u.name ASC`
  );

  const workbook  = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data Pengunjung');

  worksheet.columns = [
    { header: 'No',                  key: 'no',                    width: 5  },
    { header: 'Nama',                key: 'name',                  width: 28 },
    { header: 'Instansi',            key: 'institution',           width: 28 },
    { header: 'Email',               key: 'email',                 width: 32 },
    { header: 'No. Telepon',         key: 'phone',                 width: 18 },
    { header: 'Total Kunjungan',     key: 'total_visits',          width: 16 },
    { header: 'Total Poin Sekarang', key: 'total_points',          width: 20 },
    { header: 'Total Poin Ditukar',  key: 'total_points_redeemed', width: 20 },
  ];

  // Header style
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1814' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF8B6F47' } },
    };
  });
  worksheet.getRow(1).height = 22;

  result.rows.forEach((row, i) => {
    const r = worksheet.addRow({
      no:                    i + 1,
      name:                  row.name,
      institution:           row.institution || '-',
      email:                 row.email,
      phone:                 row.phone || '-',
      total_visits:          parseInt(row.total_visits),
      total_points:          parseInt(row.total_points),
      total_points_redeemed: parseInt(row.total_points_redeemed),
    });
    if (i % 2 === 0) {
      r.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F4EF' } };
      });
    }
    r.eachCell((cell) => {
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFE7E5E4' } } };
    });
  });

  // Auto-filter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: worksheet.columns.length },
  };

  worksheet.getColumn('no').alignment = { horizontal: 'center' };
  worksheet.getColumn('total_visits').alignment  = { horizontal: 'center' };
  worksheet.getColumn('total_points').alignment  = { horizontal: 'center' };
  worksheet.getColumn('total_points_redeemed').alignment = { horizontal: 'center' };

  return workbook;
};
