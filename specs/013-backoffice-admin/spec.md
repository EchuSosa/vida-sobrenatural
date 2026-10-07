# Feature Specification: Backoffice del Admin — bandeja unificada, perfil de Persona, catálogos y métricas

**Feature Branch**: `013-backoffice-admin`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "013 — Backoffice del Admin: bandeja unificada, perfil de Persona, catálogos y métricas. Todo lo que dicen `docs/02` (Back office / Admin) y `docs/14` §3, con D142 (el backoffice es del Admin; el Pastor solo lectura). Incluye lo que no cubren las otras specs: bandeja unificada de Solicitudes (Discipulado, Vida de Servicio, Bautismo, Postulaciones, Inscripciones a Evento, Pagos; cada spec construye su propia gestión y esta bandeja las agrupa), vista de perfil unificada por Persona (roles, historial, Relaciones Familiares, foto D87), listado de cumpleaños del mes, comentarios de 'Contanos qué te parece' (D102, si no está construido), métricas básicas (Personas activas, distribución por `tiempo_congregacion` y por Sede), y CRUD de Curso si no está en otra spec."

**Fuentes** (la spec se deriva de acá, no inventa producto): `docs/02-alcance-mvp.md` (Back office / Admin),
`docs/14-navegacion.md` §3, `docs/07-flujos-casos-de-uso.md` (Flujo 9 y Flujo 12), `docs/04-dominio-entidades.md`
(patrón común de Solicitudes, Comentario de la app, Curso), `docs/16-sistemas-transversales.md` §3,
`docs/15-guia-ux-ui.md` (Backoffice, listados paginados, checklist), y las decisiones D37, D38, D60–D62,
D64, D87, D102, D117, D119, D132, D134, D142–D148, D150, D151.

## Qué ya existe y esta spec NO vuelve a construir

Relevado en `apps/backoffice` y `apps/api` el 2026-10-07 (rama `main`, `22a04e2`):

- **Sedes** (CRUD completo con papelera, D119), **Libros**, **Palabra Profética**, **Pendientes de tutor**:
  construidos. Esta spec solo cambia **dónde aparece Sedes en el menú** (pasa a vivir bajo Catálogos, FR-060).
- **Personas**: hay listado paginado con búsqueda, panel de roles de cargo y su historial de cambios (spec 005).
  **No** hay perfil por Persona ni foto. Esta spec agrega el perfil (Historia 2) y enlaza el listado con él.
- **Solicitudes** (spec 004): bandeja paginada **solo de Discipulado**, con detalle y resolución propias. Esta spec
  la **generaliza** a todos los tipos sin tocar la resolución de Discipulado.
- **Grupos** de Vida Nueva (004): listado y detalle. No se tocan.
- **Inicio**: hoy es un aterrizaje con la tarjeta de pendientes de discipulado (`TarjetaPendientes`) y un estado
  vacío "Todavía no hay métricas ni pendientes…". Esta spec lo llena (Historia 3).
- **Catálogos**: hoy es un placeholder con un enlace a Sedes. Esta spec lo convierte en el índice de catálogos y
  suma Cursos (Historia 6).
- **No existen**: Comentario de la app ("Contanos qué te parece") — ni modelo, ni formulario, ni listado —,
  cumpleaños, métricas, perfil de Persona, CRUD de Curso.

## Lo que construyen otras specs (dependencias, no se especifican acá)

| Spec | Qué aporta que esta spec usa |
|---|---|
| 004 (construida) | Solicitud de Discipulado, Grupo, Inscripción, Liderazgo; su detalle y resolución en `/solicitudes/[id]`. |
| 005 (construida) | Catálogo de permisos (D132), panel de roles y su historial (`CambioDeRol`). |
| 006 | Traslado del Discipulador/Líder a la web app (D142), **alta de adultos por el Admin** (Flujo 12, D143, D145), **Completitud Manual** y la confirmación de "Ya lo hice" (D144); `Persona.email` opcional (D145). |
| 007 | `EmailService`, la huella de origen (`X-Origen-Cliente`) y el código `DEMASIADOS_PEDIDOS` para límites de envíos; la regla de normalizar el email en toda escritura. |
| 008 | Vida de Servicio: la solicitud de inscripción y su gestión; nuevos valores de `CategoriaCurso`/`ModalidadCurso` y `prerequisito_categoria` de Curso. |
| 009 | Ministerios, Células y Postulaciones (y el CRUD de Ministerio y Célula). |
| 010 | Solicitud de Bautismo y su gestión (D147). |
| 011 | Eventos, Inscripciones a Evento y Pagos, y su gestión (D148). |

Cada una construye **la gestión de su tipo** (detalle, aprobar, rechazar, verificar). Esta spec construye **el lugar
común**: la bandeja que las junta, el perfil que las muestra por Persona, y el mecanismo para que cada tipo se sume
sin tocar las pantallas de esta spec (FR-007).

## Clarifications

### Session 2026-10-07 (corrida sin Echu — resuelto como Assumptions)

Esta corrida no tiene a Echu disponible para preguntar. Lo que `docs/` no decide se resolvió como Assumption
razonable (sección final); las cinco decisiones de producto de más peso están en **"Preguntas para Echu"**, cada una
con la recomendación que esta spec ya aplica.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver todo lo que espera una respuesta mía, en un solo lugar (Priority: P1)

El Admin entra a **Solicitudes** y ve, en una sola bandeja, todo lo que las Personas pidieron y espera una
decisión suya: Solicitudes de Discipulado, inscripciones a Vida de Servicio, Solicitudes de Bautismo,
Postulaciones a Ministerio, Inscripciones a Evento pendientes y Pagos a verificar. Por defecto ve lo **abierto**
(lo que necesita una acción), lo más viejo primero. Puede filtrar por tipo, buscar por nombre, ver lo resuelto, y
desde cada fila ir al detalle de ese tipo, donde lo resuelve.

