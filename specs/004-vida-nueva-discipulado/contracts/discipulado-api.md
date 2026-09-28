# Contrato: discipulados — propuestas, Encuentros, finalización, baja y reasignación (Historias 3, 5, 6, 7 y 8)

Módulo nuevo `apps/api/src/discipulado/`. Mismas reglas de errores y permisos que
`solicitudes-api.md`. **Actualizado el 2026-09-27.**

**Autorización por registro (Principio V):** el permiso dice si el rol puede hacer la acción; el
servicio dice si **este** discipulado es suyo: existe un Liderazgo **vigente** del usuario sobre
ese Grupo. Una propuesta pendiente **no** es un Liderazgo: da acceso a la propuesta, no al
discipulado ni al contacto. Si no es suyo, **404 `NO_ENCONTRADO`**, igual que si no existiera.

## Tipos compartidos (`packages/shared-types/src/discipulado.ts`)

- `DiscipuladoResumen` (vista administrativa, D134): `{ grupoId, personas: { id, nombre, apellido, estadoInscripcion, bajaPropuesta: boolean }[], discipulador: { id, nombre, apellido }, desde, estado, motivoCierre, lugar: { ocupado, maximo }, cantidadEncuentros, ultimoEncuentro: { fecha, capitulos } | null, propuestaFinalizacionEn, reasignacionPropuesta: { discipulador, propuestaEn } | null }`. **Sin notas.**
- `EncuentroAdministrativo`: `{ id, fecha, capitulos, asistencias: { personaId, presente }[], updatedAt }`. **Sin notas.**
- `EncuentroDelDiscipulador`: `EncuentroAdministrativo & { notas: string | null }`.
- `Contacto`: `{ telefono, direccion, tutor: { nombre, telefono } | null }` (FR-011, FR-044).
- `MiDiscipulado`: `{ grupoId, personas: { inscripcionId, nombre, apellido, edad, contacto: Contacto, bajaPropuesta: { en, motivo } | null, bajaRechazada: { en, motivo } | null }[], desde, estado, lugar, propuestaFinalizacionEn, finalizacionRechazada: { en, motivo } | null }`.
- `PropuestaParaMi` (FR-037): `{ propuestaId, tipo, persona: { nombre, apellido, edad }, franjasEnComun: Franja[], incumple: NombreRegla[], grupoDestino: { grupoId, personas: string[] } | null, propuestaEn }`. **Sin contacto.**
- `DiscipuladoActivo`: `{ grupoId, persona: { nombre, apellido } }` y `PropuestaPendiente`:
  `{ propuestaId, persona: { nombre, apellido } }` — lo que nombra el rechazo de FR-043.
- `PendientesAdmin` (FR-048): `{ propuestasDeclinadas, propuestasSinRespuesta, finalizacionesPropuestas, bajasPropuestas }`, cada uno `{ cantidad, enlace }`.

## Escritorio del Discipulador (D134; celular primero, FR-046)

### `GET /discipulado/mis-discipulados`

- **Permiso:** `mis_discipulados.ver`.
- **Respuesta:** `{ propuestas: PropuestaParaMi[], discipulados: MiDiscipulado[], tieneAgenda: boolean }`.
  `propuestas` primero: es lo que hay que responder. `tieneAgenda = false` dispara el estado vacío
  de FR-047. Sin paginar (son los propios).

### `POST /discipulado/propuestas/:propuestaId/aceptar` (FR-037, FR-004, FR-030)

- **Permiso:** `mis_discipulados.gestionar` + ser el Discipulador de la Propuesta.
- **Transacción:** bloquea la Propuesta y exige `pendiente` → bloquea la fila `personas` del
  Discipulador (D137) y exige el rol → si `tipo = nueva`: re-exige que la Persona no curse ni haya
  completado Vida Nueva; si `grupoDestinoId`, bloquea ese Grupo y re-cuenta el lugar
  (`GRUPO_SIN_LUGAR` si ya no hay); crea Grupo (`en_curso`, Curso `(vida_nueva, individual)`, Sede
  de la Persona) salvo destino, la Inscripción `activa` (con `solicitudId`) y el Liderazgo
  (`propuestaId`); Solicitud → `aprobada` con `grupoId`. Si `tipo = reasignacion`: exige Grupo
  `en_curso`, cierra el Liderazgo vigente (`hasta`, `cerradoPorId` = quien propuso) y abre el
  nuevo; Encuentros, Asistencias y la propuesta de finalización no se tocan. Propuesta →
  `aceptada`. Emite `propuesta_aceptada`.
- **200:** `{ grupoId }`.
- **409 `PROPUESTA_NO_VIGENTE`** (ya respondida o retirada) · **409 `GRUPO_SIN_LUGAR`** ·
  **409 `VIDA_NUEVA_EN_CURSO_O_COMPLETADA`** · **409 `DISCIPULADO_NO_EN_CURSO`.**

