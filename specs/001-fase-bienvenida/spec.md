# Feature Specification: Fase de Bienvenida para Visitantes

**Feature Branch**: `001-fase-bienvenida`

**Created**: 2026-09-15

**Status**: Draft

**Input**: User description: "Fase de Bienvenida para recién llegados de la iglesia Vida Sobrenatural (La Plata). Problema: hoy la información crítica para un Visitante que se acerca por primera vez (a quién contactar, qué pasos seguir, cómo sigue el proceso de integración) está fragmentada entre anuncios presenciales, WhatsApp e Instagram, lo que genera una barrera real, especialmente para quienes son tímidos. Objetivo de esta fase: que un Visitante pueda, sin depender de preguntarle a alguien en persona, entender qué es la Bienvenida, ver la información de la Sede a la que se acercó, y dar el primer paso para registrarse como Miembro registrado dentro del proceso de integración (Bienvenida → Vida Nueva → Vida de Servicio → Ministerio). Actores: Visitante (usuario sin registrar o recién registrado), Miembro registrado, Admin (gestiona la información de Sede). Entidades: Persona, Sede. Fuera de alcance: Vida Nueva, Vida de Servicio, Ministerio y sus flujos exclusivos."

## Clarifications

### Session 2026-09-15

- Q: Además del email que llega del proveedor SSO, ¿el sistema también debe impedir el registro si el teléfono ingresado ya pertenece a otra Persona existente? → A: No — la deduplicación es únicamente por el email recibido del proveedor SSO; el teléfono no se valida como único (dos Personas, ej. familiares, pueden compartir uno legítimamente).
- Q: Si un Admin/Discipulador contacta al tutor de un menor en estado pendiente_tutor y el tutor no autoriza (o nunca se lo puede contactar), ¿cómo debería quedar esa Persona en el sistema? → A: Se marca como inactiva usando el flag `activo` (el mismo mecanismo de soft delete exigido por la Constitución del proyecto); no se agrega un nuevo valor al atributo `estado`.
- Q: Para un Visitante menor de 18 años (que queda en pendiente_tutor), ¿quién debe dar el consentimiento de almacenamiento de datos personales (FR-013)? → A: El tutor, durante el contacto manual con el Admin/Discipulador — no el menor al completar el formulario online.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entender la Bienvenida y ver la información de mi Sede (Priority: P1)

Un Visitante que se acerca por primera vez a Vida Sobrenatural quiere entender, sin tener que preguntarle a nadie en persona, qué es "la Bienvenida" y cuál es la información de la Sede a la que se acercó (dónde queda, cómo contactarla, qué sigue), para no depender de anuncios presenciales, WhatsApp o Instagram dispersos.

**Why this priority**: Es el problema central del spec: hoy esta información está fragmentada y genera una barrera real, en especial para personas tímidas. Sin esto, ninguna otra parte del flujo tiene sentido.

**Independent Test**: Puede probarse por completo dejando que un Visitante, sin ninguna cuenta ni ayuda de otra persona, acceda al contenido de Bienvenida y visualice la información completa de la Sede correspondiente.

**Acceptance Scenarios**:

1. **Given** un Visitante sin cuenta que llega por primera vez, **When** accede al contenido de Bienvenida, **Then** ve una explicación clara de qué es la Bienvenida y cómo continúa el proceso de integración (Bienvenida → Vida Nueva → Vida de Servicio → Ministerio) en términos generales.
2. **Given** un Visitante que se acercó a una Sede específica, **When** consulta la información de esa Sede, **Then** ve sus datos (nombre, dirección, contacto, horarios) sin necesidad de preguntarle a un miembro del equipo.
3. **Given** que actualmente solo existe una Sede, **When** el Visitante accede al contenido, **Then** el sistema le muestra directamente la información de esa única Sede, sin pasos de selección innecesarios.

---

### User Story 2 - Dar el primer paso para registrarme como Miembro registrado vía SSO (Priority: P2)

Un Visitante que ya entendió la Bienvenida quiere dar el primer paso del proceso de integración autorizando el acceso con su cuenta de un proveedor externo (por ejemplo, Google) y completando el formulario de datos obligatorio, para quedar registrado como Miembro registrado sin tener que crear ni recordar una contraseña propia.

**Why this priority**: Es el objetivo de conversión de esta fase: convertir a un Visitante anónimo en un Miembro registrado con cuenta propia, habilitando el resto del proceso de integración. Depende de que la Historia 1 ya exista (el Visitante necesita entender qué es la Bienvenida antes de registrarse).

