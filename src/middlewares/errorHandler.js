export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`,
  });
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`, err.stack);

  // Multer error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'Ukuran file maksimal 2 MB.' });
  }

  if (err.message && err.message.includes('Format file')) {
    return res.status(400).json({ success: false, message: err.message });
  }

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Data sudah terdaftar.' });
  }

  // Default
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Terjadi kesalahan pada server.';
  res.status(statusCode).json({ success: false, message });
};
