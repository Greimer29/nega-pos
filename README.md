# Nega POS

Sistema de punto de venta y gestión comercial (inventario, ventas, compras, clientes, reportes).

**Documentación técnica:** [`DOCUMENTACION_OFICIAL.md`](./DOCUMENTACION_OFICIAL.md)  
**Reglas para el agente:** [`.cursorrules`](./.cursorrules)

> La carpeta `docs/` está descontinuada; no usar como referencia.

## Requisitos

- Node.js >= 20
- pnpm >= 9
- Docker (opcional, para MySQL local)

## Inicio rápido (local)

```powershell
# Instalar dependencias (desde la raíz)
pnpm install

# Setup MySQL + migraciones + admin (primera vez)
.\scripts\dev-setup.ps1

# Lint y formato (todo el monorepo)
pnpm lint
pnpm format:check

# Desarrollo (terminales separadas)
pnpm dev:api
pnpm dev:web
```

## Estructura

```
nega-pos/
├── apps/
│   ├── api/     # AdonisJS 7 + MySQL
│   ├── web/     # React 19 + Vite
│   └── desktop/ # Electron (opcional)
├── DOCUMENTACION_OFICIAL.md
└── package.json # Workspaces pnpm
```

## Variables de entorno

```powershell
Copy-Item apps\api\.env.example apps\api\.env
Copy-Item apps\web\.env.example apps\web\.env
# Editar apps\api\.env — APP_KEY, MySQL, ADMIN_*
```

Detalle en `DOCUMENTACION_OFICIAL.md` (sección 5) y en `apps/api/.env.example`.

### API — MySQL local

El error `Access denied for user 'nega_pos'@'localhost'` significa que MySQL corre, pero **no existe** el usuario/base del `.env`.

**Opción A — Docker (recomendado)**

```powershell
docker compose up -d mysql
# Esperar ~15 s a que el healthcheck esté healthy
```

**Opción B — MySQL ya instalado**

```powershell
mysql -u root -p < scripts\setup-mysql-local.sql
```

Login local por defecto: `admin@negapos.local` / valor de `ADMIN_PASSWORD` en `apps/api/.env`.

### Deploy en Railway

Solo **API + MySQL** en Railway. Web, desktop y mobile son **100 % locales**.

Guía: [`docs/RAILWAY_DEPLOY.md`](docs/RAILWAY_DEPLOY.md) · Config: `apps/api/railway.toml`, `apps/api/.env.railway.example`
