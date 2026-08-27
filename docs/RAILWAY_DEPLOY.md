# Despliegue en Railway — Nega POS (solo API + MySQL)

Railway despliega **únicamente**:

| Servicio en Railway | Sí |
|---------------------|-----|
| `nega-pos-mysql` (plugin MySQL) | ✅ |
| `nega-pos-api` (Docker desde GitHub) | ✅ |
| Web (`apps/web`) | ❌ **local** (`pnpm dev:web`) |
| Desktop (Electron) | ❌ **local** (build en PC) |
| Mobile (APK Capacitor) | ❌ **local** (build en PC) |

Los clientes web, desktop y Android corren en la máquina del usuario y se conectan por HTTPS a la API pública en Railway.

---

## Arquitectura

```
GitHub (main) ──Docker──► Railway
                              ├── nega-pos-mysql  (persistente)
                              └── nega-pos-api    (Dockerfile)
                                    ├── preDeploy: migration:run --force
                                    ├── start: entrypoint → db:bootstrap → server
                                    └── Volume /data/uploads (imágenes/PDFs)

PC local ──HTTPS──► https://TU-API.up.railway.app
  ├── Web:     pnpm dev:web  (localhost:5173)
  ├── Desktop: Electron + api-url.json
  └── Android: APK Capacitor (VITE_API_URL al buildear)
```

| Servicio | Persistencia |
|----------|--------------|
| MySQL | Persistente (plugin Railway) |
| Uploads API | **Solo** con Volume en `/data/uploads` |
| Contenedor API | Efímero (cada redeploy = nueva imagen) |

**No crear** servicios adicionales en Railway para web, desktop ni mobile.

---

## Archivos del repo

| Archivo | Rol |
|---------|-----|
| `apps/api/Dockerfile` | Imagen producción + entrypoint |
| `apps/api/railway.toml` | Config-as-code **solo servicio API** |
| `apps/api/.env.railway.example` | Variables para Railway |
| `apps/api/bin/docker-entrypoint.sh` | Storage + bootstrap + server |
| `apps/api/commands/db_bootstrap.ts` | Seed solo si `users` está vacío |
| `scripts/railway-setup-uploads-volume.ps1` | Volume CLI |

---

## Reglas (no negociables)

1. **Solo 2 servicios** en el proyecto Railway: MySQL + API.
2. **Migraciones** → `preDeployCommand` en `railway.toml` (`migration:run --force`).
3. **Seeders** → `db:bootstrap` en entrypoint (solo BD vacía). No `db:seed` en cada redeploy.
4. **Uploads** → Volume `/data/uploads` + `STORAGE_LOCAL_PATH=/data/uploads`.
5. **Root Directory** del servicio API = raíz del monorepo (vacío).
6. **`FRONTEND_URL`** = `http://localhost:5173` (web local). No desplegar web en Railway.
7. **No rotar `APP_KEY`** después de producción.

---

## Paso 1 — Proyecto y MySQL

1. [Railway](https://railway.com) → **New Project** → conectar repo GitHub (`main`).
2. **Add → Database → MySQL** (`nega-pos-mysql`).
3. Esperar estado **Online**.

---

## Paso 2 — Servicio API (único servicio de app)

1. **Add Service → GitHub Repo** → mismo repo → `nega-pos-api`.
2. **No agregar** otro servicio para `apps/web`, desktop ni mobile.
3. **Settings**:

| Setting | Valor |
|---------|--------|
| Root Directory | *(vacío — raíz del monorepo)* |
| Config-as-code | `apps/api/railway.toml` |

4. **Networking → Generate Domain** → URL HTTPS de la API.

---

## Paso 3 — Variables de entorno

Generá `APP_KEY`:

```powershell
cd apps\api
node ace generate:key
```

Copiá desde `apps/api/.env.railway.example`:

| Variable | Valor |
|----------|--------|
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `PORT` | `${{PORT}}` |
| `APP_KEY` | output de `generate:key` |
| `APP_URL` | URL HTTPS de la API |
| `SESSION_DRIVER` | `cookie` |
| `SESSION_MAX_AGE` | `365d` |
| `DB_*` | `${{nega-pos-mysql.MYSQL*}}` |
| `FRONTEND_URL` | **`http://localhost:5173`** (web local) |
| `DESKTOP_APP_ORIGIN` | `http://127.0.0.1:51740` |
| `MOBILE_APP_ORIGIN` | `https://localhost` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NOMBRE` | admin producción |
| `DRIVE_DISK` | `local` |
| `STORAGE_LOCAL_PATH` | `/data/uploads` |
| `RUN_MIGRATIONS_ON_START` | `false` |
| `SKIP_BOOTSTRAP_SEED` | `false` |

---

## Paso 4 — Volume (imágenes persistentes)

1. Servicio `nega-pos-api` → **Settings → Volumes → Add Volume**
2. Mount path: **`/data/uploads`**
3. Variable: `STORAGE_LOCAL_PATH=/data/uploads`
4. **Redeploy**

```powershell
.\scripts\railway-setup-uploads-volume.ps1
```

---

## Paso 5 — Primer deploy

1. Push a `main` o **Redeploy**.
2. Verificar: Pre-deploy migraciones OK → health OK → login admin.
3. Si falta admin: `railway ssh -- node ace db:bootstrap`

---

## Paso 6 — Clientes locales (100 % en tu PC)

### Web (local)

`apps/web/.env`:

```env
VITE_API_URL=https://TU-API.up.railway.app
```

```powershell
pnpm dev:web
```

Abrir `http://localhost:5173`. La API debe tener `FRONTEND_URL=http://localhost:5173`.

### Desktop (local)

`apps/desktop/api-url.json`:

```json
{
  "apiUrl": "https://TU-API.up.railway.app"
}
```

```powershell
pnpm build:desktop
```

### Android APK (local)

```powershell
$env:VITE_API_URL = "https://TU-API.up.railway.app"
pnpm build:mobile
pnpm --filter mobile build:apk:debug
```

Instalá el APK en el dispositivo. No hay deploy de mobile en Railway.

---

## Qué hace cada redeploy (solo API)

| Paso | Acción |
|------|--------|
| Build | Imagen Docker `apps/api/Dockerfile` |
| Pre-deploy | Migraciones pendientes |
| Start | Storage → bootstrap (si BD vacía) → server |
| Volume | Uploads persisten en `/data/uploads` |

---

## Verificación

1. `GET https://TU-API/health` → 200
2. Web local: login en `http://localhost:5173`
3. Subir imagen → redeploy API → imagen sigue disponible

---

## Problemas comunes

| Síntoma | Solución |
|---------|----------|
| CORS / login web local | `FRONTEND_URL=http://localhost:5173` en API |
| Desktop no conecta | `api-url.json` + `DESKTOP_APP_ORIGIN` |
| APK no conecta | `VITE_API_URL` al buildear + `MOBILE_APP_ORIGIN` |
| Imagen 404 tras redeploy | Volume + `STORAGE_LOCAL_PATH` |
| Servicio web extra en Railway | **Eliminarlo** — web es solo local |

---

## Comandos útiles

```powershell
railway login
railway link
railway logs
railway ssh -- node ace db:bootstrap
railway ssh -- node ace db:seed --files admin_user_seeder
```

---

## Resumen

1. Railway = **MySQL + API** solamente  
2. Web / desktop / mobile = **local**, apuntando a la API HTTPS  
3. Volume obligatorio para uploads  
4. Guía de vars: `apps/api/.env.railway.example`
