# Feature Specification: Contenido institucional

**Feature Branch**: `003-contenido-institucional`

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: "Contenido institucional de la web pública y su gestión en el backoffice — ampliar Nosotros con el contenido real de la iglesia (identidad, historia, visión y misión, valores, sistema de trabajo, llamado, congregación local), agregar Palabra Profética y Ediciones VS como subpáginas de Nosotros, y su gestión (CRUD) desde el backoffice para el rol Admin. Cubre los hallazgos H-31 y H-32."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conocer a la iglesia en Nosotros (Priority: P1)

Un visitante de la web pública quiere saber quién es la iglesia antes de decidir acercarse: qué cree, desde cuándo existe, a qué apunta y qué la sostiene. Hoy la página Nosotros solo tiene una frase de bienvenida y el listado del equipo pastoral — el resto del contenido real (identidad, historia, visión y misión, valores, cómo funciona el proceso de la persona que llega, y el pasaje que da sentido a todo) todavía no está.

**Why this priority**: Es el contenido institucional que ya existe en el sitio actual de la iglesia y que cualquier visitante espera encontrar. Sin él, la sección más visible de "quiénes somos" queda vacía — es el corazón de H-32 y no depende de ninguna otra pieza de esta spec.

**Independent Test**: Entrando a Nosotros sin sesión, se puede leer identidad, historia, visión, misión, valores, el sistema de trabajo (Bienvenida → Discipulado → Red) y el llamado de la iglesia (Isaías 61 con Lucas 4), en los dos temas y sin errores de accesibilidad — sin necesitar que exista ningún dato cargado desde el backoffice.

**Acceptance Scenarios**:

1. **Given** un visitante sin sesión, **When** entra a Nosotros, **Then** encuentra, en una sola página con secciones claramente separadas: identidad (cristianos, evangélicos, bautistas), historia (nacimiento el 31/10/2010 en La Plata y el relato fundacional), visión, misión, los cuatro valores (calidad, unidad, generosidad, fe), el sistema de trabajo Bienvenida → Discipulado → Red con el detalle de cada etapa, el llamado de la iglesia (Isaías 61:1-4 y la referencia a Lucas 4), y una mención a la congregación local.
2. **Given** la sección "En qué creemos" (declaración de fe), **When** el visitante la busca, **Then** sigue marcada como contenido pendiente (no inventado), tal como ya lo está hoy — esta spec no la resuelve.
3. **Given** el sistema de trabajo ya se explica en Primeros pasos con otro enfoque (las etapas que la persona atraviesa), **When** se lo describe también en Nosotros, **Then** el texto no se duplica palabra por palabra: Nosotros lo cuenta desde la identidad de la iglesia, y enlaza a Primeros pasos para el detalle de cómo avanzar.
4. **Given** un visitante en celular, **When** recorre Nosotros, **Then** no hay scroll horizontal y el texto se lee cómodo, sin necesitar zoom.

---

### User Story 2 - Leer la Palabra Profética del año y conocer Ediciones VS (Priority: P2)

Un visitante quiere ver cuál es la Palabra Profética vigente de la iglesia (con su video) y conocer los libros que publicó Ediciones VS, la editorial de la iglesia — dos secciones que existían en el sitio anterior y hoy no tienen equivalente en la app.

**Why this priority**: Completa el contenido institucional real (H-32) con las dos secciones que el sitio anterior sí tenía. Depende de que Nosotros (User Story 1) ya exista como página de sección desde donde enlazar, pero no depende de que el backoffice sepa editarlas: alcanza con que haya una Palabra Profética vigente y libros cargados (por ejemplo, por el seed) para poder leerlos.

**Independent Test**: Con una Palabra Profética vigente y al menos un Libro activo ya cargados, se puede entrar a la subpágina de cada sección desde Nosotros, con URL propia, y leer su contenido — sin necesitar loguearse ni que el backoffice tenga la edición todavía implementada.

**Acceptance Scenarios**:

1. **Given** una Palabra Profética marcada vigente, **When** el visitante entra a su subpágina desde Nosotros, **Then** ve el título del año y el texto, y si tiene un video cargado (D121: es opcional) lo ve como miniatura, que no se carga hasta que la persona interactúa con ella (no retrasa el resto de la página).
2. **Given** que todavía no hay ninguna Palabra Profética vigente, **When** el visitante entra a esa subpágina, **Then** ve un estado vacío amable, no un error ni una página en blanco.
3. **Given** el catálogo de libros de Ediciones VS, **When** el visitante entra a su subpágina, **Then** ve la introducción de la editorial, cómo conseguir los libros (fuera de la app — no hay compra ni carrito), y el listado de libros activos con su portada (o un espacio con aspecto de portada si todavía no hay imagen real), título, autor/a y año.
4. **Given** un libro sin portada cargada, **When** aparece en el listado, **Then** se ve un espacio con la proporción de una tapa de libro, no una imagen inventada ni un espacio vacío sin marcar.
5. **Given** que las dos subpáginas existen, **When** se revisa la navegación, **Then** el menú público sigue teniendo los mismos cuatro ítems de siempre — Palabra Profética y Ediciones VS se llega a través de Nosotros, no agregan ítems al menú — y cada subpágina tiene su propia URL, indexable por separado.

---

### User Story 3 - Admin edita la Palabra Profética del año (Priority: P3)

Cada año, alguien de la iglesia tiene que poder cargar la nueva Palabra Profética (o corregir la vigente) sin depender de quien mantiene la app.

**Why this priority**: Es la pieza de gestión más simple de esta spec (un solo registro por vez, sin archivos) y la que menos tiempo tiene: la Palabra Profética cambia una vez al año y hoy no hay forma de actualizarla sin tocar código.

**Independent Test**: Con sesión de Admin, se puede cargar una Palabra Profética nueva marcándola vigente, y verificar que aparece así en la web pública mientras la anterior queda guardada mostrando "no vigente" — sin tocar el CRUD de Libro.

**Acceptance Scenarios**:

1. **Given** una sesión de Admin, **When** completa año, título y texto (la URL de un video de YouTube es opcional, D121) y guarda, **Then** el registro queda creado; si además lo marca vigente, la web pública lo muestra de inmediato en esa subpágina.
2. **Given** que ya existe una Palabra Profética vigente, **When** el Admin marca una nueva como vigente, **Then** la anterior deja de estarlo automáticamente, sin que el Admin tenga que hacer un paso aparte — y ambas quedan guardadas, visibles en el historial del backoffice.
3. **Given** una sesión de Pastor/Pastora, **When** entra a esta sección del backoffice, **Then** puede ver el historial completo pero ningún campo ni botón de guardar están habilitados para editar.
4. **Given** un campo obligatorio vacío o una URL de YouTube que no tiene ese formato, **When** el Admin intenta guardar, **Then** ve el error debajo del campo correspondiente, que desaparece al corregirlo sin tener que reenviar el formulario.

---

### User Story 4 - Admin gestiona el catálogo de libros de Ediciones VS (Priority: P4)

El Admin necesita poder dar de alta un libro nuevo cuando Ediciones VS publica uno, corregir los datos de uno existente, sacarlo de circulación sin perder su historia, y — si cargó algo mal — eliminarlo del todo si nadie más depende de él.

**Why this priority**: Es la pieza más grande de gestión de esta spec (alta, edición, portada con validaciones, inactivar/reactivar y papelera) y depende de que el modelo de Libro y su portada ya existan; por eso va después de las historias de solo lectura y de la gestión más simple (Palabra Profética).

**Independent Test**: Con sesión de Admin, se puede dar de alta un libro completo con su portada, verlo aparecer en la lista y en la web pública, inactivarlo (deja de verse en la web pero sigue en el listado del backoffice marcado como inactivo), reactivarlo, y eliminarlo llevándolo a la papelera, de donde se puede restaurar — todo sin tocar la Palabra Profética.

