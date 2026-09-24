# Feature Specification: Roles, permisos y acceso al backoffice

**Feature Branch**: `005-roles-permisos-acceso`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "Roles, permisos y acceso al backoffice — la capa de plataforma que todas las features siguientes van a usar. Hoy el mecanismo existe (Persona.rol como arreglo, RolesGuard, @Roles) pero nadie puede otorgar un rol desde la app, y la matriz de quién puede qué está escrita dos veces — 18 decoradores @Roles en la API y repetida a mano en una decena de archivos del backoffice — sin ninguna fuente común. Basado en D130 (una instalación por iglesia, sin multi-inquilino), D131 (roles de cargo otorgados por el Admin vs. roles de estado escritos por el sistema, Admin sembrado indegradable + comando de recrear Admin) y D132 (catálogo único de permisos, leído por API y backoffice). Cubre: el catálogo de permisos, otorgar/quitar roles de cargo, un listado mínimo de Personas para encontrar a quién ascender, el lugar único donde el sistema escribe los roles de estado, el Admin sembrado + comando CLI como parte de la instalación, auditoría de las acciones de rol, un mecanismo uniforme de protección por rol para las pantallas del backoffice, y el acceso de solo lectura del Pastor. Fuera de alcance: multi-iglesia, tabla de permisos editable, roles de estado cuyo evento de origen no existe todavía, el perfil unificado de Persona, auditoría general de acciones sensibles, y Vida Nueva (spec 004)."

## Clarifications

*(Sin resolver — ver los tres marcadores `[NEEDS CLARIFICATION]` en Requisitos Funcionales. Se resuelven en una sesión de `/speckit.clarify` aparte antes de `/speckit.plan`.)*

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Instalar la iglesia con un Admin que funciona (Priority: P1)

Quien instala el sistema para una iglesia (hoy o el día que exista una segunda instalación, D130) necesita terminar la instalación con al menos un Admin real y funcional, y poder recuperar el acceso de Admin más adelante si se pierde, sin depender de quien desarrolló el sistema.

**Why this priority**: Es la base de todo lo demás en este spec — sin un Admin que funcione, no hay quién otorgue el primer rol de cargo a nadie. Es, además, un requisito explícito de D130 (sostenibilidad: que la iglesia no dependa para siempre de un tercero) y de D131 (el Admin sembrado es lo que evita necesitar un rol de superadministrador).

**Independent Test**: Puede probarse por completo instalando el sistema desde cero, verificando que queda un Admin funcional sin haber tocado la base de datos a mano, y ejecutando el comando documentado para recrear un Admin en una instalación ya existente.

**Acceptance Scenarios**:

1. **Given** una instalación nueva del sistema, **When** se completa la puesta en marcha siguiendo el camino de instalación documentado, **Then** existe al menos una Persona con el rol `admin`, capaz de iniciar sesión y administrar el sistema.
2. **Given** el Admin sembrado en la instalación, **When** cualquiera intenta quitarle el rol `admin` o desactivarlo desde la interfaz, **Then** el sistema no lo permite.
3. **Given** una instalación existente donde se perdió el acceso de todos los Admin, **When** quien administra el servidor ejecuta el comando documentado para recrear un Admin, **Then** queda un Admin funcional de nuevo, sin necesitar acceso directo a la base de datos.
4. **Given** el camino de instalación de una iglesia nueva, **When** se documenta, **Then** queda escrito como parte de **instalar el sistema para esa iglesia** — no como una utilidad de desarrollo ni como un paso manual en la base de datos.

---

### User Story 2 - Encontrar y ascender a una Persona a un rol de cargo (Priority: P1)

Un Admin que reconoce a alguien como pastor, discipulador o líder de curso quiere poder encontrarlo en el sistema y otorgarle ese rol directamente, y quitárselo más adelante si corresponde, sin que ese rol dependa de ningún otro paso (como ser asignado a un Grupo).

