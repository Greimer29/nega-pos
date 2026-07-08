# Desarrollo local — Nega POS (Sprint 2+)

Guía para trabajar **solo en local** (API + MySQL + web). Railway queda para pruebas de deploy al cerrar un sprint o antes de entregar al dueño.

## Arquitectura local

| Componente     | URL / puerto                                                |
| -------------- | ----------------------------------------------------------- |
| MySQL (Docker) | `127.0.0.1:3306` — user `nega_pos` / pass `nega_pos` / DB `nega_pos` |
| API (Adonis)   | `http://localhost:3333`                                     |
| Web (Vite)     | `http://localhost:5173`                                     |

## Requisitos

- Node.js >= 20
- pnpm >= 9 **opcional** — los scripts del repo usan `npx pnpm@9.15.4` vía `npm run …`
- Docker Desktop (para MySQL)

## Setup inicial (una vez)

Desde la raíz del repo:

```powershell
cd c:\gapg\Proyects\nega-pos   # raíz del repo (no apps\)
npm install
npx pnpm@9.15.4 install
Copy-Item apps\api\.env.example apps\api\.env   # si no existe
Copy-Item apps\web\.env.example apps\web\.env # si no existe
```

En `apps\api\.env`:

1. Generar `APP_KEY` si está vacía:

   ```powershell
   cd apps\api
   node ace generate:key
   ```

2. Credenciales admin locales (por defecto en `.env.example`):
   - `ADMIN_EMAIL=admin@negapos.local`
   - `ADMIN_PASSWORD=change-me-in-production` _(cambiá a algo cómodo para dev, ej. `nega-pos-dev`)_

En `apps\web\.env`:

```env
VITE_API_URL=http://localhost:3333
```

**No uses la URL de Railway** mientras desarrollás Sprint 2.

### Script automático

```powershell
.\scripts\dev-setup.ps1
```

Levanta MySQL, corre migraciones y seed del admin.

## Día a día

### Opción A — MySQL + API en Docker (sin hot reload en API)

```powershell
cd c:\gapg\Proyects\nega-pos
docker compose up -d
```

- MySQL: `localhost:3306`
- API: `http://localhost:3333` (migraciones al arrancar; health en `/health`)
- Rebuild tras cambios en API: `docker compose build api && docker compose up -d api`

**Terminal — Web:**

```powershell
cd c:\gapg\Proyects\nega-pos
npm run dev:web
```

### Opción B — API en el host (hot reload, recomendado para desarrollo)

**Terminal 1 — base de datos** (solo si no está corriendo):

```powershell
docker compose up -d mysql
```

**Terminal 2 — API:**

```powershell
cd c:\gapg\Proyects\nega-pos
npm run dev:api
```

**Terminal 3 — Web:**

```powershell
cd c:\gapg\Proyects\nega-pos
npm run dev:web
```

Abrir: `http://localhost:5173/login`

## Comandos útiles

```powershell
# Nueva migración (desde apps/api)
cd apps\api
node ace make:migration nombre_tabla

# Aplicar migraciones
node ace migration:run

# Rollback último batch
node ace migration:rollback

# Tests API (usan BD `nega_pos_test`, no tocan `nega_pos` de dev)
cd apps\api
node ace test
# o desde raíz:
npm run test --workspace=api   # si existe en package.json root
npx pnpm@9.15.4 --filter api test

# Lint / typecheck monorepo
pnpm lint
pnpm typecheck
```

## Uploads (Sprint 2 — facturas de compra)

Variables en `apps/api/.env`:

- `DRIVE_DISK=local`
- `STORAGE_LOCAL_PATH=./storage/uploads`

Los archivos se guardan en `apps/api/storage/uploads/` (ignorados por git). En local no hace falta Railway ni egress.

## Migraciones (esquema consolidado)

El historial de migraciones fue **squasheado a 13 archivos** en `apps/api/database/migrations/` (prefijo `1750000000*`). Cada archivo crea tablas completas; no hay cadenas de `alter` sobre migraciones previas.

**Si tenías una base creada con las migraciones antiguas**, hay que resetear:

```powershell
.\scripts\reset-database.ps1
```

Eso recrea `nega_pos`, corre las 13 migraciones y el seed del admin. En **Railway/producción** con datos reales: hacer backup, recrear la base o desplegar en un servicio MySQL nuevo antes de migrar.

## Base de datos de tests (`nega_pos_test`)

Los tests funcionales de la API **no usan** la base `nega_pos` de desarrollo.

