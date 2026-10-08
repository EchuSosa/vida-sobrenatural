# Feature Specification: Vida de Servicio

**Feature Branch**: `008-vida-de-servicio`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "008 — Vida de Servicio. Segunda etapa del camino. Todo lo que dicen `docs/02` (Mi camino → Vida de Servicio), `docs/04` (Curso con modalidad `liberacion_programada`, Cronograma, Contenido, Grupo, Inscripción, Asistencia), `docs/07` (sus flujos) y las decisiones (D74: requiere Vida Nueva completada o Completitud Manual; activación de 'Apto para Ministerio' al finalizar; bajas; Líder de curso). Incluye: inscripción de la Persona (con el prerrequisito y su mensaje), grupos con Líder de curso, contenido semanal liberado por cronograma, asistencia, bajas y finalización. Lo que hace el Líder de curso va en la web app, no en el backoffice (D142); el Admin gestiona desde el backoffice. Dependencias: Completitud Manual la modela la spec 006; notificaciones (contenido liberado, D49) son de la spec 012: dejá definidos los eventos que dispara, sin construir el envío. La card de Vida de Servicio de Mi camino la crea la 006 deshabilitada: esta spec la habilita."

**Fuentes** (la spec se deriva de acá, no inventa producto): `docs/02-alcance-mvp.md` (Mi camino →
Vida de Servicio), `docs/03-roles-permisos.md` (En curso: Vida de Servicio, Apto para Ministerio,
Líder de curso), `docs/04-dominio-entidades.md` (Curso, Completitud Manual, Inscripción, Cronograma,
Contenido, Encuentro, Asistencia, "Finalización de Grupo y activación de Apto para Ministerio"),
`docs/07-flujos-casos-de-uso.md` (Flujo 4; Flujo 9 — Completitud Manual; Flujo 10 —
`contenido_liberado`; Flujo 12 — acciones en nombre de), decisiones D10, D17, D20, D24, D26, D27,
D39–D43, D45, D49, D60, D74, D81, D96, D131–D134, D137, D142, D144, D149–D151 de
`docs/05-decisiones.md`, y `docs/14`, `docs/15`, `docs/16`.

**Qué ya existe y esta spec usa sin volver a decidir** (lo construyó la spec 004): Grupo con estado y
cierre con motivo, Inscripción con sus cuatro estados, Liderazgo con vigencia, Encuentro y Asistencia
por Persona, la bandeja de Solicitudes del backoffice, la vista administrativa de Grupos y la tarjeta
de pendientes del Admin. Lo que construyen otras specs y esta usa está en el plan
(**Dependencias**).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abrir una edición de Vida de Servicio (Priority: P1)

El Admin quiere abrir una nueva edición del curso (un Grupo de Vida de Servicio) con su nombre, su
Sede, su fecha de inicio y la cantidad de semanas, definir en qué fecha se libera el material de cada
semana y asignarle uno o más Líderes de curso — para que la gente pueda anotarse y los Líderes tengan
dónde cargar el material.

**Why this priority**: Sin un Grupo no hay a qué anotarse ni dónde cargar contenido: es la base de
todo el flujo.

**Independent Test**: El Admin crea un Grupo de 8 semanas que empieza un miércoles, el sistema le
propone ocho fechas de liberación semanales que puede ajustar, le asigna dos Líderes, y el Grupo
aparece en el listado de Grupos con su cronograma y sus Líderes, con la inscripción abierta.

**Acceptance Scenarios**:

1. **Given** el Admin en el backoffice, **When** crea un Grupo de Vida de Servicio con nombre, Sede,
   fecha de inicio y cantidad de semanas, **Then** el sistema arma un Cronograma con una semana por
   cada una, con fechas de liberación cada 7 días a partir de la fecha de inicio, que el Admin puede
   corregir semana por semana antes de guardar (FR-002).
2. **Given** el alta del Grupo, **When** el Admin elige los Líderes, **Then** solo puede elegir
   Personas con el rol de cargo `lider_curso`, al menos uno, sin límite de cantidad (D20, FR-003).
3. **Given** un Grupo en curso, **When** el Admin edita la fecha de liberación de una semana que
   todavía no se liberó, agrega una semana al final o quita la última que todavía no se liberó,
   **Then** el cambio se guarda; una semana ya liberada no se puede mover ni quitar (FR-004).
4. **Given** un Grupo en curso, **When** el Admin suma o saca un Líder, **Then** el cambio queda
   registrado (quién, desde y hasta cuándo) y el Líder sacado deja de ver el Grupo; no puede sacar al
   último Líder vigente (FR-005).
5. **Given** un Grupo recién creado, **When** el Admin lo mira, **Then** la inscripción está abierta,
   y puede cerrarla y volver a abrirla cuando quiera (FR-006).
6. **Given** un intento de crear el Grupo con una fecha de liberación repetida o fuera de orden, sin
   Líderes, o con una cantidad de semanas fuera de rango, **When** el Admin guarda, **Then** el
   sistema lo rechaza con el error debajo de cada campo y un resumen arriba (H-50).

---

### User Story 2 - Pedir inscribirme a Vida de Servicio, con el prerrequisito claro (Priority: P1)

Una Persona que terminó Vida Nueva quiere anotarse a la próxima edición de Vida de Servicio desde Mi
camino; y una que todavía no la terminó quiere entender, sin preguntarle a nadie, qué le falta.

**Why this priority**: Es la puerta de entrada de la Persona; sin esto, el Admin sigue anotando a
mano lo que le dicen por WhatsApp.

**Independent Test**: Una Persona con Vida Nueva completada entra a Mi camino, ve la card de Vida de
Servicio habilitada, elige la edición abierta y envía el pedido; la card pasa a "Recibimos tu
pedido". Otra Persona sin Vida Nueva completada ve la card con el motivo y el camino para
destrabarla, sin botón para pedir.

**Acceptance Scenarios**:

1. **Given** una Persona con una Inscripción `completada` en cualquier Curso de categoría Vida Nueva
   (individual o grupal) **o** con una Completitud Manual de Vida Nueva, **When** entra a Mi camino,
   **Then** la card de Vida de Servicio está habilitada y le ofrece "Quiero anotarme" (FR-008, D74).