**Independent Test**: Puede probarse por completo haciendo que un Visitante mayor de edad autorice el acceso con su cuenta de un proveedor externo, complete el formulario obligatorio (apellido, nombre, género, fecha de nacimiento, teléfono, dirección, Sede, estado civil, profesión y tiempo congregándose), y verificando que su Persona queda en estado activa, asociada a la Sede correspondiente, como Miembro registrado.

**Acceptance Scenarios**:

1. **Given** un Visitante sin cuenta que decide registrarse, **When** autoriza el acceso con su cuenta de un proveedor externo (SSO), **Then** el sistema recibe su email y nombre básico desde ese proveedor y le solicita completar el formulario de datos obligatorio antes de considerarlo registrado.
2. **Given** un Visitante que ya autorizó el acceso vía SSO y es mayor de 18 años, **When** completa el formulario obligatorio con apellido, nombre, género, fecha de nacimiento, teléfono, dirección, Sede, estado civil, profesión y tiempo congregándose, **Then** el sistema crea su Persona en estado activa, la asocia a la Sede indicada y su rol pasa de Visitante a Miembro registrado.
3. **Given** un Miembro registrado (estado activa), **When** vuelve a acceder al sistema en otro momento, **Then** puede iniciar sesión autorizando nuevamente el acceso con la misma cuenta del proveedor externo, sin necesitar un usuario/contraseña propios.
4. **Given** un Visitante que intenta autorizar el acceso con una cuenta cuyo email ya pertenece a una Persona existente, **When** el sistema detecta la coincidencia, **Then** no crea una Persona duplicada e informa la situación en lugar de generar un registro nuevo.
5. **Given** un Visitante que completa el registro exitosamente, **When** el registro es exitoso, **Then** el sistema no lo redirige ni le exige avanzar a Vida Nueva, Vida de Servicio o Ministerio (eso pertenece a fases posteriores).

---

### User Story 2b - Registro de un Visitante menor de 18 años (Priority: P2)

Un Visitante menor de 18 años que autoriza el acceso vía SSO y completa el formulario de registro no puede quedar auto-registrado como Miembro registrado sin supervisión: el sistema detecta su edad a partir de la fecha de nacimiento, corta el auto-registro, y deja el caso visible para que un Admin o Discipulador lo gestione manualmente contactando a un tutor.

**Why this priority**: Es una rama obligatoria del mismo flujo de registro (Historia 2): sin este control, el sistema permitiría el auto-registro de menores sin ningún tipo de supervisión. Es un límite conocido y aceptado que se mitiga con seguimiento manual del Admin, no con verificación de identidad.

**Independent Test**: Puede probarse por completo haciendo que un Visitante complete el formulario de registro con una fecha de nacimiento que indique menos de 18 años, y verificando que su Persona queda en estado pendiente_tutor, visible para el Admin, sin poder iniciar sesión hasta que un Admin/Discipulador la active manualmente.

**Acceptance Scenarios**:

1. **Given** un Visitante que autorizó el acceso vía SSO y completa el formulario de registro, **When** la fecha de nacimiento ingresada indica que es menor de 18 años, **Then** el sistema corta el auto-registro, crea la Persona en estado pendiente_tutor, y no le otorga acceso al sistema.
2. **Given** una Persona en estado pendiente_tutor, **When** esa persona intenta iniciar sesión, **Then** el sistema le deniega el acceso hasta que su estado sea activado manualmente.
3. **Given** una Persona en estado pendiente_tutor, **When** un Admin o Discipulador revisa los casos pendientes, **Then** puede ver los datos de contacto disponibles para comunicarse con un tutor y decidir si activa la cuenta.
4. **Given** que un Admin/Discipulador contactó a un tutor y decide continuar, **When** activa manualmente la cuenta, **Then** el estado de la Persona pasa de pendiente_tutor a activa y esa persona puede iniciar sesión normalmente como Miembro registrado.
5. **Given** una Persona en estado pendiente_tutor, **When** un Admin/Discipulador determina que el tutor no autoriza el registro o no logra contactarlo, **Then** marca esa Persona como inactiva (flag `activo` = false) para sacarla de la cola de casos pendientes, sin eliminarla físicamente de la base de datos.

---

### User Story 3 - Gestionar la información de la Sede (Priority: P3)

Un Admin quiere poder cargar y mantener actualizada la información de la Sede (o de las Sedes, a futuro) que ven los Visitantes, sin depender de que alguien modifique el sistema por ellos.

**Why this priority**: Sin esta capacidad, la información que resuelve la Historia 1 no podría mantenerse actualizada en el tiempo. Es de menor prioridad inmediata porque, para el lanzamiento inicial, la información de la única Sede existente puede cargarse una sola vez, pero es necesaria para la sostenibilidad de la funcionalidad.

