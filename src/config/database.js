import pg from 'pg'

const { Pool } = pg

/**
 * Konfigurasi pool disesuaikan untuk serverless (Vercel).
 * max: 3 — Vercel function bisa banyak instance paralel,
 *           jumlah koneksi kecil mencegah exhausted connection di PostgreSQL.
 *
 * Untuk Railway / VPS tradisional, naikkan max ke 10-20.
 */
const isServerless = process.env.VERCEL === '1'

const pool = new Pool({
  host:     process.env.PGHOST,
  port:     parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE,
  user:     process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: process.env.PGSSL === 'true' || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max:                isServerless ? 3 : 20,
  idleTimeoutMillis:  isServerless ? 10000 : 30000,
  connectionTimeoutMillis: 5000,
})

pool.on('error', (err) => {
  console.error('[DB] Unexpected idle client error:', err.message)
})

export default pool
