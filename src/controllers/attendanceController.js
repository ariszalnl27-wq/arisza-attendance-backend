import * as attendanceService from '../services/attendanceService.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';

export const checkIn = async (req, res, next) => {
  try {
    const { qr_token, activity } = req.body;
    const attendance = await attendanceService.checkIn(req.user.id, qr_token, activity);
    sendCreated(res, 'Check-in berhasil. Menunggu persetujuan admin.', { attendance });
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode);
    next(err);
  }
};

export const checkOut = async (req, res, next) => {
  try {
    const result = await attendanceService.checkOut(req.user.id, req.body.qr_token);
    const msg = `Check-out berhasil. Durasi: ${result.durationText}. +1 poin! Total: ${result.totalPoints}`;
    sendSuccess(res, msg, result);
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode);
    next(err);
  }
};

export const getTodayStatus = async (req, res, next) => {
  try {
    const data = await attendanceService.getTodayStatus(req.user.id);
    sendSuccess(res, 'Status kehadiran hari ini.', data);
  } catch (err) { next(err); }
};

export const getHistory = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const data = await attendanceService.getHistory(req.user.id, page, limit);
    sendSuccess(res, 'Riwayat kehadiran berhasil diambil.', data);
  } catch (err) { next(err); }
};

export const getPoints = async (req, res, next) => {
  try {
    const data = await attendanceService.getPoints(req.user.id);
    sendSuccess(res, 'Ringkasan poin.', data);
  } catch (err) { next(err); }
};

export const redeemPoints = async (req, res, next) => {
  try {
    const redemption = await attendanceService.redeemPoints(req.user.id);
    sendCreated(res, 'Penukaran poin berhasil diajukan. Menunggu persetujuan admin.', { redemption });
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode);
    next(err);
  }
};

export const getRedemptions = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const data = await attendanceService.getRedemptions(req.user.id, page, limit);
    sendSuccess(res, 'Riwayat penukaran poin.', data);
  } catch (err) { next(err); }
};
