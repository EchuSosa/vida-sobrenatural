# Feature Specification: Eventos — cartelera, inscripciones, cupo, lista de espera y pagos

**Feature Branch**: `011-eventos`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "011 — Eventos (cartelera, inscripciones, cupo, lista de espera y pagos). Todo lo que dicen `docs/02` (Eventos informativos o con inscripción), `docs/04` (Evento, Inscripción a Evento, Pago), `docs/07` (Flujo 8 y relacionados) y las decisiones (D54 cupo y lista de espera, D67 la app registra pagos que ocurren afuera, D82 página pública por Evento con URL propia). D148 (7/10): el pago no bloquea la inscripción: queda 'confirmada, pago pendiente' y ocupa lugar; el Admin verifica el comprobante aparte; si lo rechaza, se libera el lugar. Incluye: CRUD de Eventos en el backoffice, cartelera pública y página por Evento, inscripción desde la web app ('Mis eventos' ya existe como pantalla vacía), cupo y lista de espera con promoción, carga y verificación de comprobantes. Considerá el Evento de bautismo que necesita la spec 010 (D147: el Admin suma a los bautismos aceptados a un Evento de bautismo). Dependencias: notificaciones de la 012 (recordatorios D49: dejá definidos los eventos que dispara)."

**Cómo se escribió esta spec**: en una corrida sin la dueña del producto mirando (Echu), derivada de
`docs/02`, `docs/04`, `docs/07` (Flujo 8, Flujo 10, Flujo 12), `docs/13`, `docs/14`, `docs/15`,
`docs/16` y las decisiones hasta D152. No hubo `/speckit-clarify` interactivo. Lo que `docs/` no
decide quedó como **Assumption** (al final) y, cuando tiene peso de producto, como pregunta en
**Preguntas para Echu** (última sección), cada una con una recomendación que la spec ya adopta
hasta que Echu diga otra cosa.

## Clarifications

### Resueltas desde `docs/` (no son preguntas nuevas)

- **¿El pago bloquea la confirmación?** (pregunta abierta del Flujo 8, paso 7) → No (D148). La
  Inscripción queda `confirmada` con el pago pendiente y ocupa lugar; el Admin verifica el
  comprobante aparte; si lo rechaza, el lugar se libera (FR-030 a FR-036).
- **¿Una Inscripción `pendiente` (esperando aprobación) ocupa lugar?** → Sí. El Flujo 8, paso 9,
  promueve desde la lista de espera cuando se cancela una Inscripción "confirmada (o pendiente)":
  las dos cuentan contra el cupo (FR-016).
- **¿Quién cancela una Inscripción?** → La propia Persona desde la app, o el Admin desde el
  backoffice; mismo resultado, incluida la promoción (D58, D69, FR-022, FR-027).
- **¿Cómo se llega al Evento de bautismo?** → D147: es un Evento más, marcado como de bautismo, al
  que el Admin suma Personas. La Solicitud de Bautismo y el "sumar a los aceptados" son de la spec
  010; esta spec deja el tipo de Evento y la inscripción hecha por el Admin (FR-045 a FR-048).
- **¿Qué canal usan los avisos?** → D149: Avisos in-app + email para lo importante en esta tanda;
  push después. Esta spec no envía nada: emite los eventos de dominio y la spec 012 los convierte en
  avisos (FR-050, `contracts/eventos-dominio.md`).
- **Inactivar vs. eliminar** (D119): un Evento se **cancela** (estado del negocio, se sigue viendo
  como cancelado, se puede reactivar) o se **elimina** (error de carga, solo sin inscripciones, va a
  la papelera). FR-040 a FR-043.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver la cartelera y la página de un Evento (Priority: P1)

Un Visitante (sin sesión) o una Persona registrada quiere ver qué eventos vienen en la iglesia y,
de cada uno, cuándo es, dónde, cuánto cuesta, si hace falta anotarse y si quedan lugares — también
cuando le llega el link por WhatsApp, con una vista previa que se entienda.

**Why this priority**: Es el reemplazo del flyer suelto en Instagram y del Google Form del culto,
y la puerta pública de todo lo demás: sin la página del Evento no hay dónde anotarse ni qué
compartir. Además los Eventos informativos (sin inscripción) se cubren completos con esta sola
historia.

**Independent Test**: Con un Evento cargado por seed, abrir `/eventos` sin sesión, ver la tarjeta,
entrar a su página propia y verificar que fecha, hora, lugar, costo y lugares disponibles están
como texto, que el flyer tiene texto alternativo, y que la página tiene título, descripción y
vista previa para compartir.

**Acceptance Scenarios**:

1. **Given** Eventos publicados con fecha futura, **When** alguien abre la cartelera pública,
   **Then** los ve ordenados del más próximo al más lejano, cada uno con nombre, fecha y hora,
   lugar, y si tiene costo o cupo; los Eventos pasados, cancelados o eliminados no aparecen en la
   cartelera (FR-001).
2. **Given** un Evento publicado, **When** alguien abre su página propia (URL con su `slug`),
   **Then** ve nombre, descripción, fecha y hora (y fin, si tiene), lugar, público al que apunta,
   costo (o "Sin costo"), cupo y lugares disponibles, todo como texto aunque el flyer lo repita
   (D83), y el flyer con su texto alternativo (FR-002, FR-003).
3. **Given** un Evento sin inscripción (`requiere_inscripcion = false`), **When** alguien abre su
   página, **Then** ve la información y ningún botón para anotarse (Flujo 8, paso 2).
4. **Given** un Evento con inscripción, **When** alguien abre su página, **Then** ve la acción
   "Anotarme" y, si el cupo está lleno, el estado en texto + ícono: "Lista de espera" si el Evento
   la permite, o "Cupo completo" con el botón deshabilitado y explicado si no (FR-004, D81).
5. **Given** un Evento cancelado, **When** alguien abre su link (por ejemplo, desde un WhatsApp
   viejo), **Then** la página sigue existiendo y dice claramente que se canceló, sin acción de
   anotarse (FR-005).
6. **Given** un Evento que ya pasó, **When** alguien abre su link, **Then** ve que ya pasó y un
   enlace a la cartelera, sin acción de anotarse (FR-005).
7. **Given** el link de un Evento compartido por WhatsApp, **When** se genera la vista previa,
   **Then** muestra el nombre, la fecha y el flyer (o una imagen por defecto si no tiene) (FR-006).
