# Feature Specification: Base Transversal de la App

**Feature Branch**: `002-base-transversal`

**Created**: 2026-09-17

**Status**: Draft

**Input**: User description: "Base transversal de la app (002-base-transversal). Problema: la Fase de Bienvenida (001) ya existe, pero las decisiones D81–D105 (docs/13 a docs/16 y la Constitución v1.1.0) definen reglas que aplican a todas las pantallas y todavía no están implementadas. Si cada feature futura las resuelve por su cuenta, el resultado será inconsistente y costoso de corregir. Objetivo: dejar lista la base común para que toda feature posterior cumpla los principios VII–X sin rehacer trabajo. Alcance: navegación (los tres menús), tema claro/oscuro, idioma, accesibilidad, componentes de feedback y estados, errores, SEO base, datos de demostración. Actores: Visitante, Miembro registrado, Admin, Discipulador, Líder de curso, Pastor. Fuera de alcance: Mi camino con contenido real, Eventos, Avisos con notificaciones reales, email, YouTube, alta de adultos por Admin, 'Contanos qué te parece', Ministerios con datos reales, portugués/inglés."

## Clarifications

### Session 2026-09-17

- Q: La paleta de color final de la app todavía es una decisión de diseño abierta (docs/06-preguntas-abiertas.md, pendiente de la Sesión 6). Este spec exige verificar contraste WCAG en modo claro y oscuro (FR-013) y define el modo oscuro (Historia 5) — ¿con qué paleta se construye y verifica el contraste mientras la decisión de marca sigue pendiente? → A: Se define una paleta neutra provisoria (tokens semánticos: fondo, texto, primario, secundario, destructivo, éxito, advertencia, borde, foco) verificada en contraste en ambos modos, reemplazable sin rehacer estructura cuando se decida la paleta de marca definitiva.
- Q: FR-039 pide datos de demostración para lo que ya existe (Sede, Personas en cada estado). D99 describe un seed con "volumen" de datos ficticios pensado para cuando existan más entidades (Eventos, Pagos, etc.), que hoy no existen — ¿qué volumen de datos de demo necesita este spec, que solo cubre Sede y Persona? → A: Mínimo viable — una Sede completa más un puñado de Personas (una o dos por cada estado: activa mayor de edad, pendiente_tutor, inactiva), suficiente para mostrar y probar cada caso sin generar volumen artificial todavía innecesario.
- Q: El contenido de las páginas actuales /bienvenida y /sede (spec 001) pasa a vivir en /primeros-pasos y /visitanos (Historia 1) — ¿qué debe pasar con las URLs viejas una vez hecho el traslado? → A: Dejan de existir, sin redirección; quien tenga un link viejo ve la página de "no encontrado" (Historia 4).

### Session 2026-09-18 — revisión manual, Lote 1 (`specs/revision-manual/2026-09-17-001-002.md`)

- Q: El menú público de la Historia 1 solo describe el caso sin sesión — ¿qué debe mostrar cuando quien navega ya tiene sesión iniciada (ej. volvió a una página pública después de registrarse)? (H-19) → A: Reemplaza el botón "Ingresar" por un acceso directo a la app con sesión; "Dar" se mantiene siempre, con o sin sesión.
- Q: Las páginas de error, "no encontrado" y las del flujo de registro (spec 001), ¿deben conservar el menú y el pie de página públicos? (H-05) → A: Sí — perder la navegación en esas pantallas deja a la persona sin forma de continuar salvo el botón "atrás" del navegador; se agrega como requisito explícito.
- Q: ¿Cómo cierra sesión una Persona? La Historia 5 asumía la acción sin definirla. (H-11) → A: Con un botón "Cerrar sesión" en Perfil (app) y en el menú de usuario (backoffice), que pide confirmación explícita (D94) antes de cerrarla, y vuelve al Inicio público con un aviso breve (D102).
- Q: ¿Debe la app depender de las pantallas propias de NextAuth (inglés, sin el diseño de la app) para signIn/signOut/error? (H-14) → A: No — se configuran explícitamente para usar las pantallas propias del proyecto (o los flujos ya resueltos por H-11), incluso si nunca se llega a ellas en el uso normal.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navegar la app según quién soy (Priority: P1)

