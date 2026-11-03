# Preguntas Abiertas

Temas identificados pero no resueltos todavía — a definir en próximas sesiones o a validar con la iglesia (recordar: la decisión tomada es validar recién cuando haya un prototipo mostrable, no antes).

## Contenido y demo (antes de presentar)

- Falta el **texto real de "En qué creemos"** (declaración de fe/valores) — no se encontró en el material investigado hasta ahora. Hay que pedirlo directamente (a un pastor, o revisar "Nosotros" → "Sistema de Trabajo" del sitio anterior con más detalle). No se inventa (D98). Ver `12-contenido-bienvenida.md`.
- Faltan **fotos reales** (templo, equipo pastoral, gente) para reemplazar los placeholders — depende del banco de material de la iglesia o de la diseñadora.
- **Completar el inventario de contenido** (criterio en D98): `12-contenido-bienvenida.md` ya cubre Bienvenida, culto, Palabra Profética, Liderazgo y redes. Falta: preguntas frecuentes de Primeros pasos, el texto real de Bautismo para Mi camino (hay uno provisorio, D98), y marcar qué textos son reales y cuáles provisorios. Además, alinear ese documento con la navegación nueva (D91, D92): la sección "¿Cómo sigue el proceso?" pasa a vivir en **Primeros pasos**, y los botones deben seguir la guía de UX (D94).
- **Guion de la demo** para la presentación a los pastores, apoyado en los escenarios del seed (D99).

## Para preguntar a la iglesia — Ministerios (Echu, 2026-10-12)

**Turnos de servicio** ("qué domingo le toca a quién", spec 017). Estas seis preguntas eran para el
líder de Bienvenida o Flor. Todavía no hay iglesia con quien hablar, así que Echu pidió (2026-11-01)
que Claude eligiera la respuesta más razonable, la documentara con el porqué y la dejara fácil de
cambiar. **Están respondidas así hasta confirmarlas con la iglesia**; cada una dice dónde se cambia.

1. **¿Cómo arman hoy quién va cada domingo?** No lo sabemos, así que la app no copia ningún método:
   **el líder arma el rol a mano** en una grilla fecha × área, y puede copiar el de la fecha
   anterior. Sin rotación automática. *Por qué:* cualquier método actual (WhatsApp, planilla,
   "siempre los mismos") entra en una grilla; una rotación automática supone reglas que no
   conocemos. (D252)
2. **¿Cuánta gente necesita cada área un domingo normal?** **Un número por área** (cupo), que carga
   el Admin o el líder; **1 por defecto**. *Por qué:* es lo único que hace falta para mostrar
   "faltan 2 en Seguridad", y se ajusta sin tocar código. Se cambia en el Ministerio → área.
   (D251)
3. **¿La gente va todos los domingos o se turnan?** La app **no lo asume**: se puede poner a la misma
   persona todas las fechas o turnar. Para ayudar a repartir, el líder ve **cuántas veces sirvió
   cada uno en las últimas fechas**. *Por qué:* las dos formas son comunes; mostrar el conteo ayuda
   sin imponer una regla. (D252)
