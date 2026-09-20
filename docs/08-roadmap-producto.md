# Roadmap de Producto

> Visión completa del sistema, organizada por fases. El MVP (`02-alcance-mvp.md`) es un subconjunto priorizado de este roadmap — no al revés. Todo lo que está acá es parte del proyecto; lo que cambia es cuándo se construye.

## Fase MVP (primera versión a mostrar)

- Navegación de las tres superficies (web pública, app con sesión, backoffice) — ver `14-navegacion.md`.
- Información pública (Inicio, Nosotros, Primeros pasos, Ministerios, Palabra Profética, Ediciones VS, Eventos, Visitanos, Dar), con el contenido institucional real del sitio de la iglesia (D109) y textos provisorios marcados donde falta el real (D98, `12-contenido-bienvenida.md`).
- **Seguinos con YouTube**: últimos videos del canal de la iglesia (D93, adelantado desde Fase 2).
- Registro de usuario (SSO, validación de edad, alta manual de menores) y **alta de adultos por el Admin**, con acciones en su nombre (D97).
- **Mi camino** como sección que agrupa los procesos de cada Persona (D92):
  - Discipulado / Vida Nueva (individual y grupal).
  - Vida de Servicio (inscripción, contenido semanal, asistencia, bajas).
  - Postulación a Ministerios (con Células).
  - Solicitud de Bautismo.
- Eventos (informativos o con inscripción, según configuración).
- Back office general (CRUD de catálogos, gestión de Personas, bandeja de Solicitudes, comentarios de la app).
- **Notificaciones** en tres canales: Avisos in-app, push (PWA) y email para avisos importantes (D96, D100).
- **Sistemas transversales**: errores unificados + Sentry (D101), feedback de acciones + "Contanos qué te parece" (D102) — ver `16-sistemas-transversales.md`.
- **Datos de demostración** ficticios (D99).
- **Requisitos no funcionales y UX** (transversales, ver `13-requisitos-no-funcionales.md` y `15-guia-ux-ui.md`): accesibilidad WCAG 2.2 AA, SEO de las páginas públicas, seguridad, performance, app preparada para varios idiomas (lanzada solo en español), guía de UX/UI y modo oscuro.

## Fase 2 (candidatas, después de mostrar el MVP)

- Motor genérico de Formularios (Opción A, descartada para el MVP — ver `05-decisiones.md`, D31), si el patrón de Solicitudes específicas empieza a quedarse corto.
- Líder de Ministerio propio revisando Postulaciones (hoy lo hace el Admin para todos los Ministerios).
- Múltiples Sedes activas simultáneamente (el modelo ya lo soporta, falta la gestión operativa cuando exista más de una sede real).
- Reportes / analíticas (ej. cuánta gente completa cada curso, tasa de abandono vs. baja administrativa).

**Acceso, perfil y notificaciones:**
- **Ingreso con código por email** (sin contraseña ni cuenta de Google/Facebook), para personas con otro proveedor de email. NextAuth lo soporta y el servicio de email ya existe desde el MVP (D96), así que el costo es bajo. Permitiría que las Personas dadas de alta por el Admin con email de otro proveedor (D97) usen la app.
- Subir una foto de perfil propia (en el MVP solo se usa la de Google, D87).
- Preferencias de canal por Persona (ej. desactivar push de ciertos tipos, o recibir por email también los avisos normales).

**Contenido y medios externos:**
- Feed de Instagram (últimos 3 posts) en la sección Seguinos. Requisitos: cuenta @iglesiavs de tipo profesional (Business/Creator), autorización de alguien de la iglesia vía Instagram API con login de Instagram, y renovación automática del token (vence a los 60 días). Mismo patrón que YouTube: el backend guarda los posts (copiando las imágenes, porque sus URLs vencen) y la web los muestra con markup propio. Hasta entonces, solo enlace al perfil.
- Player de audio si hay podcast de prédicas.
- Sección "Prédicas" con historial buscable (fecha, predicador, serie temática) — puede apoyarse en los videos de YouTube ya sincronizados.

**Experiencia del usuario final:**
- Visualización de progreso en "Mi camino": línea de tiempo del proceso de integración (Bienvenida → Vida Nueva → Vida de Servicio → Ministerio). La sección ya existe desde el MVP (D92).
- Pedidos de oración: la Persona carga un pedido, visible para el equipo pastoral (no público).
- Directorio de líderes/contactos por tema (a quién recurrir según el caso), sin exponer el directorio completo de miembros.
- Calendario unificado (Eventos + fechas relevantes del propio proceso) en vista tipo calendario, no solo lista.
- Necesidades de voluntariado puntual publicadas por un Ministerio (distinto de Postulación, que es unirse permanentemente).

**Idiomas (portugués e inglés) — ver D84:**
- Motivo: hay una comunidad brasileña importante en la iglesia. La mayoría se maneja bien en español, así que es un gesto de bienvenida, no un bloqueante — por eso la base queda lista en el MVP y los idiomas se suman acá.
- Interfaz de `apps/web` en `pt` y `en`, con selector manual (sugerido según el idioma del navegador) y rutas por idioma (`/es`, `/pt`, `/en`) con `hreflang` para SEO.
- Traducción del contenido que carga el Admin (Eventos, Ministerios, Cursos, "En qué creemos", notificaciones, emails), con traducción automática sugerida que el Admin revisa y fallback al español.
- Revisión humana del contenido doctrinal y de los versículos (idealmente alguien de la iglesia que hable portugués), y de las opciones que no son equivalentes entre países (ej. concubinato / união estável).
- El backoffice sigue solo en español.

**Escuelita (escuela dominical / niños):**
- Nuevo módulo con su propia estructura: **Años/Grados** (por edad) y un rol **Maestro** asignado a cada Año.
- La inscripción de un niño la hace **el padre/madre/tutor**, que ya es una Persona registrada en el sistema — a diferencia del caso de un adolescente que eventualmente loguea solo (Flujo 7), acá el niño probablemente **nunca inicia sesión**, y el vínculo con el tutor debería ser una relación real a una Persona existente (no solo texto libre como `tutor_nombre`/`tutor_telefono`). El patrón de "Persona sin acceso a la app" (D97) puede reutilizarse.
- Requiere una sesión de diseño propia (roles, entidades, flujos) antes de especificarse — queda anotado como pendiente para cuando se aborde esta fase.

**Grupos de Extensión (grupos pequeños/hogareños):**
- Cada Grupo de Extensión tiene: rango etario objetivo, género objetivo, día y horario de reunión, y un líder.
- Al querer sumarse, la Persona indica género (ya lo tiene en su perfil), edad (calculada de su fecha de nacimiento) y disponibilidad horaria — el sistema (o el Admin, a definir) filtra y ofrece un listado de Grupos compatibles con esos criterios.
- Requiere su propia sesión de diseño (¿el matching es automático o el Admin sigue curando manualmente como hoy?, entidades, flujos) antes de especificarse.

**Herramientas del Admin / back office:**
- Dashboard con métricas avanzadas (altas por mes, conversión Visitante → Bautismo → Ministerio, abandono por curso) — más allá de los conteos básicos que ya están en el MVP.
- Registro de auditoría completo (quién hizo qué cambio y cuándo) — más relevante cuando haya más de un Admin. Evaluar adelantar una versión mínima al MVP (ver `06-preguntas-abiertas.md`).
- Gestión de contenido institucional **completa** (todos los textos e imágenes de la sección pública) editable por el Admin sin tocar código. En el MVP ya son editables la Palabra Profética y los libros de Ediciones VS (D109); el resto del contenido vive en los mensajes hasta que haga falta.
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
