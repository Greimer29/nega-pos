# Nega POS — Contexto del Proyecto

> **Este es el documento raíz del proyecto.** El agente de desarrollo (Cursor) debe leerlo al inicio de cada sesión y consultarlo ante cualquier duda de alcance, arquitectura o convenciones. Si algo no está aquí, preguntar antes de asumir.
>
> **Ubicación de la documentación:** todos los archivos `.md` del proyecto viven en la carpeta `docs/` de la raíz del repo. `.cursorrules` es un **archivo único** (no una carpeta) en la raíz del repo, cuyo único propósito es apuntar al agente a `docs/`. La fuente de verdad es siempre `docs/`.

---

## 1. Qué es Nega POS

**Nega POS** es un sistema de punto de venta y gestión comercial modular. Partió como herramienta para un taller textil, pero su enfoque evoluciona hacia un POS general: inventario, ventas, compras, clientes, cuentas, reportes y operación multi-módulo.

El objetivo del proyecto es construir un **ecosistema digital escalable** para negocios que hoy operan de forma manual o con herramientas dispersas. El proyecto se ejecuta por ciclos mensuales, con bloques de consolidación entre cada uno.

## 2. Roles en el proyecto

| Rol                          | Quién                      | Responsabilidad                                                                                                   |
| ---------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Project Lead / Planificación | Claude (asistente externo) | Roadmap, alcance, criterios de aceptación, priorización, revisión                                                 |
| Dueño / Cliente piloto         | Cliente                    | Validación funcional, carga de datos reales, decisiones de negocio                                                |
| Desarrollador humano         | Tú                         | Supervisión técnica, code review final, integración, deploy, decisiones técnicas que el agente no debe tomar solo |
| Agente de desarrollo         | Cursor                     | Implementación de backend, frontend, tests, configuración Docker, migraciones                                     |

**Regla crítica:** el agente de Cursor **NUNCA toma decisiones de alcance**. Si una tarea requiere agregar algo que no está explícitamente en el documento del módulo activo, debe detenerse y preguntar.

## 3. Estado del proyecto

- **Ciclo actual:** Mes 1 — App de gestión (clientes + pedidos + compras + inventario con recálculo automático + máquinas y gastos)
- **Cronograma global proyectado:**
  - Mes 1: App de gestión v1
  - Mes 2: Consolidación + uso real + bugfixes + PWA/APK Android si aplica
  - Mes 3: Asistente WhatsApp v1 (atención y filtrado de leads)
  - Mes 4: Consolidación + integración WhatsApp ↔ App
  - Mes 5: Landing pública + captación de leads
  - Mes 6: Consolidación + métricas iniciales

**Cada ciclo tiene su propio documento de alcance.** El documento del Mes 1 vive en `docs/MES_01_APP_GESTION.md` y es el único alcance vigente hasta que se cierre el hito.

## 4. Stack técnico definitivo

| Capa                                    | Tecnología                                                          | Notas                                                           |
| --------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------- |
| Backend                                 | **AdonisJS 6** (TypeScript)                                         | Framework principal. Usar Lucid ORM, no instalar otro ORM       |
| Base de datos                           | **MySQL 8**                                                         | Migraciones gestionadas por Lucid                               |
| Frontend web                            | **React 18 + Vite + TypeScript**                                    | NO Next.js, NO Remix                                            |
| UI components                           | **shadcn/ui** adaptado a Vite + **Tailwind CSS**                    |                                                                 |
| Forms                                   | **React Hook Form + Zod**                                           | Zod schemas compartidos cuando sea posible                      |
| HTTP client                             | **Axios** o `fetch` nativo con wrapper                              | Definir wrapper en `apps/web/src/lib/api.ts`                    |
| Estado servidor                         | **TanStack Query** (React Query)                                    | Para cache y sincronización                                     |
| Estado UI                               | **Zustand** solo si hace falta estado global UI                     | Evitar Redux                                                    |
| Auth                                    | Sesiones de AdonisJS + cookies httpOnly                             | NO JWT en localStorage                                          |
| Storage de archivos                     | Local en volumen Railway en Mes 1, S3-compatible (R2) cuando crezca | Adonis Drive abstrae esto                                       |
| PWA (Mes 2)                             | **Vite PWA plugin**                                                 | Permite instalación en móvil y desktop                          |
| Build móvil nativo (Mes 2 si se decide) | **Capacitor** + Android Studio                                      | Mismo código React, APK Android                                 |
| Containerización                        | **Docker** + docker-compose para desarrollo local                   |                                                                 |
| Despliegue                              | **Railway**                                                         | Mes 1: **api + mysql** en Railway; **web en local** (deploy web pendiente de decisión PWA/nativo) |
| CI/CD                                   | **GitHub Actions**                                                  | Lint + tests + build en cada PR                                 |
| Tests backend                           | **Japa** (incluido en Adonis 6)                                     | Tests de servicios y endpoints                                  |
| Tests frontend                          | **Vitest + React Testing Library**                                  | Smoke tests de componentes críticos                             |
| Linter / Formatter                      | **ESLint + Prettier**                                               | Config compartida vía paquete root                              |
| Gestor de paquetes                      | **pnpm** (workspaces)                                               | Monorepo simple, sin Turborepo ni Nx en Mes 1                   |
| Tests E2E                               | **No en Mes 1.** Considerar Playwright en Mes 2 de consolidación    | Por ahora solo tests unitarios y validación manual con el dueño |

