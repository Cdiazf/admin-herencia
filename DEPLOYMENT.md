# Deployment Guide

## Recommended Structure

- `frontend`: deploy on Netlify from this GitHub repository.
- `backend`: deploy separately to a Python-capable host. Do not try to run this FastAPI backend directly on Netlify as a persistent app.

## Frontend Production Variables

Create production values from:

- `frontend/.env.production.example`

Required:

- `VITE_API_BASE_URL`

Example:

```env
VITE_API_BASE_URL=https://api.your-domain.com/api
```

## Netlify Frontend Deployment

This repository now includes:

- `netlify.toml`

Configured values:

- base directory: `frontend`
- build command: `npm ci && npm run build`
- publish directory: `dist`
- SPA redirect: all routes to `/index.html`

This matches Netlify file-based configuration guidance and is intended for the React + Vite frontend.

## Netlify Environment Variable

Set this variable in the Netlify UI with scope including Builds:

- `VITE_API_BASE_URL`

Example:

```env
VITE_API_BASE_URL=https://api.your-domain.com/api
```

Netlify build docs note that build-time variables should be set in the Netlify UI, CLI, or API instead of relying on local `.env` files during hosted builds.

## GitHub Actions Workflows

- `.github/workflows/ci.yml`: validation on every push and pull request
- `.github/workflows/release-artifacts.yml`: builds release tarballs on `main`

## Backend Deployment

Your current backend is FastAPI + SQLite. For production, use a Python-capable runtime.

Recommended options:

- VPS with `systemd`
- Railway
- Render
- Fly.io
- any server where `uvicorn` or `gunicorn` can run persistently

## Important Notes

- `backend/.env` is intentionally excluded from Git.
- `backend/*.db` is now ignored for future commits.
- the already committed `backend/pagos.db` remains in Git history unless you remove it in a later commit or rewrite history.
- for production, prefer PostgreSQL or MySQL over SQLite.
