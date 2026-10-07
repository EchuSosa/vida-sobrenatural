# Feature Specification: Mi camino por etapas, historial previo, el Discipulador en la web app y alta de adultos por el Admin

**Feature Branch**: `006-mi-camino-etapas`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Sale de la revisión manual de la 004 (29/9) y de las decisiones D142–D145 y D150–D151 del 7/10. (1) Mi camino por etapas en `apps/web`: una card por etapa (Vida Nueva, Vida de Servicio, Ministerio, Bautismo) con título, subtítulo que explica y estado; cada card con su regla (Vida Nueva siempre; Bautismo con Vida Nueva en curso o completada, D147; Vida de Servicio con Vida Nueva completada, D74; Ministerio según `docs`); las etapas sin spec construida se muestran con su explicación y deshabilitadas ('Próximamente'); la card de Vida Nueva lleva al pedido o a su estado. (2) Historial previo (D144): 'Ya lo hice' en cada card → declaración pendiente → el Admin confirma o rechaza en el backoffice → Completitud Manual, modelada para que Vida de Servicio, Ministerio y Bautismo la consulten. (3) El Discipulador en la web app (D142): mudar Mis discipulados, Mi disponibilidad y sus pendientes de `apps/backoffice` a `apps/web`, sin cambiar la API; respetar el límite de 5 pestañas de `docs/14`; el backoffice queda para el Admin y el Pastor en lectura. (4) Permisos del Discipulador (D143): pide Vida Nueva en nombre de alguien sin app desde la web; dar de alta Personas es solo del Admin. (5) Alta de adultos por el Admin (D145, Flujo 12): formulario en el backoffice con los datos del registro, email opcional (`Persona.email` pasa a opcional), aviso de posible duplicado (mismo teléfono, o mismo nombre + apellido + fecha de nacimiento). Fuera de alcance: ingreso con código por email (spec 007), notificaciones (spec 012)."

**Fuentes**: `docs/04-dominio-entidades.md` (Persona, Completitud Manual, patrón de Solicitudes), `docs/07-flujos-casos-de-uso.md` (Flujos 3, 4, 5, 6, 9 y 12), `docs/03-roles-permisos.md`, `docs/14-navegacion.md`, `docs/15-guia-ux-ui.md`, `docs/12-contenido-bienvenida.md` y los textos de Primeros pasos de `apps/web` (`primerosPasos.paso*` en `messages/es.json`), y las decisiones D25, D39–D40, D74, D78, D92, D97, D131–D134, D139, D142–D147, D150 y D151. El informe de UX `specs/revision-manual/2026-09-30-ux-web.md` **no existe en `main`** al escribir este spec, así que no hay sección "Para la 006" que incorporar (ver Assumptions).

## Clarifications

Esta corrida es sin la dueña presente: no hubo sesión de preguntas. Lo que `docs/` no decide quedó resuelto como Assumption (al final), y las cinco decisiones de producto con más peso están en **Preguntas para Echu**, cada una con la recomendación que este spec ya aplica.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver mi camino como etapas, cada una con su explicación y su estado (Priority: P1)

Una Persona con sesión entra a **Mi camino** y ve una card por etapa del proceso — Vida Nueva, Vida de Servicio, Ministerio y Bautismo —, cada una con su nombre, una frase que explica de qué se trata (la misma de Primeros pasos, no un texto nuevo) y su estado en palabras y con ícono: si la puede empezar, si la está haciendo, si ya la hizo, si todavía no se le habilita (y qué le falta), o si es una etapa que la app todavía no ofrece ("Próximamente"). La card de Vida Nueva lleva a lo que ya existe desde la 004: el pedido con sus horarios, o el estado de su pedido o de su discipulado.

**Why this priority**: hoy Mi camino muestra solo Vida Nueva y un estado vacío genérico ("próximos pasos"). Quien recién llega no ve el camino completo ni sabe qué viene después — justo lo que el Problem Statement quiere resolver. Es la pantalla sobre la que se apoyan el historial previo (Historia 2) y las specs de Vida de Servicio, Ministerio y Bautismo.

**Independent Test**: con las Personas del seed (una sin pedido, una con pedido en búsqueda, una con discipulado en curso, una con Vida Nueva finalizada) se entra a Mi camino y se verifica, por cada una, el estado de las cuatro cards y que la de Vida Nueva lleve a la pantalla correcta.

**Acceptance Scenarios**:

1. **Given** una Persona sin ningún pedido ni historial, **When** entra a Mi camino, **Then** ve cuatro cards en el orden Vida Nueva, Vida de Servicio, Ministerio, Bautismo; la de Vida Nueva dice que la puede empezar y ofrece "Quiero empezar Vida Nueva"; las otras tres muestran su explicación, un indicador "Próximamente" con texto e ícono, y ninguna acción de pedido.
2. **Given** una Persona con un pedido de Vida Nueva en búsqueda de Discipulador, **When** entra a Mi camino, **Then** la card de Vida Nueva dice "Estamos buscando quién te acompañe" (o el texto equivalente de la 004) y al tocarla abre el estado del pedido, con editar horarios y retirar (FR-039 de la 004).
3. **Given** una Persona con discipulado en curso, **When** toca la card de Vida Nueva, **Then** ve quién es su Discipulador y su teléfono (FR-027 de la 004).
4. **Given** una Persona con Vida Nueva completada (por Grupo finalizado o por Completitud Manual), **When** entra a Mi camino, **Then** la card de Vida Nueva dice que la completó — y si fue por historial, "Registrado por la iglesia" — y no ofrece pedirla de nuevo.
5. **Given** una Persona menor de 12 años, **When** entra a Mi camino, **Then** la card de Vida Nueva le explica que ese pedido lo hace su mamá, papá o tutor con la iglesia (FR-044 de la 004), sin botón de pedido ni "Ya lo hice".
6. **Given** cualquier Persona, **When** mira la card de una etapa deshabilitada, **Then** el estado se entiende sin depender del color (texto + ícono, D81) y la card no parece tocable (no hay enlace ni foco de acción).

---

### User Story 2 - Contar que ya hice una etapa antes de la app, y que la iglesia lo confirme (Priority: P1)

Una Persona que hizo Vida Nueva en otra congregación, o que se bautizó hace años, toca **"Ya lo hice"** en la card de esa etapa, opcionalmente agrega un comentario corto ("lo hice en 2019 en otra iglesia"), y envía. La card pasa a "Nos contaste que ya lo hiciste — la iglesia lo está revisando". El Admin ve la declaración en la bandeja de Solicitudes del backoffice, la confirma o la rechaza (con un motivo opcional). Si la confirma, queda registrada como **Completitud Manual** de esa etapa y la card pasa a "Completada · Registrado por la iglesia". Si la rechaza, la Persona ve un mensaje amable que le dice que se comunique con la iglesia, y puede volver a declararla.

