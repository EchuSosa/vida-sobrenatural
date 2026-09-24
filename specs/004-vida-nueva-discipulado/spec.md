# Feature Specification: Vida Nueva / Discipulado

**Feature Branch**: `004-vida-nueva-discipulado`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "Vida Nueva / Discipulado — la tajada vertical siguiente al spec 001 (Fase de Bienvenida) en el proceso de integración Bienvenida → Vida Nueva → Vida de Servicio → Ministerio. Una Persona ya registrada que quiere empezar Vida Nueva no tiene hoy ningún camino en el sistema para pedirlo, ni el Admin una forma de asignarle un Discipulador, ni el Discipulador un lugar donde registrar el avance de los encuentros ni gestionar su propia disponibilidad para tomar nuevos discipulados. Cubre: Solicitud de Discipulado (creada por la Persona, o en su nombre si no tiene acceso a la app), aprobación por el Admin (que crea el Grupo y asigna Persona y Discipulador), el listado de Discipuladores disponibles que ve el Admin al asignar, registro de Encuentros por el Discipulador, propuesta de finalización y confirmación, y gestión de disponibilidad del Discipulador (toggle + Bloqueos por fecha). Fuera de alcance: Cronograma/Contenido, activación de apto_ministerio, Completitud Manual, el envío real de notificaciones, y Vida de Servicio/Ministerios/Bautismo/Eventos."

## Clarifications

*(Ningún punto resuelto todavía — ver los tres marcadores `[NEEDS CLARIFICATION]` en Requisitos Funcionales. Se resuelven en una sesión de `/speckit.clarify` aparte antes de `/speckit.plan`.)*

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

### User Story 2 - Aprobar la Solicitud y armar el Grupo (Priority: P1)

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

---

### User Story 3 - Gestionar mi disponibilidad para tomar discipulados (Priority: P2)

Un Discipulador quiere poder avisar cuándo está en condiciones de tomar un discipulado nuevo y cuándo no (por ejemplo, mientras está de vacaciones), sin tener que pedirle a nadie que se lo cambie por él.

**Why this priority**: Es lo que le da sentido real al listado filtrado de la Historia 2 — sin una forma de que el propio Discipulador la mantenga al día, esa información queda vieja o inventada. No es, sin embargo, parte de la puerta de entrada: un discipulado ya en curso no depende de esto.

**Independent Test**: Puede probarse por completo haciendo que un Discipulador alterne su disponibilidad y cree un período de no disponibilidad con fecha de inicio y fin, y verificando que esos cambios se reflejan de inmediato en el listado que ve el Admin al asignar.

**Acceptance Scenarios**:

1. **Given** un Discipulador con sesión iniciada, **When** entra a su pantalla de disponibilidad, **Then** puede alternar manualmente si está disponible para tomar un discipulado nuevo o no — el sistema nunca lo cambia solo (por ejemplo, al terminar un discipulado no lo marca disponible automáticamente).
2. **Given** un Discipulador que sabe que no va a estar disponible en un rango de fechas futuro (ej. vacaciones), **When** carga un período de no disponibilidad con fecha de inicio y fin, **Then** el sistema deja de mostrarlo como disponible en ese listado durante ese rango, sin afectar los discipulados que ya tiene asignados.
3. **Given** un período de no disponibilidad que ya venció (la fecha de fin ya pasó), **When** llega esa fecha, **Then** el sistema vuelve a considerarlo disponible (si el toggle manual sigue activado) sin que el Discipulador tenga que acordarse de reactivarlo.
4. **Given** un Discipulador cargando un período de no disponibilidad, **When** ingresa una fecha de fin anterior a la de inicio, **Then** el sistema rechaza el período con un mensaje claro.
5. **Given** un Discipulador que tiene discipulados ya asignados, **When** se marca no disponible o carga un período de no disponibilidad, **Then** eso solo afecta si aparece para *nuevas* asignaciones — no lo desvincula de los discipulados que ya tiene en curso.

---

### User Story 4 - Registrar el avance de los encuentros (Priority: P2)

Un Discipulador que se reúne periódicamente con su discípulo quiere dejar un registro de cada encuentro (cuándo fue, qué capítulos del libro vieron, alguna nota si hace falta), para tener un historial del progreso y que el Admin también pueda hacer seguimiento si lo necesita.