**Why this priority**: Es el problema concreto que motiva este spec junto con la Historia 1: hoy no existe ninguna forma de otorgar un rol de cargo desde la app. Sin esto, tres de los ocho roles documentados (`admin`, `pastor`, `lider_curso`) no tienen ningún camino para existir, y `discipulador` queda con el círculo cerrado que describe H-125 (revisión manual): para aparecer en el listado de discipuladores disponibles hay que estar marcado disponible, y solo alguien que ya es Discipulador puede marcarse disponible.

**Independent Test**: Puede probarse por completo haciendo que un Admin busque a una Persona por nombre, le otorgue un rol de cargo, verifique que lo tiene, y se lo quite después.

**Acceptance Scenarios**:

1. **Given** un Admin que necesita encontrar a una Persona para ascenderla, **When** busca por nombre (o el dato que tenga a mano), **Then** el sistema le muestra un listado acotado de coincidencias, con lo mínimo para identificar a la Persona correcta — no el perfil completo de esa Persona.
2. **Given** una Persona encontrada, **When** el Admin le otorga un rol de cargo (`admin`, `pastor`, `discipulador` o `lider_curso`), **Then** el sistema se lo asigna de inmediato, sin que dependa de ningún otro paso (como haber sido asignado antes a un Grupo).
3. **Given** una Persona con un rol de cargo ya otorgado, **When** el Admin decide quitárselo, **Then** el sistema se lo quita, dejando sus otros roles intactos (los roles son acumulativos).
4. **Given** que el Admin otorga el rol `admin` a otra Persona, **When** confirma la acción, **Then** esa Persona pasa a tener las mismas capacidades de Admin, sin ningún rol de "superadministrador" por encima.
5. **Given** que a una Persona se le quita el rol `discipulador`, **When** esa Persona tiene discipulados activos a su cargo en ese momento, **Then** el sistema resuelve esa situación de una forma explícita [NEEDS CLARIFICATION: ¿qué pasa exactamente? Es el caso de borde que el spec 004 dejó sin contemplar (Edge Cases, "qué pasa si un Discipulador deja de tener ese rol con discipulados asignados") porque no tenía dónde vivir — ahora sí. Opción A — el sistema lo impide mientras tenga discipulados activos, obligando a resolverlos (finalizar o reasignar, esto último tampoco resuelto por el 004) antes de poder quitarle el rol. Opción B — el sistema lo permite igual, y esos discipulados quedan "huérfanos" (sin Discipulador activo asignado), visibles para el Admin como un caso a resolver a mano. Opción C — el sistema exige elegir, en el mismo momento de quitar el rol, qué pasa con cada discipulado activo (proponer su finalización, o dejarlo pendiente de reasignación). Implica, en A, un bloqueo que protege pero puede trabar una salida urgente (alguien que deja la iglesia de un día para otro); en B, mayor simplicidad pero un estado inconsistente que alguien tiene que notar y resolver; en C, la interacción más completa pero más trabajo de este spec].
6. **Given** un Admin que intenta quitarse el rol `admin` a sí mismo, **When** confirma la acción, **Then** el sistema [NEEDS CLARIFICATION: ¿se lo permite? Y si es el único Admin no sembrado que queda (más allá del Admin sembrado indegradable de la Historia 1), ¿cambia algo? Opción A — nunca se puede uno quitar el propio rol `admin`, sin excepción; evita el descuido de quedarse afuera por error, a costa de no poder "renunciar" al rol uno mismo (necesitaría pedírselo a otro Admin). Opción B — se puede, siempre — el Admin sembrado (Historia 1) ya es la red de seguridad final, así que no hace falta otra. Opción C — se puede, salvo que sea el único Admin activo además del sembrado (evita quedarse con CERO Admins operativos del día a día, aunque el sembrado siga estando). Implica, en A, una restricción simple pero rígida; en B, más libertad con el sembrado como único respaldo; en C, una validación extra pero un balance más cauteloso].
7. **Given** el listado de Personas para buscar a quién ascender, **When** el Admin lo consulta, **Then** el sistema [NEEDS CLARIFICATION: ¿incluye a todas las Personas, o solo a las que están activas? Una Persona en estado `pendiente_tutor` es, por definición, menor de 18 años (docs/04-dominio-entidades.md) — ¿puede aparecer como candidata a Discipuladora, por ejemplo? Opción A — el listado excluye a quienes no están en estado `activa` (o al menos a quienes son menores de edad conocidos, como `pendiente_tutor`), evitando por diseño una situación que no debería llegar a la pantalla de decisión del Admin. Opción B — el listado incluye a todas, y queda como criterio del Admin no otorgar un rol de cargo a alguien que no corresponde — el sistema no juzga la idoneidad de la persona elegida (mismo criterio que D25 ya aplica para elegir Discipulador: "a su criterio"). Implica, en A, una regla más del sistema que mantener (y decidir si aplica a los cuatro roles de cargo o solo a algunos); en B, más responsabilidad en el criterio humano, consistente con cómo ya se decide hoy a quién asignar como Discipulador].