| Base | Uso |
| ---- | --- |
| `nega_pos` | Dev (`npm run dev:api`), seed admin, datos del dueño |
| `nega_pos_test` | Solo `node ace test` (config en `apps/api/.env.test`) |

Al correr tests, Japa (`bin/test.ts`):

1. Fija `NODE_ENV=test` y `DB_DATABASE=nega_pos_test` **antes** de cargar `.env` (dev queda intacto).
2. Perfil completo documentado en `apps/api/.env.test`.
3. Crea `nega_pos_test` si no existe, migra y trunca tablas antes del suite.

**Setup inicial de `nega_pos_test`:**

```powershell
.\scripts\dev-setup.ps1
# o, con MySQL ya corriendo:
docker exec nega-pos-mysql mysql -uroot -proot -e "CREATE DATABASE IF NOT EXISTS nega_pos_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; GRANT ALL PRIVILEGES ON nega_pos_test.* TO 'nega_pos'@'%'; FLUSH PRIVILEGES;"
```

Si ves `Refusing to run tests against the dev database "nega_pos"`, no forzaste `DB_DATABASE=nega_pos` al correr tests — revisá que exista `apps/api/.env.test`.

## Cuándo volver a Railway

- Cerrar un sprint y validar deploy real.
- Probar CORS/cookies con web local + API en HTTPS (opcional).
- Antes de la sesión de carga de datos con el dueño en producción.

Checklist deploy: `docs/RAILWAY_DEPLOY.md`.

## Desktop (Electron)

App de escritorio Windows que empaqueta el build de `apps/web` y proxea `/api/*` a la API remota (Railway) en `http://127.0.0.1:51740`.

### Requisitos

- Windows (instalador NSIS)
- En Railway (servicio API): `DESKTOP_APP_ORIGIN=http://127.0.0.1:51740`
- URL de API en [`apps/desktop/api-url.json`](apps/desktop/api-url.json) (por defecto producción Railway)

### Comandos

Desde la raíz del repo:

```powershell
# Desarrollo: build web + ventana Electron
pnpm dev:desktop

# Instalador Windows (.exe)
pnpm build:desktop
```

### Artefactos generados

Tras `pnpm build:desktop` (carpetas gitignored):

| Archivo | Ubicación |
| ------- | --------- |
| Instalador NSIS | `apps/desktop/release-nega-pos/Nega POS Setup 1.0.3.exe` |
| Portable | `apps/desktop/release-nega-pos/win-unpacked/Nega POS.exe` |

Cerrá `Nega POS.exe` antes de volver a buildear. Si `release-*` queda bloqueado, el script `pre-dist` intenta renombrar la carpeta anterior.

---

## Problemas frecuentes

