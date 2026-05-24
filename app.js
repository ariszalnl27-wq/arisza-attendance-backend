import express from 'express'
import cors from 'cors'

import authRoutes       from './src/routes/authRoutes.js'
import userRoutes       from './src/routes/userRoutes.js'
import attendanceRoutes from './src/routes/attendanceRoutes.js'
import adminRoutes      from './src/routes/adminRoutes.js'
import { errorHandler, notFound } from './src/middlewares/errorHandler.js'

const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Static /uploads TIDAK diperlukan lagi — foto disimpan di Cloudinary.
// Untuk development lokal tanpa Cloudinary, bisa aktifkan kembali baris di bawah:
// import { join } from 'path'
// app.use('/uploads', express.static(join(process.cwd(), 'uploads')))

app.use('/api/auth',       authRoutes)
app.use('/api/users',      userRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/admin',      adminRoutes)

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() })
})

app.use(notFound)
app.use(errorHandler)

export default app
