# Preguntas Abiertas

Temas identificados pero no resueltos todavía — a definir en próximas sesiones o a validar con la iglesia (recordar: la decisión tomada es validar recién cuando haya un prototipo mostrable, no antes).

- ¿La verificación del Pago de un Evento **bloquea** la confirmación de la Inscripción (no se confirma hasta que el Admin verifique el comprobante), o son dos pasos **independientes** (la Inscripción puede estar confirmada mientras el pago sigue pendiente de verificación)? Ver Flujo 8, paso 7.

## Contenido y demo (antes de presentar)

- Falta el **texto real de "En qué creemos"** (declaración de fe/valores) — no se encontró en el material investigado hasta ahora. Hay que pedirlo directamente (a un pastor, o revisar "Nosotros" → "Sistema de Trabajo" del sitio anterior con más detalle). No se inventa (D98). Ver `12-contenido-bienvenida.md`.
- Faltan **fotos reales** (templo, equipo pastoral, gente) para reemplazar los placeholders — depende del banco de material de la iglesia o de la diseñadora.
- **Completar el inventario de contenido** (criterio en D98): `12-contenido-bienvenida.md` ya cubre Bienvenida, culto, Palabra Profética, Liderazgo y redes. Falta: preguntas frecuentes de Primeros pasos, descripción de cada Ministerio, y marcar qué textos son reales y cuáles provisorios. Además, alinear ese documento con la navegación nueva (D91, D92): la sección "¿Cómo sigue el proceso?" pasa a vivir en **Primeros pasos**, y los botones deben seguir la guía de UX (D94).
- **Guion de la demo** para la presentación a los pastores, apoyado en los escenarios del seed (D99).

## Técnicas (a resolver en la Sesión 6 / `/speckit.plan`)

- **¿Cómo valida la API (NestJS) la sesión creada por NextAuth (Next.js)?** Opciones típicas: JWT firmado emitido por NextAuth y verificado por la API con un secreto/clave compartida, o que la API emita su propio token después del login. Afecta a las tres apps y a la seguridad de todo el sistema. Ver `13-requisitos-no-funcionales.md`, sección Seguridad, y D88 (login fail-closed).
- **¿Se adelanta al MVP un registro de auditoría mínimo** para acciones sensibles del Admin (cambiar roles, activar cuentas, verificar Pagos, Completitud Manual, acciones en nombre de otra Persona)? Hoy la auditoría completa está en Fase 2, pero estas acciones afectan datos de personas reales desde el día uno. (Parte de esto ya queda cubierto por `creado_por` / `alta_por`, D97.)
- **Proveedor de email transaccional** (D96) y herramienta de captura en local (ej. Mailpit).
- **Dirección visual** (estilo editorial del libro, estilo de Instagram, o sistema propio con logo + swoosh como constantes) — ver `09-notas-identidad-visual.md`. Propuesta a evaluar: sistema propio con la paleta del libro, verificando contrastes en modo claro y oscuro (D81, D95).
- **Dominio** (D85): candidato `vidasobrenatural.org.ar`. Al definirlo: verificar requisitos de NIC Argentina para `.org.ar`, averiguar quién administra `vidasobrenatural.com`, planificar redirecciones y configurar SPF/DKIM para el email.
- **Convenciones del repositorio**: estrategia de ramas, formato de commits, ESLint/Prettier, migraciones de Prisma, entornos (local / staging / producción) y archivo de contexto para Claude Code (`CLAUDE.md`) que apunte a esta documentación y a la regla de revisar la última numeración antes de agregar decisiones (D103).

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
