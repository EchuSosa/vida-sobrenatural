# Ampliación de la 011 (2026-10-09): destinatarios del Evento y preguntas propias

**Spec base**: [`spec.md`](./spec.md) (no se rehace: esto suma FR-060 a FR-075).
**Aprobada por**: Echu, 2026-10-09. **Rama**: `eventos-destinatarios-preguntas`.
**Decisiones**: D220 (destinatarios con efecto), D221 (preguntas propias), D222 (respuestas sensibles),
D223 (lo que la app ya sabe en la lista de inscriptos). Si al mergear `main` alguno choca, se renumera.

## Motivo

La iglesia inscribe a sus eventos pagos con formularios de Google. Ejemplo real: "Jornada de sanidad ·
Mujeres, a partir de los 15 años", que pide nombre, edad, DNI, teléfono, si es celíaca, si asiste a un
grupo de extensión y su líder, una persona referente, si sirve en un ministerio y si participó antes de
una jornada. La app ya sabe casi todo por el perfil de la Persona; faltaban dos cosas:

1. que el Evento diga **para quién es, con efecto** (hoy `publicoObjetivo` es solo texto), y
2. que el Admin pueda hacer **preguntas propias** del Evento (celíaca, ¿participaste antes?…).

## User Stories

### US9 — Un Evento solo para algunas personas (P1)

La Admin crea "Jornada de sanidad · Mujeres" para **mujeres desde 15 años**. Una mujer de 20 entra a la
página del Evento y se anota. Un varón (o una chica de 14) entra a la misma página: ve "Este evento es
para mujeres desde 15 años." con un ícono, y **no** ve el botón de anotarse.

**Independent Test**: crear el Evento con género y edad mínima; entrar como una mujer de 20 (se anota),
como un varón y como una de 14 (no ven el botón; la API responde `EVENTO_NO_CORRESPONDE`).

1. **Given** un Evento para mujeres desde 15, **When** una mujer de 20 toca "Anotarme", **Then** queda
   anotada como siempre (confirmada, pendiente o en lista).
2. **Given** el mismo Evento, **When** entra un varón, **Then** ve "Este evento es para mujeres desde 15
   años." (texto + ícono, D81) y "Por eso no podés anotarte desde acá…", sin botón.
3. **Given** el mismo Evento lleno con lista de espera, **When** un varón intenta anotarse por la API,
   **Then** recibe `EVENTO_NO_CORRESPONDE` (tampoco entra a la lista).
4. **Given** la Admin anota en nombre de un varón, **When** la API responde `EVENTO_NO_CORRESPONDE`,
   **Then** el panel explica por qué y ofrece "Sí, anotarla igual"; al confirmar queda anotado y marcado
   "Anotada aunque no está entre los destinatarios".

### US10 — Preguntas para la inscripción (P1)

La Admin agrega a la Jornada "¿Sos celíaca?" (Sí/No, obligatoria, **dato sensible**) y "¿Participaste
alguna vez de una jornada de sanidad?" (Una opción: "Sí, hace mucho" / "No, nunca"). Al anotarse, la
Persona las responde en el mismo paso. En el backoffice, la lista de inscriptos muestra las respuestas y
arriba un resumen ("¿Sos celíaca? Sí: 3 · No: 25"). El Pastor ve la lista, pero **no** la respuesta
sensible.

1. **Given** un Evento con una pregunta obligatoria, **When** la Persona confirma sin responderla,
   **Then** no se anota y ve el error debajo de la pregunta y en el resumen de arriba, con enlace (H-50).
2. **Given** respuestas cargadas, **When** la Admin abre los inscriptos, **Then** ve las respuestas por
   Persona y el resumen por pregunta; **When** las abre el Pastor, **Then** no ve las respuestas ni el
   resumen de las preguntas sensibles.
3. **Given** una pregunta con respuestas, **When** la Admin intenta borrarla o cambiarle el tipo,
   **Then** no puede (`PREGUNTA_CON_RESPUESTAS`); sí puede editar el texto, con un aviso.
4. **Given** un Evento que terminó hace más de 30 días, **When** corre el proceso programado, **Then**
   se borran las respuestas a preguntas sensibles (las demás quedan).

### US11 — Lo que la app ya sabe (P2)

En la lista de inscriptos del backoffice, por cada Persona: edad (al día del Evento), teléfono, su
Ministerio, quién la acompaña (Discipulador o Líder de su Grupo más reciente) y su grupo de extensión con
su líder cuando exista la spec 014. Así la Admin no lo pregunta.

