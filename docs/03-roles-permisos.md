# Roles y Permisos

**Principio general:** los roles son **acumulativos**, no excluyentes. Una Persona va sumando roles a su perfil a medida que avanza (ej: empieza como Miembro registrado, se le agrega Vida Nueva, después Vida de Servicio, después Miembro de Ministerio), sin perder los anteriores.

**Dos clases de rol, que se otorgan de maneras distintas (D131).** La tabla de abajo los lista juntos, pero no funcionan igual:

- **Roles de cargo** — `admin`, `pastor`, `discipulador`, `lider_curso`. Los **otorga y los quita el Admin** desde el backoffice. Una Persona se registra normalmente y queda esperando a que la asciendan; el primer Admin se siembra fuera de la aplicación, en la instalación.
- **Roles de estado del proceso** — `miembro_registrado`, los "En curso", `apto_ministerio`, miembro de Ministerio. Los **escribe el sistema** como consecuencia de un evento de dominio (registrarse, entrar a un Grupo, completar Vida de Servicio, que se apruebe una Postulación). No se otorgan a mano, salvo por la vía de corrección de errores del Flujo 9.

**Ninguna Persona menor de edad puede recibir un rol de cargo (D133).** Los cuatro roles de cargo dan acceso a datos de contacto de otras Personas, incluidos menores, así que es una restricción de protección y no una comodidad de interfaz: aplica sin importar el camino por el que se intente otorgar el rol. Se determina por `fecha_nacimiento`, **no** por el campo `estado` — una Persona activada por el Flujo 7 (menor con autorización del tutor) queda `activa` igual que un adulto.

La distinción importa: tratar un rol de cargo como derivado produce bloqueos reales. Si `discipulador` se dedujera de tener un Grupo activo, quien termina su único discipulado dejaría de serlo y perdería la pantalla donde avisa que está libre para otro — justo el caso que D51 describe como normal (ver H-125 en `specs/revision-manual/`).

**Personas sin acceso a la app** (D97): una Persona dada de alta por el Admin/Discipulador sin cuenta Google/Facebook tiene los mismos roles que cualquier otra (Miembro registrado, En curso, Apto para Ministerio, etc.) — solo que no inicia sesión. El Admin (o el Discipulador, en lo que le corresponde) actúa en su nombre, y recibe por email los avisos importantes si tiene email cargado.

| Rol | Descripción | Visibilidad / permisos | Necesita login |
|---|---|---|---|
| **Visitante** | Cualquier persona, sin registrarse. | Contenido público (Nosotros, "En qué creemos", Primeros pasos, Ministerios, Eventos, Visitanos, Dar). Puede enviar "Contanos qué te parece" (D102). | No |
| **Miembro registrado** | Se registró (SSO, mayor de 18) sin curso habilitado aún, o fue dado de alta por el Admin/Discipulador (D97). | Igual que Visitante + su propio perfil (editable) + Relaciones Familiares + Avisos. | Sí (salvo Personas sin acceso a la app) |
| **En curso: Vida Nueva** | Pertenece a un Grupo de Vida Nueva — individual (1 a 1) o grupal (para quienes vienen de otra congregación). | Ve el registro de sus propios Encuentros (no libera contenido digital). | Sí |
| **En curso: Vida de Servicio** | Pertenece a un Grupo grupal con cronograma fijo. Requiere haber completado antes Vida Nueva (individual o grupal, cualquiera cuenta) — ver decisión D74. | Contenido liberado por semana para todo el grupo; ve su propia Asistencia. | Sí |
| **Apto para Ministerio** | Flag activado automáticamente al completar Vida de Servicio (Inscripción `completada`, no `dada_de_baja` ni `abandono`) — ver decisiones D39-D40. | Ve el formulario de postulación a Ministerios (incluye elección de Célula). | Sí |
| **Miembro de Ministerio** | Ya fue aceptado en un Ministerio (y opcionalmente una Célula dentro de él). | Contenido específico de su Ministerio/Célula. | Sí |
| **Discipulador** | A cargo de uno o más Grupos de Vida Nueva. Generalmente es un líder ya reconocido de la iglesia — el Admin lo elige a su criterio al asignar (ver decisión D25), no cualquier Miembro registrado. | Ve y registra Encuentros de sus discípulos asignados; **ve datos de contacto (teléfono, dirección)** para coordinar encuentros. Gestiona su propia **Disponibilidad** (toggle manual + Bloqueos de Disponibilidad por fecha). Puede **dar de alta Personas** (menores con autorización del tutor, Flujo 7; adultos, Flujo 12) y crear la Solicitud de Discipulado en nombre de una Persona sin acceso a la app. No ve discípulos de otros discipuladores. | Sí (acceso a back office limitado a lo suyo) |
| **Líder de curso (Vida de Servicio)** | Gestiona uno o más Grupos grupales. | Ve inscriptos de su Grupo, habilita contenido semanal, toma Asistencia, propone dar de baja o finalizar el Grupo. No ve otros Grupos. | Sí |
| **Admin** | Gestión total del sistema (rol inicial: una sola persona). | Todo: usuarios (incluida el alta de Personas adultas y menores), roles, cursos, grupos, ministerios, células, eventos, pagos, notificaciones manuales (con opción de marcarlas importantes), revisión de Solicitudes/Postulaciones, **acciones en nombre de una Persona** (solicitudes, inscripciones, pagos — D97), vista unificada de Personas, comentarios de la app (D102), y **Completitud Manual** (marcar un Curso como completado sin Grupo/Inscripción real, para destrabar prerrequisitos). | Sí |
| **Pastor / Pastora** | Rol principalmente de consulta, distinto de Admin — aplica indistintamente a pastores y pastoras (la iglesia tiene varias parejas pastorales). | Ve toda la información del sistema, incluyendo datos de contacto (ver decisión D64). **No es estrictamente de solo lectura desde D129**: administra la Palabra Profética igual que el Admin (crear, editar y marcar vigente), porque la escribe un pastor y no debería depender de quien administra el sistema. Fuera de eso, sin permisos de edición/gestión. | Sí |

**Confirmado:** una Persona solo puede pertenecer a un Ministerio activo a la vez, pero puede cambiar de Ministerio (la postulación anterior queda como histórico/inactiva, ver `04-dominio-entidades.md` y `05-decisiones.md`).

**Trazabilidad:** toda acción hecha en nombre de otra Persona queda registrada con quién la hizo (`creado_por`, `alta_por`).

---
*Sesión de origen: Sesión 2 (cerrada). Actualizado en Sesiones 3 y 4, y fuera de sesión formal con las mejoras de disponibilidad del Discipulador, Vida Nueva Grupal, revisión del rol Pastor, y alta de adultos / acciones en nombre de otra Persona (D97).*