**Acceptance Scenarios**:

1. **Given** una sesión de Admin, **When** da de alta un libro con título, autor/a y año (la portada es opcional), **Then** el libro queda creado, activo, y visible en la web pública en Ediciones VS.
2. **Given** un libro con portada, **When** el Admin no completa el texto alternativo de la imagen, **Then** no puede guardar — el texto alternativo es obligatorio en cuanto hay portada.
3. **Given** un archivo de portada que no es JPG/PNG/WebP, o que pesa más del máximo permitido, **When** el Admin intenta subirlo, **Then** ve el error explicando qué está mal, antes de que el archivo quede guardado.
4. **Given** un libro con portada ya cargada, **When** el Admin sube una nueva o la quita, **Then** la web pública refleja el cambio (la anterior deja de servirse) y, si quitó la portada, el libro vuelve a mostrarse con el espacio con aspecto de portada.
5. **Given** un libro activo, **When** el Admin lo inactiva, **Then** deja de verse en la web pública pero sigue en el listado del backoffice (filtro "Todas"), marcado como inactivo, y se puede reactivar.
6. **Given** un libro (activo o inactivo), **When** el Admin lo elimina, **Then** desaparece de todas las vistas normales del backoffice y de la web pública, pero queda recuperable desde la papelera con la fecha y quién lo eliminó — eliminar un libro está permitido hoy porque nada más de la app depende de él todavía (FR-020).
7. **Given** una sesión de Pastor/Pastora, **When** entra a este listado, **Then** ve todo (incluida la papelera) pero no puede crear, editar, subir portada, inactivar, reactivar ni eliminar nada.
8. **Given** un rol que no es Admin ni Pastor, **When** intenta entrar a cualquiera de las dos secciones nuevas del backoffice, **Then** no las encuentra en su menú y el acceso directo por URL se lo niega, igual que con el resto del backoffice.

---

### User Story 5 - La marca real reemplaza al texto y al ícono por defecto (Priority: P5)

Llegaron los archivos de marca (isotipo y logotipo, documentados en `docs/marca/README.md`). Hoy, en los lugares donde debería verse la identidad de la iglesia, todavía se ve el nombre escrito como texto plano o el ícono por defecto de Next.js: el favicon de las dos apps, el ícono de instalación de la PWA, la barra de navegación pública y el pie de página de `apps/web`, la cabecera del sidebar de `apps/backoffice` (que hoy no tiene ninguna marca), la vista previa de Open Graph, y la marca de agua de `PlaceholderImagen` (ya prevista en su propio comentario de código, pendiente porque el archivo no existía todavía).

**Why this priority**: No bloquea ninguna otra historia de esta spec ni depende de ellas — es la pieza de menor prioridad porque es la más cosmética, pero cierra una brecha real entre lo que ya se pidió (docs/09-notas-identidad-visual.md) y lo que hoy se ve en pantalla.

**Independent Test**: Con los archivos de marca ya derivados a los tamaños que necesita cada uso, se puede verificar en las dos apps, en los dos temas y sin scroll horizontal a 320 px, que el favicon, el ícono de instalación, la navegación, el pie de página y la vista previa al compartir muestran el isotipo o el logotipo real — sin depender de que exista ninguna otra pieza de esta spec (Nosotros, Palabra Profética o Libro).

**Acceptance Scenarios**:

1. **Given** un libro o una foto de equipo sin imagen real, **When** se muestra su `PlaceholderImagen`, **Then** el isotipo aparece centrado al 20% de opacidad como marca de agua, en la versión clara u oscura según el tema activo, sin interferir con el texto alternativo del espacio (que sigue siendo el del propio placeholder).
2. **Given** cualquiera de las dos apps, **When** se la abre en el navegador o se la instala como PWA (`apps/web`), **Then** el favicon y el ícono de instalación muestran el isotipo, no el ícono por defecto de Next.js.
3. **Given** la barra de navegación pública de `apps/web`, **When** se la ve en escritorio, **Then** muestra el logotipo (símbolo + nombre) en la versión según el tema, en vez del nombre escrito como texto.
4. **Given** la misma barra de navegación, **When** se la ve en celular (320 px de piso), **Then** no aparece la proporción completa y apaisada del logotipo generando scroll horizontal — se ve el isotipo solo, o el logotipo con una altura reducida.
5. **Given** la cabecera del sidebar de `apps/backoffice` (hoy sin ninguna marca) y el pie de página de `apps/web`, **When** se los ve en cualquiera de los dos temas, **Then** muestran el logotipo con el mismo criterio de tema que el resto de los usos.
6. **Given** un enlace a cualquier página pública compartido fuera de la app (ej. WhatsApp), **When** se genera su vista previa, **Then** la imagen de Open Graph (1200×630) muestra el logotipo en vez del texto plano que usa hoy.
7. **Given** cualquier uso del isotipo o el logotipo, **When** se audita con axe, **Then** cada uno tiene su texto alternativo ("Vida Sobrenatural") o está marcado decorativo si ya hay, al lado, un título o encabezado que dice el nombre de la iglesia — nunca los dos textos a la vez ni ninguno de los dos.

---

### Edge Cases

- ¿Qué ve un visitante en Ediciones VS si, en algún momento, no queda ningún libro activo? Un estado vacío amable, no una sección en blanco ni un error.
- ¿Qué pasa si el Admin marca vigente una Palabra Profética que ya lo era (sin cambiar nada más)? No pasa nada raro: sigue siendo la única vigente, sin duplicar el historial.
- ¿Qué pasa con un título de libro larguísimo o un autor con tildes y ñ? Se ven completos, sin cortar el layout ni desbordar en celular (parte de la verificación de datos hostiles, junto con un libro sin descripción).
- ¿Qué pasa si el Admin sube una portada y, antes de guardar el resto del formulario, lo cancela? No queda un archivo huérfano servido públicamente sin un libro que lo referencie.
- ¿Qué pasa si dos Admins editan la Palabra Profética al mismo tiempo? Gana el último guardado (mismo criterio que el resto de la edición en el backoffice hoy) — no hay bloqueo optimista en esta spec.
- ¿Qué pasa con el ícono de YouTube del pie de página o la transmisión en vivo del culto? No es parte de esta spec — siguen dependiendo de que la iglesia entregue la URL del canal (pendiente documentado aparte).
- ¿Qué pasa si el Admin pega una URL que no es de YouTube, o de un video ya borrado/privado? El formato inválido se rechaza al guardar (FR-011); un video borrado o privado después de guardado válido queda fuera de esta spec — lo detecta quien mira la subpágina pública, igual que en el sitio anterior.
- ¿Qué pasa si la Palabra Profética vigente todavía no tiene un video cargado (D121)? La subpágina pública muestra año, título y texto igual, sin el bloque de video — no es un estado vacío ni un error, es una variante normal que puede completarse más adelante sin volver a publicar nada.
- ¿Qué pasa si la portada que sube el Admin es apaisada o cuadrada, no vertical? Se recorta centrada a la proporción de tapa (2:3) al procesarla (FR-024) — el libro se ve con el mismo formato que el resto del listado.
- ¿Qué pasa con el vectorial (SVG) y el swoosh de la marca, que todavía no llegaron? No se inventan ni se aproximan: esta spec usa únicamente los PNG ya entregados (isotipo y logotipo, ver `docs/marca/README.md`), tal como están.
- ¿Qué pasa con la cabecera del sidebar de `apps/backoffice`, que hoy no tiene ningún nombre que "reemplazar"? Se agrega el logotipo igual, con el mismo criterio del resto de la app — no es un caso especial, es la misma pieza en un lugar que hoy está vacío.

## Requirements *(mandatory)*