2. **Given** una Persona que no cumple el prerrequisito, **When** entra a Mi camino, **Then** la card
   de Vida de Servicio le dice qué le falta, en palabras y según su caso — "Primero tenés que terminar
   Vida Nueva" (con el enlace a esa etapa), o "Cuando termines Vida Nueva vas a poder anotarte" si la
   está cursando — y le recuerda que, si ya hizo Vida Nueva antes (en otra iglesia o antes de la
   app), puede avisarlo con "Ya lo hice" en esa etapa (D144); no hay botón para pedir (FR-009).
3. **Given** una Persona que cumple el prerrequisito y hay al menos una edición con inscripción
   abierta, **When** toca "Quiero anotarme", **Then** ve las ediciones abiertas (nombre, Sede si hay
   más de una, fecha de inicio y día de la semana de las liberaciones), elige una (si hay una sola ya
   viene elegida) y envía; queda una Solicitud de inscripción `pendiente` (FR-010).
4. **Given** una Persona que cumple el prerrequisito y **no** hay ninguna edición abierta, **When**
   entra a la card, **Then** el sistema le dice que todavía no hay una edición abierta y le permite
   dejar el pedido igual "para la próxima edición", sin elegir Grupo (FR-011).
5. **Given** una Persona con una Solicitud de inscripción `pendiente`, **When** vuelve a la card,
   **Then** ve "Recibimos tu pedido. El equipo lo revisa y te avisamos." y puede retirarlo (con una
   confirmación neutra, D151); no puede crear otra (FR-012, D60).
6. **Given** una Persona con una Inscripción `activa` o `completada` en Vida de Servicio, **When**
   intenta pedir de nuevo (incluso por la API), **Then** el sistema no lo permite y dice por qué
   (FR-012).
7. **Given** una Persona sin acceso a la app (D97), **When** el Admin, desde su perfil en el
   backoffice, pide en su nombre la inscripción, **Then** se crea la misma Solicitud con el registro de
   quién la creó, y se aplica el mismo prerrequisito (FR-013).
8. **Given** una Persona que no cumple el prerrequisito, **When** intenta crear la Solicitud por la
   API, **Then** el sistema la rechaza con un código propio (FR-008).

---

### User Story 3 - Revisar los pedidos de inscripción (Priority: P1)

El Admin quiere ver los pedidos de inscripción a Vida de Servicio en la misma bandeja de Solicitudes
que ya usa para Vida Nueva, y aprobarlos (eligiendo o confirmando la edición) o rechazarlos.

**Why this priority**: Es la otra mitad de la puerta de entrada (D26: sin aprobación no hay
Inscripción).

**Independent Test**: Con una Solicitud de inscripción pendiente, el Admin la abre desde la bandeja
filtrada por tipo, confirma la edición y aprueba; la Persona queda inscripta en ese Grupo y su card
pasa a "En curso".

**Acceptance Scenarios**:

1. **Given** Solicitudes de Vida Nueva y de Vida de Servicio, **When** el Admin abre la bandeja,
   **Then** ve las dos en el mismo listado, con su tipo en texto, y ahora sí aparece el filtro por tipo
   (con dos tipos conectados deja de ser ruido, FR-025 de la 004; FR-014).
2. **Given** una Solicitud pendiente, **When** el Admin la abre, **Then** ve la Persona, cómo cumple el
   prerrequisito (Vida Nueva completada en tal Grupo, o Completitud Manual) y la edición que pidió (o
   "para la próxima edición"), y puede aprobarla o rechazarla (FR-015).
3. **Given** que el Admin aprueba, **When** confirma, **Then** debe elegir un Grupo en curso de Vida de
   Servicio (viene elegido el que pidió la Persona, si sigue en curso), se crea la Inscripción `activa`
   en ese Grupo, la Solicitud pasa a aprobada, y desde ese momento la Persona ve el contenido liberado
   del Grupo (FR-016).
4. **Given** que entre el pedido y la aprobación la Persona dejó de cumplir el prerrequisito (por
   ejemplo, se anuló su Completitud Manual), **When** el Admin aprueba, **Then** el sistema lo
   rechaza con un mensaje claro (FR-016).
5. **Given** que el Admin rechaza, **When** confirma, **Then** la Solicitud queda rechazada, la
   Persona ve un mensaje amable con a quién consultar (`docs/15`, "¿Y ahora qué?") y puede volver a
   pedir (FR-017).
6. **Given** dos Admins que resuelven la misma Solicitud a la vez, **When** el segundo confirma,
   **Then** recibe un error claro ("esta solicitud ya fue resuelta"), sin crear dos Inscripciones
   (FR-018).

---

### User Story 4 - Cargar el material de cada semana (Priority: P1)

Un Líder de curso quiere cargar, desde el celular, el material de una semana de su Grupo —idealmente
antes de la fecha— sabiendo que los inscriptos lo van a ver recién cuando llegue la fecha de
liberación, y que si se atrasa no se libera "nada".

**Why this priority**: El contenido semanal es lo que hace distinta a Vida de Servicio y lo que hoy
viaja por WhatsApp.

**Independent Test**: Un Líder carga título, texto, un PDF y un enlace de video en la semana 3 (con
fecha futura); un inscripto no la ve; al llegar la fecha la ve; y una semana con fecha pasada sin
material le muestra al inscripto "Todavía no está el material de esta semana".

**Acceptance Scenarios**:

1. **Given** un Líder vigente del Grupo, **When** entra a Mis grupos en la web app, **Then** ve sus
   Grupos en curso y, en cada uno, el Cronograma semana por semana con su estado en texto + ícono:
   "Sin material", "Material cargado — se libera el miércoles 14/10", "Liberado" (FR-019, FR-026).
2. **Given** una semana de su Grupo, **When** el Líder carga el material —título (obligatorio) y al
   menos uno de: texto, archivos (PDF o imagen), enlaces (por ejemplo un video de YouTube)— y guarda,
   **Then** la semana queda con material cargado; cualquier Líder vigente del Grupo puede cargar o
   editar cualquier semana (D27, FR-020).
3. **Given** una semana con material cargado y fecha de liberación futura, **When** un inscripto mira
   su Vida de Servicio, **Then** ve la semana con su fecha ("Se libera el miércoles 14/10") pero no su
   contenido (FR-021).
