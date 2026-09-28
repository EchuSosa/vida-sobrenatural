# Contrato: discipulados — seguimiento, Encuentros, finalización y reasignación (Historias 3, 5 y 6)

Módulo nuevo `apps/api/src/discipulado/`. Mismas reglas de errores y permisos que
`solicitudes-api.md`.

**Autorización por registro (Principio V):** el permiso dice si el rol puede hacer la acción, y el
servicio dice si **este** discipulado es suyo: existe un Liderazgo **vigente** del usuario sobre ese
Grupo. Si no es suyo, responde **404 `NO_ENCONTRADO`**, igual que si no existiera, para
no confirmar que existe un discipulado ajeno ni a quién pertenece.

## Tipos compartidos (`packages/shared-types/src/discipulado.ts`)

- `DiscipuladoResumen` (vista administrativa, D134): `{ grupoId, persona: { id, nombre, apellido }, discipulador: { id, nombre, apellido }, desde, estado, cantidadEncuentros, ultimoEncuentro: { fecha, capitulos } | null, propuestaFinalizacionEn }`. **Sin notas.**
- `EncuentroAdministrativo`: `{ id, fecha, capitulos, presente }`. **Sin notas** (D134).
- `EncuentroDelDiscipulador`: `EncuentroAdministrativo & { notas: string | null }`.
- `MiDiscipulado`: `{ grupoId, persona: { nombre, apellido, telefono, direccion }, desde, estado, propuestaFinalizacionEn, finalizacionRechazada: { en, motivo } | null }`.
- `DiscipuladoActivo`: `{ grupoId, persona: { nombre, apellido } }`, lo que nombra el rechazo de
  FR-009 del 005.

## Vista administrativa (Admin y Pastor)

### `GET /grupos/discipulados`

- **Permiso:** `grupos.ver` (`admin`, `pastor`).
- **Query:** `estado?` (`en_curso` por defecto | `finalizado`), `propuesta?` (`true` = solo los que
  tienen una finalización propuesta), `orden`, `dir`, `pagina`.
- **Respuesta:** `Pagina<DiscipuladoResumen>`. El `select` no incluye `Encuentro.notas` (test de
  integración que lo afirma).

### `GET /grupos/discipulados/:grupoId`

- **Permiso:** `grupos.ver`.
- **Respuesta:** `DiscipuladoResumen & { encuentros: EncuentroAdministrativo[], liderazgos: { discipulador, desde, hasta }[] }`,
  con los Encuentros en orden por fecha y el historial de Discipuladores (FR-030).

### `POST /grupos/discipulados/:grupoId/finalizacion/confirmar` (FR-019 a FR-021)

- **Permiso:** `grupos.gestionar` (`admin`).
- **En una transacción:** bloquea el Grupo y exige `en_curso` y una propuesta vigente. Pasa a
  `finalizado` con `finalizadoEn` y `finalizadoPorId`, y pasa **todas** las Inscripciones `activa`
  del Grupo a `completada`. No toca `apto_ministerio` (FR-022).
- **409 `FINALIZACION_NO_PROPUESTA`** (FR-020) · **409 `DISCIPULADO_NO_EN_CURSO`.**

### `POST /grupos/discipulados/:grupoId/finalizacion/rechazar` (FR-019a)

- **Permiso:** `grupos.gestionar`.
- **Cuerpo:** `{ motivo?: string }`, hasta 500 caracteres (error de campo `MOTIVO_DEMASIADO_LARGO`).
- **Efecto:** limpia la propuesta y guarda `finalizacionRechazadaEn` y el motivo. La Inscripción
  no cambia.
- **409 `FINALIZACION_NO_PROPUESTA`** · **409 `DISCIPULADO_NO_EN_CURSO`.**

### `POST /grupos/discipulados/:grupoId/reasignar` (FR-030)

- **Permiso:** `grupos.gestionar`.
- **Cuerpo:** `{ discipuladorId }`, elegido de `GET /discipulado/discipuladores-disponibles`.
- **En una transacción:** bloquea el Grupo y exige `en_curso`. Bloquea la fila de la Persona del
  nuevo Discipulador y exige lo mismo que al aprobar (D137). Cierra el Liderazgo vigente (`hasta`,
  `cerradoPorId`) y abre uno nuevo. Los Encuentros y las Asistencias no se tocan.
- **409 `REASIGNACION_AL_MISMO_DISCIPULADOR`** · **409 `DISCIPULADOR_NO_DISPONIBLE`** ·
  **409 `DISCIPULADO_NO_EN_CURSO`.**

## Escritorio del Discipulador (D134: recortado por identidad)

### `GET /discipulado/mis-discipulados`

- **Permiso:** `mis_discipulados.ver` (`discipulador`).
- **Respuesta:** `MiDiscipulado[]` de sus Liderazgos **vigentes**, sin paginar (son los propios, un
  número chico). Los finalizados salen de la lista.

### `GET /discipulado/mis-discipulados/:grupoId`

- **Permiso:** `mis_discipulados.ver` + ser el Discipulador vigente.
- **Respuesta:** `MiDiscipulado & { encuentros: EncuentroDelDiscipulador[] }`, con notas, incluidas
  las de un Discipulador anterior (`data-model.md` → Encuentro).
- Los datos de contacto (`telefono`, `direccion`) solo salen por acá (FR-011, SC-003).

### `POST /discipulado/mis-discipulados/:grupoId/encuentros` (FR-009, FR-013, FR-013a)

- **Permiso:** `mis_discipulados.gestionar` (`discipulador`) + ser el Discipulador vigente.
- **Cuerpo:** `{ fecha, capitulos, notas?, presente = true }`.
- **Validación por campo:** `fecha` obligatoria, no futura (`FECHA_FUTURA`); `capitulos`
  obligatorio de 1 a 200 caracteres; `notas` hasta 2000 caracteres.
- **Efecto:** crea el Encuentro y una Asistencia por cada Inscripción `activa`, en una
  transacción.
- **201:** `EncuentroDelDiscipulador` · **409 `DISCIPULADO_NO_EN_CURSO`.**

### `POST /discipulado/mis-discipulados/:grupoId/finalizacion/proponer` (FR-019)

- **Permiso:** `mis_discipulados.gestionar` + ser el Discipulador vigente.
- **Efecto:** `propuestaFinalizacionEn`, `propuestaFinalizacionPorId`. No borra el último rechazo:
  queda como historia visible hasta que se confirme.
- **409 `FINALIZACION_YA_PROPUESTA`** · **409 `DISCIPULADO_NO_EN_CURSO`.**

## Cambio al contrato del spec 005 — `DELETE /personas/:id/roles/discipulador` (cierra H-127)

- **Antes:** 409 `DISCIPULADOR_SIN_VERIFICACION_DE_DISCIPULADOS_ACTIVOS` **siempre** (falla cerrada).
- **Ahora:** con la fila de la Persona bloqueada, `discipuladosActivosDe(tx, id)`. Si la lista está
  vacía, se quita (con su fila de `CambioDeRol`, como cualquier quita). Si no, **409
  `DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS`** con la extensión
  `discipulados: DiscipuladoActivo[]`, y el backoffice arma con next-intl un mensaje que los
  nombra (FR-009 y SC-009 del 005).
- `GET /personas`: `quitar.discipulador` pasa a ser `{ puede: false, motivo: 'DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS' }`
  solo para quien tiene discipulados activos, calculado para toda la página en una consulta.