---

### User Story 3 - Que la interfaz y la API nunca discrepen sobre quién puede hacer qué (Priority: P1)

Quien mantiene el sistema (y, indirectamente, cualquiera que lo usa) necesita que agregar, quitar o cambiar quién puede hacer una acción determinada sea un cambio en un solo lugar — no encontrar y sincronizar a mano cada decorador de la API y cada chequeo del backoffice que dependen de esa misma regla.

**Why this priority**: D132 lo señala como una garantía, no una preferencia de estilo: hoy la misma regla de autorización vive escrita dos veces (18 veces en la API, y repetida en una decena de archivos del backoffice) sin ninguna fuente común, y D129 ("el pastor también administra la Palabra Profética") es la prueba concreta del costo — cambiar una sola regla de negocio obligó a tocar varios lugares a mano, con el riesgo real de que alguno quedara desactualizado. Es una garantía de base para que el resto de este spec (y de cualquier spec futuro que agregue una pantalla o una acción) no repita el mismo problema.

**Independent Test**: Puede probarse por completo verificando que existe una única declaración de qué roles tienen cada permiso, que tanto la API como el backoffice consultan esa misma declaración para decidir, y que los 18 casos que hoy declaran un rol directamente en la API quedan migrados a leerla de ahí.

**Acceptance Scenarios**:

1. **Given** cualquier acción del sistema que hoy depende de un rol (los 18 casos de la API y los del backoffice), **When** se necesita saber si un rol puede hacerla, **Then** tanto la API como el backoffice deciden consultando la misma declaración de qué roles tiene cada permiso — no una regla escrita por separado en cada lado.
2. **Given** que se necesita cambiar qué roles tienen un permiso existente (el caso de D129), **When** se hace ese cambio, **Then** alcanza con modificarlo en un único lugar para que tanto la API como el backoffice reflejen el cambio.
3. **Given** que se agrega un permiso nuevo, **When** se declara qué roles lo tienen, **Then** el sistema exige que ese permiso quede escrito en código (no en una tabla que el Admin pueda editar desde la interfaz — D132 lo descarta explícitamente).
4. **Given** los 18 chequeos de rol que hoy existen en los controllers de la API, **When** se completa esta funcionalidad, **Then** ninguno queda declarando un rol de forma directa por fuera del catálogo único.

---

### User Story 4 - Ninguna pantalla nueva del backoffice nace sin protección por rol (Priority: P2)

Quien construye una pantalla nueva del backoffice necesita que esa pantalla quede protegida por el rol que corresponde de la misma forma que todas las demás, sin tener que acordarse de escribir el chequeo a mano — y si se olvida, que quede detectado antes de que llegue a producción.

**Why this priority**: El chequeo de **sesión** (¿hay alguien logueado?) ya está resuelto de forma centralizada — no es parte de este spec. Lo que sigue repitiéndose a mano, pantalla por pantalla, es el chequeo de **rol** (¿esta Persona puede ver/usar esta pantalla en particular?): hoy cada página que lo necesita escribe su propia condición (ej. `if (!rol.includes('admin') && !rol.includes('pastor'))`), sin ningún mecanismo compartido ni una guardia que avise si una pantalla nueva se olvida de agregarlo.

