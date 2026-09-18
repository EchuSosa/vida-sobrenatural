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

### Session 2026-09-17 — actualización post-decisiones D91–D105 (spec 002-base-transversal ya implementado)

- Q: El contenido de Bienvenida y de Sede, ¿dónde vive ahora que existe la navegación de 002-base-transversal? → A: En las rutas `/primeros-pasos` y `/visitanos` (D91, D92) — los nombres visibles del proceso de integración pasan a ser "Primeros pasos" (sección pública) y "Mi camino" (sección privada), en vez de la nomenclatura interna "Bienvenida"; el modelo de datos no cambia. Las rutas viejas `/bienvenida` y `/sede` ya no existen, sin redirección (decisión ya tomada en 002-base-transversal).
- Q: El contenido de Historia 1, ¿sigue siendo texto de relleno? → A: No — pasa a usar el copy real de `docs/12-contenido-bienvenida.md` (D98), ajustado a los nombres de sección nuevos. La sección "En qué creemos" y las fotos del equipo pastoral/templo quedan como placeholders marcados explícitamente como pendientes (el texto doctrinal y las fotos reales todavía no existen — D98 exige no inventarlos).
- Q: El formulario de registro de Historia 2, ¿sigue siendo una sola pantalla larga? → A: No — se divide en pasos cortos con indicador de progreso ("Paso 2 de 4"), posibilidad de volver a un paso anterior sin perder lo ya cargado, y un resumen final antes de enviar (D94, `docs/15-guia-ux-ui.md`).
- Q: ¿Alcanza con que el proveedor SSO entregue un email para vincular la cuenta a una Persona existente? → A: No — la cuenta solo se vincula (o crea una Persona nueva) si el proveedor confirma que ese email está verificado (`email_verified`); si no lo está, el sistema rechaza el inicio de sesión en vez de vincular o registrar (Constitución Principio V, ampliada en D105).
- Q: El consentimiento de datos (FR-013) y el alta de la Persona, ¿quedan con más detalle que un booleano? → A: Sí — se registra la fecha y el origen del consentimiento (`app` cuando lo da la propia persona en el formulario, `presencial` cuando lo da el tutor durante el contacto manual), y el origen del alta (`origen_alta`: `autorregistro` / `admin`) con quién la dio de alta (`alta_por`) cuando corresponda (D97). En esta actualización solo se agrega el modelo de datos para `origen_alta`/`alta_por`; el flujo de alta de adultos por un Admin es una feature propia, todavía sin implementar — por ahora `origen_alta` siempre queda en `autorregistro` y `alta_por` siempre queda vacío.
- Q: Los errores del registro y de la gestión de Sede, ¿tienen su propio formato? → A: No — usan el catálogo de códigos compartido y el formato Problem Details que ya definió 002-base-transversal (D101), con mensajes amables según la matriz de feedback de `docs/16-sistemas-transversales.md`; no se inventa un mecanismo de error propio para esta fase.

### Session 2026-09-18 — revisión manual, Lote 1 (`specs/revision-manual/2026-09-17-001-002.md`)

- Q: Al completar el registro, ¿cuándo se entera el resto de la app (el menú, un nuevo intento de entrar a `/registro`) de que la Persona ya está `activa`? (H-19) → A: De inmediato, en la misma pestaña — el frontend refresca su sesión apenas `POST /personas` confirma `estado: activa`, sin esperar un cierre e inicio de sesión nuevo.
- Q: ¿Alcanza con que `/registro/listo` muestre la confirmación a cualquier sesión con `estado: activa`? (H-15) → A: No — debe distinguir a quien acaba de completar el registro de cualquier Miembro registrado que entre por esa URL en otro momento; sin sesión, o sin haber completado el registro recién, redirige en vez de mostrar una confirmación falsa.
- Q: Cuando `/registro` redirige a `/primeros-pasos` porque la Persona ya está `activa` (edge case ya identificado), ¿el salto queda silencioso? (H-16) → A: No — la redirección muestra un aviso breve que explica el motivo ("Ya estás registrada, no hace falta completarlo de nuevo").

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entender la Bienvenida y ver la información de mi Sede (Priority: P1)

Un Visitante que se acerca por primera vez a Vida Sobrenatural quiere entender, sin tener que preguntarle a nadie en persona, qué es "la Bienvenida" y cuál es la información de la Sede a la que se acercó (dónde queda, cómo contactarla, qué sigue), para no depender de anuncios presenciales, WhatsApp o Instagram dispersos.

**Why this priority**: Es el problema central del spec: hoy esta información está fragmentada y genera una barrera real, en especial para personas tímidas. Sin esto, ninguna otra parte del flujo tiene sentido.

**Independent Test**: Puede probarse por completo dejando que un Visitante, sin ninguna cuenta ni ayuda de otra persona, acceda al contenido de Bienvenida y visualice la información completa de la Sede correspondiente.

**Acceptance Scenarios**:

1. **Given** un Visitante sin cuenta que llega por primera vez, **When** accede al contenido de "Primeros pasos", **Then** ve una explicación clara de qué es la Bienvenida (con el copy real de `docs/12-contenido-bienvenida.md`) y cómo continúa el proceso de integración (Primeros pasos → Vida Nueva → Vida de Servicio → Ministerio) en términos generales.
2. **Given** un Visitante que se acercó a una Sede específica, **When** consulta "Visitanos", **Then** ve sus datos (nombre, dirección, contacto, horarios) sin necesidad de preguntarle a un miembro del equipo.
3. **Given** que actualmente solo existe una Sede, **When** el Visitante accede al contenido, **Then** el sistema le muestra directamente la información de esa única Sede, sin pasos de selección innecesarios.
4. **Given** un Visitante que llega a "Primeros pasos", **When** el contenido menciona la declaración de fe de la iglesia o incluye fotos del equipo/templo, **Then** ve un placeholder marcado explícitamente como pendiente ("En qué creemos: pendiente" / "foto pendiente") en vez de contenido inventado — D98.

**Nota de implementación (actualización 2026-09-17, D91/D92/D98)**: el contenido de esta Historia vive en `/primeros-pasos` y `/visitanos` (nombres visibles definidos por 002-base-transversal), no en `/bienvenida`/`/sede`. Usa el copy real de `docs/12-contenido-bienvenida.md`: Hero, "Somos Familia", "¿Cómo sigue el proceso?", "Queremos conocerte", "Te esperamos" (horario/dirección/YouTube), "Palabra Profética 2026", "Liderazgo" (tres parejas pastorales) y redes/contacto de pie de página. La sección "En qué creemos" y las fotos reales (equipo pastoral, templo, gente) quedan como placeholders pendientes — D98 exige no inventar una declaración de fe ni fotos.

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
6. **Given** un Visitante completando el formulario obligatorio, **When** avanza de un paso al siguiente, **Then** ve un indicador de progreso ("Paso X de Y"), puede volver a un paso anterior sin perder lo ya cargado, y antes de enviar ve un resumen de todos los datos ingresados (D94).
7. **Given** un Visitante que autoriza el acceso con una cuenta SSO cuyo proveedor **no** confirma el email como verificado, **When** el sistema evalúa esa autorización, **Then** rechaza el inicio de sesión (no vincula con una Persona existente ni permite iniciar el registro), sin importar si el email coincide con una Persona ya registrada.
8. **Given** un Visitante que acaba de completar el registro (`estado: activa`), **When** el sistema confirma el registro, **Then** su sesión queda al día en esa misma pestaña de inmediato — el menú y el resto de la app ya no lo tratan como Visitante sin cuenta, sin necesitar cerrar e iniciar sesión de nuevo (actualización 2026-09-18).
9. **Given** un Visitante que acaba de completar el registro, **When** llega a la pantalla de confirmación, **Then** ve "¡Listo, ya sos parte!" solo en esa oportunidad; si más tarde alguien (la misma Persona u otra) entra directamente a esa URL sin haber completado el registro en ese momento, el sistema la lleva a `/registro` o al Inicio en su lugar, nunca a una confirmación falsa (actualización 2026-09-18).

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
- ¿Qué sucede si una persona que ya es Miembro registrado vuelve a acceder al contenido de Bienvenida o al formulario de registro? → Redirige a Primeros pasos con un aviso breve que explica por qué (ver Historia 2, Acceptance Scenario 8-9 — actualización 2026-09-18).
- Cuando exista más de una Sede: ¿cómo identifica el sistema a cuál Sede se acercó un Visitante determinado si no lo indica explícitamente?
- ¿Qué pasa si dos Visitantes distintos intentan registrarse casi al mismo tiempo con el mismo email recibido del proveedor SSO?
- ¿Qué sucede si un Admin elimina o desactiva la única Sede activa, dejando a los Visitantes sin información de Sede para mostrar?
- ¿Qué pasa si el tutor de un menor en estado pendiente_tutor no autoriza el registro o nunca puede ser contactado? (ver Historia 2b, Acceptance Scenario 5).
- ¿Qué ve un Visitante si el proveedor SSO no confirma el email como verificado? (ver Historia 2, Acceptance Scenario 7 — actualización 2026-09-17).
- ¿Qué pasa si un Visitante completa dos o tres pasos del formulario por pasos y cierra la pestaña antes de llegar al resumen final? (no debe quedar una Persona a medio crear — mismo principio que el edge case de abandono ya existente, ahora aplicado a un formulario con más de una pantalla).

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
- **FR-013**: El sistema DEBE solicitar el consentimiento explícito para el almacenamiento de datos personales al momento del registro, y DEBE registrar la fecha y el origen de ese consentimiento (`app` cuando lo da la propia persona en el formulario online, `presencial` cuando lo da el tutor durante el contacto manual). Si la persona es mayor de 18 años, ese consentimiento lo da ella misma en el formulario (origen `app`). Si es menor de 18 años (estado pendiente_tutor), el consentimiento definitivo lo da el tutor durante el contacto manual con el Admin/Discipulador (origen `presencial`), no el menor al completar el formulario online.
- **FR-014**: El sistema DEBE permitir que un usuario con rol Admin o Discipulador marque como inactiva (flag `activo` = false) una Persona en estado pendiente_tutor cuando el tutor no autoriza el registro o no puede ser contactado, sin eliminar el registro físicamente de la base de datos.
- **FR-015** *(actualización 2026-09-17, D97)*: El sistema DEBE registrar el origen del alta de cada Persona (`origen_alta`: `autorregistro` cuando se crea vía el flujo SSO de esta fase, `admin` cuando la crea un Admin/Discipulador desde el backoffice) y, cuando el origen es `admin`, quién la dio de alta (`alta_por`). En esta fase el sistema solo modela estos campos — el flujo de alta de una Persona adulta por un Admin (D97) es una feature propia, fuera de alcance de esta actualización; toda Persona creada por este spec queda con `origen_alta: autorregistro` y `alta_por` vacío.
- **FR-016** *(actualización 2026-09-17, D94)*: El sistema DEBE presentar el formulario de registro obligatorio (FR-006) dividido en pasos cortos, con un indicador de progreso visible, la posibilidad de volver a un paso anterior sin perder los datos ya cargados en pasos posteriores, y un resumen de todos los datos ingresados antes de enviar el registro definitivo.
- **FR-017** *(actualización 2026-09-17, Constitución Principio V ampliada por D105)*: El sistema DEBE vincular una cuenta SSO a una Persona existente (o permitir iniciar el flujo de registro de una Persona nueva) únicamente si el proveedor SSO confirma que el email recibido está verificado (`email_verified`); si el proveedor no lo confirma, el sistema DEBE rechazar el inicio de sesión sin vincular ni crear ninguna Persona.
- **FR-018** *(actualización 2026-09-17, D101)*: Todo error que devuelvan los endpoints de Persona y de Sede DEBE seguir el formato único de errores (código del catálogo compartido + `requestId`) ya definido por 002-base-transversal, y el frontend DEBE mostrar un mensaje amable según ese código, siguiendo la matriz de feedback de `docs/16-sistemas-transversales.md` — esta fase no define un mecanismo de error propio.
- **FR-019** *(actualización 2026-09-18, revisión manual H-19)*: Apenas `POST /personas` confirme `estado: activa`, el sistema DEBE refrescar la sesión de esa misma pestaña antes de continuar, de forma que el menú y el resto de la app reflejen de inmediato que la Persona ya no es un Visitante sin cuenta.
- **FR-020** *(actualización 2026-09-18, revisión manual H-15)*: La pantalla de confirmación del registro DEBE exigir una sesión con `estado: activa` **y** evidencia de que el registro se completó en ese mismo momento; sin ambas condiciones, el sistema DEBE redirigir (a `/registro` sin sesión válida, al Inicio si la sesión es válida pero el registro no fue recién completado) en lugar de mostrar la confirmación.
- **FR-021** *(actualización 2026-09-18, revisión manual H-16)*: Cuando el sistema redirige desde el formulario de registro por tratarse de una Persona ya `activa`, DEBE mostrar un aviso breve que explique el motivo, en vez de una redirección silenciosa.