4. **Given** una semana cuya fecha de liberación llegó (en hora de Argentina) **y** que tiene material
   cargado, **When** un inscripto la mira, **Then** ve el contenido completo, sin que nadie tenga que
   "apretar liberar" (FR-021, D27).
5. **Given** una semana cuya fecha llegó **sin** material cargado, **When** un inscripto la mira,
   **Then** ve "Todavía no está el material de esta semana"; cuando un Líder lo cargue, queda liberado
   en ese momento (FR-021).
6. **Given** una semana ya liberada, **When** el Líder corrige el material, **Then** el cambio se ve
   enseguida y no se vuelve a avisar como contenido nuevo (FR-022).
7. **Given** un archivo de más del tamaño permitido o de un tipo no admitido, **When** el Líder lo
   sube, **Then** el sistema lo rechaza con un mensaje debajo del campo que dice el límite (FR-023).
8. **Given** una Persona que no es inscripta, Líder vigente, Admin ni Pastor, **When** intenta abrir un
   archivo de un Contenido (incluso con el enlace directo), **Then** el sistema no se lo entrega
   (FR-024, Principio V).
9. **Given** un Líder que no es Líder vigente de ese Grupo, **When** intenta ver o cargar su material,
   **Then** el sistema se lo impide (FR-019).

---

### User Story 5 - Seguir mi Vida de Servicio (Priority: P1)

Una Persona inscripta quiere ver, en Mi camino, en qué edición está, el material de cada semana a
medida que se libera, cuándo se libera el próximo, y su propia asistencia — y, cuando termina, que
quedó habilitada para servir en un Ministerio.

**Why this priority**: Es donde la Persona consume lo que el Líder cargó; sin esto el contenido no
llega a nadie.

**Independent Test**: Una Persona inscripta abre Vida de Servicio en Mi camino y ve las semanas
liberadas con su contenido, la próxima con su fecha, y su asistencia ("Viniste 5 de 6 encuentros").

**Acceptance Scenarios**:

1. **Given** una Persona con Inscripción `activa`, **When** abre Vida de Servicio en Mi camino,
   **Then** ve el nombre de su edición, las semanas en orden con su estado (liberada, próxima con su
   fecha, sin material todavía) y puede abrir el contenido de las liberadas (FR-025).
2. **Given** una Persona inscripta, **When** mira su asistencia, **Then** ve cuántos encuentros hubo,
   a cuántos vino y en qué fechas faltó — solo los suyos (FR-031).
3. **Given** un Grupo finalizado, **When** una Persona con Inscripción `completada` vuelve a Vida de
   Servicio, **Then** sigue viendo todo el material liberado (D10) y un mensaje de que terminó, con el
   paso siguiente: ya puede postularse a un Ministerio (FR-036).
4. **Given** una Persona dada de baja o que abandonó, **When** vuelve a la card, **Then** ve que su
   inscripción terminó, sin culpas ("Tu inscripción a esta edición terminó"), puede seguir viendo el
   material que se había liberado hasta ese día, no ve el que se libere después, y puede volver a
   pedir inscripción en otra edición (FR-034).
5. **Given** una Persona sin acceso a la app (D97), **When** su Vida de Servicio avanza, **Then** la
   siguen el Admin y el Líder; si después entra a la app, ve su estado como cualquiera.

---

### User Story 6 - Tomar asistencia (Priority: P2)

Un Líder de curso quiere tomar asistencia desde el celular en la puerta —reemplazando la planilla de
papel— y ver de un vistazo quién acumula faltas.

**Why this priority**: Es el insumo de la regla de faltas y de las bajas, pero el curso puede empezar
sin ella.

**Independent Test**: Un Líder abre la asistencia de hoy, marca dos ausentes y guarda; las dos
Personas suman una falta, y una que ya tenía otra aparece destacada con "2 faltas" (texto + ícono).

**Acceptance Scenarios**:

1. **Given** un Líder vigente (o el Admin), **When** abre "Tomar asistencia" de su Grupo, **Then** el
   sistema usa el Encuentro de esa fecha (hoy por defecto, o la que elija, nunca futura) o lo crea, y
   lista a cada Inscripción `activa` del Grupo marcada como presente; marcar una ausencia es un solo
   toque por Persona (FR-027, D41, D45).
2. **Given** la asistencia de una fecha ya tomada, **When** otro Líder la abre, **Then** ve lo que se
   cargó y puede corregirlo mientras el Grupo esté en curso; no se crea un segundo Encuentro para la
   misma fecha (FR-028).
3. **Given** inscriptos con faltas acumuladas, **When** el Líder o el Admin miran el listado de
   inscriptos, **Then** quienes llegaron a **2 faltas o más** aparecen destacados con ícono y texto
   ("3 faltas"), nunca solo con color, y el sistema **no** da de baja a nadie solo (FR-029, D42, D81).
4. **Given** un Encuentro de asistencia, **When** coincide en fecha con una liberación de contenido,
   **Then** son dos registros independientes: tomar asistencia no libera nada y liberar no toma
   asistencia (FR-030).

---

### User Story 7 - Dar de baja o registrar un abandono (Priority: P2)

Un Líder quiere poder sacar del Grupo a quien dejó de venir (por decisión del equipo) o a quien avisó
que no sigue, y el Admin quiere tener la última palabra — con el mismo doble check que ya tiene Vida
Nueva.

**Why this priority**: Sin esto, quien dejó de venir queda "en curso" y recibiría Apto para
Ministerio al finalizar el Grupo.

**Independent Test**: Un Líder propone "dada de baja" para una Persona con 3 faltas, el Admin
confirma, la Inscripción queda `dada_de_baja`, la Persona deja de recibir el material nuevo y al
finalizar el Grupo no recibe Apto para Ministerio.

**Acceptance Scenarios**:

1. **Given** una Inscripción `activa`, **When** un Líder vigente propone su baja eligiendo el motivo
   —"Dada de baja" (decisión del equipo, por ejemplo por faltas) o "Abandonó" (la Persona avisó que no
   sigue)— con un comentario corto opcional, **Then** queda una baja propuesta; mientras tanto la
   Persona sigue en el Grupo con normalidad (FR-032).
2. **Given** una baja propuesta, **When** el Admin la confirma, **Then** la Inscripción pasa a
   `dada_de_baja` o `abandono` según el motivo propuesto (el Admin puede corregir el motivo al
   confirmar) y el registro no se borra (FR-033, D43).