**Independent Test**: Puede probarse por completo construyendo una pantalla de prueba protegida por un permiso del catálogo (Historia 3), verificando que un rol sin ese permiso queda afuera, y verificando que existe alguna forma de detectar una pantalla que debería estar protegida y no lo está.

**Acceptance Scenarios**:

1. **Given** una pantalla del backoffice que requiere un permiso determinado, **When** una Persona sin ese permiso intenta acceder, **Then** el sistema se lo impide de forma consistente con el resto de las pantallas protegidas.
2. **Given** una pantalla nueva que se agrega al backoffice, **When** necesita estar protegida por rol, **Then** usa el mismo mecanismo que las demás — no una condición escrita a mano y distinta en cada archivo.
3. **Given** el conjunto de pantallas del backoffice, **When** se revisa cuáles deberían estar protegidas por algún permiso del catálogo, **Then** existe una forma de detectar una pantalla que no lo está, en vez de depender de que alguien la note navegando a mano.

---

### User Story 5 - El Pastor ve todo el backoffice, sin gestionarlo (Priority: P2)

Un Pastor o Pastora que necesita ver el estado general de la iglesia (Personas, Solicitudes, Grupos, lo que sea que exista en el backoffice) puede entrar a cualquier pantalla y consultarla, sin tener acceso a crear, editar ni gestionar nada — salvo en las excepciones ya decididas explícitamente (D129: Palabra Profética).

**Why this priority**: Hoy este acceso también se resuelve pantalla por pantalla (cada una decide a mano si el Pastor entra en modo lectura) — con el catálogo de permisos de la Historia 3 como base, este es el caso concreto que demuestra que la base funciona para un patrón transversal (todas las pantallas), no solo para permisos puntuales.

**Independent Test**: Puede probarse por completo haciendo que una Persona con rol Pastor recorra las pantallas del backoffice y verificando que puede ver todo, pero no encuentra ninguna acción de creación/edición/gestión disponible, excepto donde una decisión explícita (D129) dice lo contrario.

**Acceptance Scenarios**:

1. **Given** una Persona con rol Pastor, **When** navega cualquier pantalla del backoffice, **Then** puede verla y consultar su contenido.
2. **Given** esa misma navegación, **When** la pantalla ofrece una acción de crear, editar, aprobar o gestionar, **Then** el sistema no se la ofrece al Pastor, salvo en los casos donde una decisión explícita lo autoriza (D129: Palabra Profética).
3. **Given** que en el futuro una decisión similar a D129 amplía lo que el Pastor puede hacer en otra sección, **When** se toma esa decisión, **Then** se resuelve como una excepción declarada en el catálogo de permisos (Historia 3) — no reescribiendo el acceso de solo lectura general del Pastor.

---

### User Story 6 - Saber quién otorgó o quitó un rol, y cuándo (Priority: P3)

Alguien que necesita entender por qué una Persona tiene (o dejó de tener) un rol de cargo determinado puede consultar cuándo se le otorgó o se le quitó, y qué Admin lo hizo.

**Why this priority**: Responde en parte la pregunta abierta de auditoría mínima de acciones sensibles del Admin (`docs/06-preguntas-abiertas.md`) — acotada a los cambios de rol, que es la pieza que este spec construye. No bloquea el resto del spec: otorgar/quitar roles (Historia 2) funciona igual sin esto, pero queda sin poder responder "¿quién hizo este cambio?" hasta que exista.

**Independent Test**: Puede probarse por completo otorgando y quitando un rol de cargo a una Persona, y verificando que queda un registro consultable de ambas acciones, con quién las hizo y cuándo.

**Acceptance Scenarios**:

