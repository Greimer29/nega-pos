# Reglas Operativas del Agente (Cursor)

> **Leer al inicio de CADA sesión, junto con `PROJECT_CONTEXT.md` y el documento del mes activo.**

## Paquetes pre-aprobados (no requieren pedir permiso)

Los siguientes paquetes ya están aprobados para instalación durante el Mes 1. **Cualquier otro paquete requiere aprobación explícita** (regla del documento PROJECT_CONTEXT sección 7).

**Backend (apps/api):**

- `@adonisjs/core`, `@adonisjs/lucid`, `@adonisjs/auth`, `@adonisjs/drive`, `@adonisjs/session`, `@adonisjs/cors`, `@adonisjs/shield`, `@vinejs/vine` — núcleo del framework.
- `mysql2` — driver de la DB.
- `luxon` — manejo de fechas (viene con Adonis).
- `libphonenumber-js` — normalización de teléfonos a E.164.
- `@japa/runner`, `@japa/api-client`, `@japa/assert` — testing.

**Frontend (apps/web):**

- `react`, `react-dom`, `react-router-dom` — núcleo.
- `vite`, `@vitejs/plugin-react`, `typescript` — build.
- `tailwindcss`, `postcss`, `autoprefixer` — estilos.
- Cualquier paquete oficial de `shadcn/ui` instalado vía su CLI (`@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`).
- `@tanstack/react-query` — cache de servidor.
- `react-hook-form`, `@hookform/resolvers`, `zod` — formularios y validación.
- `axios` — HTTP client.
- `@tanstack/react-table` — tablas.
- `libphonenumber-js` — mismo paquete que en backend para consistencia.
- `date-fns` — utilidades de fechas en frontend.
- `vitest`, `@testing-library/react`, `@testing-library/jest-dom` — testing.

**Dev tooling (root o ambos):**

- `eslint`, `prettier`, `typescript`, sus plugins y configs estándar.
- `husky`, `lint-staged` — solo si el humano lo solicita.

**Cualquier paquete NO listado arriba:** detente y pregunta antes de instalar. Justifica por qué hace falta, qué alternativa hay sin instalarlo, y qué peso agrega al bundle si es de frontend.

## Principios

1. **No expandas alcance.** Si la tarea pedida implica tocar algo fuera del módulo activo, detente y pregunta.
2. **No inventes requisitos.** Si falta información, pregunta. Nunca asumas "el usuario probablemente quiere…".
3. **Conserva lo que funciona.** No refactorices código ajeno a la tarea aunque "se vea mejorable".
4. **Cambios pequeños y reversibles.** Cada PR debe poder revertirse sin romper otras cosas.
5. **Honestidad técnica.** Si algo no lo sabes hacer bien, dilo. No fuerces una solución frágil.

## Antes de empezar cualquier tarea

Verifica que tienes claro:

- [ ] ¿En qué archivo del módulo activo está descrita esta tarea?
- [ ] ¿Qué entidades del modelo de datos toca?
- [ ] ¿Cuál es el criterio de aceptación?
- [ ] ¿Hay endpoints existentes que tocar o son nuevos?
- [ ] ¿Necesita migración? ¿Es destructiva?

Si alguno está borroso, **detente y pregunta** antes de escribir código.

## Durante el desarrollo

### AdonisJS 6 — diferencias críticas con versiones anteriores

Adonis 6 cambió mucho respecto a 4/5. NO generes código tipo Adonis 4/5. En particular:

- Usar **import maps** (`#controllers/...`, `#models/...`) en vez de paths relativos largos.
- **Vine** para validación, no Indicative (Indicative ya no existe).
- Decorators de Lucid: `@column()`, `@belongsTo()`, etc. desde `@adonisjs/lucid/orm`.
- Comandos `ace`: `node ace make:controller`, `node ace migration:run`, etc.
- Auth: usar `@adonisjs/auth` con guard `session` por defecto. NO usar `auth` API de versiones viejas.
- Rutas: import explícito en `start/routes.ts`, no auto-discovery.

