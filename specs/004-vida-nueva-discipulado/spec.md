# Feature Specification: Vida Nueva / Discipulado

**Feature Branch**: `004-vida-nueva-discipulado`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "Vida Nueva / Discipulado — la tajada vertical siguiente al spec 001 (Fase de Bienvenida) en el proceso de integración Bienvenida → Vida Nueva → Vida de Servicio → Ministerio. Una Persona ya registrada que quiere empezar Vida Nueva no tiene hoy ningún camino en el sistema para pedirlo, ni el Admin una forma de asignarle un Discipulador, ni el Discipulador un lugar donde registrar el avance de los encuentros ni gestionar su propia disponibilidad para tomar nuevos discipulados. Cubre: Solicitud de Discipulado (creada por la Persona, o en su nombre si no tiene acceso a la app), aprobación por el Admin (que crea el Grupo y asigna Persona y Discipulador), el listado de Discipuladores disponibles que ve el Admin al asignar, registro de Encuentros por el Discipulador, propuesta de finalización y confirmación, y gestión de disponibilidad del Discipulador (toggle + Bloqueos por fecha). Fuera de alcance: Cronograma/Contenido, activación de apto_ministerio, Completitud Manual, el envío real de notificaciones, y Vida de Servicio/Ministerios/Bautismo/Eventos."

**Reactivado (2026-09-27)**: estuvo en pausa desde el 2026-09-23 porque dependía del spec 005 (Roles, permisos y acceso al backoffice). El 005 se cerró en `16ec1a7` con las tres suites en verde, así que este spec vuelve a avanzar. Lo que el 005 dejó construido y este spec **usa** (no vuelve a decidir): el catálogo de permisos (`packages/shared-types/src/permisos.ts`), el otorgamiento y la quita de roles de cargo (`apps/api/src/persona/roles.service.ts`, con su auditoría en `apps/api/src/cambio-de-rol/`, y el panel de roles de `apps/backoffice/src/app/personas/`) y la exclusión de menores de los roles de cargo (FR-011 del 005). Ver FR-005, FR-006, el caso borde sobre quitar el rol y las Assumptions.

## Clarifications

### Session 2026-09-23

- Q: ¿Este spec cubre solo Vida Nueva individual (discipulado 1 a 1), o también la variante grupal? → A: Solo individual — la variante grupal queda para un spec posterior. Pero el recorte es de **alcance**, no de **modelo**: D44 (docs/05-decisiones.md) fija que Vida Nueva Grupal es un segundo registro de Curso (`tipo = grupal`) con la misma maquinaria de Grupo/Inscripción/Encuentro, lo que solo es cierto si el vínculo Persona–Grupo admite varias Inscripciones por Grupo desde ahora — aunque en este spec, cuya única variante es la individual, todo Grupo tenga exactamente una. Modelarlo como uno a uno convertiría a la futura variante grupal en una migración, exactamente lo que D44 dice que no debería hacer falta.
- Q: En el discipulado individual (1 a 1), ¿se registra Asistencia explícita además del Encuentro, o alcanza con el Encuentro solo? → A: Se registra explícitamente también en individual — no solo por consistencia con la variante grupal, sino porque sin Asistencia propia una FALTA no tiene cómo anotarse en el 1 a 1: si "hubo Encuentro" implica "estuvo presente", el caso de que el Discipulador fue y el discípulo no apareció queda sin registro. El estado `dada_de_baja` de la Inscripción está documentado como decisión por exceso de faltas (docs/04-dominio-entidades.md) — sin faltas que contar, esa regla queda sin insumo justo en la variante donde el abandono silencioso es más probable. Consecuencia de interfaz explícita: al registrar un Encuentro individual, la asistencia viene marcada como presente por defecto, y marcar la ausencia es un gesto de un solo paso — no un formulario que pregunte cada vez por algo que casi siempre es lo mismo. El registro es obligatorio en el modelo; el trabajo para el Discipulador, no.
- Q: La bandeja de Solicitudes del backoffice, ¿se construye genérica desde ahora o específica de Discipulado? → A: Genérica solo en el LISTADO (columnas de la forma base — persona, estado, fecha, revisado_por, creado_por —, filtrado y orden); la RESOLUCIÓN (qué pasa al aprobar) queda específica por tipo, porque abstraerla ahora con un solo ejemplo real (Discipulado, que al aprobarse crea un Grupo y asigna un Discipulador) garantizaría una abstracción moldeada sobre ese único caso. El filtro por tipo existe en la estructura pero no se muestra en la interfaz mientras haya un solo tipo conectado — un filtro con una sola opción es ruido.
- Q: ¿La Persona ve el estado de su propia Solicitud de Discipulado en algún lado de la app? (H-126, revisión manual) → A: Sí, y no solo mientras está pendiente — tres cosas: (1) el estado de su Solicitud (pendiente/aprobada/rechazada) — con el envío de notificaciones fuera de alcance, esta es la ÚNICA vía por la que se entera de un rechazo; (2) una vez aprobada, que su discipulado está en curso y quién es su Discipulador; (3) cuando se confirma la finalización, que terminó. Explícitamente NO ve las notas que el Discipulador carga en cada Encuentro — son apuntes de seguimiento pastoral, no un informe para la persona discipulada, y saber que existen cambiaría lo que el Discipulador escribe. Mostrarle otro dato del avance (ej. capítulos vistos) queda como una decisión aparte, no incluida acá.

