# Contrato: disponibilidad del Discipulador (Historia 4)

Módulo nuevo `apps/api/src/disponibilidad/`. Todo es del propio Discipulador (D134): ningún
endpoint recibe un `personaId` y todo se resuelve desde la sesión.

## Tipos compartidos (`packages/shared-types/src/disponibilidad.ts`)

- `MiDisponibilidad`: `{ disponible: boolean, apareceEnElListado: boolean, bloqueos: BloqueoDisponibilidad[] }`.
  - `apareceEnElListado` = `disponible` y sin bloqueo vigente hoy: exactamente el criterio de
    FR-006. La pantalla lo muestra en palabras ("Hoy el Admin te ve como disponible" / "Hoy no
    aparecés, por tu período del … al …"), para que el Discipulador entienda qué efecto tiene lo
    que marcó.
- `BloqueoDisponibilidad`: `{ id, desde, hasta, vigente: boolean }`.
- `hoyEnArgentina()`: la fecha civil de hoy (research #7). Es la única implementación, y la usan
  la API y el backoffice.

## `GET /disponibilidad/me`

- **Permiso:** `mi_disponibilidad.ver` (`discipulador`).
- **Respuesta:** `MiDisponibilidad`. Muestra los bloqueos vigentes y futuros y oculta los vencidos:
  un período que ya pasó no afecta nada (FR-016).

## `PUT /disponibilidad/me` (FR-015)

- **Permiso:** `mi_disponibilidad.gestionar` (`discipulador`).
- **Cuerpo:** `{ disponible: boolean }`. Es idempotente.
- **Respuesta:** `MiDisponibilidad`.
- No toca los discipulados en curso (FR-018): solo cambia quién aparece en el listado de FR-006.

## `POST /disponibilidad/me/bloqueos` (FR-016, FR-017)

- **Permiso:** `mi_disponibilidad.gestionar`.
- **Cuerpo:** `{ desde, hasta }` como fechas civiles `YYYY-MM-DD`.
- **Validación por campo** (H-50): `desde` y `hasta` obligatorias; `hasta >= desde`
  (`errors: [{ campo: 'hasta', code: 'BLOQUEO_FIN_ANTERIOR_AL_INICIO' }]`); `hasta` no puede estar
  en el pasado (`BLOQUEO_YA_VENCIDO`), porque un período que ya terminó no tiene efecto y
  aceptarlo confunde. El CHECK de la base es la red de seguridad, no el mensaje.
- **201:** `MiDisponibilidad`.
- Se permiten períodos superpuestos (Assumption del spec).
