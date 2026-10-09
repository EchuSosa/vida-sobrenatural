# Ampliación de la 011 (2026-10-09): destinatarios del Evento y preguntas propias

**Spec base**: [`spec.md`](./spec.md) (no se rehace: esto suma FR-060 a FR-075).
**Aprobada por**: Echu, 2026-10-09. **Rama**: `eventos-destinatarios-preguntas`.
**Decisiones**: D230 (destinatarios con efecto), D231 (preguntas propias), D232 (respuestas sensibles),
D233 (lo que la app ya sabe en la lista de inscriptos). Si al mergear `main` alguno choca, se renumera.

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
su líder (spec 014). Así la Admin no lo pregunta.

## Requirements

### Destinatarios (D230)

- **FR-060**: El Evento tiene `destinatariosGenero` (`todas` | `mujeres` | `varones`, por defecto
  `todas`) y `edadMinima` / `edadMaxima` opcionales (enteros 0–120, la máxima ≥ la mínima), en años
  cumplidos **al día civil (Argentina) del inicio del Evento**. Errores por campo: `EDAD_INVALIDA`,
  `EDADES_INVERTIDAS`, `DESTINATARIOS_GENERO_INVALIDO`. Un Evento de bautismo es para todas
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
- **FR-062b**: Cambiar los destinatarios de un Evento con Inscripciones **no** da de baja a nadie:
  rige para las inscripciones nuevas, y en la lista de inscriptos las abiertas que dejaron de cumplir
  quedan marcadas "Ya no está entre los destinatarios: si corresponde, dala de baja" (`yaNoCorresponde`);
  el Admin decide con "Dar de baja", que ya avisa a la Persona. Respondido por Echu el 2026-10-09
  (Pregunta 1).

### Preguntas propias (D231)

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

### Datos sensibles (D232)

- **FR-068**: Las respuestas viven **solo** en la Inscripción a ese Evento (`RespuestaPreguntaEvento`),
  nunca en el perfil. Las de preguntas sensibles las ven **solo** quien tiene `eventos.gestionar`
  (Admin) y la propia Persona (en `mi-inscripcion`); el Pastor no (ni en la lista ni en el resumen). No
  van a logs, avisos ni emails (ningún `emitir` lleva respuestas; los mensajes de error no incluyen
  valores). La descripción de una pregunta sensible dice "Solo lo ve el equipo que organiza; se borra 30
  días después del evento".
- **FR-069**: Un proceso programado (`tareas-programadas`, diario) borra las respuestas a preguntas
  sensibles de los Eventos cuyo fin (o inicio, si no tiene fin) fue hace más de **30 días**, y marca el
  Evento (`respuestasSensiblesBorradasEn`). Idempotente; con test de integración.

### Lo que la app ya sabe (D233)

- **FR-070**: Cada fila de la lista de inscriptos trae `datosPersona`: edad (al día del Evento),
  teléfono, Ministerios donde sirve (Postulaciones aprobadas), referente (Discipulador o Líder del Grupo
  más reciente en que está o estuvo) y `grupoExtension`: su Grupo de Extensión (Solicitud `aceptada`
  de la spec 014) con su(s) líder(es) vigente(s).

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
- [X] T205 API preguntas: guardar con el Evento (FR-064, FR-066), responder al anotarse (FR-065),
  visibilidad y resumen (FR-067, FR-068; `GET /eventos/:id/preguntas/resumen`) + integración
  `eventos-preguntas.integration-spec.ts`. `req.body.respuestas` y `req.body.preguntas` redactados en
  los logs de pino.
- [X] T206 Proceso programado de borrado (`BorradoRespuestasSensiblesService` +
  `TareaBorrarRespuestasSensibles`, diario a las 3; a mano: `tareas:correr respuestas-sensibles`) +
  integración.
- [X] T207 Backoffice: `editor-preguntas.tsx` en el formulario; `resumen-preguntas.tsx`, respuestas y
  datos de la Persona en la lista de inscriptos; respuestas al anotar en nombre + e2e
  (`apps/backoffice/e2e/eventos-destinatarios-preguntas.spec.ts`).
- [X] T208 Web: responder las preguntas al anotarse (`CamposPreguntasEvento` en `packages/ui`, con
  su test) y "Tus respuestas" + e2e (`apps/web/e2e/eventos-destinatarios-preguntas.spec.ts`).
- [X] T209 Datos de la Persona en la lista (`datos-persona-inscripta.ts`, FR-070), con el grupo de
  extensión y su líder desde que la spec 014 llegó a `main`.
- [X] T210 Seed demo: "Jornada de sanidad · Mujeres" con 8 inscriptas y "Noche de jóvenes" (15 a 30).
  Los e2e crean sus datos por la API (no hacen falta fixtures nuevos; `limpiar-e2e` borra las
  respuestas en cascada con la Inscripción).
- [X] T211 Manual (DEMO-17, DEMO-18, EVE-20 a EVE-28) y decisiones D230–D233.
- [X] T212 Checklist de `docs/15` por pantalla tocada (abajo).

### Checklist de `docs/15` (D114)

| Pantalla | Acción principal | Cuatro estados | Envío protegido (H-57) | Feedback / qué sigue | Texto + ícono (D81) | Celular, teclado, lector | Contraste claro/oscuro |
|---|---|---|---|---|---|---|---|
| Web — página del Evento (anotarse con preguntas) | "Sí, anotarme" | Carga (skeleton), error de carga, sin poder anotarse explicado, éxito con "Tus respuestas" | `useEnvio` + `Button loading` | Resumen de errores con foco y enlace (H-50); estado y "qué sigue" | "Para quién" con ícono; candado de dato sensible | e2e `@celular`, radios en `fieldset` con `legend` | axe en claro y oscuro (e2e) |
| Backoffice — formulario del Evento (destinatarios y preguntas) | "Crear el Evento" / "Guardar cambios" | `loading.tsx` / `error.tsx` de la ruta; "Este Evento no tiene preguntas." | Igual que antes (`useEnvio`) | Errores por campo `pregunta-<i>-…`, `edadMaxima` | Avisos de "ya la respondieron" con ícono | Botones con nombre accesible para subir/bajar | axe en claro y oscuro (e2e) |
| Backoffice — inscriptos (resumen, respuestas, datos) | "Anotar a una Persona" | `loading.tsx`; resumen con error propio si falla; "Sin respuestas"; vacío de la tabla | `useEnvio` | Confirmación "Sí, anotarla igual" con el porqué | Sensible con candado + texto; "Anotada aunque no está entre los destinatarios" con ícono | Tabla con encabezados; `dl` por respuesta | axe en claro y oscuro (e2e) |

## Preguntas para Echu (respondidas el 2026-10-09)

1. Si se cambian los destinatarios con gente anotada que deja de cumplir: **se marcan en la lista y el
   Admin decide** (FR-062b); no se dan de baja solas.
2. El Pastor **no** ve el resumen de una pregunta sensible: por ahora no hace falta.
3. Las respuestas no sensibles **quedan** con la Inscripción (lo dejó a criterio; son útiles y no
   son datos de salud).
4. "Referente" = quien la acompaña en su Grupo más reciente (Discipulador o Líder): está bien.