**Why this priority**: es la vista que más usa un Admin real (D61, `docs/14` §3). Sin ella, cada tipo nuevo agrega
una pantalla más que revisar y lo que espera se pierde entre pantallas.

**Independent Test**: con solo Discipulado conectado (004, ya construida) la bandeja funciona igual que hoy más el
filtro "Abiertas/Resueltas/Todas" y el enlace al perfil; con un segundo tipo de prueba registrado en el mecanismo de
FR-007 aparece mezclado, paginado y ordenado sin tocar la pantalla.

**Acceptance Scenarios**:

1. **Given** hay 3 Solicitudes de Discipulado `pendiente`, 1 `propuesta` y 2 `aprobada`, **When** el Admin abre
   Solicitudes, **Then** ve las 4 abiertas, ordenadas por espera (la más vieja arriba), cada una con tipo, Persona,
   estado, fecha y días de espera — tipo y estado en texto + ícono (D81).
2. **Given** la bandeja con dos tipos conectados, **When** el Admin elige el tipo "Bautismo", **Then** ve solo esos,
   el filtro queda en la URL y la página vuelve a 1 (`docs/15`, listados).
3. **Given** un solo tipo conectado, **When** se abre la bandeja, **Then** el filtro por tipo no se muestra
   (un filtro con una sola opción es ruido — clarificación de la 004).
4. **Given** una fila de la bandeja, **When** el Admin la abre, **Then** llega al detalle de ese tipo (el que
   construyó su spec); el nombre de la Persona lleva a su perfil (Historia 2).
5. **Given** "Resueltas", **When** el Admin la elige, **Then** ve lo aprobado/rechazado/retirado/verificado con
   quién lo revisó y cuándo.
6. **Given** el Pastor, **When** abre la bandeja, **Then** ve lo mismo, sin ninguna acción de resolver (D64, D142);
   el detalle de cada tipo decide lo suyo.
7. **Given** una Solicitud creada en nombre de la Persona (D97), **Then** la fila dice "Cargada por <nombre>".
8. **Given** 45 abiertas, **Then** la bandeja pagina de a 20 desde la API, con "Página 1 de 3" (`docs/15`).

---

### User Story 2 - Ver a una Persona entera en una pantalla (Priority: P1)

Desde el listado de Personas, la bandeja o cualquier lugar donde aparece un nombre, el Admin abre el **perfil**
de la Persona: foto (si vino de Google, D87) o sus iniciales, datos personales y de contacto, Sede, roles (de cargo
y de estado), cómo se dio de alta, y su historial completo — Solicitudes de todos los tipos con su estado, Grupos
en los que estuvo (como participante o a cargo), Completitudes Manuales, Ministerio, Eventos — más sus Relaciones
Familiares. Desde ahí llega a las acciones que ya existen: gestionar roles, pedir en su nombre, y las que traigan
otras specs.

**Why this priority**: es la otra mitad de D61 — "en vez de tener que buscar por separado en cada módulo". Es
también el lugar natural para las acciones en nombre de una Persona (Flujo 12) y la Completitud Manual (006).

**Independent Test**: con los datos de 004 y 005 (Solicitudes de Discipulado, Grupos, roles, historial de roles,
Relaciones Familiares de tipo `tutor`) el perfil muestra todo sin depender de otra spec.

**Acceptance Scenarios**:

1. **Given** una Persona registrada con Google (con `foto_url`), **When** el Admin abre su perfil, **Then** ve su
   foto con texto alternativo "Foto de <nombre>"; **Given** una sin foto, **Then** ve sus iniciales en un bloque
   con contraste verificado (D118), nunca una caja gris vacía.
2. **Given** una Persona con un discipulado finalizado y otro pedido rechazado antes, **Then** el historial muestra
   las dos Solicitudes (con estado en texto + ícono y fecha) y el Grupo finalizado, cada uno enlazado a su detalle.
3. **Given** una Persona que es Discipuladora, **Then** el perfil muestra también los Grupos que tiene a cargo
   (vigentes y pasados), separados de los que cursó.
4. **Given** una Persona menor activada por su tutor (Flujo 7), **Then** el perfil muestra los datos del tutor y,
   si el tutor es una Persona registrada, el vínculo enlazado a su perfil.
5. **Given** una Relación Familiar guardada desde el otro lado (ej. la Persona es el `familiar` de un `tutor`),
   **Then** el perfil la muestra con el nombre inverso resuelto en código ("a cargo de", D112).
6. **Given** el Pastor, **Then** ve el perfil completo, incluidos datos de contacto (D64), sin botones de gestión.
7. **Given** cualquier rol, **Then** el perfil **nunca** muestra el texto de las notas de los Encuentros (D134).
8. **Given** un id que no existe, **Then** "No encontramos esta Persona" con enlace al
   listado (404 propio, no un error genérico).
9. **Given** el perfil abierto en un celular (360 px), **Then** no hay scroll horizontal y cada sección se puede
   leer y tocar con textos de 16 px y áreas de 44 px (D150).

---

### User Story 3 - Saber cómo está la iglesia al entrar (Priority: P2)

Al entrar al backoffice, el Admin (y el Pastor) ven el **Inicio**: cuántas cosas abiertas hay en la bandeja por
tipo (con enlace a la bandeja ya filtrada), los pendientes de discipulado que ya existen, los cumpleaños de hoy y de
los próximos días, los comentarios nuevos de "Contanos qué te parece", y las **métricas básicas**: cantidad de
Personas activas, su distribución por tiempo de congregación y por Sede.