**Why this priority**: Es el corazón operativo del discipulado ya en marcha — sin esto, un discipulado asignado no deja ningún rastro de que efectivamente está pasando. Depende de que exista la Historia 2 (tiene que haber un Grupo con Persona y Discipulador ya asignados).

**Independent Test**: Puede probarse por completo haciendo que un Discipulador con un discipulado asignado registre un encuentro con fecha y capítulos vistos, y verificando que ese registro queda visible tanto para él como para el Admin.

**Acceptance Scenarios**:

1. **Given** un Discipulador con un discipulado asignado, **When** registra un encuentro, **Then** puede cargar la fecha, los capítulos del libro vistos, y notas opcionales.
2. **Given** varios encuentros ya registrados para un discipulado, **When** el Discipulador o el Admin los consultan, **Then** ven el historial completo en orden, como registro del progreso.
3. **Given** un discipulado asignado a un Discipulador, **When** ese Discipulador consulta los datos de contacto de la Persona (teléfono, dirección) para coordinar el próximo encuentro, **Then** el sistema se los muestra.
4. **Given** un Discipulador con sesión iniciada, **When** intenta ver encuentros o datos de contacto de un discipulado que no es suyo, **Then** el sistema se lo impide.
5. **Given** que Vida Nueva no libera contenido digital por cronograma, **When** se registra o consulta un encuentro, **Then** el sistema no ofrece ni exige nada relacionado con liberación programada de contenido — solo el registro histórico de la reunión.

---

### User Story 5 - Proponer y confirmar la finalización del discipulado (Priority: P2)

Un Discipulador que considera que ya recorrió con su discípulo todo el contenido de Vida Nueva quiere poder proponer que se dé por terminado, y un Admin quiere poder confirmar esa finalización, para que el sistema refleje que esa etapa quedó cerrada y la Persona puede avanzar a lo que sigue.

**Why this priority**: Cierra el ciclo de vida del discipulado, pero un discipulado puede estar en curso durante meses antes de llegar a este paso — no bloquea el valor de las Historias anteriores mientras tanto.

**Independent Test**: Puede probarse por completo haciendo que un Discipulador proponga la finalización de un discipulado, que el Admin la confirme, y verificando que la Inscripción de esa Persona queda marcada como completada.

**Acceptance Scenarios**:

1. **Given** un discipulado en curso, **When** el Discipulador considera terminado el proceso, **Then** puede proponer la finalización del Grupo.
2. **Given** una finalización propuesta, **When** el Admin la revisa, **Then** puede confirmarla.
3. **Given** que el Admin confirma la finalización, **When** se confirma, **Then** la Inscripción de la Persona en ese Grupo pasa a completada.
4. **Given** que un discipulado terminó de esta forma, **When** se confirma su finalización, **Then** el sistema NO activa "Apto para Ministerio" para esa Persona — esa activación es exclusiva de Vida de Servicio.
5. **Given** una finalización todavía no propuesta por el Discipulador, **When** cualquiera intenta confirmarla, **Then** el sistema no lo permite — la propuesta tiene que existir primero.

---

### Edge Cases

- ¿Qué pasa si una Persona que ya tiene una Solicitud de Discipulado pendiente, o una Inscripción activa/completada en Vida Nueva, pide empezarlo de nuevo? (ver Historia 1, Acceptance Scenarios 3-4).
- ¿Qué pasa si, al momento de aprobar, no queda ningún Discipulador disponible para elegir? (ver Historia 2, Acceptance Scenario 5).
- ¿Qué pasa si el Admin rechaza una Solicitud de Discipulado? ¿Puede la Persona volver a pedirlo? (ver Historia 2, Acceptance Scenario 6).
- ¿Qué pasa si un Discipulador con discipulados ya asignados se marca no disponible o carga un período de no disponibilidad? (no pierde lo que ya tiene asignado — ver Historia 3, Acceptance Scenario 5).
- ¿Qué pasa si dos períodos de no disponibilidad de un mismo Discipulador se superponen en fechas?
- ¿Qué pasa si se necesita cambiar al Discipulador ya asignado a un discipulado en curso (por ejemplo, porque dejó de poder continuar)? El camino feliz documentado no contempla una reasignación — queda sin resolver en este spec.
- ¿Qué pasa si un Discipulador deja de tener ese rol (por ejemplo, deja la iglesia) mientras tiene discipulados asignados? Tampoco está contemplado en el camino feliz documentado.
- ¿Qué pasa si el Discipulador intenta proponer la finalización de un discipulado que no es el suyo, o el Admin intenta confirmar una finalización de un discipulado ajeno a la Solicitud original?
- ¿Qué pasa con una Persona sin acceso a la app (D97) mientras su discipulado avanza? No ve nada ella misma — el Admin y el Discipulador son quienes hacen todo el seguimiento en su nombre.

