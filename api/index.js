/**
 * Entry point untuk Vercel Serverless.
 * Express app di-export sebagai default — Vercel yang menangani listen().
 *
 * Untuk development lokal tetap gunakan `npm run dev` (server.js).
 */
import 'dotenv/config'
import app from '../app.js'

export default app
