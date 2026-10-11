# Feature Specification: Elección de Ministerio y "Ya sirvo en un Ministerio"

**Feature Branch**: `015-eleccion-ministerio`

**Created**: 2026-10-11

**Status**: Aprobada por Echu el 2026-10-11 (Preguntas 1 a 3: "sigo tu recomendación", "sí", "ok")

**Input**: Pedido de Echu del 2026-10-11, después del domingo 11/10, en que la iglesia repartió en
papel la encuesta de ministerios a quienes terminan Vida de Servicio. Hoy es así: el domingo anterior
a terminar Vida de Servicio cada persona recibe una hoja con su nombre, su celular y su líder de
grupo de extensión, y la lista de todos los ministerios separados en "para empezar ya" y "requieren
capacitación"; marca los que le interesan y después tiene una charla uno a uno con un líder de Vida
de Servicio, que toma notas. Echu quiere que la app la reemplace y que las notas de la charla queden
junto a la elección. Además (DEMO-16): quien ya sirve en un Ministerio y entra a la app por primera
vez tiene que poder decir en cuál, eligiéndolo del mismo listado, y que el Admin lo valide: "sería
como una primera carga de datos".

**Respuestas de Echu (2026-10-11)**:

1. La charla uno a uno la hacen **los líderes de Vida de Servicio**.
2. Las notas de la charla son **privadas**: las ven los líderes de esa edición y el Admin, no la
   persona ni el Pastor (Pregunta 1, sigue la recomendación).
3. **Hasta 2 Ministerios, y de cada Ministerio un solo área**: "las tareas son los domingos y quizás
   te coinciden varios domingos seguidos y no es la idea". Discipulados Vida Nueva se hace en
   paralelo con cualquier otro (D217) y **no cuenta** en el límite.

**Fuentes**: `docs/22-ministerios.md` (el listado real, con áreas y si requieren formación),
`specs/009-ministerios-celulas` (Postulación, membresía, D170, D217), `specs/008-vida-de-servicio`
(ediciones, líderes, aptitud), `specs/006-mi-camino-etapas` ("Ya lo hice", D144, D153, D235),
`docs/15-guia-ux-ui.md`, `docs/17-paleta-y-tokens.md`, y D81, D97, D131, D142, D150, D151, D197.

## Clarifications

### Session 2026-10-11

- Q: ¿Una persona puede **servir** en dos Ministerios a la vez, o solo elegir dos para la charla?
  → A: Servir en hasta dos (la razón de Echu es el calendario de domingos, que solo tiene sentido si
  sirve en los dos). **Enmienda D170 / FR-020 de la 009**: hasta **2** Postulaciones `aprobada` por
  Persona, más la de Discipulados Vida Nueva en paralelo (D217). Confirmado por Echu (Pregunta 2).
