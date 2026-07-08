# Mes 1 — App de Gestión

> **Documento maestro del ciclo activo.** Todo lo que se construya este mes debe estar listado aquí. Lo que no esté, NO se construye sin acuerdo explícito (ver sección "Fuera de alcance").

## Objetivo del mes

Entregar una aplicación web (con base PWA-ready) que permita al dueño de nega_pos:

- Gestionar clientes y proveedores.
- Mantener un catálogo de materiales con stock real.
- Registrar compras y que el stock se actualice automáticamente.
- Crear pedidos con su receta de materiales, llevarlos por estados, y descontar stock al producir.
- **Llevar registro de las máquinas del taller y sus gastos asociados (reparaciones, insumos, mantenimientos).**
- Ver un dashboard mínimo con el estado operativo.

## Definición de éxito (criterios de aceptación del hito)

El hito se considera entregado cuando se cumplen TODOS los siguientes:

1. La app está desplegada en Railway con dominio accesible.
2. El dueño hace login desde su celular y desde su computador sin asistencia.
3. Hay al menos **10 materiales reales** cargados por el dueño.
4. Hay al menos **1 compra real** registrada con factura adjunta.
5. Hay al menos **3 pedidos reales** en distintos estados.
6. Al menos **1 pedido completó el ciclo** (BORRADOR → ENTREGADO) y descontó stock correctamente.
7. Hay al menos **3 máquinas reales** cargadas por el dueño, con al menos **2 gastos registrados** (uno con comprobante adjunto).
8. El dashboard muestra datos reales y actualizados, incluyendo gastos de máquinas del mes.
9. Existe una guía de uso corta (1-2 páginas) entregada al dueño.
10. Acta de aceptación firmada (digital o física).

## Lista negra explícita — Fuera de alcance del Mes 1

Las siguientes funcionalidades **NO se construyen este mes**, aunque se "vean fáciles":

- Cotizaciones formales con PDF
- Facturación, control de pagos, anticipos
- Estados detallados de producción (corte, confección, acabados, QC, empaque)
- Asignación de operarios o control de tiempos
- Costeo automático con mano de obra
- Reportes históricos avanzados o exportes a Excel
- Portal del cliente / vista pública del pedido
- Multi-usuario con roles (solo 1 usuario admin)
- Notificaciones por email / WhatsApp
- Internacionalización (i18n)
- Modo oscuro
- Integraciones externas (WhatsApp, contabilidad, etc.)
- Generación de APK Android (queda para Mes 2 de consolidación si el dueño lo pide)
- Búsqueda full-text avanzada (basta con LIKE)
- Vista Kanban de pedidos (se evaluará en Mes 2 de consolidación)

**Específicamente del módulo de máquinas, NO entran este mes:**

- Mantenimiento preventivo / calendario de mantenimientos / recordatorios.
- Depreciación, costo por hora, amortización.
- Asignación de gastos de máquina a pedidos específicos.
- Reportes comparativos entre máquinas o por períodos.
- Cambio automático de `estado` de la máquina al registrar gastos.
- Fotos de las máquinas (solo comprobantes de los gastos).

Si el dueño pide alguna durante el mes: documentar en backlog, NO incluir.

## Roles y permisos en el Mes 1

- Hay un solo rol activo: **`ADMIN`**.
- El middleware de auth se implementa correctamente (verificar sesión válida en toda ruta de `/api/v1` excepto login). NO se implementa middleware de roles (todo usuario logueado puede hacer todo).
- La columna `rol` en `usuarios` queda lista (con valores `ADMIN` / `OPERADOR` permitidos por el enum), pero el rol `OPERADOR` no se diferencia funcionalmente este mes. Esto deja preparada la base para cuando aparezcan operarios sin tener que migrar.
- Tampoco hay UI de gestión de usuarios este mes; el dueño es el único usuario y se crea por seeder o por comando ace.

## Stack y arquitectura

Ver `PROJECT_CONTEXT.md`. Sin cambios para este módulo.

## Modelo de datos

Ver `DATA_MODEL.md`. Las entidades implementadas este mes son: **Usuario, Cliente, Proveedor, Material, MovimientoInventario, Compra, CompraItem, Pedido, PedidoMaterial, Contador, Maquina, GastoMaquina**.

