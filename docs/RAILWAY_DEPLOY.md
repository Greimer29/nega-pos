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

## Arquitectura multi-empresa

```
GitHub (main) ──Docker──► Railway
                              ├── nega-pos-mysql
                              │     ├── nega_pos_central   (control plane)
                              │     └── nega_pos_t_<slug>  (una BD por empresa)
                              └── nega-pos-api
                                    ├── preDeploy: migration:run_central --force
                                    ├── start: db:bootstrap (platform admin) → server
                                    └── Volume /data/uploads (paths t_<companyId>/…)

PC local ──HTTPS──► https://TU-API.up.railway.app
  ├── Web:     pnpm dev:web  (/login empresas, /platform super admin)
  ├── Desktop: Electron + api-url.json
  └── Android: APK Capacitor (VITE_API_URL al buildear)
```

| Pieza | Persistencia |
|-------|--------------|
| MySQL central + tenants | Plugin Railway (`CREATE DATABASE` por empresa) |
| Uploads | Volume `/data/uploads` con prefijo por tenant |
| Contenedor API | Efímero |

**Importante:** el usuario MySQL de la app debe poder ejecutar `CREATE DATABASE`. Si el user del plugin no puede, usá el root del plugin o otorgá el grant.

---

## Cutover desde cero (wipe)

La producción previa de Nega POS (single DB) **se puede borrar**.

1. Borrar/recrear el plugin MySQL **o** `DROP DATABASE` de la BD vieja.
2. Crear `nega_pos_central` (SQL o al primer migrate si el user puede crear DBs — en la práctica creala a mano).
3. Variables: `DB_CENTRAL_DATABASE=nega_pos_central`, `MULTI_TENANT_ENABLED=true`, `PLATFORM_ADMIN_*`, `RESEND_API_KEY` (opcional), `GOOGLE_CLIENT_ID` (opcional).
4. Redeploy API desde `main`.
5. Login en `http://localhost:5173/platform/login` → crear empresas (OTP → provision).
6. Clientes locales siguen con el mismo `VITE_API_URL`.

---

## Archivos del repo

| Archivo | Rol |
|---------|-----|
| `apps/api/Dockerfile` | Imagen producción + entrypoint |
| `apps/api/railway.toml` | Config-as-code **solo servicio API** (migrate **central**) |
| `apps/api/.env.railway.example` | Variables para Railway |
| `apps/api/bin/docker-entrypoint.sh` | Storage + bootstrap + server |
| `apps/api/commands/db_bootstrap.ts` | Platform admin en central |
| `scripts/railway-setup-uploads-volume.ps1` | Volume CLI |

---

## Reglas (no negociables)

1. **Solo 2 servicios** en el proyecto Railway: MySQL + API.
2. **Migraciones de deploy** → solo **central** (`node ace migration:run_central --force`).
3. **Tenant DBs** se migran al **provisionar** la empresa (no en cada deploy).
4. **Seeders** → `db:bootstrap` crea platform admin. No seedear una BD POS global.
5. **Uploads** → Volume `/data/uploads` + `STORAGE_LOCAL_PATH=/data/uploads`.
6. **Root Directory** del servicio API = raíz del monorepo (vacío).
7. **`FRONTEND_URL`** = `http://localhost:5173` (web local).
8. **No rotar `APP_KEY`** después de producción.

---

## Paso 1 — Proyecto y MySQL

1. [Railway](https://railway.com) → **New Project** → conectar repo GitHub (`main`).
2. **Add → Database → MySQL** (`nega-pos-mysql`).
3. Esperar estado **Online**.
4. Crear BD central (SSH/mysql CLI del plugin):

```sql
CREATE DATABASE IF NOT EXISTS nega_pos_central
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## Paso 2 — Servicio API

1. **Add Service → GitHub Repo** → `nega-pos-api`.
2. **Settings**: Root Directory vacío; Config-as-code `apps/api/railway.toml`.
3. **Networking → Generate Domain**.

---

## Paso 3 — Variables de entorno

```powershell
cd apps\api
node ace generate:key
```

Copiá desde `apps/api/.env.railway.example`, en especial:

| Variable | Valor |
|----------|--------|
| `MULTI_TENANT_ENABLED` | `true` |
| `DB_CENTRAL_DATABASE` | `nega_pos_central` |
| `DB_*` | `${{nega-pos-mysql.MYSQL*}}` |
| `PLATFORM_ADMIN_EMAIL` / `PASSWORD` | super admin |
| `RESEND_API_KEY` / `MAIL_FROM` | OTP (opcional en smoke tests) |
| `GOOGLE_CLIENT_ID` | opcional |
| `STORAGE_LOCAL_PATH` | `/data/uploads` |
| `FRONTEND_URL` | `http://localhost:5173` |

---

## Paso 4 — Volume

Mount `/data/uploads` + `STORAGE_LOCAL_PATH=/data/uploads` → Redeploy.

```powershell
.\scripts\railway-setup-uploads-volume.ps1
```

---

## Paso 5 — Primer deploy y primera empresa

1. Push / Redeploy → preDeploy migra **central** → bootstrap platform admin.
2. Web local: `VITE_API_URL=https://TU-API…` → `pnpm dev:web`.
3. Abrir `/platform/login` → crear empresa → OTP → confirm (crea `nega_pos_t_<slug>` + migrate + admin).
4. Login empresa en `/login` con el email del admin.

---

## Clientes locales

Igual que antes: web/desktop/mobile **locales** apuntando a la API HTTPS. Sin URL por empresa: el aislamiento es sesión/API.

---

## Qué hace cada redeploy

| Paso | Acción |
|------|--------|
| Build | Imagen Docker |
| Pre-deploy | Migraciones **central** pendientes |
| Start | Storage → `db:bootstrap` (platform admin) → server |
| Volume | Uploads `t_<companyId>/…` |

---

## Problemas comunes

| Síntoma | Solución |
|---------|----------|
| `CREATE DATABASE` denied | Grant o user root del plugin MySQL |
| OTP no llega | Sin `RESEND_API_KEY` el código sale en logs de la API |
| Login empresa 401 sin tenant | Volvé a loguear; la sesión debe llevar claims de empresa |
| CORS web local | `FRONTEND_URL=http://localhost:5173` |
| Imagen 404 tras redeploy | Volume + `STORAGE_LOCAL_PATH` |

---

## Resumen

1. Railway = **MySQL + API** solamente  
2. **Central** + **una BD por empresa**  
3. Web / desktop / mobile = **local**  
4. Volume obligatorio para uploads  
5. Vars: `apps/api/.env.railway.example`