## Fuera de alcance

- **Cronograma y Contenido**: son exclusivos de cursos con modalidad `liberacion_programada` (Vida de Servicio). Vida Nueva usa Encuentro para el registro de avance, no libera contenido digital por semana.
- **Activación de "Apto para Ministerio"**: exclusiva de la finalización de Vida de Servicio. La finalización de Vida Nueva no otorga ese rol — solo habilita, fuera del sistema por ahora, avanzar a los pasos siguientes (bautismo, Vida de Servicio).
- **Completitud Manual**: existe para destrabar un prerrequisito bloqueado (marcar que una Persona completó un curso sin pasar por el flujo normal). Vida Nueva no tiene ningún prerrequisito propio, así que este mecanismo no aplica acá — corresponde a Vida de Servicio (que sí tiene a Vida Nueva como prerrequisito).
- **Envío real de notificaciones**: la aprobación o el rechazo de una Solicitud de Discipulado deja lista la información para disparar un aviso a la Persona interesada (ver Historia 2, Acceptance Scenario 7), pero el sistema de Notificaciones (armado del mensaje, envío push/email) es una funcionalidad aparte, no construida acá.
- **Vida de Servicio, Ministerios, Bautismo y Eventos**: quedan completamente fuera — sus propios flujos, entidades y pantallas no forman parte de este spec.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir que una Persona con sesión iniciada, que no tenga ya una Solicitud de Discipulado pendiente de revisión ni una Inscripción activa o completada en un curso de Vida Nueva, cree una Solicitud de Discipulado en estado pendiente de revisión.
- **FR-002**: El sistema DEBE permitir que un Admin o un Discipulador creen una Solicitud de Discipulado en nombre de una Persona que no tiene acceso propio a la app, dejando registrado quién la creó (D97).
- **FR-003**: El sistema DEBE permitir que un Admin revise una Solicitud de Discipulado pendiente y la apruebe o la rechace.
- **FR-004**: Cuando el Admin aprueba una Solicitud de Discipulado, el sistema DEBE crear un Grupo nuevo del curso de Vida Nueva e inscribir en él a la Persona que originó la Solicitud.
- **FR-005**: Cuando el Admin aprueba una Solicitud de Discipulado, el sistema DEBE permitirle asignar un Discipulador a ese Grupo, eligiéndolo manualmente de un listado — el sistema no elige ni sugiere ninguno automáticamente (D25).
- **FR-006**: El listado de Discipuladores que el sistema le ofrece al Admin para elegir en FR-005 DEBE incluir únicamente a quienes están marcados como disponibles para un discipulado nuevo y no tienen, a la fecha de hoy, un período de no disponibilidad vigente.
- **FR-007**: El sistema DEBE indicarle al Admin, de forma explícita, si el listado de FR-006 no tiene ningún Discipulador disponible, en vez de mostrar una lista vacía sin explicación.
- **FR-008**: Cuando el Admin rechaza una Solicitud de Discipulado, el sistema DEBE dejarla registrada como rechazada, sin crear ningún Grupo ni Inscripción, y NO DEBE impedirle a esa Persona volver a crear una Solicitud más adelante.
- **FR-009**: El sistema DEBE permitir que un Discipulador con al menos un discipulado asignado registre, para cada encuentro con su discípulo, la fecha, los capítulos del libro físico vistos, y notas opcionales.
- **FR-010**: El sistema DEBE mostrar, tanto al Discipulador como al Admin, el historial completo de encuentros registrados de un discipulado.
- **FR-011**: El sistema DEBE mostrarle a un Discipulador los datos de contacto (teléfono, dirección) únicamente de las Personas de sus propios discipulados asignados, y NO DEBE mostrarle los de discipulados asignados a otros Discipuladores.
- **FR-012**: El sistema NO DEBE ofrecer liberación de contenido digital por cronograma para Vida Nueva — el registro de encuentros (FR-009) es el único mecanismo de seguimiento de avance.
- **FR-013**: El sistema DEBE registrar, para un curso de Vida Nueva, si además de un Encuentro se toma Asistencia por Persona [NEEDS CLARIFICATION: la documentación (docs/04-dominio-entidades.md) dice que las dos variantes de Vida Nueva (individual y grupal) comparten "la misma regla de asistencia/faltas", pero en un discipulado 1 a 1 la asistencia es trivialmente una sola persona presente o ausente. Opción A — registrar Asistencia explícita también en el caso individual, por consistencia de modelo con la variante grupal (que sí la necesita) y para no bifurcar la lógica de faltas entre las dos variantes. Opción B — que el Encuentro alcance por sí solo para el caso individual (si el Discipulador lo registró, se asume presente) y la Asistencia explícita solo exista para la variante grupal. Implica, en A, un paso extra siempre presente aunque sea trivial en el 1 a 1; en B, dos caminos de datos ligeramente distintos entre variantes].
- **FR-014**: El sistema DEBE dar soporte a Vida Nueva en su variante [NEEDS CLARIFICATION: ¿solo individual (discipulado 1 a 1), o también grupal? Son dos registros de Curso distintos (misma maquinaria de Grupo/Inscripción/Encuentro) — docs/04-dominio-entidades.md documenta ambas. Opción A — solo individual en este spec; la grupal (que implica varios inscriptos por Grupo, donde la Asistencia deja de ser trivial y hace falta, por ejemplo, un cupo o gestión de altas/bajas del grupo) queda para un spec posterior. Opción B — cubrir las dos variantes desde ahora, ya que comparten la misma maquinaria de datos y evitar hacerlo dos veces. Implica, en A, un alcance más chico y enfocado en el caso ya descripto en el camino feliz; en B, sumar requisitos propios de la dinámica grupal (cupo, altas/bajas de varios inscriptos, Asistencia no trivial) que hoy no están detallados en este documento].
- **FR-015**: El sistema DEBE permitir que un Discipulador alterne manualmente si está disponible para tomar un discipulado nuevo, sin que el sistema se lo cambie automáticamente en ningún momento (ni siquiera al finalizar uno de sus discipulados existentes).
- **FR-016**: El sistema DEBE permitir que un Discipulador cree un período de no disponibilidad con fecha de inicio y fin, que deje de considerarlo disponible (a los efectos de FR-006) durante ese rango, y que vuelva a considerarlo disponible automáticamente al pasar la fecha de fin, sin que tenga que reactivarse manualmente.
- **FR-017**: El sistema DEBE rechazar, con un mensaje claro, un período de no disponibilidad cuya fecha de fin sea anterior a su fecha de inicio.
- **FR-018**: El estado de disponibilidad de un Discipulador (toggle o período de no disponibilidad) NO DEBE afectar los discipulados que ya tiene asignados — solo determina si aparece disponible para *nuevas* asignaciones (FR-006).
- **FR-019**: El sistema DEBE permitir que un Discipulador proponga la finalización de un discipulado en curso, y que un Admin confirme esa propuesta.
- **FR-020**: El sistema NO DEBE permitir confirmar la finalización de un discipulado que no fue previamente propuesta por su Discipulador.
- **FR-021**: Cuando el Admin confirma la finalización de un discipulado, el sistema DEBE pasar la Inscripción de esa Persona a completada.
- **FR-022**: El sistema NO DEBE activar "Apto para Ministerio" para una Persona como consecuencia de la finalización de un discipulado de Vida Nueva.
- **FR-023**: El sistema DEBE dejar registrada la información necesaria para que la aprobación o el rechazo de una Solicitud de Discipulado, en el futuro, dispare un aviso a la Persona dueña de esa Solicitud — sin construir el envío de ese aviso como parte de esta funcionalidad (queda la costura, no el sistema de notificaciones).
- **FR-024**: Las pantallas del backoffice de un Discipulador (sus discipulados asignados, su gestión de disponibilidad) DEBEN exigir una sesión iniciada con el rol correspondiente — ninguna de las dos puede quedar accesible sin sesión, a diferencia de sus versiones actuales de placeholder.
- **FR-025**: El sistema DEBE mostrarle al Admin, en la bandeja de Solicitudes del backoffice, las Solicitudes de Discipulado pendientes de revisión, con la información necesaria para aprobarlas o rechazarlas [NEEDS CLARIFICATION: la documentación (docs/04-dominio-entidades.md, docs/14-navegacion.md) describe una bandeja unificada futura para los cuatro tipos de Solicitud (Discipulado, Bautismo, Postulación a Ministerio, Inscripción a Evento), compartiendo a propósito una forma base. Opción A — construir la bandeja de forma genérica desde ahora (filtro por tipo incluido), aunque hoy solo tenga un tipo real conectado (Discipulado). Opción B — construir algo específico de Discipulado en esta etapa, y generalizarlo recién cuando se agregue el segundo tipo de Solicitud. Implica, en A, más trabajo ahora para una forma que hoy no tiene con qué mostrar su generalidad; en B, un posible rediseño de esa pantalla cuando llegue el segundo tipo].