**Why this priority**: `docs/14` §3 define así el Inicio del Admin y hoy muestra "todavía no hay métricas". No
bloquea ninguna gestión (todo se puede hacer desde las otras pantallas), por eso P2.

**Independent Test**: con el seed, el Inicio muestra los cuatro bloques con números verificables contra la base.

**Acceptance Scenarios**:

1. **Given** 120 Personas activas, 8 pendientes de tutor y 3 dadas de baja (`activo = false`), **Then** "Personas activas" dice 120.
2. **Given** la distribución por tiempo de congregación, **Then** se muestran los cinco rangos en su orden natural
   (de menos de 6 meses a más de 5 años), cada uno con cantidad y porcentaje **en texto**, y un gráfico de barras
   que no es la única forma de leer el dato (D81).
3. **Given** dos Sedes, una inactiva, **Then** la distribución por Sede las muestra a las dos, la inactiva marcada
   como tal en texto.
4. **Given** que la API devuelve 0 Personas activas (instalación recién hecha, antes de que el Admin sembrado tenga
   Sede activa, o una respuesta simulada en el test), **Then** cada bloque de métricas muestra su estado vacío, nunca
   "NaN" ni un porcentaje de una división por cero; un rango o una Sede con 0 muestra "0" y "0 %".
5. **Given** 5 abiertas de Discipulado y 2 de Bautismo, **Then** el bloque de pendientes dice "5 de Discipulado ·
   2 de Bautismo" y cada uno lleva a la bandeja filtrada; **Given** ninguna abierta, **Then** "No hay nada esperando
   una respuesta".
6. **Given** que falla la consulta de un bloque, **Then** solo ese bloque muestra su error con "Reintentar"; los
   demás se ven.

---

### User Story 4 - Saludar a quien cumple años (Priority: P2)

El Admin ve en el Inicio quién cumple años **hoy** y en los próximos 7 días, y en una pantalla propia el
**listado del mes** (con la posibilidad de mirar otro mes): nombre, día, cuántos cumple y teléfono para escribirle.

**Why this priority**: D62 — "alto valor pastoral con costo de implementación casi nulo".

**Independent Test**: con Personas sembradas con cumpleaños hoy, mañana, el último día del mes y el 29 de febrero,
la lista y el bloque del Inicio muestran exactamente las que corresponden.

**Acceptance Scenarios**:

1. **Given** hoy es 7 de octubre en Argentina, **Then** el listado del mes muestra a las Personas activas que
   cumplen en octubre, ordenadas por día, con "cumple 34" y la marca "Hoy" (texto + ícono) en las de hoy.
2. **Given** las 23:30 del 6 de octubre en Argentina (02:30 del 7 en UTC), **Then** "hoy" es el 6 (fecha civil
   argentina, la misma `hoyEnArgentina` de la 004).
3. **Given** una Persona nacida un 29 de febrero, **When** el año no es bisiesto, **Then** aparece el 28 de febrero.
4. **Given** el mes elegido es otro (`?mes=12` o `?mes=1` mirado en octubre), **Then** muestra ese mes **del año en
   curso**: "cumple N" (o "cumplió N" si el día ya pasó) se calcula para el año en curso, y el 29/2 cae el 28 si el
   año en curso no es bisiesto.
5. **Given** una Persona `pendiente_tutor` o dada de baja (`activo = false`), **Then** no aparece.
6. **Given** el bloque del Inicio con 0 cumpleaños en 7 días, **Then** dice "Nadie cumple años esta semana" y
   enlaza al listado del mes.

---

### User Story 5 - Contarnos qué te parece, y leerlo (Priority: P2)

Cualquiera — con o sin sesión, en la web pública, en la app o en el backoffice — puede mandar un comentario corto
("Problema" o "Sugerencia"), y decir si acepta que lo contacten. El Admin los ve en el backoffice: los nuevos en el
Inicio y todos en su listado, y los marca como revisados.

**Why this priority**: D102 lo pone en el MVP como el canal para detectar problemas durante la demo y los primeros
usos; hoy no existe ninguna de sus partes.

**Independent Test**: enviar un comentario sin sesión desde el pie de la web y verlo en el listado del backoffice;
marcarlo revisado y verlo salir de "Sin revisar".

**Acceptance Scenarios**:

1. **Given** alguien sin sesión en la web pública, **When** abre "Contanos qué te parece" desde el pie de página,
   elige "Problema", escribe el texto y envía, **Then** ve la confirmación "¡Gracias! Lo vamos a leer…" con qué pasa
   después, y el comentario queda guardado con la página de origen, el navegador y el último `requestId`.
2. **Given** una Persona con sesión (web o backoffice), **Then** el comentario queda asociado a ella, sin pedirle
   datos de contacto: si acepta que la contacten, se usan los de su perfil.
3. **Given** alguien sin sesión que marca "Pueden contactarme", **Then** se le pide un email o teléfono (uno de los
   dos, opcional el otro); sin ninguno no puede enviar con esa casilla marcada, y el error dice cómo corregirlo.
4. **Given** el texto vacío o de más de 2000 caracteres, **Then** error en el campo, resumen arriba con enlace y foco
   en el resumen (H-50), sin borrar lo escrito.
5. **Given** el mismo origen manda más de 5 comentarios en una hora sin sesión, **Then** el sexto se rechaza con
   "Mandaste varios comentarios seguidos. Probá de nuevo en N minutos" (`DEMASIADOS_PEDIDOS`, 007).
6. **Given** un comentario nuevo, **Then** se envía un email a la dirección configurada para la desarrolladora, con
   asunto sin datos sensibles; si el envío falla, el comentario igual queda guardado.