## Endpoints API (mínimos)

Todos bajo `/api/v1`. Auth requerida en todos excepto `/auth/login`.

### Auth

- `POST /auth/login` — { email, password } → setea cookie de sesión
- `POST /auth/logout`
- `GET /auth/me` — datos del usuario actual

### Clientes

- `GET /clientes` — listado con paginación, search por nombre, filtro por tipo
- `GET /clientes/:id` — detalle + historial de pedidos
- `POST /clientes`
- `PUT /clientes/:id`
- `DELETE /clientes/:id` — soft (activo=false) si tiene pedidos; hard si no tiene

### Proveedores

- `GET /proveedores`
- `GET /proveedores/:id`
- `POST /proveedores`
- `PUT /proveedores/:id`
- `DELETE /proveedores/:id` — soft (activo=false) si tiene compras o gastos de máquina asociados; hard si no tiene ninguno

### Materiales

- `GET /materiales` — incluye stock_actual calculado; filtro por categoria, activo, bajo_stock
- `GET /materiales/:id` — incluye stock_actual y últimos 20 movimientos
- `POST /materiales`
- `PUT /materiales/:id`
- `DELETE /materiales/:id` — soft si tiene movimientos
- `POST /materiales/:id/ajuste` — { cantidad, nota } crea MovimientoInventario tipo AJUSTE_MANUAL

### Compras

- `GET /compras` — listado con filtros fecha/proveedor/estado
- `GET /compras/:id` — incluye items
- `POST /compras` — crea en estado BORRADOR
- `PUT /compras/:id` — solo si BORRADOR
- `POST /compras/:id/items` — agregar item (solo BORRADOR)
- `PUT /compras/:id/items/:itemId` — solo BORRADOR
- `DELETE /compras/:id/items/:itemId` — solo BORRADOR
- `POST /compras/:id/confirmar` — pasa a CONFIRMADA, genera movimientos, actualiza precio_ultima_compra de cada material
- `POST /compras/:id/factura` — multipart upload del archivo
- `GET /compras/:id/factura` — descarga del archivo (ver reglas en `PROJECT_CONTEXT.md`)
- `DELETE /compras/:id` — solo BORRADOR

### Pedidos

- `GET /pedidos` — listado con filtros estado/cliente/fecha, ordenable
- `GET /pedidos/:id` — incluye receta de materiales
- `POST /pedidos` — crea en BORRADOR; genera código automático
- `PUT /pedidos/:id` — solo BORRADOR
- `POST /pedidos/:id/materiales` — agregar PedidoMaterial (solo BORRADOR)
- `PUT /pedidos/:id/materiales/:pmId` — solo BORRADOR
- `DELETE /pedidos/:id/materiales/:pmId` — solo BORRADOR
- `POST /pedidos/:id/transicion` — { nuevo_estado, forzar?: boolean } maneja la máquina de estados
  - Si BORRADOR → CONFIRMADO: validaciones básicas (cliente, descripción, cantidad_total > 0). NO toca stock.
  - Si CONFIRMADO → EN_PRODUCCION: chequea stock para cada material de la receta usando `cantidad_por_prenda × pedido.cantidad_total`. Si algún material no tiene stock suficiente y `forzar=false` (o no enviado) → **409 Conflict** con body `{ error: { code: "STOCK_INSUFICIENTE", details: [{ material_id, nombre, stock_actual, consumo_proyectado, faltante }, ...] } }`. Si `forzar=true` → procede igual; los movimientos generados llevan `nota = "FORZADO_SIN_STOCK_SUFICIENTE"`. Stock puede quedar negativo.
    - **Receta vacía:** si el pedido NO tiene ningún `PedidoMaterial` cargado, la transición procede normalmente (no se generan movimientos), pero la respuesta incluye `warnings: [{ code: "RECETA_VACIA", message: "El pedido pasó a producción sin receta definida; no se descontó inventario." }]`. La UI debe mostrar un banner de advertencia en la vista del pedido mientras esté en este estado. Esta política es intencionalmente permisiva en Mes 1 para no frustrar al dueño con pedidos viejos o urgentes; se evaluará endurecerla en ciclos futuros.
  - Si EN_PRODUCCION → ENTREGADO: solo cambia estado, no toca stock.
  - Si \* → CANCELADO: reversa movimientos si los hubo (genera AJUSTE_REVERSION con cantidad opuesta). No se puede cancelar pedido ENTREGADO.
