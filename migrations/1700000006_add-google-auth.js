/**
 * Menambahkan kolom untuk Google OAuth ke tabel users
 * + membuat phone nullable (Google user tidak wajib punya phone)
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const up = (pgm) => {
  // google_id: ID unik dari Google
  pgm.addColumn('users', {
    google_id: {
      type: 'varchar(255)',
      unique: true,
    },
  });

  // auth_provider: 'email' | 'google'
  pgm.addColumn('users', {
    auth_provider: {
      type: 'varchar(10)',
      notNull: true,
      default: 'email',
    },
  });

  // Buat phone nullable agar Google user bisa daftar tanpa phone
  pgm.alterColumn('users', 'phone', {
    type: 'varchar(20)',
    notNull: false,
  });

  // Buat password_hash nullable agar Google user tidak perlu password
  pgm.alterColumn('users', 'password_hash', {
    type: 'text',
    notNull: false,
  });

  pgm.createIndex('users', 'google_id');
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const down = (pgm) => {
  pgm.dropColumn('users', 'google_id');
  pgm.dropColumn('users', 'auth_provider');
  pgm.alterColumn('users', 'phone', { type: 'varchar(20)', notNull: true });
  pgm.alterColumn('users', 'password_hash', { type: 'text', notNull: true });
};