Cualquier persona que usa la app — se haya acercado por primera vez, tenga sesión iniciada, o trabaje en el equipo de la iglesia — encuentra un menú pensado para su situación (web pública, app con sesión, o backoffice), en vez de un único menú genérico. Las secciones que todavía no tienen una funcionalidad propia se ven como "todavía no hay nada acá" en vez de un error o un enlace roto.

**Why this priority**: Es la base estructural de la que dependen el resto de las historias de este spec y de toda feature futura: sin un esqueleto de navegación estable, cada feature nueva tendría que decidir por su cuenta dónde vive y cómo se llega a ella.

**Independent Test**: Puede probarse por completo entrando a la web pública sin sesión, iniciando sesión como Miembro registrado, y entrando al backoffice con distintos roles (Admin, Discipulador, Líder de curso, Pastor/Pastora), y verificando en cada caso que el menú corresponde a esa situación y que las secciones sin funcionalidad muestran un estado vacío en vez de un error.

**Acceptance Scenarios**:

1. **Given** un Visitante sin sesión en la web pública, **When** abre el menú principal, **Then** ve las secciones Nosotros, Primeros pasos, Ministerios, Eventos y Visitanos, además de los botones "Dar" e "Ingresar".
2. **Given** ese mismo Visitante en un celular, **When** abre el menú, **Then** ve las mismas secciones agrupadas en un menú desplegable, con "Dar" e "Ingresar" siempre visibles.
3. **Given** un Miembro registrado con sesión iniciada, **When** navega la app, **Then** ve una barra con las secciones Inicio, Mi camino, Eventos, Avisos y Perfil.
4. **Given** una Persona con rol Admin que entra al backoffice, **When** ve el menú lateral, **Then** encuentra los ítems correspondientes a su rol (incluidos los que hoy no tienen funcionalidad propia, como Solicitudes o Notificaciones) mostrados como sección disponible pero vacía, no como un enlace que falla.
5. **Given** una Persona con rol Discipulador y rol Líder de curso a la vez, **When** entra al backoffice, **Then** ve la unión de los ítems de ambos roles en su menú lateral.
6. **Given** el contenido que hoy vive en las páginas de Bienvenida y Sede (spec 001), **When** se accede a la web pública después de este cambio, **Then** ese mismo contenido y esas mismas funcionalidades siguen disponibles, ahora dentro de las secciones Primeros pasos y Visitanos.
7. **Given** una Persona con sesión iniciada que navega una página del menú público, **When** mira el menú, **Then** ya no ve "Ingresar" — ve un acceso directo a la app con sesión en su lugar; "Dar" se mantiene visible igual que sin sesión (actualización 2026-09-18).
8. **Given** cualquier pantalla de error, "no encontrado", o del flujo de registro (spec 001), **When** una persona la ve, **Then** el menú público (o el de la app/backoffice, según corresponda) y el pie de página siguen presentes — nunca queda sin forma de navegar salvo el botón "atrás" del navegador (actualización 2026-09-18).

---

### User Story 2 - Usar la app con teclado o lector de pantalla (Priority: P1)

Una persona que navega solo con teclado, o que usa un lector de pantalla por baja visión o ceguera, puede recorrer los tres menús y las pantallas ya existentes (Primeros pasos, Visitanos, registro) sin quedar trabada ni depender de poder ver la pantalla o usar el mouse.

**Why this priority**: Es un principio no negociable de la Constitución del proyecto (Principio VII) y afecta a la misma navegación que construye la Historia 1: conviene resolverlo en el mismo momento en que se construye el esqueleto, no después.

**Independent Test**: Puede probarse por completo recorriendo los tres menús y las pantallas existentes solo con teclado (sin mouse) y con un lector de pantalla activado, verificando que no hay ningún punto donde el foco se pierda o quede atrapado, y que cada estado se entiende sin depender del color.

**Acceptance Scenarios**:

1. **Given** cualquier página de la app, **When** una persona empieza a tabular desde el principio, **Then** el primer elemento enfocable es un enlace para saltar directamente al contenido principal.
2. **Given** una persona que navega solo con teclado, **When** recorre cualquiera de los tres menús, **Then** puede llegar a cada ítem y activarlo sin usar el mouse, con el foco siempre visible y sin quedar atrapada.
3. **Given** el menú hamburguesa de la web pública abierto, **When** la persona presiona Escape, **Then** el menú se cierra y el foco vuelve al botón que lo abrió.
4. **Given** una persona usando un lector de pantalla, **When** llega a la sección en la que ya está parada, **Then** el lector anuncia cuál es la página actual, sin depender de que esté resaltada solo con color.
5. **Given** las pantallas existentes en modo claro y en modo oscuro, **When** se mide el contraste de textos e íconos, **Then** cumple los mínimos definidos (4.5:1 texto normal, 3:1 texto grande y elementos de interfaz) en ambos modos.