8. **Given** no hay Eventos próximos, **When** alguien abre la cartelera, **Then** ve un estado
   vacío amable con un enlace para seguir a la iglesia en redes (FR-001).
9. **Given** un Evento de bautismo (D147), **When** alguien abre su página, **Then** ve la fecha y
   el lugar sin acción de anotarse, con un texto que explica que para bautizarse se pide desde Mi
   camino, y **nunca** la lista de quiénes se bautizan (FR-046).

---

### User Story 2 - Crear y editar un Evento desde el backoffice (Priority: P1)

El Admin quiere cargar un Evento con todo lo que necesita (fecha, lugar, flyer, si hay que
anotarse, cupo, costo y cómo pagar) y tener a mano el QR y el link para mostrarlo en el culto y
mandarlo por WhatsApp, sin depender de Google Forms.

**Why this priority**: Sin Eventos cargados no hay nada que mostrar ni a qué anotarse. Es la otra
mitad de la puerta de entrada.

**Independent Test**: Como Admin, crear un Evento con inscripción, cupo y costo, subir un flyer con
su texto alternativo, y verificar que aparece en el listado del backoffice y en la cartelera
pública, y que su detalle muestra el QR, el link equivalente y la opción de descargar el QR.

**Acceptance Scenarios**:

1. **Given** el Admin en el listado de Eventos, **When** toca "Crear un Evento" y completa los
   datos obligatorios (nombre, Sede, fecha y hora de inicio, descripción), **Then** el Evento queda
   publicado con una URL propia generada a partir del nombre, y aparece en la cartelera (FR-010,
   FR-011).
2. **Given** el formulario, **When** el Admin marca que el Evento requiere inscripción, **Then**
   puede marcar además si requiere aprobación, un cupo (vacío = sin límite), si se permite lista de
   espera (solo con cupo), un costo (vacío = sin costo), las instrucciones de pago (solo con costo)
   y los días de anticipación del recordatorio de inscripción (vacío = sin recordatorio) (FR-010).
3. **Given** el Admin sube un flyer, **When** no completa el texto alternativo, **Then** el sistema
   no guarda y le dice, en el campo, que describa lo que dice el flyer (D83, FR-012).
4. **Given** un flyer de tipo o tamaño no permitido, **When** el Admin lo sube, **Then** el sistema
   lo rechaza diciendo qué tipos y qué tamaño acepta (FR-012).
5. **Given** un Evento con inscripción, **When** el Admin abre su detalle, **Then** ve el QR que
   lleva a la página del Evento, el link equivalente con un botón para copiarlo, y puede descargar
   el QR como imagen para proyectarlo o imprimirlo (D56, D83, FR-013).
6. **Given** un Evento ya publicado con inscripciones, **When** el Admin cambia el nombre, **Then**
   la URL del Evento **no** cambia (los QR impresos y los links compartidos siguen funcionando)
   (FR-011).
7. **Given** un Evento con inscripciones, **When** el Admin intenta bajar el cupo por debajo de los
   lugares ya ocupados, sacar la inscripción, o cambiar el costo habiendo Pagos cargados, **Then**
   el sistema no lo permite y explica por qué y qué hacer (FR-014).
8. **Given** un Evento con lista de espera, **When** el Admin sube el cupo o lo deja sin límite,
   **Then** las primeras Personas de la lista pasan a ocupar los lugares nuevos, en orden (FR-018).
9. **Given** el Pastor, **When** abre Eventos en el backoffice, **Then** ve el listado, los detalles
   y los inscriptos, sin ninguna acción de edición (D64, D142, FR-009).

---

### User Story 3 - Anotarme a un Evento (Priority: P1)

Una Persona quiere anotarse a un Evento desde la página del Evento o escaneando el QR en el culto,
saber al instante si quedó adentro, en espera o pendiente de aprobación, y qué tiene que hacer
después (por ejemplo, pagar).

**Why this priority**: Es el objetivo de la funcionalidad: reemplazar el Google Form del QR del
culto con una inscripción que el sistema conoce.

**Independent Test**: Con una Persona con sesión y un Evento con cupo de 2 y lista de espera,
anotarse tres Personas y verificar que las dos primeras quedan confirmadas y la tercera en lista de
espera, con su lugar en la lista; con un Evento con aprobación, verificar que queda pendiente.

**Acceptance Scenarios**:

1. **Given** una Persona con sesión y un Evento con inscripción y lugar disponible que no requiere
   aprobación, **When** toca "Anotarme" y confirma, **Then** su Inscripción queda **confirmada** y ve
   en pantalla qué sigue (fecha, lugar y, si tiene costo, cómo pagar) (FR-015, FR-019).
2. **Given** un Evento que requiere aprobación, **When** se anota, **Then** queda **pendiente** y ve
   "Recibimos tu inscripción. El equipo la revisa y te avisamos" (FR-015, `docs/15`).
3. **Given** un Evento con el cupo lleno que permite lista de espera, **When** se anota, **Then**
   queda **en lista de espera** y ve en qué lugar de la lista está y cómo funciona (FR-017).
4. **Given** un Evento con el cupo lleno que no permite lista de espera, **When** abre la página,
   **Then** el botón está deshabilitado con "Cupo completo" explicado al lado; y si igual lo intenta
   por la API, el sistema lo rechaza con un código propio (FR-017).
5. **Given** quien escanea el QR sin sesión iniciada, **When** toca "Anotarme", **Then** el sistema
   le pide ingresar (o registrarse, si es nueva) y, al terminar, la devuelve a la página del mismo
   Evento para confirmar la inscripción, sin tener que buscarlo de nuevo (Flujo 8, paso 3; FR-020).
6. **Given** una Persona ya anotada (confirmada, pendiente o en lista de espera), **When** vuelve a
   la página del Evento, **Then** ve su estado actual en lugar del botón "Anotarme", y el sistema
   no le permite una segunda inscripción abierta al mismo Evento (FR-021).
7. **Given** dos Personas que se anotan al mismo tiempo al último lugar, **When** se procesan,
   **Then** una queda confirmada y la otra en lista de espera (o rechazada por cupo completo, según
   el Evento); nunca se supera el cupo (FR-016, SC-003).
8. **Given** un Evento que ya empezó, **When** alguien intenta anotarse, **Then** el sistema no lo
   permite y lo explica (FR-019).