1. **Given** que un Admin otorga un rol de cargo a una Persona, **When** la acción se confirma, **Then** el sistema deja un registro de qué Admin lo hizo, a quién, qué rol, y cuándo.
2. **Given** que un Admin quita un rol de cargo, **When** la acción se confirma, **Then** el sistema deja el mismo tipo de registro que al otorgarlo.
3. **Given** los registros de cambios de rol, **When** se consultan, **Then** están disponibles para el Admin — no se pierden ni se sobrescriben.

---

### Edge Cases

- ¿Qué pasa si se otorga un rol de cargo que la Persona ya tiene? (el sistema no debería duplicarlo ni fallar de forma confusa).
- ¿Qué pasa si dos Admin intentan otorgar o quitar el mismo rol a la misma Persona casi al mismo tiempo?
- ¿Qué pasa con una Persona `pendiente_tutor` (menor de edad, sin acceso a la app) si de todos modos se le otorga un rol de cargo? (ver Historia 2, Acceptance Scenario 7, sin resolver).
- ¿Qué pasa si se quita el último rol de cargo que le quedaba a una Persona? (deja de tener ese tipo de acceso, pero conserva sus roles de estado — son independientes).
- ¿Qué pasa si el comando de recrear un Admin (Historia 1) se ejecuta en una instalación que ya tiene Admins activos?
- ¿Qué pasa si una Persona sin acceso a la app (D97) recibe un rol de cargo? Sigue sin poder iniciar sesión — el rol queda registrado, pero es inerte hasta que esa Persona tenga acceso propio (fuera de alcance de este spec resolver ese camino).

## Fuera de alcance

