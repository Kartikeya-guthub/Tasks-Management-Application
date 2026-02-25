<h1 align="center">
  📋 Task Management Application
</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18.x-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Deployed%20on-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white" />
  <img src="https://img.shields.io/badge/Frontend%20on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
  <img src="https://img.shields.io/github/actions/workflow/status/Kartikeya-guthub/Tasks-Management-Application/ci.yml?style=for-the-badge&label=CI&logo=github-actions" />
</p>

<p align="center">
  <b>A production-ready full-stack Task Management app with JWT auth, AES-256-GCM field encryption, refresh token rotation, and full CRUD with search, filter &amp; pagination.</b>
</p>

---

## 🔗 Live Links

| | URL |
|---|---|
| 🌐 **Frontend (Vercel)** | https://task-management-application-taupe.vercel.app |
| ⚙️ **Backend API (Render)** | https://tasks-management-application.onrender.com |
| 💻 **GitHub Repository** | https://github.com/Kartikeya-guthub/Tasks-Management-Application |

---

## 📑 Table of Contents

- [Architecture](#-architecture)
- [Security Decisions](#-security-decisions)
- [Prerequisites](#-prerequisites)
- [Quick Start (Local)](#-quick-start-local)
- [Environment Variables](#-environment-variables)
- [Available Scripts](#-available-scripts)
- [Database Migrations](#-database-migrations)
- [Running Tests](#-running-tests)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      User's Browser                          │
│              React 18 + Vite  (Vercel CDN)                   │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Login   │  │ Register │  │  Tasks   │  │Protected │    │
│  │  Page    │  │  Page    │  │  List    │  │  Route   │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
└───────┼─────────────┼─────────────┼──────────────┼──────────┘
        │ HTTPS REST /api/*  credentials: include (HttpOnly cookies)
        ▼             ▼             ▼               ▼
┌──────────────────────────────────────────────────────────────┐
│               Express Backend (Render Web Service)           │
│                                                              │
│  ┌────────────────┐   ┌────────────────┐                    │
│  │  Auth Routes   │   │  Task Routes   │                    │
│  │ /api/auth/*    │   │  /api/tasks/*  │                    │
│  └───────┬────────┘   └───────┬────────┘                    │
│  ┌───────▼────────────────────▼──────┐                      │
│  │     authMiddleware (JWT verify)   │                      │
│  └───────────────────┬──────────────┘                      │
│  ┌───────────────────▼──────────────┐                      │
│  │    AES-256-GCM Field Encryption  │                      │
│  │  encrypt description on write   │                      │
│  │  decrypt description on read    │                      │
│  └───────────────────┬──────────────┘                      │
└──────────────────────┼───────────────────────────────────────┘
                       │ node-postgres (pg)
                       ▼
┌──────────────────────────────────────────────────────────────┐
│              PostgreSQL 15 (Render Managed DB)               │
│                                                              │
│  ┌──────────┐   ┌─────────────────┐   ┌──────────────────┐  │
│  │  users   │   │     tasks       │   │ refresh_tokens   │  │
│  │ id(uuid) │   │ id (uuid)       │   │ token (hashed)   │  │
│  │ email    │   │ user_id (fk)    │   │ user_id          │  │
│  │ password │   │ title           │   │ expires_at       │  │
│  │ (bcrypt) │   │ description*    │   │ revoked          │  │
│  └──────────┘   │ status (enum)   │   └──────────────────┘  │
│                 │ created_at      │                          │
│                 └─────────────────┘                          │
│   * description stored as AES-256-GCM ciphertext             │
└──────────────────────────────────────────────────────────────┘
```

### Layer Summary

| Layer | Technology | Host |
|---|---|---|
| Frontend | React 18, Vite 5, React Router v6 | Vercel |
| Backend | Node 18, Express 4, pino logging | Render |
| Database | PostgreSQL 15 | Render Managed |
| Auth | JWT (access 15m + refresh 7d) | HttpOnly cookies |
| Encryption | AES-256-GCM (task description) | In-process |
| CI/CD | GitHub Actions | GitHub |

---

## 🔐 Security Decisions

### 1. JWT in HttpOnly Cookies
Access tokens (15 min TTL) and refresh tokens (7 days) are stored in `HttpOnly; Secure; SameSite=None` cookies — never in `localStorage`. This prevents XSS token theft.

### 2. Refresh Token Rotation
Every `/api/auth/refresh` call issues a **new** refresh token and revokes the old one in the `refresh_tokens` table. Reuse of an old token is rejected with `401`.

### 3. AES-256-GCM Field Encryption
Task `description` is encrypted at rest using AES-256-GCM with a fresh 12-byte IV per write. The stored format is `base64(iv + authTag + ciphertext)`. The key (`FIELD_ENC_KEY`) is a 64-char hex env var — never in source code.

### 4. Password Hashing
Passwords are hashed with `bcryptjs` at cost factor **12** before storage. Plain passwords never touch the database.

### 5. CORS Locked Down
CORS `origin` is set to `FRONTEND_URL` env var only. No wildcards. `credentials: true` for cookie support.

### 6. Parameterized Queries
All SQL uses `pg` parameterized queries (`$1, $2, ...`). No string concatenation in SQL — eliminates SQL injection.

### 7. Helmet + Body Limit
`helmet()` sets 11 security headers (CSP, HSTS, X-Frame-Options, etc.). Body size limited to `10kb`.

---

## ✅ Prerequisites

| Tool | Minimum Version |
|---|---|
| Node.js | 18.x |
| npm | 9.x |
| Docker + Docker Compose v2 | 24.x |

---

## 🚀 Quick Start (Local)

```bash
# 1. Clone the repo
git clone https://github.com/Kartikeya-guthub/Tasks-Management-Application.git
cd Tasks-Management-Application

# 2. Install all dependencies (root + workspaces)
npm ci

# 3. Copy and fill environment variables
cp .env.example .env
# Edit .env — fill in DATABASE_URL, JWT_SECRET, REFRESH_SECRET, FIELD_ENC_KEY

# 4. Start Docker Postgres
docker compose up -d db

# 5. Run database migrations
npm run migrate

# 6. Start backend + frontend in watch mode
npm run dev
#  backend  → http://localhost:5000
#  frontend → http://localhost:5173
```

---

## 🌍 Environment Variables

Copy `.env.example` → `.env` and fill in values. **Never commit `.env`.**

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5435/db` |
| `JWT_SECRET` | Signs access tokens | 64-char hex string |
| `REFRESH_SECRET` | Signs refresh tokens | 64-char hex string |
| `FIELD_ENC_KEY` | AES-256-GCM key for encryption | 64-char hex string |
| `CLIENT_ORIGIN` | CORS origin (local dev) | `http://localhost:5173` |
| `FRONTEND_URL` | CORS origin (production) | `https://your-app.vercel.app` |
| `NODE_ENV` | Environment | `development` / `production` |
| `LOG_LEVEL` | Pino log level | `info` |
| `PORT` | Express port | `5000` |

**Frontend (Vercel only)**

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://tasks-management-application.onrender.com` |

---

## 📜 Available Scripts

Run from the **repo root**:

| Script | Description |
|---|---|
| `npm run dev` | Start backend + frontend in watch mode |
| `npm run migrate` | Run pending SQL migrations |
| `npm run test` | Run all backend integration tests |
| `npm run lint` | ESLint all workspaces |
| `npm run build` | Production build (frontend) |

---

## 🗄 Database Migrations

```bash
# Apply all pending migrations
npm run migrate

# Migration files (backend/migrations/)
# 001_create_users.sql
# 002_create_tasks.sql          — includes task_status ENUM + indexes
# 003_create_refresh_tokens.sql
```

Migrations are tracked in a `schema_migrations` table. Already-applied files are skipped automatically.

---

## 🧪 Running Tests

```bash
# Run all backend integration tests (28 auth + tasks CRUD tests)
npm run test
```

Tests use a separate Docker Postgres on port `5436`. CI runs on every push to `main` via GitHub Actions.

---

## 📡 API Reference

**Base URL:** `https://tasks-management-application.onrender.com`

### Auth Routes

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login, receive cookies |
| `POST` | `/api/auth/refresh` | Rotate tokens |
| `POST` | `/api/auth/logout` | Revoke token, clear cookies |
| `GET` | `/api/auth/me` | Get current user |

### Task Routes (all require auth cookie)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tasks` | List tasks (paginated, filterable, searchable) |
| `POST` | `/api/tasks` | Create task |
| `GET` | `/api/tasks/:id` | Get single task |
| `PUT` | `/api/tasks/:id` | Update task |
| `DELETE` | `/api/tasks/:id` | Delete task |

### cURL Examples

```bash
# Register
curl -c cookies.txt -X POST https://tasks-management-application.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo1234"}'
# Response 201: {"message":"User registered successfully","user":{"id":"...","email":"demo@example.com"}}

# Login
curl -c cookies.txt -X POST https://tasks-management-application.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo1234"}'
# Response 200: {"message":"Login successful","user":{"id":"...","email":"demo@example.com"}}

# Create Task
curl -b cookies.txt -X POST https://tasks-management-application.onrender.com/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Fix bug","description":"Token expiry issue","status":"todo"}'
# Response 201: {"id":"...","title":"Fix bug","description":"Token expiry issue","status":"todo","created_at":"..."}

# List Tasks (search + filter + paginate)
curl -b cookies.txt \
  "https://tasks-management-application.onrender.com/api/tasks?status=todo&search=fix&page=1&limit=5"
# Response 200: {"data":[...],"meta":{"total":3,"page":1,"limit":5,"totalPages":1}}

# Refresh Tokens
curl -b cookies.txt -c cookies.txt -X POST \
  https://tasks-management-application.onrender.com/api/auth/refresh
# Response 200: {"message":"Tokens refreshed"}

# Logout
curl -b cookies.txt -X POST https://tasks-management-application.onrender.com/api/auth/logout
# Response 200: {"message":"Logged out"}
```

### Error Response Format

All errors follow a consistent structure:

```json
{
  "error": {
    "message": "Human-readable message",
    "code": "MACHINE_READABLE_CODE"
  }
}
```

Common error codes: `EMAIL_TAKEN`, `INVALID_CREDENTIALS`, `UNAUTHORIZED`, `NOT_FOUND`, `INVALID_STATUS`.

---

## 🚢 Deployment

| Service | Platform | Trigger |
|---|---|---|
| Frontend | Vercel | Auto-deploys on push to `main` |
| Backend | Render Web Service | Auto-deploys on push to `main` |
| Database | Render PostgreSQL | Managed |

**Backend env vars (set on Render → Environment):**

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Render internal DB URL |
| `JWT_SECRET` | 64-char hex |
| `REFRESH_SECRET` | 64-char hex |
| `FIELD_ENC_KEY` | 64-char hex |
| `FRONTEND_URL` | `https://task-management-application-taupe.vercel.app` |

**Frontend env var (set on Vercel → Settings → Environment Variables):**

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://tasks-management-application.onrender.com` |

> 💡 **Tip:** Render free tier sleeps after 15 min of inactivity. Use [UptimeRobot](https://uptimerobot.com) to ping `/health` every 5 minutes to keep the server warm.

---

<p align="center">Built with ❤️ — Node.js · Express · React · PostgreSQL · Render · Vercel</p>
