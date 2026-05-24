/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const up = (pgm) => {
  pgm.createTable('attendances', {
    id: {
      type: 'varchar(21)',
      primaryKey: true,
      notNull: true,
    },
    user_id: {
      type: 'varchar(21)',
      notNull: true,
      references: '"users"',
      onDelete: 'CASCADE',
    },
    visit_date: {
      type: 'date',
      notNull: true,
    },
    check_in_time: {
      type: 'timestamptz',
      notNull: true,
    },
    check_out_time: {
      type: 'timestamptz',
    },
    duration_minutes: {
      type: 'integer',
    },
    point_awarded: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    // Kolom baru: status persetujuan admin
    status: {
      type: 'varchar(10)',
      notNull: true,
      default: 'pending',
      check: "status IN ('pending', 'approved', 'rejected')",
    },
    approved_by: {
      type: 'varchar(21)',
      references: '"users"',
      comment: 'ID admin yang menyetujui/menolak',
    },
    approved_at: {
      type: 'timestamptz',
    },
    admin_notes: {
      type: 'text',
      comment: 'Catatan dari admin saat approve/reject',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  // Unique: 1 user hanya bisa 1 attendance per hari
  pgm.addConstraint('attendances', 'attendances_user_date_unique', 'UNIQUE(user_id, visit_date)');

  pgm.createIndex('attendances', 'user_id');
  pgm.createIndex('attendances', 'visit_date');
  pgm.createIndex('attendances', 'status');
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const down = (pgm) => {
  pgm.dropTable('attendances');
};