---

### User Story 3 - Recibir feedback claro de cada acción (Priority: P2)

Una persona que interactúa con las pantallas ya existentes (ver Primeros pasos, ver Visitanos, completar el registro) siempre entiende qué está pasando: si algo está cargando, si una sección todavía no tiene contenido, si algo salió mal, o si una acción se completó con éxito.

**Why this priority**: Sin estos estados definidos de forma reutilizable, cada feature futura los improvisa de manera distinta, generando una experiencia inconsistente que la Constitución (Principio VIII) ya no permite.

**Independent Test**: Puede probarse por completo interrumpiendo la conexión a la API mientras se usan las pantallas existentes y verificando que aparecen los cuatro estados (cargando, vacío, error, éxito) de forma clara y consistente, incluido el botón de reintentar.

**Acceptance Scenarios**:

1. **Given** la página de Visitanos mientras todavía se están por cargar los datos de la Sede, **When** la persona la abre, **Then** ve una forma de carga similar al contenido final, no una pantalla en blanco ni un spinner a pantalla completa.
2. **Given** el formulario de registro (spec 001) mientras se envía, **When** la persona hace clic en enviar, **Then** el botón queda en estado de carga y bloqueado hasta que la respuesta llega, evitando un envío duplicado.
3. **Given** una acción que se completa con éxito, **When** el sistema confirma el resultado, **Then** la persona ve una confirmación clara en la pantalla (no solo en un aviso breve que puede perderse).
4. **Given** un aviso breve (toast) que aparece en pantalla, **When** una persona con lector de pantalla está usando la app, **Then** ese aviso se anuncia automáticamente y permanece visible el tiempo suficiente para leerlo.

---

### User Story 4 - Entender un error sin quedar trabado (Priority: P2)

Cuando algo falla — la API no responde, un dato no existe, o no hay conexión a internet — una persona ve un mensaje que entiende, con una acción para seguir adelante (reintentar, volver al Inicio), en vez de un error técnico o una pantalla rota.

**Why this priority**: Resuelve el Principio X de la Constitución y protege directamente las pantallas que ya existen del spec 001, que hoy no tienen un manejo de errores consistente.

**Independent Test**: Puede probarse por completo apagando la API mientras se navegan las pantallas existentes y visitando una URL inexistente, verificando que en todos los casos aparece una pantalla propia de error (no la del navegador) con un mensaje amable y, cuando corresponde, un código de referencia.

**Acceptance Scenarios**:

1. **Given** que la API no responde, **When** una persona intenta ver la información de la Sede en Visitanos, **Then** ve un mensaje simple de error con un botón "Reintentar", sin detalles técnicos.
2. **Given** una URL que no corresponde a ninguna sección existente, **When** una persona la visita, **Then** ve una página propia de "no encontramos esta sección" con enlaces a Inicio y a Primeros pasos.
3. **Given** un error no anticipado en cualquier pantalla, **When** ocurre, **Then** la persona ve un mensaje genérico junto con un código de referencia que puede usar para reportarlo.
4. **Given** que el dispositivo pierde la conexión a internet, **When** la persona sigue usando la app, **Then** ve un aviso persistente de que está sin conexión y las acciones que la requieren quedan deshabilitadas.
5. **Given** un error inesperado ocurrido en cualquiera de las tres apps, **When** el equipo de desarrollo necesita revisarlo después, **Then** existe un registro del error que no contiene ningún dato personal de la persona afectada.

---

### User Story 5 - Elegir tema claro, oscuro o del sistema (Priority: P2)

Una Persona con sesión iniciada puede elegir si quiere ver la app siempre en modo claro, siempre en modo oscuro, o seguir la configuración de su dispositivo, y esa elección se mantiene la próxima vez que use la app.

**Why this priority**: Es una decisión ya tomada (D95) que afecta a todas las pantallas existentes y futuras; conviene resolverla junto con la navegación para no tener que revisar cada pantalla dos veces.

