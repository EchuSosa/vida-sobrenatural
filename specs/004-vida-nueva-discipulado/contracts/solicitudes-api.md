# Contrato: Solicitudes de Discipulado — pedir, cruce, proponer (Historias 1, 2 y 3)

Módulo nuevo `apps/api/src/solicitud-discipulado/`. Todos los errores siguen Problem Details con un
`code` de `packages/shared-types/src/error-code.ts` (Principio X); los errores de campo van en
`errors: [{ campo, code }]` bajo `VALIDACION` (H-50). Los permisos se declaran con
`@RequierePermiso` contra `CATALOGO_PERMISOS` (D132). Ningún endpoint declara roles literales.
**Actualizado el 2026-09-27**: franjas, cruce, propuesta y edición del pedido propio.

## Tipos compartidos (`packages/shared-types/src/discipulado.ts`)

- `Franja = { diaSemana: 0..6, inicio: number, fin: number }` (minutos desde las 0:00) y
  `franjasCoinciden(a, b, minimo = MINUTOS_MINIMOS_EN_COMUN)`, con `MINUTOS_MINIMOS_EN_COMUN = 60`.
- `EstadoSolicitud = 'pendiente' | 'propuesta' | 'aprobada' | 'rechazada' | 'retirada'`.
- `TipoSolicitud = 'discipulado'`, el único conectado (FR-025).
- `SolicitudResumen`: la forma base de la bandeja —
  `{ id, tipo, persona: { id, nombre, apellido }, estado, createdAt, revisadoPor | null, creadoPor | null, propuestaVigente: { discipulador: { id, nombre, apellido }, propuestaEn } | null }`.
  `propuestaVigente` alimenta "propuesta a X, hace N días" (FR-038).
