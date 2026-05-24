/**
 * Menambahkan kolom activity ke tabel attendances
 * Diisi user saat check-in (contoh: membaca, mengerjakan tugas, dll)
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const up = (pgm) => {
  pgm.addColumn('attendances', {
    activity: {
      type: 'varchar(200)',
      comment: 'Kegiatan yang dilakukan pengunjung selama berkunjung',
    },
  });
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const down = (pgm) => {
  pgm.dropColumn('attendances', 'activity');
};