### Cierre 2026-09-23 — este spec queda en pausa, depende del spec 005

H-125 (el círculo del primer Discipulador: nadie puede ser elegido porque para aparecer en el
listado de FR-006 hay que estar disponible, y solo un Discipulador puede prender su propia
disponibilidad) queda **resuelto por D131** (`docs/05-decisiones.md`), no por este spec: los roles
de **cargo** (`admin`, `pastor`, `discipulador`, `lider_curso`) los otorga y los quita el Admin
desde el backoffice — `discipulador` NO se deriva de haber sido asignado a un Grupo. Ese mecanismo
de otorgamiento se construye en el **spec 005** (Roles, permisos y acceso al backoffice), que este
spec pasa a tener como dependencia. El spec 004 no avanza a `/speckit.plan` hasta que 005 esté
resuelto — ver FR-005, FR-006 y la Assumption sobre el rol Discipulador, actualizadas para reflejar
esto en vez de dejarlo como un hueco propio.

### Session 2026-09-27

- Q: Si un Discipulador ya no puede seguir con un discipulado en curso, ¿el Admin puede pasárselo a otro Discipulador? → A: Sí. El Admin cambia el Discipulador de un Grupo en curso eligiendo del mismo listado de disponibles (FR-006). Los Encuentros ya registrados quedan en el Grupo, el cambio queda registrado y el Discipulador anterior deja de ver ese discipulado y sus datos de contacto. Es lo que destraba FR-009 del 005: para sacarle el rol a alguien con discipulados activos, primero se le reasignan.
- Alineación con D134 (no es una pregunta nueva): la clarificación del 2026-09-23 decía que las notas de los Encuentros eran "para el Discipulador y el Admin". D134 (`docs/05-decisiones.md`, posterior) lo enmendó: las notas las ve **solo** el Discipulador, y el Admin y el Pastor ven el seguimiento sin su texto. FR-010, FR-029, la Historia 5 (escenarios 2 y 6) y la entidad Encuentro quedan alineados con D134.
- Q: Si el Discipulador propone terminar un discipulado y el Admin no está de acuerdo, ¿qué puede hacer el Admin? → A: Rechazar la propuesta, con un motivo opcional. El discipulado vuelve a "en curso", el Discipulador ve que se rechazó (y el motivo, si hay) y puede volver a proponerla más adelante.
- Q: Una Persona que el Admin dio de alta sin acceso a la app (D97), ¿no ve nada de su discipulado, y si más adelante entra con Google ve su estado como cualquiera? → A: Sí a las dos. Mientras no tenga acceso no ve nada: el seguimiento lo hacen el Admin y el Discipulador. Si después entra, ve su estado como cualquier Persona (FR-026 a FR-028), incluida la Solicitud que crearon en su nombre. No hay una vista aparte.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pedir empezar Vida Nueva (Priority: P1)

Una Persona que ya es Miembro registrado, y que quiere dar el siguiente paso en su camino dentro de la iglesia, quiere poder pedir empezar Vida Nueva sin tener que hablar primero con alguien del equipo ni depender de que alguien se acuerde de ofrecérselo.

**Why this priority**: Es la puerta de entrada de todo el flujo — sin una forma de pedirlo, nada de lo demás (aprobación, asignación, encuentros) tiene con qué empezar. Es, además, el problema concreto que motiva este spec: hoy ese pedido no tiene ningún camino en el sistema.

**Independent Test**: Puede probarse por completo haciendo que una Persona con sesión iniciada pida empezar Vida Nueva y verificando que queda un pedido visible para el Admin, en un estado claramente distinguible de "todavía sin decidir".

**Acceptance Scenarios**:

1. **Given** una Persona con sesión iniciada que todavía no está cursando ni completó Vida Nueva, **When** pide empezar Vida Nueva desde la app, **Then** el sistema crea una Solicitud de Discipulado en un estado pendiente de revisión, asociada a esa Persona.
2. **Given** una Persona sin acceso a la app (dada de alta por el Admin o el Discipulador, sin cuenta propia), **When** el Admin o un Discipulador pide en su nombre empezar Vida Nueva, **Then** el sistema crea la misma Solicitud, dejando registrado quién la creó en nombre de quién.
3. **Given** una Persona que ya tiene una Solicitud de Discipulado pendiente de revisión, **When** intenta pedir empezar Vida Nueva de nuevo, **Then** el sistema se lo impide o la redirige a la solicitud ya existente, en vez de crear un duplicado.
4. **Given** una Persona que ya está cursando Vida Nueva (tiene una Inscripción activa) o ya lo completó, **When** intenta pedir empezarlo de nuevo, **Then** el sistema no genera una segunda Solicitud sin que quede claro por qué.

---

### User Story 2 - Seguir el estado de mi propio pedido (Priority: P2)

Una Persona que pidió empezar Vida Nueva quiere saber qué pasó con ese pedido — si sigue esperando revisión, si fue aprobado o rechazado, quién es su Discipulador una vez que arranca, y cuándo termina — sin tener que preguntarle a nadie ni depender de un aviso que hoy no existe (H-126, revisión manual).

