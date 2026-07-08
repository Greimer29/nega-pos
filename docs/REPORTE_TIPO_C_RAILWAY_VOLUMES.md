# REPORTE TIPO C — Hallazgos Railway Volumes (chore #007)

> Para Project Lead. No son bloqueantes; no requieren decisión inmediata salvo costos.

## Contexto

Durante el chore `chore/railway-volume-uploads` se configuró el Volume `nega-pos-api-volume` en producción (`calm-embrace` / `nega-pos-api`) y se ejecutó la prueba manual de persistencia de facturas.

## Hallazgos

### 1. Volume no va en `railway.toml`

Railway **no** declara volúmenes en config-as-code. Solo dashboard o CLI (`railway volume add --mount-path /data/uploads`). Documentado en `apps/api/railway.toml` (comentario) y `RAILWAY_DEPLOY.md`.

### 2. Redeploy con Volume = breve downtime

Según [Railway Volumes reference](https://docs.railway.com/reference/volumes): al redeployar un servicio con Volume adjunto, Railway evita dos deployments montando el mismo volumen → **hay unos segundos de indisponibilidad** aunque exista healthcheck. Observado en la prueba (~45–60 s entre redeploy y SUCCESS).

**Implicación:** aceptable para staging/demo; para producción crítica 24/7 evaluar S3/R2 (Mes 2).

### 3. Límites de tamaño y plan

- Proyecto actual (Hobby): **5 GB** por Volume (`nega-pos-api-volume` reportó `0MB/5000MB`).
- Plan Free/Trial: **0.5 GB** — insuficiente si se baja de plan.
- Pro: hasta 50 GB default; resize sin downtime en la mayoría de casos.

### 4. Costo

Volumes se facturan **por GB almacenado por minuto** (además del compute). Con PDFs de facturas el uso real será bajo al inicio; conviene revisar factura Railway tras 1 mes de uso.

### 5. Un Volume por servicio

`nega-pos-api` ya tiene `nega-pos-api-volume` en `/data/uploads`. No se puede adjuntar un segundo Volume al mismo servicio sin reemplazar el primero.

### 6. Pre-deploy y Volume

El pre-deploy (`migration:run --force`) **no** monta el Volume. En nega_pos las migraciones no tocan archivos de factura — OK. Si en el futuro un seed leyera uploads, habría que moverlo al start command.

### 7. Variables automáticas

Tras adjuntar el Volume, Railway inyecta `RAILWAY_VOLUME_MOUNT_PATH=/data/uploads` y `RAILWAY_VOLUME_NAME=nega-pos-api-volume`. Igualmente se configuró explícitamente `STORAGE_LOCAL_PATH=/data/uploads` para claridad.

### 8. Prueba manual ejecutada (2026-05-29)

| Paso | Resultado |
|------|-----------|
| Login Railway API | OK |
| Crear compra BORRADOR id=1 | OK |
| POST factura PDF de prueba | HTTP 200 |
| GET factura antes de redeploy | HTTP 200, 37 bytes |
| Redeploy `nega-pos-api` | SUCCESS |
| GET factura después de redeploy | HTTP 200, mismo contenido |

**Conclusión:** con Volume + `STORAGE_LOCAL_PATH=/data/uploads`, los adjuntos **sobreviven** el redeploy en el deploy actual de `main` (sin necesidad de S3).

### 9. Datos de prueba en producción

La prueba dejó en Railway:

- Proveedor id=2 «Proveedor Volume Test 2»
- Compra BORRADOR id=1 con factura de prueba

**Sugerencia:** borrar antes de la sesión de carga real con el dueño (no decidido por el agente).

## Qué NO se decidió solo

- Migración a S3/R2 (explícitamente fuera de alcance; Mes 2).
- Cambio de plan Railway por costos de Volume.

## Acción recomendada para Project Lead

- Confirmar que el costo del Volume en Hobby es aceptable.
- Limpiar compra/proveedor de prueba en Railway antes de la carga real.
- Mergear PR `chore/railway-volume-uploads` para dejar `resolveStoragePath` y docs en repo.
