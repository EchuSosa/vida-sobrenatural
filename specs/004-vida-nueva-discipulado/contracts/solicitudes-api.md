# Contrato: Solicitudes de Discipulado (Historias 1, 2 y 3)

Módulo nuevo `apps/api/src/solicitud-discipulado/`. Todos los errores siguen Problem Details con un
`code` de `packages/shared-types/src/error-code.ts` (Principio X), y los errores de campo van en
`errors: [{ campo, code }]` (H-50). Los permisos se declaran con `@RequierePermiso` contra
`CATALOGO_PERMISOS` (D132). Ningún endpoint declara roles literales.

## Tipos compartidos (`packages/shared-types/src/discipulado.ts`)

- `EstadoSolicitud = 'pendiente' | 'aprobada' | 'rechazada'`
- `TipoSolicitud = 'discipulado'`, el único conectado. El filtro existe y la interfaz no lo
  muestra (FR-025).
- `SolicitudResumen`: la forma base de la bandeja genérica —
  `{ id, tipo, persona: { id, nombre, apellido }, estado, createdAt, revisadoPor: { id, nombre, apellido } | null, creadoPor: { id, nombre, apellido } | null }`.
- `EstadoMiDiscipulado`: lo que ve la Persona (FR-026 a FR-028), una unión discriminada:
  - `{ estado: 'puede_pedir' }`
  - `{ estado: 'pendiente', solicitudId, createdAt }`
  - `{ estado: 'rechazada', revisadaEn }` (y puede volver a pedir, FR-008)
  - `{ estado: 'en_curso', discipulador: { nombre, apellido }, desde }`
  - `{ estado: 'finalizado', finalizadoEn }`
  Nunca incluye notas ni capítulos (FR-029).

## `GET /discipulado/me` — el estado propio (FR-026 a FR-028)

- **Acceso:** sesión con `estado = activa` (sin permiso del catálogo, research #9).
- **Respuesta:** `EstadoMiDiscipulado`. Precedencia: un Grupo `en_curso` o `finalizado` gana sobre
  una Solicitud; una `pendiente` gana sobre una `rechazada`. Una Solicitud rechazada seguida de
  otra pendiente muestra la pendiente.
- Incluye las Solicitudes que se crearon en su nombre (Clarificación 2026-09-27).

## `POST /discipulado/solicitudes/me` — pedir Vida Nueva (FR-001)

- **Acceso:** sesión con `estado = activa`.
- **Cuerpo:** vacío.
- **201:** `{ id, estado: 'pendiente', createdAt }`.
- **409 `SOLICITUD_DISCIPULADO_YA_PENDIENTE`:** ya tiene una pendiente (escenario 3 de la
  Historia 1). La garantía la da el índice único parcial: si dos pedidos llegan juntos, el segundo
  choca con el índice y se traduce a este mismo código, no a un 500.
- **409 `VIDA_NUEVA_EN_CURSO_O_COMPLETADA`:** tiene una Inscripción `activa` o `completada` en
  Vida Nueva (escenario 4 de la Historia 1).

## `POST /discipulado/solicitudes` — en nombre de otra Persona (FR-002)

- **Permiso:** `solicitudes.crear_en_nombre` (`admin`, `discipulador`).
- **Cuerpo:** `{ personaId }`. La pantalla la elige con `GET /personas/buscar`, que ya existe.
- **201:** igual que arriba, y deja `creadoPorId` = el autor.
- **409:** los mismos dos códigos de arriba. **404 `NO_ENCONTRADO`** si no existe o
  `activo = false`.

## `GET /solicitudes` — la bandeja genérica (FR-025)

- **Permiso:** `solicitudes.ver` (`admin`, `pastor`, este último de solo lectura).
- **Query:** `estado?` (por defecto `pendiente`), `tipo?` (acepta solo `discipulado`), `orden`
  (`fecha` | `persona`), `dir`, `pagina`. Mismo patrón de listado paginado en la URL que
  `pendientes-tutor` (H-101).
- **Respuesta:** `Pagina<SolicitudResumen>`.

## `GET /discipulado/discipuladores-disponibles` — el listado de FR-006

- **Permiso:** `solicitudes.aprobar` (`admin`).
- **Respuesta:** `{ id, nombre, apellido }[]` en orden alfabético, sin sugerencia (D25). Criterio en
  `data-model.md` → "Listado de Discipuladores disponibles". Sin paginar: son las personas con un
  rol de cargo en una iglesia, un número chico y acotado.
- La lista vacía es una respuesta válida (`[]`), y la pantalla muestra el estado vacío explicado
  (FR-007).

## `POST /discipulado/solicitudes/:id/aprobar` — aprobar y armar el Grupo (FR-003 a FR-005)

- **Permiso:** `solicitudes.aprobar`.
- **Cuerpo:** `{ discipuladorId }`.
- **En una transacción:**
  1. Bloquea la Solicitud (`FOR UPDATE`) y exige que esté `pendiente`.
  2. Bloquea la fila de la Persona del Discipulador (D137) y exige que tenga el rol
     `discipulador`, que esté disponible y que no tenga un bloqueo vigente. Así, un rol quitado o
     una disponibilidad apagada a la vez no se cuelan.
  3. Vuelve a exigir que la Persona no esté cursando ni haya completado Vida Nueva.
  4. Crea el Grupo (`en_curso`, Curso Vida Nueva individual, Sede de la Persona), la Inscripción
     `activa` y el Liderazgo vigente, y pasa la Solicitud a `aprobada` con `revisadoPorId`,
     `revisadaEn` y `grupoId`.
- **200:** `{ solicitudId, grupoId }`.
- **409 `SOLICITUD_NO_PENDIENTE`:** ya resuelta (otro Admin, u otra pestaña).
- **409 `DISCIPULADOR_NO_DISPONIBLE`:** el elegido dejó de cumplir FR-006 entre que se cargó el
  listado y se confirmó. La pantalla recarga el listado.
- **409 `VIDA_NUEVA_EN_CURSO_O_COMPLETADA`.**

## `POST /discipulado/solicitudes/:id/rechazar` (FR-008)

- **Permiso:** `solicitudes.aprobar`.
- **Cuerpo:** vacío. El spec no pide motivo de rechazo de la Solicitud.
- **En una transacción:** bloquea, exige `pendiente` y pasa a `rechazada` con `revisadoPorId` y
  `revisadaEn`. No crea nada.
- **200** / **409 `SOLICITUD_NO_PENDIENTE`.**