## Requirements

### Destinatarios (D220)

- **FR-060**: El Evento tiene `destinatariosGenero` (`todas` | `mujeres` | `varones`, por defecto
  `todas`) y `edadMinima` / `edadMaxima` opcionales (enteros 0–120, la máxima ≥ la mínima), en años
  cumplidos **al día civil (Argentina) del inicio del Evento**. Errores por campo: `EDAD_INVALIDA`,
  `EDAD_MAXIMA_MENOR_A_MINIMA`, `DESTINATARIOS_GENERO_INVALIDO`. Un Evento de bautismo es para todas
  las personas (`CONFIG_BAUTISMO_INVALIDA`). `publicoObjetivo` sigue como texto libre para matices.
- **FR-061**: Solo pueden anotarse (y anotarse en la lista de espera) las Personas que cumplen
  (`correspondeAlEvento`, en `packages/shared-types`, una sola regla para la API y las dos apps). La
  API lo valida (`EVENTO_NO_CORRESPONDE`, 403). `GET /eventos/:id/mi-inscripcion` devuelve
  `corresponde`.
- **FR-062**: Inscribir en nombre de otra Persona también valida (`EVENTO_NO_CORRESPONDE`, 409); el
  Admin puede forzarla con `forzar: true` tras confirmar en pantalla, y la Inscripción queda con
  `fueraDeDestinatarios = true`, visible en la lista.
- **FR-063**: La página pública del Evento muestra, en "Para quién", "Este evento es para
  {mujeres|varones|todas las personas}{ desde N años}{ hasta M años}." con ícono, cuando hay alguna
  restricción. A quien no corresponde, en lugar del botón, el mismo texto y "Por eso no podés anotarte
  desde acá…". La cartelera sigue mostrando todos los Eventos.
- Cambiar los destinatarios de un Evento con Inscripciones **no** da de baja a nadie (opción
  conservadora): rige para las inscripciones nuevas. Pregunta para Echu en el PR.

### Preguntas propias (D221)

- **FR-064**: En el formulario del Evento, "Preguntas para la inscripción": hasta **10**, en orden; cada
  una con texto (hasta 200), tipo (**Sí/No**, **Una opción** con 2 a 10 opciones de hasta 100
  caracteres, sin repetir; **Texto corto**), obligatoria sí/no y "Dato sensible (salud o
  alimentación)". Se mandan en el body del Evento como la lista completa (`preguntas`); con `id`, se
  edita esa. Errores por campo `pregunta-<i>-texto|opciones|tipo`.
- **FR-065**: Al anotarse (propia, lista de espera o en nombre de otra), las respuestas van en el mismo
  pedido (`respuestas: [{preguntaId, valor}]`); Sí/No guarda `si`/`no`, Una opción guarda el texto de
  la opción, Texto corto hasta 200. Errores por campo `respuesta-<preguntaId>`: `RESPUESTA_REQUERIDA`,
  `RESPUESTA_INVALIDA`, `RESPUESTA_DEMASIADO_LARGA` (H-50, pieza de `packages/ui`).
- **FR-066**: Con respuestas, una pregunta no se borra, no cambia de tipo, no deja de ser sensible y
  no pierde opciones (`PREGUNTA_CON_RESPUESTAS`, 409); sí se edita el texto (el formulario avisa que
  quienes ya respondieron vieron el texto anterior), se reordena y se le agregan opciones.
- **FR-067**: La lista de inscriptos del backoffice muestra las respuestas de cada Persona y arriba un
  **resumen por pregunta** sobre las Inscripciones abiertas: Sí/No y Una opción con la cantidad por
  valor ("¿Sos celíaca? Sí: 3 · No: 25"); Texto corto, cuántas respondieron. La 011 no tiene
  exportación a CSV: no se agrega.

### Datos sensibles (D222)

- **FR-068**: Las respuestas viven **solo** en la Inscripción a ese Evento (`RespuestaPreguntaEvento`),
  nunca en el perfil. Las de preguntas sensibles las ven **solo** quien tiene `eventos.gestionar`
  (Admin) y la propia Persona (en `mi-inscripcion`); el Pastor no (ni en la lista ni en el resumen). No
  van a logs, avisos ni emails (ningún `emitir` lleva respuestas; los mensajes de error no incluyen
  valores). La descripción de una pregunta sensible dice "Solo lo ve el equipo que organiza; se borra 30
  días después del evento".