### Functional Requirements

**Web pública — Nosotros y sus subpáginas**

- **FR-001**: El sistema MUST mostrar en Nosotros, sin necesitar sesión, el contenido institucional real de la iglesia: identidad (cristianos, evangélicos, bautistas), historia (nacimiento el 31 de octubre de 2010 en La Plata y el relato fundacional), visión, misión, los cuatro valores (calidad, unidad, generosidad, fe), el sistema de trabajo Bienvenida → Discipulado → Red con el detalle de cada etapa, el llamado de la iglesia (Isaías 61:1-4, con la referencia a Lucas 4:16-21), y una mención a pertenecer a una congregación local.
- **FR-002**: El sistema MUST conservar en Nosotros, sin cambios de contenido, lo que ya existe hoy (la introducción "Somos Familia", el listado del equipo pastoral con su placeholder de foto, y "En qué creemos" marcado como contenido pendiente).
- **FR-003**: El sistema MUST ofrecer Palabra Profética y Ediciones VS como subpáginas propias, enlazadas desde Nosotros, cada una con su propia URL y sin agregar ítems al menú principal (que sigue teniendo cuatro).
- **FR-004**: El sistema MUST mostrar, en la subpágina de Palabra Profética, la que esté marcada vigente: su año, título, texto y el video de YouTube asociado.
- **FR-005**: Cuando la Palabra Profética vigente tiene un video cargado (D121: es opcional), MUST mostrarse primero como una miniatura, sin cargar el reproductor hasta que la persona hace clic (mismo patrón ya definido para YouTube en D93), y el reproductor MUST embeberse desde el dominio de YouTube sin cookies (`youtube-nocookie.com`) — resuelve a la vez el tiempo de carga de la página y evitar que se activen rastreadores de terceros antes de que la persona decida ver el video (D5, y el pendiente de política de privacidad bajo la Ley 25.326). Sin video cargado, la subpágina MUST mostrar el resto del contenido igual, sin ese bloque — no es un estado vacío ni un error, es una variante normal.
- **FR-006**: El sistema MUST mostrar un estado vacío (no un error) en la subpágina de Palabra Profética cuando todavía no hay ninguna marcada vigente.
- **FR-007**: El sistema MUST mostrar, en la subpágina de Ediciones VS, el texto de introducción de la editorial, cómo se consiguen los libros (fuera de la app: no hay compra ni carrito) y el listado de los libros activos, cada uno con su portada (o un espacio con la proporción de una tapa cuando no hay portada real), título, autor/a y año, en el orden definido para cada uno.
- **FR-008**: El sistema MUST mostrar un estado vacío (no un error) en Ediciones VS cuando no queda ningún libro activo.
- **FR-009**: Cada subpágina nueva MUST tener su propia entrada en el mapa del sitio para buscadores, y las páginas del área privada y el backoffice MUST seguir sin indexarse.

**Backoffice — Palabra Profética**

- **FR-010**: El sistema MUST permitir al rol Admin crear una Palabra Profética con año, título y texto como datos obligatorios; la URL de un video de YouTube es opcional (D121) — puede llegar después del anuncio, o no llegar nunca, sin que eso bloquee publicar la palabra.
- **FR-011**: Cuando el Admin carga una URL de video, el sistema MUST validar que sea una URL de YouTube reconocible, de la que se pueda extraer el identificador del video; si no lo es, MUST rechazarla con un error claro antes de guardar, en vez de guardar un valor que después rompa la subpágina pública en silencio. Dejar el campo vacío MUST seguir siendo válido (D121).
- **FR-012**: El sistema MUST permitir al rol Admin marcar una Palabra Profética como vigente; al hacerlo, la que estuviera vigente hasta ese momento MUST dejar de estarlo automáticamente, sin un paso manual aparte.
- **FR-013**: El sistema MUST conservar toda Palabra Profética anterior (nunca se borra al reemplazarla), visible en un historial dentro del backoffice.
- **FR-014**: El sistema MUST validar el formulario de Palabra Profética campo por campo, con el error apareciendo debajo del campo correspondiente, limpiándose al corregirlo y revalidándose al salir del campo, sin necesitar un nuevo intento de envío para ver que se corrigió.

