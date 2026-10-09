# Alcance del MVP

## Dentro del alcance

**Navegación** (D91, D92 — detalle en `14-navegacion.md`):
- Web pública: Nosotros · Primeros pasos · Ministerios · Eventos · Visitanos + botones "Dar" e "Ingresar".
- App con sesión: barra inferior con Inicio · Mi camino · Eventos · Avisos · Perfil.
- Backoffice: menú lateral filtrado por rol.

**Información pública (sin login):**
- Inicio: banner de Palabra Profética, próximos eventos y sección "Seguinos".
- Nosotros: quiénes somos, identidad (cristianos, evangélicos, bautistas), historia, visión y misión, valores, sistema de trabajo (Bienvenida → Discipulado → Red), el llamado de Isaías 61, "En qué creemos" (pendiente de texto real) y Liderazgo (D109).
- Primeros pasos: cómo integrarse (Vida Nueva, Vida de Servicio, Ministerios), bautismo, preguntas frecuentes.
- Ministerios: listado público informativo.
- Eventos: cartelera + página pública por Evento, con URL propia para compartir (D82).
- Visitanos: dirección, horarios de culto, mapa, WhatsApp y contacto.
- Dar (Ofrendas, versión estática): alias, CBU y datos de cuenta como contenido informativo — sin integración de pago real (Mercado Pago u otro servicio queda para Fase 2).
- **Palabra Profética** (D109): sección propia con el texto y el video del año, más el banner en el Inicio.
- **Ediciones VS** (D109): libros de la iglesia, con portada (placeholder mientras no haya imagen real), título y autor/a.
- **Seguinos** (D93): últimos videos del canal de YouTube, guardados por el backend con una tarea programada. Instagram solo como enlace al perfil (el feed queda para Fase 2).
- Contenido: real cuando ya es público (ver `12-contenido-bienvenida.md`), provisorio en el tono real (no lorem ipsum) para lo que falte (D98).

**Registro, alta y perfil:**
- Registro con SSO, validación de edad y género, alta manual de menores (Flujo 2 y 7). El formulario de registro se divide en pasos cortos con indicador de progreso (D94). Teléfono con selector de país y profesión por categoría (D90).
- **Alta de Personas adultas por el Admin** (Flujo 12, D97, D143), con email opcional y aviso de posible duplicado (D145). Con email de cualquier proveedor entra sola con código por email (D141); quien no tiene email queda sin acceso a la app, y el Admin puede crear solicitudes e inscripciones en su nombre.
- Edición de perfil propio (datos de contacto, no fecha de nacimiento ni email) y gestión de Relaciones Familiares (Flujo 11).
- Preferencia de tema: Claro / Oscuro / Sistema (D95).

**Mi camino** (sección privada que agrupa los procesos de la Persona, D92):

*Discipulado (Vida Nueva):*
- Modalidad individual (1 a 1) y grupal (para personas que vienen de otra congregación) — ambas con registro de Encuentros, no contenido digital (Flujo 3).
- Solicitud de Discipulado in-app, asignación de Discipulador filtrada por disponibilidad (toggle manual + Bloqueos de Disponibilidad por fecha).
- Finalización en dos pasos (Discipulador propone, Admin confirma).

*Vida de Servicio:*
- Requiere haber completado Vida Nueva antes (individual o grupal) — el Admin puede destrabar esto con una Completitud Manual si corresponde una excepción.
- Inscripción por solicitud + aprobación del Admin, contenido semanal liberado por Líder de curso (Flujo 4).
- Asistencia con regla de 2 faltas (alerta, no baja automática), distinción entre `dada_de_baja` y `abandono`.
- Finalización en dos pasos → activa "Apto para Ministerio" automáticamente solo para quienes completaron.

*Ministerios:*
- Postulación in-app (con elección de Célula) para quien tenga el flag "Apto para Ministerio", revisada por el Admin (Flujo 5).

*Bautismo:*
- Solicitud de Bautismo in-app, revisada por el Admin (Flujo 6).

*Grupos de Extensión* (D220–D228, spec 014 — aparte de las etapas):
- La Persona busca su Grupo desde Mi camino por su dirección o su ubicación (que no se guarda), ve los de su género y edad ordenados por cercanía, sin la dirección exacta, y pide sumarse.
- El líder del Grupo recibe el aviso y acepta o no desde la web app ("Mi grupo"), con el contacto de la persona y WhatsApp.
- Ya aceptada, la Persona ve la dirección exacta, el contacto del líder y "Cómo llegar".
- El Admin carga los Grupos en el backoffice (lugar "En la iglesia" o dirección al estilo de La Plata, convertida en coordenadas al guardar) y puede aceptar pedidos, agregar o quitar personas; los pedidos entran a la bandeja.

Cada solicitud muestra, además de su estado, qué pasa después (ver `15-guia-ux-ui.md`).

**Eventos:**
- Publicación con `cupo` opcional, `permite_lista_espera`, y `costo` opcional (para Campamentos y similares).
- Generación automática de código QR que lleva al formulario de inscripción, siempre acompañado de un link equivalente (D83).
- Flyer con texto alternativo obligatorio, e información clave también como texto (D83).
- Inscripción con Pago (monto, medio de pago, comprobante adjunto, verificado por el Admin) cuando el Evento tiene costo. El Admin también puede inscribir y registrar pagos en nombre de una Persona.
- Cancelación de inscripción por la propia Persona **o por el Admin** (ej. si avisan por otro canal), con promoción automática desde lista de espera (Flujo 8).

