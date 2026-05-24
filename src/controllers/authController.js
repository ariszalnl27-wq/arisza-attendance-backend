import * as authService from '../services/authService.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';

export const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    sendCreated(res, 'Registrasi berhasil.', { user });
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode);
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const data = await authService.login(req.body);
    sendSuccess(res, 'Login berhasil.', data);
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode);
    next(err);
  }
};

export const googleLogin = async (req, res, next) => {
  try {
    const { access_token } = req.body;
    if (!access_token) return sendError(res, 'access_token Google wajib diisi.', 400);
    const data = await authService.googleLogin(access_token);
    sendSuccess(res, 'Login Google berhasil.', data);
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode);
    next(err);
  }
};

export const googleRegister = async (req, res, next) => {
  try {
    const { access_token } = req.body;
    if (!access_token) return sendError(res, 'access_token Google wajib diisi.', 400);
    const data = await authService.googleRegister(access_token);
    sendCreated(res, 'Registrasi Google berhasil.', data);
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode);
    next(err);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const data = await authService.refreshToken(req.body.refresh_token);
    sendSuccess(res, 'Access token diperbarui.', data);
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode);
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    await authService.logout(req.body.refresh_token);
    sendSuccess(res, 'Logout berhasil.');
  } catch (err) { next(err); }
};

export const logoutAll = async (req, res, next) => {
  try {
    await authService.logoutAll(req.user.id);
    sendSuccess(res, 'Logout dari semua perangkat berhasil.');
  } catch (err) { next(err); }
};

export const forgotPassword = async (req, res, next) => {
  try {
    await authService.forgotPassword(req.body.email);
    sendSuccess(res, 'Jika email terdaftar, link reset password telah dikirim ke email Anda.');
  } catch (err) {
    if (process.env.NODE_ENV !== 'production' && err.message) {
      return sendError(res, `Gagal kirim email: ${err.message}`, 500);
    }
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    await authService.resetPassword(req.body);
    sendSuccess(res, 'Password berhasil direset. Silakan login kembali.');
  } catch (err) {
    if (err.statusCode) return sendError(res, err.message, err.statusCode);
    next(err);
  }
};
