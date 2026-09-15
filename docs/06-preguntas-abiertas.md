# Preguntas Abiertas

Temas identificados pero no resueltos todavía — a definir en próximas sesiones o a validar con la iglesia (recordar: la decisión tomada es validar recién cuando haya un prototipo mostrable, no antes).

- ¿La verificación del Pago de un Evento **bloquea** la confirmación de la Inscripción (no se confirma hasta que el Admin verifique el comprobante), o son dos pasos **independientes** (la Inscripción puede estar confirmada mientras el pago sigue pendiente de verificación)? Ver Flujo 8, paso 7.

---

## ⚠️ Pendiente antes de producción — Privacidad y protección de datos

**No bloquean el MVP / prototipo para mostrarle a los pastores** (así se decidió en D5 y D78), pero **sí deben resolverse antes de cualquier lanzamiento real con datos de personas reales.** Se deja esta sección separada, a propósito, para que no se pierda de vista con el resto del backlog de producto.

- **Redactar una Política de Privacidad formal.** Tiene que cubrir específicamente el manejo de datos que revelan afiliación religiosa (Curso, Bautismo, Ministerio — categoría de "dato sensible" según la Ley de Protección de Datos Personales de Argentina, Ley 25.326, D5), y explicar con claridad quién puede acceder a qué datos y por qué (Discipulador ve teléfono/dirección de su discipulado vía D12; Admin tiene vista unificada de todo vía D61; Pastor tiene lectura total incluidos datos de contacto vía D64).
- **Consentimiento de menores de edad.** Hoy la autorización del tutor ocurre completamente fuera de la app (WhatsApp, en persona) y nunca queda registrada formalmente dentro del sistema (D4, D21, D35, D36). Definir si, antes de producción, hace falta dejar constancia de esa autorización de forma verificable dentro del sistema.
- **Derecho de supresión / baja de datos.** No hay ninguna decisión tomada sobre qué pasa si una Persona pide que se borren sus datos del sistema. Ya existe el patrón técnico de soft delete (D37) para entidades de catálogo, pero no está definido si aplica — ni cómo — a los datos personales de una Persona.
- **Evaluar si corresponde inscribir la base de datos** ante el organismo correspondiente bajo la Ley 25.326, dado el volumen y el tipo de datos (incluyendo datos sensibles y de menores) que va a manejar la app. No es un tema puramente técnico — conviene consultarlo con alguien con conocimiento legal antes de un lanzamiento real, no resolverlo solo con criterio de producto.

---
*Este backlog se actualiza a medida que surgen nuevas preguntas o se resuelven las existentes (al resolverse, se documentan como decisión en `05-decisiones.md` y se quitan de acá).*
