# Pagos

Base inicial para un sistema web de ventas y cobranza con `FastAPI` y `React`.

## Estructura

- `backend/`: API, modelos, servicios y configuración del servidor.
- `frontend/`: aplicación React para ventas, cobranza y dashboard.

## Arranque local

Backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Variables de entorno backend:

```bash
cp .env.example .env
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Variables de entorno frontend:

```bash
cp .env.example .env
```

La base de datos usa `SQLite` local por defecto en `backend/pagos.db`.

## Credenciales iniciales

Las credenciales iniciales y la clave JWT viven en `backend/.env`.
Si no existe ese archivo, puedes crearlo desde `backend/.env.example`.

## Git y CI/CD

El proyecto ya queda preparado para subirlo a GitHub con una base simple de CI/CD:

- `/.github/workflows/ci.yml`: valida backend y frontend en cada `push` y `pull_request`.
- `/.github/workflows/release-artifacts.yml`: en `main` o manualmente genera artefactos del frontend y backend.
- `/netlify.toml`: configuracion de build y routing para desplegar el frontend en Netlify.

### Que valida CI

- Backend: instala dependencias y compila `backend/app`.
- Frontend: instala dependencias y ejecuta `npm run build`.

### Que entrega CD

- `frontend-dist.tar.gz`: build del frontend listo para hosting estatico.
- `backend-release.tar.gz`: codigo backend y archivos base para despliegue.

### Siguiente paso recomendado

1. Inicializa el repositorio Git si aun no existe.
2. Sube el proyecto a GitHub.
3. Configura el flujo de despliegue final segun tu hosting.

El flujo actual resuelve integracion continua y entrega de artefactos. El despliegue final depende del proveedor donde alojes frontend y backend.

## Produccion

Consulta `DEPLOYMENT.md` para la estrategia recomendada:

- frontend en Netlify desde GitHub
- backend FastAPI en hosting compatible con Python
- variable de entorno `VITE_API_BASE_URL` configurada en Netlify
- soporte para `FRONTEND_ORIGINS_RAW` si expones temporalmente el backend con `ngrok`

## Estado actual

1. Registro de ventas con cliente, producto, evento, asesor e inicial.
2. Generación automática de cuotas cuando la inicial queda completa.
3. Registro de pagos de inicial y de cuotas.
