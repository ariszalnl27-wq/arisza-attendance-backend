/**
 * Membuat tabel system_tokens untuk menyimpan token QR statis dan token generate
 * - QR Statis: token permanen yang diprint fisik di kasir (dibuat sekali)
 * - Token Generate: token sementara yang bisa di-regenerate admin kapan saja
 */
export const up = (pgm) => {
  pgm.createTable('system_tokens', {
    key: { type: 'varchar(80)', primaryKey: true },
    token: { type: 'varchar(500)', notNull: true },
    generated_by: { type: 'varchar(255)' },
    generated_at: { type: 'timestamp', default: pgm.func('NOW()') },
  });
};

export const down = (pgm) => {
  pgm.dropTable('system_tokens');
};