### Key Entities *(include if feature involves data)*

- **Solicitud de Discipulado**: el pedido de una Persona (o de un Admin/Discipulador en su nombre) para empezar Vida Nueva. Tiene un estado (pendiente / aprobada / rechazada), queda vinculada a la Persona interesada, y registra quién la creó cuando no fue la propia Persona (D97). Al aprobarse, da origen a un Grupo.
- **Curso**: la plantilla de "Vida Nueva" que se instancia en cada Grupo. Define que su modalidad es de seguimiento por encuentros (material físico), no de liberación programada de contenido.
- **Grupo**: la instancia concreta de un discipulado — nace al aprobarse una Solicitud. Tiene un estado, y puede tener una finalización propuesta y luego confirmada.
- **Inscripción**: vincula a la Persona con su Grupo de discipulado. Tiene un estado (activa / completada, entre otros posibles) — pasa a completada cuando se confirma la finalización del Grupo.
- **Liderazgo**: vincula al Discipulador con el Grupo que le fue asignado.
- **Encuentro**: el registro de una reunión entre el Discipulador y su discípulo — fecha, capítulos vistos, notas opcionales. Es el mecanismo central de seguimiento de avance en Vida Nueva.
- **Asistencia**: registro de presente/ausente de una Persona en un Encuentro puntual — su rol exacto en el caso individual de Vida Nueva está sujeto al FR-013 sin resolver.
- **Disponibilidad del Discipulador**: combina un toggle manual (si el Discipulador está dispuesto a tomar un discipulado nuevo) con períodos de no disponibilidad por rango de fechas — determina quién aparece en el listado que ve el Admin al asignar (FR-006).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una Persona puede pedir empezar Vida Nueva sin necesitar ayuda presencial de nadie del equipo de la iglesia.
- **SC-002**: Un Admin puede revisar, aprobar y asignar Discipulador a una Solicitud de Discipulado en una sola sesión de trabajo, sin necesitar consultar información fuera del sistema para saber quién está disponible.
- **SC-003**: Cero casos en los que un Discipulador vea datos de contacto de una Persona que no es su propio discipulado asignado.
- **SC-004**: El 100% de los discipulados cuya finalización confirma el Admin quedan con su Inscripción en completada, sin que "Apto para Ministerio" se active como efecto de ese cierre.
- **SC-005**: Un Discipulador puede actualizar su propia disponibilidad (toggle o período de no disponibilidad) sin depender de que el Admin se lo cambie por él.
- **SC-006**: El 100% de las aprobaciones o rechazos de una Solicitud de Discipulado dejan registrada la información necesaria para disparar, en el futuro, el aviso correspondiente a la Persona interesada.

