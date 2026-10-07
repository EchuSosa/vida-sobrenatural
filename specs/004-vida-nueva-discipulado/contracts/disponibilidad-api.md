# Contrato: disponibilidad del Discipulador — agenda, toggle, períodos y máximo por Grupo (Historia 4)

Módulo nuevo `apps/api/src/disponibilidad/`. Todo es del propio Discipulador (D134): ningún
endpoint recibe un `personaId`; todo se resuelve desde la sesión. Pensado para celular (FR-046).
**Actualizado el 2026-09-27**: agenda semanal, toggle apagado por defecto (lo prende el
Discipulador después de cargar su agenda), borrar períodos, máximo por Grupo.

## Tipos compartidos (`packages/shared-types/src/disponibilidad.ts`)

- `Franja` viene de `discipulado.ts` (mismo tipo que las franjas de la Solicitud).
- `FranjaAgenda = Franja & { id }`.
- `BloqueoDisponibilidad = { id, desde, hasta, vigente: boolean }`.
- `MiDisponibilidad`:
  `{ disponible: boolean, maxPersonasPorGrupo: number, franjas: FranjaAgenda[], bloqueos: BloqueoDisponibilidad[], apareceEnElCruce: boolean, porQueNo: 'sin_agenda' | 'toggle_apagado' | 'bloqueo_vigente' | null }`.
  - `apareceEnElCruce` es exactamente FR-006 (agenda + toggle + sin bloqueo vigente).
  - `porQueNo` es la primera razón por la que no aparece, en clave, en este orden: `sin_agenda`,
    `toggle_apagado`, `bloqueo_vigente`. La pantalla la dice en palabras ("Hoy el Admin te ve como
    disponible" / "Todavía no cargaste horarios: hasta que no lo hagas no aparecés para nuevos
    discipulados" / "Ya tenés horarios: prendé tu disponibilidad para aparecer" / "Hoy no aparecés,
    por tu período del … al …").
- `MAX_PERSONAS_POR_GRUPO_VIDA_NUEVA = 6`, `MINUTOS_MINIMOS_EN_COMUN = 60`.
- `hoyEnArgentina(): string` (`YYYY-MM-DD`, fecha civil en `America/Argentina/Buenos_Aires`),
  `bloqueoVigente(bloqueo, hoy)`.

## `GET /disponibilidad/me`

- **Permiso:** `mi_disponibilidad.ver` (`discipulador`).
- **Respuesta:** `MiDisponibilidad`. Franjas sin `eliminadaEn`; bloqueos sin `eliminadoEn` y con
  `hasta >= hoy` (los vencidos no se muestran: no afectan nada).

## Agenda (FR-031)

### `POST /disponibilidad/me/franjas`

- **Permiso:** `mi_disponibilidad.gestionar`.
- **Cuerpo:** `{ diaSemana, inicio, fin }` (minutos; la pantalla convierte desde/hacia `HH:mm`
  en 24 h).
- **Validación por campo:** `diaSemana` 0..6 (`DIA_SEMANA_INVALIDO`); `inicio` 0..1439 y `fin`
  1..1440; `fin > inicio` (`FRANJA_FIN_ANTERIOR_AL_INICIO`, en el campo `fin`, FR-017); al menos
  60 minutos (`FRANJA_MUY_CORTA`, en `fin`); ni igual ni superpuesta a otra franja del mismo día de
  su agenda (`FRANJA_REPETIDA`, `FRANJA_SUPERPUESTA`, en `inicio`) — FR-017a.
- **201:** `MiDisponibilidad`.

### `DELETE /disponibilidad/me/franjas/:id`

- **Permiso:** `mi_disponibilidad.gestionar` + franja propia.
- **Efecto:** `eliminadaEn = now` (borrado lógico, Principio III). Si era la última, la respuesta
  trae `apareceEnElCruce = false, porQueNo = 'sin_agenda'` y la pantalla lo dice.
- **200:** `MiDisponibilidad` · **404 `NO_ENCONTRADO`** (ajena o ya borrada).

## Toggle (FR-015)

### `PUT /disponibilidad/me`

- **Permiso:** `mi_disponibilidad.gestionar`.
- **Cuerpo:** `{ disponible?: boolean, maxPersonasPorGrupo?: number }` — al menos uno. Idempotente.
- **Validación por campo:** `maxPersonasPorGrupo` entero 1..`MAX_PERSONAS_POR_GRUPO_VIDA_NUEVA`
  (`MAXIMO_POR_GRUPO_FUERA_DE_RANGO`).
- **Efecto:** no toca discipulados en curso ni propuestas pendientes (FR-018). Bajar el máximo no
  toca los Grupos que ya tiene (FR-045).
- **200:** `MiDisponibilidad`.

## Períodos de no disponibilidad (FR-016, FR-017, FR-040)

### `POST /disponibilidad/me/bloqueos`

- **Permiso:** `mi_disponibilidad.gestionar`.
- **Cuerpo:** `{ desde, hasta }` como `YYYY-MM-DD`.
- **Validación por campo:** obligatorias; `hasta >= desde` (`BLOQUEO_FIN_ANTERIOR_AL_INICIO`, en
  `hasta`); `hasta >= hoy` (`BLOQUEO_YA_VENCIDO`: un período que ya terminó no tiene efecto y
  aceptarlo confunde). El CHECK de la base es la red de seguridad, no el mensaje.
- **201:** `MiDisponibilidad`. Superposiciones permitidas.

### `PUT /disponibilidad/me/bloqueos/:id` (H-R12)

- **Permiso:** `mi_disponibilidad.gestionar` + bloqueo propio.
- **Cuerpo:** `{ desde, hasta }` (fechas civiles `YYYY-MM-DD`), las mismas validaciones por campo
  que `POST /disponibilidad/me/bloqueos`.
- **Efecto:** cambia las dos fechas. Si queda vigente, deja de aparecer en el cruce en el acto; si
  deja de serlo, vuelve.
- **200:** `MiDisponibilidad` · **400 `VALIDACION`** · **404 `NO_ENCONTRADO`** (ajeno o borrado).

### `DELETE /disponibilidad/me/bloqueos/:id`

- **Permiso:** `mi_disponibilidad.gestionar` + bloqueo propio.
- **Efecto:** `eliminadoEn = now`. Si estaba vigente, vuelve a aparecer en el cruce en el acto.
- **200:** `MiDisponibilidad` · **404 `NO_ENCONTRADO`.**
