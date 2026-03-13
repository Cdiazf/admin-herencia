# Deployment Guide

## Recommended Structure

- `frontend`: static build deployed to a traditional hosting space like IONOS Webspace.
- `backend`: deploy separately to a Python-capable host. Do not rely on PHP webspace for FastAPI.

## Frontend Production Variables

Create production values from:

- `frontend/.env.production.example`

Required:

- `VITE_API_BASE_URL`

Example:

```env
VITE_API_BASE_URL=https://api.your-domain.com/api
```

## GitHub Actions Workflows

- `.github/workflows/ci.yml`: validation on every push and pull request
- `.github/workflows/release-artifacts.yml`: builds release tarballs on `main`
- `.github/workflows/deploy-frontend-static.yml`: manual frontend deployment to static hosting

## GitHub Secrets For Frontend Deploy

Set these repository secrets before running the deploy workflow:

- `VITE_API_BASE_URL`
- `FRONTEND_HOST`
- `FRONTEND_PORT`
- `FRONTEND_USERNAME`
- `FRONTEND_PASSWORD`
- `FRONTEND_TARGET_PATH`

## IONOS Static Frontend Deployment

This workflow is designed for a static frontend deployment over SSH/SFTP-compatible hosting.

Target example:

- `FRONTEND_HOST`: your host access server
- `FRONTEND_PORT`: `22`
- `FRONTEND_TARGET_PATH`: the web root or subdirectory where static files must be uploaded

The workflow:

1. installs frontend dependencies
2. creates `.env.production`
3. builds `frontend/dist`
4. uploads the static files to the remote hosting path

## Backend Deployment

Your current backend is FastAPI + SQLite. For production, use a Python-capable runtime.

Recommended options:

- VPS with `systemd`
- Railway
- Render
- Fly.io
- any server where `uvicorn` or `gunicorn` can run persistently

Current repository support:

- release artifact for backend source
- `.env.example` for secure environment configuration

## Important Notes

- `backend/.env` is intentionally excluded from Git.
- `backend/*.db` is now ignored for future commits.
- the already committed `backend/pagos.db` remains in Git history unless you remove it in a later commit or rewrite history.
- for production, prefer PostgreSQL or MySQL over SQLite.