El Admin también puede registrar una Completitud Manual **directamente** desde Personas, sin que la Persona la declare (Flujo 9) — para quien no tiene acceso a la app, o para corregir un caso que conoce.

**Why this priority**: mucha gente llega con etapas hechas antes de que existiera la app (D144). Sin esto, Mi camino les ofrece empezar algo que ya hicieron, y la Completitud Manual — la vía que docs prevé para destrabar prerrequisitos (D74, Flujo 4) — no existe en el sistema. Las specs de Vida de Servicio, Ministerio y Bautismo la necesitan para evaluar sus reglas.

**Independent Test**: una Persona declara Vida Nueva desde Mi camino; el Admin la confirma desde la bandeja; Mi camino muestra "Completada · Registrado por la iglesia", ya no ofrece pedir Vida Nueva, y la consulta de etapa completada (FR-016) responde que sí para Vida Nueva. Se repite con un rechazo y con un registro directo del Admin.

**Acceptance Scenarios**:

1. **Given** una Persona sin actividad en Vida Nueva, **When** toca "Ya lo hice" en esa card y confirma, **Then** se crea una declaración pendiente, la card muestra "la iglesia lo está revisando" con la opción de retirar la declaración, y ya no ofrece "Quiero empezar Vida Nueva" mientras siga pendiente.
2. **Given** una declaración pendiente, **When** el Admin la abre en la bandeja de Solicitudes y la confirma, **Then** la declaración queda confirmada, se registra una Completitud Manual de esa etapa con quién la confirmó y cuándo, y la Persona ve la etapa como completada "Registrado por la iglesia".
3. **Given** una declaración pendiente, **When** el Admin la rechaza con o sin motivo, **Then** la Persona ve en la card un mensaje amable ("No pudimos confirmarlo. Escribinos y lo vemos juntos", con el motivo si lo hay y el enlace al WhatsApp de Secretaría) y puede volver a tocar "Ya lo hice".
4. **Given** una Persona con una declaración pendiente de Bautismo, **When** intenta declararla otra vez, **Then** no puede: la card no ofrece la acción y la API lo rechaza con un código propio.
5. **Given** una Persona con un pedido de Vida Nueva abierto o un discipulado en curso, **When** mira la card de Vida Nueva, **Then** no ve "Ya lo hice" (la etapa ya está en marcha dentro del sistema) y la API rechaza la declaración si llega igual.
6. **Given** una declaración pendiente de Vida Nueva, **When** la Persona (o el Admin o un Discipulador en su nombre) intenta crear un pedido de Vida Nueva, **Then** el sistema lo rechaza explicando que hay una declaración en revisión.
7. **Given** el Admin en la fila de una Persona en Personas, **When** elige "Registrar una etapa hecha", elige la etapa y guarda, **Then** se registra la Completitud Manual con su autor, sin declaración previa; si había una declaración pendiente de esa misma etapa, queda confirmada en el mismo paso.
8. **Given** una Completitud Manual registrada por error, **When** el Admin la anula, **Then** deja de contar para Mi camino y para los prerrequisitos, y el registro se conserva como anulado (Principio III).
9. **Given** el Pastor en la bandeja, **When** abre una declaración, **Then** la ve, sin acciones de confirmar ni rechazar.

---

### User Story 3 - El Discipulador acompaña a sus discípulos desde la web app (Priority: P1)

Un Discipulador abre la web app en el celular, toca **Mi camino** y, arriba, el selector **"Mi camino · Mis discipulados"**. En Mis discipulados ve primero sus **pendientes** — propuestas para responder y avisos de finalizaciones o bajas que el Admin rechazó — y después sus discipulados. Desde ahí responde propuestas, registra y edita Encuentros con su Asistencia, propone finalizar un discipulado o la baja de una Persona, y entra a **Mi disponibilidad** (agenda, toggle, máximo de Personas por Grupo y períodos de no disponibilidad). Todo lo que hacía en el backoffice, con el mismo comportamiento y la misma API. En el Inicio de la app, si tiene pendientes, ve un aviso con la cantidad que lo lleva a Mis discipulados. El backoffice, para él, ya no tiene nada: si entra, una pantalla le dice que lo suyo está en la app y lo lleva.

**Why this priority**: D142 — el backoffice es la herramienta de gestión de la iglesia; lo del Discipulador es poco, se usa desde el celular y la web app ya está ahí. Mientras viva en el backoffice, el Discipulador tiene que manejar dos apps con dos sesiones y un menú lateral pensado para escritorio.

**Independent Test**: la Discipuladora del seed recorre en `apps/web`, en viewport de celular, el ciclo completo de la 004 (aceptar una propuesta, registrar un Encuentro con una ausencia, proponer finalizar, cargar una franja y un período) sin tocar el backoffice; en el backoffice, la misma sesión aterriza en la pantalla "Lo tuyo está en la app".

**Acceptance Scenarios**:

1. **Given** una Persona con rol `discipulador`, **When** entra a Mi camino en la web app, **Then** ve el selector "Mi camino · Mis discipulados", y la pestaña Mi camino de la barra inferior sigue marcada como actual en las dos vistas y en Mi disponibilidad.
2. **Given** una Persona sin rol `discipulador`, **When** entra a Mi camino, **Then** no ve el selector; **When** abre `/mis-discipulados` por URL, **Then** la app la lleva a Mi camino sin mostrar datos de nadie (y la API ya le rechaza los datos).
3. **Given** un Discipulador con una propuesta pendiente, **When** abre Mis discipulados en la web app, **Then** la ve arriba de todo, con nombre y edad de la Persona, franjas en común y reglas que cumple, sin contacto, y puede aceptarla o declinarla con motivo (FR-037 de la 004).
4. **Given** un Discipulador con un discipulado en curso, **When** registra un Encuentro desde la web app, **Then** se comporta como en la 004: asistencia presente por defecto, ausencia de un toque, notas solo para él, edición mientras el Grupo esté en curso (FR-009, FR-013a, FR-041 de la 004).
5. **Given** un Discipulador sin franjas o con la disponibilidad apagada, **When** abre Mis discipulados o Mi disponibilidad, **Then** ve el estado vacío que le dice qué le falta para aparecer (FR-047 de la 004).
6. **Given** un Discipulador con al menos un pendiente, **When** abre el Inicio de la web app, **Then** ve un aviso "Tenés N cosas para revisar en tus discipulados" que lo lleva a Mis discipulados; sin pendientes, el aviso no aparece.
7. **Given** una Persona cuyo único rol de cargo es `discipulador`, **When** entra al backoffice, **Then** aterriza en una pantalla que le explica que sus discipulados y su disponibilidad están en la app, con un botón "Ir a la app"; el menú lateral no le ofrece nada, y `/mis-discipulados` y `/mi-disponibilidad` del backoffice la redirigen a sus equivalentes de la web app.
8. **Given** el Admin o el Pastor, **When** entran al backoffice, **Then** ven el mismo menú que antes, sin "Mis discipulados" ni "Mi disponibilidad" (si además son Discipuladores, lo suyo está en la web app como para cualquiera).