**Why this priority**: Con el envío de notificaciones fuera de alcance (ver Fuera de alcance), esta es la ÚNICA vía por la que la Persona se entera de qué pasó con su pedido — sin esto, alguien que pidió empezar Vida Nueva queda en el mismo silencio que el problema que este spec busca resolver. Depende de que exista la Historia 1 (tiene que haber una Solicitud creada para poder consultar su estado).

**Independent Test**: Puede probarse por completo haciendo que una Persona con una Solicitud pendiente consulte su propio estado y vea que está pendiente de revisión; las vistas de "en curso, con tal Discipulador" y "terminado" se suman naturalmente cuando existan las Historias 3 y 6.

**Acceptance Scenarios**:

1. **Given** una Persona con una Solicitud de Discipulado pendiente de revisión, **When** consulta su propio estado en la app, **Then** ve que está pendiente de revisión.
2. **Given** una Solicitud aprobada (con Grupo ya creado), **When** la Persona consulta su estado, **Then** ve que su discipulado está en curso y quién es su Discipulador asignado.
3. **Given** una Solicitud rechazada, **When** la Persona consulta su estado, **Then** ve que fue rechazada, sin depender de que se le haya avisado por otro medio.
4. **Given** un discipulado cuya finalización fue confirmada, **When** la Persona consulta su estado, **Then** ve que el proceso terminó.
5. **Given** un discipulado en curso con Encuentros ya registrados, **When** la Persona consulta su propia vista, **Then** NO ve las notas que el Discipulador cargó en cada Encuentro — son apuntes de seguimiento pastoral solo para el Discipulador (D134), no un informe para la persona discipulada.

---

### User Story 3 - Aprobar la Solicitud y armar el Grupo (Priority: P1)

Un Admin que revisa las Solicitudes pendientes quiere poder aprobar la de Discipulado y, en el mismo paso, asignar a la Persona con un Discipulador, eligiendo entre quienes de verdad pueden tomar un discipulado nuevo en este momento.

**Why this priority**: Sin este paso, un pedido de Vida Nueva queda parado para siempre — es la otra mitad imprescindible de la puerta de entrada. Depende de que exista la Historia 1 (tiene que haber una Solicitud para poder revisarla).

**Independent Test**: Puede probarse por completo haciendo que un Admin revise una Solicitud de Discipulado pendiente, la apruebe eligiendo un Discipulador de un listado ya filtrado, y verificando que queda un Grupo nuevo con la Persona y el Discipulador correctamente vinculados.

**Acceptance Scenarios**:

1. **Given** una Solicitud de Discipulado pendiente de revisión, **When** el Admin la revisa, **Then** puede aprobarla o rechazarla.
2. **Given** que el Admin aprueba la Solicitud, **When** confirma la aprobación, **Then** el sistema crea un Grupo de Vida Nueva nuevo e inscribe en él a la Persona que hizo el pedido.
3. **Given** que el Admin está aprobando una Solicitud, **When** llega al paso de elegir Discipulador, **Then** ve únicamente a quienes están marcados como disponibles para tomar un discipulado nuevo y no tienen, a la fecha de hoy, un período de no disponibilidad vigente — nunca a alguien que no puede tomarlo en este momento.
4. **Given** el listado de Discipuladores disponibles, **When** el Admin elige a uno, **Then** la elección queda a su criterio dentro de ese listado — el sistema no elige ni sugiere uno en particular.
5. **Given** que no hay ningún Discipulador disponible en el listado, **When** el Admin llega a ese paso, **Then** el sistema se lo indica claramente en vez de dejarlo elegir de una lista vacía sin explicación.
6. **Given** una Solicitud de Discipulado, **When** el Admin la rechaza en vez de aprobarla, **Then** queda registrada como rechazada, sin crear ningún Grupo, y la Persona puede volver a pedirlo más adelante.
7. **Given** que el Admin aprueba o rechaza una Solicitud, **When** la decisión se guarda, **Then** el sistema deja registrado todo lo necesario para que, en el futuro, dispare un aviso a la Persona dueña de la Solicitud — sin que el envío de ese aviso sea parte de esta funcionalidad.
8. **Given** un discipulado en curso cuyo Discipulador ya no puede seguir, **When** el Admin lo reasigna eligiendo otro del listado de disponibles (FR-006), **Then** el nuevo Discipulador ve el discipulado con todos sus Encuentros anteriores, el anterior deja de verlo junto con los datos de contacto de la Persona, la Persona ve a su nuevo Discipulador, y el cambio queda registrado (FR-030).

---

### User Story 4 - Gestionar mi disponibilidad para tomar discipulados (Priority: P2)

Un Discipulador quiere poder avisar cuándo está en condiciones de tomar un discipulado nuevo y cuándo no (por ejemplo, mientras está de vacaciones), sin tener que pedirle a nadie que se lo cambie por él.

**Why this priority**: Es lo que le da sentido real al listado filtrado de la Historia 3 — sin una forma de que el propio Discipulador la mantenga al día, esa información queda vieja o inventada. No es, sin embargo, parte de la puerta de entrada: un discipulado ya en curso no depende de esto.