3. **Given** una baja propuesta, **When** el Admin la rechaza (motivo opcional), **Then** la
   Inscripción sigue `activa` y los Líderes ven el rechazo y el motivo (FR-033).
4. **Given** una Inscripción `activa`, **When** el Admin da de baja o registra el abandono desde el
   backoffice (por ejemplo, la Persona avisó por WhatsApp), **Then** se aplica directamente, sin
   propuesta previa (FR-033).
5. **Given** una baja confirmada, **When** se libera una semana nueva, **Then** esa Persona no la ve;
   lo liberado antes de la baja lo sigue viendo (FR-034).
6. **Given** una baja propuesta, **When** el Admin entra al backoffice, **Then** la ve entre sus
   pendientes (FR-039).

---

### User Story 8 - Finalizar la edición y habilitar para Ministerio (Priority: P2)

Al terminar el cronograma, un Líder quiere proponer que se cierre la edición, y el Admin confirmarla,
para que quienes la terminaron queden habilitados para servir en un Ministerio sin que nadie tenga que
revisar caso por caso.

**Why this priority**: Cierra el ciclo y es lo que habilita la etapa siguiente (Ministerios); puede
esperar a que el Grupo llegue a su última semana.

**Independent Test**: En un Grupo con tres inscriptos (uno `activa`, uno `dada_de_baja`, uno
`abandono`), un Líder propone finalizar, el Admin confirma, y solo el `activa` pasa a `completada` y
recibe Apto para Ministerio.

**Acceptance Scenarios**:

1. **Given** un Grupo en curso cuya última semana ya llegó a su fecha de liberación, **When** un Líder
   vigente propone finalizarlo, **Then** queda la finalización propuesta; antes de esa fecha el botón
   no aparece y la API lo rechaza diciendo desde cuándo se puede (FR-035).
2. **Given** una finalización propuesta, **When** el Admin la confirma, **Then**, en una sola
   operación, el Grupo queda finalizado con motivo completado, **todas** las Inscripciones `activa`
   pasan a `completada`, y cada una de esas Personas recibe Apto para Ministerio; las
   `dada_de_baja` y `abandono` no cambian ni lo reciben (FR-036, D39, D40, D43).
3. **Given** una finalización propuesta con bajas propuestas todavía sin resolver en el Grupo, **When**
   el Admin intenta confirmarla, **Then** el sistema le pide resolverlas primero y las nombra (FR-036).
4. **Given** una finalización propuesta, **When** el Admin la rechaza (motivo opcional), **Then** el
   Grupo sigue en curso, los Líderes ven el rechazo y el motivo, y pueden volver a proponerla (FR-035).
5. **Given** una Persona que ya tenía Apto para Ministerio (por ejemplo, por otra edición), **When** se
   completa su Inscripción, **Then** no se duplica ni se pierde ningún otro rol que ya tenía (H-139).
6. **Given** un Grupo finalizado, **When** cualquiera intenta tomar asistencia, cargar o editar
   material, proponer bajas o cambiar el cronograma, **Then** el sistema no lo permite; el material
   sigue visible para quienes tienen derecho (FR-037, D10).

---

### User Story 9 - Ver y acompañar Vida de Servicio desde el backoffice (Priority: P3)

El Admin (y el Pastor, en lectura) quieren ver cada edición: inscriptos con su estado y sus faltas,
el cronograma con qué semanas tienen material, los Líderes, y lo pendiente de resolver.

**Why this priority**: Es seguimiento; el ciclo funciona sin esta vista completa porque cada acción
del Admin ya tiene su pantalla.

**Independent Test**: El Pastor abre un Grupo de Vida de Servicio y ve inscriptos, faltas, cronograma
y Líderes, sin ningún botón de gestión.

**Acceptance Scenarios**:

1. **Given** el listado de Grupos del backoffice, **When** el Admin filtra por curso, **Then** puede ver
   solo los de Vida de Servicio o solo los de Vida Nueva (FR-038).
2. **Given** el detalle de un Grupo de Vida de Servicio, **When** el Admin o el Pastor lo abren,
   **Then** ven Líderes vigentes (y el historial), cronograma con estado por semana, inscriptos con
   estado y faltas destacadas, y la finalización o bajas propuestas; el Pastor sin acciones (D64,
   D142).
3. **Given** el Inicio del backoffice, **When** hay finalizaciones o bajas de Vida de Servicio
   propuestas, **Then** aparecen en la tarjeta de pendientes junto a las de Vida Nueva (FR-039).
4. **Given** el Admin que intenta quitarle el rol `lider_curso` a alguien que es Líder vigente de un
   Grupo en curso, **When** confirma, **Then** el sistema lo bloquea nombrando los Grupos, y cada uno
   enlaza a su detalle para sacarlo de ahí primero (FR-040).

---

### Edge Cases

- **Prerrequisito cumplido por Vida Nueva grupal**: cuenta igual que la individual (D74); la regla es
  por categoría, no por Curso.
- **Vida Nueva en curso y "Ya lo hice" pendiente de confirmar**: no cumple hasta que el Admin confirma
  la declaración (D144); la card lo dice ("Estamos revisando lo que nos contaste").
- **La Persona elige una edición que el Admin cierra antes de aprobar**: el pedido sigue; al aprobar,
  el Admin elige otra edición en curso (FR-016). Una edición con inscripción cerrada sigue aceptando
  inscripciones aprobadas por el Admin: "cerrada" solo la saca de la elección de la Persona.
- **Se inscribe con la edición ya empezada**: ve todo lo liberado hasta ese día, y la asistencia
  cuenta desde su inscripción (los Encuentros anteriores no le suman faltas).
- **Dos Líderes toman asistencia de la misma fecha a la vez**: un único Encuentro por Grupo y fecha;
  el segundo guardado corrige el primero, sin duplicar (FR-028).
- **El Admin mueve la fecha de una semana con material ya cargado**: se libera en la nueva fecha; si la
  mueve a hoy o al pasado, queda liberada en ese momento.
- **Al Líder lo sacan del Grupo**: deja de verlo, pero lo que cargó queda; el historial de Liderazgo
  dice hasta cuándo estuvo.
