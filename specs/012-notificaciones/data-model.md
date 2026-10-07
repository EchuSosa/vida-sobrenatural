# Data Model: Notificaciones

Fuente: `docs/04-dominio-entidades.md` (Notificación, Entrega de Notificación), `diagrama-er.mermaid`,
con los cambios de research.md #3 y #12. Nombres de tabla en plural snake_case (`@@map`), como el
resto del schema. Nada se borra (Principio III): ni Notificaciones ni Entregas tienen baja.

## Enums nuevos

| Enum | Valores | Nota |
|---|---|---|
| `TipoNotificacion` | `manual`, `automatica` | |
| `PrioridadNotificacion` | `normal`, `importante` | importante → también por email (D96) |
| `AlcanceNotificacion` | `todos`, `grupo`, `ministerio`, `evento`, `persona` | D72 |
| `CanalEntrega` | `app`, `email`, `push` | `push` reservado (D149): ningún código lo produce en esta spec |
| `EstadoEntrega` | `pendiente`, `enviada`, `fallida` | D100 |

## `Notificacion` (`notificaciones`)

| Campo | Tipo | Regla |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `tipo` | `TipoNotificacion` | |
| `prioridad` | `PrioridadNotificacion` | |
| `alcance` | `AlcanceNotificacion` | manual: `todos`/`grupo`/`ministerio`; automática: lo fija el catálogo |
| `alcanceId` | `String?` | `null` sii `alcance = todos`. Polimórfico: sin FK (igual que `docs/04`) |
| `evento` | `String?` | solo automática; una clave de `CATALOGO_AVISOS` (validada en código, no enum de Postgres — research #3) |
| `params` | `Json?` | solo automática; ids y datos no personales (FR-013) |
| `entidadTipo` | `String?` | solo automática; ej. `solicitud_discipulado`, `inscripcion_evento` |
| `entidadId` | `String?` | solo automática |
| `titulo` | `String? @db.VarChar(80)` | solo manual, obligatorio ahí |
| `mensaje` | `String? @db.VarChar(1000)` | solo manual, obligatorio ahí, texto plano |
| `creadoPorId` | `String?` → `Persona` | solo manual: el Admin que la mandó |
| `claveIdempotencia` | `String? @unique` | solo automática, opcional (FR-014) |
| `createdAt` | `DateTime @default(now())` | = `fecha_envio` de `docs/04` (el aviso "se envía" al crearse) |

Índices: `@@index([tipo, createdAt])` (listado de manuales del backoffice), `@@index([creadoPorId])`.

CHECK (SQL a mano en la migración, patrón H-140):
- `tipo = 'manual'` ⇒ `titulo`, `mensaje`, `"creadoPorId"` no nulos y `evento`, `params`,
  `"claveIdempotencia"` nulos;
- `tipo = 'automatica'` ⇒ `evento` no nulo y `titulo`, `mensaje`, `"creadoPorId"` nulos;
- `(alcance = 'todos') = ("alcanceId" IS NULL)`.

**`disparador`** (`docs/04`) no es columna: `CATALOGO_AVISOS[evento].disparador` (research #3).

## `EntregaNotificacion` (`entregas_notificacion`)

| Campo | Tipo | Regla |
|---|---|---|
| `id` | `String @id @default(uuid())` | es el `id` que ve la web como id del aviso |
| `notificacionId` | `String` → `Notificacion` | |
| `personaId` | `String` → `Persona` | |
| `canal` | `CanalEntrega` | |
| `estado` | `EstadoEntrega` | `app` nace `enviada`; `email` nace `pendiente` |
| `intentos` | `Int @default(0)` | solo `email` |
| `proximoIntentoEn` | `DateTime?` | solo `email` con `estado = pendiente`; nace `now()` |
| `ultimoError` | `String? @db.VarChar(64)` | solo el **tipo** de error (`SIN_EMAIL`, `PERSONA_INACTIVA`, `ENVIO_FALLIDO`) — nunca el texto del servidor, que puede traer el email (Principio X) |
| `enviadaEn` | `DateTime?` | |
| `leidaEn` | `DateTime?` | solo `app`; `null` = sin leer |
| `createdAt` | `DateTime @default(now())` | |

Restricciones: `@@unique([notificacionId, personaId, canal])` (un destinatario no recibe dos veces
por el mismo canal). Índices: `@@index([personaId, canal, createdAt])` (lista de Avisos),
`@@index([canal, estado, proximoIntentoEn])` (proceso de mails), `@@index([notificacionId, canal,
estado])` (estadísticas del detalle). En SQL a mano: índice parcial
`entregas_sin_leer ON entregas_notificacion ("personaId") WHERE canal = 'app' AND "leidaEn" IS NULL`
(contador, research #10); CHECK `canal = 'app' OR "leidaEn" IS NULL`.

## Relaciones inversas en `Persona`

`entregasNotificacion EntregaNotificacion[]`, `notificacionesCreadas Notificacion[]`.

## Transiciones de `EntregaNotificacion` (canal `email`)

```text
pendiente ──envío ok──────────────────────────▶ enviada
pendiente ──falla, intentos < 5──▶ pendiente (proximoIntentoEn = ahora + ESPERAS[intentos-1])
pendiente ──falla, intentos = 5──▶ fallida
pendiente ──sin email / persona inactiva al enviar──▶ fallida (sin reintento, FR-025)
```

Canal `app`: nace `enviada`; `leidaEn` pasa de `null` a una fecha una sola vez (FR-008).

## Valores compartidos (`packages/shared-types/src/avisos.ts`)

- `TITULO_AVISO_MAX = 80`, `MENSAJE_AVISO_MAX = 1000`, `AVISOS_POR_PAGINA = 20`,
  `MAX_INTENTOS_EMAIL = 5`, `ESPERAS_REINTENTO_EMAIL_MS = [60_000, 600_000, 3_600_000, 21_600_000]`,
  `DIAS_MAILS_FALLIDOS_VISIBLES = 30`, `DIAS_ANTES_EVENTO_PROXIMO = 1`.
- Tipos: `EventoAviso`, `NombreEventoAviso`, `Destinatario`, `EntradaCatalogo`, `CATALOGO_AVISOS`,
  `Disparador` (`contenido_liberado` | `solicitud_actualizada` | `evento_proximo` |
  `recordatorio_inscripcion` | `proceso_actualizado`), `AvisoResumen`, `AvisoDetalle`,
  `NotificacionManualResumen`, `NotificacionManualDetalle`, `ConteoDestinatarios`,
  `MailFallido`, `NuevaNotificacionManual`. Contratos en `contracts/`.
- `eventos-discipulado.ts` queda como reexport del subconjunto `discipulado.*` de `EventoAviso`
  durante la transición y se elimina en el mismo lote que cambia las llamadas de la 004.

## Códigos de error nuevos (`error-code.ts`)

- `NOTIFICACION_SIN_DESTINATARIOS` (409): el alcance elegido no tiene Personas activas.
- `ALCANCE_NO_DISPONIBLE` (409): el Grupo no está en curso o el Ministerio no está activo / no
  existe.
- Bajo `VALIDACION` (campo): `TITULO_REQUERIDO`, `TITULO_DEMASIADO_LARGO`, `MENSAJE_REQUERIDO`,
  `MENSAJE_DEMASIADO_LARGO`, `ALCANCE_REQUERIDO`, `ALCANCE_ID_REQUERIDO`.
- Aviso de otra Persona o inexistente: `NO_ENCONTRADO` (existente).

## Datos de demo y e2e

- `seed-demo.ts` (D120): para las Personas de demo, ~25 avisos de una de ellas (para ver el
  paginado), mezcla de leídos/sin leer, uno por cada evento de la 004 y `persona.cuenta_activada`,
  dos manuales (uno con título de 80 caracteres con tildes, uno con mensaje de 1000 caracteres y
  saltos de línea), uno importante con una Entrega email `fallida`.
- `sembrar-e2e-admin.ts`: nada nuevo por defecto; los e2e crean sus avisos por API o por
  transiciones reales.
- `limpiar-e2e.ts` (H-67): antes de borrar Personas `e2e-`, borrar sus Entregas y las
  Notificaciones que quedan sin Entregas o que crearon ellas. Única excepción al soft delete, como
  ya hace el script.