**Independent Test**: Puede probarse por completo haciendo que un Discipulador alterne su disponibilidad y cree un período de no disponibilidad con fecha de inicio y fin, y verificando que esos cambios se reflejan de inmediato en el listado que ve el Admin al asignar.

**Acceptance Scenarios**:

1. **Given** un Discipulador con sesión iniciada, **When** entra a su pantalla de disponibilidad, **Then** puede alternar manualmente si está disponible para tomar un discipulado nuevo o no — el sistema nunca lo cambia solo (por ejemplo, al terminar un discipulado no lo marca disponible automáticamente).
2. **Given** un Discipulador que sabe que no va a estar disponible en un rango de fechas futuro (ej. vacaciones), **When** carga un período de no disponibilidad con fecha de inicio y fin, **Then** el sistema deja de mostrarlo como disponible en ese listado durante ese rango, sin afectar los discipulados que ya tiene asignados.
3. **Given** un período de no disponibilidad que ya venció (la fecha de fin ya pasó), **When** llega esa fecha, **Then** el sistema vuelve a considerarlo disponible (si el toggle manual sigue activado) sin que el Discipulador tenga que acordarse de reactivarlo.
4. **Given** un Discipulador cargando un período de no disponibilidad, **When** ingresa una fecha de fin anterior a la de inicio, **Then** el sistema rechaza el período con un mensaje claro.
5. **Given** un Discipulador que tiene discipulados ya asignados, **When** se marca no disponible o carga un período de no disponibilidad, **Then** eso solo afecta si aparece para *nuevas* asignaciones — no lo desvincula de los discipulados que ya tiene en curso.

---

### User Story 5 - Registrar el avance de los encuentros (Priority: P2)

Un Discipulador que se reúne periódicamente con su discípulo quiere dejar un registro de cada encuentro (cuándo fue, qué capítulos del libro vieron, alguna nota si hace falta), para tener un historial del progreso — y que el Admin pueda hacer seguimiento del avance, sin leer las notas (D134).

**Why this priority**: Es el corazón operativo del discipulado ya en marcha — sin esto, un discipulado asignado no deja ningún rastro de que efectivamente está pasando. Depende de que exista la Historia 3 (tiene que haber un Grupo con Persona y Discipulador ya asignados).

**Independent Test**: Puede probarse por completo haciendo que un Discipulador con un discipulado asignado registre un encuentro con fecha y capítulos vistos, y verificando que él lo ve con sus notas y que el Admin ve el seguimiento (fecha y capítulos) sin las notas (D134).

**Acceptance Scenarios**:

1. **Given** un Discipulador con un discipulado asignado, **When** registra un encuentro, **Then** puede cargar la fecha, los capítulos del libro vistos, y notas opcionales.
2. **Given** varios encuentros ya registrados para un discipulado, **When** el Discipulador los consulta, **Then** ve el historial completo en orden, con sus notas, como registro del progreso.
6. **Given** un discipulado con Encuentros registrados, **When** el Admin o el Pastor lo consultan desde la vista administrativa de discipulados, **Then** ven quién discipula a quién, desde cuándo, cuántos Encuentros hubo, cuándo y qué capítulos se vieron — **sin el texto de las notas**, que queda solo para el Discipulador (D134).
3. **Given** un discipulado asignado a un Discipulador, **When** ese Discipulador consulta los datos de contacto de la Persona (teléfono, dirección) para coordinar el próximo encuentro, **Then** el sistema se los muestra.
4. **Given** un Discipulador con sesión iniciada, **When** intenta ver encuentros o datos de contacto de un discipulado que no es suyo, **Then** el sistema se lo impide.
5. **Given** que Vida Nueva no libera contenido digital por cronograma, **When** se registra o consulta un encuentro, **Then** el sistema no ofrece ni exige nada relacionado con liberación programada de contenido — solo el registro histórico de la reunión.

---

### User Story 6 - Proponer y confirmar la finalización del discipulado (Priority: P2)

Un Discipulador que considera que ya recorrió con su discípulo todo el contenido de Vida Nueva quiere poder proponer que se dé por terminado, y un Admin quiere poder confirmar esa finalización, para que el sistema refleje que esa etapa quedó cerrada y la Persona puede avanzar a lo que sigue.

**Why this priority**: Cierra el ciclo de vida del discipulado, pero un discipulado puede estar en curso durante meses antes de llegar a este paso — no bloquea el valor de las Historias anteriores mientras tanto.

**Independent Test**: Puede probarse por completo haciendo que un Discipulador proponga la finalización de un discipulado, que el Admin la confirme, y verificando que la Inscripción de esa Persona queda marcada como completada.

**Acceptance Scenarios**:

1. **Given** un discipulado en curso, **When** el Discipulador considera terminado el proceso, **Then** puede proponer la finalización del Grupo.
2. **Given** una finalización propuesta, **When** el Admin la revisa, **Then** puede confirmarla.
3. **Given** que el Admin confirma la finalización, **When** se confirma, **Then** la Inscripción de la Persona en ese Grupo pasa a completada.
4. **Given** que un discipulado terminó de esta forma, **When** se confirma su finalización, **Then** el sistema NO activa "Apto para Ministerio" para esa Persona — esa activación es exclusiva de Vida de Servicio.
5. **Given** una finalización todavía no propuesta por el Discipulador, **When** cualquiera intenta confirmarla, **Then** el sistema no lo permite — la propuesta tiene que existir primero.
6. **Given** una finalización propuesta, **When** el Admin no está de acuerdo y la rechaza (con un motivo opcional), **Then** el discipulado vuelve a estar en curso, la Inscripción no cambia, el Discipulador ve que la propuesta fue rechazada y el motivo si lo hay, y puede volver a proponerla más adelante.