---

### User Story 4 - El Discipulador pide Vida Nueva en nombre de alguien sin app, desde la web (Priority: P2)

Un Discipulador conoce a alguien que quiere empezar Vida Nueva y no usa la app. Desde Mis discipulados, en la web app, toca **"Pedir Vida Nueva en nombre de…"**, busca a la Persona por nombre o teléfono, carga los horarios que ella le dijo y envía. El pedido queda registrado con él como creador y entra a la bandeja del Admin como cualquier otro. Si la Persona no está en el sistema, la app le dice que el alta la hace el Admin y cómo pedírsela; el Discipulador no puede dar de alta Personas.

**Why this priority**: D143 — pedir en nombre de alguien es parte del acompañamiento diario; dar de alta es una decisión de la iglesia que se concentra en el Admin. Es la contracara de la Historia 3 para el caso de alguien sin app.

**Independent Test**: el Discipulador del seed busca a una Persona sin acceso a la app, carga dos franjas y envía; el Admin la ve en la bandeja con "pedido por" el Discipulador. Por la API, el mismo Discipulador recibe 403 al intentar el alta de una Persona.

**Acceptance Scenarios**:

1. **Given** un Discipulador en Mis discipulados de la web app, **When** pide Vida Nueva en nombre de una Persona con al menos una franja, **Then** se crea la Solicitud con él como creador (FR-002 de la 004) y la app confirma "Listo, el equipo lo revisa".
2. **Given** una Persona con un pedido abierto, Vida Nueva en curso o completada, o una declaración de historial pendiente de Vida Nueva, **When** el Discipulador intenta pedir en su nombre, **Then** el sistema lo rechaza con un mensaje que dice por qué, debajo del buscador.
3. **Given** que la búsqueda no encuentra a nadie, **When** el Discipulador mira el resultado, **Then** ve "No la encontramos. Si todavía no está cargada, pedile al equipo de la iglesia que la dé de alta" — sin botón de alta.
4. **Given** un Discipulador (sin rol `admin`), **When** llama al alta de Personas de la API, **Then** recibe 403.

---

### User Story 5 - El Admin da de alta a una Persona adulta, con o sin email (Priority: P2)

El Admin, desde Personas en el backoffice, toca **"Dar de alta una persona"** y completa los mismos datos del registro — apellido, nombre, género, fecha de nacimiento, teléfono, dirección, Sede, estado civil, profesión, tiempo congregándose — más el email, que es **opcional**, y la confirmación de que la Persona dio su consentimiento en persona o por WhatsApp (D78). Al guardar, si el sistema encuentra una Persona con el **mismo teléfono**, o con **mismo nombre, apellido y fecha de nacimiento**, le avisa y le muestra cuáles; el Admin puede ir a la existente o **crear igual** (es un aviso, no un bloqueo, D145). La Persona queda activa, como Miembro registrado, con el registro de quién la dio de alta. Si no tiene email, queda **sin acceso a la app** y así se la identifica en Personas.

**Why this priority**: es la única forma de que gente mayor o sin email esté en el sistema y su camino quede registrado (D97, D145). Depende de que `Persona.email` sea opcional, que toca login y búsquedas.

**Independent Test**: el Admin da de alta a una Persona sin email; aparece en Personas como "Sin acceso a la app" y se le puede pedir Vida Nueva en su nombre. Se intenta una segunda alta con el mismo teléfono: aparece el aviso con la existente; "Crear igual" la crea. Una alta con un email ya usado se rechaza en el campo.

**Acceptance Scenarios**:

1. **Given** el Admin en el formulario de alta, **When** completa todos los datos obligatorios sin email, marca el consentimiento y guarda, **Then** se crea la Persona `activa`, con origen de alta "admin", el Admin como autor del alta, consentimiento con origen presencial y el rol `miembro_registrado`; la app lo lleva a Personas con un mensaje de éxito que dice qué puede hacer ahora (pedir Vida Nueva en su nombre, registrar una etapa hecha).
2. **Given** el formulario enviado con datos inválidos o faltantes, **When** la API responde, **Then** cada error se muestra debajo de su campo, con un resumen arriba que enlaza a cada uno, foco en el resumen y el cómo corregirlo (H-50).
3. **Given** una Persona existente con el mismo teléfono, **When** el Admin guarda, **Then** el sistema no crea nada todavía y muestra "Puede que esta persona ya esté cargada" con la lista de coincidencias (nombre, apellido, fecha de nacimiento, teléfono y por qué coincide), un enlace a cada una y "Es otra persona, crear igual".
4. **Given** el aviso de duplicado, **When** el Admin toca "Es otra persona, crear igual", **Then** se crea la Persona sin volver a cargar los datos.
5. **Given** un email que ya usa otra Persona, **When** el Admin guarda, **Then** se rechaza con el error debajo del campo email (el email identifica el ingreso: ahí sí hay bloqueo).
6. **Given** una fecha de nacimiento de un menor de 18, **When** el Admin guarda, **Then** se rechaza, explicando que el alta de un menor va por Pendientes de tutor con la autorización del tutor (Flujo 7).
7. **Given** una Persona dada de alta sin email, **When** el Admin la mira en Personas, **Then** ve "Sin acceso a la app" con ícono y texto, y la acción "Agregar email".
8. **Given** el Admin agrega un email a una Persona que no tenía, **When** guarda, **Then** el email queda cargado (si no lo usa otra Persona) y la Persona deja de figurar "sin acceso a la app"; el ingreso con ese email lo resuelve el login existente (Google con email verificado) o la spec 007.
9. **Given** el Pastor en Personas, **When** mira la pantalla, **Then** no ve "Dar de alta una persona" ni "Agregar email", y la API se lo rechaza (403).

---

### Edge Cases