7. **Given** el Admin en el listado de comentarios, **When** marca uno como revisado, **Then** pasa a "Revisado" (texto
   + ícono) con quién y cuándo, y puede deshacerlo; el filtro por defecto es "Sin revisar".
8. **Given** el Pastor, **Then** ve los comentarios sin poder marcarlos.

---

### User Story 6 - Catálogos: Cursos junto a Sedes (Priority: P3)

El Admin entra a **Catálogos** y ve los catálogos de la iglesia — Sedes, Cursos y, cuando existan, Ministerios y
Células — con cuántos registros activos tiene cada uno. En **Cursos** ve las plantillas (hoy Vida Nueva individual
y grupal), puede cambiarles el nombre y la descripción, inactivarlas y reactivarlas, y eliminar (a la papelera) las
que se cargaron por error y no tienen Grupos.

**Why this priority**: es parte del CRUD de catálogos de `docs/02` y del Flujo 9, pero los Cursos son pocos y hoy
viven bien en el seed: ningún flujo se traba sin esta pantalla.

**Independent Test**: inactivar Vida Nueva grupal sin Grupos (confirmación simple), intentar inactivar Vida Nueva
individual con Grupos en curso (confirmación reforzada escribiendo el nombre), y verificar que con el Curso inactivo
no se puede crear un Grupo nuevo de ese Curso.

**Acceptance Scenarios**:

1. **Given** Catálogos, **Then** ve una tarjeta por catálogo con su nombre, cuántos activos tiene y un enlace; los
   catálogos que todavía no existen (Ministerios, Células antes de la 009) no aparecen.
2. **Given** el listado de Cursos, **Then** cada fila muestra nombre, etapa (categoría), modalidad, tipo (individual
   o grupal), cuántos Grupos en curso tiene y su estado (texto + ícono), con filtro activos / todos (D117).
3. **Given** un Curso con Grupos en curso, **When** el Admin lo inactiva, **Then** debe escribir el nombre exacto para
   confirmar (D38); los Grupos en curso siguen; no se pueden crear Grupos nuevos de ese Curso.
4. **Given** un Curso con cualquier Grupo (en curso o finalizado), **Then** "Eliminar" está deshabilitado con la
   explicación y la oferta de inactivar (D119, `docs/15`).
5. **Given** un Curso eliminado, **Then** está en la papelera de Cursos y se puede restaurar.
6. **Given** el Pastor, **Then** ve Catálogos y Cursos en lectura.

---

### User Story 7 - Corregir los datos de una Persona (Priority: P3)

Desde el perfil, el Admin corrige los datos de una Persona — incluidos los que ella no puede cambiar sola:
fecha de nacimiento y email (Flujo 11, paso 2) — con el mismo formulario del alta de adultos (006).

**Why this priority**: Flujo 9 lo pide ("editar sus datos"), pero hoy los errores se corrigen poco y la fecha y el
email tienen consecuencias (edad, login) que hay que validar con cuidado.

**Independent Test**: corregir el teléfono de una Persona y verlo en el perfil; intentar cambiar la fecha de
nacimiento de alguien con un rol de cargo a una fecha que la vuelve menor y ver el rechazo.

**Acceptance Scenarios**:

1. **Given** el perfil, **When** el Admin elige "Editar datos", **Then** abre el formulario con los datos actuales y
   las mismas validaciones y mensajes por campo que el alta (H-50).
2. **Given** una fecha de nacimiento que vuelve menor a alguien con un rol de cargo, **Then** se rechaza con
   `PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO` (existente, 005), explicando que primero hay que quitarle el rol (D133).
3. **Given** un email que ya usa otra Persona, **Then** error en el campo email.
4. **Given** el guardado, **Then** toast "Guardamos los cambios" y el perfil actualizado (matriz de `docs/16`).
5. **Given** el Pastor, **Then** no ve "Editar datos" y la API le responde 403.

---

### Edge Cases

- **Un tipo de Solicitud cuya spec todavía no se mergeó**: no aparece en la bandeja, ni en el filtro, ni en el
  Inicio, ni en el perfil — nunca una sección vacía de algo que no existe (Principio IV).
- **Estados que no existen en todos los tipos** (`propuesta` es solo de Discipulado; `lista_espera` solo de Evento):
  la bandeja no filtra por estado crudo sino por "Abiertas/Resueltas/Todas"; con **un** tipo elegido aparece además
  el filtro por sus estados.
- **Inscripción a Evento `confirmada` sin pago verificado (D148)**: no es una fila abierta de Inscripción; el Pago
  `pendiente_verificacion` sí es su propia fila abierta, enlazada a la misma Persona y Evento.
- **Persona sin acceso a la app (D97) o sin email (D145)**: su perfil lo dice en palabras ("No usa la app") y no
  muestra un email vacío.
- **Persona con 200 registros de historial**: el perfil muestra los 20 más recientes por sección y un enlace "Ver
  todas en la bandeja" (bandeja filtrada por esa Persona).
- **Dos Admins marcando el mismo comentario**: idempotente; queda el primero que lo marcó.
- **Comentario con un enlace o código HTML en el texto**: se muestra como texto plano, nunca interpretado.
- **Comentario de una Persona que después se da de baja** (`activo = false`): el comentario se conserva y muestra su nombre con la marca "Dada de baja".
- **Perfil de una Persona dada de baja** (`activo = false`, ej. un caso de Pendientes de tutor cerrado): se abre igual, con la marca "Dada de baja" en texto + ícono arriba de todo; no es un 404.
- **`?pagina=` inválido o fuera de rango** en la bandeja, el listado de comentarios o el de cumpleaños: redirect a la
  página válida más cercana (`docs/15`, punto 5).