Si dudas si una sintaxis es de Adonis 6 o de versión vieja, **consulta la doc oficial de Adonis 6** antes de escribir. No mezcles patrones.

### Modelo de datos

- Cualquier cambio al schema → migración nueva, nunca editar migración pasada ya commitada.
- Naming: tablas en `snake_case` plural (`customers`, `orders`, `materials`). Modelos en `PascalCase` singular (`Customer`, `Order`, `Material`).
- IDs: `bigIncrements('id')` como PK por defecto.
- Timestamps: siempre `createdAt` y `updatedAt` (Lucid los maneja).
- Soft delete solo donde esté justificado en `DATA_MODEL.md`.
- FKs siempre con índice y con política de borrado explícita (`onDelete('RESTRICT')` por defecto).

### Lógica de negocio crítica

La lógica que toca **dinero o stock** debe:

1. Estar en un service (no en controller).
2. Estar dentro de una transacción de DB.
3. Tener test unitario.
4. Lanzar excepción custom si falla validación de dominio.

Ejemplo: pasar un pedido a `EN_PRODUCCION` descuenta stock. Si algún material no tiene suficiente stock y no se recibió `forzar=true`, lanzar `StockInsuficienteException` con el detalle por material y revertir la transacción completa (HTTP 409). Si `forzar=true`, proceder y marcar cada movimiento generado con `nota = "FORZADO_SIN_STOCK_SUFICIENTE"`. Ver `DATA_MODEL.md` regla 4 y `MES_01_APP_GESTION.md` endpoint `POST /pedidos/:id/transicion` para detalle completo.

**Ejemplo (receta vacía):** si un pedido no tiene materiales en su receta al pasar a `EN_PRODUCCION`, la transición es **exitosa** (NO lanzar excepción, NO devolver 422). No se generan movimientos. La respuesta incluye `warnings: [{ code: "RECETA_VACIA", message: "..." }]`. Ver `DATA_MODEL.md` regla 9. **Test obligatorio:** caso de transición con receta vacía debe verificar que la respuesta es 200/201 con el warning correcto y que no se creó ningún `MovimientoInventario`.

### Frontend

- Cada feature en `src/features/<nombre>/` con su propio `api.ts`, `hooks.ts`, `components/`.
- Llamadas HTTP siempre vía React Query, no `useEffect + fetch` manuales.
- Formularios siempre con React Hook Form + resolver Zod.
- Estados de loading, error, y empty explícitos. Nunca dejar la UI en "blanco" mientras carga.
- Mobile-first: probar en viewport 375px antes de en desktop.

## Cuándo crear un ADR (Architecture Decision Record)

Crear archivo en `docs/decisions/NNN-titulo-corto.md` cuando:

- Se elige una librería para resolver un problema recurrente.
- Se desvía de las convenciones de este documento.
- Se toma una decisión de diseño con trade-offs no obvios.

Formato del ADR:

```markdown
# NNN. Título corto

**Fecha:** YYYY-MM-DD
**Estado:** Propuesto | Aceptado | Rechazado | Reemplazado por NNN

## Contexto

## Decisión

## Consecuencias

## Alternativas consideradas
```

## Qué NO hacer nunca

- **No commitees `.env`** ni claves de ningún tipo.
- **No deshabilites tests** para que pase CI ("flaky test" no es excusa para skip).
- **No uses `any`** en TypeScript sin justificación en comentario.
- **No instales paquetes nuevos** sin aprobación.
- **No hagas force push** a `main`.
- **No mezcles** refactor + feature + bugfix en el mismo PR.
- **No edites migraciones** ya aplicadas en main; crea una nueva.
- **No silencies errores** con `try/catch` sin manejarlos.
- **No uses `console.log`** en código de producción; usar logger de Adonis o un logger en frontend.

## Cómo dejar tareas inconclusas

Si una sesión termina con trabajo a medio hacer:

1. Commit con `wip:` y descripción de qué falta.
2. PR en draft con checklist de pendientes.
3. Si bloqueado, dejarlo escrito explícitamente en el PR.

## Cómo pedir aclaraciones

Cuando preguntes al humano, sé concreto:

