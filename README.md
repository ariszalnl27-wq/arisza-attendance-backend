# 📚 Library Attendance & Points API

REST API untuk sistem kehadiran dan pengelolaan poin pengunjung perpustakaan.

---

## 🛠️ Tech Stack

| Layer        | Teknologi                                   |
|--------------|---------------------------------------------|
| Runtime      | Node.js ≥ 18                                |
| Module Type  | ES Module (`"type": "module"`)              |
| Framework    | Express.js                                  |
| Database     | PostgreSQL + `pg` Pool                      |
| Migration    | `node-pg-migrate`                           |
| Validation   | Joi                                         |
| Auth         | JWT (Access 15m + Refresh 7d) + Google OAuth|
| ID           | `nanoid` v3                                 |
| Email        | Nodemailer + Mailtrap                       |
| Upload       | Multer (memoryStorage) + Cloudinary         |
| QR Code      | `qrcode`                                    |
| Export       | ExcelJS (.xlsx)                             |
| Deploy       | **Vercel** (serverless) atau Railway (Docker)|

---

## 📁 Struktur Proyek

```
library-attendance-api/
├── api/
│   └── index.js               # Entry point Vercel serverless
├── migrations/
│   ├── 1700000001_create-users.js
│   ├── 1700000002_create-refresh-tokens.js
│   ├── 1700000003_create-password-reset-tokens.js
│   ├── 1700000004_create-attendances.js
│   ├── 1700000005_create-point-redemptions.js
│   ├── 1700000006_add-google-auth.js
│   └── 1700000007_add-attendance-activity.js
├── src/
│   ├── config/
│   │   ├── cloudinary.js      # Cloudinary SDK config
│   │   ├── database.js        # pg Pool (serverless-aware)
│   │   └── mailtrap.js
│   ├── controllers/
│   ├── middlewares/
│   │   └── uploadMiddleware.js  # multer memoryStorage
│   ├── routes/
│   ├── services/
│   └── utils/
├── app.js                     # Express app (tanpa listen)
├── server.js                  # Entry dev lokal (listen)
├── vercel.json                # Vercel routing config
├── Dockerfile                 # Untuk Railway / VPS
├── database.json              # node-pg-migrate config
└── .env.example
```

---

## ⚙️ Setup Lokal

```bash
git clone <repo-url>
cd library-attendance-api
npm install
cp .env.example .env
# Edit .env
npm run migrate:up
npm run dev
```

---

## 🚀 Deploy ke Vercel

### 1. Persiapan layanan eksternal