- Q: ¿Quién abre la elección? → A: El Admin, por edición de Vida de Servicio ("Abrir la elección de
  ministerio"), igual que abre la inscripción (`inscripcionAbierta`). Se cierra sola cuando la
  edición finaliza; el Admin también puede cerrarla.
- Q: ¿La elección necesita que la persona ya sea apta para Ministerio? → A: Para **elegir**, no: se
  hace antes de terminar Vida de Servicio. Para que el Admin **apruebe** una opción, sí (la aptitud la
  da completar Vida de Servicio, spec 008). Mientras tanto la elección queda "lista" y el Admin ve por
  qué no puede aprobarla todavía.
- Q: ¿"Ya sirvo" pasa por la charla? → A: No: es una declaración que valida el Admin (como "Ya lo
  hice", D153), pero eligiendo del listado en vez de escribir.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Elegir mis ministerios antes de terminar Vida de Servicio (Priority: P1) ⭐

Una persona cursa una edición de Vida de Servicio. El domingo anterior al cierre, el Admin abre la
elección de ministerio de esa edición. En Mi camino, la card de Ministerio le dice "Ya podés elegir
dónde querés servir" con el botón "Elegir mi ministerio". La pantalla le muestra arriba **lo que ya
sabemos** (nombre y apellido, celular, su líder de grupo de extensión — o "Todavía no tenés grupo"),
para que no lo tenga que escribir, y después todos los Ministerios activos en dos bloques: **"Para
empezar a servir ya"** y **"Requieren formación antes"**, cada uno con sus áreas.

**Independent Test**: con una edición con la elección abierta, una inscripta elige dos áreas de
Ministerios distintos y envía; la card dice "Elegiste … Te va a llamar un líder de Vida de Servicio
para charlarlo".

**Acceptance Scenarios**:

1. **Given** la elección abierta en su edición, **When** marca "Consolidadores" (Bienvenida) y
   "Fotografía" (Multimedia) y toca "Enviar mi elección", **Then** queda guardada y la card de Mi
   camino lo dice.
2. **Given** ya marcó un área de Bienvenida, **When** intenta marcar otra de Bienvenida, **Then** se
   reemplaza la anterior (un solo área por Ministerio: son radios dentro de cada Ministerio, con
   "Ninguna de este ministerio").
3. **Given** ya tiene dos Ministerios elegidos, **When** intenta elegir un tercero, **Then** las áreas
   del resto quedan deshabilitadas y un texto dice "Podés elegir hasta 2 ministerios: las tareas son
   los domingos y no queremos que te toquen varios seguidos. Para cambiar, sacá uno." (texto, no solo
   color, D81).
4. **Given** marca Discipulados Vida Nueva, **Then** no cuenta en el límite: se ve aparte, "Se puede
   hacer al mismo tiempo que otro ministerio".
5. **Given** envió y la charla todavía no se hizo, **When** vuelve a la pantalla, **Then** puede
   cambiar su elección. Después de la charla ya no (la cambia el líder en la charla o el Admin).
6. **Given** la edición no tiene la elección abierta, **Then** no aparece el botón.
7. Sin marcar nada → error por campo "Elegí al menos un área" con resumen y foco (H-50). Puede escribir
   opcionalmente "¿Querés contarnos algo?" (hasta 500).

### User Story 2 - La charla uno a uno con un líder de Vida de Servicio (Priority: P1) ⭐

El líder de Vida de Servicio abre, en la web app (como el Discipulador, D142), **"Elecciones de
ministerio"** de su edición: la lista de inscriptos con lo que eligió cada uno (o "Todavía no eligió")
y si la charla está hecha. Abre a una persona, ve sus datos y su elección, escribe **notas de la
charla** y toca **"Charla hecha"**. Durante la charla puede **ajustar la elección** con la persona (el
mismo formulario y el mismo límite) y queda registrado quién la cambió.

**Acceptance Scenarios**:

1. **Given** una inscripta eligió, **When** el líder escribe notas y toca "Charla hecha", **Then**
   queda con la charla hecha, quién y cuándo, y pasa a la bandeja del Admin como "lista para revisar".
2. **Given** una inscripta no eligió nada, **Then** el líder puede cargar la elección por ella en la
   charla (registro `cargadaPorId`, D97).
3. Un líder de otra edición no ve ni edita esta elección (404). La persona **no ve las notas**.
4. Las notas se pueden editar hasta que el Admin resuelva; quedan quién y cuándo.

### User Story 3 - El Admin confirma dónde sirve cada uno (Priority: P1)

En la bandeja unificada aparece el tipo **"Elección de ministerio"**. El detalle muestra a la persona,
su elección (una o dos áreas, más Discipulados VN si lo marcó), las notas de la charla y quién la
hizo. Por cada área elegida, el Admin toca **"Confirmar"** o **"No por ahora"** (con motivo opcional,
solo backoffice). Confirmar crea la Postulación `aprobada` de ese Ministerio y área (la membresía,
D170) con el mismo efecto que aprobar una Postulación hoy (rol de estado, aviso). Un área que
**requiere formación** se confirma igual: la persona queda en ese Ministerio con la marca "requiere
formación" (docs/22), como hoy.

**Acceptance Scenarios**:

1. **Given** la persona completó Vida de Servicio (es apta) y eligió dos áreas, **When** el Admin
   confirma las dos, **Then** sirve en los dos Ministerios, y Mi camino y el Perfil los muestran.
2. **Given** todavía no completó Vida de Servicio, **Then** "Confirmar" está deshabilitado con "Se
   confirma cuando termine Vida de Servicio".
3. **Given** ya sirve en un Ministerio, **When** el Admin confirma dos más, **Then** se le pide elegir
   cuál de los actuales reemplaza (nunca quedan más de 2, más el paralelo).
4. Cuando todas las áreas están resueltas, la elección se cierra (`resuelta`) y sale de pendientes.

### User Story 4 - "Ya sirvo en un Ministerio" (Priority: P1)

Quien ya sirve y entra por primera vez: en la card de Ministerio de Mi camino, en lugar del "Ya lo
hice" con texto libre, **"Ya sirvo en un ministerio"** abre el mismo listado (sin el límite de la
charla, pero con el de 2 + paralelo y un área por Ministerio) y "Desde qué año" opcional. El Admin lo
ve en la bandeja como "Ya sirve en un ministerio" y confirma cada área: crea la membresía y marca la
etapa Ministerio como hecha (D153). Si la persona todavía no figura con Vida de Servicio, el Admin
puede confirmarla también en el mismo paso (casilla "También hizo Vida de Servicio").