- **Una Persona menor de edad**: puede hacer Vida de Servicio si cumple el prerrequisito; aplica la
  misma regla de edad para pedir sola que en Vida Nueva (12 años, FR-044 de la 004): menor de 12, el
  pedido lo carga el Admin en su nombre.
- **Volver a la misma edición después de una baja**: no se puede (una Persona, una Inscripción por
  Grupo); al aprobar, el Admin elige otra edición. El sistema lo dice con un error claro (FR-016).
- **Persona con dos Inscripciones**: una Persona dada de baja en una edición y anotada en otra tiene
  dos Inscripciones; Mi camino muestra la vigente (`activa` o, si no hay, la última) y el historial.
- **Grupo que queda sin Inscripciones activas** porque todas se dieron de baja: no se cierra solo (a
  diferencia de Vida Nueva): una edición puede seguir abierta para nuevas inscripciones; el Admin la
  finaliza o la deja.
- **Completitud Manual de Vida de Servicio** (D144, "Ya lo hice" en la card de Vida de Servicio):
  al confirmarse, la Persona queda como si la hubiera completado y recibe Apto para Ministerio
  (FR-042; ver Preguntas para Echu).

## Fuera de alcance

- **El envío de notificaciones** (Avisos, email, push): es de la spec 012. Esta deja definidos los
  eventos con destinatario y datos (FR-041). Mientras no exista el envío, cada uno se entera al entrar.
- **La tarea programada que detecta "llegó la fecha"** para avisar `contenido_liberado`: la visibilidad
  no depende de ninguna tarea (se calcula al mirar), y el aviso de la liberación por fecha lo dispara
  el proceso programado de la spec 012 con la consulta que esta spec deja (FR-041).
- **Completitud Manual y "Ya lo hice"** (modelo, pantalla del Admin, declaración de la Persona): spec
  006. Esta solo la lee para el prerrequisito y suma el efecto de FR-042.
- **La card de Mi camino y su forma**: la crea la 006; esta la habilita y le da contenido.
- **Postulación a Ministerios**: otra spec; esta solo deja Apto para Ministerio otorgado.
- **CRUD del Curso "Vida de Servicio"** (Flujo 9, catálogos): el Curso existe como dato de referencia,
  igual que Vida Nueva en la 004.
- **Subida de video**: los videos van como enlace (YouTube u otro), no se alojan.
- **Reportes de abandono vs. baja**: el dato queda (D43); el reporte es Fase 2 (dashboard).

## Requirements *(mandatory)*

### Functional Requirements

**Edición (Grupo), Cronograma y Líderes — backoffice, Admin**

- **FR-001**: El sistema DEBE tener el Curso "Vida de Servicio" como dato de referencia, de tipo
  grupal, con modalidad `liberacion_programada`, categoría `vida_de_servicio` y
  `prerequisito_categoria = vida_nueva` (`docs/04`).
- **FR-002**: El Admin DEBE poder crear un Grupo de Vida de Servicio con nombre (obligatorio, hasta 80
  caracteres), Sede activa, fecha de inicio y cantidad de semanas (1 a 52). El sistema DEBE proponer un
  Cronograma de una semana por cada una, numeradas desde 1, con fecha de liberación = fecha de inicio +
  7 × (n − 1), que el Admin puede corregir antes de guardar. Las fechas DEBEN ser estrictamente
  crecientes y sin repetir.
- **FR-003**: Al crear el Grupo, el Admin DEBE asignarle al menos un Líder de curso, elegido entre las
  Personas activas con el rol de cargo `lider_curso` (D131; la exclusión de menores la garantiza el
  otorgamiento del rol, D133). Cada asignación es un Liderazgo con vigencia.
- **FR-004**: Mientras el Grupo esté en curso, el Admin DEBE poder cambiar la fecha de una semana no
  liberada, agregar semanas al final y quitar la última si no está liberada y no tiene material
  cargado. Una semana liberada (fecha alcanzada y material cargado) NO DEBE poder moverse ni quitarse.
- **FR-005**: El Admin DEBE poder sumar y sacar Líderes de un Grupo en curso. Sacar cierra el Liderazgo
  (no lo borra) y el Líder deja de ver el Grupo. NO DEBE poder sacarse al último Líder vigente.
- **FR-006**: Cada Grupo tiene la inscripción **abierta** al crearse; el Admin DEBE poder cerrarla y
  reabrirla. Abierta significa que la Persona puede elegirlo al pedir (FR-010); no limita lo que el
  Admin aprueba.
- **FR-007**: Solo el Admin gestiona Grupos, Cronogramas, Líderes y resoluciones; el Pastor ve todo en
  lectura (D64, D142). Los permisos se declaran en el catálogo compartido (D132).

**Solicitud de inscripción — Persona (web app) y Admin**

- **FR-008**: Una Persona cumple el prerrequisito si tiene una Inscripción `completada` en algún Curso
  de categoría `vida_nueva` **o** una Completitud Manual confirmada de esa categoría (`docs/04`, D74).
  La regla DEBE vivir en un solo lugar compartido, como función pura con test, y la API DEBE rechazar
  con un código propio cualquier Solicitud de quien no la cumple.
- **FR-009**: Si no cumple, la card de Vida de Servicio de Mi camino DEBE explicar qué le falta según
  su caso (sin Vida Nueva; Vida Nueva en curso; "Ya lo hice" en revisión), con el enlace a la etapa de
  Vida Nueva y la mención de "Ya lo hice" (D144), sin botón para pedir.
- **FR-010**: Si cumple, la Persona DEBE poder crear una Solicitud de inscripción `pendiente` eligiendo
  una de las ediciones en curso con inscripción abierta (preelegida si hay una sola).
- **FR-011**: Si cumple y no hay ninguna edición abierta, la Persona DEBE poder dejar la Solicitud sin
  edición ("para la próxima edición"); el Admin elige la edición al aprobar.
- **FR-012**: El sistema NO DEBE permitir una segunda Solicitud de inscripción `pendiente` de la misma
  Persona (D60), ni una Solicitud de quien tiene una Inscripción `activa` o `completada` en Vida de
  Servicio. Una Inscripción `dada_de_baja` o `abandono` no lo impide. La Persona DEBE poder retirar su
  Solicitud pendiente.