- `POST /pedidos/:id/referencia` — upload de archivo de referencia
- `GET /pedidos/:id/referencia` — descarga del archivo
- `DELETE /pedidos/:id` — solo BORRADOR; si está en otro estado, usar cancelación

### Máquinas

- `GET /maquinas` — listado paginado, search por nombre/marca/modelo, filtros por `tipo`, `estado`, `activa`
- `GET /maquinas/:id` — detalle + `total_gastado` acumulado + últimos 20 gastos
- `POST /maquinas`
- `PUT /maquinas/:id`
- `DELETE /maquinas/:id` — soft (activa=false) si tiene gastos; hard si no tiene

### Gastos de máquina

- `GET /maquinas/:id/gastos` — listado paginado de gastos de la máquina, filtros por `categoria` y rango `fecha_desde`/`fecha_hasta`
- `GET /gastos-maquina` — listado global con filtros amplios: `maquina_id`, `categoria`, `fecha_desde`, `fecha_hasta`, `proveedor_id`. Incluye `meta.total_monto` con la suma de los filtrados (útil para "cuánto gasté en reparaciones en marzo")
- `POST /maquinas/:id/gastos` — crear gasto asociado a esa máquina
- `PUT /gastos-maquina/:id`
- `DELETE /gastos-maquina/:id`
- `POST /gastos-maquina/:id/comprobante` — multipart upload (mismas reglas de upload definidas en `PROJECT_CONTEXT.md`)
- `GET /gastos-maquina/:id/comprobante` — descarga del archivo

### Dashboard

- `GET /dashboard/resumen` — devuelve:
  - Pedidos por estado (count)
  - Materiales bajo stock mínimo (lista)
  - Compras del mes (count + total $)
  - Pedidos del mes (count)
  - **Gastos de máquinas del mes (count + total $)**

## Pantallas del frontend

### Layout

- Sidebar persistente con navegación: Dashboard, Clientes, Proveedores, Materiales, Compras, Pedidos, **Máquinas**, **Todos los gastos** (este último opcional, sub-ítem o ítem aparte; queda a criterio del agente según ergonomía).
- Header con nombre del usuario logueado y logout.
- Responsive: en móvil sidebar colapsable.

### Pantallas

1. **Login** — email + password.
2. **Dashboard** — tarjetas de resumen + lista de materiales bajo stock + accesos rápidos.
3. **Clientes**
   - Listado con búsqueda y filtros.
   - Modal/drawer para crear/editar.
   - Vista detalle con historial de pedidos.
4. **Proveedores**
   - Listado con búsqueda.
   - Modal para crear/editar.
5. **Materiales**
   - Listado con stock actual, badge si bajo stock.
   - Filtros por categoría / bajo stock.
   - Modal para crear/editar.
   - Vista detalle con últimos movimientos + botón "Ajuste manual".
6. **Compras**
   - Listado con filtros.
   - Vista detalle / edición (items, subir factura).
   - Acción "Confirmar compra" con confirmación visual.
7. **Pedidos**
   - Listado con filtros y vista tipo tabla.
   - Vista detalle: datos + receta de materiales + botones de transición de estado.
   - **Receta:** cada fila muestra el material, "Cantidad por prenda" (editable) y "Consumo total proyectado" (label calculado en vivo = `cantidad_por_prenda × pedido.cantidad_total`).
   - Al intentar pasar a EN_PRODUCCION sin stock suficiente: modal con detalle por material (stock actual, consumo proyectado, faltante) y botón "Forzar igual" claramente diferenciado del flujo normal (color de advertencia, requiere confirmación adicional).
   - **Banner persistente en pedidos `EN_PRODUCCION` con receta vacía:** mientras el pedido siga en ese estado sin `PedidoMaterial` cargados, mostrar banner amarillo en la vista de detalle con texto "Este pedido está en producción sin receta definida; no se descontó inventario." El banner debe ser visible inmediatamente al cargar la pantalla, no requerir scroll.
   - Vista Kanban: **fuera del Mes 1**, se evaluará en Mes 2 de consolidación.