**Acceptance Scenarios**:

1. **Given** una persona nueva que sirve en Adoración/Voces, **When** lo declara, **Then** la card dice
   "Le avisamos al equipo; lo confirman pronto" y puede retirarlo mientras espera.
2. **Given** el Admin confirma, **Then** queda como miembro, la etapa Ministerio cuenta como hecha y le
   llega el aviso "Confirmamos que servís en Adoración".
3. Las declaraciones de "Ya lo hice" de Ministerio con texto libre que ya existen siguen y se resuelven
   como hoy.

### User Story 5 - Primera carga del Admin (Priority: P2)

El Admin, desde el detalle de un Ministerio, **"Agregar personas que ya sirven"**: busca personas y
elige el área de cada una; crea las membresías directamente (D97, con `creadoPorId`), con el mismo
límite de 2 + paralelo. Sirve para cargar de una vez a los equipos actuales sin esperar a que cada uno
entre a la app.

### Edge Cases

- Un Ministerio o área inactivado después de elegido: la opción se muestra "Ya no está disponible" y
  no se puede confirmar; el resto de la elección sigue.
- La persona da de baja Vida de Servicio: la elección queda cerrada (`cancelada`) y sale de
  pendientes.
- Dos líderes editan la misma elección a la vez: gana la última, con su registro; las notas no se
  pisan sin aviso (versión optimista: "Alguien cambió esta elección, recargá").
- Una persona en dos ediciones (rehizo VS): una elección por inscripción.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El Admin DEBE poder abrir y cerrar la elección de ministerio de una edición de Vida de
  Servicio en curso. Se cierra sola al finalizar la edición.
- **FR-002**: Con la elección abierta, cada inscripta con inscripción activa DEBE poder crear o
  editar su elección hasta la charla: de 1 a 2 Ministerios distintos, **un área por Ministerio**, más
  opcionalmente el área en paralelo (Discipulados VN), y un comentario opcional (≤ 500). La regla vive
  en `shared-types` (`validarEleccionMinisterio`) y la usan la API y la web (Principio XI). Códigos de
  campo: `ELECCION_VACIA`, `ELECCION_MAXIMO_MINISTERIOS`, `ELECCION_UN_AREA_POR_MINISTERIO`,
  `ELECCION_AREA_NO_DISPONIBLE`.
- **FR-003**: La pantalla de elección DEBE mostrar los datos que la app ya tiene (nombre, celular,
  grupo de extensión y su líder) sin pedirlos, y los Ministerios en los dos bloques de docs/22 según
  `Ministerio.requiereFormacion`, con las áreas y su descripción.
- **FR-004**: Los líderes vigentes de la edición DEBEN ver las elecciones de sus inscriptos, cargar o
  ajustar la elección, escribir notas (≤ 2000) y marcar "Charla hecha". Autoriza la base (líder vigente
  de ESA edición), no el rol del JWT (como D226).
- **FR-005**: Las notas de la charla las ven **solo** los líderes de esa edición y quien tenga
  `solicitudes.aprobar` (Admin); no la persona, no el Pastor, no van a logs, avisos ni emails.
- **FR-006**: La elección con charla hecha DEBE entrar a la bandeja unificada (tipo
  `eleccion_ministerio`) y a los pendientes del Inicio. El Admin confirma o descarta cada área;
  confirmar crea una Postulación `aprobada` (membresía) con la misma lógica de aprobación de la 009.
