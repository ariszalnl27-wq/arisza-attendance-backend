import multer from 'multer'

/**
 * Gunakan memoryStorage agar file tersimpan di buffer (RAM),
 * bukan ke disk — kompatibel dengan Vercel serverless.
 *
 * Buffer kemudian di-upload ke Cloudinary di service layer.
 */
const storage = multer.memoryStorage()

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (allowed.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Format file tidak didukung. Gunakan JPEG, PNG, atau WebP.'), false)
  }
}

export const uploadPhoto = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
})