- **Multi-iglesia, entidad Organización, columna de inquilino, rol de superadministrador**: D130 los descarta explícitamente, con su motivo (dato sensible bajo la Ley 25.326, costo de migración posterior) y su disparador de revisión (pasar de "instalar una copia por iglesia" a "operar el sistema para varias"). No se construye nada de esto acá.
- **Tabla de permisos editable desde el backoffice**: D132 la descarta — el catálogo vive en código, no en una tabla que el Admin pueda modificar sin desplegar.
- **Las escrituras de los roles de estado cuyo evento de origen todavía no existe** (`apto_ministerio`, miembro de Ministerio, en curso: Vida de Servicio): este spec construye el **lugar único** donde el sistema escribe roles de estado, y migra las dos escrituras que ya existen hoy (registro y alta por Admin, las dos otorgan `miembro_registrado`) — pero no agrega escrituras nuevas para eventos que ninguna feature construyó todavía. Cada feature futura (Vida Nueva, Vida de Servicio, Ministerios) suma la suya cuando corresponda.
- **El perfil unificado de Persona** (historial de Inscripciones, Postulaciones, Solicitudes, Relaciones Familiares en una sola pantalla, `docs/07-flujos-casos-de-uso.md` Flujo 9): el listado de este spec es lo mínimo para encontrar a quién ascender, no ese perfil completo.
- **Auditoría general de acciones sensibles** (verificar Pagos, activar cuentas `pendiente_tutor`, Completitud Manual, acciones en nombre de otra Persona): `docs/06-preguntas-abiertas.md` menciona todas estas — este spec responde la pregunta solo para los cambios de rol (Historia 6), no para el resto.
- **Vida Nueva y el spec 004 completo**: quedan fuera — 004 depende de este spec (ver su nota de cierre), no al revés.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El camino de instalación del sistema para una iglesia DEBE terminar con al menos una Persona con el rol `admin` capaz de iniciar sesión, sin requerir una edición manual de la base de datos.
- **FR-002**: El sistema NO DEBE permitir quitarle el rol `admin` ni desactivar, desde la interfaz, a la Persona Admin sembrada en la instalación.
- **FR-003**: El sistema DEBE proveer un comando documentado, ejecutable desde la línea de comandos, que recree un Admin funcional en una instalación existente sin requerir acceso directo a la base de datos.
- **FR-004**: El camino de instalación (FR-001) y el comando de recuperación (FR-003) DEBEN estar documentados como parte de instalar el sistema para una iglesia — no como una utilidad de desarrollo.
- **FR-005**: El sistema DEBE permitir que un Admin busque Personas (por nombre u otro dato identificatorio) para encontrar a quién otorgar o quitar un rol de cargo, mostrando lo mínimo necesario para identificar a la Persona correcta — no su perfil completo.
- **FR-006**: El sistema DEBE permitir que un Admin otorgue a cualquier Persona encontrada (FR-005) alguno de los roles de cargo (`admin`, `pastor`, `discipulador`, `lider_curso`), de forma independiente de cualquier otro paso (D131) — en particular, `discipulador` NO DEBE depender de haber sido asignado antes a un Grupo.
- **FR-007**: El sistema DEBE permitir que un Admin le quite a una Persona un rol de cargo que tiene, sin afectar sus demás roles (los roles son acumulativos).
- **FR-008**: Otorgar el rol `admin` a una Persona DEBE darle las mismas capacidades que cualquier otro Admin — el sistema NO DEBE modelar un rol de superadministrador por encima.
- **FR-009**: Cuando se le quita el rol `discipulador` a una Persona con discipulados activos a su cargo, el sistema DEBE resolver esa situación de una forma explícita [NEEDS CLARIFICATION: ver Historia 2, Acceptance Scenario 5 — las opciones y sus implicancias están ahí].
- **FR-010**: Cuando un Admin intenta quitarse a sí mismo el rol `admin`, el sistema DEBE [NEEDS CLARIFICATION: ver Historia 2, Acceptance Scenario 6 — las opciones y sus implicancias están ahí].
- **FR-011**: El listado de Personas para buscar a quién ascender (FR-005) DEBE [NEEDS CLARIFICATION: ver Historia 2, Acceptance Scenario 7 — las opciones y sus implicancias están ahí].
- **FR-012**: El sistema DEBE declarar, en un único catálogo, qué roles tienen cada permiso con nombre (D132) — el catálogo vive en código compartido, no en una tabla editable desde la interfaz.
- **FR-013**: Tanto la API como el backoffice DEBEN decidir si una Persona puede hacer una acción determinada leyendo el mismo catálogo de FR-012 — ninguna de las dos capas DEBE declarar una regla de autorización por su cuenta, sin pasar por ahí.
- **FR-014**: Los 18 chequeos de rol que hoy existen directamente en los controllers de la API DEBEN quedar migrados a declarar, en su lugar, el permiso correspondiente del catálogo (FR-012).
- **FR-015**: Los chequeos de rol que hoy están repetidos a mano en las pantallas del backoffice DEBEN quedar migrados a consultar el mismo catálogo (FR-012), en vez de declarar la condición de forma independiente en cada pantalla.
- **FR-016**: El sistema DEBE ofrecer un mecanismo único para que una pantalla del backoffice declare qué permiso necesita — sin que cada pantalla nueva tenga que volver a escribir su propia condición de acceso por rol.
- **FR-017**: El sistema DEBE poder señalar, de alguna forma verificable, una pantalla del backoffice que requeriría protección por rol y no la tiene — para que una pantalla nueva no pueda quedar desprotegida sin que se note.
- **FR-018**: El sistema NO DEBE ofrecerle a una Persona con rol Pastor ninguna acción de creación, edición o gestión en el backoffice, salvo en las excepciones que una decisión explícita autorice (D129: Palabra Profética) — el resto del backoffice queda accesible en modo de solo consulta para ese rol.
- **FR-019**: El sistema DEBE proveer un único lugar donde se escriben los roles de **estado del proceso** (`miembro_registrado`, y los que sumen las features futuras) como consecuencia de un evento de dominio — distinto del mecanismo de otorgar/quitar roles de **cargo** (FR-006/FR-007), que siempre es una acción manual del Admin.
- **FR-020**: Las dos escrituras que hoy existen del rol `miembro_registrado` (al completarse el registro, y al darse de alta una Persona adulta por el Admin) DEBEN quedar migradas a pasar por el lugar único de FR-019.
- **FR-021**: El sistema NO DEBE agregar, en este spec, ninguna escritura nueva de un rol de estado cuyo evento de origen (Vida Nueva, Vida de Servicio, Ministerios) todavía no existe — el mecanismo de FR-019 queda listo para que cada feature futura sume la suya.
- **FR-022**: El sistema DEBE registrar, para cada vez que se otorga o se quita un rol de cargo, qué Admin lo hizo, a qué Persona, qué rol, y cuándo.
- **FR-023**: El registro de FR-022 DEBE quedar disponible para su consulta por un Admin, sin perderse ni sobrescribirse.