---

### Edge Cases

- ¿Qué pasa si una Persona que ya tiene una Solicitud de Discipulado pendiente, o una Inscripción activa/completada en Vida Nueva, pide empezarlo de nuevo? (ver Historia 1, Acceptance Scenarios 3-4).
- ¿Qué pasa si, al momento de aprobar, no queda ningún Discipulador disponible para elegir? (ver Historia 3, Acceptance Scenario 5).
- ¿Qué pasa si el Admin rechaza una Solicitud de Discipulado? ¿Puede la Persona volver a pedirlo? (ver Historia 3, Acceptance Scenario 6).
- ¿Qué pasa si un Discipulador con discipulados ya asignados se marca no disponible o carga un período de no disponibilidad? (no pierde lo que ya tiene asignado — ver Historia 4, Acceptance Scenario 5).
- ¿Qué pasa si dos períodos de no disponibilidad de un mismo Discipulador se superponen en fechas? Se permiten: el Discipulador no está disponible en cualquier fecha que caiga dentro de al menos uno de sus períodos (ver Assumptions).
- ¿Qué pasa si se necesita cambiar al Discipulador ya asignado a un discipulado en curso (por ejemplo, porque dejó de poder continuar)? El Admin lo reasigna (FR-030, Clarificación 2026-09-27): elige otro del listado de FR-006, el historial de Encuentros se conserva y el Discipulador anterior pierde el acceso a ese discipulado.
- ¿Qué pasa si el Admin intenta quitarle el rol `discipulador` a alguien con discipulados asignados? **Resuelto por el spec 005** (FR-009 y SC-009 de `specs/005-roles-permisos-acceso/spec.md`), no por este: la quita se bloquea mientras tenga discipulados activos, con un mensaje que nombra cuáles. Lo que le toca a **este** spec es aportar la consulta de "discipulados activos de una Persona" que esa guarda necesita: hoy `puedeQuitarRol` (`packages/shared-types/src/permisos.ts`) rechaza **siempre** la quita de `discipulador` porque esa consulta no existe (falla cerrada, H-127, motivo `DISCIPULADOR_SIN_VERIFICACION_DE_DISCIPULADOS_ACTIVOS`). Cuando este spec la construya, la guarda pasa a bloquear solo a quien de verdad tiene discipulados activos.
- ¿Qué pasa si el Discipulador intenta proponer la finalización de un discipulado que no es el suyo? El sistema se lo impide, igual que registrar Encuentros o ver datos de contacto de un discipulado ajeno (Historia 5, escenario 4): solo el Discipulador del Liderazgo vigente del Grupo puede proponer. El Admin confirma o rechaza sobre el Grupo mismo, así que no hay un "discipulado ajeno a la Solicitud" posible (ver Assumptions).
- ¿Qué pasa con una Persona sin acceso a la app (D97) mientras su discipulado avanza? No ve nada ella misma — el Admin y el Discipulador son quienes hacen todo el seguimiento en su nombre. Si más adelante consigue acceso (por ejemplo, entra con Google usando el email cargado, D97/D35), ve su estado igual que cualquier Persona (FR-026 a FR-028), incluida la Solicitud que se creó en su nombre (Clarificación 2026-09-27).

## Fuera de alcance

