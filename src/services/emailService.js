import transporter from '../config/mailer.js';

const FROM = `"${process.env.MAIL_FROM_NAME || 'Library System'}" <${process.env.MAIL_FROM || 'noreply@library.app'}>`;

export const sendPasswordResetEmail = async (email, name, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: '🔑 Reset Password - Library System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2c3e50;">Reset Password</h2>
        <p>Halo <strong>${name}</strong>,</p>
        <p>Kami menerima permintaan reset password untuk akun Anda. Klik tombol di bawah untuk mereset password Anda:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #3498db; color: white; padding: 12px 30px;
                    text-decoration: none; border-radius: 5px; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="color: #7f8c8d; font-size: 14px;">Link ini akan kedaluwarsa dalam <strong>1 jam</strong>.</p>
        <p style="color: #7f8c8d; font-size: 14px;">
          Jika Anda tidak meminta reset password, abaikan email ini.
        </p>
        <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 20px 0;">
        <p style="color: #bdc3c7; font-size: 12px;">Library System — Sistem Manajemen Perpustakaan</p>
      </div>
    `,
  });
};

export const sendPointsNotificationEmail = async (email, name, totalPoints) => {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: '🎉 Selamat! Poin Anda Bisa Ditukar Hadiah',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #27ae60;">🎉 Selamat, ${name}!</h2>
        <p>Total poin kunjungan Anda sekarang mencapai <strong>${totalPoints} poin</strong>.</p>
        <div style="background-color: #f0fdf4; border-left: 4px solid #27ae60;
                    padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0; font-size: 16px;">
            ✅ Anda memiliki <strong>${Math.floor(totalPoints / 10)} voucher</strong> yang bisa ditukar hadiah!
          </p>
        </div>
        <p>Setiap <strong>10 poin</strong> = 1 penukaran hadiah. Segera ajukan penukaran melalui aplikasi.</p>
        <p style="color: #7f8c8d; font-size: 14px;">
          Terima kasih telah rajin mengunjungi perpustakaan kami! 📚
        </p>
        <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 20px 0;">
        <p style="color: #bdc3c7; font-size: 12px;">Library System — Sistem Manajemen Perpustakaan</p>
      </div>
    `,
  });
};

export const sendRedemptionStatusEmail = async (email, name, status, adminNotes, pointsRedeemed) => {
  const isApproved = status === 'approved';
  const statusText = isApproved ? '✅ Disetujui' : '❌ Ditolak';
  const statusColor = isApproved ? '#27ae60' : '#e74c3c';
  const statusBg = isApproved ? '#f0fdf4' : '#fef2f2';
  const statusBorder = isApproved ? '#27ae60' : '#e74c3c';

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `${isApproved ? '✅' : '❌'} Penukaran Poin ${statusText} - Library System`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: ${statusColor};">Penukaran Poin ${statusText}</h2>
        <p>Halo <strong>${name}</strong>,</p>
        <p>Pengajuan penukaran <strong>${pointsRedeemed} poin</strong> Anda telah diproses oleh admin.</p>
        <div style="background-color: ${statusBg}; border-left: 4px solid ${statusBorder};
                    padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0 0 8px; font-weight: bold;">Status: ${statusText}</p>
          ${adminNotes ? `<p style="margin: 0; color: #555;">Catatan Admin: ${adminNotes}</p>` : ''}
        </div>
        ${isApproved
          ? '<p>Silakan datang ke loket perpustakaan untuk mengambil hadiah Anda. 🎁</p>'
          : '<p>Poin Anda telah dikembalikan ke akun. Silakan hubungi admin untuk informasi lebih lanjut.</p>'
        }
        <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 20px 0;">
        <p style="color: #bdc3c7; font-size: 12px;">Library System — Sistem Manajemen Perpustakaan</p>
      </div>
    `,
  });
};
