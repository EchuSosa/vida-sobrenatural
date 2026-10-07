# Feature Specification: Bautismo

**Feature Branch**: `010-bautismo`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "010 — Bautismo. Solicitud de Bautismo (docs/02, docs/04, docs/07 Flujo 6, D53, D147): se puede pedir con Vida Nueva en curso o completada, o si el Admin lo habilita para esa Persona. Aceptada sin fecha → 'Aceptamos tu pedido, te avisamos la próxima fecha'. La fecha es un Evento de bautismo al que el Admin suma a los aceptados. Incluye: pedido desde Mi camino, bandeja del Admin (aceptar / rechazar), asignación a un Evento de bautismo, estado visible para la Persona. Dependencias: Evento (spec 011), notificaciones (spec 012)."

**Fuentes** (la spec se deriva de acá, no inventa producto): `docs/01-vision-problema.md` (paso 4 del
proceso real: "se bautiza", comunicado históricamente por WhatsApp; criterio de éxito: "cómo
bautizarse"), `docs/02-alcance-mvp.md` ("Solicitud de Bautismo in-app, revisada por el Admin"),
`docs/04-dominio-entidades.md` (Solicitud de Bautismo, patrón común de Solicitudes, regla de no
duplicados), `docs/07-flujos-casos-de-uso.md` (Flujo 6; Flujo 12 paso 4: el Admin pide en nombre de
una Persona sin app; Flujo 10: `solicitud_actualizada`), `docs/14-navegacion.md` (card de Bautismo en
Mi camino, bandeja unificada de Solicitudes), `docs/13-requisitos-no-funcionales.md` (punto 5: nada
sensible en push ni asunto de email) y las decisiones D5, D31, D53, D81, D96, D97, D144, D147, D149,
D150 y D151.

**Lo que D147 cambia del Flujo 6 original.** El Flujo 6 decía que, al aprobar, "el Admin coordina
fecha y lugar fuera de la app". D147 (2026-10-07) lo trae adentro: la fecha **es un Evento de
bautismo** que fija la iglesia, y el Admin le suma a las Personas aceptadas. Por eso la "fecha
deseada" del mini-formulario deja de tener sentido (ver Assumptions y Preguntas para Echu).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pedir el bautismo desde Mi camino (Priority: P1)

Una Persona que está haciendo Vida Nueva (o ya la terminó) y quiere bautizarse quiere poder pedirlo
desde la app, sin tener que escribirle a nadie por WhatsApp ni esperar a que alguien se acuerde de
ofrecérselo.

**Why this priority**: Es la puerta de entrada: sin pedido no hay nada que revisar ni a quién
asignarle fecha. Y es el caso que `docs/01` nombra en el criterio de éxito ("cómo bautizarse").

**Independent Test**: Una Persona con Vida Nueva en curso entra a Mi camino, ve la card de
Bautismo con la acción "Quiero bautizarme", la confirma y ve en la misma card que su pedido quedó
"en revisión"; el Admin lo ve en la bandeja.

**Acceptance Scenarios**:

1. **Given** una Persona con sesión y Vida Nueva en curso, **When** entra a Mi camino, **Then** ve
   la card de Bautismo con una explicación corta de qué es el paso y la acción "Quiero bautizarme".
2. **Given** esa Persona, **When** toca "Quiero bautizarme", escribe opcionalmente algo que quiera
   contarle al equipo y confirma, **Then** se crea una Solicitud de Bautismo pendiente a su nombre y
   la card pasa a decir que el pedido está en revisión y qué pasa después ("el equipo lo revisa y te
   avisamos").
3. **Given** una Persona con Vida Nueva completada (o con la etapa confirmada como hecha por D144),
   **When** entra a Mi camino, **Then** puede pedirlo igual que en el escenario 2.
4. **Given** una Persona sin Vida Nueva en curso ni completada y sin habilitación del Admin,
   **When** entra a Mi camino, **Then** la card de Bautismo no ofrece el pedido: le explica que el
   bautismo se pide una vez que empezó Vida Nueva y le muestra cómo empezarla (enlace a la card de
   Vida Nueva); si igual lo intenta por la API, el sistema lo rechaza con un motivo claro.
5. **Given** una Persona a la que el Admin habilitó el bautismo (Historia 5), **When** entra a Mi
   camino, **Then** puede pedirlo aunque no haya empezado Vida Nueva.
6. **Given** una Persona con una Solicitud de Bautismo pendiente o aceptada, **When** intenta pedir
   otra (dos pestañas, doble toque, la API directa), **Then** el sistema no crea un duplicado y le
   muestra la que ya tiene.
7. **Given** una Persona menor de 12 años, **When** entra a Mi camino, **Then** la card le dice que
   este pedido lo hace su mamá, papá o tutor hablando con el equipo, sin botón de pedir.
8. **Given** una Persona que ya se bautizó (por esta app o declarado y confirmado por D144),
   **When** entra a Mi camino, **Then** la card muestra que ya se bautizó (con la fecha si se
   conoce) y no ofrece pedirlo de nuevo.

---

### User Story 2 - Aceptar o rechazar los pedidos (Priority: P1)

El Admin quiere ver los pedidos de bautismo en la misma bandeja que el resto de las Solicitudes,
revisarlos y aceptarlos o rechazarlos, para que nadie quede esperando sin respuesta.

**Why this priority**: Es la otra mitad imprescindible: sin revisión, un pedido queda parado para
siempre, que es exactamente el silencio que la app viene a sacar.

**Independent Test**: Con una Solicitud de Bautismo pendiente, el Admin la encuentra en la bandeja
filtrando por "Bautismo", abre su detalle, la acepta, y la Persona ve en Mi camino "Aceptamos tu
pedido, te avisamos la próxima fecha".

**Acceptance Scenarios**:

1. **Given** Solicitudes de Discipulado y de Bautismo abiertas, **When** el Admin abre la bandeja
   de Solicitudes, **Then** ve las dos, cada una con su tipo escrito, y puede filtrar por tipo (el
   filtro aparece ahora que hay más de un tipo conectado).
2. **Given** una Solicitud de Bautismo pendiente, **When** el Admin abre su detalle, **Then** ve
   quién la pidió, cuándo, quién la creó (la Persona o el Admin en su nombre), lo que la Persona
   escribió, y su situación en Vida Nueva (en curso desde tal fecha, completada, o habilitada por
   el Admin, y quién la habilitó).
3. **Given** ese detalle, **When** el Admin la acepta, **Then** la Solicitud queda aceptada, sin
   fecha, con quién y cuándo la revisó; si hay un Evento de bautismo próximo, el Admin puede
   asignarlo ahí mismo (Historia 3), pero no está obligado.
4. **Given** ese detalle, **When** el Admin la rechaza (con un motivo opcional que solo ve el equipo),
   **Then** la Solicitud queda rechazada; la Persona ve en Mi camino que por ahora no se pudo
   aceptar, que alguien del equipo va a hablar con ella, y que puede volver a pedirlo más adelante.
5. **Given** que el Admin y la Persona actúan a la vez (ella retira el pedido mientras él lo
   acepta), **When** llegan las dos acciones, **Then** gana la primera y la segunda recibe un
   mensaje claro de que el pedido ya cambió, sin estados mezclados.
6. **Given** un Pastor, **When** abre la bandeja o el detalle, **Then** ve todo sin ninguna acción
   (D64).
7. **Given** cualquier cambio de estado de una Solicitud de Bautismo, **When** se guarda, **Then**
   el sistema deja registrado el aviso que le corresponde a la Persona (Historia 6), para que el
   sistema de notificaciones (spec 012) lo envíe.

---

### User Story 3 - Asignar a los aceptados a un Evento de bautismo (Priority: P1)

El Admin, cuando la iglesia fija una fecha de bautismos, quiere sumar a ese Evento a las Personas
aceptadas que están esperando, de una vez, para que cada una sepa su fecha sin un mensaje uno por
uno.

**Why this priority**: Es lo que D147 agrega y lo que cierra el ciclo para la Persona: tener una
fecha. Sin esto, "aceptada" no lleva a ningún lado dentro de la app.

**Independent Test**: Con un Evento de bautismo futuro (creado con la spec 011) y dos Solicitudes
aceptadas sin fecha, el Admin abre el Evento, ve la lista de aceptados que esperan, tilda a los
dos, confirma, y cada Persona ve en Mi camino la fecha, la hora y el lugar.

**Acceptance Scenarios**:

1. **Given** un Evento de bautismo activo y futuro y Solicitudes aceptadas sin fecha, **When** el
   Admin abre ese Evento en el backoffice, **Then** ve "Personas a bautizar" (las ya asignadas) y
   "Esperando fecha" (las aceptadas sin Evento), con la fecha en que se aceptó cada una y las más
   antiguas primero.
2. **Given** esa pantalla, **When** el Admin elige una o varias Personas que esperan y confirma,
   **Then** quedan asignadas a ese Evento, en una sola operación; si alguna cambió de estado en el
   medio (la retiró la Persona, ya la asignó otro Admin), el resto se asigna igual y se le dice al
   Admin cuál no y por qué.
3. **Given** el detalle de una Solicitud aceptada, **When** el Admin elige uno de los próximos
   Eventos de bautismo, **Then** queda asignada a ese Evento (el mismo resultado que el escenario 2,
   para una sola Persona).
4. **Given** una Persona asignada a un Evento, **When** el Admin la quita de ese Evento (o la pasa a
   otro), **Then** vuelve a "esperando fecha" (o queda en el otro Evento) y la Persona ve el cambio.
5. **Given** que no hay ningún Evento de bautismo futuro, **When** el Admin quiere asignar desde el
   detalle de una Solicitud, **Then** el sistema se lo dice y le ofrece ir a crear uno (spec 011),
   en vez de un selector vacío.
6. **Given** un Evento de bautismo que el Admin cancela (spec 011), **When** se confirma la
   cancelación, **Then** todas las Personas asignadas vuelven a "esperando fecha" y cada una recibe
   el aviso correspondiente.
7. **Given** una Persona asignada a un Evento, **When** cualquiera mira la página pública de ese
   Evento, **Then** no ve ni el nombre ni la cantidad de Personas a bautizar (dato sensible, D5).

---

### User Story 4 - Ver en qué está mi bautismo (Priority: P2)

Una Persona que pidió el bautismo quiere saber, sin preguntarle a nadie, en qué está su pedido:
en revisión, aceptado esperando fecha, con fecha (cuál, a qué hora, dónde), rechazado por ahora, o
ya realizado.

**Why this priority**: Con el envío de avisos en otra spec (012), la card de Mi camino es la vía
que seguro existe para enterarse. Depende de las Historias 1 a 3 para tener estados que mostrar.

**Independent Test**: Llevar una Solicitud por cada estado y verificar que la card de Mi camino
muestra, para cada uno, un texto + ícono (nunca solo color) que dice qué pasa después.

**Acceptance Scenarios**:

1. **Given** una Solicitud pendiente, **When** la Persona mira la card, **Then** ve "Recibimos tu
   pedido, el equipo lo está revisando", desde cuándo, y la opción de retirarlo.
2. **Given** una Solicitud aceptada sin fecha, **When** la Persona mira la card, **Then** ve
   "Aceptamos tu pedido, te avisamos la próxima fecha" (D147).
3. **Given** una Solicitud asignada a un Evento futuro, **When** la Persona mira la card, **Then** ve
   la fecha, la hora y el lugar del Evento en texto, un enlace a la página del Evento, y la opción
   "No puedo ese día".
4. **Given** una Solicitud rechazada, **When** la Persona mira la card, **Then** ve que por ahora no
   se pudo aceptar, que alguien del equipo va a hablar con ella, y la opción de volver a pedirlo.
   No ve el motivo interno.
5. **Given** una Solicitud realizada (el Admin confirmó que se bautizó), **When** la Persona mira la
   card, **Then** ve que se bautizó y en qué fecha.
6. **Given** una Persona asignada a un Evento, **When** toca "No puedo ese día" y confirma (diálogo
   neutro, D151), **Then** queda otra vez "esperando fecha", el Admin lo ve en "Esperando fecha", y
   la card se lo dice.
7. **Given** una Solicitud pendiente o aceptada, **When** la Persona la retira y confirma (diálogo
   neutro, D151), **Then** la Solicitud queda retirada, sale de cualquier Evento al que estuviera
   asignada, y la card vuelve a ofrecer pedirlo.
8. **Given** una Solicitud creada por el Admin en nombre de la Persona, **When** la Persona entra
   más adelante a la app, **Then** la ve en su card como cualquier otra.

---

### User Story 5 - Habilitar el bautismo y pedirlo en nombre de alguien (Priority: P2)

El Admin quiere cubrir las excepciones: habilitar el pedido para una Persona que no hizo Vida
Nueva (D147: "o si el Admin lo habilita"), y cargar el pedido en nombre de alguien que no usa la
app (Flujo 12, D97).

**Why this priority**: Son las excepciones que D147 y D97 dejan explícitas. Sin ellas, quien no
encaja en la regla general o no usa la app vuelve a depender de WhatsApp. No son el camino
principal.

**Independent Test**: El Admin habilita el bautismo a una Persona sin Vida Nueva y ella ve en Mi
camino el botón de pedir; aparte, el Admin crea una Solicitud en nombre de una Persona sin acceso a
la app y la ve en la bandeja con "creada por" su nombre.

**Acceptance Scenarios**:

1. **Given** una Persona sin Vida Nueva, **When** el Admin le habilita el bautismo desde su ficha en
   Personas, **Then** queda registrado quién y cuándo lo habilitó, y la Persona puede pedirlo.
2. **Given** una Persona habilitada sin Solicitud abierta, **When** el Admin le quita la
   habilitación, **Then** deja de poder pedirlo (si sigue sin Vida Nueva); una Solicitud ya abierta
   no se ve afectada.
3. **Given** cualquier Persona adulta o mayor de 12 años, **When** el Admin crea en su nombre una
   Solicitud de Bautismo, **Then** queda registrado quién la creó; el Admin no necesita habilitarla
   antes (al crearla él, ya está decidiendo la excepción).
4. **Given** una Persona menor de 12 años, **When** el Admin crea en su nombre la Solicitud (después
   de hablar con el tutor, fuera de la app), **Then** el sistema lo permite y lo registra.
5. **Given** una Persona que ya tiene una Solicitud abierta o ya se bautizó, **When** el Admin
   intenta crear otra en su nombre, **Then** el sistema no la crea y le dice por qué.

---

### User Story 6 - Avisar a la Persona de cada novedad (Priority: P2)

La Persona quiere enterarse sin entrar a la app cuando su pedido se acepta, se rechaza, o recibe
(o pierde) una fecha.

**Why this priority**: Es lo que hoy se hace por WhatsApp. El envío lo construye la spec 012; esta
spec solo garantiza que cada cambio deja el aviso listo, sin datos sensibles.

**Independent Test**: Cada transición de una Solicitud de Bautismo produce exactamente un evento
de aviso con la Persona como destinataria y la Solicitud como entidad relacionada, y ningún texto
sensible (verificable con un test aunque la 012 no esté mergeada).

**Acceptance Scenarios**:

1. **Given** una Solicitud que el Admin acepta, rechaza, asigna a un Evento, quita de un Evento,
   o cuyo Evento se cancela, **When** el cambio se confirma, **Then** queda un aviso importante
   (`solicitud_actualizada`) para la Persona, que la lleva a Mi camino al tocarlo.
2. **Given** ese aviso, **When** se arma su texto para push o asunto de email, **Then** no menciona
   la palabra "bautismo" ni el estado (ej. "Tenés una novedad sobre tu solicitud"), cumpliendo
   `docs/13`, punto 5; el detalle se ve adentro de la app.
3. **Given** una Persona asignada a un Evento de bautismo, **When** se acerca la fecha, **Then**
   recibe el recordatorio de Evento próximo como cualquier inscripto (spec 012), con el mismo
   cuidado de no nombrar el bautismo fuera de la app.
4. **Given** que la acción la hizo la propia Persona (retirar, "No puedo ese día"), **When** se
   guarda, **Then** no se le manda aviso a ella; el Admin lo ve en la bandeja y en el Evento.

---

### User Story 7 - Confirmar quiénes se bautizaron (Priority: P3)

Pasado el Evento, el Admin quiere dejar registrado quiénes se bautizaron, para que su camino en la
app lo refleje y para las métricas (conversión Visitante → Bautismo, `docs/08`).

**Why this priority**: Cierra el registro, pero no bloquea a nadie: hasta que se confirme, la
Persona ve su fecha (ya pasada) como "pendiente de confirmar".

**Independent Test**: Con un Evento de bautismo ya pasado y tres Personas asignadas, el Admin abre
el Evento, destilda a una que no vino, confirma, y dos quedan bautizadas mientras la tercera vuelve
a "esperando fecha".

**Acceptance Scenarios**:

1. **Given** un Evento de bautismo cuya fecha ya pasó, **When** el Admin lo abre, **Then** ve
   "Confirmar bautismos", con todas las Personas asignadas tildadas por defecto.
2. **Given** esa lista, **When** el Admin destilda a quien no se bautizó y confirma, **Then** las
   tildadas quedan como realizadas (con la fecha del Evento) y las destildadas vuelven a "esperando
   fecha", sin perder que su pedido estaba aceptado.
3. **Given** un Evento futuro, **When** el Admin intenta confirmar bautismos, **Then** el sistema no
   lo permite (todavía no ocurrió).
4. **Given** un Evento pasado con bautismos sin confirmar, **When** el Admin mira sus pendientes en
   Inicio del backoffice, **Then** ve ese Evento como algo para cerrar.

---

### Edge Cases

- **Pedido doble simultáneo** (dos pestañas, doble toque): la base garantiza una sola Solicitud
  abierta por Persona; el segundo pedido recibe "ya tenés un pedido" y no un error genérico.
- **Vida Nueva dada de baja después de pedir**: la Solicitud ya creada sigue su curso; la regla de
  habilitación se mira solo al pedir (Assumption).
- **La Persona deja de cumplir la regla y retiró el pedido**: para volver a pedir tiene que cumplirla
  de nuevo (o tener la habilitación del Admin).
- **El Evento cambia de fecha o lugar** (spec 011): la Persona ve siempre la fecha y el lugar
  vigentes del Evento, porque la card los lee del Evento, no de una copia.
- **El Evento se desactiva o elimina** (spec 011): equivale a la cancelación del escenario 3.6; nadie
  queda asignado a un Evento inactivo.
- **Se asigna a un Evento que pasó a ser pasado mientras el Admin tenía la pantalla abierta**: se
  rechaza con un mensaje claro (solo se asigna a Eventos futuros y activos).
- **Retirar con fecha asignada**: la Persona sale del Evento en la misma operación.
- **La Persona se bautizó y pide de nuevo**: no se ofrece; por la API se rechaza.
- **Persona sin acceso a la app**: no tiene card; el Admin hace todo en su nombre y, si tiene email,
  le llegan los avisos importantes por email (D96, spec 012).
- **Declaración "Ya me bauticé" (D144) mientras hay una Solicitud abierta**: si el Admin confirma la
  declaración, la Solicitud abierta se retira sola (no se puede estar esperando fecha y ya
  bautizado). Lo dispara la spec de D144 con la pieza que esta spec expone.
- **Un Evento de bautismo con Personas asignadas**: no muestra "Anotarme", ni QR, ni cupo, ni costo,
  ni la lista de personas en la página pública.
- **El Pastor** intenta una acción por la API: 403, igual que en el resto del backoffice.

## Fuera de alcance

- **Crear, editar, cancelar y publicar Eventos** (incluidos los de bautismo): spec 011. Esta spec
  define qué necesita del Evento (ver plan, "Dependencias") y no lo especifica.
- **Enviar los avisos** (Avisos in-app, email; push en la tanda siguiente, D149) y el recordatorio
  de Evento próximo: spec 012. Esta spec solo deja el evento listo.
- **El "Ya me bauticé" de D144** (declaración + confirmación del Admin): la spec que implemente D144.
  La card de Bautismo le deja su lugar.
- **El contenido de "Bautismo" en Primeros pasos** (qué es, cómo se prepara): contenido público,
  spec de contenido; la card enlaza cuando exista.
- **Clases o encuentros de preparación para el bautismo**: no figuran en `docs/`.
- **Que el Discipulador vea el estado del bautismo de sus discípulos**: no figura en `docs/`.
- **Certificado de bautismo** y datos del formulario físico más allá de los del registro (D53 ya los
  pide al registrarse).

## Requirements *(mandatory)*

### Functional Requirements

**Pedir (Historia 1)**

- **FR-001**: Una Persona con sesión activa MUST poder crear su propia Solicitud de Bautismo desde
  la card de Bautismo de Mi camino, con un único campo opcional de texto libre ("¿Querés contarnos
  algo?", hasta 500 caracteres).
- **FR-002**: El sistema MUST permitir el pedido propio solo si la Persona cumple **alguna** de:
  (a) tiene Vida Nueva en curso (una inscripción activa en un Grupo de Vida Nueva); (b) completó Vida
  Nueva (inscripción completada, o la etapa confirmada como hecha por D144); (c) el Admin le habilitó
  el bautismo (FR-021). Si no cumple ninguna, MUST rechazarlo con un motivo que la interfaz traduce
  a "el bautismo se pide una vez que empezaste Vida Nueva" (D147).
- **FR-003**: El sistema MUST rechazar el pedido propio de una Persona menor de 12 años, con un
  motivo propio; la card no le ofrece el botón y le explica que lo hace su tutor con el equipo
  (Assumption; Pregunta 2).
- **FR-004**: Una Persona MUST tener como máximo **una** Solicitud de Bautismo abierta (pendiente o
  aceptada) a la vez; un segundo pedido MUST rechazarse sin crear nada, también si llegan dos a la
  vez (`docs/04`, regla de no duplicados).
- **FR-005**: El sistema MUST rechazar un pedido (propio o en nombre de) de una Persona que ya se
  bautizó (FR-030).

**Revisar (Historia 2)**

- **FR-006**: Las Solicitudes de Bautismo MUST aparecer en la bandeja unificada de Solicitudes del
  backoffice con la forma base común (Persona, tipo, estado, fecha, revisada por, creada por) y el
  filtro por tipo MUST mostrarse ahora que hay más de un tipo conectado (D31, `docs/14`). La bandeja
  MUST ofrecer además el filtro "Esperando fecha" (Bautismo aceptadas sin Evento); el filtro por
  defecto ("abiertas") muestra solo lo que espera una decisión.
- **FR-007**: El detalle de una Solicitud de Bautismo MUST mostrar lo de la forma base, el texto
  opcional de la Persona, su situación respecto de la regla de FR-002 (Vida Nueva en curso desde /
  completada / habilitada por quién y cuándo / ninguna, si la creó el Admin) y, si está aceptada, el
  Evento asignado o "esperando fecha".
- **FR-008**: El Admin MUST poder **aceptar** una Solicitud pendiente. Queda aceptada sin Evento,
  con quién y cuándo la revisó.
- **FR-009**: El Admin MUST poder **rechazar** una Solicitud pendiente, con un motivo opcional (hasta
  500 caracteres) que solo ve el equipo (Admin y Pastor). La Persona puede volver a pedir.
- **FR-010**: Toda transición MUST verificar el estado actual dentro de la misma operación; si la
  Solicitud ya no está en el estado esperado, MUST responder con un error claro ("este pedido ya
  cambió") en vez de pisar el cambio anterior.
- **FR-011**: El Pastor MUST ver bandeja y detalle sin acciones; ninguna acción de esta spec está
  disponible para Discipuladores, Líderes de curso ni Pastores (D64, D142).

**Asignar fecha (Historia 3)**

- **FR-012**: El Admin MUST poder asignar una o varias Solicitudes **aceptadas** a un Evento de
  bautismo **activo y futuro**, desde el Evento (selección múltiple de "Esperando fecha") o desde
  el detalle de la Solicitud (selector de próximos Eventos de bautismo).
- **FR-013**: Una Solicitud MUST estar asignada a como máximo un Evento a la vez. Asignarla a otro
  Evento la saca del anterior en la misma operación.
- **FR-014**: La asignación múltiple MUST ser parcial-tolerante: asigna las que se pueden y
  devuelve, por cada una que no, el motivo (ya no está aceptada, ya está en ese Evento).
- **FR-015**: El Admin MUST poder quitar a una Persona de un Evento futuro; la Solicitud vuelve a
  "esperando fecha".
- **FR-016**: Cuando un Evento de bautismo se cancela o desactiva (spec 011), todas sus Solicitudes
  asignadas MUST volver a "esperando fecha" en la misma operación, con su aviso (FR-026).
- **FR-017**: La asignación MUST reflejarse como la participación de la Persona en ese Evento de la
  forma que define la spec 011 (inscripción confirmada, creada por el Admin), para que el
  recordatorio de Evento próximo de la spec 012 le llegue sin un caso especial (D147: "reusa lo que
  ya existe").
- **FR-018**: La página pública de un Evento de bautismo MUST NOT mostrar quiénes ni cuántos se
  bautizan; y un Evento de bautismo MUST NOT ofrecer inscripción propia ("Anotarme"), QR, cupo,
  lista de espera ni costo (requisito hacia la spec 011).

**Estado para la Persona (Historia 4)**

- **FR-019**: La card de Bautismo de Mi camino MUST mostrar exactamente uno de estos estados, cada
  uno con texto + ícono (D81) y qué pasa después (`docs/15`): `no_habilitada` (explica la regla y
  enlaza a Vida Nueva), `lo_pide_su_tutor`, `puede_pedir` (con el último desenlace si hubo uno:
  rechazada o retirada), `en_revision`, `esperando_fecha`, `con_fecha` (fecha, hora y lugar del
  Evento, en texto, y enlace a su página), `fecha_pasada_sin_confirmar` ("estamos confirmando tu
  bautismo"), y `bautizada` (con la fecha si se conoce).
- **FR-020**: La Persona MUST poder
  **retirar** su Solicitud mientras esté pendiente o aceptada (sin fecha o con un Evento futuro),
  con un diálogo de confirmación neutro (D151); si estaba asignada, sale del Evento en la misma
  operación. Con un Evento ya pasado y sin confirmar no se puede retirar: el bautismo pudo haber
  ocurrido y lo resuelve el Admin al confirmar (FR-027).
- **FR-020a**: La Persona MUST poder decir **"No puedo ese día"** sobre su Evento asignado futuro;
  la Solicitud vuelve a "esperando fecha" y sigue aceptada.
- **FR-020b**: La card MUST dejar el lugar para la acción "Ya me bauticé" de D144 cuando el estado
  es `no_habilitada` o `puede_pedir`; la acción la provee la spec que implemente D144.

**Excepciones del Admin (Historia 5)**

- **FR-021**: El Admin MUST poder habilitar y deshabilitar el bautismo para una Persona desde su
  ficha en Personas; MUST quedar registrado quién y cuándo. Deshabilitar no afecta una Solicitud
  ya abierta.
- **FR-022**: El Admin MUST poder crear una Solicitud de Bautismo en nombre de cualquier Persona
  activa (con o sin acceso a la app, de cualquier edad), sin la regla de FR-002 ni la de edad de
  FR-003, pero sí con FR-004 y FR-005; MUST quedar registrado quién la creó (`creado_por`, D97).

**Avisos (Historia 6)**

- **FR-023**: Cada transición hecha por el Admin o por el sistema (aceptada, rechazada, asignada,
  reasignada, quitada de un Evento, Evento cancelado, realizada) MUST emitir, **después** de
  confirmada la operación, un evento de aviso con destinatario la Persona, prioridad importante
  (salvo `realizada`, normal) y entidad relacionada la Solicitud, para el disparador
  `solicitud_actualizada` de la spec 012.
- **FR-024**: Los eventos MUST llevar solo identificadores (nunca nombres, motivos ni la palabra
  "bautismo" en datos que viajen a push o al asunto de un email, `docs/13` punto 5).
- **FR-025**: Las acciones de la propia Persona (pedir, retirar, "No puedo ese día") MUST NOT
  avisarle a ella; quedan visibles para el Admin en la bandeja y en el Evento.
- **FR-026**: La cancelación de un Evento de bautismo MUST emitir un aviso por cada Persona que
  estaba asignada (FR-016).

**Confirmar el bautismo (Historia 7)**

- **FR-027**: Para un Evento de bautismo cuya fecha ya pasó, el Admin MUST poder confirmar quiénes
  se bautizaron, con todos los asignados tildados por defecto. Las tildadas pasan a **realizada**;
  las destildadas vuelven a "esperando fecha" (siguen aceptadas).
- **FR-028**: Confirmar MUST rechazarse para un Evento futuro.
- **FR-029**: Los Eventos de bautismo pasados con asignados sin confirmar MUST aparecer entre los
  pendientes del Admin en Inicio del backoffice.
- **FR-030**: El sistema MUST tener **un solo lugar** que responda si una Persona está bautizada:
  tiene una Solicitud realizada, o una declaración de bautismo confirmada por D144. Mi camino,
  FR-005 y cualquier otra pantalla lo leen de ahí (Principio XI).

**Transversales**

- **FR-031**: Todas las pantallas de esta spec MUST tener los cuatro estados (cargando, vacío,
  error, éxito), bloquear los botones durante el envío y proteger de la reentrada (H-57), mostrar
  errores de campo con la pieza compartida (H-50), usar solo colores de tokens (D118) y textos de
  `next-intl` en rioplatense con voseo (D84).
- **FR-032**: La card de Bautismo (web app) MUST diseñarse a 360 px primero, con letra de 16 px en
  etiquetas, botones y ayudas y botones de 44 px de alto (D150).
- **FR-033**: Cada pantalla de Admin que liste Solicitudes o asignados MUST paginar en la API si
  puede crecer (`docs/15`, listados paginados); la lista de "Esperando fecha" de un Evento se
  pagina igual.
- **FR-034**: Ninguna Solicitud de Bautismo se borra: rechazada, retirada y realizada quedan como
  historial (Principio III).

### Key Entities

- **Solicitud de Bautismo** (`docs/04`): forma base común (Persona, estado, fecha de pedido,
  revisada por y cuándo, creada por) más sus campos propios: el texto opcional de la Persona, el
  motivo interno de rechazo, el Evento de bautismo asignado (si hay) y, si se realizó, cuándo.
  Estados: `pendiente`, `aprobada` (lo que la interfaz llama "aceptada"), `rechazada`, `retirada`
  y `realizada`. "Esperando fecha" y "con fecha" no son estados: son `aprobada` sin o con Evento.
- **Habilitación de bautismo**: el permiso excepcional que el Admin le da a una Persona (D147), con
  quién y cuándo. Un dato de la Persona, no una Solicitud.
- **Evento de bautismo** (spec 011): un Evento marcado como de bautismo, con fecha, hora, lugar y
  Sede; sin inscripción propia, cupo ni costo. La asignación de una Solicitud se refleja como la
  participación de la Persona en ese Evento (FR-017).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una Persona con Vida Nueva en curso pide el bautismo desde Mi camino en menos de 1
  minuto y en no más de 2 toques después de abrir la card.
- **SC-002**: El 100 % de las Solicitudes de Bautismo abiertas está visible para el Admin en la
  bandeja de Solicitudes, filtrable por tipo, sin buscar en otro lado.
- **SC-003**: El Admin asigna una fecha a 10 Personas aceptadas en una sola operación, en menos de 1
  minuto.
- **SC-004**: En cualquier momento, la Persona ve en Mi camino en qué está su pedido y qué pasa
  después, sin preguntarle a nadie: cada uno de los 8 estados de FR-019 tiene texto e ícono propios
  verificados por un test.
- **SC-005**: Ninguna Persona queda con dos Solicitudes abiertas ni asignada a un Evento cancelado;
  y todo Evento de bautismo pasado con asignados sin confirmar aparece en los pendientes del Admin
  desde el momento en que pasa su fecha.
- **SC-006**: Ningún aviso de esta spec contiene, fuera de la app, la palabra "bautismo" ni el
  estado del pedido.
- **SC-007**: Las pantallas de esta spec pasan axe sin violaciones en modo claro y oscuro, y la
  card de Bautismo no tiene scroll horizontal a 360 px.

## Assumptions

- **Sin "fecha deseada".** `docs/04` y el diagrama ER traían `fecha_deseada`, pensada cuando la
  fecha se coordinaba por fuera. Con D147 la fecha la fija la iglesia como Evento; pedirle una fecha
  a la Persona crea una expectativa que el sistema no puede cumplir. Se reemplaza por un texto
  opcional ("¿Querés contarnos algo?"), que cubre el "algún dato adicional si hace falta" del
  Flujo 6. Pregunta 3; cambio a `docs/04` y al ER al mergear.
- **"Aceptada" en la interfaz, `aprobada` en el modelo** (Principio II: el nombre del dominio es el
  de `docs/04`; D147 usa "aceptamos" como texto para la Persona).
- **La regla de FR-002 se mira solo al pedir.** Si después la Persona abandona Vida Nueva, la
  Solicitud sigue su curso: el Admin ya la tiene a la vista y decide.
- **Edad**: misma frontera que Vida Nueva (FR-044 de la 004): desde 12 años pide sola; menor de 12
  lo carga el Admin en su nombre tras hablar con el tutor. Pregunta 2.
- **Solo el Admin** pide en nombre de otra Persona para el bautismo (D143 le da al Discipulador
  únicamente Vida Nueva en nombre de otros).
- **Crear en nombre de no exige habilitación**: el Admin que crea el pedido ya está decidiendo la
  excepción; pedirle además "habilitar" sería un clic sin información nueva.
- **El motivo de rechazo no lo ve la Persona.** Un rechazo de bautismo es una conversación
  pastoral; la card dice que alguien del equipo va a hablar con ella. Pregunta 5.
- **"No puedo ese día"** existe porque la alternativa es que la Persona falte sin avisar o escriba
  por WhatsApp; no está en `docs/`, pero es la contracara directa de "el Admin suma a los
  aceptados" y no cambia el modelo.
- **Confirmar quiénes se bautizaron** lo hace el Admin después del Evento (Historia 7), con todos
  tildados por defecto. Sin este paso la app no podría distinguir "tenía fecha" de "se bautizó".
  Pregunta 1.
- **El Evento de bautismo aparece en la cartelera pública** como cualquier Evento informativo (la
  iglesia lo celebra en el culto y se invita a la familia), sin nombres ni cantidad. Pregunta 4.
- **Mi camino** ya existe (spec 004, card de Vida Nueva). Esta spec agrega la card de Bautismo; el
  orden y la presentación general de las cards de Mi camino no se redefinen acá.
- **Notificaciones**: esta tanda es Avisos in-app + email para lo importante (D149). Push queda para
  después; los eventos de esta spec ya sirven para los tres canales.

## Preguntas para Echu

1. **¿El Admin confirma después del Evento quiénes se bautizaron?** Sin esto la app solo sabe que
   alguien "tenía fecha". **Recomiendo sí**: después de la fecha, el Evento muestra "Confirmar
   bautismos" con todos tildados; el Admin destilda a quien faltó (vuelve a esperar fecha). Es un
   clic en el caso normal y deja el dato real para Mi camino y las métricas.
2. **¿Desde qué edad se puede pedir el bautismo sola/o?** **Recomiendo la misma regla que Vida
   Nueva**: desde 12 años pide sola/o; menor de 12, lo carga el Admin en su nombre después de hablar
   con la familia. Una sola frontera es más fácil de explicar y de mantener.
3. **¿Sacamos la "fecha deseada" del pedido?** `docs/04` la tenía de antes de D147. **Recomiendo
   sacarla** y dejar un "¿Querés contarnos algo?" opcional: la fecha la fija la iglesia, y
   preguntarla promete algo que no depende de la Persona.
4. **¿El Evento de bautismo aparece en la cartelera pública?** **Recomiendo sí, sin nombres ni
   cantidad**: el bautismo se celebra en el culto y la familia quiere invitar; los nombres de
   quienes se bautizan son dato sensible (D5) y nunca son públicos.
5. **¿La Persona ve el motivo si se rechaza su pedido?** **Recomiendo que no**: ve "por ahora no
   pudimos aceptar tu pedido; alguien del equipo va a hablar con vos" y puede volver a pedirlo. El
   motivo queda para el equipo; un rechazo de bautismo se conversa, no se lee en una pantalla.
