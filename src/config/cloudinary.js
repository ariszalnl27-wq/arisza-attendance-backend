import { v2 as cloudinary } from 'cloudinary'

/**
 * Cloudinary digunakan untuk menyimpan foto profil.
 * Vercel filesystem bersifat read-only (kecuali /tmp yang tidak persisten),
 * sehingga upload file ke disk tidak bisa dipakai di production.
 *
 * Setup:
 * 1. Daftar gratis di https://cloudinary.com
 * 2. Salin CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 * 3. Tambahkan ke environment variables Vercel & .env lokal
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
})

export default cloudinary