9. **Given** una Persona en estado `pendiente_tutor` (menor sin activar), **When** intenta anotarse,
   **Then** no puede: hasta que se active no tiene acceso a la app (Flujo 7) (FR-015).

---

### User Story 4 - Mis eventos: seguir y cancelar mis inscripciones (Priority: P2)

Una Persona quiere ver en la pestaña Eventos de la app los próximos Eventos y, aparte, los que se
anotó, con su estado y el de su pago, y poder cancelar si no puede ir.

**Why this priority**: Sin esto la Persona se entera de su estado solo por avisos (que dependen de
la 012) y no tiene cómo liberar su lugar, que es lo que hace funcionar la lista de espera (D58).

**Independent Test**: Con una Persona anotada a dos Eventos (uno confirmado con pago pendiente, uno
en lista de espera), abrir `/mis-eventos` y verificar ambos estados con su "qué sigue", cancelar la
confirmada y ver que el primero de la lista de espera de ese Evento pasa a confirmado.

**Acceptance Scenarios**:

1. **Given** una Persona con sesión, **When** abre la pestaña Eventos, **Then** ve "Mis
   inscripciones" (próximas primero, con estado en texto + ícono y qué sigue) y la cartelera de
   próximos Eventos (FR-023, `docs/14`).
2. **Given** una Inscripción confirmada en un Evento con costo sin pago cargado, **When** la ve,
   **Then** dice "Confirmada — falta el pago" y ofrece "Subir comprobante" con las instrucciones de
   pago del Evento (FR-024, D148).
3. **Given** una Inscripción en lista de espera, **When** la ve, **Then** ve su lugar en la lista
   ("Estás en el lugar 2 de la lista de espera") y que se le avisa si se libera un lugar (FR-017).
4. **Given** una Inscripción confirmada, pendiente o en lista de espera de un Evento que no empezó,
   **When** toca "Cancelar inscripción", **Then** el sistema pide confirmación neutra (D151: es
   reversible, se puede volver a anotar si hay lugar) con "Sí, cancelar inscripción" / "No,
   mantenerla", y al confirmar queda cancelada (FR-022).
5. **Given** la cancelación de una Inscripción que ocupaba lugar, **When** hay gente en lista de
   espera, **Then** el primero de la lista pasa automáticamente a confirmada (o a pendiente, si el
   Evento requiere aprobación) y se emite el evento que dispara su aviso importante (FR-018).
6. **Given** una Persona que canceló una Inscripción con un Pago ya verificado, **When** confirma,
   **Then** ve que la devolución, si corresponde, se arregla con la iglesia por fuera de la app
   (D67) (FR-022).
7. **Given** una Persona sin inscripciones, **When** abre la pestaña, **Then** ve un estado vacío con
   "Ver eventos" (FR-023, `docs/15`).
8. **Given** una Inscripción rechazada o cancelada, **When** la Persona la ve, **Then** el mensaje es
   amable y dice a quién consultar, nunca un "Rechazada" seco; puede volver a anotarse si el Evento
   sigue abierto (FR-021, `docs/15`).

---

### User Story 5 - Pagar: subir el comprobante y que el Admin lo verifique (Priority: P2)

Una Persona anotada a un Evento con costo quiere avisar que pagó subiendo el comprobante de la
transferencia; el Admin quiere ver los comprobantes pendientes en un solo lugar, verificarlos o
rechazarlos, y que un rechazo libere el lugar.

**Why this priority**: Es lo que hoy se lleva en papel/Excel para los campamentos (D55). Depende de
la Historia 3 (tiene que haber Inscripción).

**Independent Test**: Una Persona confirmada sube un comprobante (imagen o PDF); el Admin lo ve en
la bandeja de Solicitudes, lo abre, lo verifica, y la Persona ve "Pago verificado"; repetir con un
rechazo y verificar que la Inscripción se cancela y el primero de la lista de espera pasa a
confirmado.

**Acceptance Scenarios**:

1. **Given** una Inscripción confirmada en un Evento con costo, **When** la Persona sube el
   comprobante con el monto y el medio de pago, **Then** se crea un Pago **pendiente de
   verificación** y la Inscripción sigue confirmada y ocupando su lugar (D148, FR-030).
2. **Given** un archivo que no es imagen (JPG, PNG, WebP) ni PDF, o que supera el tamaño máximo,
   **When** la Persona lo sube, **Then** el sistema lo rechaza en el campo, diciendo qué acepta
   (FR-031).
3. **Given** el formulario de comprobante, **When** se usa con teclado y lector de pantalla,
   **Then** es operable de punta a punta (`docs/13`, FR-031).
4. **Given** Pagos pendientes de verificación, **When** el Admin abre la bandeja de Solicitudes,
   **Then** los ve con el tipo "Pago", el Evento, la Persona, el monto y la fecha, y puede filtrarlos
   (FR-034, `docs/14`).
5. **Given** un Pago pendiente, **When** el Admin abre el comprobante, **Then** lo ve sin que el
   archivo quede expuesto en una URL pública; ninguna otra Persona que no sea la dueña o el Admin
   puede abrirlo (Principio V, FR-032, SC-005).
6. **Given** un Pago pendiente, **When** el Admin lo verifica, **Then** queda verificado, con quién y
   cuándo, la Persona ve "Pago verificado" y se emite el evento para su aviso importante (FR-033).
7. **Given** un Pago pendiente, **When** el Admin lo rechaza indicando un motivo, **Then** el Pago
   queda rechazado, **la Inscripción se cancela y su lugar se libera** (con promoción desde la lista
   de espera, si hay), la Persona ve el motivo y que puede volver a anotarse si hay lugar, y se
   emite el evento para su aviso importante (D148, FR-035).
8. **Given** una Inscripción con un Pago pendiente, **When** la Persona intenta subir otro, **Then**
   el sistema no lo permite mientras el primero no se resuelva (FR-030).
9. **Given** una Persona sin acceso a la app (D97), **When** el Admin registra el Pago en su nombre
   (con o sin comprobante, por ejemplo en efectivo), **Then** el Pago queda verificado por el Admin y
   registrado como cargado por él (FR-036).

---

### User Story 6 - Gestionar los inscriptos de un Evento (Priority: P2)

El Admin quiere ver quiénes se anotaron a cada Evento, separados por estado, aprobar o rechazar las
inscripciones pendientes (de a una o varias juntas), anotar a alguien que avisó por WhatsApp o que
no usa la app, y dar de baja a quien avisó que no va.