**Backoffice — Catálogo de Libros (Ediciones VS)**

- **FR-015**: El sistema MUST permitir al rol Admin dar de alta un Libro con título, autor/a y año como datos obligatorios; descripción y portada son opcionales.
- **FR-016**: El sistema MUST permitir al rol Admin establecer y cambiar el orden de un Libro dentro del listado — es lo que define en qué posición aparece cada libro en la subpágina pública de Ediciones VS.
- **FR-017**: El sistema MUST permitir al rol Admin editar los datos de un Libro existente, inactivarlo, reactivarlo, y eliminarlo.
- **FR-018**: El sistema MUST seguir, para el listado y las acciones de Libro, el mismo comportamiento que ya existe para Sedes: filtro de activos/todos, columna de acciones, alta en un panel/modal, detalle editable, e inactivar/reactivar sin perder el registro.
- **FR-019**: El sistema MUST implementar "eliminar" un Libro como un borrado recuperable (con fecha y quién lo eliminó), que lo saca de toda vista normal del backoffice y de la web pública, pero lo deja disponible en una papelera desde donde se puede restaurar.
- **FR-020**: Hoy un Libro no tiene dependientes en el modelo (ninguna otra entidad lo referencia); mientras eso sea así, eliminarlo MUST estar permitido sin una condición de "tiene datos relacionados" que lo bloquee, a diferencia de otros registros de catálogo. Esto es una condición del estado actual del modelo, no una regla permanente: si una spec futura agrega una entidad que referencia a Libro (ej. el registro de ventas de la mesa de libros del backlog, `docs/08-roadmap-producto.md`), esa spec MUST sumar la misma condición de bloqueo que ya usa Sede.
- **FR-021**: El sistema MUST permitir al rol Admin subir una imagen de portada para un Libro, reemplazarla o quitarla en cualquier momento.
- **FR-022**: El sistema MUST validar, antes de aceptar una portada, que el archivo sea de un tipo de imagen permitido (JPG, PNG o WebP) y que no supere el tamaño máximo permitido, rechazándolo con un mensaje claro en caso contrario.
- **FR-023**: El sistema MUST procesar toda portada aceptada (redimensionarla y recomprimirla) antes de guardarla, en vez de conservar el archivo tal como se subió, y MUST asignarle un nombre de archivo propio, no el que trae quien lo sube.
- **FR-024**: Si la imagen subida no tiene ya la proporción vertical de una tapa (2:3) — por ejemplo, una foto apaisada o cuadrada —, el sistema MUST encajarla recortándola centrada a esa proporción como parte del mismo procesamiento (FR-023), para que todos los libros del listado se vean parejos entre sí, sin deformar la imagen ni dejar franjas vacías alrededor.
- **FR-025**: El sistema MUST exigir el texto alternativo de la portada en cuanto un Libro tiene una imagen cargada, y MUST impedir guardar una portada sin ese texto.
- **FR-026**: El sistema MUST servir la imagen de portada resultante de forma pública (accesible sin sesión), sin que el punto de entrada usado para subirla sea público.
- **FR-027**: El sistema MUST mostrar, para todo Libro sin portada (en el backoffice y en la web pública), un espacio con la proporción de una tapa de libro en lugar de una imagen — nunca una imagen inventada ni un espacio sin marcar.

**Permisos**

- **FR-028**: El sistema MUST permitir editar la Palabra Profética y el catálogo de Libros (crear, editar, subir portada, inactivar, reactivar, eliminar, restaurar) únicamente al rol Admin.
- **FR-029**: El sistema MUST permitir al rol Pastor/Pastora ver ambas secciones del backoffice (incluida la papelera de Libros) en modo de solo lectura, sin ninguna acción de edición habilitada.
- **FR-030**: El sistema MUST impedir a cualquier otro rol acceder a estas dos secciones del backoffice, tanto desde el menú como por acceso directo a la URL.