### `POST /discipulado/propuestas/:propuestaId/declinar` (FR-037)

- **Permiso:** `mis_discipulados.gestionar` + ser el Discipulador de la Propuesta.
- **Cuerpo:** `{ motivo?: string }` hasta 500 (`MOTIVO_DEMASIADO_LARGO`).
- **Transacción:** Propuesta → `declinada` con motivo; Solicitud → `pendiente` (o nada, si era
  reasignación). Emite `propuesta_declinada`.
- **200** / **409 `PROPUESTA_NO_VIGENTE`.**

### `GET /discipulado/mis-discipulados/:grupoId`

- **Permiso:** `mis_discipulados.ver` + Liderazgo vigente.
- **Respuesta:** `MiDiscipulado & { encuentros: EncuentroDelDiscipulador[] }`, con notas (incluidas
  las de un Discipulador anterior). El `contacto` de cada Persona, con el del tutor si es menor
  (FR-044, research #19), sale **solo** por acá (FR-011, SC-003).

### `POST /discipulado/mis-discipulados/:grupoId/encuentros` (FR-009, FR-013, FR-013a)

- **Permiso:** `mis_discipulados.gestionar` + Liderazgo vigente.
- **Cuerpo:** `{ fecha, capitulos, notas?, asistencias?: { inscripcionId, presente }[] }`. Las
  Inscripciones `activa` que no vengan se toman como presentes.
- **Validación por campo:** `fecha` obligatoria y no futura (`FECHA_FUTURA`); `capitulos` 1..200
  (`CAPITULOS_REQUERIDO`); `notas` hasta 2000; cada `inscripcionId` del Grupo.
- **201:** `EncuentroDelDiscipulador` · **409 `DISCIPULADO_NO_EN_CURSO`.**

### `PATCH /discipulado/mis-discipulados/:grupoId/encuentros/:encuentroId` (FR-041)

- **Permiso:** `mis_discipulados.gestionar` + Liderazgo vigente + Encuentro del Grupo.
- **Cuerpo:** cualquier subconjunto de `{ fecha, capitulos, notas, asistencias }`, misma
  validación. `updatedAt` cambia. **No hay `DELETE`.**
- **200** / **409 `DISCIPULADO_NO_EN_CURSO`** (Grupo cerrado: no se edita).

### `POST /discipulado/mis-discipulados/:grupoId/finalizacion/proponer` (FR-019)

- **Permiso:** `mis_discipulados.gestionar` + Liderazgo vigente.
- **Efecto:** `propuestaFinalizacionEn`, `propuestaFinalizacionPorId`. Emite `finalizacion_propuesta`.
- **409 `FINALIZACION_YA_PROPUESTA`** · **409 `DISCIPULADO_NO_EN_CURSO`.**

### `POST /discipulado/mis-discipulados/:grupoId/inscripciones/:inscripcionId/baja/proponer` (FR-042)

- **Permiso:** `mis_discipulados.gestionar` + Liderazgo vigente + Inscripción `activa` del Grupo.
- **Cuerpo:** `{ motivo?: string }` hasta 500.
- **Efecto:** `bajaPropuestaEn`, `bajaPropuestaPorId`, `bajaPropuestaMotivo`. La Persona sigue
  activa. Emite `baja_propuesta`.
- **409 `BAJA_YA_PROPUESTA`** · **409 `DISCIPULADO_NO_EN_CURSO`.**

## Vista administrativa (Admin y Pastor)

### `GET /grupos/discipulados`

- **Permiso:** `grupos.ver`.
- **Query:** `estado?` (`en_curso` por defecto | `finalizado`), `pendiente?`
  (`finalizacion` | `baja` | `reasignacion`: solo los que tienen esa propuesta), `orden`, `dir`, `pagina`.
- **Respuesta:** `Pagina<DiscipuladoResumen>`. El `select` no incluye `Encuentro.notas` (test).

### `GET /grupos/discipulados/:grupoId`

- **Permiso:** `grupos.ver`.
- **Respuesta:** `DiscipuladoResumen & { encuentros: EncuentroAdministrativo[], liderazgos: { discipulador, desde, hasta }[], franjasDelGrupo: Franja[] }`.
  `franjasDelGrupo` es el horario derivado (research #14), para que el Admin vea cuándo se junta el
  Grupo.

### `GET /grupos/discipulados/:grupoId/cruce` — reasignación (FR-030)

- **Permiso:** `grupos.gestionar`.
- **Respuesta:** `Cruce` (mismo tipo que el de una Solicitud), calculado contra las franjas de la
  Solicitud original de cada Persona del Grupo (coinciden = coinciden con **todas** las Personas
  del Grupo), excluyendo al Discipulador vigente. Misma sugerencia.

### `POST /grupos/discipulados/:grupoId/reasignar` (FR-030) — **propone**, no asigna

- **Permiso:** `grupos.gestionar`.
- **Cuerpo:** `{ discipuladorId }`.
- **Transacción:** bloquea el Grupo y exige `en_curso` y ninguna Propuesta de reasignación
  `pendiente` → bloquea la fila del nuevo Discipulador (D137) y exige FR-006 → crea la
  `PropuestaDiscipulado` (`reasignacion`, `pendiente`). El Liderazgo actual sigue hasta que acepte.
  Emite `propuesta_nueva`.
- **409 `REASIGNACION_AL_MISMO_DISCIPULADOR`** · **409 `REASIGNACION_YA_PROPUESTA`** ·
  **409 `DISCIPULADOR_NO_DISPONIBLE`** · **409 `DISCIPULADO_NO_EN_CURSO`.**

### `POST /grupos/discipulados/:grupoId/reasignar/retirar`

- **Permiso:** `grupos.gestionar`. Propuesta → `retirada` (`admin`). **409 `PROPUESTA_NO_VIGENTE`.**

### `POST /grupos/discipulados/:grupoId/finalizacion/confirmar` (FR-019 a FR-021)

- **Permiso:** `grupos.gestionar`.
- **Transacción:** bloquea el Grupo, exige `en_curso` y propuesta. Grupo → `finalizado`,
  `motivoCierre = completado`, `cerradoEn`/`cerradoPorId`; **todas** las Inscripciones `activa` →
  `completada` con `cerradaEn`. No toca `apto_ministerio` (FR-022). Emite
  `finalizacion_confirmada` por cada Persona.
- **409 `FINALIZACION_NO_PROPUESTA`** (FR-020) · **409 `DISCIPULADO_NO_EN_CURSO`.**

### `POST /grupos/discipulados/:grupoId/finalizacion/rechazar` (FR-019a)

- **Permiso:** `grupos.gestionar`. **Cuerpo:** `{ motivo?: string }` hasta 500.
- **Efecto:** limpia la propuesta, guarda `finalizacionRechazadaEn` y el motivo. Nada más cambia.
- **409 `FINALIZACION_NO_PROPUESTA`** · **409 `DISCIPULADO_NO_EN_CURSO`.**

### `POST /grupos/discipulados/:grupoId/inscripciones/:inscripcionId/baja/confirmar` (FR-042)

- **Permiso:** `grupos.gestionar`.
- **Transacción:** bloquea el Grupo y la Inscripción; exige Grupo `en_curso`, Inscripción `activa`
  con baja propuesta. Inscripción → `abandono` con `cerradaEn`. Si no queda ninguna `activa`, Grupo
  → `finalizado`, `motivoCierre = abandonado`, `cerradoEn`/`cerradoPorId`. Emite
  `baja_confirmada`.
- **409 `BAJA_NO_PROPUESTA`** · **409 `DISCIPULADO_NO_EN_CURSO`.**

### `POST /grupos/discipulados/:grupoId/inscripciones/:inscripcionId/baja/rechazar` (FR-042)

- **Permiso:** `grupos.gestionar`. **Cuerpo:** `{ motivo?: string }` hasta 500.
- **Efecto:** limpia la baja propuesta y guarda `bajaRechazadaEn` y el motivo.
- **409 `BAJA_NO_PROPUESTA`.**

### `GET /discipulado/pendientes-admin` (FR-048)

- **Permiso:** `solicitudes.aprobar` o `grupos.gestionar` (cualquiera de los dos; hoy los dos son
  del Admin).
- **Respuesta:** `PendientesAdmin`. "Sin respuesta" = propuestas `pendiente` con `propuestaEn` hace
  más de `DIAS_PROPUESTA_SIN_RESPUESTA = 3` días (constante en `shared-types`; no es un plazo que
  haga nada, solo cuándo se la señala).

## Cambio al contrato del spec 005 — `DELETE /personas/:id/roles/discipulador` (cierra H-127, FR-043)

- **Antes:** 409 `DISCIPULADOR_SIN_VERIFICACION_DE_DISCIPULADOS_ACTIVOS` **siempre** (falla cerrada).
- **Ahora:** con la fila de la Persona bloqueada, `discipuladosActivosDe(tx, id)` y
  `propuestasPendientesDe(tx, id)`. Si las dos listas están vacías, se quita (con su fila de
  `CambioDeRol`). Si no, **409 `DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS`** con las extensiones
  `discipulados: DiscipuladoActivo[]` (cada uno con `grupoId`, para que el panel de roles enlace a
  `/grupos/[id]` y el Admin reasigne desde ahí) y `propuestas: PropuestaPendiente[]`.
- `GET /personas`: `quitar.discipulador` correcto para cada fila, con las dos listas de la página
  en una consulta.