- **Cronograma y Contenido**: son exclusivos de cursos con modalidad `liberacion_programada` (Vida de Servicio). Vida Nueva usa Encuentro para el registro de avance, no libera contenido digital por semana.
- **Activación de "Apto para Ministerio"**: exclusiva de la finalización de Vida de Servicio. La finalización de Vida Nueva no otorga ese rol — solo habilita, fuera del sistema por ahora, avanzar a los pasos siguientes (bautismo, Vida de Servicio).
- **Completitud Manual**: existe para destrabar un prerrequisito bloqueado (marcar que una Persona completó un curso sin pasar por el flujo normal). Vida Nueva no tiene ningún prerrequisito propio, así que este mecanismo no aplica acá — corresponde a Vida de Servicio (que sí tiene a Vida Nueva como prerrequisito).
- **Envío real de notificaciones**: la aprobación o el rechazo de una Solicitud de Discipulado deja lista la información para disparar un aviso a la Persona interesada (ver Historia 3, Acceptance Scenario 7), pero el sistema de Notificaciones (armado del mensaje, envío push/email) es una funcionalidad aparte, no construida acá.
- **Vida de Servicio, Ministerios, Bautismo y Eventos**: quedan completamente fuera — sus propios flujos, entidades y pantallas no forman parte de este spec.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir que una Persona con sesión iniciada, que no tenga ya una Solicitud de Discipulado pendiente de revisión ni una Inscripción activa o completada en un curso de Vida Nueva, cree una Solicitud de Discipulado en estado pendiente de revisión.
- **FR-002**: El sistema DEBE permitir que un Admin o un Discipulador creen una Solicitud de Discipulado en nombre de una Persona que no tiene acceso propio a la app, dejando registrado quién la creó (D97).
- **FR-003**: El sistema DEBE permitir que un Admin revise una Solicitud de Discipulado pendiente y la apruebe o la rechace.
- **FR-004**: Cuando el Admin aprueba una Solicitud de Discipulado, el sistema DEBE crear un Grupo nuevo del curso de Vida Nueva e inscribir en él a la Persona que originó la Solicitud.
- **FR-005**: Cuando el Admin aprueba una Solicitud de Discipulado, el sistema DEBE permitirle asignar un Discipulador a ese Grupo, eligiéndolo manualmente del listado de FR-006 — el sistema no elige ni sugiere ninguno automáticamente (D25). Quién puede aprobar y asignar se declara como permiso en el catálogo compartido (`CATALOGO_PERMISOS`, `packages/shared-types/src/permisos.ts`, D132), no como un chequeo de rol propio de este spec (FR-013 del 005).
- **FR-006**: El listado de Discipuladores que el sistema le ofrece al Admin para elegir en FR-005 DEBE incluir únicamente a Personas que **ya tienen otorgado el rol de cargo `discipulador`** en `Persona.rol` **y** que están marcadas como disponibles para un discipulado nuevo **y** no tienen, a la fecha de hoy, un período de no disponibilidad vigente. El rol lo otorga el Admin con el mecanismo del spec 005 (`RolesService.otorgarRol` en `apps/api/src/persona/roles.service.ts`, desde el panel de roles de `apps/backoffice/src/app/personas/`), independientemente de cualquier asignación de Grupo (D131, lo que rompe la circularidad de H-125). Este spec no agrega ninguna otra vía para ser Discipulador: tener el rol de cargo es la única condición de rol del listado. La exclusión de menores ya la garantiza el otorgamiento (FR-011 del 005), así que el listado no la repite.
- **FR-007**: El sistema DEBE indicarle al Admin, de forma explícita, si el listado de FR-006 no tiene ningún Discipulador disponible, en vez de mostrar una lista vacía sin explicación.
- **FR-008**: Cuando el Admin rechaza una Solicitud de Discipulado, el sistema DEBE dejarla registrada como rechazada, sin crear ningún Grupo ni Inscripción, y NO DEBE impedirle a esa Persona volver a crear una Solicitud más adelante.
- **FR-009**: El sistema DEBE permitir que un Discipulador con al menos un discipulado asignado registre, para cada encuentro con su discípulo, la fecha, los capítulos del libro físico vistos, y notas opcionales.
- **FR-010**: El sistema DEBE mostrarle al Discipulador el historial completo de Encuentros de sus propios discipulados, con sus notas. Al Admin y al Pastor, en la vista administrativa de discipulados, les DEBE mostrar el seguimiento — quién discipula a quién, desde cuándo, cuántos Encuentros hubo, cuándo y qué capítulos se vieron — y NO DEBE mostrarles el texto de las notas (D134).
- **FR-011**: El sistema DEBE mostrarle a un Discipulador los datos de contacto (teléfono, dirección) únicamente de las Personas de sus propios discipulados asignados, y NO DEBE mostrarle los de discipulados asignados a otros Discipuladores.
- **FR-012**: El sistema NO DEBE ofrecer liberación de contenido digital por cronograma para Vida Nueva — el registro de encuentros (FR-009) es el único mecanismo de seguimiento de avance.
- **FR-013**: El sistema DEBE registrar una Asistencia (presente/ausente) de la Persona por cada Encuentro, también en la variante individual — no alcanza con la existencia del Encuentro para inferir presencia, porque de lo contrario una falta (el Discipulador se presentó y el discípulo no) no tendría forma de quedar registrada, e `Inscripción.dada_de_baja` por exceso de faltas (docs/04-dominio-entidades.md) quedaría sin insumo.
- **FR-013a**: Al registrar un Encuentro individual, la Asistencia de la Persona DEBE quedar marcada como presente por defecto; marcarla ausente DEBE ser una acción de un solo paso, sin exigirle al Discipulador completar un formulario de asistencia separado para el caso trivial (una sola Persona).
- **FR-014**: El sistema DEBE dar soporte, en este spec, únicamente a Vida Nueva **individual** (discipulado 1 a 1) — la variante grupal (D44) queda para un spec posterior. Esto es una restricción de **alcance**: el vínculo entre una Persona y su Grupo de discipulado NO DEBE modelarse como uno a uno a nivel de datos (ver Key Entities, Grupo/Inscripción) aunque en el camino feliz de esta variante todo Grupo termine teniendo exactamente una Persona inscripta — modelarlo como uno a uno obligaría a una migración cuando se agregue la variante grupal, que es justo lo que D44 dice que no debería hacer falta.
- **FR-015**: El sistema DEBE permitir que un Discipulador alterne manualmente si está disponible para tomar un discipulado nuevo, sin que el sistema se lo cambie automáticamente en ningún momento (ni siquiera al finalizar uno de sus discipulados existentes).
- **FR-016**: El sistema DEBE permitir que un Discipulador cree un período de no disponibilidad con fecha de inicio y fin, que deje de considerarlo disponible (a los efectos de FR-006) durante ese rango, y que vuelva a considerarlo disponible automáticamente al pasar la fecha de fin, sin que tenga que reactivarse manualmente.
- **FR-017**: El sistema DEBE rechazar, con un mensaje claro, un período de no disponibilidad cuya fecha de fin sea anterior a su fecha de inicio.
- **FR-018**: El estado de disponibilidad de un Discipulador (toggle o período de no disponibilidad) NO DEBE afectar los discipulados que ya tiene asignados — solo determina si aparece disponible para *nuevas* asignaciones (FR-006).
- **FR-019**: El sistema DEBE permitir que un Discipulador proponga la finalización de un discipulado en curso, y que un Admin confirme o rechace esa propuesta.
- **FR-019a**: Cuando el Admin rechaza una finalización propuesta, el sistema DEBE devolver el discipulado a "en curso" sin tocar la Inscripción, guardar el motivo si el Admin lo cargó, mostrarle al Discipulador que la propuesta fue rechazada (con el motivo, si lo hay), y permitirle volver a proponerla más adelante.
- **FR-020**: El sistema NO DEBE permitir confirmar la finalización de un discipulado que no fue previamente propuesta por su Discipulador.
- **FR-021**: Cuando el Admin confirma la finalización de un discipulado, el sistema DEBE pasar la Inscripción de esa Persona a completada.
- **FR-022**: El sistema NO DEBE activar "Apto para Ministerio" para una Persona como consecuencia de la finalización de un discipulado de Vida Nueva.
- **FR-023**: El sistema DEBE dejar registrada la información necesaria para que la aprobación o el rechazo de una Solicitud de Discipulado, en el futuro, dispare un aviso a la Persona dueña de esa Solicitud — sin construir el envío de ese aviso como parte de esta funcionalidad (queda la costura, no el sistema de notificaciones).
- **FR-024**: Las pantallas del backoffice de un Discipulador (sus discipulados asignados, su gestión de disponibilidad) DEBEN exigir una sesión iniciada con el rol correspondiente — ninguna de las dos puede quedar accesible sin sesión, a diferencia de sus versiones actuales de placeholder.
- **FR-025**: El sistema DEBE mostrarle al Admin, en la bandeja de Solicitudes del backoffice, un listado **genérico** de Solicitudes con las columnas de la forma base común a los cuatro tipos documentados (persona, estado, fecha, revisado_por, creado_por), con filtrado y orden — aunque hoy solo el tipo Discipulado esté conectado a datos reales. El listado DEBE admitir filtrar por tipo de Solicitud a nivel de estructura, pero el control de filtro NO DEBE mostrarse en la interfaz mientras exista un solo tipo conectado (un filtro de una sola opción no aporta nada).
- **FR-025a**: La **resolución** de una Solicitud (qué sucede al aprobarla o rechazarla) DEBE quedar específica del tipo Discipulado en este spec — el sistema NO DEBE construir una abstracción genérica de "qué hacer al aprobar" a partir de un único tipo real conectado; esa generalización se hace cuando exista un segundo tipo con el que contrastar.
- **FR-026**: El sistema DEBE mostrarle a la Persona el estado de su propia Solicitud de Discipulado (pendiente de revisión / aprobada / rechazada) (H-126), también cuando la Solicitud la creó otra persona en su nombre (FR-002) — la vista es la misma para todas las Personas con acceso a la app; una Persona sin acceso (D97) no tiene vista propia.
- **FR-027**: Una vez aprobada la Solicitud, el sistema DEBE mostrarle a la Persona que su discipulado está en curso y quién es el Discipulador que le fue asignado.
- **FR-028**: Cuando se confirma la finalización de un discipulado, el sistema DEBE mostrarle a la Persona que ese proceso terminó.
- **FR-029**: El sistema NO DEBE mostrarle a la Persona las notas que su Discipulador cargó en cada Encuentro — son un registro de seguimiento pastoral solo para el Discipulador (D134), no un informe para la persona discipulada. Mostrarle otro dato del avance (ej. los capítulos vistos) queda fuera de este spec, como una decisión aparte y explícita todavía no tomada.
- **FR-030**: El sistema DEBE permitir que un Admin reasigne el Discipulador de un discipulado en curso, eligiendo al nuevo del listado de FR-006. Al reasignar: los Encuentros y Asistencias ya registrados quedan en el Grupo; queda registrado quién era el Discipulador anterior, quién el nuevo, quién hizo el cambio y cuándo; y el Discipulador anterior deja de tener acceso a ese discipulado y a los datos de contacto de la Persona (FR-011). La Persona ve a su nuevo Discipulador (FR-027).

