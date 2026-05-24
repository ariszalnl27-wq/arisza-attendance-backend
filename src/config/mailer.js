import nodemailer from 'nodemailer';

/**
 * Gmail SMTP Transporter
 *
 * Setup (wajib dilakukan sekali):
 * 1. Buka https://myaccount.google.com/security
 * 2. Aktifkan "2-Step Verification" (jika belum)
 * 3. Buka https://myaccount.google.com/apppasswords
 * 4. Buat App Password → pilih "Mail" → copy 16 karakter yang muncul
 * 5. Isi .env:
 *    GMAIL_USER=emailkamu@gmail.com
 *    GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx   ← 16 karakter dari step 4
 *    MAIL_FROM_NAME=Library System
 *
 * CATATAN: Gunakan App Password, BUKAN password Gmail biasa.
 * App Password tidak terpengaruh 2FA dan bisa dicabut kapan saja.
 */

if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
  console.warn(
    '[Mailer] WARNING: GMAIL_USER atau GMAIL_APP_PASSWORD belum diset di .env. ' +
    'Email tidak akan terkirim.'
  );
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Verifikasi koneksi saat startup (hanya di development)
if (process.env.NODE_ENV !== 'production') {
  transporter.verify((error) => {
    if (error) {
      console.error('[Mailer] Koneksi Gmail SMTP gagal:', error.message);
    } else {
      console.log('[Mailer] Gmail SMTP siap mengirim email ✓');
    }
  });
}

export default transporter;