**Why this priority**: Cubre los Eventos con aprobación y los casos fuera de la app (D69, D97), que
son el día a día del Admin. Depende de las Historias 2 y 3.

**Independent Test**: En el detalle de un Evento con aprobación, aprobar dos pendientes en lote,
rechazar una, inscribir a una Persona sin acceso a la app, y dar de baja a una confirmada con lista
de espera; verificar los estados, la promoción y que cada acción quedó registrada con quién la hizo.

**Acceptance Scenarios**:

1. **Given** el detalle de un Evento, **When** el Admin mira los inscriptos, **Then** los ve
   separados por estado (confirmadas, pendientes, lista de espera en su orden, canceladas y
   rechazadas), con el estado de pago de cada una cuando el Evento tiene costo, y los totales
   (ocupados / cupo, en espera) (FR-025).
2. **Given** inscripciones pendientes, **When** el Admin aprueba una, **Then** pasa a confirmada y se
   emite el evento para su aviso; **When** la rechaza (con motivo opcional), **Then** pasa a
   rechazada, su lugar se libera con promoción desde la lista, y se emite el evento (FR-026).
3. **Given** varias pendientes seleccionadas, **When** el Admin las aprueba en lote, **Then** ve un
   resumen ("5 aprobadas, 1 no se pudo") con el motivo de cada falla (`docs/16`, FR-026).
4. **Given** el Admin busca a una Persona (con o sin acceso a la app), **When** la inscribe al
   Evento, **Then** se aplican las mismas reglas de cupo, lista de espera y aprobación, la pantalla
   muestra durante toda la acción a nombre de quién actúa, y la Inscripción queda registrada como
   creada por el Admin (Flujo 8 paso 5a, D97, FR-027).
5. **Given** una Inscripción confirmada, **When** el Admin la da de baja porque la Persona avisó por
   otro canal, **Then** queda cancelada por el Admin, con el mismo efecto que si la cancelara la
   Persona, incluida la promoción (D69, FR-027).
6. **Given** las inscripciones pendientes de aprobación de todos los Eventos, **When** el Admin abre
   la bandeja de Solicitudes, **Then** las ve con el tipo "Inscripción a Evento" y puede ir al
   Evento a resolverlas (FR-034).
7. **Given** inscripciones confirmadas de un Evento con costo sin pago cargado, **When** el Admin
   mira los inscriptos, **Then** las distingue ("falta el pago, hace N días") para poder contactarlas
   o darlas de baja a mano; el sistema no las cancela solo (FR-025, Assumption de plazo).

---

### User Story 7 - Cancelar, reactivar o eliminar un Evento (Priority: P3)

El Admin quiere poder cancelar un Evento que no se hace (que quede claro para quien tenía el link y
para los inscriptos), reactivarlo si se canceló por error, y eliminar uno cargado por error sin
dejarlo para siempre en el listado.

**Why this priority**: Es menos frecuente que crear o inscribir, pero sin esto un Evento que se
suspende queda publicado con gente anotada. Sigue el patrón ya resuelto en D117/D119.

**Independent Test**: Cancelar un Evento con inscriptos y verificar que la página pública dice
"Cancelado", que no admite inscripciones y que se emitió el evento para avisar a los inscriptos;
reactivarlo; eliminar otro Evento sin inscripciones y restaurarlo desde la papelera.

**Acceptance Scenarios**:

1. **Given** un Evento publicado con inscriptos, **When** el Admin lo cancela, **Then** el sistema
   pide confirmación nombrando el Evento y cuántas Personas están anotadas, y al confirmar el Evento
   queda cancelado: sale de la cartelera, su página dice "Cancelado", no admite inscripciones, las
   Inscripciones se conservan tal cual y se emite el evento para avisar a los inscriptos (FR-040).
2. **Given** un Evento cancelado, **When** el Admin lo reactiva, **Then** vuelve a la cartelera con
   sus inscripciones intactas (FR-041).
3. **Given** un Evento sin ninguna Inscripción (en ningún estado), **When** el Admin lo elimina,
   **Then** desaparece de los listados y de la web pública y va a la papelera de Eventos, desde donde
   se puede restaurar (D119, FR-042).
4. **Given** un Evento con Inscripciones, **When** el Admin quiere eliminarlo, **Then** el botón está
   deshabilitado, explicando que tiene inscripciones, y ofrece cancelarlo (D119, FR-042).
5. **Given** un Evento eliminado, **When** alguien abre su URL, **Then** ve la página de "No
   encontramos esta página" (FR-043).

---

### User Story 8 - Evento de bautismo (Priority: P2)

El Admin quiere crear la próxima fecha de bautismos como un Evento de bautismo y sumar ahí a las
Personas cuya Solicitud de Bautismo se aceptó (D147), para que cada una vea la fecha en la app.

**Why this priority**: La spec 010 lo necesita para cerrar el Flujo 6 (D147). Esta spec deja el
Evento y la inscripción hecha por el Admin; la Solicitud y el "sumar a los aceptados" son de la 010.

**Independent Test**: Crear un Evento de bautismo, inscribir a una Persona desde el detalle del
Evento como Admin, y verificar que la Persona lo ve en Mis eventos como confirmado, que la página
pública no ofrece "Anotarme" ni muestra nombres, y que la API rechaza una auto-inscripción.

**Acceptance Scenarios**:

1. **Given** el formulario de Evento, **When** el Admin elige el tipo "Bautismo", **Then** el
   Evento queda sin costo y sin lista de espera, con inscripción solo por el Admin y sin aprobación
   (FR-045).
2. **Given** un Evento de bautismo, **When** una Persona intenta anotarse por su cuenta (pantalla o
   API), **Then** el sistema no lo permite y le indica pedir el bautismo desde Mi camino (FR-046).
3. **Given** un Evento de bautismo, **When** el Admin inscribe a una Persona, **Then** queda
   confirmada directamente (con cupo, si el Evento lo tiene) y la Persona lo ve en Mis eventos
   (FR-047).
4. **Given** la spec 010, **When** necesita listar los próximos Eventos de bautismo o las
   inscripciones de una Persona a ellos, **Then** cuenta con esas consultas (FR-048).

---

### Edge Cases

- **Carrera por el último lugar**: dos inscripciones (o una inscripción y una promoción) al mismo
  tiempo nunca superan el cupo; el cupo se evalúa dentro de la misma transacción que crea o mueve la
  Inscripción, serializada por Evento (FR-016, SC-003).
