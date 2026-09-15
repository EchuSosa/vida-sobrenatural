# Roadmap de Producto

> Visión completa del sistema, organizada por fases. El MVP (`02-alcance-mvp.md`) es un subconjunto priorizado de este roadmap — no al revés. Todo lo que está acá es parte del proyecto; lo que cambia es cuándo se construye.

## Fase MVP (primera versión a mostrar)

- Información pública (Bienvenida, cartelera, contacto, listado de Ministerios).
- Registro de usuario (SSO, validación de edad, alta manual de menores).
- Discipulado / Vida Nueva (individual y grupal).
- Vida de Servicio (inscripción, contenido semanal, asistencia, bajas).
- Postulación a Ministerios (con Células).
- Solicitud de Bautismo.
- Eventos (informativos o con inscripción, según configuración).
- Back office general (CRUD de catálogos, gestión de Personas, revisión de Solicitudes).
- **Notificaciones push** (PWA): manuales (el Admin crea y envía, a todos o a un segmento — Grupo o Ministerio específico) y automáticas (contenido nuevo liberado, Solicitud/Postulación aprobada o rechazada, recordatorio de Evento próximo).

## Fase 2 (candidatas, después de mostrar el MVP)

- Motor genérico de Formularios (Opción A, descartada para el MVP — ver `05-decisiones.md`, D31), si el patrón de Solicitudes específicas empieza a quedarse corto.
- Líder de Ministerio propio revisando Postulaciones (hoy lo hace el Admin para todos los Ministerios).
- Múltiples Sedes activas simultáneamente (el modelo ya lo soporta, falta la gestión operativa cuando exista más de una sede real).
- Reportes / analíticas (ej. cuánta gente completa cada curso, tasa de abandono vs. baja administrativa).

**Contenido y medios externos:**
- Feed embebido de Instagram y YouTube (últimos videos, últimos posts) en Bienvenida/Cartelera.
- Player de audio si hay podcast de prédicas.
- Sección "Prédicas" con historial buscable (fecha, predicador, serie temática).

**Experiencia del usuario final:**
- "Mi camino": pantalla de perfil con el progreso visual del proceso de integración (Bienvenida → Vida Nueva → Vida de Servicio → Ministerio).
- Pedidos de oración: la Persona carga un pedido, visible para el equipo pastoral (no público).
- Directorio de líderes/contactos por tema (a quién recurrir según el caso), sin exponer el directorio completo de miembros.
- Calendario unificado (Eventos + fechas relevantes del propio proceso) en vista tipo calendario, no solo lista.
- Necesidades de voluntariado puntual publicadas por un Ministerio (distinto de Postulación, que es unirse permanentemente).

**Escuelita (escuela dominical / niños):**
- Nuevo módulo con su propia estructura: **Años/Grados** (por edad) y un rol **Maestro** asignado a cada Año.
- La inscripción de un niño la hace **el padre/madre/tutor**, que ya es una Persona registrada en el sistema — a diferencia del caso de un adolescente que eventualmente loguea solo (Flujo 7), acá el niño probablemente **nunca inicia sesión**, y el vínculo con el tutor debería ser una relación real a una Persona existente (no solo texto libre como `tutor_nombre`/`tutor_telefono`).
- Requiere una sesión de diseño propia (roles, entidades, flujos) antes de especificarse — queda anotado como pendiente para cuando se aborde esta fase.

**Grupos de Extensión (grupos pequeños/hogareños):**
- Cada Grupo de Extensión tiene: rango etario objetivo, género objetivo, día y horario de reunión, y un líder.
- Al querer sumarse, la Persona indica género (ya lo tiene en su perfil), edad (calculada de su fecha de nacimiento) y disponibilidad horaria — el sistema (o el Admin, a definir) filtra y ofrece un listado de Grupos compatibles con esos criterios.
- Requiere su propia sesión de diseño (¿el matching es automático o el Admin sigue curando manualmente como hoy?, entidades, flujos) antes de especificarse.

**Herramientas del Admin / back office:**
- Dashboard con métricas avanzadas (altas por mes, conversión Visitante → Bautismo → Ministerio, abandono por curso) — más allá de los conteos básicos que ya están en el MVP.
- Registro de auditoría (quién hizo qué cambio y cuándo) — más relevante cuando haya más de un Admin.
- Gestión de contenido institucional (textos/imágenes de la sección pública, incluyendo contenido que cambia con frecuencia como "Palabra Profética [año]") editable por el Admin sin tocar código.
- Exportación de datos (ej. Excel/CSV de inscriptos de un Grupo).
- **Integración de pago real para Ofrendas** (ej. Mercado Pago) — el MVP ya incluye una versión estática (alias/CBU como texto informativo, ver `02-alcance-mvp.md`); esto es el siguiente paso natural.

**Transversal:**
- Buscador general (Personas, Eventos, Ministerios desde un solo lugar).
- Funcionamiento offline básico (PWA) para que la información institucional cargue con mala conexión.

## Backlog (fuera de alcance por ahora, sin fecha)

- Control de asistencia general a cultos (distinto de la asistencia a Vida de Servicio, que sí está en el MVP).
- Reemplazo total de WhatsApp como canal (hoy conviven).

---
*Este roadmap se revisa cada vez que surge una idea nueva de alcance — la idea entra acá primero, y solo pasa a `02-alcance-mvp.md` si se decide adelantarla al MVP.*