## Assumptions

- El rol Discipulador ya existe como concepto de roles/permisos del sistema (docs/03-roles-permisos.md); este spec no define cómo se le otorga ese rol a una Persona por primera vez más allá de que surge de ser elegida como tal al asignar un Grupo (D25) — no hay, en el camino feliz documentado, una pantalla separada de "otorgar rol Discipulador" previa a la primera asignación.
- El catálogo del Curso "Vida Nueva" (su plantilla, con su modalidad de seguimiento por encuentros) ya existe como dato de referencia del sistema — este spec no cubre una pantalla para crear o editar cursos, solo el ciclo de vida de Solicitudes/Grupos/Inscripciones que lo usan.
- El libro físico "Vida Nueva" y su entrega en la primera reunión ocurren fuera de la app — el sistema no rastrea inventario ni entrega de material físico, solo el registro de que la reunión ocurrió.
- La coordinación de horarios y el encuentro en sí ocurren fuera de la app (por teléfono, en persona); el sistema solo provee los datos de contacto necesarios para coordinarlo.
- Este spec no resuelve la reasignación de un Discipulador ya asignado a un discipulado en curso, ni qué pasa si un Discipulador deja de tener ese rol con discipulados activos a su cargo (ver Edge Cases) — quedan como casos sin resolver, no como parte del camino feliz.
