#!/usr/bin/env bash
# scripts/dev-up.sh
# Starts local dev infrastructure (Postgres + pgAdmin) and runs migrations.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ── 1. Check .env exists ──────────────────────────────────────────
if [ ! -f "$ROOT_DIR/.env" ]; then
  echo "[dev-up] ERROR: .env not found. Copy .env.example and fill in values:"
  echo "         cp .env.example .env"
  exit 1
fi

# ── 2. Start services ─────────────────────────────────────────────
echo "[dev-up] Starting Postgres and pgAdmin..."
docker compose -f "$ROOT_DIR/docker-compose.yml" up -d

# ── 3. Wait for Postgres to be healthy ───────────────────────────
echo "[dev-up] Waiting for Postgres to be ready..."
until docker compose -f "$ROOT_DIR/docker-compose.yml" exec db \
  pg_isready -U "${DB_USER:-taskuser}" -d "${DB_NAME:-taskmanager}" \
  > /dev/null 2>&1; do
  sleep 2
done
echo "[dev-up] Postgres is ready."

# ── 4. Run migrations ─────────────────────────────────────────────
echo "[dev-up] Running migrations..."
npm run migrate --workspace=backend

echo ""
echo "[dev-up] Done."
echo "  Postgres  → localhost:${DB_PORT:-5432}"
echo "  pgAdmin   → http://localhost:${PGADMIN_PORT:-5050}"