- **Una declaración de historial y un pedido a la vez.** No pueden coexistir para Vida Nueva: declarar exige que no haya pedido abierto ni Inscripción activa o completada; pedir (la Persona, o el Admin o el Discipulador en su nombre) exige que no haya declaración pendiente ni Completitud Manual vigente de Vida Nueva. Los dos chequeos viven en la API y se hacen dentro de la transacción, con la fila de la Persona bloqueada (patrón de D137), para que dos pedidos simultáneos no pasen los dos.
- **El Admin confirma una declaración cuando la etapa ya quedó completada por el sistema** (ej. un Grupo de Vida Nueva que se finalizó mientras la declaración esperaba — no debería pasar por el caso anterior, pero los datos viejos o una carga en nombre pueden traerlo): la confirmación se rechaza con un código propio y el Admin la rechaza o la deja; la card ya muestra la etapa completada por el sistema.
- **Completitud Manual de Vida Nueva con Vida Nueva en curso:** el Admin no puede registrarla (código propio): primero se finaliza o se da de baja el discipulado. Con Vida Nueva ya completada por un Grupo, tampoco: sería un dato duplicado.
- **Dos Completitudes Manuales de la misma etapa:** no se permite más de una vigente por Persona y etapa (índice único parcial). Anular una vieja permite registrar otra.
- **Anular una Completitud Manual que destrabó algo:** en esta spec no hay nada que dependa de ella más que Mi camino y el pedido de Vida Nueva (que vuelve a ofrecerse). Lo que futuras specs construyan sobre ella (ej. una Inscripción a Vida de Servicio ya aprobada) no se deshace — esas specs deciden qué pasa.
- **Declaración rechazada y vuelta a declarar:** se permite, sin límite de veces; cada declaración queda en el historial con su resultado.
- **La Persona retira su declaración pendiente:** pasa a `retirada` y la card vuelve a su estado anterior (para Vida Nueva, a ofrecer el pedido).
- **"Ya lo hice" de un menor de 12:** no se ofrece; lo registra el Admin directamente, con la información del tutor (coherente con FR-044 de la 004).
- **Persona sin acceso a la app:** no ve Mi camino; su historial lo registra el Admin directamente (Historia 2, escenario 7).
- **Discipulador que también es Admin:** ve Mis discipulados en la web app y la gestión completa en el backoffice; las dos cosas coexisten porque los roles son acumulativos.
- **Enlaces viejos del backoffice** (`/mis-discipulados`, `/mis-discipulados/[id]`, `/mi-disponibilidad`): redirigen a la web app conservando el id; si la sesión no tiene el rol, la web app hace lo que hace con cualquiera sin el rol (Historia 3, escenario 2).
- **Líder de curso:** "Mis grupos" del backoffice es hoy un cascarón vacío; con D142 deja de estar en el backoffice y quien solo tiene `lider_curso` aterriza en la misma pantalla "Lo tuyo está en la app". Mis grupos en la web app lo construye la spec de Vida de Servicio.
- **Alta con un teléfono escrito distinto** (con y sin 0, con y sin 15): el aviso compara el teléfono **normalizado** con el mismo formato estructurado del registro (D90), no el texto tal cual.
- **Homónimos con distinta fecha de nacimiento:** no son posible duplicado (D145 exige las tres cosas).
- **Duplicado contra una Persona inactiva** (`activo = false`, ej. un pendiente de tutor cerrado): también se muestra, marcada como inactiva, porque es el caso típico de "ya la cargamos y la cerramos".
- **Email con mayúsculas o espacios:** se normaliza (minúsculas, sin espacios alrededor) antes de guardar y de comparar, igual que en el registro.
- **Personas sin email en el código existente:** toda pantalla o consulta que hoy asume que hay email (listado de Personas, buscador, roles, auditoría de cambios de rol, envío futuro de emails) debe tolerar que falte; el login nunca encuentra una Persona sin email porque se busca por un email concreto.
- **Varias pestañas abiertas:** si el Admin confirma una declaración ya retirada por la Persona, la API responde con un código propio y la pantalla dice que la declaración cambió y la recarga.

## Fuera de alcance

- El ingreso con código por email (spec 007): esta spec solo deja `Persona.email` opcional y el alta con o sin email.
- El envío de notificaciones (spec 012): esta spec deja definidos los eventos de la declaración (confirmada, rechazada) como la 004 hizo con los suyos (FR-048), sin enviar nada.
- Los flujos de Vida de Servicio, Ministerio y Bautismo: sus cards se muestran con su explicación y "Próximamente"; esta spec deja la regla de cada una y la consulta de Completitud Manual, no sus pedidos.
- La edición general de los datos de una Persona por el Admin (Flujo 9). Solo se agrega "Agregar email" a una Persona que no tiene (D145).
- La visualización de progreso como línea de tiempo (Fase 2, D92): las cards no son una línea de tiempo.
- Mis grupos del Líder de curso en la web app (spec de Vida de Servicio).
- Preguntar el historial en el registro (D144: explícitamente no).

## Requirements *(mandatory)*

### Functional Requirements

**Mi camino por etapas (Historia 1)**

- **FR-001**: Mi camino DEBE mostrar una card por cada etapa del proceso, en este orden: **Vida Nueva, Vida de Servicio, Ministerio, Bautismo**. Cada card DEBE tener el nombre de la etapa como título, un subtítulo que explica la etapa y su estado. Los subtítulos de Vida Nueva, Vida de Servicio y Ministerio DEBEN ser los de Primeros pasos (`docs/12-contenido-bienvenida.md`, "¿Cómo sigue el proceso?"), con una sola fuente de texto para las dos pantallas — no una copia. El de Bautismo, que `docs/` no tiene, DEBE ser un texto provisorio marcado como tal (D98) hasta que Echu lo confirme (ver Preguntas para Echu).
- **FR-002**: El estado de cada card DEBE ser uno de: **disponible** (la puede empezar), **bloqueada** (todavía no se le habilita; dice qué le falta), **en curso**, **completada** (por el sistema), **completada por historial** ("Registrado por la iglesia"), **declaración en revisión**, **declaración no confirmada** (rechazada, con mensaje amable) o **próximamente** (la etapa todavía no existe en la app). Cada estado DEBE comunicarse con texto + ícono, nunca solo con color (D81), y decir qué pasa después ("¿Y ahora qué?", `docs/15`).
- **FR-003**: Cada etapa DEBE tener su **regla de habilitación**, evaluada en un único lugar compartido (una función pura por etapa, Principio XI) que las specs de cada etapa amplían sin tocar las demás:
  - **Vida Nueva**: siempre habilitada (con la restricción de edad de FR-044 de la 004: menores de 12 no piden solos).
  - **Bautismo**: habilitada con Vida Nueva en curso o completada — por Grupo o por Completitud Manual — (D147). La habilitación excepcional por el Admin que D147 menciona la construye la spec de Bautismo.
  - **Vida de Servicio**: habilitada con Vida Nueva completada, por Grupo (individual o grupal) o por Completitud Manual (D74, Flujo 4).
  - **Ministerio**: habilitada con Vida de Servicio completada, por Inscripción completada o por Completitud Manual (D39–D40, `docs/04` "prerrequisito por los dos caminos"). Ver Preguntas para Echu.