**Datos de ejemplo**

- **FR-031**: El seed mínimo del sistema MUST incluir una Palabra Profética vigente y los ocho libros reales del catálogo de Ediciones VS, sin portada real (con el espacio con aspecto de portada).
- **FR-032**: El seed de demostración MUST ampliar los datos anteriores con casos hostiles a propósito: un libro con un título muy largo, un libro cuyo autor/a lleva tildes o ñ, y un libro sin descripción cargada.

**Marca — identidad visual**

- **FR-033**: El sistema MUST derivar de los archivos de marca ya entregados (isotipo y logotipo, documentados en `docs/marca/README.md`) los tamaños que necesita cada uso de esta historia, sin pedir archivos adicionales al equipo de diseño.
- **FR-034**: `PlaceholderImagen` MUST mostrar el isotipo centrado al 20% de opacidad como marca de agua, en la versión clara u oscura según el tema activo (D95/D106), marcada como decorativa — sin duplicar ni competir con el texto alternativo que ya lleva el espacio.
- **FR-035**: El favicon de `apps/web` y el de `apps/backoffice` MUST derivarse del isotipo, en reemplazo del que trae Next.js por defecto.
- **FR-036**: El ícono de instalación de la PWA de `apps/web` (única de las dos apps que es PWA, D47) MUST derivarse del isotipo.
- **FR-037**: La barra de navegación pública de `apps/web` MUST mostrar el logotipo (símbolo + nombre) en la versión según el tema, en reemplazo del nombre escrito como texto plano que muestra hoy.
- **FR-038**: La cabecera del sidebar de `apps/backoffice` MUST mostrar el logotipo, con el mismo criterio de tema que FR-037.
- **FR-039**: El pie de página de `apps/web` MUST mostrar el logotipo, con el mismo criterio de tema que FR-037.
- **FR-040**: En anchos de celular (320 px de piso, H-62), la barra de navegación de `apps/web` MUST evitar la proporción apaisada completa del logotipo (7.5:1) para no producir scroll horizontal: MUST mostrar el isotipo solo, o el logotipo con una altura reducida (24-32 px) y ancho libre.
- **FR-041**: La imagen de Open Graph de las páginas públicas (1200×630, D82) MUST incorporar el logotipo, en reemplazo del texto plano que usa hoy como marcador temporal.
- **FR-042**: Todo uso del isotipo o el logotipo MUST llevar su texto alternativo ("Vida Sobrenatural") salvo que esté junto a un título o encabezado que ya diga el nombre de la iglesia, caso en el que MUST quedar marcado como decorativo en vez de duplicar el texto para quien usa lector de pantalla.

### Key Entities

- **Palabra Profética**: contenido institucional del año — a qué año pertenece, título, texto (obligatorio: sin texto no hay palabra que publicar) y, opcionalmente, un video de YouTube asociado (D121 — el video es una de las formas en que se comparte la palabra, no la palabra en sí; puede llegar después o no llegar). En un momento dado hay como máximo una vigente; las anteriores se conservan como historial, nunca se borran.
- **Libro** (Ediciones VS): título, autor/a, año de publicación, descripción opcional, orden de aparición en el listado, y un par portada + texto alternativo (los dos juntos u ninguno de los dos). Tiene un estado activo/inactivo (para sacarlo de circulación sin perderlo) y puede quedar eliminado (borrado recuperable, con fecha y responsable) de forma independiente de ese estado.