- **Cancelar estando en lista de espera**: sale de la lista; los que estaban detrás suben un lugar;
  no hay promoción porque no se liberó un lugar ocupado (FR-018).
- **Promoción en cadena**: se liberan dos lugares a la vez (subir el cupo en 2) → pasan los dos
  primeros de la lista, en orden (FR-018).
- **Promoción a un Evento con aprobación**: el promovido pasa a `pendiente`, sigue ocupando lugar,
  y el Admin lo aprueba o rechaza como cualquier pendiente (Flujo 8 paso 9).
- **Promoción a un Evento con costo**: el promovido pasa a confirmado con pago pendiente (D148).
- **El Evento ya empezó**: no hay inscripciones, cancelaciones de la Persona ni promociones; el
  Admin sí puede dar de baja o registrar un pago después (para cerrar las cuentas) (FR-019).
- **Una Persona que ya canceló vuelve a anotarse**: se crea una Inscripción nueva y entra al final
  de la lista si no hay lugar; la cancelada queda como historial (FR-021).
- **Se apaga la lista de espera con gente esperando**: no se permite; el Admin primero resuelve la
  lista (FR-014).
- **Se cambia la fecha de un Evento con inscriptos**: se permite; se emite el evento de cambio para
  que la 012 decida si avisa (FR-050).
- **Pago rechazado de una Inscripción promovida desde la lista**: mismo tratamiento — se cancela y
  pasa el siguiente (FR-035).
- **Persona sin acceso a la app** promovida desde la lista de espera: el evento de dominio se emite
  igual; si tiene email, la 012 le manda el aviso; si no, el Admin lo ve en el detalle del Evento
  ("subió desde la lista de espera") para avisarle por WhatsApp (FR-025, Flujo 10 paso 10).
- **Flyer reemplazado o quitado**: el archivo viejo se elimina del almacenamiento público; la página
  usa la imagen por defecto para compartir (FR-012).
- **Slug repetido** (dos "Campamento de jóvenes"): el segundo recibe un sufijo; las URLs nunca
  chocan (FR-011).
- **Un comprobante que no se puede previsualizar** (PDF en un celular viejo): el Admin igual puede
  descargarlo (FR-032).

## Requirements *(mandatory)*

### Functional Requirements

**Cartelera y página pública**

- **FR-001**: La web pública DEBE mostrar una cartelera (`/eventos`) con los Eventos publicados
  (no cancelados, no eliminados) cuyo inicio es hoy o posterior, ordenados por fecha de inicio,
  paginada, con estado vacío amable. El Inicio público DEBE mostrar los próximos tres en lugar de la
  tarjeta estática actual (`docs/02`: "próximos eventos").
- **FR-002**: Cada Evento DEBE tener una página pública con URL propia `/eventos/{slug}` (D82) con:
  nombre, descripción, fecha y hora de inicio (y de fin si tiene), lugar, Sede, público al que
  apunta (texto informativo, sin validación), costo o "Sin costo", cupo y lugares disponibles, y
  estado de la inscripción (abierta, lista de espera, cupo completo, cerrada).
- **FR-003**: Todo dato clave del Evento (fecha, hora, lugar, costo, cupo) DEBE estar como texto en
  la página aunque el flyer lo contenga; el flyer DEBE llevar su texto alternativo (D83, Principio
  VII).
- **FR-004**: El estado de la inscripción DEBE comunicarse con texto + ícono, nunca solo con color
  (D81); un botón deshabilitado DEBE explicar por qué al lado (`docs/15`).
- **FR-005**: La página de un Evento cancelado o ya pasado DEBE seguir resolviendo su URL y decir
  que está cancelado o que ya pasó, sin acción de inscripción, con enlace a la cartelera.
- **FR-006**: La cartelera y cada página de Evento DEBEN tener metadatos para buscadores y para
  compartir (título, descripción, imagen — el flyer o una por defecto —, Open Graph), datos
  estructurados `Event` de schema.org, y entrar en el sitemap; DEBEN regenerarse sin redeploy cuando
  el Evento cambia (D82, `docs/13`: ISR).

**Gestión de Eventos (backoffice)**

- **FR-010**: El Admin DEBE poder crear y editar un Evento con: nombre, Sede, fecha y hora de inicio
  (obligatorias), fecha y hora de fin (opcional, posterior al inicio), lugar (opcional; si se omite
  se usa la dirección de la Sede), descripción, público objetivo (opcional), tipo (`general` o
  `bautismo`), `requiere_inscripcion`, `requiere_aprobacion` (solo con inscripción), `cupo`
  (opcional, entero ≥ 1), `permite_lista_espera` (solo con cupo), `costo` (opcional, > 0, en pesos),
  instrucciones de pago (obligatorias si hay costo), `dias_anticipacion_recordatorio` (opcional,
  1–60, solo con inscripción) y flyer con texto alternativo. Los errores DEBEN mostrarse por campo,
  con resumen arriba (H-50).
- **FR-011**: Al crear un Evento el sistema DEBE generarle un `slug` único derivado del nombre (sin
  tildes, en minúsculas, con sufijo numérico si ya existe) que **no cambia** al editar el nombre.
- **FR-012**: El flyer DEBE subirse desde el backoffice con las reglas de archivo público de
  `docs/13` (JPG/PNG/WebP hasta 5 MB, redimensionado y recompresión sin recorte, nombre generado
  por el sistema) y su texto alternativo DEBE ser obligatorio cuando hay flyer. El Admin DEBE poder
  reemplazarlo o quitarlo.
- **FR-013**: El detalle de un Evento con inscripción DEBE mostrar el QR que lleva a su página
  pública, el link equivalente con acción de copiar, y la descarga del QR como imagen (D56, D83). La
  URL base sale de la configuración de entorno, nunca del código (D85).
- **FR-014**: El sistema DEBE impedir, con un código de error propio y una explicación: bajar el
  cupo por debajo de los lugares ocupados; apagar la lista de espera con Personas en ella; apagar
  `requiere_inscripcion` con Inscripciones abiertas; cambiar el costo (o quitarlo) con Pagos
  registrados; cambiar el tipo de un Evento con Inscripciones.
- **FR-009**: El listado de Eventos del backoffice DEBE usar la tabla compartida (`TablaDatos`) con
  paginación, búsqueda por nombre, filtro (próximos / pasados / cancelados / todos) y por tipo, en la
  URL (`docs/15`). El Pastor DEBE ver listado, detalle e inscriptos sin acciones (D64, D142).