8. **Máquinas**
   - Listado con filtros por tipo, estado y activa. Búsqueda por nombre/marca/modelo.
   - Modal para crear/editar máquina.
   - Vista detalle: datos de la máquina + tarjeta "Total gastado" (suma de todos los gastos) + tabla de gastos con filtros por categoría y rango de fechas + botón "Registrar gasto" que abre el modal correspondiente.
   - Modal "Registrar gasto": campos fecha, categoría, descripción, monto, proveedor (opcional, autocomplete sobre `proveedores`), comprobante (opcional, upload).
   - Posible sub-sección "Todos los gastos" desde el listado de máquinas o como ítem adicional del sidebar, con vista global de gastos y filtros amplios. **Implementación mínima:** una página con tabla filtrable; no requiere su propia ruta en sidebar si entra apretado.

## Sprints

### Sprint 1 — Semana 1 (~20 h)

**Objetivo:** discovery + setup técnico + auth funcionando.

**Tareas técnicas (agente):**

- Inicializar monorepo (`apps/api`, `apps/web`).
- Setup AdonisJS 6 con MySQL y Lucid.
- Setup React + Vite + Tailwind + shadcn/ui.
- Dockerfiles para api y web. `docker-compose.yml` con mysql.
- Setup ESLint + Prettier compartidos.
- Setup GitHub Actions: lint + build en cada PR.
- Auth con sesiones de Adonis + cookies. Endpoints `/auth/login`, `/auth/logout`, `/auth/me`.
- Migraciones para tabla `usuarios`. Seeder con usuario admin.
- Frontend: layout base, página de login funcional, redirect protegido.
- Configurar variables de entorno y secretos en Railway. Primer deploy.

**Tareas paralelas no-código (tú/dueño):**

- **Visita al taller o videollamada de 2 h.** Llevar checklist (ver Apéndice A). Resultado: fotos, listado mental de materiales que manejan, listado de clientes y proveedores actuales.
- **Comprar dominio** (si todavía no hay). Sugerencia: `.com` o `.co` del nombre del taller. ~$15/año.
- **Crear cuenta de GitHub** para el proyecto y dar acceso al desarrollador. Repo privado.
- **Crear proyecto en Railway** y conectar el repo de GitHub.
- **Definir formato de identificación de materiales** con el dueño: ¿usan códigos? ¿colores? ¿solo nombre? Esto afecta la UI del catálogo.

**Entregable visible al final de sprint 1:** el dueño hace login en la app desde su celular y ve el dashboard vacío.

### Sprint 2 — Semana 2 (~24 h)

**Objetivo:** Materiales + Proveedores + Compras funcionales + migraciones de máquinas y gastos preparadas.

**Tareas técnicas:**

- Migraciones de `proveedores`, `materiales`, `compras`, `compra_items`, `movimientos_inventario`.
- **Migraciones de `maquinas` y `gastos_maquina`** (modelos y CRUD se implementan en sprint 3; aquí solo schema y modelos vacíos para que las relaciones queden listas).
- Modelos Lucid con relaciones.
- Services: `MaterialService` (con cálculo de stock), `CompraService` (con lógica de confirmación atómica).
- Validadores Vine para todos los inputs.
- Controllers y rutas.
- Upload de archivo de factura (Adonis Drive con disco local en Mes 1).
- Tests: `CompraService.confirmar()` debe generar movimientos correctos en transacción. `MaterialService.calcularStock()` debe sumar correctamente.
- Frontend: pantallas de Materiales (listado, modal create/edit, detalle), Proveedores (listado, modal), Compras (listado, edición, upload, confirmar).
- React Query hooks por feature.
- Componente `StockBadge` reutilizable.

**Tareas paralelas no-código:**

- **Sesión con dueño (2 h):** cargar los materiales reales del taller (mínimo 10). Tú facilitas, él dicta.
- **Cargar 2-3 proveedores reales.**
- **Registrar 1 compra real** con factura escaneada (puede ser una compra reciente histórica).
- **Acordar política de stock mínimo** por categoría de material con el dueño. ¿Cuánto es "bajo" para una tela? ¿Para un hilo? Esto va en la UI como sugerencia.
- **Listar las máquinas que tiene el taller** (nombre, tipo, marca/modelo si recuerda). Esto se cargará en sprint 3.

