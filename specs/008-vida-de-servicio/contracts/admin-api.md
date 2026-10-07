# Contrato: Admin y Pastor — backoffice

Lectura con `grupos.ver` / `solicitudes.ver` (`admin`, `pastor`); escritura con `grupos.gestionar` /
`solicitudes.aprobar` / `vida_servicio.inscribir_en_nombre` (`admin`). Listados con `Pagina<T>` y
`skip`/`take`/`q`/`orden`/`dir` como el resto del backoffice (`docs/15`, "Listados paginados").

## Ediciones (Grupos de Vida de Servicio) — `grupos/vida-de-servicio`

| Método y ruta | Cuerpo / query | Respuesta / errores |
|---|---|---|
| `GET /grupos/vida-de-servicio` | `estado=en_curso\|finalizado\|todos`, `pendiente=finalizacion\|baja` | `Pagina<EdicionAdminResumen>` (nombre, Sede, fechaInicio, estado, inscripción abierta, inscriptos activos, con alerta de faltas, líderes, pendientes) |
| `POST /grupos/vida-de-servicio` | `{ nombre, sedeId, fechaInicio, semanas: string[] /* fechas */, lideres: string[] }` | `201 { grupoId }`. Campos: `NOMBRE_REQUERIDO`, `SEDE_INACTIVA`, `SEMANAS_FUERA_DE_RANGO`, `FECHAS_NO_CRECIENTES` (con índice), `PRIMERA_SEMANA_ANTES_DEL_INICIO`, `LIDERES_REQUERIDOS`, `PERSONA_SIN_ROL_LIDER` (FR-002, FR-003). Emite `lider_asignado` por cada uno |
| `GET /grupos/vida-de-servicio/:grupoId` | | `EdicionAdminDetalle` = `MiGrupoDetalle` + historial de Liderazgos + bajas y finalización propuestas con quién/cuándo + `inscripcionAbierta` |
| `PUT /grupos/vida-de-servicio/:grupoId/cronograma` | `{ semanas: { numero, fechaLiberacion }[] }` (el cronograma completo) | Valida contra el actual: no mover/quitar liberadas (`SEMANA_LIBERADA_NO_EDITABLE`), solo quitar al final sin material (`SEMANA_CON_MATERIAL`), fechas crecientes (FR-004) |
| `POST /grupos/vida-de-servicio/:grupoId/lideres` | `{ personaId }` | `PERSONA_SIN_ROL_LIDER`, `409 YA_ES_LIDER`. Emite `lider_asignado` |
| `DELETE /grupos/vida-de-servicio/:grupoId/lideres/:personaId` | | Cierra el Liderazgo. `409 ULTIMO_LIDER` (FR-005, bloquea la fila del Grupo) |
| `PUT /grupos/vida-de-servicio/:grupoId/inscripcion-abierta` | `{ abierta: boolean }` | FR-006 |
| `PUT /grupos/vida-de-servicio/:grupoId/asistencia/:fecha` | igual que el Líder | FR-027 (Admin) |
| `GET /grupos/vida-de-servicio/:grupoId/semanas/:numero` | | `ContenidoParaLider` (lectura, FR-038) |
| `POST …/:grupoId/inscripciones/:inscripcionId/baja/confirmar` | `{ tipo? }` | Aplica el tipo propuesto o el corregido. `409 BAJA_NO_PROPUESTA`. Emite `baja_aplicada` |
| `POST …/:grupoId/inscripciones/:inscripcionId/baja/rechazar` | `{ motivo? }` | `409 BAJA_NO_PROPUESTA`. Emite `baja_rechazada` |
| `POST …/:grupoId/inscripciones/:inscripcionId/baja` | `{ tipo, comentario? }` | Baja directa (FR-033). `409 INSCRIPCION_NO_ACTIVA`. Emite `baja_aplicada` |
| `POST …/:grupoId/finalizacion/confirmar` | | `409 FINALIZACION_NO_PROPUESTA`, `409 BAJAS_PROPUESTAS_SIN_RESOLVER` (con la lista). Transacción de FR-036. Emite `finalizacion_confirmada` por Persona |
| `POST …/:grupoId/finalizacion/rechazar` | `{ motivo? }` | Emite `finalizacion_rechazada` |

## Solicitudes

| Método y ruta | Cuerpo / query | Respuesta / errores |
|---|---|---|
| `GET /solicitudes` | suma `tipo=discipulado\|vida_servicio` (sin = las dos) | `Pagina<SolicitudResumen>` con `tipo` en cada fila (research #7). Contrato de la 004 sin otros cambios |
| `GET /vida-de-servicio/solicitudes/:id` | | `SolicitudVidaServicioDetalle`: Persona (nombre, edad, contacto), `prerrequisito: { via: 'inscripcion', grupoId, cursoTipo } \| { via: 'completitud_manual', fecha }`, edición pedida, `creadoPor`, estado, revisión, y las ediciones en curso para elegir |
| `POST /vida-de-servicio/solicitudes/:id/aprobar` | `{ grupoId }` | FR-016. `409 SOLICITUD_NO_PENDIENTE`, `422 VIDA_SERVICIO_PRERREQUISITO_NO_CUMPLIDO`, `409 VIDA_SERVICIO_EN_CURSO_O_COMPLETADA`, campo `grupoId`: `EDICION_NO_DISPONIBLE` (en curso, de Vida de Servicio; la inscripción cerrada **no** impide). Bloquea la Solicitud y la Persona. Emite `solicitud_aprobada` |
| `POST /vida-de-servicio/solicitudes/:id/rechazar` | `{ motivo? }` | `409 SOLICITUD_NO_PENDIENTE`. Emite `solicitud_rechazada` |
| `POST /vida-de-servicio/solicitudes` | `{ personaId, grupoId \| null }` | En nombre de (FR-013), mismas reglas que `…/me` salvo la edad. `creadoPorId` = el Admin |

## Pendientes del Admin

`GET /discipulado/pendientes-admin` (004) se generaliza a `GET /pendientes-admin` en un módulo
`pendientes/` que suma `vidaDeServicio: { finalizaciones: { grupoId; nombre; en }[]; bajas: {
grupoId; inscripcionId; persona; tipo; en }[] }`. La ruta vieja queda como alias hasta que la tarjeta
del backoffice use la nueva, en el mismo lote (sin romper a la 004).

## Roles

`PersonaParaQuitarRol` suma `gruposServicioActivos: { grupoId; nombre }[]`; `puedeQuitarRol` rechaza
quitar `lider_curso` con motivo `LIDER_TIENE_GRUPOS_ACTIVOS` y la lista (FR-040). El panel de roles
de Personas enlaza cada Grupo a `/grupos/vida-de-servicio/[id]`.