**Inscripción**

- **FR-015**: Una Persona con sesión y `estado = activa` DEBE poder anotarse a un Evento publicado
  con `requiere_inscripcion = true`, de tipo `general`, que no empezó. La Inscripción queda
  `confirmada` si no requiere aprobación y hay lugar, `pendiente` si requiere aprobación y hay
  lugar, `lista_espera` si el cupo está lleno y el Evento lo permite; si está lleno y no lo permite,
  el sistema DEBE rechazarla con `CUPO_LLENO`.
- **FR-016**: Ocupan lugar las Inscripciones `confirmada` y `pendiente` (con o sin pago). El cálculo
  de lugares DEBE hacerse dentro de la misma transacción que crea o cambia una Inscripción, con las
  operaciones de un mismo Evento serializadas, de modo que el cupo nunca se supere.
- **FR-017**: Una Inscripción en `lista_espera` DEBE tener un orden (el de llegada a la lista) y la
  Persona DEBE poder ver su lugar en ella.
- **FR-018**: Cuando se libera un lugar ocupado (cancelación, rechazo de la inscripción, rechazo del
  pago, suba de cupo o cupo quitado) y el Evento no empezó, el sistema DEBE promover
  automáticamente, en la misma transacción, a la primera de la lista de espera — a `confirmada`, o a
  `pendiente` si el Evento requiere aprobación — tantas veces como lugares se liberaron, y emitir el
  evento `inscripcion_promovida` por cada una (FR-050).
- **FR-019**: Las inscripciones DEBEN cerrarse al inicio del Evento: desde ese momento no hay
  inscripción, cancelación por la Persona ni promoción. Al confirmar, la Persona DEBE ver qué sigue
  (fecha, lugar y, si hay costo, las instrucciones de pago y "Subir comprobante").
- **FR-020**: Quien toca "Anotarme" sin sesión DEBE ir a ingresar (o registrarse) y volver, al
  terminar, a la página del mismo Evento lista para confirmar. El destino de vuelta DEBE aceptar solo
  rutas internas de la web app (nunca una URL externa).
- **FR-021**: Una Persona DEBE tener como máximo una Inscripción abierta (`confirmada`, `pendiente` o
  `lista_espera`) por Evento (regla de no duplicados, D60), garantizada en la base. Con una
  Inscripción cancelada o rechazada puede volver a anotarse; se crea una nueva y la anterior queda
  como historial.
- **FR-022**: La Persona DEBE poder cancelar su Inscripción abierta mientras el Evento no empezó, con
  confirmación neutra (D151), registrando quién canceló. Si tenía un Pago verificado, la pantalla
  DEBE decirle que la devolución se arregla con la iglesia por fuera de la app (D67).
- **FR-023**: La pestaña Eventos de la app (`/mis-eventos`) DEBE mostrar "Mis inscripciones"
  (próximas primero, con estado, estado de pago y "qué sigue" según `docs/15`, y un acceso a las
  pasadas) y la cartelera de próximos Eventos, con sus cuatro estados (cargando, vacío, error,
  éxito).
- **FR-024**: Cada Inscripción DEBE exponer un **estado de pago** derivado cuando el Evento tiene
  costo: `sin_pago`, `pendiente_verificacion`, `verificado` (y el último rechazo, si hubo), que la
  Persona y el Admin ven en texto + ícono.

**Gestión de inscriptos (backoffice)**

- **FR-025**: El detalle de un Evento DEBE listar sus Inscripciones por estado, paginadas, con la
  Persona, la fecha, quién la creó (la Persona o el Admin), el estado de pago y, en las confirmadas
  sin pago, hace cuántos días están así; la lista de espera en su orden; las promovidas DEBEN
  marcarse como "subió desde la lista de espera" mientras el Admin no las mire, para poder avisar a
  quien no tiene la app. Totales: ocupados / cupo y en espera.
- **FR-026**: El Admin DEBE poder aprobar una Inscripción `pendiente` (pasa a `confirmada`) o
  rechazarla con motivo opcional (pasa a `rechazada`, libera su lugar, FR-018), de a una o en lote,
  con resumen del resultado del lote.
- **FR-027**: El Admin DEBE poder inscribir a cualquier Persona `activa` (con o sin acceso a la app)
  buscándola por nombre, con las mismas reglas que FR-015 a FR-018 (incluido un Evento de bautismo),
  y dar de baja (cancelar) cualquier Inscripción abierta. Ambas acciones DEBEN quedar registradas
  con quién las hizo (`creado_por`, `cancelada_por`), y la pantalla DEBE mostrar a nombre de quién se
  actúa (D97, `docs/15`).

**Pagos**

- **FR-030**: Con su Inscripción `confirmada` en un Evento con costo, la Persona DEBE poder registrar
  un Pago con monto (por defecto, el costo), medio de pago (`transferencia`, `efectivo`, `otro`),
  fecha en que pagó y el comprobante (obligatorio cuando lo carga la Persona), también después del
  inicio del Evento (para cerrar las cuentas). El Pago queda
  `pendiente_verificacion` y la Inscripción sigue `confirmada` (D148). No puede haber dos Pagos
  `pendiente_verificacion` en la misma Inscripción.
- **FR-031**: El comprobante DEBE aceptar JPG, PNG, WebP o PDF hasta 5 MB, validado por contenido y
  no solo por extensión, guardado con un nombre generado por el sistema; el control de subida DEBE
  ser operable con teclado y lector de pantalla.
- **FR-032**: El comprobante DEBE guardarse como archivo **privado** y servirse solo por un endpoint
  de la API que valida en cada pedido que quien lo pide es la dueña del Pago o tiene permiso de
  verificar pagos (Principio V, `docs/13`); nunca desde una carpeta pública.
- **FR-033**: El Admin DEBE poder marcar un Pago `pendiente_verificacion` como `verificado`,
  registrando quién y cuándo.
- **FR-034**: La bandeja unificada de Solicitudes del backoffice DEBE sumar dos tipos: "Inscripción
  a Evento" (las `pendiente`) y "Pago" (los `pendiente_verificacion`), con el filtro por tipo visible
  ahora que hay más de uno (`docs/14`). Resolver un Pago se hace desde la bandeja; resolver una
  Inscripción, desde el detalle del Evento. El Inicio del backoffice DEBE contar ambos entre los
  pendientes del Admin.
