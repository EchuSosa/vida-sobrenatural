# Preguntas Abiertas

Temas identificados pero no resueltos todavía — a definir en próximas sesiones o a validar con la iglesia (recordar: la decisión tomada es validar recién cuando haya un prototipo mostrable, no antes).

- ¿La verificación del Pago de un Evento **bloquea** la confirmación de la Inscripción (no se confirma hasta que el Admin verifique el comprobante), o son dos pasos **independientes** (la Inscripción puede estar confirmada mientras el pago sigue pendiente de verificación)? Ver Flujo 8, paso 7.

## Contenido y demo (antes de presentar)

- Falta el **texto real de "En qué creemos"** (declaración de fe/valores) — no se encontró en el material investigado hasta ahora. Hay que pedirlo directamente (a un pastor, o revisar "Nosotros" → "Sistema de Trabajo" del sitio anterior con más detalle). No se inventa (D98). Ver `12-contenido-bienvenida.md`.
- Faltan **fotos reales** (templo, equipo pastoral, gente) para reemplazar los placeholders — depende del banco de material de la iglesia o de la diseñadora.
- **Completar el inventario de contenido** (criterio en D98): `12-contenido-bienvenida.md` ya cubre Bienvenida, culto, Palabra Profética, Liderazgo y redes. Falta: preguntas frecuentes de Primeros pasos, descripción de cada Ministerio, y marcar qué textos son reales y cuáles provisorios. Además, alinear ese documento con la navegación nueva (D91, D92): la sección "¿Cómo sigue el proceso?" pasa a vivir en **Primeros pasos**, y los botones deben seguir la guía de UX (D94).
- **Guion de la demo** para la presentación a los pastores, apoyado en los escenarios del seed (D99).

## Técnicas

- **Proveedor de email transaccional** (D96). La captura en local ya está decidida (Mailpit en Docker Compose, D105): falta el proveedor real para producción.
- **Dominio** (D85): candidato `vidasobrenatural.org.ar`. Al definirlo: verificar requisitos de NIC Argentina para `.org.ar`, averiguar quién administra `vidasobrenatural.com`, planificar redirecciones y configurar SPF/DKIM para el email.
- **Convenciones del repositorio — lo que queda**: estrategia de ramas, formato de mensajes de commit y entornos (local / staging / producción). Ya resueltos: linting (ESLint con reglas propias en `eslint-rules/`, oxlint en `apps/api`), migraciones de Prisma, y `CLAUDE.md`, que apunta a esta documentación y a la regla de revisar la última numeración antes de agregar decisiones (D103). **Las dos primeras dejaron de ser teóricas**: el repo ya tiene remoto en GitHub y una workflow de CI que corre en `push` a `main` y en cada pull request, así que "estrategia de ramas" ahora decide si CI corre sobre trabajo terminado o a medio hacer.

## Antes de producción — Operación

- **Analítica de uso respetuosa de la privacidad** (sin cookies de rastreo), para poder medir el criterio de éxito de `01-vision-problema.md`. Evitar cookies de rastreo también simplifica los avisos legales.
- **Backups de la base de datos** y prueba de restauración.
- **Sostenibilidad:** quién mantiene la app después de presentarla, quién paga hosting, dominio y servicios (email, Sentry si se supera el plan gratuito), y cómo se capacita al Admin (manual de uso breve). Es un tema para conversar con la iglesia al presentar el proyecto.

(El monitoreo de errores ya quedó resuelto para el MVP con Sentry, D101.)

---

## ⚠️ Pendiente antes de producción — Privacidad y protección de datos

**No bloquean el MVP / prototipo para mostrarle a los pastores** (así se decidió en D5 y D78), pero **sí deben resolverse antes de cualquier lanzamiento real con datos de personas reales.** Se deja esta sección separada, a propósito, para que no se pierda de vista con el resto del backlog de producto.

- **Redactar una Política de Privacidad formal** (y términos de uso). Tiene que cubrir específicamente el manejo de datos que revelan afiliación religiosa (Curso, Bautismo, Ministerio — categoría de "dato sensible" según la Ley de Protección de Datos Personales de Argentina, Ley 25.326, D5), y explicar con claridad quién puede acceder a qué datos y por qué (Discipulador ve teléfono/dirección de su discipulado vía D12; Admin tiene vista unificada de todo vía D61; Pastor tiene lectura total incluidos datos de contacto vía D64). También debe mencionar los servicios externos que procesan datos (Google/Facebook para el login y la foto de perfil, email transaccional, Sentry).
- **Consentimiento de menores de edad.** Hoy la autorización del tutor ocurre completamente fuera de la app (WhatsApp, en persona) y nunca queda registrada formalmente dentro del sistema (D4, D21, D35, D36). Definir si, antes de producción, hace falta dejar constancia de esa autorización de forma verificable dentro del sistema.
- **Consentimiento de adultos dados de alta por el Admin** (D97): hoy se registra que se obtuvo de forma presencial. Definir si hace falta alguna constancia adicional antes de producción.
- **Derecho de supresión / baja de datos.** No hay ninguna decisión tomada sobre qué pasa si una Persona pide que se borren sus datos del sistema. Ya existe el patrón técnico de soft delete (D37) para entidades de catálogo, pero no está definido si aplica — ni cómo — a los datos personales de una Persona.
- **Evaluar si corresponde inscribir la base de datos** ante el organismo correspondiente bajo la Ley 25.326, dado el volumen y el tipo de datos (incluyendo datos sensibles y de menores) que va a manejar la app. No es un tema puramente técnico — conviene consultarlo con alguien con conocimiento legal antes de un lanzamiento real, no resolverlo solo con criterio de producto.

---
*Este backlog se actualiza a medida que surgen nuevas preguntas o se resuelven las existentes (al resolverse, se documentan como decisión en `05-decisiones.md` y se quitan de acá).*