- Mal: "¿Cómo querés que maneje esto?"
- Bien: "Para el endpoint POST /pedidos, si el cliente envía un material que no existe, ¿devolvemos 422 con los IDs inválidos o 404? El módulo no lo especifica. Propongo 422 porque es validación de input."

## Reportes para Project Lead

Al finalizar tareas significativas, el agente genera un **bloque de reporte estructurado** que el humano va a copiar y consultar con el Project Lead (Claude externo) si es necesario.

### Cuándo generar un reporte

- Al cerrar un **PR mergeable** (cualquier PR no trivial).
- Al cerrar un **sprint o hito**.
- Al **bloquearse** y necesitar una decisión que no podés tomar solo.
- Al **detectar una contradicción** entre documentos de `docs/`.
- Al **descubrir un problema técnico significativo** durante implementación (ej. una librería no se comporta como esperabas, una tabla resulta más compleja de lo previsto).

### Formato de los reportes

Hay 3 tipos. Usá el que aplique. **Siempre** en bloque de código markdown para que sea fácil de copiar.

#### Tipo A — Cierre de PR/sprint

Generar **al cerrar un PR** y al **cerrar un sprint completo**.

```markdown
# REPORTE DE CIERRE — [Nombre del PR o sprint]

## Qué se entregó
- ...

## Decisiones tomadas durante la implementación
- ...
- (Marcar con ⚠️ si alguna roza la regla "decisiones que NO debe tomar solo")

## Métricas
- Tiempo invertido (aprox): ...
- PRs creados: ...
- Tests escritos: ...
- Bugs encontrados y resueltos: ...

## Qué quedó abierto
- ...

## Dudas pendientes para Project Lead
- ...

## Riesgos detectados
- ...

## Validación con el dueño
- (Si aplicó: qué se probó con el dueño y reacción; si no: por qué no.)
```

#### Tipo B — Bloqueo

Generar **cuando no podés avanzar** sin una decisión externa.

```markdown
# BLOQUEO — [Título corto]

## Qué intentaba hacer
- ... (con referencia al documento de docs/ que describe la tarea)

## Qué se intentó y qué pasó
- ...

## Lo que necesita decidirse
- **Opción A:** ... (costo / consecuencia)
- **Opción B:** ... (costo / consecuencia)
- **Opción C:** ... (si aplica)

## Información relevante para decidir
- ...

## Mi recomendación
- ... (opcional, lo que vos como agente creés que es mejor y por qué)
```

#### Tipo C — Problema técnico descubierto en implementación

Generar cuando descubrís algo no contemplado en los docs y no es un bloqueo crítico (podés seguir, pero conviene avisar).

```markdown
# DESCUBRIMIENTO TÉCNICO — [Título corto]

## Qué descubrí
- ...

## Por qué importa
- ...

## Qué decisión propongo
- ...

## Qué hago mientras tanto
- ... (seguir como esperado, marcar TODO, etc.)
```

### Reglas sobre los reportes

1. **Siempre dentro de un bloque de código markdown** (\`\`\`markdown … \`\`\`). El humano necesita poder copiarlo limpio.
2. **Al final de la respuesta**, después del trabajo. No al principio.
3. **Honesto, no decorativo.** Si algo salió mal, decilo. Si tomaste un atajo, marcalo. Si una decisión te incomoda, declaralo.
4. **Cuantitativo cuando se pueda.** "Escribí 8 tests" es mejor que "buena cobertura de tests".
5. **No repitas información** que ya está en el código o en el PR description. El reporte es el resumen ejecutivo.
6. **Si no hay nada significativo que reportar**, no inventes un reporte. Una respuesta corta tipo "PR #N mergeable, sin novedades, todos los tests verdes" alcanza.

### Lo que NO va en el reporte

- Detalles técnicos línea por línea (eso está en los commits).
- Explicaciones largas de por qué funcionó el código (si funcionó, basta).
- Disculpas o frases hechas. Mantenelo seco.
- Propuestas de features nuevas que se le ocurren al agente (eso va al `BACKLOG.md` directamente, no al reporte).