**Independent Test**: Puede probarse por completo cambiando la preferencia de tema desde el Perfil (app) o el menú de usuario (backoffice), cerrando sesión y volviendo a entrar, y verificando que la preferencia elegida sigue aplicada.

**Acceptance Scenarios**:

1. **Given** una persona que abre la app por primera vez sin haber elegido nada, **When** la usa, **Then** ve la interfaz en el modo (claro u oscuro) que indica la configuración de su sistema operativo o navegador.
2. **Given** una Persona con sesión iniciada, **When** entra a su Perfil (o al menú de usuario en el backoffice), **Then** puede elegir explícitamente entre Claro, Oscuro o Sistema.
3. **Given** una Persona que ya eligió un modo, **When** vuelve a entrar a la app más adelante, **Then** la interfaz se muestra en el modo que eligió, sin tener que configurarlo de nuevo.
4. **Given** las pantallas existentes (Primeros pasos, Visitanos, registro), **When** se ven en modo oscuro, **Then** todos los textos e íconos mantienen el mismo nivel de legibilidad y contraste que en modo claro.
5. **Given** una Persona con sesión iniciada, **When** elige "Cerrar sesión" desde su Perfil (o el menú de usuario del backoffice), **Then** el sistema pide confirmación explícita antes de cerrarla, y al confirmar vuelve al Inicio público con un aviso breve; si cancela, sigue con la sesión activa sin cambios (actualización 2026-09-18).

---

### User Story 6 - Interfaz preparada para más de un idioma (Priority: P3)

Aunque hoy la app solo existe en español, ningún texto queda escrito directamente dentro de las pantallas: todos salen de un lugar centralizado, de modo que agregar un idioma en el futuro no requiera revisar pantalla por pantalla.

**Why this priority**: No cambia lo que ve una persona hoy (todo sigue en español), pero evita un costo de retrabajo grande más adelante (Principio IX); por eso tiene menor prioridad inmediata que la navegación y la accesibilidad.

**Independent Test**: Puede probarse por completo revisando que ninguna de las pantallas existentes tiene un texto de interfaz escrito directamente en el código, y agregando de prueba un texto nuevo al archivo de mensajes para confirmar que aparece correctamente sin tocar ninguna pantalla.

**Acceptance Scenarios**:

1. **Given** cualquier pantalla existente, **When** se revisa su código, **Then** ningún texto visible para la persona está escrito directamente ahí — todos provienen de un origen centralizado de mensajes.
2. **Given** una Persona recién registrada, **When** se crea su registro, **Then** el sistema le asigna español como idioma preferido por defecto, sin pedírselo en el formulario.
3. **Given** los valores de listas ya existentes (ej. estado civil, profesión), **When** se muestran en la interfaz, **Then** aparecen traducidos a partir de una clave interna, nunca como el valor guardado tal cual en la base de datos.
4. **Given** el documento de cualquier página, **When** se inspecciona, **Then** declara el idioma español como idioma activo.

---

### User Story 7 - Encontrar la iglesia y compartir bien un link (Priority: P3)

Alguien que busca la iglesia en un buscador, o recibe un link a una de sus páginas públicas por WhatsApp, encuentra información clara y una vista previa reconocible, mientras que las páginas privadas y el backoffice no aparecen en ningún buscador.

**Why this priority**: Ayuda a que gente nueva encuentre la iglesia (parte del problema original de la Fase de Bienvenida), pero no bloquea el uso de la app por quienes ya llegaron, por lo que puede resolverse después de la navegación y la accesibilidad.

**Independent Test**: Puede probarse por completo revisando el título, la descripción y la vista previa de cada página pública al compartir su link, y confirmando que ninguna URL del área con sesión ni del backoffice es indexable.

**Acceptance Scenarios**:

1. **Given** cualquier página pública (Inicio, Nosotros, Primeros pasos, Ministerios, Eventos, Visitanos, Dar), **When** se comparte su link, **Then** muestra un título y una descripción propios de esa página, no genéricos.
2. **Given** el link de una página pública compartido por WhatsApp o redes sociales, **When** se genera la vista previa, **Then** aparece con imagen, título y descripción reconocibles.
3. **Given** un buscador que recorre el sitio, **When** llega a cualquier página del área con sesión iniciada o del backoffice, **Then** esa página no se indexa.
4. **Given** un buscador que quiere encontrar el nombre y la dirección de la iglesia, **When** procesa las páginas públicas, **Then** encuentra esos datos en un formato estructurado reconocible.

