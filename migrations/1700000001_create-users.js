/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const up = (pgm) => {
  pgm.createTable('users', {
    id: {
      type: 'varchar(21)',
      primaryKey: true,
      notNull: true,
    },
    name: {
      type: 'varchar(100)',
      notNull: true,
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    phone: {
      type: 'varchar(20)',
      notNull: true,
      unique: true,
    },
    institution: {
      type: 'varchar(200)',
    },
    photo_url: {
      type: 'text',
    },
    password_hash: {
      type: 'text',
      notNull: true,
    },
    role: {
      type: 'varchar(10)',
      notNull: true,
      default: 'user',
      check: "role IN ('user', 'admin')",
    },
    total_points: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    total_visits: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
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

  pgm.createIndex('users', 'email');
  pgm.createIndex('users', 'phone');
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const down = (pgm) => {
  pgm.dropTable('users');
};