**PostgreSQL** — gunakan salah satu:
- [Neon](https://neon.tech) ← recommended (free tier, serverless-native)
- [Supabase](https://supabase.com) (free tier)
- [Railway](https://railway.app) (PostgreSQL saja, bukan deploy app)

**Cloudinary** — untuk upload foto profil:
1. Daftar gratis di [cloudinary.com](https://cloudinary.com)
2. Dashboard → Settings → Access Keys
3. Salin `Cloud Name`, `API Key`, `API Secret`

**Mailtrap** — untuk email (dev & staging):
1. Daftar di [mailtrap.io](https://mailtrap.io)
2. Email Testing → Inboxes → SMTP Settings → pilih Nodemailer
3. Salin `Host`, `Port`, `Username`, `Password`

### 2. Jalankan migration

Migration **harus dijalankan manual** sebelum deploy, karena Vercel tidak menjalankan shell command saat build.

```bash
# Pastikan .env sudah terisi dengan kredensial PostgreSQL production
npm run migrate:up
```

Atau jalankan dari Neon/Supabase SQL editor menggunakan SQL dari migration files.

### 3. Deploy ke Vercel

```bash
npm i -g vercel
vercel login
vercel
```

Saat prompted, pilih:
- Framework Preset: **Other**
- Build Command: *(kosong)*
- Output Directory: *(kosong)*
- Install Command: `npm install`

### 4. Set Environment Variables di Vercel

Di [vercel.com](https://vercel.com) → Project → Settings → Environment Variables, tambahkan semua variable dari `.env.example`:

```
PGHOST          = ep-xxx.us-east-1.aws.neon.tech
PGPORT          = 5432
PGDATABASE      = library_db
PGUSER          = postgres
PGPASSWORD      = xxx
PGSSL           = true

JWT_ACCESS_SECRET  = ...
JWT_REFRESH_SECRET = ...
JWT_ACCESS_EXPIRES_IN = 15m
JWT_REFRESH_EXPIRES_IN = 7d

MAILTRAP_HOST   = sandbox.smtp.mailtrap.io
MAILTRAP_PORT   = 2525
MAILTRAP_USER   = ...
MAILTRAP_PASS   = ...
MAIL_FROM       = noreply@library.app
MAIL_FROM_NAME  = Library System

APP_URL         = https://library-api.vercel.app
FRONTEND_URL    = https://library-frontend.vercel.app

QR_CHECKIN_TOKEN  = ...
QR_CHECKOUT_TOKEN = ...

GOOGLE_CLIENT_ID     = ...
CLOUDINARY_CLOUD_NAME = ...
CLOUDINARY_API_KEY    = ...
CLOUDINARY_API_SECRET = ...
```

### 5. Re-deploy

```bash
vercel --prod
```

---

## 🐳 Deploy ke Railway (alternatif Docker)

1. Push ke GitHub
2. Buat project baru di [Railway](https://railway.app)
3. Tambah **PostgreSQL** service → salin env vars individual
4. Set semua environment variables
5. Railway otomatis detect `Dockerfile` dan build

> Untuk Railway, `PGSSL=true` dan `CLOUDINARY_*` tetap diperlukan.

---

## 🌐 API Endpoints

**Base URL:** `https://your-app.vercel.app/api`

### Auth `/api/auth`
| Method | Endpoint           | Deskripsi                      |
|--------|--------------------|--------------------------------|
| POST   | `/register`        | Registrasi dengan email        |
| POST   | `/login`           | Login email/telepon + password |
| POST   | `/google`          | Login / register via Google    |
| POST   | `/refresh-token`   | Perbarui access token          |
| POST   | `/logout`          | Logout (hapus refresh token)   |
| POST   | `/logout-all`      | Logout semua perangkat         |
| POST   | `/forgot-password` | Kirim link reset ke email      |
| POST   | `/reset-password`  | Reset password via token       |

### User `/api/users`
| Method | Endpoint          | Deskripsi                |
|--------|-------------------|--------------------------|
| GET    | `/profile`        | Lihat profil             |
| PUT    | `/profile`        | Update profil            |
| POST   | `/profile/photo`  | Upload foto (→ Cloudinary)|
| PUT    | `/change-password`| Ganti password           |

### Attendance `/api/attendance`
| Method | Endpoint                  | Deskripsi                        |
|--------|---------------------------|----------------------------------|
| POST   | `/check-in`               | Check-in dengan QR token + activity|
| POST   | `/check-out`              | Check-out dengan QR token        |
| GET    | `/today`                  | Status kehadiran hari ini        |
| GET    | `/history`                | Riwayat kehadiran                |
| GET    | `/points`                 | Ringkasan poin                   |
| POST   | `/points/redeem`          | Ajukan penukaran poin            |
| GET    | `/points/redemptions`     | Riwayat penukaran                |

### Admin `/api/admin`
| Method | Endpoint                  | Deskripsi                        |
|--------|---------------------------|----------------------------------|
| GET    | `/dashboard`              | Statistik keseluruhan            |
| GET    | `/qr`                     | QR code statis check-in/checkout |
| GET    | `/users`                  | Daftar pengguna                  |
| GET    | `/users/export`           | Export Excel (.xlsx)             |
| GET    | `/users/:id`              | Detail pengguna                  |
| PUT    | `/users/:id`              | Update pengguna                  |
| DELETE | `/users/:id`              | Nonaktifkan pengguna             |
| GET    | `/attendances`            | Semua data kehadiran             |
| PUT    | `/attendances/:id`        | Approve / reject kehadiran       |
| GET    | `/redemptions`            | Daftar penukaran poin            |
| PUT    | `/redemptions/:id`        | Proses penukaran                 |
| POST   | `/create-admin`           | Buat akun admin baru             |

---

## ⚠️ Catatan Vercel Serverless

| Aspek | Penjelasan |
|---|---|
| **Cold start** | Request pertama setelah idle ~1-2 detik lebih lambat |
| **Timeout** | Default 10 detik per request (bisa dinaikkan ke 60 di Pro) |
| **Filesystem** | Read-only — foto disimpan ke Cloudinary, bukan disk |
| **Migration** | Harus dijalankan manual (`npm run migrate:up`) sebelum deploy |
| **Koneksi DB** | Pool max 3 untuk mencegah connection exhaustion |
