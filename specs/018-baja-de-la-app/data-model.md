# Data Model — spec 018

Una migración. La fila de la Persona **queda** (D261): todos los `…PorId` de registros ajenos (quién
revisó, quién asignó, quién cerró) siguen apuntando a ella y se ven como "Persona dada de baja".

## Persona (cambios)

| Campo | Notas |
|---|---|
| dadaDeBajaEn | timestamp?, la marca (FR-002) |
| dadaDeBajaPorId | uuid?, ella misma o el Admin |
| motivoBajaInterno | varchar(200)?, solo el Admin; nunca a logs ni avisos |

Al dar de baja: `nombre` "Persona", `apellido` "dada de baja", `email`, `dni`, `fotoUrl`,
`profesionDetalle` → null, `telefono`, `direccion` → "", `fechaNacimiento` → 1900-01-01,
`activo` → false. El trigger de `telefonoNormalizado` lo deja vacío solo.

## ArchivoPendienteDeBorrar (nueva)

| Campo | Tipo |
|---|---|
| id | uuid |
| ruta | string |
| creadoEn | timestamp |
| intentos | int |

## Qué se hace con cada tabla (FR-003, FR-005)

| Tabla | Acción |
|---|---|
| RelacionFamiliar (como persona o familiar) | se borra |
| FranjaAgenda, BloqueoDisponibilidad | se borran |
| CodigoIngreso (por su email) | se borran |
| EntregaNotificacion (suyas) | se borran |
| ComentarioApp (suyos) | se borran (el texto es suyo; con sesión no guardan contacto) |
| SolicitudDiscipulado, SolicitudVidaServicio, SolicitudBautismo, DeclaracionHistorial, SolicitudGrupoExtension (suyas) | `comentario`/`mensaje`/`motivo…` → null; las abiertas se cierran (retirada) |
| PropuestaDiscipulado (como Discipuladora, pendiente) | se retira con aviso al Admin (Pendientes) |
| Inscripcion / Liderazgo (Vida Nueva y Vida de Servicio, en curso) | baja / cierre como hoy, con aviso; motivos sobre ella → null |
| Postulacion (aprobadas) | inactivas por baja (`motivoBaja` null) + `liberarTurnosFuturos` |
| LiderMinisterio, LiderGrupoExtension (vigentes) | se cierran (`hasta`), con el aviso de cada spec |
| Turno (futuros asignados) | `liberarTurnosFuturos`; `motivoCancelacion` de todos sus turnos → null |
| InscripcionEvento (suyas) | `respuestas` → null; las abiertas se cancelan |
| Pago (de sus inscripciones) | `comprobanteRuta` → null (archivo a ArchivoPendienteDeBorrar); `motivoRechazo` → null |
| EleccionMinisterio (suya) | `comentario`, `notas` → null; abierta → cerrada |
| CompletitudManual (suya) | `nota` → null |
| CambioDeRol | queda (auditoría), sin nombre porque la Persona es anónima |
| Roles de cargo | se quitan con su CambioDeRol (`registrarCambioDeRol`) |

Lo que ella escribió sobre otros (notas de Encuentros, motivos de rechazo que puso como Admin,
avisos manuales) **queda**: es del registro del otro.