### Key Entities *(include if feature involves data)*

- **Persona**: ya existe (D97, specs previos). Este spec agrega o formaliza sobre ella: sus roles de **cargo** (otorgados/quitados manualmente por un Admin, FR-006/FR-007) y sus roles de **estado** (escritos por el sistema vía el lugar único de FR-019) — la misma lista de roles que ya tenía, pero con dos formas de gestión claramente distintas (D131).
- **Catálogo de permisos**: la declaración única de qué roles tienen cada permiso con nombre (D132). No es una entidad de base de datos — vive en código compartido, leído tanto por la API como por el backoffice.
- **Cambio de rol** (auditoría, Historia 6): registro de que un Admin otorgó o quitó un rol de cargo a una Persona, con quién lo hizo y cuándo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Toda instalación nueva del sistema termina con un Admin funcional sin ninguna edición manual de base de datos, y ese acceso es recuperable con un comando documentado si se pierde.
- **SC-002**: Un Admin puede otorgar cualquiera de los cuatro roles de cargo a una Persona que encuentra por búsqueda, sin ningún paso intermedio no documentado.
- **SC-003**: Cero roles de cargo (`admin`, `pastor`, `discipulador`, `lider_curso`) sin una forma de otorgarse desde la aplicación.
- **SC-004**: Cambiar qué roles tienen un permiso existente (el caso D129) requiere modificar un único lugar del código, no varios archivos de dos aplicaciones distintas.
- **SC-005**: El 100% de los 18 chequeos de rol que hoy están directamente en los controllers de la API quedan migrados al catálogo único.
- **SC-006**: Una pantalla nueva del backoffice que necesita protección por rol la obtiene usando el mecanismo compartido, verificable sin depender de que alguien la pruebe a mano navegando.
- **SC-007**: El 100% de los cambios de rol de cargo (otorgar o quitar) quedan con un registro consultable de quién los hizo y cuándo.

## Assumptions

- El mecanismo actual de autenticación y de lectura de `Persona.rol` (SSO vía NextAuth, `RolesGuard`/`@Roles` en la API, `Persona.rol` como arreglo) sigue siendo la base sobre la que se construye este spec — no se reemplaza el mecanismo de autenticación, solo cómo se declaran y se otorgan los roles.
- El chequeo de **sesión** (¿hay alguien logueado?) para las pantallas del backoffice ya está resuelto de forma centralizada (revisión manual H-116) y no es parte de este spec — lo que este spec resuelve es el chequeo de **rol/permiso** sobre una sesión ya existente (Historia 4).
- Existe hoy un mecanismo de conveniencia para desarrollo (`SEED_ADMIN_EMAIL`, revisión manual H-12) que promueve a `admin` a quien corra el seed con su propio email — este spec lo da por superado: el camino de instalación (Historia 1) lo reemplaza como mecanismo real para una iglesia, no como utilidad de desarrollo.
- Los ocho roles documentados en `docs/03-roles-permisos.md` siguen siendo el inventario correcto de roles y de qué ve cada uno — lo que cambia con D131 es la clasificación de cada uno en cargo/estado y quién lo otorga, no la lista en sí.
- Ninguno de los requisitos de este spec depende de un estado que solo se puede producir cumpliendo ese mismo requisito (la circularidad que describe H-125 para el 004): el Admin sembrado (Historia 1) es la base que existe *antes* de que el mecanismo de otorgar roles (Historia 2) pueda usarse por primera vez.