### Key Entities *(include if feature involves data)*

- **Solicitud de Discipulado**: el pedido de una Persona (o de un Admin/Discipulador en su nombre) para empezar Vida Nueva. Tiene un estado (pendiente / aprobada / rechazada), queda vinculada a la Persona interesada, y registra quién la creó cuando no fue la propia Persona (D97). Al aprobarse, da origen a un Grupo.
- **Curso**: la plantilla de "Vida Nueva" que se instancia en cada Grupo. Define que su modalidad es de seguimiento por encuentros (material físico), no de liberación programada de contenido.
- **Grupo**: la instancia concreta de un discipulado — nace al aprobarse una Solicitud. Tiene un estado, y puede tener una finalización propuesta, que el Admin confirma o rechaza (FR-019a: al rechazarse vuelve a "en curso" y se puede volver a proponer). Un Grupo admite una o más Inscripciones (D44, FR-014): en la variante individual de este spec, cada Grupo tiene exactamente una, pero el vínculo Grupo–Inscripción NO se modela como uno a uno — es lo que permite que la futura variante grupal (fuera de alcance acá) se sume como otro `Curso.tipo` sin una migración de datos.
- **Inscripción**: vincula a la Persona con su Grupo de discipulado. Tiene un estado (activa / completada, entre otros posibles) — pasa a completada cuando se confirma la finalización del Grupo.
- **Liderazgo**: vincula al Discipulador con el Grupo que le fue asignado. Una reasignación (FR-030) cierra el Liderazgo vigente y abre uno nuevo, sin borrar el anterior: así queda registrado quién lideró el Grupo y hasta cuándo.
- **Encuentro**: el registro de una reunión entre el Discipulador y su discípulo — fecha, capítulos vistos, notas opcionales (las notas las ve solo el Discipulador, D134). Es el mecanismo central de seguimiento de avance en Vida Nueva.
- **Asistencia**: registro de presente/ausente de una Persona en un Encuentro puntual — se registra siempre, también en la variante individual (FR-013), como presente por defecto (FR-013a). Es el insumo que permite dar de baja una Inscripción por exceso de faltas.
- **Disponibilidad del Discipulador**: combina un toggle manual (si el Discipulador está dispuesto a tomar un discipulado nuevo) con períodos de no disponibilidad por rango de fechas — determina quién aparece en el listado que ve el Admin al asignar (FR-006).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una Persona puede pedir empezar Vida Nueva sin necesitar ayuda presencial de nadie del equipo de la iglesia.
- **SC-002**: Un Admin puede revisar, aprobar y asignar Discipulador a una Solicitud de Discipulado en una sola sesión de trabajo, sin necesitar consultar información fuera del sistema para saber quién está disponible.
- **SC-003**: Cero casos en los que un Discipulador vea datos de contacto de una Persona que no es su propio discipulado asignado.
- **SC-004**: El 100% de los discipulados cuya finalización confirma el Admin quedan con su Inscripción en completada, sin que "Apto para Ministerio" se active como efecto de ese cierre.
- **SC-005**: Un Discipulador puede actualizar su propia disponibilidad (toggle o período de no disponibilidad) sin depender de que el Admin se lo cambie por él.
- **SC-006**: El 100% de las aprobaciones o rechazos de una Solicitud de Discipulado dejan registrada la información necesaria para disparar, en el futuro, el aviso correspondiente a la Persona interesada.
- **SC-007**: El 100% de las Personas con una Solicitud de Discipulado resuelta (aprobada o rechazada) puede conocer ese resultado dentro de la app, sin depender de que alguien se lo comunique (H-126).

