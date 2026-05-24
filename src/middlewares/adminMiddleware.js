/**
 * Middleware untuk memastikan user yang login adalah admin.
 * Harus digunakan SETELAH authenticate middleware.
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak. Hanya admin yang diizinkan.',
    });
  }
  next();
};