- **FR-035**: El Admin DEBE poder rechazar un Pago `pendiente_verificacion` con un motivo
  (obligatorio, que ve la Persona). Al rechazarlo, en la misma transacción, la Inscripción pasa a
  `cancelada` con motivo `pago_rechazado` y su lugar se libera con promoción (FR-018) (D148).
- **FR-036**: El Admin DEBE poder registrar un Pago en nombre de la Persona (comprobante opcional,
  por ejemplo en efectivo); ese Pago queda `verificado` por el Admin y registrado como creado por él.

**Cancelar, reactivar y eliminar Eventos**

- **FR-040**: El Admin DEBE poder cancelar un Evento publicado con confirmación que nombre el Evento
  y la cantidad de Inscripciones abiertas. El Evento cancelado sale de la cartelera, su página lo
  dice, no admite inscripciones ni promociones, conserva sus Inscripciones, y se emite
  `evento_cancelado` (FR-050).
- **FR-041**: El Admin DEBE poder reactivar un Evento cancelado que no pasó.
- **FR-042**: El Admin DEBE poder eliminar (borrado lógico con fecha y responsable, D119) un Evento
  **sin ninguna Inscripción**; con Inscripciones la acción DEBE estar deshabilitada, explicada, y
  ofrecer cancelar. Los Eventos eliminados DEBEN poder verse y restaurarse desde una papelera.
- **FR-043**: Un Evento eliminado no DEBE aparecer en ninguna vista pública ni de la app, y su URL
  DEBE responder "No encontramos esta página".

**Evento de bautismo (D147)**

- **FR-045**: Un Evento de tipo `bautismo` DEBE tener siempre `requiere_inscripcion = true`,
  `requiere_aprobacion = false`, sin costo, sin lista de espera y sin recordatorio de inscripción a
  todos; puede tener cupo.
- **FR-046**: Un Evento de bautismo NO DEBE admitir inscripción por la propia Persona (pantalla ni
  API: `EVENTO_SOLO_INSCRIBE_ADMIN`); su página pública DEBE explicar que el bautismo se pide desde
  Mi camino (con enlace) y nunca mostrar quiénes se inscribieron.
- **FR-047**: La inscripción del Admin a un Evento de bautismo queda `confirmada` si hay lugar; si no
  hay, el sistema DEBE rechazarla con `CUPO_LLENO` (no hay lista de espera).
- **FR-048**: La API DEBE ofrecer, para la spec 010: el listado de próximos Eventos de bautismo
  (Admin), la inscripción del Admin en nombre de una Persona (FR-027) y las Inscripciones a Evento de
  una Persona con su Evento (las que ve Mi camino / Mis eventos).

**Avisos y trazabilidad**

- **FR-050**: Cada cambio de estado DEBE emitir, **después** de confirmar su transacción, un evento
  de dominio con solo identificadores (nunca nombres, montos, motivos ni datos personales):
  `inscripcion_creada`, `inscripcion_aprobada`, `inscripcion_rechazada`, `inscripcion_promovida`,
  `inscripcion_cancelada`, `pago_registrado`, `pago_verificado`, `pago_rechazado`,
  `evento_modificado` (cambió fecha, hora o lugar con Inscripciones abiertas) y `evento_cancelado`,
  con su destinatario (`contracts/eventos-dominio.md`). Esta spec no envía avisos: la 012 se conecta
  a esa costura. Los recordatorios programados (`evento_proximo`, `recordatorio_inscripcion`, D49,
  D73) los dispara la 012 leyendo `Evento.inicio` y `dias_anticipacion_recordatorio`; esta spec deja
  esos datos y las consultas de destinatarios.
- **FR-051**: La API DEBE autorizar por registro (Principio V): una Persona solo ve, cancela o paga
  sus propias Inscripciones; toda acción sobre Eventos, inscriptos de otros y Pagos ajenos exige el
  permiso correspondiente del catálogo (`CATALOGO_PERMISOS`, D132). Los endpoints públicos de
  Eventos y los de subida de archivos (flyer, comprobante) DEBEN tener límite de pedidos (`docs/13`).

### Key Entities *(include if feature involves data)*

- **Evento** (`docs/04`, amplía el ER): Sede, nombre, `slug` (único, fijo), descripción, tipo
  (`general` / `bautismo`), inicio (fecha y hora), fin (opcional), lugar (opcional; si falta, la
  dirección de la Sede), público objetivo, flyer (`imagen_url`) y su `descripcion_imagen`,
  `requiere_inscripcion`, `requiere_aprobacion`, `cupo`, `permite_lista_espera`, `costo`,
  instrucciones de pago, `dias_anticipacion_recordatorio`, estado del negocio (publicado /
  cancelado — el `activo` del ER) y la marca de eliminado (D119). Quién lo creó y lo modificó.
- **Inscripción a Evento** (`docs/04`): Persona, Evento, estado (`confirmada`, `pendiente`,
  `rechazada`, `lista_espera`, `cancelada`), fecha, orden de llegada a la lista de espera,
  `creado_por` (`null` = la propia Persona), `revisado_por` y motivo (rechazo), quién la canceló y
  por qué (`persona`, `admin`, `pago_rechazado`), marca de "promovida desde la lista".
- **Pago** (`docs/04`): Inscripción, monto, medio de pago, fecha de pago, comprobante (archivo
  privado, opcional solo cuando lo carga el Admin), estado (`pendiente_verificacion`, `verificado`,
  `rechazado`), `verificado_por` y fecha de revisión, motivo de rechazo, `creado_por`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una Persona con sesión se anota a un Evento desde el QR en no más de 3 toques después
  de abrir la página (Anotarme → confirmar), y una sin sesión, después de ingresar, vuelve al mismo
  Evento sin buscarlo.
- **SC-002**: El Admin crea un Evento completo (con flyer, cupo y costo) y obtiene su QR en menos de
  5 minutos, sin salir del backoffice.
- **SC-003**: Con 20 inscripciones simultáneas a un Evento con cupo de 10, quedan exactamente 10
  ocupando lugar y el resto en lista de espera (o rechazadas por cupo completo), en el orden de
  llegada (test de integración).
- **SC-004**: Toda liberación de lugar con gente en lista de espera termina, en la misma operación,
  con la primera de la lista ocupando el lugar (0 lugares libres con lista no vacía en un Evento que
  no empezó).