## Assumptions

- Cómo se otorga el rol de cargo Discipulador YA está construido — no por este spec, sino por D131 y el spec 005 (cerrado en `16ec1a7`): el Admin lo otorga y lo quita desde el panel de roles de `apps/backoffice/src/app/personas/`, contra `RolesService` (`apps/api/src/persona/roles.service.ts`), cada cambio queda auditado por `apps/api/src/cambio-de-rol/`, y no se le otorga a menores (FR-011 del 005). Este spec lo usa como está (ver Cierre 2026-09-23 en Clarifications).
- El catálogo del Curso "Vida Nueva" (su plantilla, con su modalidad de seguimiento por encuentros) ya existe como dato de referencia del sistema — este spec no cubre una pantalla para crear o editar cursos, solo el ciclo de vida de Solicitudes/Grupos/Inscripciones que lo usan.
- El libro físico "Vida Nueva" y su entrega en la primera reunión ocurren fuera de la app — el sistema no rastrea inventario ni entrega de material físico, solo el registro de que la reunión ocurrió.
- La coordinación de horarios y el encuentro en sí ocurren fuera de la app (por teléfono, en persona); el sistema solo provee los datos de contacto necesarios para coordinarlo.
- Los períodos de no disponibilidad de un mismo Discipulador pueden superponerse: no se rechazan ni se fusionan, y basta con que una fecha caiga dentro de uno para que no esté disponible. Rechazarlos obligaría a editar uno para cargar el otro, sin ganar nada.
- Solo el Discipulador del Liderazgo vigente de un Grupo puede proponer su finalización, registrar Encuentros y ver los datos de contacto de la Persona. Después de una reasignación (FR-030) eso pasa al nuevo Discipulador.
- La Persona no puede retirar su propia Solicitud pendiente desde la app: si cambia de idea, lo resuelve el Admin rechazándola (FR-008 le permite volver a pedirla después). Retirarla queda para cuando haya un caso real.
- La reasignación de un Discipulador en un discipulado en curso la hace el Admin (FR-030); no hay traspaso pedido por el propio Discipulador. Qué pasa al quitarle el rol Discipulador a alguien con discipulados activos a su cargo lo resolvió el spec 005 (FR-009/SC-009): se bloquea. Este spec aporta la consulta de discipulados activos que esa guarda necesita (ver Edge Cases, H-127).