- **`?mes=` inválido en cumpleaños**: cae al mes actual con redirect.
- **Métricas con Personas sin Sede activa**: cuentan en su Sede aunque esté inactiva; las dadas de baja no cuentan.
- **Curso inactivo y una propuesta de Discipulado aceptada después**: la aceptación (004) rechaza crear el Grupo con
  `CURSO_INACTIVO`; la propuesta queda sin aceptar y la Solicitud sigue abierta en la bandeja.
- **El Admin abre su propio perfil**: se ve igual que cualquiera; las restricciones sobre sí mismo (no auto-revocarse
  `admin`) ya las aplica el panel de roles (005).

## Fuera de alcance

- La **gestión** de cada tipo de Solicitud (aprobar, rechazar, verificar, inscribir en nombre de): es de 004, 008,
  009, 010 y 011. La bandeja no resuelve ni aprueba en lote; el lote de Inscripciones a Evento es de la 011.
- El **alta de adultos** y la **Completitud Manual** (006); el formulario de alta lo reusa la Historia 7.
- **CRUD de Ministerio y Célula** (009): Catálogos los enlaza cuando existan.
- **Gestión de Relaciones Familiares por el Admin** (crear/quitar vínculos): el perfil las muestra; crearlas sigue
  siendo de la propia Persona (Flujo 11) o del Flujo 7 (tutor).
- **Dashboard analítico** (evolución en el tiempo, embudo del proceso, exportar): Fase 2 (`docs/02`).
- **Notificaciones** a quien cumple años o al Admin por comentarios: fuera; el email a la desarrolladora sí entra.
- **Subir foto de perfil** (D87, Fase 2).
- **Responder un comentario desde la app**: el contacto, si lo aceptó, ocurre fuera (WhatsApp, email).

## Requirements *(mandatory)*

### Functional Requirements

**Bandeja unificada de Solicitudes (Historia 1)**

- **FR-001**: La bandeja MUST listar en una sola tabla los registros de todos los **tipos conectados**: Solicitud de
  Discipulado, solicitud de inscripción a Vida de Servicio, Solicitud de Bautismo, Postulación a Ministerio,
  Inscripción a Evento y Pago de Evento, cada uno cuando su spec esté construida.
- **FR-002**: Cada fila MUST mostrar la forma base común (`docs/04`, patrón de Solicitudes): tipo, Persona, estado,
  fecha de creación, días de espera, quién la cargó si fue en nombre de la Persona (`creado_por`) y quién la
  revisó (`revisado_por`). Tipo y estado MUST ir en texto + ícono (D81); el estado se traduce por tipo (D84).
- **FR-003**: Cada registro MUST clasificarse como **abierto** (espera una acción del Admin) o **resuelto**, según
  una regla por tipo declarada en un solo lugar: Discipulado `pendiente`/`propuesta`; Vida de Servicio, Bautismo y
  Postulación `pendiente`; Inscripción a Evento `pendiente`; Pago `pendiente_verificacion`. Todo lo demás es
  resuelto (incluidas `lista_espera` y `cancelada`, que no esperan al Admin).
- **FR-004**: La bandeja MUST filtrar por Abiertas (por defecto) / Resueltas / Todas, por tipo (solo si hay más de
  un tipo conectado), por los estados del tipo (solo con un tipo elegido), por Persona (`?persona=<id>`, para el
  enlace del perfil) y buscar por nombre o apellido.
- **FR-005**: La bandeja MUST ordenar por espera (por defecto, la más vieja primero), fecha o Persona, y paginar de a
  20 (cambia a propósito el orden por defecto de la 004, que era por fecha); paginado, búsqueda, orden y filtros MUST resolverse en la API y reflejarse en la URL (`docs/15`, listados).
- **FR-006**: Cada fila MUST llevar al detalle de su tipo (la pantalla de su spec) y el nombre al perfil de la
  Persona. La bandeja MUST NOT ofrecer acciones de resolver propias.
- **FR-007**: Sumar un tipo nuevo a la bandeja MUST requerir solo: declarar el tipo y su regla de abierto (FR-003)
  en `packages/shared-types`, sumar su rama a la fuente única de la bandeja en la API, su ruta de detalle y sus
  textos — **sin** cambiar la pantalla de la bandeja, el Inicio ni el perfil.
- **FR-008**: La bandeja existente de Discipulado (004) MUST seguir funcionando igual tras la generalización: mismos
  filtros por estado, mismo "propuesta a X, hace N días", misma ruta de detalle.

**Perfil unificado de Persona (Historia 2)**

- **FR-010**: MUST existir un perfil por Persona en el backoffice, accesible desde el listado de Personas (cada fila
  enlaza), la bandeja, los Grupos, Pendientes de tutor y cualquier nombre de Persona del backoffice.
- **FR-011**: El perfil MUST mostrar: foto (`foto_url`, D87) o iniciales; nombre y apellido; edad y fecha de
  nacimiento; género; estado civil; profesión; teléfono; dirección; email (o "Sin email"); Sede; tiempo de
  congregación (como lo declaró); estado (`activa`/`pendiente_tutor`); origen del alta y quién la hizo
  (`origen_alta`, `alta_por`) con la fecha y el origen del consentimiento (D78); si usa la app; y, si es menor, los
  datos del tutor.
- **FR-012**: El perfil MUST mostrar los roles de la Persona separados en **de cargo** y **del proceso** (D131), y
  dar acceso al panel de roles y a su historial ya existentes (005) para quien tenga `personas.gestionar_roles`.
- **FR-013**: El perfil MUST mostrar el **historial** de la Persona agrupado por proceso, cada ítem con estado
  (texto + ícono), fecha y enlace a su detalle: (a) Solicitudes de todos los tipos conectados (FR-001), (b) Grupos que
  cursó (Inscripciones: Curso, estado, desde/hasta) y (c) Grupos que tuvo a cargo (Liderazgos), (d) Completitudes
  Manuales y Ministerio cuando existan (006, 009). Cada sección MUST mostrar hasta 20 ítems, del más reciente al más
  viejo, con "Ver todas" cuando haya más.