**Independent Test**: Puede probarse por completo haciendo que un Admin cree o edite la información de una Sede y verificando que los cambios se reflejan en lo que ve un Visitante.

**Acceptance Scenarios**:

1. **Given** un Admin autenticado, **When** crea o edita los datos de una Sede (nombre, dirección, contacto, horarios, descripción), **Then** los cambios quedan guardados y disponibles para que los Visitantes los vean.
2. **Given** un usuario que no tiene rol de Admin, **When** intenta acceder a la gestión de Sedes, **Then** el sistema le deniega el acceso.
3. **Given** que en el futuro se agregue una segunda Sede, **When** el Admin la crea, **Then** el sistema permite tener más de una Sede activa simultáneamente sin afectar la información de las Sedes existentes.

---

### Edge Cases

- ¿Qué ve un Visitante si el Admin todavía no cargó la información de ninguna Sede?
- ¿Qué sucede si un Visitante autoriza el acceso vía SSO pero abandona el formulario de datos obligatorio antes de completarlo? (No debe quedar una Persona a medio crear ni un estado ambiguo).
- ¿Qué sucede si una persona que ya es Miembro registrado vuelve a acceder al contenido de Bienvenida o al formulario de registro?
- Cuando exista más de una Sede: ¿cómo identifica el sistema a cuál Sede se acercó un Visitante determinado si no lo indica explícitamente?
- ¿Qué pasa si dos Visitantes distintos intentan registrarse casi al mismo tiempo con el mismo email recibido del proveedor SSO?
- ¿Qué sucede si un Admin elimina o desactiva la única Sede activa, dejando a los Visitantes sin información de Sede para mostrar?
- ¿Qué pasa si el tutor de un menor en estado pendiente_tutor no autoriza el registro o nunca puede ser contactado? (ver Historia 2b, Acceptance Scenario 5).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar, sin exigir inicio de sesión, contenido explicativo sobre qué es la Bienvenida y cómo continúa el proceso de integración (Bienvenida → Vida Nueva → Vida de Servicio → Ministerio) a nivel general, sin detallar el contenido propio de esas fases posteriores.
- **FR-002**: El sistema DEBE mostrar la información de la Sede correspondiente (nombre, dirección, contacto, horarios) a cualquier Visitante, sin que este necesite preguntarle a una persona del equipo.
- **FR-003**: El sistema DEBE soportar el registro y mantenimiento de una o más Sedes como entidades independientes, aun cuando hoy solo exista una.
- **FR-004**: Cuando exista más de una Sede activa, el sistema DEBE ofrecer al Visitante una manera de identificar o elegir la Sede correspondiente a su visita antes de mostrarle esa información.
- **FR-005**: El sistema DEBE permitir que un Visitante inicie su registro autorizando el acceso mediante un proveedor externo de inicio de sesión (SSO), a través del cual recibe el email y el nombre básico de la persona; el sistema NO DEBE pedirle a la persona que cree o recuerde una contraseña propia.
- **FR-006**: El sistema DEBE exigir, luego de la autorización SSO, la finalización de un formulario obligatorio con apellido, nombre, género, fecha de nacimiento, teléfono, dirección, Sede, estado civil, profesión y tiempo congregándose, antes de considerar completo el registro.
- **FR-007**: El sistema DEBE calcular la edad de la persona a partir de la fecha de nacimiento ingresada; si es mayor o igual a 18 años, DEBE crear la Persona en estado activa, asociarla a la Sede indicada en el formulario, y cambiar su rol de Visitante a Miembro registrado; si es menor de 18 años, DEBE cortar el auto-registro y crear la Persona en estado pendiente_tutor.
- **FR-008**: El sistema DEBE impedir que una Persona en estado pendiente_tutor inicie sesión, y DEBE permitir que un usuario con rol Admin o Discipulador la active manualmente (pasándola a estado activa) luego de haber contactado a un tutor.
- **FR-009**: El sistema DEBE impedir la creación de una Persona duplicada cuando el email recibido del proveedor SSO ya pertenece a una Persona existente, e informar la situación en lugar de crear un registro nuevo. El teléfono ingresado en el formulario NO se valida como único (distintas Personas, por ejemplo integrantes de una misma familia, pueden compartir el mismo teléfono legítimamente).
- **FR-010**: El sistema DEBE permitir a un usuario con rol Admin crear, editar y visualizar la información de cada Sede que se muestra a los Visitantes.
- **FR-011**: El sistema DEBE restringir la creación y edición de la información de Sede exclusivamente a usuarios con rol Admin.
- **FR-012**: El sistema NO DEBE exponer contenido, enlaces o flujos propios de Vida Nueva, Vida de Servicio o Ministerio dentro de esta fase de Bienvenida.
- **FR-013**: El sistema DEBE solicitar el consentimiento explícito para el almacenamiento de datos personales al momento del registro. Si la persona es mayor de 18 años, ese consentimiento lo da ella misma en el formulario. Si es menor de 18 años (estado pendiente_tutor), el consentimiento definitivo lo da el tutor durante el contacto manual con el Admin/Discipulador, no el menor al completar el formulario online.
- **FR-014**: El sistema DEBE permitir que un usuario con rol Admin o Discipulador marque como inactiva (flag `activo` = false) una Persona en estado pendiente_tutor cuando el tutor no autoriza el registro o no puede ser contactado, sin eliminar el registro físicamente de la base de datos.