- `SolicitudDetalle`: `SolicitudResumen & { franjas: Franja[], persona: { …, edad, genero }, historial: PropuestaHistorial[] }`.
- `PropuestaHistorial`: `{ id, discipulador, propuestaPor, propuestaEn, estado, respondidaEn, motivoDeclinacion, retiradaPor, grupoDestinoId }` — solo el Admin.
- `NombreRegla = 'horario' | 'genero'` (research #12; sumar una regla suma un valor acá).
- `Cruce`: la respuesta del cruce (abajo).
- `EstadoMiDiscipulado`: lo que ve la Persona (FR-026 a FR-028), unión discriminada:
  - `{ estado: 'puede_pedir', ultimo?: 'rechazada' | 'retirada' | 'abandono' }`
  - `{ estado: 'buscando', solicitudId, franjas, createdAt }` — cubre `pendiente` **y** `propuesta`
    (FR-026): la Persona no distingue.
  - `{ estado: 'en_curso', grupoId, discipulador: { nombre, apellido, telefono }, desde }` (FR-027)
  - `{ estado: 'finalizado', finalizadoEn }`
  - `{ estado: 'baja', en }` (FR-042; puede pedir de nuevo)
  Nunca incluye notas ni capítulos (FR-029).

## Mi camino (la Persona; sesión con `estado = activa`, sin permiso del catálogo)

### `GET /discipulado/me`

- **Respuesta:** `EstadoMiDiscipulado`. Precedencia: Inscripción `activa` → `en_curso`;
  `completada` → `finalizado`; Solicitud `pendiente`/`propuesta` → `buscando`; si no,
  `puede_pedir` con el último desenlace (`rechazada`, `retirada` o `abandono`) para el texto.
- Incluye Solicitudes creadas en su nombre.

### `POST /discipulado/solicitudes/me` — pedir (FR-001, FR-032)

- **Cuerpo:** `{ franjas: Franja[] }`.
- **Validación por campo:** `franjas` con al menos un elemento (`FRANJAS_REQUERIDAS`); cada una con
  `diaSemana` 0..6, `inicio`/`fin` en 0..1440 y `fin > inicio` (`FRANJA_FIN_ANTERIOR_AL_INICIO`).
- **201:** `{ id, estado: 'pendiente', createdAt }`.
- **409 `SOLICITUD_DISCIPULADO_YA_PENDIENTE`:** ya tiene una `pendiente` o `propuesta`. La
  garantía la da el índice único parcial: si dos pedidos llegan juntos, el segundo choca con el
  índice y se traduce a este código, no a un 500.
- **409 `VIDA_NUEVA_EN_CURSO_O_COMPLETADA`:** Inscripción `activa` o `completada` en Vida Nueva.
  Una en `abandono` no cuenta (FR-042).

### `PUT /discipulado/solicitudes/me/franjas` — editar horarios (FR-039)

- **Cuerpo:** `{ franjas: Franja[] }`, misma validación.
- **Efecto (transacción):** bloquea la Solicitud abierta de la Persona; exige `pendiente` o
  `propuesta`; reemplaza las franjas; si había una Propuesta `pendiente`, la pasa a `retirada`
  (`retiradaPor = persona`) y la Solicitud vuelve a `pendiente`. Emite `propuesta_retirada` (ver
  `eventos.md`) para que el Admin lo vea.
- **200:** `EstadoMiDiscipulado`. **404 `NO_ENCONTRADO`** si no tiene Solicitud abierta.

### `DELETE /discipulado/solicitudes/me` — retirar el pedido (FR-039)

- **Efecto:** igual que arriba, y la Solicitud pasa a `retirada`. Puede volver a pedir.
- **204** / **404 `NO_ENCONTRADO`.**

## En nombre de otra Persona (FR-002)

### `POST /discipulado/solicitudes`

- **Permiso:** `solicitudes.crear_en_nombre` (`admin`, `discipulador`).
- **Cuerpo:** `{ personaId, franjas: Franja[] }`. La Persona se elige con `GET /personas/buscar`.
- **201 / 409 / 404 `NO_ENCONTRADO`** como el pedido propio; deja `creadoPorId` = el autor.

## La bandeja del Admin

### `GET /solicitudes` (FR-025)

- **Permiso:** `solicitudes.ver` (`admin`, `pastor` solo lectura).
- **Query:** `estado?` (por defecto `pendiente,propuesta`, los dos abiertos), `tipo?`, `orden`
  (`fecha` | `persona` | `espera`), `dir`, `pagina`. Patrón de URL de `pendientes-tutor` (H-101).
- **Respuesta:** `Pagina<SolicitudResumen>`.

### `GET /discipulado/solicitudes/:id` (detalle + historial, FR-038)

- **Permiso:** `solicitudes.ver`. El `historial` solo si tiene `solicitudes.aprobar` (el Pastor no
  ve motivos de declinación).
- **Respuesta:** `SolicitudDetalle`.

### `GET /discipulado/solicitudes/:id/cruce` — el cruce (FR-034, FR-035, FR-045)

- **Permiso:** `solicitudes.aprobar` (`admin`).
- **Respuesta `Cruce`:**

  ```ts
  {
    franjas: Array<{ franja: Franja; coinciden: DiscipuladorEnCruce[] }>;   // por franja de la Persona
    noCoinciden: Array<DiscipuladorEnCruce & { incumple: NombreRegla[] }>;  // disponibles que fallan alguna regla
    sugeridoId: string | null;                                              // FR-035; null si nadie cumple todas
    sinDisponibles: boolean;                                                // FR-007, caso 1
  }
  DiscipuladorEnCruce = {
    id, nombre, apellido, genero,
    carga: { discipuladosActivos: number; propuestasPendientes: number },
    gruposConLugar: Array<{ grupoId, ocupado, maximo, coincideHorario: boolean, personas: string[] }>, // FR-045
  }
  ```

  Un Discipulador que cumple todas aparece en **cada** franja en la que coincide (con la regla de
  horario). `noCoinciden` lista una sola vez a cada uno con sus `incumple` en claves; la pantalla las
  traduce. `franjas[*].coinciden` vacío en todas y `noCoinciden` no vacío = "hay disponibles pero
  ninguno coincide" (FR-007, caso 2).
- Sin sugerido cuando nadie cumple todas: el Admin igual puede elegir de `noCoinciden` (D25).
- Se calcula en la API (reglas en `apps/api/src/discipulado/reglas-de-asignacion/`, research #12);
  la pantalla no reimplementa ninguna regla ni la carga.

### `POST /discipulado/solicitudes/:id/proponer` — proponer (FR-003, FR-036)

- **Permiso:** `solicitudes.aprobar`.
- **Cuerpo:** `{ discipuladorId, grupoDestinoId?: string }`.
- **Transacción:** bloquea la Solicitud (`FOR UPDATE`) y exige `pendiente` → bloquea la fila
  `personas` del Discipulador (D137) y exige que esté disponible (FR-006) → si `grupoDestinoId`,
  exige que sea un Grupo `en_curso` del mismo Discipulador con lugar → crea la
  `PropuestaDiscipulado` (`nueva`, `pendiente`) y pasa la Solicitud a `propuesta` con
  `revisadoPorId`/`revisadaEn`. **No crea Grupo ni Liderazgo.** Emite `propuesta_nueva`.
- **200:** `{ propuestaId }`.
- **409 `SOLICITUD_NO_PENDIENTE`** (otro Admin llegó antes, u otra pestaña) ·
  **409 `DISCIPULADOR_NO_DISPONIBLE`** (dejó de cumplir FR-006; la pantalla recarga el cruce) ·
  **409 `GRUPO_SIN_LUGAR`** · **409 `VIDA_NUEVA_EN_CURSO_O_COMPLETADA`.**
- Elegir a uno de `noCoinciden` **no** es un error: D25.

### `POST /discipulado/solicitudes/:id/retirar-propuesta` (FR-036)

- **Permiso:** `solicitudes.aprobar`.
- **Transacción:** bloquea la Solicitud, exige `propuesta`; Propuesta → `retirada`
  (`retiradaPor = admin`); Solicitud → `pendiente`. Emite `propuesta_retirada`.
- **200** / **409 `SOLICITUD_NO_PROPUESTA`.**

### `POST /discipulado/solicitudes/:id/rechazar` (FR-008)

- **Permiso:** `solicitudes.aprobar`. **Cuerpo:** vacío.
- **Transacción:** bloquea, exige `pendiente`, pasa a `rechazada` con `revisadoPorId`/`revisadaEn`.
  No crea nada. Emite `solicitud_rechazada`.
- **200** / **409 `SOLICITUD_NO_PENDIENTE`.**

**Qué ya no existe:** `POST …/aprobar` y `GET /discipulado/discipuladores-disponibles` del contrato
anterior. Aprobar pasó a ser aceptar (contrato de discipulado), y el listado plano pasó a ser el
cruce.