- **FR-004**: Una etapa cuya funcionalidad todavía no está construida DEBE mostrarse en estado **próximamente**: con su explicación, sin acción de pedido, sin parecer tocable, y sin inventar su flujo. En esta spec son próximamente **Vida de Servicio, Ministerio y Bautismo**. Cuando la spec de una etapa se construya, cambiarla a habilitable DEBE ser un cambio en un solo lugar (el mismo de FR-003).
- **FR-005**: La card de Vida Nueva DEBE llevar a la pantalla de Vida Nueva, que contiene lo que hoy está en Mi camino desde la 004 (pedir con franjas, estado del pedido, editar franjas, retirar, discipulado en curso, finalizado, baja, menor de 12) sin cambio de comportamiento. El estado de la card DEBE derivarse del mismo estado que la API ya devuelve para Vida Nueva (`EstadoMiDiscipulado`), más el historial (FR-008 a FR-015).
- **FR-006**: Mi camino DEBE tener sus estados de carga, error, vacío y éxito (`loading.tsx`, `error.tsx`; Principio VIII). No hay estado "vacío" real (las cuatro cards siempre están); si la API de etapas falla, el error dice qué pasó y ofrece reintentar.
- **FR-007**: La API DEBE exponer, para la Persona de la sesión, el estado de las cuatro etapas en una sola respuesta (para no hacer cuatro pedidos desde el celular), recortado por identidad (D134): una Persona solo ve el suyo.

**Historial previo y Completitud Manual (Historia 2)**

- **FR-008**: Cada card DEBE ofrecer **"Ya lo hice"** cuando: la etapa no está completada (por el sistema ni por historial), no hay una declaración pendiente de esa etapa, la etapa no está en marcha dentro del sistema (para Vida Nueva: sin pedido abierto ni Inscripción activa o completada), y la Persona tiene 12 años o más. Se ofrece también en las etapas **próximamente** (alguien ya bautizado no necesita que exista el flujo de Bautismo para contarlo) y en las **bloqueadas** (justamente quien hizo Vida de Servicio en otra iglesia es quien tiene bloqueada esa etapa).
- **FR-009**: "Ya lo hice" DEBE pedir confirmación en un paso (diálogo neutro, no rojo — D151), con un comentario **opcional** de hasta 500 caracteres ("¿Querés contarnos dónde o cuándo?"), y crear una **Declaración de Historial** en estado `pendiente` para esa Persona y esa etapa. No DEBE pedir ninguna otra información.
- **FR-010**: Una Persona NO DEBE poder tener más de una declaración `pendiente` por etapa a la vez (regla de no duplicados de `docs/04`). La API DEBE rechazarlo con un código propio, y DEBE rechazar también una declaración cuando ya hay una Completitud Manual vigente o la etapa está en marcha o completada en el sistema.
- **FR-011**: La Persona DEBE poder **retirar** su declaración mientras esté `pendiente` (confirmación neutra, D151). Retirada, la card vuelve al estado que tenía antes de declarar.
- **FR-012**: Las declaraciones pendientes DEBEN aparecer en la **bandeja unificada de Solicitudes** del backoffice como un tipo propio ("Historial previo"), con las columnas de la forma base (Persona, estado, fecha, revisado por, creado por — FR-025 de la 004) más la etapa. Al conectarse un segundo tipo, el filtro por tipo de la bandeja DEBE mostrarse (FR-025 de la 004 lo ocultaba mientras hubiera uno solo).
- **FR-013**: El Admin DEBE poder **confirmar** o **rechazar** una declaración pendiente desde su detalle, que muestra la Persona, la etapa, el comentario, la fecha y lo que el sistema ya sabe de esa Persona en esa etapa (ej. "no tiene pedidos ni discipulados de Vida Nueva"). Confirmar DEBE, en una sola transacción: pasar la declaración a `confirmada` con quién y cuándo, y registrar la **Completitud Manual** de esa etapa con origen "declaración". Rechazar DEBE pasarla a `rechazada` con quién, cuándo y un motivo **opcional** (hasta 500 caracteres) que la Persona ve. El Pastor DEBE ver la bandeja y el detalle sin esas acciones (D64, D142).
- **FR-014**: El Admin DEBE poder registrar una **Completitud Manual directamente** sobre una Persona, eligiendo la etapa, con una nota opcional, desde la pantalla Personas (Flujo 9) — también para Personas sin acceso a la app. Si había una declaración pendiente de esa etapa, DEBE quedar confirmada en la misma transacción. DEBE rechazarse si ya hay una vigente de esa etapa, o si la etapa está en curso o completada en el sistema (para Vida Nueva: Inscripción activa o completada).
- **FR-015**: El Admin DEBE poder **anular** una Completitud Manual (corrección de errores), con confirmación. Anular es lógico (Principio III): queda quién y cuándo, y deja de contar para FR-003 y FR-016. Solo puede haber **una Completitud Manual vigente** por Persona y etapa.
- **FR-016**: El sistema DEBE ofrecer, en la API, **una única consulta** "¿esta Persona completó esta etapa?" que responde sí si hay una completitud **por el sistema** (para Vida Nueva: una Inscripción `completada` en cualquier Curso de categoría `vida_nueva`) **o** una Completitud Manual vigente de esa etapa (`docs/04`, "chequea ambos caminos"), y dice por cuál de los dos caminos. Las specs de Vida de Servicio, Ministerio y Bautismo DEBEN poder usarla sin reimplementarla: cada una agrega su propia fuente "por el sistema" en ese mismo lugar.
- **FR-017**: El pedido de Vida Nueva (FR-001 y FR-002 de la 004, la Persona o alguien en su nombre) DEBE rechazarse, además de por lo que ya lo rechazaba, si la Persona tiene una declaración `pendiente` de Vida Nueva o una Completitud Manual vigente de Vida Nueva, con un código propio para cada caso.
- **FR-018**: El sistema DEBE dejar definidos, con destinatario y datos, los **eventos** que el sistema de notificaciones (spec 012) va a enviar: declaración nueva → el Admin; declaración confirmada y declaración rechazada (con motivo) → la Persona; Completitud Manual registrada directamente → la Persona. No DEBE enviar nada en esta spec (mismo patrón que FR-048 de la 004).
- **FR-019**: Ninguna declaración ni Completitud Manual DEBE escribir roles de estado (`apto_ministerio`, en curso, miembro de Ministerio): esos los escribe el sistema por el evento de dominio de cada etapa (D131), y la spec de cada etapa decide si una Completitud Manual cuenta como ese evento.

**El Discipulador en la web app (Historia 3)**

