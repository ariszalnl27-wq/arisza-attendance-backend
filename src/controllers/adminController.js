import * as adminService from '../services/adminService.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';

export const getDashboard = async (req, res, next) => {
  try { sendSuccess(res, 'Dashboard statistik.', await adminService.getDashboard()); }
  catch (err) { next(err); }
};

export const getUsers = async (req, res, next) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    sendSuccess(res, 'Daftar pengguna.', await adminService.getUsers(page, limit, search));
  } catch (err) { next(err); }
};

export const getUserById = async (req, res, next) => {
  try {
    const data = await adminService.getUserById(req.params.id);
    sendSuccess(res, 'Detail pengguna.', data);
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode);
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await adminService.updateUser(req.params.id, req.body);
    sendSuccess(res, 'Data pengguna berhasil diperbarui.', { user });
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode);
    next(err);
  }
};

export const deactivateUser = async (req, res, next) => {
  try {
    const user = await adminService.deactivateUser(req.params.id);
    sendSuccess(res, `Pengguna ${user.name} berhasil dinonaktifkan.`, { user });
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode);
    next(err);
  }
};

export const getAttendances = async (req, res, next) => {
  try {
    const { date, user_id, status } = req.query;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    sendSuccess(res, 'Data kehadiran.', await adminService.getAttendances({ date, userId: user_id, status, page, limit }));
  } catch (err) { next(err); }
};

export const approveAttendance = async (req, res, next) => {
  try {
    const { status, admin_notes } = req.body;
    const attendance = await adminService.approveAttendance(req.params.id, req.user.id, status, admin_notes);
    const msg = status === 'approved' ? 'Kehadiran berhasil disetujui.' : 'Kehadiran berhasil ditolak.';
    sendSuccess(res, msg, { attendance });
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode);
    next(err);
  }
};

export const getRedemptions = async (req, res, next) => {
  try {
    const { status } = req.query;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    sendSuccess(res, 'Daftar penukaran poin.', await adminService.getRedemptions(status, page, limit));
  } catch (err) { next(err); }
};

export const processRedemption = async (req, res, next) => {
  try {
    const { status, admin_notes } = req.body;
    const redemption = await adminService.processRedemption(req.params.id, req.user.id, status, admin_notes);
    const msg = status === 'approved' ? 'Penukaran poin disetujui.' : 'Penukaran poin ditolak, poin dikembalikan.';
    sendSuccess(res, msg, { redemption });
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode);
    next(err);
  }
};

export const createAdmin = async (req, res, next) => {
  try {
    const admin = await adminService.createAdmin(req.body);
    sendCreated(res, 'Akun admin baru berhasil dibuat.', { admin });
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode);
    next(err);
  }
};

export const getQRCodes = async (req, res, next) => {
  try {
    sendSuccess(res, 'QR code statis perpustakaan.', await adminService.getQRCodes());
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode);
    next(err);
  }
};

export const exportUsers = async (req, res, next) => {
  try {
    const workbook = await adminService.exportUsersExcel();
    const filename = `data-pengunjung-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
};
