# Task Management Application

A full-stack task management app built with **Express** (backend) and **React + Vite** (frontend), containerised with Docker Compose.

---

## Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start (local)](#quick-start-local)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Running with Docker](#running-with-docker)
- [Database Migrations](#database-migrations)
- [Running Tests](#running-tests)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Client Browser                │
└────────────────────────┬────────────────────────┘
                         │ HTTP / WebSocket
┌────────────────────────▼────────────────────────┐
│           frontend/  (React + Vite)             │
│           Served on  :5173 (dev)                │
└────────────────────────┬────────────────────────┘
                         │ REST API  /api/*
┌────────────────────────▼────────────────────────┐
│           backend/   (Express + Node)           │
│           Listens on :5000                      │
│                                                 │
│  ┌──────────────┐   ┌──────────────────────┐   │
│  │  PostgreSQL  │   │  Redis (optional)    │   │
│  │  :5432       │   │  :6379               │   │
│  └──────────────┘   └──────────────────────┘   │
└─────────────────────────────────────────────────┘
```

| Layer     | Technology              | Directory    |
|-----------|-------------------------|--------------|
| Frontend  | React 18, Vite, Axios   | `frontend/`  |
| Backend   | Node 18, Express 4      | `backend/`   |
| Database  | PostgreSQL 15           | Docker       |
| Cache     | Redis 7 (optional)      | Docker       |

---

## Prerequisites

| Tool       | Minimum version |
|------------|-----------------|
| Node.js    | 18.x            |
| npm        | 9.x             |
| Docker     | 24.x            |
| Docker Compose | v2 plugin   |

---

## Quick Start (local)

```bash
# 1. Clone the repo
git clone https://github.com/<your-org>/task-management-application.git
cd task-management-application

# 2. Switch to the dev branch (optional)
git checkout dev

# 3. Install all dependencies (root + workspaces)
npm ci

# 4. Copy and fill in environment variables
cp .env.example .env
# Edit .env — replace every placeholder value

# 5. Start both servers in watch mode
npm run dev
#   backend  → http://localhost:5000
#   frontend → http://localhost:5173
```

---

## Environment Variables

All required variables are documented in [.env.example](.env.example).  
**Never commit a real `.env` file.**  Copy `.env.example` → `.env` and fill in your own values.

Key variables:

| Variable          | Description                        |
|-------------------|------------------------------------|
| `PORT`            | Express server port (default 5000) |
| `DATABASE_URL`    | PostgreSQL connection string       |
| `JWT_SECRET`      | Secret for signing JWT tokens      |
| `VITE_API_BASE_URL` | API base URL consumed by Vite    |

---

## Available Scripts

Run from the **repo root**:

| Script              | Description                                  |
|---------------------|----------------------------------------------|
| `npm run dev`       | Start backend + frontend in development mode |
| `npm run start`     | Start backend in production mode             |
| `npm run migrate`   | Run database migrations                      |
| `npm run test`      | Run all tests (backend + frontend)           |
| `npm run lint`      | Lint all workspaces                          |

---

## Running with Docker

```bash
# Build and start all services (postgres, redis, backend, frontend)
docker compose up --build

# Run in detached mode
docker compose up -d --build

# Stop all services
docker compose down

# Destroy volumes (wipes DB data)
docker compose down -v
```

Services exposed on localhost:

| Service    | Port  |
|------------|-------|
| Frontend   | 5173  |
| Backend    | 5000  |
| PostgreSQL | 5432  |
| Redis      | 6379  |

---

## Database Migrations

```bash
# Apply pending migrations
npm run migrate

# (Inside backend workspace directly)
cd backend
npm run migrate
```

---

## Running Tests

```bash
# All workspaces
npm run test

# Backend only
npm run test --workspace=backend

# Frontend only
npm run test --workspace=frontend
```

---

## Deployment

**Live URLs**

| Service | URL |
|---|---|
| Frontend | `https://your-app.vercel.app` *(update after deploy)* |
| Backend | `https://your-api.onrender.com` *(update after deploy)* |

**Stack**
- Frontend → [Vercel](https://vercel.com) (free)
- Backend → [Render](https://render.com) Web Service (free)
- Database → Render PostgreSQL (free)

**Backend environment variables (set on Render)**

| Key | Value |
|---|---|
| `DATABASE_URL` | Render internal DB URL |
| `JWT_SECRET` | long random string |
| `REFRESH_SECRET` | different long random string |
| `FIELD_ENC_KEY` | 64-char hex string |
| `FRONTEND_URL` | `https://your-app.vercel.app` |
| `NODE_ENV` | `production` |
| `LOG_LEVEL` | `info` |

**Frontend environment variable (set on Vercel)**

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://your-api.onrender.com` |

**Deployment notes**
- Cookies use `SameSite=None; Secure` in production for cross-origin support
- CORS is restricted to `FRONTEND_URL` — no wildcards
- PostgreSQL SSL enabled (`rejectUnauthorized: false`) for Render
- `trust proxy` enabled so Express sees the real client IP behind Render's proxy
- Render free tier sleeps after 15 min inactivity — first request may take ~30s

---

## Contributing

1. Fork the repo and create a feature branch off `dev`.
2. Follow the [PR template](.github/PULL_REQUEST_TEMPLATE.md).
3. Ensure `npm run test` and `npm run lint` pass before opening a PR.
4. Target the `dev` branch for all pull requests.