**Entregable visible al final de sprint 2:** el dueño ve su inventario real, registra compras, y el stock se actualiza.

### Sprint 3 — Semana 3 (~26 h)

**Objetivo:** Clientes + Pedidos (CRUD y máquina de estados, sin tabla `pedido_materiales` ni descuento de stock; eso entra en Sprint 4) + backend completo del módulo Máquinas.

**Tareas técnicas:**

- Migraciones de `clientes`, `pedidos`.
- Generador de código de pedido (`PED-YYYYMM-NNNN`) — implementar como secuencia atómica con tabla `contadores` (ver `DATA_MODEL.md`).
- Services: `ClienteService`, `PedidoService` (sin lógica de stock todavía, solo CRUD y transiciones simples).
- Máquina de estados de pedido como módulo separado, testeable aislado.
- Validadores Vine.
- Upload de archivo de referencia.
- Frontend: pantallas de Clientes (listado, modal, detalle con historial), Pedidos (listado, modal create, detalle, vista con botones de transición).
- Teléfono normalizado a E.164 con `libphonenumber-js` (default CO).
- **Módulo Máquinas — backend completo:**
  - Modelos `Maquina` y `GastoMaquina` con relaciones (`GastoMaquina belongsTo Maquina`, `GastoMaquina belongsTo Proveedor`).
  - `MaquinaService` con cálculo de `total_gastado` por máquina.
  - Validadores Vine para máquinas y gastos.
  - Controllers y rutas según endpoints del documento.
  - Upload de comprobante con las reglas estándar de uploads.
  - Test unitario de `MaquinaService.calcularTotalGastado()`.

**Tareas paralelas no-código:**

- **Sesión con dueño (2 h):** cargar 5-10 clientes recientes y 3-5 pedidos históricos.
- **Definir codificación de pedidos** con el dueño: ¿el formato `PED-YYYYMM-NNNN` le sirve? ¿prefiere otro?
- Confirmar con el dueño la lista de máquinas a cargar en sprint 4 (mínimo 3) y agendar sesión específica.

**Entregable visible al final de sprint 3:** el dueño gestiona pedidos en su flujo de estados. El backend de máquinas está listo (testeable vía API/Postman aunque la UI llegue en sprint 4).

### Sprint 4 — Semana 4 (~29 h)

**Objetivo:** Receta de materiales + descuento de stock + UI completa del módulo Máquinas + dashboard + cierre.

**Tareas técnicas:**

- Migración de `pedido_materiales`.
- Service: agregar a `PedidoService` la lógica de receta y la transición `CONFIRMADO → EN_PRODUCCION` con descuento de stock atómico (transacción).
- Lógica de cancelación con reversión.
- Validación de stock al confirmar producción, con flag `forzar` para override.
- Tests unitarios del descuento y reversión (`PedidoService.transicionarEstado` con stock suficiente, insuficiente sin forzar, insuficiente con forzar, cancelación con reversión, **receta vacía: respuesta exitosa con warning `RECETA_VACIA` y sin creación de `MovimientoInventario`**).
- Endpoint `GET /dashboard/resumen` con tarjeta de gastos de máquinas.
- Frontend: UI de receta en detalle de pedido (agregar/quitar materiales, input "cantidad por prenda" + label "consumo total proyectado"), modal de stock insuficiente con detalle por material, dashboard con tarjetas + lista de stock bajo.
- **Módulo Máquinas — frontend completo:**
  - Item "Máquinas" en sidebar.
  - Pantalla listado con búsqueda y filtros (tipo, estado, activa).
  - Modal crear/editar máquina.
  - Pantalla detalle: datos + tarjeta "Total gastado" + tabla de gastos con filtros + botón "Registrar gasto".
  - Modal "Registrar gasto" con todos los campos incluyendo upload de comprobante y autocomplete de proveedor.
  - Vista "Todos los gastos" (página secundaria con tabla filtrable global; puede ir como sub-item del sidebar o link desde pantalla de máquinas — decisión del agente según el espacio).
  - Tarjeta de gastos de máquinas en el dashboard.
- Polish suficiente para producción: loading states, empty states, mensajes de error claros. Polish exhaustivo queda para Mes 2.
- **NO se incluyen tests E2E con Playwright en este mes.** La validación end-to-end se hace manualmente en la sesión de aceptación con el dueño. Playwright se evalúa para el Mes 2 de consolidación.