---

### User Story 8 - Ver una demo realista sin datos reales (Priority: P3)

Quien necesita mostrar o probar la app (para una presentación, o durante el desarrollo) puede hacerlo con datos ficticios ya cargados que cubren los casos que ya existen (una Sede, y Personas en cada estado definido), sin usar información de personas reales de la iglesia.

**Why this priority**: Facilita probar y mostrar todo lo demás construido en este spec, pero no es necesaria para que la navegación, la accesibilidad o los errores funcionen correctamente en producción, por lo que se resuelve al final.

**Independent Test**: Puede probarse por completo corriendo el proceso de generación de datos de ejemplo en un ambiente limpio y verificando que quedan cargadas al menos una Sede y Personas mayores y menores de edad en los distintos estados ya definidos en el spec 001.

**Acceptance Scenarios**:

1. **Given** un ambiente recién preparado, **When** se corre el proceso de datos de ejemplo, **Then** queda cargada al menos una Sede con toda su información.
2. **Given** ese mismo proceso, **When** se completa, **Then** quedan cargadas una o dos Personas de ejemplo por cada estado ya definido (activa mayor de edad, pendiente_tutor, e inactiva por caso no autorizado), ninguna correspondiente a una persona real.
3. **Given** una feature futura que agregue una entidad nueva, **When** necesite sus propios datos de ejemplo, **Then** puede sumarlos al mismo proceso sin tener que rehacer los datos ya generados para Sede y Persona.

---

### Edge Cases

- ¿Qué ve una Persona con más de un rol en el backoffice (ej. Discipulador y Líder de curso a la vez) si sus roles tuvieran ítems de menú superpuestos?
- ¿Qué pasa si el sistema operativo o navegador de una persona no informa ninguna preferencia de tema (ni claro ni oscuro)?
- ¿Qué ve un Visitante sin sesión que intenta acceder directamente a una URL de la sección con sesión iniciada (ej. Mi camino) o del backoffice?
- ¿Qué pasa si la API no responde justo al pedir los datos de Sede dentro de Visitanos? (debe verse el estado de error definido en la Historia 4, no un error sin manejar)
- ¿Qué pasa si dos features futuras necesitan agregar el mismo código de error al catálogo compartido?
- ¿Qué ve alguien que comparte el link de una página pública antes de que exista una imagen de vista previa definitiva para esa página?
- ¿Qué pasa si una Persona cambia el idioma de su navegador mientras la app todavía solo tiene español disponible?
- ¿Qué pasa si dos personas distintas, con roles distintos, comparten el mismo dispositivo con sesiones separadas? (la preferencia de tema e idioma debe seguir a la Persona, no al dispositivo)

## Requirements *(mandatory)*

### Functional Requirements

**Navegación (Historia 1)**

- **FR-001**: El sistema DEBE mostrar, en la web pública sin sesión, un menú principal con las secciones Nosotros, Primeros pasos, Ministerios, Eventos y Visitanos, y los botones de acción "Dar" e "Ingresar".
- **FR-002**: En pantallas de celular, el sistema DEBE agrupar esas mismas secciones dentro de un menú desplegable, manteniendo "Dar" e "Ingresar" siempre visibles fuera del menú.
- **FR-003**: El sistema DEBE mostrar, para una Persona con sesión iniciada, una barra de navegación con las secciones Inicio, Mi camino, Eventos, Avisos y Perfil.
- **FR-004**: El sistema DEBE mostrar, en el backoffice, un menú lateral cuyos ítems dependen de los roles de la Persona autenticada (Admin, Discipulador, Líder de curso, Pastor/Pastora), mostrando la unión de los ítems cuando una Persona tiene más de un rol.
- **FR-005**: Cuando una sección de cualquiera de los tres menús todavía no tiene una funcionalidad implementada, el sistema DEBE mostrar un estado vacío con un mensaje amable (y una acción sugerida cuando corresponda) en vez de un error o una página en blanco.
- **FR-006**: El sistema DEBE mostrar un pie de página en la web pública con las mismas secciones del menú principal, más dirección, horarios, teléfono de contacto y redes sociales.
- **FR-007**: El sistema DEBE trasladar el contenido explicativo de la Bienvenida (spec 001) a la sección Primeros pasos, conservando la explicación del proceso de integración y el acceso al registro. La URL anterior de Bienvenida deja de existir (sin redirección): quien la visite ve la página de "sección no encontrada" (Historia 4).
- **FR-008**: El sistema DEBE trasladar la información de la Sede (spec 001) a la sección Visitanos, conservando la consulta pública de sus datos (nombre, dirección, contacto, horarios). La URL anterior de Sede deja de existir (sin redirección): quien la visite ve la página de "sección no encontrada" (Historia 4).
- **FR-009**: El sistema DEBE indicar, tanto visualmente como para tecnología asistiva, cuál es la sección actual dentro de cada uno de los tres menús.
- **FR-042** *(actualización 2026-09-18, revisión manual H-19)*: El menú público DEBE reflejar si hay una sesión iniciada: con sesión, reemplaza el botón "Ingresar" por un acceso directo a la app con sesión; "Dar" se muestra siempre, con o sin sesión.
- **FR-043** *(actualización 2026-09-18, revisión manual H-05)*: Las pantallas de error, "no encontrado" y las del flujo de registro (spec 001) DEBEN conservar el menú (público, de la app, o del backoffice según corresponda) y el pie de página, igual que el resto de las pantallas.