## 5. Estructura del repositorio

```
nega-pos/
├── apps/
│   ├── api/                    # AdonisJS 6
│   │   ├── app/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   ├── services/       # Lógica de negocio fuera de controllers
│   │   │   ├── validators/     # Schemas Vine (validador nativo de Adonis 6)
│   │   │   ├── middleware/
│   │   │   └── exceptions/
│   │   ├── database/
│   │   │   ├── migrations/
│   │   │   ├── seeders/
│   │   │   └── factories/
│   │   ├── start/
│   │   │   ├── routes.ts
│   │   │   └── kernel.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── web/                    # React + Vite
│       ├── src/
│       │   ├── components/     # Componentes presentacionales
│       │   ├── features/       # Carpeta por módulo (clientes, pedidos, etc.)
│       │   ├── pages/          # Rutas
│       │   ├── lib/            # api.ts, utils, hooks compartidos
│       │   ├── stores/         # Zustand si aplica
│       │   └── types/
│       ├── tests/
│       ├── Dockerfile
│       └── package.json
├── docs/
│   ├── PROJECT_CONTEXT.md      # Este archivo
│   ├── DATA_MODEL.md           # Modelo de datos completo
│   ├── AGENT_RULES.md          # Reglas operativas para Cursor
│   ├── MES_01_APP_GESTION.md   # Alcance del ciclo activo
│   ├── BACKLOG.md              # Solicitudes registradas pendientes de planificación
│   └── decisions/              # ADRs (Architecture Decision Records)
├── docker-compose.yml          # Desarrollo local
├── .github/
│   └── workflows/
└── README.md
```

## 6. Convenciones de código

### Generales

- **TypeScript estricto** en ambos lados. `strict: true` en `tsconfig.json`.
- Nombres de archivos: `kebab-case.ts`. Componentes React: `PascalCase.tsx`.
- Imports ordenados: librerías externas → módulos internos → relativos.
- Comentarios en código solo cuando explican el "por qué". El "qué" lo dice el código.

### Backend (Adonis)

- Controllers **delgados**: solo parsean request, delegan a services, devuelven response.
- Toda lógica de negocio vive en `app/services/`.
- Validación con **Vine** (validador nativo de Adonis 6, no usar Zod en backend).
- Transacciones explícitas para operaciones que tocan múltiples tablas (ej. confirmar pedido descuenta stock).
- Errores: lanzar excepciones custom que extiendan de `Exception`, manejadas por `app/exceptions/handler.ts`.

### Frontend (React)

- Una carpeta por feature en `src/features/`. Cada feature contiene sus propios componentes, hooks y servicios API.
- Componentes presentacionales separados de containers con lógica.
- Custom hooks para llamadas API (`useClientes`, `usePedido(id)`, etc.) usando React Query.
- No CSS files sueltos; todo Tailwind, y `@apply` solo dentro de los componentes shadcn cuando sea necesario.

### API REST

- Versión en la URL: `/api/v1/...`
- Recursos en plural: `/api/v1/clientes`, `/api/v1/pedidos`.
- Códigos HTTP correctos: 200, 201, 204, 400, 401, 403, 404, 409, 422, 500.
- Respuestas de error con shape consistente:
  ```json
  { "error": { "code": "STOCK_INSUFICIENTE", "message": "...", "details": {...} } }
  ```
- Respuestas exitosas pueden incluir `warnings` (advertencias no bloqueantes que el frontend debe mostrar):
  ```json
  {
    "data": {
      /* recurso normal */
    },
    "warnings": [
      {
        "code": "RECETA_VACIA",
        "message": "El pedido pasó a producción sin receta definida; no se descontó inventario."
      }
    ]
  }
  ```

  - `warnings` es **opcional**; si no hay, se omite del payload (no devolver array vacío).
  - El frontend nunca trata un `warning` como error: el flujo procede, pero se muestra una notificación o banner según el contexto.
  - Códigos de warning conocidos en Mes 1: `RECETA_VACIA`. Lista extensible en ciclos futuros.