- **FR-013**: El Admin DEBE poder crear la Solicitud en nombre de una Persona (Flujo 12, D97), desde su
  perfil del backoffice, con el mismo prerrequisito y dejando registrado quién la creó. Este permiso es
  solo del Admin (no del Discipulador, D143).

**Resolución — bandeja de Solicitudes del backoffice**

- **FR-014**: La bandeja de Solicitudes DEBE listar las Solicitudes de inscripción a Vida de Servicio
  junto a las de Discipulado, con la forma base común (`docs/04`) y su tipo en texto, y DEBE mostrar el
  filtro por tipo ahora que hay dos tipos conectados.
- **FR-015**: El detalle de una Solicitud de inscripción DEBE mostrar cómo cumple la Persona el
  prerrequisito (qué Inscripción o qué Completitud Manual) y la edición pedida.
- **FR-016**: Aprobar DEBE exigir un Grupo de Vida de Servicio en curso (preelegido el pedido si sigue
  en curso), revalidar el prerrequisito y la ausencia de otra Inscripción activa, rechazar un Grupo donde la
  Persona ya tuvo una Inscripción (por ejemplo, se dio de baja), crear la Inscripción
  `activa` y pasar la Solicitud a aprobada, todo en una transacción.
- **FR-017**: Rechazar DEBE dejar la Solicitud rechazada (motivo opcional que solo ve el Admin) sin
  crear Inscripción; la Persona ve un mensaje amable y puede volver a pedir.
- **FR-018**: Resolver una Solicitud que ya no está pendiente DEBE fallar con un error claro, sin
  efectos (control de concurrencia como en la 004).

**Contenido semanal — web app, Líder de curso**

- **FR-019**: Un Líder de curso DEBE ver en la web app ("Mis grupos") solo los Grupos donde tiene un
  Liderazgo vigente, y solo sobre ellos puede cargar material, tomar asistencia y proponer bajas o la
  finalización; la autorización se valida en la API por registro (Principio V). La pantalla `mi-*` se
  recorta por identidad (D134).
- **FR-020**: El material de una semana tiene título (obligatorio, hasta 120), texto opcional (hasta
  10.000 caracteres, con saltos de línea y enlaces), archivos opcionales y enlaces opcionales (con
  texto visible); DEBE tener título y al menos un texto, archivo o enlace para guardarse. Cualquier
  Líder vigente puede cargar o editar cualquier semana (D27). Queda registrado quién cargó y quién
  editó por última vez.
- **FR-021**: Una semana está **liberada** si y solo si su fecha de liberación es hoy o anterior (fecha
  civil de Argentina) **y** tiene material cargado (D27). La liberación se calcula al consultar; no
  depende de que corra ninguna tarea. Sin material, no se libera nada.
- **FR-022**: El material de una semana liberada DEBE poder editarse mientras el Grupo esté en curso;
  editar no vuelve a disparar el evento de contenido liberado.
- **FR-023**: Los archivos admitidos son PDF e imágenes (JPEG, PNG, WebP), hasta 15 MB cada uno y hasta
  5 por semana; un archivo fuera de eso DEBE rechazarse con un mensaje que diga el límite. Una imagen
  DEBE llevar texto alternativo (D83).
- **FR-024**: Los archivos de Contenido son privados: se sirven solo por la API, validando en cada
  pedido que quien pide sea inscripto con derecho a esa semana (FR-034), Líder vigente, Admin o Pastor
  (Principio V). Nunca desde una carpeta pública.

**Mi camino — Persona**

- **FR-025**: La card de Vida de Servicio (creada por la 006) DEBE quedar habilitada y mostrar el
  estado de la Persona: no cumple (FR-009), puede pedir, pedido pendiente, pedido rechazado, en curso,
  dada de baja / abandonó, completada. En curso, DEBE mostrar la edición y las semanas en orden con su
  estado y permitir abrir el contenido de las liberadas.
- **FR-026**: Todo estado (de una semana, de una Solicitud, de una Inscripción, de las faltas) DEBE
  mostrarse con texto + ícono, nunca solo con color (D81), y cada estado de Solicitud dice qué pasa
  después (`docs/15`).

**Asistencia — web app (Líder) y backoffice (Admin)**

- **FR-027**: Un Líder vigente o el Admin DEBEN poder tomar asistencia de una fecha (hoy por defecto;
  nunca futura; no anterior a la fecha de inicio del Grupo): el sistema usa el Encuentro de ese Grupo y
  fecha o lo crea (sin capítulos ni notas: es de asistencia, D45), y registra presente/ausente para
  cada Inscripción `activa` a esa fecha, todos presentes por defecto, con un toque por ausencia.
- **FR-028**: Hay a lo sumo un Encuentro por Grupo de Vida de Servicio y fecha. Su asistencia DEBE
  poder corregirse mientras el Grupo esté en curso; no se borran Encuentros.
- **FR-029**: Las **faltas** de una Inscripción son sus Asistencias ausentes. El listado de inscriptos
  (web app y backoffice) DEBE destacar con ícono y texto a quien tenga `FALTAS_PARA_ALERTA` (2) o más
  — constante única compartida — y el sistema NO DEBE dar de baja a nadie automáticamente (D42).
- **FR-030**: La asistencia y la liberación de contenido son independientes (Flujo 4, paso 10).
- **FR-031**: La Persona DEBE ver su propia asistencia (encuentros, presentes, fechas de falta) y solo
  la suya.

**Bajas**

- **FR-032**: Un Líder vigente DEBE poder **proponer** la baja de una Inscripción `activa` con motivo
  `dada_de_baja` o `abandono` y un comentario opcional (hasta 500). Mientras está propuesta, la
  Persona sigue con normalidad. Hay a lo sumo una baja propuesta por Inscripción.
- **FR-033**: El Admin DEBE poder confirmar (pudiendo cambiar el motivo) o rechazar (motivo opcional)
  una baja propuesta, y también aplicar una baja o un abandono directamente sin propuesta. Al aplicarse,
  la Inscripción pasa al estado elegido con fecha de cierre; no se borra (Principio III, D43).