4. **¿Quién lidera cada Ministerio?** Los **líderes que asigna el Admin** (spec 016). Ellos y el Admin
   arman el rol; el Pastor lo ve. *Por qué:* ya existe y es lo que pidió Echu ("un líder al menos a
   cada ministerio"). (D253)
5. **¿Qué hace Ceremonial además de la Santa Cena? ¿Y los Ministerios de entre semana?** Cada
   Ministerio tiene **sus días de servicio** como una regla que se carga una vez: "todos los
   domingos", "el segundo domingo del mes", "todos los sábados". En la demo: Bienvenida los
   domingos, Ceremonial el segundo domingo (Santa Cena), Vida en Acción los sábados (Mercadito).
   *Por qué:* cubre los tres casos conocidos sin inventar otros; el Admin los cambia en el
   Ministerio. (D250)
6. **"Atender a quienes ministran" y "limpieza", ¿de qué Ministerio son?** Se cargan como **áreas de
   Bienvenida** en los datos de demo (son tareas del domingo, como la puerta y la seguridad). Un
   Ministerio sin áreas (Ceremonial) tiene turnos del Ministerio entero. *Por qué:* las nombró Echu
   junto con las de Bienvenida; si la iglesia dice otra cosa, el Admin las mueve desde Catálogos,
   sin código. (D254, D255)

## Técnicas

- **Proveedor de email transaccional** (D96). La captura en local ya está decidida (Mailpit en Docker Compose, D105): falta el proveedor real para producción.
- **Dominio** (D85): candidato `vidasobrenatural.org.ar`. Al definirlo: verificar requisitos de NIC Argentina para `.org.ar`, averiguar quién administra `vidasobrenatural.com`, planificar redirecciones y configurar SPF/DKIM para el email.
- **Convenciones del repositorio — lo que queda**: formato de mensajes de commit y entornos (local / staging / producción). Ya resueltos: estrategia de ramas (rama por spec, PR a `main` con CI en verde, D152), linting (ESLint con reglas propias en `eslint-rules/`, oxlint en `apps/api`), migraciones de Prisma, y `CLAUDE.md`, que apunta a esta documentación y a la regla de revisar la última numeración antes de agregar decisiones (D103).

## Antes de producción — Operación

- **Analítica de uso respetuosa de la privacidad** (sin cookies de rastreo), para poder medir el criterio de éxito de `01-vision-problema.md`. Evitar cookies de rastreo también simplifica los avisos legales.
- **Backups de la base de datos** y prueba de restauración.
- **Sostenibilidad:** quién mantiene la app después de presentarla, quién paga hosting, dominio y servicios (email, Sentry si se supera el plan gratuito), y cómo se capacita al Admin (manual de uso breve). Es un tema para conversar con la iglesia al presentar el proyecto.

(La descripción de cada Ministerio ya no es contenido pendiente del documento: el seed de demo trae textos provisorios marcados (D98) y el real lo carga el Admin desde Catálogos (spec 009). El monitoreo de errores ya quedó resuelto para el MVP con Sentry, D101.)

---

## ⚠️ Pendiente antes de producción — Privacidad y protección de datos

**No bloquean el MVP / prototipo para mostrarle a los pastores** (así se decidió en D5 y D78), pero **sí deben resolverse antes de cualquier lanzamiento real con datos de personas reales.** Se deja esta sección separada, a propósito, para que no se pierda de vista con el resto del backlog de producto.

- **Redactar una Política de Privacidad formal** (y términos de uso). Tiene que cubrir específicamente el manejo de datos que revelan afiliación religiosa (Curso, Bautismo, Ministerio — categoría de "dato sensible" según la Ley de Protección de Datos Personales de Argentina, Ley 25.326, D5), y explicar con claridad quién puede acceder a qué datos y por qué (Discipulador ve teléfono/dirección de su discipulado vía D12; Admin tiene vista unificada de todo vía D61; Pastor tiene lectura total incluidos datos de contacto vía D64). También debe mencionar los servicios externos que procesan datos (Google/Facebook para el login y la foto de perfil, email transaccional, Sentry).
- **Consentimiento de menores de edad.** Hoy la autorización del tutor ocurre completamente fuera de la app (WhatsApp, en persona) y nunca queda registrada formalmente dentro del sistema (D4, D21, D35, D36). Definir si, antes de producción, hace falta dejar constancia de esa autorización de forma verificable dentro del sistema.
- **Consentimiento de adultos dados de alta por el Admin** (D97): hoy se registra que se obtuvo de forma presencial. Definir si hace falta alguna constancia adicional antes de producción.
- ~~**Derecho de supresión / baja de datos.**~~ **Decidido** (D261–D264, spec 018): la baja anonimiza en el momento; la pide la persona o el Admin. Falta igual la consulta legal y la Política de Privacidad (ítems de arriba y de abajo).
- **Evaluar si corresponde inscribir la base de datos** ante el organismo correspondiente bajo la Ley 25.326, dado el volumen y el tipo de datos (incluyendo datos sensibles y de menores) que va a manejar la app. No es un tema puramente técnico — conviene consultarlo con alguien con conocimiento legal antes de un lanzamiento real, no resolverlo solo con criterio de producto.

---
*Este backlog se actualiza a medida que surgen nuevas preguntas o se resuelven las existentes (al resolverse, se documentan como decisión en `05-decisiones.md` y se quitan de acá).*