- **FR-014**: El perfil MUST mostrar las Relaciones Familiares de la Persona en las dos direcciones (D112), con el
  nombre de la relación desde el punto de vista de esta Persona y enlace al perfil del familiar.
- **FR-015**: El perfil MUST NOT mostrar el texto de las notas de Encuentros a ningún rol (D134).
- **FR-016**: El perfil MUST ofrecer, a quien tenga el permiso, las acciones en nombre de la Persona que ya existan
  (hoy: pedir Vida Nueva en su nombre, 004) y un lugar donde las specs dependientes sumen las suyas (Completitud
  Manual, inscribir a Evento, registrar Pago) con una lista registrable de acciones igual que la de secciones,
  mostrando en todo momento el nombre de la Persona (`docs/15`, D97).
- **FR-017**: La API MUST exponer el perfil solo a quien tenga `personas.ver`, con `select` explícito, y responder
  404 (`NO_ENCONTRADO`) para un id inexistente. Una Persona con `activo = false` se muestra con la marca "Dada de baja".
- **FR-018**: El listado de Personas MUST mostrar la foto o iniciales de cada una (D87, Flujo 9) y enlazar al perfil.

**Inicio y métricas (Historia 3)**

- **FR-020**: El Inicio del backoffice MUST mostrar cuatro bloques independientes: pendientes (FR-021), métricas
  (FR-022 a FR-024), cumpleaños de la semana (FR-031) y comentarios sin revisar (FR-046). Cada bloque MUST tener sus
  propios estados de carga, vacío y error (con "Reintentar"), sin que la falla de uno oculte a los otros.
- **FR-021**: El bloque de pendientes MUST mostrar la cantidad de registros abiertos por tipo conectado, cada uno
  enlazado a la bandeja filtrada, y mantener la tarjeta de pendientes de discipulado existente (004).
- **FR-022**: "Personas activas" MUST contar las Personas con `estado = activa` y `activo = true`, incluidas
  las que no usan la app y las menores activadas por su tutor.
- **FR-023**: La distribución por tiempo de congregación MUST mostrar los cinco rangos en su orden natural, con
  cantidad y porcentaje en texto (sobre las Personas activas) y una representación gráfica que no sea la única
  forma de leer el dato (D81).
- **FR-024**: La distribución por Sede MUST mostrar cada Sede no eliminada con su cantidad y porcentaje de
  Personas activas, marcando en texto las inactivas.
- **FR-025**: Las métricas MUST calcularse al momento de pedirlas, sin tablas de agregados.

**Cumpleaños (Historia 4)**

- **FR-030**: MUST existir un listado de cumpleaños por mes (por defecto el actual en fecha civil argentina) con
  las Personas activas (`estado = activa`, `activo = true`) que cumplen en ese mes, ordenadas por día y apellido: nombre (enlace al
  perfil), día, años que cumple, teléfono, y la marca "Hoy" en texto + ícono.
- **FR-031**: El Inicio MUST mostrar quién cumple hoy y en los próximos 7 días (cruzando fin de mes y de año), con
  enlace al listado del mes.
- **FR-032**: Una Persona nacida el 29 de febrero MUST aparecer el 28 de febrero en años no bisiestos.
- **FR-033**: "Hoy" MUST ser la fecha civil en `America/Argentina/Buenos_Aires`, con la única implementación
  existente (`hoyEnArgentina`, 004).

**Comentarios de la app — "Contanos qué te parece" (Historia 5)**

- **FR-040**: MUST existir el formulario "Contanos qué te parece", accesible desde el pie de página de la web
  pública, desde Perfil en la app con sesión y desde el menú de usuario del backoffice (`docs/14`, `docs/16`).
- **FR-041**: El formulario MUST pedir tipo (`problema`/`sugerencia`), texto (obligatorio, hasta 2000 caracteres) y
  si acepta ser contactado; sin sesión y con contacto aceptado, MUST pedir un email o un teléfono (al menos uno).
- **FR-042**: Al guardar, el sistema MUST registrar automáticamente la página de origen, el navegador (resumido,
  sin identificadores), el último `requestId` conocido por el cliente, la Persona si tenía sesión, y la fecha.
- **FR-043**: El envío MUST funcionar sin sesión y MUST limitarse: 5 por hora por origen sin sesión, 20 por hora por
  Persona con sesión; pasado el límite, `429 DEMASIADOS_PEDIDOS` con el tiempo de espera, en palabras para la persona.
- **FR-044**: Al guardar un comentario el sistema MUST enviar un email a la dirección configurada para la
  desarrolladora, con asunto sin datos sensibles; una falla del envío MUST NOT impedir guardar el comentario.
- **FR-045**: Tras enviar, la persona MUST ver una confirmación en pantalla con qué pasa después (matriz de `docs/16`:
  envío de solicitud).
- **FR-046**: El backoffice MUST tener un listado de comentarios (por defecto "Sin revisar", más recientes primero,
  paginado de a 20) con tipo, extracto, fecha, página de origen, quién lo mandó (o "Sin sesión") y si acepta
  contacto con el dato; un detalle con el texto completo y los datos técnicos; y el bloque del Inicio con la
  cantidad sin revisar y los 5 más recientes.
- **FR-047**: Quien tenga `comentarios.gestionar` MUST poder marcar un comentario como revisado y deshacerlo; se
  registra quién y cuándo.
- **FR-048**: El texto de un comentario MUST mostrarse siempre como texto plano.

**Catálogos y Cursos (Historia 6)**