**Tareas paralelas no-código:**

- **Sesión con dueño (1-2 h):** definir recetas para 3-5 prendas tipo (camiseta básica, polo, etc.). Documentarlas para que las cargue en el sistema.
- **Sesión con dueño (1-1.5 h):** cargar 3+ máquinas reales del taller con sus datos, y registrar al menos 2 gastos históricos (uno con comprobante adjunto). Esto puede combinarse con la sesión de recetas en una misma visita.
- **Hacer correr 1 pedido real de principio a fin** durante esta semana, en paralelo a la operación normal.
- **Redactar guía de uso** (1-2 páginas con capturas): cómo crear material, registrar compra, crear pedido, moverlo de estado, registrar máquina y gasto. Tarea tuya.
- **Agendar sesión de aceptación de hito** con el dueño para el final de la semana.

**Entregable visible al final de sprint 4 (cierre de mes):** todo el ciclo end-to-end funcionando con datos reales, incluyendo registro de máquinas y sus gastos. Acta de aceptación.

## Riesgos del Mes 1 y mitigación

| Riesgo                                    | Probabilidad | Impacto | Mitigación                                                                    |
| ----------------------------------------- | ------------ | ------- | ----------------------------------------------------------------------------- |
| Dueño no carga datos cuando toca          | Alta         | Alto    | Sesiones agendadas en calendario, no opcionales. Tú facilitando, él dictando. |
| Stock real no coincide con sistema        | Alta         | Medio   | Esperar este desfase; planificar auditoría física a fin de mes 1.             |
| Agente genera código de Adonis 4/5        | Media        | Medio   | Reglas explícitas en `AGENT_RULES.md`; revisar imports de cada PR.            |
| Scope creep por requests del dueño        | Alta         | Alto    | Backlog público; cualquier feature nueva va al Mes 2.                         |
| Dueño no entiende cómo funciona la receta | Media        | Alto    | Sesión dedicada en sprint 4 + guía con ejemplos.                              |
| Migración rompe datos cargados            | Baja         | Alto    | Backup automático de Railway antes de cada deploy.                            |

## Apéndice A — Checklist de la visita inicial al taller

Llevar para sprint 1, semana 1. Llenar con el dueño en la visita.

- [ ] Foto del espacio físico y zonas (corte, máquinas, almacén).
- [ ] Foto del lugar donde guarda materiales actualmente.
- [ ] Fotos de 5-10 facturas físicas representativas.
- [ ] Foto de cómo anota pedidos hoy (cuaderno, post-its, chats).
- [ ] Listado a mano: tipos de materiales que maneja (con ejemplos).
- [ ] Unidades en que compra cada tipo de material (metros, kilos, rollos, etc.).
- [ ] Listado a mano: nombres de sus 5-10 proveedores principales.
- [ ] Listado a mano: nombres de sus 10-20 clientes recurrentes.
- [ ] **Listado de máquinas del taller** con tipo, marca/modelo si lo recuerda, y estado actual (operativa, fuera de servicio).
- [ ] **Preguntar al dueño cómo lleva hoy el control de gastos en reparaciones e insumos de máquinas** (¿cuaderno?, ¿lo recuerda?, ¿facturas sueltas?).
- [ ] Pregunta: ¿cuál es el pedido típico de un cliente white label vs uno corporativo? (para entender flujos).
- [ ] Pregunta: ¿cómo decide hoy cuándo comprar más material? ¿espera a quedarse sin?
- [ ] Pregunta: ¿qué métricas le interesaría ver primero?
- [ ] Pregunta: ¿desde qué dispositivo va a usar la app principalmente? (celular vs computador).
- [ ] Foto del celular y computador que usa, para validar resolución/compatibilidad.

## Apéndice B — Variables de entorno

Documentar en `apps/api/.env.example` y `apps/web/.env.example`:

**API:**

- `NODE_ENV`
- `PORT`
- `APP_KEY` (generada por Adonis)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`
- `SESSION_DRIVER=cookie`
- `DRIVE_DISK=local` (Mes 1) / `s3` después
- `STORAGE_LOCAL_PATH`
- `FRONTEND_URL` (para CORS)

**Web:**

- `VITE_API_URL`