#### Paginación (todos los endpoints de listado)

Query params estándar:

- `page` (default 1, mínimo 1)
- `limit` (default 20, mínimo 1, máximo 100)
- `search` (string, busca por nombre o campo principal de la entidad)
- Filtros específicos del recurso (ej. `estado`, `tipo`, `bajo_stock=true`)
- `sort` (campo + dirección, ej. `sort=-created_at` para desc)

Shape de respuesta:

```json
{
  "data": [
    /* items */
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "total_pages": 8
  }
}
```

Lucid `Model.query().paginate(page, limit)` cumple este contrato directamente, usar el serializer de Adonis para mapear a este shape.

#### Uploads de archivos

- **Endpoint dedicado** por recurso (ej. `POST /compras/:id/factura`, `POST /pedidos/:id/referencia`).
- **MIME permitidos:** `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
- **Tamaño máximo:** 10 MB por archivo.
- **Validación:** Adonis `MultipartFile` con `validate({ size, extnames })` antes de mover.
- **Almacenamiento:** Drive disco `local` en Mes 1 (volumen persistente de Railway). Path generado: `<recurso>/<id>/<uuid>.<ext>`.
- **No exponer paths directos del filesystem en respuestas.** Devolver URL firmada o endpoint propio para servir el archivo (ej. `GET /compras/:id/factura` devuelve el binario con auth).

#### Descarga de archivos adjuntos

Por cada endpoint de upload existe su contraparte de descarga (mismo path, método `GET`). El endpoint:

- Requiere auth.
- Devuelve el binario con `Content-Type` correcto y `Content-Disposition: inline` (para que el navegador lo muestre en pestaña si es imagen/pdf, o lo descargue si es otro tipo).
- Si el recurso no tiene archivo adjunto: **404**.
- Si el archivo está referenciado en DB pero falta en disco (caso edge): **500** con código `ARCHIVO_FALTANTE` (loguear el evento, no debería pasar nunca).

### Git

- Branch principal: `main`.
- Feature branches: `feat/<modulo>-<descripcion-corta>` (ej. `feat/inventario-crud-materiales`).
- Commits: convencional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- PRs siempre revisadas por el desarrollador humano antes de merge. El agente NUNCA mergea solo.

## 7. Decisiones que el agente NO debe tomar solo

El agente debe detenerse y preguntar (o dejarlo marcado como TODO con justificación) cuando aparezca:

- Cambios en el modelo de datos no contemplados en `DATA_MODEL.md`.
- Nuevas dependencias pnpm (cualquier package extra que NO esté en la lista de pre-aprobados de `AGENT_RULES.md`).
- Cambios de versión mayor de cualquier dependencia.
- Cambios en estructura de carpetas.
- Cambios en convenciones de naming o estilo.
- Funcionalidades fuera del alcance del documento del mes activo.
- Eliminar o renombrar endpoints existentes.
- Cambios en el schema de respuestas API que rompan compatibilidad.
- Decisiones de seguridad (auth, permisos, validaciones críticas).
- Cualquier cosa que diga "for simplicity I'll skip..." o "I'll just hardcode...".

## 8. Cómo se valida el trabajo

Cada PR debe cumplir, antes de aprobarse:

1. CI verde (lint + tests + build).
2. Endpoints nuevos documentados con ejemplo de request/response.
3. Migración (si la hay) probada con `migration:rollback` y `migration:run`.
4. Capturas o video corto si hubo cambios visuales.
5. Tests de servicios con lógica de negocio crítica (ej. descuento de stock).
6. Sin TODOs sin issue asociado en GitHub.

## 9. Comunicación con el dueño

El dueño NO ve PRs ni código. Ve entregables semanales:

- Cada viernes: enlace a la app desplegada con lo nuevo + lista corta de qué probar.
- Cada cierre de mes: demo en vivo + acta de aceptación firmada.

Esto está coordinado por el desarrollador humano, no por el agente.

## 10. Glosario

- **Pedido**: orden de producción de un cliente. Tiene estado, materiales asociados (receta), y mueve el inventario.
- **Receta**: lista de materiales y cantidades que un pedido consume al producirse.
- **Movimiento de inventario**: cualquier cambio en el stock de un material (entrada por compra, salida por consumo, ajuste manual).
- **Modalidad A / White Label**: cliente que desarrolla su propia marca con asesoría del negocio piloto.
- **Modalidad B / Corporativa**: cliente que pide producción masiva con diseño definido (uniformes, lotes empresariales).
- **MVP del mes**: el alcance mínimo entregable acordado para el ciclo. Lo que no esté ahí, no se construye este ciclo.