- **FR-050**: Catálogos MUST mostrar una tarjeta por cada catálogo existente (Sedes, Cursos; Ministerios y Células
  cuando la 009 los construya) con la cantidad de registros activos y el enlace a su listado.
- **FR-051**: El listado de Cursos MUST mostrar nombre, etapa, tipo, modalidad, Grupos en curso y estado, con filtro
  activos / todos (D117); cada fila lleva al detalle, donde se editan nombre y descripción.
- **FR-052**: Categoría, tipo y modalidad de un Curso MUST NOT poder cambiarse desde la interfaz: los fija el código
  (cada combinación tiene comportamiento propio en Vida Nueva y Vida de Servicio).
- **FR-053**: Inactivar un Curso MUST pedir confirmación reforzada (escribir el nombre) si tiene Grupos en curso, y
  simple si no (D38); reactivar MUST ser posible siempre.
- **FR-054**: Un Curso inactivo o eliminado MUST NOT admitir Grupos nuevos: la API rechaza crearlos con el código nuevo
  `CURSO_INACTIVO`; los Grupos existentes siguen sin cambios, y sumar una Persona a un Grupo en curso de ese Curso
  ("sumar a este Grupo", FR-045 de la 004) sigue permitido.
- **FR-055**: Eliminar un Curso MUST ser posible solo si no tiene ningún Grupo (D119), MUST llevarlo a la papelera de
  Cursos y MUST poder restaurarse; con Grupos, el botón queda deshabilitado con su explicación y la oferta de
  inactivar.
- **FR-056**: Dar de alta un Curso MUST permitirse solo para una combinación de categoría y tipo que el código
  reconozca y que no tenga ya un registro (incluido uno en la papelera, que se restaura en vez de duplicarse).

**Edición de datos de una Persona (Historia 7)**

- **FR-057**: Quien tenga `personas.editar` MUST poder editar desde el perfil todos los datos de FR-011 salvo foto,
  estado, origen del alta y consentimiento, con las mismas validaciones del registro y del alta (Flujo 2, Flujo 12).
- **FR-058**: Cambiar la fecha de nacimiento MUST rechazarse si deja menor de edad a una Persona con un rol de cargo
  (D133, `PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO`); cambiar el email MUST rechazarse si lo usa otra Persona
  (`EMAIL_DUPLICADO`, existente) y MUST normalizarse igual que en toda escritura de email (007); dejarlo vacío MUST
  permitirse solo si la 006 (D145) ya lo hizo opcional.

**Transversales**

- **FR-060**: El menú lateral del Admin y del Pastor MUST seguir `docs/14` §3: Inicio · Personas · Solicitudes ·
  Grupos · Eventos · Notificaciones · Catálogos, más los que ya existen fuera de esa lista (Pendientes de tutor,
  Palabra Profética, Libros). Sedes y Cursos MUST vivir bajo Catálogos (con su miga de pan), no como ítems propios.
- **FR-061**: Toda pantalla y endpoint nuevo MUST declarar su permiso del catálogo (D132): ver es Admin y Pastor;
  gestionar es solo Admin (D64, D142). Los permisos nuevos son `comentarios.ver`, `comentarios.gestionar`,
  `cursos.gestionar`, `cursos.papelera.ver` y `personas.editar`; la bandeja, el perfil, las métricas y los
  cumpleaños usan los `.ver` existentes (`solicitudes.ver`, `personas.ver`, `inicio.ver`).
- **FR-062**: Toda pantalla nueva o modificada MUST cumplir el checklist de `docs/15` (cuatro estados en
  `loading.tsx`/`error.tsx`, botones con `useEnvio`, errores por campo con la pieza de `packages/ui`, colores de
  tokens, estados en texto + ícono, contraste en claro y oscuro) y no tener scroll horizontal a 320 px.
- **FR-063**: Las pantallas que se usan desde el celular — Inicio, perfil de Persona, cumpleaños y el formulario de
  comentarios — MUST respetar D150: 16 px en etiquetas, botones y ayudas (14 px solo metadatos) y áreas táctiles de
  44 px.
- **FR-064**: Todo texto MUST salir de `next-intl` en rioplatense con voseo (D84); las pantallas viejas que esta spec
  toca (Inicio, Catálogos) MUST migrar sus textos fijos.
- **FR-065**: `db:seed-demo` MUST sumar: comentarios de los dos tipos (revisados y no, con y sin sesión, uno con
  texto de 2000 caracteres y uno con HTML), Personas con cumpleaños hoy, mañana, el último día del mes y un 29 de
  febrero, una Persona con historial en todos los tipos conectados, y un Curso inactivo (D120).

### Key Entities *(include if feature involves data)*

- **Comentario de la app** (nueva, `docs/04`, D102): tipo (`problema`/`sugerencia`), texto, acepta contacto, dato de
  contacto (email o teléfono, solo sin sesión), página de origen, navegador resumido, último `requestId`, huella del
  origen (para el límite, nunca la IP en claro), Persona (opcional), fecha, revisado (fecha y por quién). No se
  borra (Principio III).
- **Curso** (existente, se amplía): suma descripción (opcional) y la marca de eliminación con fecha y responsable
  (D119). `activo` sigue siendo el estado del negocio.
- **Registro de la bandeja** (no es una tabla de negocio): la vista común de todas las Solicitudes — tipo, id,
  Persona, estado, abierto/resuelto, fecha de creación, fecha desde la que espera, cargada por, revisada por y cuándo.
  Cada tipo aporta su parte; ningún dato se copia.
- **Persona, Relación Familiar, Grupo, Inscripción, Liderazgo, CambioDeRol, Sede**: existentes, solo se leen
  (salvo la edición de Persona de la Historia 7).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El Admin encuentra cualquier Solicitud abierta de cualquier tipo desde una sola pantalla, en no más de
  dos acciones (abrir Solicitudes, filtrar o buscar).