- **FR-020**: Las pantallas **Mis discipulados** (propuestas, discípulos, detalle de un discipulado con sus Encuentros, registrar y editar Encuentros con Asistencia, proponer finalizar, proponer baja), **Mi disponibilidad** (agenda de franjas, toggle, máximo de Personas por Grupo, períodos de no disponibilidad) y **Pedir Vida Nueva en nombre de…** DEBEN estar en `apps/web`, con el mismo comportamiento que tienen en el backoffice según la 004 (FR-009 a FR-019a, FR-031, FR-037, FR-040 a FR-042, FR-045 a FR-047 de la 004) y contra **la misma API, sin cambios** en esos endpoints.
- **FR-021**: Mis discipulados DEBE mostrar primero los **pendientes** del Discipulador: propuestas por responder, y las finalizaciones o bajas que propuso y el Admin rechazó (con el motivo, FR-019a de la 004) que todavía no volvió a proponer. Después, sus discipulados.
- **FR-022**: El **Inicio** de la web app DEBE mostrar, solo a quien tenga pendientes de FR-021, un aviso con la cantidad ("Tenés 2 cosas para revisar en tus discipulados") que lleva a Mis discipulados. Sin pendientes, no se muestra nada.
- **FR-023**: Navegación: la barra inferior DEBE seguir teniendo **cinco pestañas** (`docs/14`): Inicio, Mi camino, Eventos, Avisos, Perfil. Mis discipulados y Mi disponibilidad DEBEN alcanzarse desde **Mi camino**, con un selector arriba de la pantalla — "Mi camino · Mis discipulados" — visible solo para quien tenga el permiso de ver Mis discipulados (`CATALOGO_PERMISOS`, D132). Mi disponibilidad se abre desde Mis discipulados. En las tres rutas, la pestaña Mi camino DEBE marcarse como actual (`aria-current="page"`). La miga de pan sigue la jerarquía del contenido (`docs/15`, H-81).
- **FR-024**: Las rutas de la web app para el Discipulador DEBEN exigir sesión y el permiso correspondiente del catálogo (`mis_discipulados.ver`, `mi_disponibilidad.ver`), resuelto con la misma función que usa el backoffice (movida a un lugar compartido, Principio XI). Sin el permiso, DEBEN llevar a Mi camino sin mostrar datos. Son pantallas personales: se recortan por identidad (D134).
- **FR-025**: El backoffice DEBE dejar de ofrecer Mis discipulados, Mi disponibilidad y Mis grupos (el cascarón vacío del Líder de curso). Sus rutas DEBEN redirigir a las de la web app (las de Mis grupos, a Mi camino). Una Persona sin ningún ítem del backoffice (ej. solo `discipulador` o solo `lider_curso`) DEBE aterrizar en una pantalla terminal que le explica que lo suyo está en la app, con un botón "Ir a la app" — nunca un error ni una redirección en bucle (H-134).
- **FR-026**: Los componentes que el Admin y el Discipulador comparten (ej. "Pedir Vida Nueva en nombre de…", que el Admin usa en la bandeja de Solicitudes) DEBEN vivir en `packages/ui`, no copiados entre apps (Principio XI). Lo que solo usa el Discipulador se **mueve** a `apps/web` y se borra del backoffice.
- **FR-027**: Las pantallas movidas DEBEN cumplir D150 en el celular: letra de 16 px en etiquetas, botones y ayudas (14 px solo para metadatos) y botones de 44 px de alto; acciones principales en la zona del pulgar, sin scroll horizontal (FR-046 de la 004). Sus confirmaciones de acciones reversibles (declinar una propuesta, retirar, borrar una franja o un período) DEBEN ser neutras; rojo + ícono solo para lo irreversible (D151).

**Permisos (Historias 3, 4 y 5)**

- **FR-028**: El catálogo de permisos (`CATALOGO_PERMISOS`) DEBE quedar así para lo que toca esta spec:
  - `personas.alta` (nuevo): solo `admin` (D143, D145).
  - `personas.editar_email` (nuevo, "Agregar email"): solo `admin`.
  - `historial.declarar`: no es un permiso de cargo — lo puede hacer cualquier Persona con sesión, para sí misma (se resuelve por identidad, D132 "límite del catálogo").
  - `historial.resolver` (nuevo, confirmar/rechazar declaraciones) y `completitud_manual.gestionar` (nuevo, registrar y anular): solo `admin`.
  - `solicitudes.ver` sigue en `admin` y `pastor`: incluye ver las declaraciones.
  - `solicitudes.crear_en_nombre` sigue en `admin` y `discipulador`, ahora usado desde la web app por el Discipulador y desde el backoffice por el Admin (D143).
  - `personas.buscar` sigue en `admin` y `discipulador` (lo necesita "Pedir en nombre de…"; ver Preguntas para Echu).
  - `mis_discipulados.ver/gestionar` y `mi_disponibilidad.ver/gestionar` siguen en `discipulador`; los usa la web app.
  - `mis_grupos.ver` sale del menú del backoffice; queda en el catálogo para la spec de Vida de Servicio.
- **FR-029**: El Discipulador NO DEBE poder dar de alta Personas por ninguna vía (API 403, ninguna pantalla lo ofrece). Los textos y ayudas de la web app que hoy sugieran que puede hacerlo DEBEN cambiarse para remitir al Admin.

**Alta de adultos por el Admin (Historia 5)**