- **FR-007**: **Enmienda D170 / FR-020 (009)**: una Persona puede tener hasta 2 Postulaciones
  `aprobada` sin `enParalelo` y 1 con `enParalelo`. La garantía pasa del índice único parcial a un
  chequeo con bloqueo de la Persona (`bloquearPersona`) en cada aprobación; superar el máximo pide
  elegir qué membresía reemplazar.
- **FR-008**: Confirmar un área requiere que la persona sea apta para Ministerio (spec 008).
- **FR-009**: "Ya sirvo en un ministerio" DEBE reemplazar el "Ya lo hice" de texto libre de la etapa
  Ministerio: elige del mismo listado (FR-002 sin la charla) y un año opcional; el Admin confirma cada
  área (crea membresía y CompletitudManual de la etapa, D153) y opcionalmente la de Vida de Servicio.
- **FR-010**: El Admin DEBE poder agregar desde el detalle de un Ministerio personas que ya sirven
  (membresía directa, `creadoPorId`, mismo límite).
- **FR-011**: Avisos (D197, sin datos personales): `ministerio.eleccion_abierta` (a cada inscripta de
  la edición), `ministerio.eleccion_lista` (al Admin, solo log), `ministerio.confirmado` (a la persona,
  importante).
- **FR-012**: Mi camino y el Perfil DEBEN mostrar hasta dos Ministerios (y el paralelo).
- **FR-013**: Toda pantalla con sus cuatro estados, errores por campo con resumen y foco (H-50),
  envíos con `useEnvio` (H-57), textos en `next-intl`, colores de tokens, nada solo con color (D81),
  axe en claro y oscuro, `@celular`.

### Key Entities

- **EleccionMinisterio** (nueva): `inscripcionId` (la de Vida de Servicio, única), `personaId`,
  `estado` (`borrador` → `charla_hecha` → `resuelta`, o `cancelada`), `comentario`, `notas`,
  `charlaPorId`, `charlaEn`, `cargadaPorId`, `editadaPorId`, timestamps.
- **OpcionEleccionMinisterio** (nueva): `eleccionId`, `ministerioId`, `celulaId`, `enParalelo`,
  `resultado` (`pendiente`, `confirmada`, `descartada`), `postulacionId` (la membresía creada),
  `motivoDescarte`, `resueltaPorId`, `resueltaEn`. Única por (`eleccionId`, `ministerioId`).
- **DeclaracionMinisterio** (o ampliación de `DeclaracionHistorial` con opciones): la declaración de
  "Ya sirvo" con sus opciones (mismo shape que la de arriba) y `desdeAnio`.
- **Grupo** (edición de VS): `eleccionAbierta Boolean`.
- **Postulacion**: sin cambios de columnas; cambia el índice `postulaciones_una_aprobada` (FR-007).

## Success Criteria *(mandatory)*

- **SC-001**: Una persona elige sus ministerios desde el celular en menos de 3 minutos sin escribir
  ningún dato que la app ya tiene.
- **SC-002**: El Admin pasa de la elección a la membresía sin volver a cargar nada.
- **SC-003**: Nadie queda con más de 2 Ministerios (más el paralelo), ni con dos áreas del mismo.
- **SC-004**: Las notas de la charla no aparecen en ninguna respuesta para la persona ni el Pastor
  (test que lo exige).

## Assumptions

- La lista de Ministerios y áreas es la de `docs/22-ministerios.md`; ya está cargada en el catálogo.
- El "domingo anterior" lo decide el Admin al abrir la elección; la app no calcula fechas.
- Las encuestas en papel de esta edición las carga el Admin con la primera carga (US 5) o los líderes
  con la charla (US 2, cargar por ella).

## Out of Scope

- Agenda o turnos de los domingos por Ministerio (calendario de servicio).
- Que los líderes de cada Ministerio vean o resuelvan elecciones (por ahora, solo el Admin).
- Formación/capacitación con seguimiento propio.

## Preguntas para Echu (respondidas el 2026-10-11)

1. **Notas privadas**: solo los líderes de VS de esa edición y el Admin; sin el Pastor. → "Sigo tu
   recomendación" (D240).
2. **Servir en dos**: una persona puede servir en dos Ministerios a la vez, más Discipulados VN. → "Sí"
   (D241).
3. **¿Quién confirma?** El Admin ahora; el líder de cada Ministerio queda para después. → "Ok" (D242).