**Notificaciones** (D47, D96, D100 — detalle en `16-sistemas-transversales.md`):
- Dos canales en esta tanda: **Avisos** (historial in-app con leídas/no leídas) y **email** (solo avisos importantes, también para quien no usa la app). **Push** (PWA) queda para la tanda siguiente (D149).
- Manuales (Admin, a todos o a un segmento — Grupo o Ministerio específico), con opción de marcarlas como importantes.
- Automáticas: contenido nuevo liberado, Solicitud/Postulación resuelta (incluye promoción desde lista de espera, pagos y activación de cuentas — importantes), recordatorio de Evento próximo (a quien ya se inscribió), recordatorio de inscripción pendiente (a todos, configurable por Evento) (Flujo 10).
- El permiso de push se pide en contexto (nunca al abrir la app), con instrucciones para agregar la app a la pantalla de inicio en iPhone.

**Back office / Admin:**
- CRUD de catálogos (Sede, Curso, Ministerio, Célula) con soft delete (`activo`) y confirmación reforzada al desactivar registros con datos relacionados **activos** (D38, ej. un Curso con Grupos en curso).
- Bandeja unificada de Solicitudes (Discipulado, Vida de Servicio, Bautismo, Postulaciones, Inscripciones a Evento, Pagos, Grupos de Extensión).
- Alta de Personas adultas y acciones en su nombre (Flujo 12).
- Vista de perfil unificada por Persona (roles, historial de Inscripciones/Postulaciones/Solicitudes, Relaciones Familiares), con foto de perfil de Google cuando exista (D87).
- Listado de cumpleaños del mes.
- Comentarios recibidos desde "Contanos qué te parece" (D102).
- Gestión de la Palabra Profética (texto + link de YouTube) y CRUD de libros de Ediciones VS (D109).
- Métricas básicas: cantidad de Personas activas, distribución por tiempo congregándose (calculado desde `congrega_desde`, D214), por Sede (el dashboard analítico completo queda en Fase 2).
- Un solo Admin por ahora, pensado para escalar a más roles después.

**Sistemas transversales** (detalle en `16-sistemas-transversales.md`):
- Sistema de errores unificado (Problem Details + catálogo de códigos) y monitoreo con **Sentry**, sin datos personales (D101).
- Matriz de feedback por tipo de acción y formulario "Contanos qué te parece" (D102).

**Demo:**
- Script de datos ficticios (seed) con escenarios para cada flujo (D99).

**Requisitos transversales a todo lo anterior:**
- Accesibilidad WCAG 2.2 AA (D81) — `13-requisitos-no-funcionales.md`.
- SEO de las páginas públicas; área privada y backoffice con `noindex` (D82).
- Seguridad (autorización por registro en la API, login fail-closed D88, archivos privados, notificaciones sin datos sensibles) y performance (Core Web Vitals en celular) — base propuesta a confirmar en la Sesión 6.
- App preparada para varios idiomas, lanzada solo en español (D84).
- Guía de UX/UI (D94) y modo oscuro (D95) — `15-guia-ux-ui.md`.

## Fuera de alcance (por ahora)

- No reemplaza el culto ni la comunicación presencial.
- No gestiona donaciones/diezmos de forma general — solo la sección estática de Ofrendas listada arriba (sin procesar pagos reales, salvo el caso puntual de Eventos con costo, que sí registra el pago).
- No controla asistencia general a cultos — solo la asistencia a Vida de Servicio, que sí está en el MVP.
- No es una app de mensajería (WhatsApp sigue existiendo en paralelo, ver `05-decisiones.md`).
- Escuelita queda en Fase 2 (ver `08-roadmap-producto.md`). Grupos de Extensión se adelantó al MVP (D220, spec 014).
- Portugués e inglés quedan en Fase 2 (D84) — el MVP solo deja la base preparada.
- Feed de Instagram y visualización de progreso en "Mi camino" quedan en Fase 2.
- Preferencias de canal de notificación y subida de foto de perfil propia quedan en Fase 2. (El ingreso con código por email se adelantó al MVP, D141.)

## Identidad visual

Ver `09-notas-identidad-visual.md` para las referencias recopiladas (libro "Vida de Servicio", sitio web anterior, Instagram). Queda pendiente decidir, recién en la Sesión 6, entre el estilo editorial del libro, el estilo vibrante de Instagram, o un sistema propio — ninguna referencia se tomó todavía como decisión final. Cualquiera sea la dirección, los tokens de color deben cumplir los contrastes de D81 en modo claro y oscuro (D95).

---
*Sesión de origen: Sesión 1 (cerrado). Actualizado fuera de sesión formal a medida que se sumaron Eventos, Bautismo, Notificaciones, Vida Nueva Grupal, mejoras de back office, requisitos no funcionales (D81–D85), navegación y YouTube (D91–D93), guía de UX/UI con modo oscuro (D94–D95), y email, alta por Admin, contenido, datos de demo y sistemas transversales (D96–D102). Este documento refleja el estado más reciente del alcance MVP.*