- **FR-030**: `Persona.email` DEBE ser **opcional** (sigue siendo único entre las Personas que lo tienen). El auto-registro sigue tomándolo obligatorio de la sesión SSO; el alta por el Admin lo admite vacío.
- **FR-031**: El backoffice DEBE ofrecer, en Personas, **"Dar de alta una persona"** a quien tenga `personas.alta`, con un formulario que pide **los mismos datos obligatorios del registro** (Flujo 2, paso 4) y las mismas validaciones, que vivan en un solo lugar para el registro y el alta (Principio XI): apellido, nombre, género, fecha de nacimiento, teléfono (estructurado, D90), dirección, Sede, estado civil, profesión (con detalle si es "Otro"), tiempo congregándose; más **email opcional** y la confirmación obligatoria "La persona me dio su consentimiento para guardar estos datos" (D78). Como lo usa el Admin en una computadora o un celular, puede ser una sola página con secciones en vez de los pasos del registro (D94 es para el auto-registro).
- **FR-032**: Al crear, la Persona DEBE quedar `activa`, con origen de alta `admin`, el Admin como autor del alta, el consentimiento con fecha y origen `presencial`, y el rol de estado `miembro_registrado` escrito por el único lugar que escribe roles de estado (FR-019 del 005).
- **FR-033**: El alta DEBE rechazar una fecha de nacimiento de **menor de 18** con un código propio y un mensaje que remita a Pendientes de tutor (Flujo 7, D139).
- **FR-034**: El alta DEBE rechazar un **email** ya usado por otra Persona, con el error debajo del campo (bloqueo, no aviso: el email identifica el ingreso).
- **FR-035**: Antes de crear, el sistema DEBE buscar **posibles duplicados**: Personas (activas o no) con el **mismo teléfono normalizado**, o con el **mismo nombre, apellido y fecha de nacimiento** (sin distinguir mayúsculas, tildes ni espacios sobrantes). Si encuentra alguna y el Admin no confirmó, NO DEBE crear y DEBE responder con un código propio y la lista de coincidencias (nombre, apellido, fecha de nacimiento, teléfono, si está activa, y qué coincidió). El Admin DEBE poder ir a cada una o confirmar "Es otra persona, crear igual", que reenvía el mismo alta con la confirmación, sin recargar datos (aviso, no bloqueo — D145).
- **FR-036**: Después de crear, la app DEBE confirmar el alta y decir qué sigue: si no tiene email, que la Persona no va a poder entrar a la app y que el equipo puede pedir Vida Nueva o registrar etapas hechas en su nombre; si tiene, que puede entrar con ese email (Google, o el código de la spec 007 cuando exista).
- **FR-037**: El listado de Personas DEBE identificar a quien no tiene email como **"Sin acceso a la app"** (texto + ícono, D81) y ofrecer al Admin **"Agregar email"**, con la misma validación de formato y unicidad de FR-034. No permite cambiar ni borrar un email existente (eso es la edición de Flujo 9, fuera de alcance; D64 sigue).
- **FR-038**: Todas las consultas, tipos compartidos y pantallas que hoy asumen que `Persona.email` existe DEBEN tolerar que falte: listado y buscador de Personas (que sigue buscando por email cuando lo hay), panel de roles, auditoría de cambios de rol, vista administrativa de discipulados, y el login (que busca por el email de la sesión y nunca encuentra a una Persona sin email).
- **FR-039**: El alta y "Agregar email" DEBEN mostrar los errores de validación por campo con la pieza compartida (H-50) y proteger el envío de la reentrada (`useEnvio` + `Button`, H-57): dos toques no crean dos Personas.

**Transversales**

- **FR-040**: Todo texto nuevo DEBE salir de `next-intl` (D84), en rioplatense con voseo y sin términos del modelo (`docs/15`): la Persona ve "Ya lo hice", "La iglesia lo está revisando", "Registrado por la iglesia"; nunca "Completitud Manual" ni "declaración". En el backoffice, el Admin ve "Historial previo" y "Etapa hecha".
- **FR-041**: Toda regla nueva que pueda fallar DEBE tener su código en el catálogo compartido de errores (Principio X), sin reutilizar uno existente con otro significado.
- **FR-042**: Cada pantalla nueva o modificada DEBE tener su tarea de checklist de `docs/15` en `tasks.md` (D114), y los flujos críticos nuevos (declarar y confirmar historial; el ciclo del Discipulador en la web; el alta con aviso de duplicado) DEBEN tener e2e con `axe` en claro y oscuro, en viewport de celular para la web app.
- **FR-043**: `db:seed-demo` DEBE sumar (D120): declaraciones pendientes, confirmadas y rechazadas de distintas etapas; Completitudes Manuales vigentes y anuladas; Personas sin email; un par de Personas que disparen el aviso de duplicado (mismo teléfono escrito distinto; homónimos con la misma fecha); y datos hostiles (nombres largos, tildes, comentario de 500 caracteres).

### Key Entities *(include if feature involves data)*

- **Etapa del camino** (valor, no tabla): `vida_nueva`, `vida_de_servicio`, `ministerio`, `bautismo` — las cuatro etapas que nombra D92. Es la clave con la que se registran declaraciones y Completitudes, porque Bautismo y Ministerio no son Cursos (ver Decisiones nuevas en `plan.md`). Para las etapas que sí son cursos, corresponde a `Curso.categoria`.
- **Declaración de Historial** (nueva): lo que la Persona cuenta con "Ya lo hice". Sigue la forma común de las Solicitudes (`docs/04`): Persona, etapa, estado (`pendiente` / `confirmada` / `rechazada` / `retirada`), fecha, comentario opcional, creado por (null = la propia Persona), revisado por, revisada en, motivo de rechazo opcional. Una sola `pendiente` por Persona y etapa.
- **Completitud Manual** (nueva en el modelo; ya definida en `docs/04`): registro de que una Persona completó una etapa fuera del flujo normal. Persona, etapa, origen (`declaracion` / `admin`), la declaración que la originó (si la hay), nota opcional, registrada por, registrada en, y anulada por / anulada en (borrado lógico). Una sola vigente por Persona y etapa.
- **Persona** (cambia): `email` pasa a opcional; se usan los campos ya existentes `origenAlta`, `altaPor`, `consentimientoDatosOrigen = presencial` para el alta del Admin.
- **Estado de etapa** (tipo compartido, no tabla): lo que la API devuelve por etapa para Mi camino (FR-002), calculado en el momento a partir de las fuentes de cada etapa, las declaraciones y las Completitudes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En la revisión manual, una persona que no conoce la app identifica en Mi camino, sin ayuda y en menos de 15 segundos, cuál es su próximo paso y qué etapas todavía no están disponibles.
- **SC-002**: El 100 % de las combinaciones de estado de Vida Nueva de la 004 (puede pedir, buscando, en curso, finalizado, baja, menor de 12) más los estados de historial (en revisión, confirmada, no confirmada) se muestran con el texto e ícono correctos en la card, verificado por tests unitarios de la función de estado y un e2e.
- **SC-003**: Una Persona declara una etapa en no más de 2 toques desde Mi camino, y el Admin la resuelve en no más de 2 clics desde la bandeja.
- **SC-004**: Después de confirmar una declaración de Vida Nueva, la consulta de etapa completada (FR-016) responde "sí, por Completitud Manual" y el pedido de Vida Nueva queda rechazado por la API — cubierto por un test de integración.
- **SC-005**: Un Discipulador completa el ciclo de la 004 (aceptar propuesta, registrar Encuentro con una ausencia, proponer finalizar, cargar una franja y un período) solo desde la web app en un celular de 375 px de ancho, sin scroll horizontal y con todos los objetivos táctiles de al menos 44 × 44 px.
- **SC-006**: Ninguna ruta del backoffice ofrece funciones del Discipulador: un e2e con la sesión de un Discipulador sin otros roles aterriza en la pantalla "Lo tuyo está en la app" y las tres rutas viejas redirigen a la web app.
- **SC-007**: El Admin da de alta a una Persona sin email en menos de 3 minutos, y un alta con un teléfono ya cargado muestra el aviso de posible duplicado el 100 % de las veces (test de integración con teléfono escrito de tres formas distintas).
- **SC-008**: Las tres suites (unitarios, integración y e2e de `apps/web` y `apps/backoffice`) quedan en verde, con `axe` sin violaciones en claro y oscuro en todas las pantallas nuevas o movidas.