**Accesibilidad (Historia 2)**

- **FR-010**: El sistema DEBE ofrecer un enlace "Saltar al contenido" como primer elemento enfocable de cada página, que mueva el foco al contenido principal al activarlo.
- **FR-011**: El sistema DEBE permitir recorrer completamente los tres menús usando solo el teclado, con un orden de tabulación lógico y el foco siempre visible.
- **FR-012**: El sistema NO DEBE comunicar ningún estado (activo, error, confirmado, etc.) usando exclusivamente el color; todo estado DEBE incluir también texto y, cuando aplique, un ícono.
- **FR-013**: El sistema DEBE mantener un contraste mínimo de 4.5:1 para texto normal y 3:1 para texto grande y elementos de interfaz, verificado en modo claro y en modo oscuro, usando una paleta de colores provisoria (neutra, con tokens semánticos) mientras la paleta de marca definitiva no esté decidida.
- **FR-014**: El menú hamburguesa de la web pública DEBE implementarse como un control real que informa su estado abierto/cerrado a tecnología asistiva, cerrarse con la tecla Escape, y mantener el foco dentro de él mientras está abierto.
- **FR-015**: Los ítems de la barra de navegación con sesión iniciada DEBEN mostrar siempre ícono y texto juntos (nunca solo ícono) y tener un objetivo táctil de al menos 44×44 px.

**Feedback y estados (Historia 3)**

- **FR-016**: Toda pantalla existente que muestra datos (Primeros pasos, Visitanos, registro) DEBE contemplar sus cuatro estados: cargando, vacío, error y éxito, con una presentación consistente entre pantallas.
- **FR-017**: Mientras se procesa el envío del formulario de registro (spec 001), el sistema DEBE mostrar el botón de envío en estado de carga y bloqueado, evitando un envío duplicado.
- **FR-018**: Los avisos breves (toasts) que el sistema muestre DEBEN ser accesibles para tecnología asistiva y permanecer visibles el tiempo suficiente para leerlos; ninguna información importante DEBE depender únicamente de un toast.
- **FR-019**: El sistema DEBE proveer un componente reutilizable de confirmación para acciones destructivas, que nombre explícitamente lo que se va a afectar y ofrezca deshacer la acción cuando sea técnicamente posible, disponible para que features futuras lo reutilicen.

**Errores (Historia 4)**

- **FR-020**: Toda respuesta de error de la API — incluidos los endpoints de Personas y Sedes del spec 001 — DEBE seguir un formato único que incluya un código de error estable y un identificador de la petición.
- **FR-021**: Ante un error de la API, la interfaz DEBE mostrar un mensaje amable en lenguaje simple correspondiente a ese código, sin exponer detalles técnicos.
- **FR-022**: Ante un error inesperado que no corresponda a ningún código específico, el sistema DEBE mostrar un mensaje genérico junto con el identificador de la petición.
- **FR-023**: El sistema DEBE mostrar una página propia de "sección no encontrada" (con enlaces a Inicio y a Primeros pasos) y una página propia de error general, en reemplazo de la pantalla nativa del navegador.
- **FR-024**: El sistema DEBE mostrar un aviso persistente cuando detecta que el dispositivo está sin conexión, deshabilitando las acciones que la requieren.
- **FR-025**: El sistema DEBE registrar los errores inesperados de manera que puedan revisarse posteriormente, sin incluir en ese registro ningún dato personal de la persona afectada.

