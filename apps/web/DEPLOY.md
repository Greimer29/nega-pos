# Web — no deploy en Railway

Esta app corre **solo en local** (`pnpm dev:web` o build estático para embeber en desktop).

- API remota: definir `VITE_API_URL` en `.env` (URL HTTPS de Railway).
- La API debe tener `FRONTEND_URL=http://localhost:5173` para CORS y cookies.
- No existe `railway.toml` para web — el proyecto Railway solo incluye **MySQL + API**.

Ver `docs/RAILWAY_DEPLOY.md`.