## Assumptions

- **Informe de UX:** `specs/revision-manual/2026-09-30-ux-web.md` no está en `main`. Si llega antes de implementar, sus hallazgos "Para la 006" se suman como tareas en `tasks.md` sin cambiar los requisitos de este spec; si contradicen alguno, se resuelve con Echu.
- **Orden de las cards:** el del pedido (Vida Nueva, Vida de Servicio, Ministerio, Bautismo). Bautismo va al final porque no es una etapa en fila: se habilita en paralelo a Vida Nueva (D147).
- **Subtítulos:** los de Primeros pasos se reutilizan tal cual; si cambian, cambian en los dos lados (una sola clave). El de Bautismo es provisorio, marcado D98: "Un paso público de fe: contar que decidiste seguir a Jesús. Lo podés pedir cuando empezás Vida Nueva."
- **Ministerio:** la regla es "Vida de Servicio completada" (D39–D40, D74 aplicado a la etapa siguiente, `docs/04` dos caminos). D28 (activación manual de `apto_ministerio` por el Admin) es anterior y la reemplazan D39–D40; la spec de Ministerio lo confirma.
- **"Ya lo hice" de Ministerio:** registra que la Persona ya sirvió o sirve en un Ministerio; **no** la hace Miembro de Ministerio (eso exige una Postulación con Ministerio y Célula, Flujo 5). Qué habilita exactamente lo decide la spec de Ministerio (ver Preguntas para Echu).
- **Comentario de la declaración:** opcional, porque pedir "dónde y cuándo" como obligatorio alarga el gesto, y el Admin igual habla con la Persona si duda.
- **El motivo de rechazo** lo ve la Persona: `docs/15` pide "mensaje amable + a quién consultar", y un motivo opcional del Admin ("no encontramos el registro, traenos el certificado") es lo más útil. El Admin sabe que la Persona lo lee (se le dice en el campo).
- **Menores:** la regla de 12 años de la 004 (FR-044) se aplica también a "Ya lo hice": quien no puede pedir solo, tampoco declara solo; el Admin registra directamente.
- **Navegación del Discipulador:** el selector dentro de Mi camino es una propuesta de esta spec (el pedido lo pide: "proponé dónde va"), no algo que `docs/14` decida; ver Preguntas para Echu. Se descartó una sexta pestaña (rompe el límite de cinco de `docs/14`), ponerlo en Perfil (es acompañamiento, no configuración personal) y en el menú "Más" (es para las páginas públicas, H-37).
- **Rutas:** se conservan los nombres de la 004 (`/mis-discipulados`, `/mis-discipulados/[id]`, `/mi-disponibilidad`), ahora en `apps/web`, para que las redirecciones del backoffice sean directas y la nomenclatura `mi-*` de D134 siga igual.
- **Búsqueda del Discipulador:** "Pedir en nombre de…" sigue usando la misma búsqueda de Personas de la 004 (`GET /personas/buscar`), sin cambios en la API (el pedido dice "la API no cambia"). Restringirla a Personas sin acceso a la app es una pregunta para Echu.
- **Pastor:** D142 dice "el Pastor entra solo para ver". Esta spec no le quita la edición de la Palabra Profética (D129): D142 no lo menciona y D129 tiene un porqué propio. Ver Preguntas para Echu.
- **Edición de datos de la Persona por el Admin** (Flujo 9) sigue fuera de alcance, salvo "Agregar email" a quien no tiene, que es lo mínimo para que D145 ("si después se le agrega un email…") sea posible.
- **D150 en la web app:** si al implementar `main` todavía no tiene el `Button` de 44 px y la letra de 16 px como default de `apps/web`, esta spec lo implementa en sus pantallas y en el default (y actualiza `docs/15`, como pide D150); si ya lo tiene otra spec, solo lo usa.
- **Auditoría:** confirmar declaraciones y registrar o anular Completitudes deja autor y fecha en el propio registro (trazabilidad de `docs/03`), sin sumarse a la auditoría de `CambioDeRol` (D136 la deja para Fase 2).

## Preguntas para Echu

1. **¿Dónde va lo del Discipulador en la web app?** Hay cinco pestañas y no entra una sexta (`docs/14`). **Recomiendo** (y es lo que la spec aplica): un selector arriba de Mi camino, "Mi camino · Mis discipulados", visible solo para Discipuladores, con Mi disponibilidad adentro de Mis discipulados y un aviso en Inicio cuando hay pendientes. Mañana el Líder de curso suma "Mis grupos" en el mismo selector. La alternativa sería un acceso solo desde Inicio, que queda más escondido para algo que se usa todas las semanas.
2. **Ministerio: ¿qué cuenta y qué significa "Ya lo hice"?** **Recomiendo**: la card se habilita con Vida de Servicio completada (por curso o por Completitud Manual), y "Ya lo hice" en Ministerio solo registra que ya sirvió/sirve — no la hace Miembro de Ministerio ni le asigna uno; para eso igual se postula. ¿Una Completitud Manual de Vida de Servicio debería contar como "apta para Ministerio"? Recomiendo que sí (es lo que dice `docs/04` para los prerrequisitos), y que lo implemente la spec de Ministerio usando la consulta de FR-016.
3. **Texto de la card de Bautismo.** `docs/12` no tiene una explicación de Bautismo. **Recomiendo** usar el provisorio de las Assumptions, marcado D98, hasta que lo revises o lo pase la iglesia.
4. **El Pastor y la Palabra Profética.** D142 dice que el Pastor entra al backoffice "solo para ver", pero D129 le dio la edición de la Palabra Profética (la escribe un pastor). **Recomiendo** mantener D129: D142 hablaba del reparto entre Admin y Discipuladores/Líderes, no de esto. Si querés que sea estrictamente lectura, es una línea del catálogo.
5. **¿El Discipulador busca entre todas las Personas?** Para "Pedir en nombre de…" hoy ve nombre, email y teléfono de cualquier Persona que coincida con la búsqueda (heredado de la 004). D143 habla de "alguien sin app". **Recomiendo** restringir esa búsqueda, solo para el Discipulador, a Personas sin acceso a la app y mostrarle nombre, apellido y edad (sin teléfono ni email hasta que acepte un discipulado, como FR-011 de la 004). Es un cambio chico de API que esta spec no hace porque el pedido dice "la API no cambia".