**Tema claro/oscuro (Historia 5)**

- **FR-026**: Por defecto, el sistema DEBE mostrar la interfaz en el modo (claro u oscuro) indicado por la configuración del sistema operativo o navegador de quien la usa.
- **FR-027**: El sistema DEBE permitir que una Persona con sesión iniciada elija explícitamente el modo Claro, Oscuro o Sistema, tanto desde su Perfil en la app como desde el menú de usuario del backoffice.
- **FR-028**: El sistema DEBE recordar la preferencia de modo elegida por cada Persona y aplicarla automáticamente la próxima vez que inicie sesión, en cualquier dispositivo.
- **FR-029**: El sistema DEBE mantener el mismo nivel de contraste y legibilidad en las pantallas existentes tanto en modo claro como en modo oscuro.
- **FR-044** *(actualización 2026-09-18, revisión manual H-11)*: El sistema DEBE proveer una acción "Cerrar sesión" en el Perfil (app) y en el menú de usuario (backoffice), que pida confirmación explícita antes de cerrar la sesión y, al confirmar, vuelva al Inicio público mostrando un aviso breve.
- **FR-045** *(actualización 2026-09-18, revisión manual H-14)*: Ninguna de las dos apps DEBE depender de las pantallas por defecto del proveedor de autenticación (en otro idioma y sin el diseño del proyecto) para iniciar sesión, cerrar sesión, o mostrar un error de autenticación.

**Idioma (Historia 6)**

- **FR-030**: El sistema NO DEBE tener ningún texto de interfaz escrito directamente dentro del código de las pantallas existentes; todo texto visible DEBE provenir de un origen centralizado de mensajes.
- **FR-031**: El sistema DEBE registrar, para cada Persona, un idioma preferido, con español como valor por defecto, sin solicitarlo explícitamente durante el registro.
- **FR-032**: Los valores de listas predefinidas ya existentes (ej. estado civil, profesión, tiempo congregándose) DEBEN guardarse como claves estables y traducirse recién al mostrarse en la interfaz.
- **FR-033**: El documento de cada página DEBE declarar el idioma español como idioma activo, para que la tecnología asistiva lo reconozca correctamente.

**SEO base (Historia 7)**

- **FR-034**: Cada página pública (Inicio, Nosotros, Primeros pasos, Ministerios, Eventos, Visitanos, Dar) DEBE tener un título y una descripción propios, distintos entre sí.
- **FR-035**: El sistema DEBE proveer una vista previa (imagen, título, descripción) al compartir el enlace de cualquier página pública.
- **FR-036**: El sistema DEBE incluir, en al menos una página pública, datos estructurados de la iglesia (nombre, dirección, horarios) reconocibles por buscadores.
- **FR-037**: El sistema NO DEBE permitir que buscadores indexen ninguna página del área con sesión iniciada ni del backoffice.
- **FR-038**: El sistema DEBE proveer un mapa del sitio que liste las páginas públicas, para facilitar que los buscadores las encuentren.

**Datos de demostración (Historia 8)**

- **FR-039**: El sistema DEBE poder generar, mediante un proceso reproducible, un volumen mínimo viable de datos ficticios de ejemplo para lo que ya existe: al menos una Sede completa, y una o dos Personas por cada estado ya definido en el spec 001 (activa mayor de edad, pendiente_tutor, e inactiva por caso pendiente_tutor no autorizado) — sin generar volumen adicional de relleno todavía innecesario.
- **FR-040**: Los datos de demostración generados NO DEBEN corresponder a personas reales ni reutilizar información de miembros reales de la iglesia.
- **FR-041**: El proceso de generación de datos de demostración DEBE poder ampliarse por features futuras (para sus propias entidades) sin necesidad de rehacer los datos ya generados para Sede y Persona.

### Key Entities *(include if feature involves data)*

- **Persona** (ya existe, spec 001): suma dos atributos nuevos — un idioma preferido (español por defecto) y una preferencia de tema (Claro, Oscuro o Sistema, con Sistema por defecto) — ambos elegidos por la propia Persona y recordados entre sesiones. Sus atributos y estados existentes (activa, pendiente_tutor, roles) no cambian.
- **Sede** (ya existe, spec 001): sin cambios en sus datos; su información pasa a mostrarse dentro de la sección Visitanos en lugar de una página propia separada.
- **Catálogo de códigos de error**: lista compartida de identificadores estables que usa toda respuesta de error de la API; cada feature nueva agrega los códigos que le correspondan, sin reemplazar los ya existentes.