| Síntoma                          | Solución                                                                                                             |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `"pnpm" no se reconoce`          | Usá `npm run dev:api` / `npm run dev:web` desde la **raíz** del repo (`nega_pos\`, no `nega_pos\apps\`). O instalá pnpm: `corepack enable` y `corepack prepare pnpm@9.15.4 --activate` |
| `Access denied for user 'nega_pos'` | `docker compose up -d mysql` o `scripts\setup-mysql-local.sql`                                                       |
| Puerto 3306 ocupado              | Cambiar en `docker-compose.yml` a `3307:3306` y `DB_PORT=3307` en `.env`                                             |
| Login falla / CORS               | `FRONTEND_URL=http://localhost:5173` en API; `VITE_API_URL=http://localhost:3333` en web; reiniciar ambos servidores |
| Tests fallan: base `nega_pos_test` no existe | `.\scripts\dev-setup.ps1` o SQL de la sección **Base de datos de tests** arriba |
| Dashboard con compras `F-100` etc. en dev | Corriste tests contra `nega_pos` por error; usá `nega_pos_test`. Limpieza: `.\scripts\cleanup-test-dashboard-data.ps1` (tras merge patch Sprint 2) |

## Descubrimiento con el dueño (Sprint 2)

- Cuestionario y respuestas: **`docs/SPRINT2_DISCOVERY_DUENO.md`**
- Decisiones de modelo para código: **`docs/SPRINT2_DECISIONES_MODELO.md`**
- Feedback sesión demo (post-Sprint 2): **`docs/SPRINT2_FEEDBACK_DUENO.md`**
- Reporte de cierre: **`docs/REPORTE_CIERRE_SPRINT2.md`**

## Datos de test en BD local

Los tests funcionales de la API (`apps/api/tests/functional/`) crean datos como compras `F-100`, `F-101`, `F-VIEJA` (`dashboard.spec.ts`). Si corrés tests contra la misma base `nega_pos` que usás en dev, esos registros pueden aparecer en el dashboard.

**Limpieza puntual:**

```powershell
.\scripts\cleanup-test-dashboard-data.ps1
```

**Prevención (backlog #005):** usar una base `nega_pos_test` solo para tests. Mientras tanto, no correr `pnpm --filter api test` contra la BD de demo si vas a mostrarle datos al dueño.

**Usuario admin local:** si el login falla, re-seed:

```powershell
cd apps\api
node ace db:seed -f database/seeders/admin_user_seeder
```

Credenciales por defecto: `admin@negapos.local` / valor de `ADMIN_PASSWORD` en `.env`.

## App de escritorio (Electron) — impresión térmica

La impresión silenciosa de tickets térmicos (ancho útil 78 mm) solo funciona en la app Electron (`apps/desktop`). La configuración se guarda en `print-config.json` junto al ejecutable (mismo patrón que `api-url.json`).

Ejemplo para desarrollo (`apps/desktop/print-config.json`):

```json
{
  "business": {
    "name": "NEGA POS",
    "subtitle": "Av. Principal",
    "footer": "Gracias por su compra"
  },
  "documents": {
    "invoice": {
      "enabled": true,
      "deviceName": "Xprinter POS-80",
      "paperWidthMm": 78
    },
    "deliveryNote": {
      "enabled": true,
      "deviceName": "Xprinter POS-80",
      "paperWidthMm": 78
    },
    "comanda": {
      "enabled": true,
      "deviceName": "POS-Cocina",
      "paperWidthMm": 78
    }
  },
  "behavior": {
    "printInvoiceOnConfirm": true,
    "printDeliveryNoteOnConfirm": false,
    "printComandaOnConfirm": true
  },
  "categoryRouting": {
    "comanda": {
      "enabled": true,
      "rules": [
        { "category": "Uniforme", "deviceName": "POS-Cocina" },
        { "category": "Calzado", "deviceName": "POS-Bodega" }
      ]
    }
  }
}
```

- `deviceName` debe coincidir con el nombre exacto de la impresora en Windows.
- En la UI: **Configuración** (`/settings`) — pestaña **Formatos** para CRUD de plantillas; **Ventas** para impresoras, comandas por categoría y toggles; **Compras** para tasa, margen y cuentas.
- Los formatos se guardan en `print-config.json` bajo `formats[]`. Tipos: `invoice`, `deliveryNote`, `comanda`.
- **Comanda**: ticket de cocina/barra con solo producto, cantidad y medida. `categoryRouting.comanda` envía una comanda por impresora según categoría. Toggle `printComandaOnConfirm`.
- Rebuild del proceso main tras cambios en `electron/`: `cd apps\desktop; pnpm build:main`

## Métodos de pago y cierre diario

**Si editaste migraciones squasheadas** (cambio de esquema sin nueva migración `alter`), reseteá también la base de tests:

```powershell
cd apps\api
$env:NODE_ENV='test'; $env:DB_DATABASE='nega_pos_test'
node ace migration:fresh --force
```

### API

| Método | Ruta | Permiso | Descripción |
| ------ | ---- | ------- | ----------- |
| GET | `/api/v1/payment-methods` | `settings.view` | Lista métodos (`?active=true` solo activos) |
| POST | `/api/v1/payment-methods` | `settings.edit` | Crea método (`code`, `name`, `currency_code`, `sort_order`) |
| PUT | `/api/v1/payment-methods/:code` | `settings.edit` | Actualiza nombre, moneda, activo u orden |
| DELETE | `/api/v1/payment-methods/:code` | `settings.edit` | Elimina si no hay ventas; si hay ventas, desactiva |
| POST | `/api/v1/sales/:id/confirm` | ventas | Contado: body `{ payment_method_code }` obligatorio; crédito: sin método |
| GET | `/api/v1/dashboard/daily-closing?date=YYYY-MM-DD` | dashboard | Cierre diario (fecha opcional, hoy por defecto) |

Los métodos iniciales se siembran en la migración `1750000000003` (`cash_usd`, `cash_bs`, `transfer`, `mobile_payment`, `zelle`, `binance`). Cada método apunta a una moneda activa; al confirmar venta de contado se guarda snapshot de `usd_rate` y `total_bs` en la venta.

### Web

- **Configuración → Ventas:** card CRUD de métodos de pago (antes de impresión).
- **Ventas:** al confirmar contado se abre diálogo de método; crédito confirma directo.
- **Dashboard:** botón **Cierre diario** → `/dashboard/cierre-diario?date=...` con selector de fecha.

---