### Key Entities *(include if feature involves data)*

- **Persona**: Representa a un individuo que interactúa con la iglesia. Se crea al autorizar el acceso vía SSO (recibiendo email y nombre básico de ese proveedor, solo si el proveedor confirma el email como verificado — FR-017) y se completa con: apellido, nombre, género, fecha de nacimiento, teléfono, dirección, Sede asociada, estado civil, profesión, tiempo congregándose, y consentimiento de datos. El email recibido del proveedor SSO es el único dato de contacto que debe ser único entre Personas; el teléfono no lo es. Atributo `estado`: **activa** (registro completo, mayor de edad, opera como Miembro registrado y puede iniciar sesión) o **pendiente_tutor** (detectado como menor de 18 años durante el registro; visible para el Admin, sin acceso hasta que un Admin/Discipulador la active manualmente). Atributo `activo` (flag de soft delete, ver Constitución del proyecto): se pone en `false` cuando un Admin/Discipulador determina que un caso pendiente_tutor no debe activarse (tutor no autoriza o no puede ser contactado), sin agregar un tercer valor a `estado`. Una Persona pertenece a una única Sede en esta fase.
  - *(actualización 2026-09-17, FR-013, FR-015)*: además de `consentimientoDatos` (booleano), registra la **fecha** y el **origen** (`app` / `presencial`) en que se dio ese consentimiento, y el **origen del alta** (`origen_alta`: `autorregistro` / `admin`) junto con **quién la dio de alta** (`alta_por`) cuando el origen es `admin`. En esta fase, toda Persona se crea con `origen_alta: autorregistro` — el flujo de alta por Admin (D97) es una feature propia, todavía no implementada; solo se agrega el modelo de datos para no requerir una migración adicional cuando esa feature exista.
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