### Key Entities *(include if feature involves data)*

- **Persona**: Representa a un individuo que interactúa con la iglesia. Se crea al autorizar el acceso vía SSO (recibiendo email y nombre básico de ese proveedor) y se completa con: apellido, nombre, género, fecha de nacimiento, teléfono, dirección, Sede asociada, estado civil, profesión, tiempo congregándose, y consentimiento de datos. El email recibido del proveedor SSO es el único dato de contacto que debe ser único entre Personas; el teléfono no lo es. Atributo `estado`: **activa** (registro completo, mayor de edad, opera como Miembro registrado y puede iniciar sesión) o **pendiente_tutor** (detectado como menor de 18 años durante el registro; visible para el Admin, sin acceso hasta que un Admin/Discipulador la active manualmente). Atributo `activo` (flag de soft delete, ver Constitución del proyecto): se pone en `false` cuando un Admin/Discipulador determina que un caso pendiente_tutor no debe activarse (tutor no autoriza o no puede ser contactado), sin agregar un tercer valor a `estado`. Una Persona pertenece a una única Sede en esta fase.
- **Sede**: Representa una locación/congregación de Vida Sobrenatural. Atributos clave: nombre, dirección, información de contacto, horarios, descripción/contenido de Bienvenida específico de esa Sede. Una Sede puede tener asociadas muchas Personas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un Visitante nuevo puede encontrar qué es la Bienvenida y la información de su Sede en menos de 2 minutos, sin pedirle ayuda a otra persona.
- **SC-002**: Un Visitante puede completar el registro como Miembro registrado en menos de 3 minutos.
- **SC-003**: Al menos el 90% de los Visitantes que inician el flujo de registro lo completan sin necesitar ayuda presencial de otra persona.
- **SC-004**: El 100% de los registros de Personas mayores de edad (estado activa) otorgan acceso inmediato (inicio de sesión) al nuevo Miembro registrado, sin pasos manuales adicionales por parte del equipo de la iglesia; los casos de menores de edad quedan documentados como pendientes para gestión manual del Admin, en lugar de generar un acceso automático.
- **SC-005**: Un Admin puede actualizar la información visible de una Sede sin depender de intervención técnica externa, y el cambio se refleja para los Visitantes en el mismo día.
- **SC-006**: Cero registros duplicados de Persona para un mismo email (el recibido del proveedor SSO) a lo largo del tiempo.

## Assumptions

- Aunque hoy Vida Sobrenatural La Plata tiene una única Sede, el modelo de datos y el flujo se diseñan para soportar más de una Sede en el futuro.
- Cuando exista más de una Sede, cada una contará con un punto de acceso identificable (por ejemplo, un enlace o código propio) para que el Visitante llegue directamente a la información de "su" Sede; el mecanismo concreto se definirá en la fase de planificación técnica, no en este spec.
- "Registrarse como Miembro registrado" implica autorizar el acceso mediante un proveedor externo de inicio de sesión (SSO, ej. Google); el sistema no le pide a la persona crear ni recordar una contraseña propia. El detalle de qué proveedores se soportan es una decisión técnica que se define en la fase de planificación, no en este spec.
- Los datos obligatorios solicitados en el formulario de registro son: apellido, nombre, género, fecha de nacimiento, teléfono, dirección, Sede, estado civil, profesión y tiempo congregándose, además del email y nombre básico recibidos del proveedor SSO.
- El control de menores de edad se basa en la fecha de nacimiento autoinformada por la persona; el sistema no realiza una verificación de identidad real sobre ese dato, en línea con el nivel de verificación de otras aplicaciones similares del mercado.
- El contenido de Bienvenida y la información de Sede son de acceso público, sin necesidad de iniciar sesión.
- El seguimiento posterior del Miembro registrado en las etapas de Vida Nueva, Vida de Servicio y Ministerio corresponde a fases futuras y no está cubierto por este spec.