- **SC-005**: Ningún comprobante es accesible sin sesión, por una URL pública, ni por otra Persona
  que no sea su dueña o quien verifica pagos (test de acceso ajeno por id).
- **SC-006**: La página pública de un Evento pasa axe sin violaciones en modo claro y oscuro, y su
  información clave (fecha, lugar, costo, cupo) está en el texto de la página.
- **SC-007**: El flujo crítico (Admin crea Evento con cupo → Persona se anota → otra queda en espera
  → la primera cancela → la segunda queda confirmada → sube comprobante → Admin verifica) pasa e2e
  en escritorio y en tamaño de celular.

## Assumptions

- **Fecha y hora**: el ER dice `fecha` (fecha única); se modela inicio con hora (hace falta para el
  recordatorio y para cerrar inscripciones) y un fin opcional, porque los campamentos duran varios
  días (decisión nueva propuesta en el plan).
- **Lugar**: D83 pide el lugar como texto y el ER no tiene campo; se agrega `lugar` opcional, con la
  dirección de la Sede por defecto (decisión nueva propuesta).
- **Instrucciones de pago**: un Evento con costo necesita decir cómo pagar (alias/CBU del
  campamento, efectivo en secretaría); se agrega un texto obligatorio con costo (decisión nueva
  propuesta). No se procesa ningún pago (D67).
- **Sin borrador**: un Evento se publica al crearse. El Admin que necesita prepararlo lo carga cuando
  está listo. No se agrega un estado de borrador (Principio IV).
- **Cierre de inscripciones**: al inicio del Evento. No hay fecha de cierre configurable.
- **Un Pago por el total** por Inscripción vigente (ver Preguntas para Echu, P2). Pagos rechazados
  quedan como historial.
- **Sin plazo automático para pagar**: el sistema no cancela solo una Inscripción confirmada sin
  pago; el Admin la ve marcada y decide (Preguntas para Echu, P3).
- **Monto**: el Admin verifica que el monto coincida; el sistema no exige monto = costo (puede haber
  becas o descuentos acordados por fuera).
- **El comprobante no lo ve el Pastor**: `docs/13` dice "dueño + Admin" para los comprobantes; el
  Pastor ve el estado del pago, no el archivo. Si Echu quiere otra cosa, es una línea del catálogo.
- **Medio de pago**: `transferencia`, `efectivo`, `otro`; Mercado Pago como pasarela queda en Fase 2
  (D67).
- **Pagos cargados por el Admin quedan verificados**: quien carga es quien verifica; la separación de
  D148 es para lo que sube la Persona.
- **Inscripción de menores activados**: una Persona `activa` menor de edad se puede anotar sola;
  `publico_objetivo` no se valida (docs/04). Anotar a familiares desde la propia cuenta no está en el
  MVP (Preguntas para Echu, P5).
- **Recordatorio `evento_proximo`**: la antelación la define la 012; esta spec propone 1 día antes,
  a quienes tienen Inscripción `confirmada`.
- **Personas sin acceso a la app**: el Admin las inscribe y les registra el pago (Flujo 12 paso 4).
  Dar de alta a la Persona no es de esta spec (Flujo 12, D143, D145).
- **Exportar inscriptos a Excel/CSV** queda en Fase 2 (`docs/08`).
- **Traducciones del contenido del Evento** quedan en Fase 2 (D84): los textos que carga el Admin se
  muestran como están.
- **La vista unificada de la Persona en el backoffice** (D61) no es de esta spec; cuando exista,
  consume las Inscripciones a Evento de la Persona (FR-048).
- **Dependencias** (detalle en el plan): avisos de la 012; envío de email de la 007; Solicitud de
  Bautismo de la 010; pantalla de ingreso de la 007 (para la vuelta al Evento, FR-020).

## Ampliación 2026-10-09: destinatarios y preguntas propias

Aprobada por Echu el 2026-10-09: destinatarios del Evento con efecto (género y edad) y preguntas
propias de la inscripción, con sus FR (FR-060 a FR-072), tasks y tests en
[`ampliacion-2026-10-09.md`](./ampliacion-2026-10-09.md) (D229–D232).

## Preguntas para Echu

> **Respondidas por Echu el 2026-10-07: se adoptan las recomendaciones de cada pregunta** (numeradas en `docs/05-decisiones.md`, D153–D213).

Cada una ya tiene una respuesta adoptada en la spec (la recomendación); si Echu decide otra cosa,
se ajusta antes de implementar.

1. **P1 — Rechazar un pago, ¿libera el lugar en el acto o da un plazo para subir otro
   comprobante?** D148 dice que se libera. Pasa que muchas veces el rechazo es por una foto
   equivocada o borrosa, no porque no se pagó. **Recomendación (adoptada):** se libera en el acto
   (D148), pero el rechazo exige un motivo que la Persona ve, y la Persona puede volver a anotarse
   si hay lugar. Para un comprobante borroso, el Admin escribe por WhatsApp antes de rechazar.
2. **P2 — ¿Se paga en cuotas?** Los campamentos a veces se pagan en dos o tres partes. **Recomendación
   (adoptada):** un solo Pago por el total en el MVP; si hace falta, cuotas es sumar varios Pagos
   verificados hasta cubrir el costo, sin romper el modelo (el Pago ya cuelga de la Inscripción).
3. **P3 — ¿Una inscripción confirmada sin pago vence sola?** Con D148 alguien puede ocupar un lugar
   sin pagar nunca. **Recomendación (adoptada):** no vence sola; el Admin ve "falta el pago, hace N
   días" y la da de baja a mano. Si molesta en la práctica, se agrega un plazo por Evento.
4. **P4 — Cancelar un Evento o cambiarle la fecha, ¿avisa a los inscriptos?** `docs/16` no lo lista
   entre los avisos. **Recomendación (adoptada en el plan como decisión nueva):** cancelar avisa
   como importante (también por email) a quienes tenían Inscripción abierta; cambio de fecha, hora
   o lugar avisa como normal. Esta spec emite los dos eventos; la 012 los conecta.
5. **P5 — ¿Una Persona puede anotar a su familia (hijos, cónyuge) a un Evento?** Es común en
   campamentos familiares. **Recomendación (adoptada):** no en el MVP; cada Persona se anota con su
   cuenta, y el Admin anota a quien no tiene la app. Anotar familiares desde la propia cuenta
   (Relaciones Familiares) se piensa junto con la Escuelita (Fase 2).