La Historia 5 no agrega ninguna entidad: el isotipo y el logotipo son archivos estáticos (ver `docs/marca/README.md`), sin persistencia en la base de datos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un visitante que entra por primera vez a Nosotros encuentra, sin salir de esa página o sus subpáginas directas, la identidad, historia, visión, misión y valores de la iglesia.
- **SC-002**: Un Admin sin ayuda técnica puede actualizar la Palabra Profética del año (texto y video) y verla publicada en menos de 3 minutos.
- **SC-003**: Un Admin sin ayuda técnica puede dar de alta un libro nuevo con su portada en menos de 5 minutos, incluyendo corregir un error de formato de imagen si se equivoca de archivo la primera vez.
- **SC-004**: El 100% de las páginas y subpáginas nuevas (Nosotros, Palabra Profética, Ediciones VS, y las dos secciones nuevas del backoffice) pasan la auditoría de accesibilidad automática en modo claro y oscuro, sin excepciones sin justificar.
- **SC-005**: Las páginas públicas nuevas cumplen, medidas en celular, las metas ya definidas para toda la app: carga del contenido principal en menos de 2.5 segundos, respuesta a la primera interacción en menos de 200 milisegundos, y sin saltos de layout perceptibles (menos de 0.1 de variación acumulada).
- **SC-006**: Marcar una Palabra Profética nueva como vigente no requiere ningún paso manual adicional sobre la anterior — queda no vigente en la misma acción.
- **SC-007**: El favicon, el ícono de instalación de la PWA, la barra de navegación, el pie de página y la vista previa de Open Graph de las dos apps muestran la marca real (isotipo o logotipo) en los dos temas — ninguno muestra el nombre en texto plano donde antes lo hacía, ni el ícono por defecto de Next.js.

## Assumptions

- El texto de "En qué creemos" (declaración de fe) sigue sin existir en un formato que se pueda publicar — no se inventa (ver Principio de la Constitución sobre no inventar contenido institucional) — y esta spec no lo resuelve; sigue marcado como pendiente, igual que hoy.
- Las fotos reales del equipo pastoral y las portadas reales de los ocho libros del catálogo siguen sin estar disponibles al momento de esta spec; se usan los espacios con aspecto definido (placeholders) donde falta el material, nunca una imagen generada o inventada.
- El sistema de trabajo (Bienvenida → Discipulado → Red) se cuenta una sola vez en detalle — en Primeros pasos, con el enfoque de "qué etapa atravieso yo" — y en Nosotros se referencia desde la identidad de la iglesia, enlazando en vez de duplicar el texto completo.
- Las URLs de las subpáginas nuevas cuelgan de Nosotros (por ejemplo, la Palabra Profética y Ediciones VS como rutas propias dentro de esa sección), siguiendo el mismo criterio de "página de sección con subpáginas propias" que ya define la navegación pública (D115).
- Para los ocho libros reales del seed mínimo, el orden cronológico de publicación es un punto de partida razonable — el Admin lo puede cambiar después (FR-016).
- La cita de Bill Hybels dentro de "Nuestro desarrollo en una congregación local" se usa citada brevemente con su atribución (no reproducida completa), por ser material de un tercero.
- No hay edición colaborativa con bloqueo: si dos personas del rol Admin guardan la misma Palabra Profética o el mismo Libro casi al mismo tiempo, gana el último guardado — mismo criterio que el resto de la edición del backoffice hoy.
- Fuera de alcance de esta spec: el resto del backoffice (Personas, Solicitudes, Catálogos, Grupos) — queda para su propia spec — y todo lo relacionado con venta de libros o donaciones dentro de la app, que sigue sin existir.
- El vectorial (SVG) de la marca y el swoosh siguen sin existir — la Historia 5 usa únicamente los PNG ya entregados (isotipo y logotipo), sin recrearlos ni aproximarlos; quedan en la tabla de pendientes ya documentada (`docs/marca/README.md`, `docs/12-contenido-bienvenida.md`).
- Los tamaños derivados de la marca (favicon, ícono de PWA, marca de agua, logotipo de navegación) se generan a partir de los archivos de marca ya entregados como parte de esta spec — no se le vuelven a pedir archivos al equipo de diseño.