## Fuera de Alcance

Quedan explícitamente fuera de este spec (cada uno tendrá su propia especificación futura):

- Contenido real de Mi camino (Vida Nueva, Vida de Servicio, Ministerio, Bautismo) — en este spec la sección existe solo como parte de la navegación, con estado vacío.
- Eventos (cartelera, inscripciones, pagos, QR).
- Avisos con notificaciones push o email reales — el envío de notificaciones no se implementa acá.
- Envío real de emails (el sistema de errores y feedback se define, pero no el canal de email en sí).
- Integración con YouTube.
- Alta de Personas adultas por un Admin/Discipulador (D97).
- El formulario "Contanos qué te parece": su enlace no se agrega todavía a los menús, ya que la funcionalidad detrás no existe aún.
- Ministerios con datos reales (la sección existe en el menú, vacía).
- Portugués e inglés (la interfaz queda preparada, pero solo se carga contenido en español).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una persona que entra por primera vez a la web pública identifica dónde ver "cómo son los primeros pasos" o cómo llegar a la Sede en menos de 10 segundos, sin ayuda externa.
- **SC-002**: El 100% de las pantallas existentes (Primeros pasos, Visitanos, registro) pasan una revisión automática de accesibilidad de flujos críticos sin violaciones, tanto en modo claro como en modo oscuro.
- **SC-003**: Una persona puede llegar a cualquiera de las secciones de los tres menús navegando únicamente con teclado, sin quedar atrapada en ningún punto.
- **SC-004**: Ante un error de conexión con la API, el 100% de las pantallas existentes muestran un mensaje entendible (sin jerga técnica) con opción de reintentar, en vez de una pantalla en blanco o rota.
- **SC-005**: Una Persona que elige un modo de tema (Claro/Oscuro/Sistema) lo sigue viendo aplicado la próxima vez que inicia sesión, sin tener que volver a elegirlo.
- **SC-006**: Cero textos de interfaz quedan escritos directamente en el código de las pantallas existentes al finalizar la migración.
- **SC-007**: Al compartir el link de cualquier página pública, la vista previa muestra título, descripción e imagen reconocibles en el 100% de los casos.
- **SC-008**: Quien necesita hacer una demostración de la app puede mostrar al menos un caso de cada estado ya definido (Persona activa, Persona pendiente_tutor) usando únicamente los datos de ejemplo generados, sin cargar nada a mano.

## Assumptions

- El mecanismo de autenticación (SSO) y el modelo de datos de Persona y Sede del spec 001 no cambian en este spec, salvo por los dos atributos nuevos de Persona (idioma preferido, tema preferido) descritos en Key Entities.
- Los roles Líder de curso y Pastor/Pastora todavía no tienen pantallas propias con datos reales (dependen de features futuras como Grupos): en este spec, sus ítems de menú en el backoffice se muestran con estado vacío, igual que cualquier otra sección sin funcionalidad implementada.
- El selector manual de idioma no se agrega todavía a la interfaz (Perfil/menú de usuario), porque con un único idioma disponible no aporta valor; se agrega junto con el segundo idioma, en una fase futura.
- La elección de proveedor de monitoreo de errores (Sentry u otro) y los detalles técnicos de implementación de cada requisito quedan para la fase de planificación (`/speckit.plan`), no para este spec.
- El proceso de datos de demostración se diseña para crecer de forma incremental: en este spec solo cubre Sede y Persona, porque son las únicas entidades que existen hasta ahora.
- "Aparecer en buscadores" y "vista previa al compartir" se limitan a la configuración técnica de la app (metadatos, sitemap, datos estructurados); no incluyen acciones externas como registrar la iglesia en Google Business o comprar un dominio propio (D85, fuera de alcance de este spec).
- La paleta de marca definitiva sigue pendiente (docs/09-notas-identidad-visual.md, a decidir en Sesión 6). Este spec construye y verifica el modo claro/oscuro y el contraste (Historias 2 y 5) sobre una paleta neutra provisoria de tokens semánticos; reemplazar esa paleta por la definitiva no debería requerir rehacer la estructura de tokens, solo sus valores de color.
