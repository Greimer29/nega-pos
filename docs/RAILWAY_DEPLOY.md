# Deploy en Railway — nega_pos (Sprint 1)

Guía para desplegar **API** y **MySQL** en [Railway](https://railway.com).

> **Decisión temporal:** el frontend (`apps/web`) **no se despliega** en Railway por ahora. Corre en local (`pnpm dev` / `npx pnpm@9.15.4 dev`) hasta definir si será web en la nube, PWA o empaquetado nativo (Capacitor/Electron). El Dockerfile de web queda en el repo para uso futuro.

## Arquitectura (vigente)

| Servicio | Deploy | Notas |
|----------|--------|-------|
| `nega-pos-mysql` | Railway (plugin MySQL) | Solo red interna |
| `nega-pos-api` | Railway — `apps/api/Dockerfile` | URL pública de la API |
| `nega-pos-web` | **Local** (`http://localhost:5173`) | No crear servicio web en Railway |

El Dockerfile de la API usa **contexto = raíz del monorepo** (no cambiar el root directory del repo en Railway).

---

## 1. Proyecto y MySQL

1. Crear proyecto en Railway y conectar el repo `Greimer29/nega-pos` (rama `main`).
2. **New → Database → MySQL** (nombre sugerido: `nega-pos-mysql`).
3. Anotar el servicio MySQL; usarás sus variables en la API.

---

## 2. Servicio API (`nega-pos-api`)

**New → GitHub Repo → mismo repo → servicio adicional.**

### Build

| Setting | Valor |
|---------|--------|
| Root Directory | *(vacío — raíz del repo)* |
| Dockerfile Path | `apps/api/Dockerfile` |
| Config file | `apps/api/railway.toml` — ver [Configurar pre-deploy](#configurar-pre-deploy-migraciones) |

> Si Railway pide **Root Directory**, dejalo en `/`. El Dockerfile ya referencia paths del monorepo.

### Variables de entorno

Generá `APP_KEY` localmente:

```powershell
cd apps\api
node ace generate:key
```

| Variable | Valor / origen |
|----------|----------------|
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `PORT` | `${{PORT}}` *(Railway lo inyecta)* |
| `APP_KEY` | *(output de generate:key)* |
| `APP_URL` | URL pública de la API, ej. `https://nega-pos-api-production.up.railway.app` |
| `SESSION_DRIVER` | `cookie` |
| `FRONTEND_URL` | `http://localhost:5173` *(web en local; si usás otro puerto de Vite, ajustalo)* |
| `DB_HOST` | `${{nega-pos-mysql.MYSQLHOST}}` |
| `DB_PORT` | `${{nega-pos-mysql.MYSQLPORT}}` |
| `DB_USER` | `${{nega-pos-mysql.MYSQLUSER}}` |
| `DB_PASSWORD` | `${{nega-pos-mysql.MYSQLPASSWORD}}` |
| `DB_DATABASE` | `${{nega-pos-mysql.MYSQLDATABASE}}` |
| `ADMIN_EMAIL` | `admin@negapos.local` *(cambiar en prod)* |
| `ADMIN_PASSWORD` | *(contraseña segura)* |
| `ADMIN_NOMBRE` | `Administrador Nega POS` |
| `DRIVE_DISK` | `local` *(opcional; default `local` si no se define)* |
| `STORAGE_LOCAL_PATH` | Ver [Storage persistente (Volume)](#storage-persistente-volume) — **dev:** `./storage/uploads`; **Railway:** `/data/uploads` |

> **Sprint 2 — adjuntos de factura:** sin Volume, los archivos viven en disco efímero del contenedor y **se pierden en cada redeploy**. Para producción/staging con facturas reales, configurá un Volume (sección abajo).

Reemplazá `nega-pos-mysql` por el nombre real de tu servicio MySQL en Railway.

### Storage persistente (Volume)

Railway monta volúmenes **solo en runtime** (no durante build ni pre-deploy). La API escribe facturas vía Adonis Drive en `STORAGE_LOCAL_PATH`.

| Entorno | `STORAGE_LOCAL_PATH` | Persistencia |
|---------|----------------------|--------------|
| Local dev | `./storage/uploads` | Carpeta en disco (`apps/api/storage/uploads/`) |
| Railway (sin Volume) | `./storage/uploads` → `/app/storage/uploads` | **Efímero** — se pierde al redeploy |
| Railway (con Volume) | `/data/uploads` | **Persistente** — sobrevive redeploys |

#### Dónde se configura el Volume

**No** va en `railway.toml`. Opciones:

| Método | Pasos |
|--------|--------|
| **Dashboard** | Servicio `nega-pos-api` → **Settings** → **Volumes** → **Add Volume** → Mount path: `/data/uploads` |
| **CLI** | `railway link` (servicio `nega-pos-api`) → `railway volume add --mount-path /data/uploads` |
| **Script repo** | `.\scripts\railway-setup-uploads-volume.ps1` (CLI + variable `STORAGE_LOCAL_PATH`) |

Tras adjuntar el Volume, en **Variables** del servicio `nega-pos-api`:

| Variable | Valor |
|----------|--------|
| `STORAGE_LOCAL_PATH` | `/data/uploads` |
| `DRIVE_DISK` | `local` *(opcional)* |

Railway inyecta automáticamente `RAILWAY_VOLUME_MOUNT_PATH` y `RAILWAY_VOLUME_NAME`. El código usa `STORAGE_LOCAL_PATH` primero; si falta, cae en `RAILWAY_VOLUME_MOUNT_PATH` (`apps/api/app/utils/storage_path.ts`).

**Redeploy obligatorio** después de adjuntar el Volume o cambiar `STORAGE_LOCAL_PATH`.

#### Prueba manual: factura sobrevive redeploy

Ejecutar **después** de Volume + variable + redeploy con código en `main` que incluya `resolveStoragePath`.

1. **Health:** `GET https://<api-url>/health` → OK.

2. **Login** (cookie de sesión):

   ```powershell
   $api = "https://nega-pos-api-production.up.railway.app"
   $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
   Invoke-RestMethod -Uri "$api/api/v1/auth/login" -Method POST -WebSession $session `
     -ContentType "application/json" `
     -Body '{"email":"<ADMIN_EMAIL>","password":"<ADMIN_PASSWORD>"}'
   ```

3. **Crear compra BORRADOR** (ajustá `proveedorId` existente):

   ```powershell
   $compra = Invoke-RestMethod -Uri "$api/api/v1/compras" -Method POST -WebSession $session `
     -ContentType "application/json" `
     -Body '{"proveedorId":1,"fecha":"2026-05-29","totalBs":"100.00"}'
   $compraId = $compra.data.id
   ```

4. **Subir factura de prueba** (PDF mínimo):

   ```powershell
   $pdf = [System.Text.Encoding]::ASCII.GetBytes("%PDF-1.4`n% Volume test")
   $boundary = [guid]::NewGuid().ToString()
   # Usar curl.exe si Invoke-RestMethod multipart es incómodo:
   curl.exe -X POST "$api/api/v1/compras/$compraId/factura" -b $session `
     -F "factura=@test.pdf;type=application/pdf"
   ```

   Alternativa con archivo temporal:

   ```powershell
   [IO.File]::WriteAllBytes("$env:TEMP\volume-test.pdf", $pdf)
   curl.exe -X POST "$api/api/v1/compras/$compraId/factura" -b $session `
     -F "factura=@$env:TEMP\volume-test.pdf;type=application/pdf"
   ```

5. **Descargar y anotar** — debe responder 200:

   ```powershell
   curl.exe -o "$env:TEMP\after-upload.pdf" "$api/api/v1/compras/$compraId/factura" -b $session
   ```

6. **Redeploy** del servicio `nega-pos-api` (Dashboard → Deployments → Redeploy, o push a `main`).

7. **Repetir descarga** (misma sesión o nuevo login):

   ```powershell
   curl.exe -o "$env:TEMP\after-redeploy.pdf" "$api/api/v1/compras/$compraId/factura" -b $session
   ```

   **Éxito:** HTTP 200 y archivo idéntico. **Fallo (efímero):** 404 / `ArchivoFacturaFaltante` tras redeploy.

8. **Limpieza opcional:** borrar compra borrador de prueba desde la UI o API.

#### Límites y caveats (Railway)

Documentados en [Railway Volumes reference](https://docs.railway.com/reference/volumes). Resumen para el proyecto:

- **Un Volume por servicio** — suficiente para uploads de facturas.
- **Redeploy con Volume:** breve downtime al remontar (Railway no monta volúmenes en replicas paralelas).
- **Pre-deploy** no ve el Volume — las migraciones no deben leer/escribir facturas (OK en nega_pos).
- **Tamaño default Hobby:** 5 GB — más que suficiente para PDFs de facturas Mes 1.
- **Facturación:** storage del Volume se cobra por GB/minuto ([pricing Railway](https://docs.railway.com/reference/pricing)).
- **S3/R2:** fuera de alcance de este chore; evaluar en Mes 2 de consolidación (backlog #007).

Si aparecen límites o costos no previstos → reporte Tipo C al Project Lead, no decidir solo.

---

### Deploy

- **Pre-deploy** (automático en cada deploy): `node ace migration:run --force` — ver abajo.
- **Seed del admin**: manual, una vez (o cuando cambies credenciales) — ver [Seed del admin (manual)](#seed-del-admin-manual).
- **Health check**: `GET /health`
- Generar dominio público en **Settings → Networking → Generate Domain**

#### Configurar pre-deploy (migraciones)

Railway debe ejecutar migraciones **antes** de activar cada despliegue. Definilo en **un** de estos lugares (si usás el config file del repo, no hace falta duplicar en la UI):

| Dónde | Ruta en Railway | Valor |
|-------|-----------------|-------|
| **Opción A (recomendada)** | Servicio `nega-pos-api` → **Settings** → **Config-as-code** → **Railway config file** | `apps/api/railway.toml` |
| **Opción B** | Servicio `nega-pos-api` → **Settings** → **Deploy** → **Pre-deploy command** | `node ace migration:run --force` |

El archivo en el repo ya define:

```toml
preDeployCommand = "node ace migration:run --force"
```

> **`--force` es obligatorio en Railway.** En producción Adonis pregunta `Want to continue running migrations? (y/N)`. El pre-deploy no es interactivo y responde `false`, así que sin `--force` las migraciones no corren.

**Comportamiento:** en cada **deploy** o **redeploy** (nueva imagen), Railway corre solo migraciones pendientes. Si no hay migraciones nuevas, termina al instante. Un **restart** del contenedor **no** vuelve a ejecutar el pre-deploy.

Tras mergear cambios en `railway.toml`, hacé **Deploy** o **Redeploy** del servicio `nega-pos-api` y revisá en **Deployments** → último deploy → logs del paso **Pre-deploy** que diga que las migraciones corrieron OK.

#### Seed del admin (manual)

El usuario administrador **no** se crea en cada deploy. Corré el seeder cuando:

- Es el **primer** deploy a producción (después de que las migraciones ya crearon las tablas).
- Cambiaste `ADMIN_EMAIL`, `ADMIN_PASSWORD` o `ADMIN_NOMBRE` y querés sincronizar la BD.
- Necesitás **resetear** la contraseña del admin en producción.

El seeder usa `updateOrCreate` por email: no duplica filas; actualiza nombre y contraseña si el admin ya existe.

**Requisitos:** `ADMIN_EMAIL`, `ADMIN_PASSWORD` y `ADMIN_NOMBRE` ya configurados en el servicio `nega-pos-api` → **Variables**.

##### Método recomendado: Railway CLI + SSH (dentro del contenedor API)

Ejecuta el comando **en el contenedor desplegado**, con red privada hacia MySQL (no hace falta exponer la base por TCP).

1. Instalar CLI (una vez):

   ```powershell
   npm install -g @railway/cli
   ```

2. Iniciar sesión y enlazar el servicio API:

   ```powershell
   railway login
   cd c:\gapg\Proyects\nega-pos
   railway link
   ```

   Elegí el proyecto Nega POS y el servicio **`nega-pos-api`** (no el de MySQL).

3. Asegurate de que el último deploy esté **Active** (migraciones ya corridas).

4. Ejecutar solo el seeder del admin:

   ```powershell
   railway ssh -- node ace db:seed --files admin_user_seeder
   ```

   La primera vez, Railway puede pedirte registrar una clave SSH (`railway ssh keys add`).

5. Probar login en `http://localhost:5173/login` con `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

##### Alternativa: desde tu PC con variables de Railway

Solo si preferís no usar SSH. Necesitás que `DB_HOST` sea alcanzable desde tu máquina (p. ej. TCP proxy público del plugin MySQL y variables apuntando al host público). Si `DB_HOST` es el hostname **interno** de Railway, este método **fallará**; usá SSH.

```powershell
cd apps\api
railway link   # servicio nega-pos-api
railway run node ace db:seed --files admin_user_seeder
```

##### Cuándo NO volver a correr el seed

- En cada redeploy rutinario (código, env no relacionadas al admin).
- En CI (el workflow solo corre migraciones).

---


## 3. Frontend en local (no Railway)

Con la API en Railway y el web en tu máquina:

**`apps/web/.env`:**

```env
VITE_API_URL=https://<tu-api-en-railway>
```

**Levantar el web:**

```powershell
cd apps\web
npx pnpm@9.15.4 dev
```

Abrí `http://localhost:5173/login`. La API debe tener `FRONTEND_URL=http://localhost:5173` para CORS y cookies.

> **Cookies entre dominios:** API en HTTPS (Railway) + web en `http://localhost` puede dar problemas de sesión según el navegador. Si el login falla en ese escenario, probá API también en local, o evaluá deploy del web cuando se defina la estrategia final.

---

## 4. Servicio Web en Railway — pendiente

No desplegar `apps/web` hasta nueva decisión (PWA en nube, Capacitor, Electron, etc.). Referencia futura: `apps/web/Dockerfile` y `apps/web/railway.toml`.

---

## 5. Verificación

1. `GET https://<api-url>/health` → respuesta OK
2. Web local en `http://localhost:5173/login`
3. Login con `ADMIN_EMAIL` / `ADMIN_PASSWORD`
4. Dashboard vacío

### Problemas comunes

| Síntoma | Causa probable |
|---------|----------------|
| CORS / login bloqueado | `FRONTEND_URL` en API ≠ origen del browser (`http://localhost:5173`) |
| `VITE_API_URL` incorrecta | Web apunta a API local en vez de la URL de Railway |
| API no arranca | Falta `APP_KEY` o vars de MySQL |
| Migraciones fallan | API desplegada antes de que MySQL esté listo — redeploy; revisar logs **Pre-deploy** |
| `usuarios doesn't exist` | Pre-deploy no configurado o falló — configurar `apps/api/railway.toml` y redeploy |
| Log: `Want to continue running migrations? · false` | Falta `--force` en el pre-deploy — usar `node ace migration:run --force` |
| Login 500 / sin admin | Migraciones OK pero falta seed manual — `railway ssh -- node ace db:seed --files admin_user_seeder` |
| `EnvValidationException`: `DRIVE_DISK` / `STORAGE_LOCAL_PATH` | PR Sprint 2+ sin esas vars — redeploy con `main` actualizado (tienen default) o agregarlas en **Variables** del servicio API |
| Factura 404 después de redeploy | Disco efímero — adjuntar Volume en `/data/uploads` y `STORAGE_LOCAL_PATH=/data/uploads`; redeploy |

---

## 6. Dominio custom (opcional, solo API)

1. Asignar dominio custom al servicio **api** en Railway.
2. Actualizar `APP_URL` en la API.
3. Actualizar `VITE_API_URL` en `apps/web/.env` local.

---

## 7. Normalización de tablas ES -> EN (producción)

Esta sección deja documentado el saneamiento ejecutado para eliminar tablas legacy en español y conservar solo el esquema estándar en inglés.

### Cuándo aplicar

- Al cerrar una refactorización de naming (ES -> EN) donde existan tablas duplicadas (`usuarios` y `users`, etc.).
- En este proyecto, se aplicó en producción el **2026-05-31** con `migration:fresh --force` (aceptando borrado total de datos).

### Mapeo oficial (legacy -> estándar)

| Legacy (ES) | Estándar (EN) |
|-------------|----------------|
| `usuarios` | `users` |
| `proveedores` | `suppliers` |
| `materiales` | `materials` |
| `compras` | `purchases` |
| `compra_items` | `purchase_items` |
| `movimientos_inventario` | `inventory_movements` |
| `maquinas` | `machines` |
| `gastos_maquina` | `machine_expenses` |
| `clientes` | `customers` |
| `contadores` | `counters` |
| `pedidos` | `orders` |
| `pedido_materiales` | `order_materials` |

### Procedimiento ejecutado (Railway + PowerShell)

1. **Purgar y reconstruir esquema** con migraciones actuales en inglés:

   ```powershell
   npx pnpm@9.15.4 --filter api exec node ace migration:fresh --force
   ```

2. **Recrear usuario admin**:

   ```powershell
   npx pnpm@9.15.4 --filter api exec node ace db:seed --files="database/seeders/admin_user_seeder.ts"
   ```

3. **Verificar tablas finales** (solo EN + internas de Adonis):

   ```sql
   SHOW TABLES;
   ```

### Estado esperado después de la normalización

Tablas de negocio válidas:

- `users`
- `suppliers`
- `materials`
- `purchases`
- `purchase_items`
- `inventory_movements`
- `machines`
- `machine_expenses`
- `customers`
- `counters`
- `orders`
- `order_materials`

Tablas internas:

- `adonis_schema`
- `adonis_schema_versions`

### Política a futuro (obligatoria)

- No crear tablas/modelos/rutas/DTOs en español.
- DB en `snake_case` inglés.
- Request/query API en `snake_case` inglés.
- Response API en `camelCase` inglés.
- Si aparece una tabla legacy en español en cualquier entorno, resolver con saneamiento controlado antes de continuar desarrollo.

---

## Build Docker local (opcional)

```powershell
docker build -f apps/api/Dockerfile -t nega-pos-api .
# Web: solo si más adelante se retoma deploy en Railway
# docker build -f apps/web/Dockerfile --build-arg VITE_API_URL=... -t nega-pos-web .
```