- **FR-069**: Un proceso programado (`tareas-programadas`, diario) borra las respuestas a preguntas
  sensibles de los Eventos cuyo fin (o inicio, si no tiene fin) fue hace más de **30 días**, y marca el
  Evento (`respuestasSensiblesBorradasEn`). Idempotente; con test de integración.

### Lo que la app ya sabe (D223)

- **FR-070**: Cada fila de la lista de inscriptos trae `datosPersona`: edad (al día del Evento),
  teléfono, Ministerios donde sirve (Postulaciones aprobadas), referente (Discipulador o Líder del Grupo
  más reciente en que está o estuvo) y `grupoExtension` (null hasta que la spec 014 esté en `main`: el
  campo y su lugar en pantalla quedan preparados).

### Demo y manual

- **FR-071**: El seed demo crea "Jornada de sanidad · Mujeres" (pago, para mujeres desde 15, con cupo,
  salida y regreso en la descripción) con las dos preguntas del ejemplo e inscriptas con respuestas.
- **FR-072**: `docs/23-manual-de-pruebas.md` suma casos ⭐, P1 y P2 (sección EVT-D).

## Entidades

- **Evento** (+ `destinatariosGenero`, `edadMinima`, `edadMaxima`, `respuestasSensiblesBorradasEn`).
- **InscripcionEvento** (+ `fueraDeDestinatarios`).
- **PreguntaEvento** (nueva): `eventoId`, `orden`, `texto`, `tipo`, `opciones[]`, `obligatoria`,
  `sensible`.
- **RespuestaPreguntaEvento** (nueva): `inscripcionId`, `preguntaId`, `valor`; única por
  (Inscripción, pregunta).

Migración propia `20261009135610_eventos_destinatarios_preguntas` (con CHECK de edades y largos).

## Success Criteria

- **SC-020**: Ningún varón ni menor de 15 queda anotado a la Jornada salvo que la Admin lo confirme.
- **SC-021**: La Admin arma la Jornada (con sus dos preguntas) sin salir de la app y ve el resumen de
  celíacas sin contar a mano.
- **SC-022**: Ninguna respuesta sensible queda guardada más de 31 días después del Evento.

## Tasks

- [X] T200 Tipos y reglas puras en `shared-types/eventos.ts` (`correspondeAlEvento`, `edadCumplidaEn`,
  `validarDestinatarios`, `validarPreguntas`, `validarRespuestas`) y sus tests unitarios.
- [X] T201 Migración y modelos.
- [X] T202 API destinatarios: gestión, página pública, `mi-inscripcion`, anotarse, en nombre (con
  `forzar`) + integración `eventos-destinatarios.integration-spec.ts`.
- [X] T203 Web: "Para quién" y "no corresponde" en la página del Evento + e2e con axe claro/oscuro.
- [X] T204 Backoffice: sección "Para quién es" del formulario, detalle, confirmación al anotar + e2e.
- [ ] T205 API preguntas: guardar con el Evento (FR-064, FR-066), responder al anotarse (FR-065),
  visibilidad y resumen (FR-067, FR-068) + integración `eventos-preguntas.integration-spec.ts`.
- [ ] T206 Proceso programado de borrado (FR-069) + integración.
- [ ] T207 Backoffice: editor de preguntas en el formulario; respuestas, resumen y datos de la Persona
  en la lista de inscriptos; respuestas al anotar en nombre + e2e.
- [ ] T208 Web: responder las preguntas al anotarse (errores por campo) + e2e.
- [ ] T209 Datos de la Persona en la lista (FR-070).
- [ ] T210 Seed demo y fixtures (FR-071).
- [ ] T211 Manual (FR-072) y decisiones D220–D223.
- [ ] T212 Checklist de `docs/15` por pantalla tocada: página del Evento (web), formulario del Evento,
  detalle e inscriptos (backoffice).

## Preguntas para Echu

1. Si se cambian los destinatarios de un Evento que ya tiene inscriptas que dejan de cumplir, ¿se las da
   de baja? Hoy **no** (quedan; rige para las nuevas).
2. ¿El Pastor tiene que ver el **resumen** de una pregunta sensible (solo cantidades)? Hoy no lo ve.
3. ¿Las preguntas no sensibles también se borran en algún momento? Hoy quedan con la Inscripción.