- **SC-002**: Sumar un tipo nuevo a la bandeja no modifica ningún archivo de la pantalla de la bandeja, del Inicio ni
  del perfil (verificable en el diff de la spec que lo suma).
- **SC-003**: Desde el perfil, el Admin responde "¿en qué etapa está y qué pidió esta Persona?" sin abrir otra
  pantalla.
- **SC-004**: La bandeja, el perfil y el Inicio responden en menos de 1 s (p95) con el volumen de `db:seed-demo`
  (cientos de Personas, D120).
- **SC-005**: Las métricas y el listado de cumpleaños coinciden exactamente con un conteo hecho directo sobre la base
  en los escenarios del seed, incluidos 29 de febrero y el cambio de día en UTC.
- **SC-006**: Un comentario enviado sin sesión aparece en el backoffice en el primer refresco, y el sexto envío en
  una hora desde el mismo origen se rechaza.
- **SC-007**: Ninguna pantalla nueva tiene violaciones de axe en modo claro ni oscuro, ni scroll horizontal a 320 px.
- **SC-008**: El Pastor no puede ejecutar ninguna acción de gestión de esta spec: cada endpoint de escritura le
  responde 403 y ninguna pantalla le ofrece el botón.

## Assumptions

- **A1 — Fuente única de la bandeja**: la bandeja y el historial del perfil leen de una sola fuente en la API que
  junta los tipos con la forma base; cada spec de tipo suma su rama. Es lo que permite paginar, ordenar y buscar en
  la API sobre varios tipos (`docs/15`). El cómo (vista SQL) es del plan.
- **A2 — "Abierto" es lo que espera al Admin**: `lista_espera` y `cancelada` de Evento, `inactiva` de Postulación y
  `retirada` de Discipulado son resueltas. Una Inscripción `confirmada, pago pendiente` (D148) no es abierta; su Pago
  sí.
- **A3 — "Ya lo hice" (D144)**: si la 006 modela la declaración pendiente como un registro con la forma base, se suma
  a la bandeja como un tipo más con el mecanismo de FR-007; si no, queda en su propia pantalla. No se decide acá.
- **A4 — Pendientes de tutor no entra en la bandeja**: no la pide la Persona ni tiene la forma base (es un intento de
  registro); sigue con su pantalla y su cantidad se muestra en el bloque de pendientes del Inicio.
- **A5 — Persona activa**: `estado = activa` y `activo = true` (no dada de baja); incluye menores activados y Personas sin app (D97: su
  avance "cuenta para métricas", Flujo 12 paso 5).
- **A6 — Tiempo de congregación**: se muestra **como fue declarado** al registrarse (el campo es estático); la
  métrica lo aclara en una línea de ayuda. Recalcularlo con el tiempo queda como pregunta (Preguntas para Echu, 3).
- **A7 — Cumpleaños**: solo Personas activas (A5), sin importar la edad; el Pastor los ve (D64).
- **A8 — Comentarios**: el límite por origen reusa la huella de origen y el mecanismo de conteo por ventana de la 007
  (sin infraestructura nueva). Si la 007 no está mergeada al implementar, el lote de comentarios espera.
- **A9 — Dato de contacto de un comentario anónimo**: se guarda solo si la persona aceptó ser contactada; nunca va a
  Sentry ni al asunto del email (Principio X, `docs/16`).
- **A10 — Cursos**: los fija el código; el Admin no inventa categorías. Hoy son dos (Vida Nueva individual y grupal);
  la 008 suma Vida de Servicio con su categoría y prerrequisito.
- **A11 — Edición de Persona**: reusa el formulario de alta de la 006. Si la 006 no lo deja reusable, el lote de la
  Historia 7 lo extrae a `packages/ui`/`apps/backoffice` en vez de copiarlo (Principio XI).
- **A12 — Foto**: `foto_url` es una URL externa de Google (D87); si no carga, se muestran las iniciales.

## Preguntas para Echu

1. **"Contanos qué te parece" entero (formulario en las tres apps + email + listado) ¿va en esta spec?** Ninguna otra
   spec lo tiene y `docs/02` lo pone en el MVP. **Recomendación (aplicada)**: sí, entero acá; si alguna spec en
   paralelo (ej. la 012) también lo especificó, se queda quien llegue primero a `main` y la otra borra su parte.
2. **¿Editar los datos de una Persona (incluidos fecha de nacimiento y email) es de esta spec o de la 006?** Flujo 9 lo
   pide y nadie lo asignó. **Recomendación (aplicada)**: acá, como Historia 7 (P3), reusando el formulario de alta de
   la 006; si la 006 ya incluye "editar", se saca la Historia 7.
3. **Tiempo de congregación es estático**: quien declaró "menos de 6 meses" hace dos años sigue ahí. **Recomendación
   (aplicada)**: mostrarlo como declarado, con una aclaración en la métrica; recalcularlo (sumando el tiempo desde
   el registro) queda para Fase 2 junto con el dashboard.
4. **Cursos: ¿hace falta "Crear Curso"?** Las combinaciones las define el código y hoy existen todas. **Recomendación
   (aplicada)**: alta solo para combinaciones que el código reconoce y no tienen registro; en la práctica el Admin
   edita nombre y descripción e inactiva. Inventar categorías nuevas no está en el MVP.
5. **Menú: Sedes pasa a vivir bajo Catálogos** (como dice `docs/14` §3) y deja de ser un ítem propio del menú lateral.
   **Recomendación (aplicada)**: sí; Palabra Profética y Libros (contenido institucional, D109) quedan como ítems
   propios porque no son catálogos.