- **FR-034**: Una Persona con Inscripción `dada_de_baja` o `abandono` DEBE seguir viendo el material de
  las semanas liberadas hasta su fecha de cierre, y NO DEBE ver las que se liberen después ("pierde
  acceso al contenido restante", Flujo 4 paso 13).

**Finalización y Apto para Ministerio**

- **FR-035**: Un Líder vigente DEBE poder proponer la finalización de su Grupo recién cuando la fecha
  de liberación de la última semana llegó; el Admin la confirma o la rechaza (motivo opcional, visible
  para los Líderes, que pueden volver a proponer). NO DEBE poder confirmarse una finalización no
  propuesta (D39).
- **FR-036**: Al confirmar, en una sola transacción, el sistema DEBE: cerrar el Grupo como finalizado
  con motivo completado; pasar **todas** las Inscripciones `activa` a `completada`; y otorgar a cada
  una de esas Personas el rol de estado **Apto para Ministerio**, por el único lugar del sistema que
  escribe roles de estado, agregándolo sin quitar ningún otro (H-139, D40). Las Inscripciones
  `dada_de_baja` o `abandono` no cambian ni lo reciben. Si hay bajas propuestas sin resolver, DEBE
  rechazarse la confirmación nombrándolas.
- **FR-037**: En un Grupo finalizado NO DEBE poder tomarse asistencia, cargar o editar material,
  proponer bajas, cambiar el cronograma ni los Líderes; el material sigue visible para quienes tienen
  derecho (D10).

**Backoffice — seguimiento**

- **FR-038**: El listado de Grupos del backoffice DEBE poder filtrarse por curso (Vida Nueva / Vida de
  Servicio), y el detalle de un Grupo de Vida de Servicio DEBE mostrar Líderes (vigentes e historial),
  cronograma con estado por semana, inscriptos con estado y faltas, la finalización y las bajas
  propuestas, y el contenido cargado en lectura. Sigue los patrones de listado de `docs/15` (paginado
  en la URL, `TablaDatos`, colapso en celular).
- **FR-039**: La tarjeta de pendientes del Inicio del backoffice DEBE sumar las finalizaciones y bajas
  de Vida de Servicio propuestas; las Solicitudes de inscripción pendientes se cuentan en la bandeja.
- **FR-040**: Quitarle el rol `lider_curso` a una Persona con algún Liderazgo vigente en un Grupo de
  Vida de Servicio en curso DEBE bloquearse, nombrando esos Grupos con enlace a su detalle (mismo
  patrón que `discipulador`, FR-043 de la 004). La consulta de "discipulados activos" (D137) DEBE
  contar solo Grupos de Vida Nueva, para que liderar Vida de Servicio no bloquee ni cuente como carga de
  un Discipulador.

**Eventos para notificaciones (spec 012)**

- **FR-041**: El sistema DEBE dejar definidos, con destinatario y solo ids como datos, los eventos que
  dispara cada transición, emitidos **después** de confirmar la transacción y sin datos personales en
  logs (Principio X): Solicitud creada → Admin; Solicitud aprobada → Persona (importante,
  `solicitud_actualizada`); Solicitud rechazada → Persona (importante, `solicitud_actualizada`);
  **contenido liberado** → los inscriptos `activa` del Grupo (normal, `contenido_liberado`, alcance
  Grupo, D49) — emitido al cargar material en una semana cuya fecha ya llegó, y, para las que se
  liberan por fecha, por el proceso programado de la 012 usando la consulta "semanas que se liberan
  hoy y todavía no se avisaron" que esta spec deja junto con la marca de "ya avisada" para que el aviso
  salga una sola vez; Líder asignado → el Líder; baja propuesta y finalización propuesta → Admin; baja
  rechazada y finalización rechazada → Líderes vigentes; baja aplicada → Persona (importante);
  finalización confirmada → cada Persona completada (importante: "Terminaste Vida de Servicio").

**Completitud Manual de Vida de Servicio**

- **FR-042**: Cuando se confirma una Completitud Manual de categoría `vida_de_servicio` (el "Ya lo
  hice" de la card de Vida de Servicio, D144, construido por la 006), el sistema DEBE otorgar Apto para
  Ministerio a esa Persona por el mismo lugar que FR-036, y la card DEBE mostrarla como completada.

**Transversales**

- **FR-043**: Las pantallas del Líder (Mis grupos, el detalle de un Grupo, cargar material, tomar
  asistencia, inscriptos) se diseñan para celular primero: letra de 16 px y botones de 44 px de alto
  (D150), acciones principales en la zona del pulgar, sin scroll horizontal a 320 px; sus e2e corren
  en viewport de celular y con `axe` en modo claro y oscuro.
- **FR-044**: Toda pantalla nueva o modificada cumple los cuatro estados (cargando con `loading.tsx`,
  vacío, error con `error.tsx`, éxito), botones con bloqueo y protección de reentrada (H-57), errores
  por campo con resumen (H-50), textos por `next-intl` en rioplatense (D84) y colores solo de tokens
  (D118). Las confirmaciones de acciones reversibles (retirar el pedido, proponer una baja) son neutras;
  el rojo queda para lo irreversible (D151) — en esta spec, confirmar una finalización y aplicar una
  baja.
- **FR-045**: `db:seed-demo` DEBE sumar al menos una edición en curso con cronograma a medio liberar,
  dos Líderes, inscriptos en los cuatro estados, alguien con 3 faltas, una baja propuesta, una edición
  finalizada con Personas Aptas para Ministerio, una Persona bloqueada por prerrequisito, y datos
  hostiles (título de semana al límite, texto largo con enlaces, archivo con nombre largo) (D120).

### Key Entities *(include if feature involves data)*

- **Curso "Vida de Servicio"**: plantilla grupal, modalidad `liberacion_programada`, categoría
  `vida_de_servicio`, prerrequisito `vida_nueva`.
- **Grupo (edición de Vida de Servicio)**: nombre, Sede, fecha de inicio, inscripción abierta o
  cerrada, estado (en curso / finalizado con motivo), Líderes (Liderazgos con vigencia), Cronograma,
  Inscripciones, Encuentros de asistencia, finalización propuesta / rechazada.
- **Semana del Cronograma**: número, fecha de liberación, y su Contenido (si se cargó). Liberada =
  fecha alcanzada + Contenido cargado.
- **Contenido de una semana**: título, texto, archivos (privados, con texto alternativo si son
  imágenes), enlaces; quién lo cargó y quién lo editó; marca de "liberación ya avisada".
- **Solicitud de inscripción a Vida de Servicio**: forma base de las Solicitudes (`docs/04`): Persona,
  estado (pendiente / aprobada / rechazada / retirada), edición pedida (opcional), quién la creó,
  quién la revisó y cuándo, motivo de rechazo (solo Admin).
- **Inscripción**: la misma de la 004, ahora también nacida de una Solicitud de inscripción a Vida de
  Servicio; con baja propuesta (motivo propuesto, comentario) y su resolución.
- **Encuentro de asistencia y Asistencia**: los de la 004 (D45), sin capítulos para Vida de Servicio,
  uno por Grupo y fecha.
- **Apto para Ministerio**: rol de estado de la Persona (D131), escrito por el sistema al completar o
  por Completitud Manual de Vida de Servicio.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una Persona que terminó Vida Nueva puede pedir su inscripción a Vida de Servicio desde
  el celular en menos de 1 minuto y sin ayuda; una que no la terminó entiende qué le falta sin
  preguntarle a nadie (verificable: la card dice el motivo en el 100% de los casos bloqueados).
- **SC-002**: Cero Inscripciones a Vida de Servicio de Personas que no cumplen el prerrequisito.
- **SC-003**: El 100% del material cargado se vuelve visible para los inscriptos el día de su fecha de
  liberación sin intervención de nadie, y ningún inscripto ve material antes de su fecha.
- **SC-004**: Un Líder toma la asistencia de un Grupo de 30 personas desde el celular en menos de 2
  minutos.
- **SC-005**: El 100% de las Personas que estaban `activa` al confirmarse la finalización quedan
  completadas y Aptas para Ministerio, y el 0% de las dadas de baja o que abandonaron lo reciben.
- **SC-006**: Cero casos en que una Persona sin derecho vea material o archivos de un Grupo, o en que
  un Líder vea Grupos que no lidera.
- **SC-007**: El Admin ya no anota inscripciones ni asistencia en papel o planilla: todo el ciclo de
  una edición (alta, inscripción, material, asistencia, bajas, cierre) se hace dentro del sistema.
- **SC-008**: El 100% de las transiciones deja emitido su evento para notificaciones, con destinatario.

## Assumptions

- **"En curso: Vida de Servicio" no se guarda como rol**: se deriva de tener una Inscripción `activa`
  (como Vida Nueva en la 004). Apto para Ministerio sí es un rol de estado guardado (`docs/03`, D131),
  que el sistema escribe; `docs/04` lo nombra como flag `apto_ministerio` — es el mismo dato.
- **D28 y los pasos 1–3 del Flujo 5** (Apto activado a mano por el Admin a partir de un pedido) quedan
  superados por D40 (activación automática al completar); el pedido manual pertenece, si sigue
  existiendo, a la spec de Ministerios. Se lista en "Cambios a docs al mergear" del plan.
- **Bajas con doble check**: `docs/03` dice que el Líder "propone dar de baja"; el Flujo 4 dice que
  "puede ejecutar". Se toma la propuesta + confirmación del Admin, igual que en Vida Nueva (004), y el
  Admin puede aplicarla directo (ver Preguntas para Echu).
- **Umbral de faltas**: 2 o más (Flujo 4, paso 11, y `docs/02`); D42 dice "más de 2". Constante única,
  fácil de cambiar (ver Preguntas para Echu).
- **Asistencia presente por defecto**: igual que la 004 (FR-013a): en un Grupo grande, marcar ausentes
  es más rápido que marcar presentes.
- **El Líder ve el teléfono** de los inscriptos `activa` de sus Grupos, para llamar a quien falta (ver
  Preguntas para Echu); no ve dirección ni otros datos.
- **Pedido "para la próxima edición"**: con una sola Sede y ediciones que no siempre están abiertas,
  permitir el pedido sin edición evita que la Persona tenga que acordarse de volver (ver Preguntas para
  Echu).
- **El Admin no destraba el prerrequisito desde la Solicitud**: si hace falta una excepción, usa
  Completitud Manual (D74), que es de la 006.
- **Una baja conserva el material ya liberado**: "contenido restante" se lee como lo que se libera
  después de la baja.
- **El Grupo de Vida de Servicio no se cierra solo** cuando se queda sin inscriptos activos.
- **Formato del texto**: texto plano con párrafos y enlaces detectados; sin editor enriquecido.
- **Hora de corte de la liberación**: el día de la fecha de liberación desde las 0:00 de Argentina
  (misma función de "hoy" de la 004, `hoyEnArgentina`).

## Preguntas para Echu

> **Respondidas por Echu el 2026-10-07: se adoptan las recomendaciones de cada pregunta** (numeradas en `docs/05-decisiones.md`, D153–D213).

1. **¿El Líder da de baja directo, o propone y el Admin confirma?** El Flujo 4 dice que el Líder "puede
   ejecutar"; `docs/03` dice que "propone". **Recomendación**: propone y el Admin confirma (como Vida
   Nueva), porque una baja le cierra a la Persona el paso a Ministerio; el Admin además puede aplicarla
   directo cuando le avisan por WhatsApp. Es lo que está especificado (FR-032, FR-033).
2. **¿Un "Ya lo hice" confirmado de Vida de Servicio habilita para Ministerio?** D40 solo habla de
   completar una Inscripción. **Recomendación**: sí — quien hizo Vida de Servicio antes de la app no
   debería quedar trabado para servir. Está especificado así (FR-042).
3. **¿El Líder de curso ve el teléfono de sus inscriptos?** `docs/03` solo dice "ve inscriptos".
   **Recomendación**: sí, solo el teléfono y solo de inscriptos activos de sus Grupos, para llamar a
   quien está faltando; nunca la dirección.
4. **¿Se puede pedir Vida de Servicio cuando no hay ninguna edición abierta?** **Recomendación**: sí,
   "para la próxima edición"; el Admin la asigna al aprobar (FR-011). La alternativa es mostrar "no hay
   edición abierta, volvé más adelante".
5. **¿Desde cuántas faltas se destaca a alguien: 2 o más, o más de 2?** `docs/02` y el Flujo 4 dicen
   "2 o más"; D42 dice "más de 2". **Recomendación**: 2 o más, para avisar a tiempo; es solo una
   alerta, nunca una baja automática.
