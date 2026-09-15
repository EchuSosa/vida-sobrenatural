# Roles y Permisos

**Principio general:** los roles son **acumulativos**, no excluyentes. Una Persona va sumando roles a su perfil a medida que avanza (ej: empieza como Miembro registrado, se le agrega Vida Nueva, después Vida de Servicio, después Miembro de Ministerio), sin perder los anteriores.

| Rol | Descripción | Visibilidad / permisos | Necesita login |
|---|---|---|---|
| **Visitante** | Cualquier persona, sin registrarse. | Contenido público de Bienvenida (institucional, "En qué creemos", contactos, cartelera, Ofrendas, listado de Ministerios). | No |
| **Miembro registrado** | Se registró (SSO, mayor de 18) sin curso habilitado aún. | Igual que Visitante + su propio perfil (editable) + Relaciones Familiares. | Sí |
| **En curso: Vida Nueva** | Pertenece a un Grupo de Vida Nueva — individual (1 a 1) o grupal (para quienes vienen de otra congregación). | Ve el registro de sus propios Encuentros (no libera contenido digital). | Sí |
| **En curso: Vida de Servicio** | Pertenece a un Grupo grupal con cronograma fijo. Requiere haber completado antes Vida Nueva (individual o grupal, cualquiera cuenta) — ver decisión D74. | Contenido liberado por semana para todo el grupo; ve su propia Asistencia. | Sí |
| **Apto para Ministerio** | Flag activado automáticamente al completar Vida de Servicio (Inscripción `completada`, no `dada_de_baja` ni `abandono`) — ver decisiones D39-D40. | Ve el formulario de postulación a Ministerios (incluye elección de Célula). | Sí |
| **Miembro de Ministerio** | Ya fue aceptado en un Ministerio (y opcionalmente una Célula dentro de él). | Contenido específico de su Ministerio/Célula. | Sí |
| **Discipulador** | A cargo de uno o más Grupos de Vida Nueva. Generalmente es un líder ya reconocido de la iglesia — el Admin lo elige a su criterio al asignar (ver decisión D25), no cualquier Miembro registrado. | Ve y registra Encuentros de sus discípulos asignados; **ve datos de contacto (teléfono, dirección)** para coordinar encuentros. Gestiona su propia **Disponibilidad** (toggle manual + Bloqueos de Disponibilidad por fecha). No ve discípulos de otros discipuladores. | Sí (acceso a back office limitado a lo suyo) |
| **Líder de curso (Vida de Servicio)** | Gestiona uno o más Grupos grupales. | Ve inscriptos de su Grupo, habilita contenido semanal, toma Asistencia, propone dar de baja o finalizar el Grupo. No ve otros Grupos. | Sí |
| **Admin** | Gestión total del sistema (rol inicial: una sola persona). | Todo: usuarios, roles, cursos, grupos, ministerios, células, eventos, pagos, revisión de Solicitudes/Postulaciones, vista unificada de Personas, y **Completitud Manual** (marcar un Curso como completado sin Grupo/Inscripción real, para destrabar prerrequisitos). | Sí |
| **Pastor / Pastora** | Rol de solo consulta, distinto de Admin — aplica indistintamente a pastores y pastoras (la iglesia tiene varias parejas pastorales). | Ve toda la información del sistema, incluyendo datos de contacto (ver decisión D64), sin permisos de edición/gestión. | Sí |

**Confirmado:** una Persona solo puede pertenecer a un Ministerio activo a la vez, pero puede cambiar de Ministerio (la postulación anterior queda como histórico/inactiva, ver `04-dominio-entidades.md` y `05-decisiones.md`).

---
*Sesión de origen: Sesión 2 (cerrada). Actualizado en Sesiones 3 y 4, y fuera de sesión formal con las mejoras de disponibilidad del Discipulador, Vida Nueva Grupal y revisión del rol Pastor.*
