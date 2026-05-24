/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const up = (pgm) => {
  pgm.createTable('point_redemptions', {
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
    points_redeemed: {
      type: 'integer',
      notNull: true,
      default: 10,
    },
    status: {
      type: 'varchar(10)',
      notNull: true,
      default: 'pending',
      check: "status IN ('pending', 'approved', 'rejected')",
    },
    admin_notes: {
      type: 'text',
    },
    processed_by: {
      type: 'varchar(21)',
      references: '"users"',
      comment: 'ID admin yang memproses penukaran',
    },
    processed_at: {
      type: 'timestamptz',
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

  pgm.createIndex('point_redemptions', 'user_id');
  pgm.createIndex('point_redemptions', 'status');
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const down = (pgm) => {
  pgm.dropTable('point_redemptions');
};
