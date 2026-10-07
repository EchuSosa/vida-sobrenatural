# Feature Specification: Ministerios y Células (postulación)

**Feature Branch**: `009-ministerios-celulas`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "009 — Ministerios y Células (postulación). Listado de Ministerios para la Persona, postulación (con elección de Célula) para quien tenga Apto para Ministerio, revisión por el Admin en la bandeja de Solicitudes del backoffice (advertencia de cambio de Ministerio), Células, CRUD de Ministerio y Célula en el backoffice con soft delete (D37, D38, D117, D119), card de Ministerio en Mi camino. Dependencias: Apto para Ministerio (008), Completitud Manual (006), notificaciones (012; dejar definidos los eventos)."

**Fuentes** (la spec se deriva de acá, no inventa producto): `docs/02-alcance-mvp.md` (Mi camino → Ministerios; Back office → CRUD de catálogos y bandeja unificada), `docs/03-roles-permisos.md` (Apto para Ministerio, Miembro de Ministerio, Admin, Pastor), `docs/04-dominio-entidades.md` (Ministerio, Célula, Postulación a Ministerio, patrón común de Solicitudes, regla de no duplicados), `docs/07-flujos-casos-de-uso.md` (Flujo 5 y Flujo 9), `docs/14-navegacion.md`, `docs/15-guia-ux-ui.md`, `docs/16-sistemas-transversales.md`, y las decisiones D13, D14, D15, D19, D29, D30, D31, D37, D38, D40, D48, D49, D60, D61, D64, D81, D96, D97, D117, D119, D120, D131, D132, D134, D142, D144, D149, D150 y D151.

## Clarifications

### Session 2026-10-07 (corrida sin la dueña: resueltas como Assumption)

Echu no está mirando esta corrida. Lo que los documentos no deciden quedó resuelto como Assumption razonable (sección **Assumptions**); lo que tiene peso de producto quedó además en **Preguntas para Echu**, al final, cada una con su recomendación. Ninguna de esas preguntas bloquea el plan: si Echu elige otra opción, cambia un requisito acotado, no la estructura.

- Q: ¿El flag "Apto para Ministerio" lo activa el Admin a partir de un pedido de la Persona (Flujo 5, pasos 1 a 3; D28) o se activa solo al completar Vida de Servicio (D40)? → A: **D40**. Es posterior a D28 y la reemplaza: `docs/02` y `docs/03` ya dicen "automáticamente", y el pedido de la corrida dice que lo activa la spec 008. Esta spec **no** construye el botón "Quiero servir en un Ministerio" ni la activación manual: lee el flag que escribe la 008. Los pasos 1 a 3 del Flujo 5 y el comentario del diagrama ER ("activado manualmente por Admin") quedan como **cambios a docs al mergear** (ver `plan.md`).
- Q: "Una Persona solo puede postularse una vez a un mismo Ministerio" (docs/04) contra "una Postulación rechazada no bloquea volver a postularse" (D29). → A: Se leen juntas: no puede haber **dos Postulaciones abiertas** (pendiente) ni postularse a un Ministerio **en el que ya está** (aprobada). Después de un rechazo, un retiro o una baja, puede volver a postularse — es una Postulación nueva y la anterior queda en el historial.
- Q: ¿La Persona puede retirar una Postulación pendiente? → A: Sí, con el mismo criterio que la Solicitud de Discipulado de la spec 004 (FR-039 de la 004): un estado `retirada`, con confirmación neutra (D151, es reversible: puede volver a postularse). Es un estado que `docs/04` no lista → decisión nueva en `plan.md`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Postularme a un Ministerio, eligiendo la Célula (Priority: P1)

Una Persona que completó Vida de Servicio (tiene el flag "Apto para Ministerio") quiere sumarse a servir en un área de la iglesia. Desde Mi camino ve los Ministerios activos, entra a uno, elige en qué Célula le gustaría estar (si el Ministerio tiene Células) y cuenta brevemente por qué quiere sumarse y cuándo puede. Su Postulación queda pendiente de revisión y la Persona ve claramente qué pasa después.

**Why this priority**: Es la puerta de entrada de todo el flujo: sin Postulación no hay nada que revisar ni miembros que gestionar. Es el último paso del camino de integración (Bienvenida → Vida Nueva → Vida de Servicio → Ministerio) y hoy no existe en el sistema.

**Independent Test**: Con una Persona apta y un Ministerio activo con dos Células, la Persona se postula eligiendo una Célula; se verifica que queda una Postulación `pendiente` con ese Ministerio y esa Célula, que Mi camino la muestra con su "¿y ahora qué?", y que el Admin la ve en la bandeja.

**Acceptance Scenarios**:

1. **Given** una Persona con sesión, apta, sin Postulación pendiente, **When** abre la card de Ministerio de Mi camino, **Then** ve el acceso a la lista de Ministerios activos, cada uno con su nombre, su descripción y sus Células activas.
2. **Given** esa Persona dentro del detalle de un Ministerio activo que tiene Células activas, **When** elige una Célula, completa los datos opcionales (motivación, disponibilidad) y envía, **Then** se crea una Postulación `pendiente` con ese Ministerio y esa Célula, y Mi camino muestra "Recibimos tu postulación a {Ministerio}. El equipo la revisa y te avisamos." con ícono y texto.
3. **Given** un Ministerio activo sin Células activas, **When** la Persona se postula, **Then** el formulario no le pide Célula y la Postulación queda sin Célula.
4. **Given** un Ministerio con Células, **When** la Persona elige "No tengo preferencia", **Then** la Postulación queda sin Célula (la Célula es una preferencia, no un requisito — ver Assumptions y Pregunta 3).
5. **Given** una Persona que **no** es apta, **When** abre la card de Ministerio o la lista de Ministerios, **Then** puede ver los Ministerios pero no ve el formulario: ve un texto que explica que para sumarse a un Ministerio primero se completa Vida de Servicio, con un enlace a esa etapa de Mi camino. Si intenta postularse igual (por ejemplo, armando el pedido a mano), el sistema lo rechaza con un error que lo explica.
6. **Given** una Persona con una Postulación `pendiente` (a cualquier Ministerio), **When** intenta postularse de nuevo, **Then** el sistema no crea una segunda: el formulario no se ofrece, Mi camino muestra la pendiente, y un intento directo se rechaza con un error propio (D60).
7. **Given** una Persona que ya pertenece al Ministerio X (Postulación `aprobada`), **When** mira el detalle de X, **Then** no ve el formulario sino "Ya estás sirviendo en este Ministerio"; un intento directo de postularse a X se rechaza con un error propio.
8. **Given** una Persona que pertenece al Ministerio X, **When** se postula al Ministerio Z, **Then** se crea la Postulación pendiente a Z y sigue perteneciendo a X hasta que el Admin apruebe la nueva (Historia 2).
9. **Given** el formulario enviado con un texto que supera el largo máximo, **When** el sistema lo valida, **Then** muestra el error debajo del campo y en el resumen arriba, con foco en el resumen, diciendo cómo corregirlo, sin borrar lo escrito (H-50).
10. **Given** la Persona toca "Postularme", **When** el envío está en curso, **Then** el botón queda bloqueado con indicador de carga y un segundo toque no crea una segunda Postulación (H-57).

---

### User Story 2 - Revisar Postulaciones desde la bandeja de Solicitudes (Priority: P1)

El Admin ve las Postulaciones pendientes en la bandeja unificada de Solicitudes del backoffice, junto con las de otros tipos, y puede filtrar por tipo. Abre una, ve quién es, a qué Ministerio y Célula se postula, lo que escribió, y si ya pertenece a otro Ministerio. La aprueba o la rechaza. Si la Persona ya está en otro Ministerio, el sistema le advierte antes de confirmar y, al confirmar, la membresía anterior pasa a inactiva.

**Why this priority**: Sin revisión, la Postulación no lleva a ningún lado. Junto con la Historia 1 forma el mínimo que entrega valor (D14: la revisa el Admin).

**Independent Test**: Con dos Postulaciones pendientes (una de alguien sin Ministerio y otra de alguien que ya está en X), el Admin aprueba la primera sin advertencia y la segunda con la advertencia "Esta persona ya pertenece al Ministerio X. ¿Confirmás el cambio?"; se verifica el estado final de las tres Postulaciones y lo que ve cada Persona en Mi camino.

**Acceptance Scenarios**:

1. **Given** Postulaciones pendientes y Solicitudes de Discipulado pendientes, **When** el Admin abre la bandeja, **Then** ve todas en el mismo listado, con su tipo como texto, y un filtro por tipo que permite ver solo Postulaciones; el filtro se refleja en la URL.
2. **Given** el detalle de una Postulación pendiente, **When** el Admin la abre, **Then** ve la Persona (nombre, edad, contacto), el Ministerio, la Célula elegida o "Sin preferencia", la motivación y la disponibilidad que escribió, la fecha, quién la creó si fue en su nombre, y — si la Persona ya pertenece a otro Ministerio — ese Ministerio, visible antes de tocar ningún botón.
3. **Given** una Postulación pendiente de alguien que no pertenece a ningún Ministerio, **When** el Admin la aprueba, **Then** pasa a `aprobada` sin advertencia, queda registrado quién y cuándo, la Persona pasa a ser Miembro de Ministerio con ese Ministerio y esa Célula, y Mi camino se lo muestra.
4. **Given** una Postulación pendiente a Z de alguien que pertenece a X, **When** el Admin toca "Aprobar", **Then** el sistema muestra "Esta persona ya pertenece al Ministerio X. ¿Confirmás el cambio?" y, si confirma, la Postulación a X pasa a `inactiva` y la de Z a `aprobada`, las dos en una sola operación; si no confirma, nada cambia.
5. **Given** el Admin rechaza una Postulación, con un motivo opcional, **When** confirma, **Then** pasa a `rechazada`, la Persona ve en Mi camino un mensaje amable que le dice que puede volver a postularse y a quién consultar (nunca un "Rechazada" seco), y el motivo **no** se le muestra a la Persona (ver Assumptions y Pregunta 5).
6. **Given** dos Admins que actúan a la vez sobre la misma Postulación (los dos aprueban, o uno aprueba y el otro rechaza), **When** las dos acciones llegan juntas, **Then** solo una surte efecto y la otra recibe un error que dice que ya fue resuelta y cómo quedó; nunca quedan dos `aprobada` para la misma Persona.
7. **Given** una Postulación pendiente a un Ministerio o una Célula que el Admin inactivó después, **When** intenta aprobarla, **Then** el sistema no lo deja y le explica por qué (reactivar o rechazar); rechazarla sí puede.
8. **Given** un Pastor, **When** abre la bandeja o el detalle de una Postulación, **Then** ve todo pero sin acciones (D64, D142).

---

### User Story 3 - La card de Ministerio en Mi camino (Priority: P1)

La Persona ve, en Mi camino, una card de Ministerio que le dice en qué punto está — todavía no apta, puede postularse, postulación en revisión, sirviendo en un Ministerio — y qué pasa después, con acciones que corresponden a ese punto.

**Why this priority**: Con las notificaciones todavía sin enviar (spec 012), Mi camino es **la única vía** por la que la Persona se entera de que la aprobaron o la rechazaron. Sin la card, las Historias 1 y 2 quedan sin cierre para la Persona.

**Independent Test**: Recorriendo una Persona por cada estado (no apta; apta sin postulación; pendiente; aprobada; rechazada; retirada; dada de baja), se verifica que la card muestra el texto, el ícono y la acción de cada estado, en modo claro y oscuro, y en un celular de 360 px.

**Acceptance Scenarios**:

1. **Given** una Persona no apta, **When** abre Mi camino, **Then** la card de Ministerio explica que primero se completa Vida de Servicio y ofrece "Conocé los Ministerios" (solo lectura).
2. **Given** una Persona apta sin Postulación abierta ni Ministerio, **When** abre Mi camino, **Then** la card ofrece "Elegí un Ministerio" como acción principal; si su última Postulación fue rechazada, retirada o dada de baja, lo dice con un texto amable antes de la acción.
3. **Given** una Postulación pendiente, **When** abre Mi camino, **Then** ve el Ministerio, la Célula, la fecha, qué pasa después y la acción "Retirar postulación".
4. **Given** la Persona toca "Retirar postulación", **When** confirma en el diálogo (neutro, no rojo: D151), **Then** la Postulación pasa a `retirada` y la card vuelve a ofrecer "Elegí un Ministerio" sin recargar la página.
5. **Given** una Persona que pertenece a un Ministerio, **When** abre Mi camino, **Then** ve "Estás sirviendo en {Ministerio}" (y "en la Célula {Célula}" si tiene), desde cuándo, y la opción secundaria "Quiero cambiar de Ministerio", que lleva a la lista.
6. **Given** una Persona que pertenece a X y tiene una pendiente a Z, **When** abre Mi camino, **Then** la card muestra las dos cosas: sigue en X y su postulación a Z está en revisión.
7. **Given** una Persona que pertenece a un Ministerio que el Admin inactivó, **When** abre Mi camino, **Then** ve su Ministerio con un aviso de que por ahora no está activo y a quién consultar — no lo ve como si nada hubiera pasado ni pierde su historial.

---

### User Story 4 - Gestionar Ministerios y Células desde Catálogos (Priority: P2)

El Admin da de alta, edita, inactiva, reactiva y elimina Ministerios, y dentro de cada uno sus Células, desde Catálogos del backoffice. Inactivar algo que tiene personas sirviendo pide una confirmación reforzada; eliminar solo es posible para lo que no tiene datos relacionados y se recupera desde la papelera.

**Why this priority**: Sin Ministerios cargados no hay a qué postularse, pero para la demo y los tests el seed los siembra, así que las Historias 1 a 3 se pueden probar sin esta. Es necesaria para operar de verdad.

**Independent Test**: El Admin crea un Ministerio con dos Células, edita el nombre de una, inactiva el Ministerio (con miembros: confirmación escribiendo el nombre), lo reactiva, crea un Ministerio de prueba sin datos, lo elimina y lo restaura desde la papelera.

**Acceptance Scenarios**:

1. **Given** el Admin en Catálogos, **When** entra a Ministerios, **Then** ve el listado con nombre, cantidad de Células activas, cantidad de miembros activos y estado (texto + ícono), con filtro activos / todos y búsqueda por nombre, reflejados en la URL (D117, D126).
2. **Given** el Admin toca "Crear un Ministerio", **When** completa nombre y descripción y guarda, **Then** el diálogo se cierra, el Ministerio aparece en el listado y la confirmación ofrece el paso siguiente: "Agregar Células" (docs/15, H-107).
3. **Given** un nombre ya usado por otro Ministerio (sin contar los eliminados; sin distinguir mayúsculas ni tildes), **When** el Admin guarda, **Then** ve el error debajo del campo, diciendo que ya existe un Ministerio con ese nombre.
4. **Given** el detalle de un Ministerio, **When** el Admin lo abre, **Then** ve sus datos editables, sus Células (activas e inactivas, con su estado), la lista de miembros activos con su Célula, y las acciones Inactivar/Reactivar y Eliminar.
5. **Given** un Ministerio con miembros activos o Postulaciones pendientes, **When** el Admin toca "Inactivar", **Then** el diálogo dice cuántos miembros y cuántas Postulaciones pendientes hay y pide escribir el nombre exacto para confirmar (D38); sin datos relacionados activos, alcanza una confirmación simple.
6. **Given** un Ministerio inactivo, **When** el Admin lo ve, **Then** sigue en el listado (filtro "todos") marcado como inactivo, se puede abrir y existe "Reactivar" (D117).
7. **Given** un Ministerio con cualquier Postulación (en cualquier estado) o con Células, **When** el Admin intenta eliminarlo, **Then** el botón aparece deshabilitado con el motivo y ofrece inactivar (D119); sin datos relacionados se puede eliminar, desaparece de las vistas normales y va a la papelera de Ministerios, desde donde se restaura.
8. **Given** el detalle de un Ministerio, **When** el Admin agrega, edita, inactiva, reactiva o elimina una Célula, **Then** valen las mismas reglas que para el Ministerio, a escala de la Célula: nombre único dentro del Ministerio, confirmación reforzada si tiene miembros activos o Postulaciones pendientes, eliminación solo sin Postulaciones, papelera dentro del Ministerio.
9. **Given** un Ministerio inactivo, **When** la Persona mira la lista de Ministerios (app o pública), **Then** no aparece; **And** una Célula inactiva, o cualquier Célula de un Ministerio inactivo, no se ofrece en el formulario.
10. **Given** un Pastor, **When** entra a Catálogos → Ministerios, **Then** ve listados y detalles sin ninguna acción de edición; la papelera es solo del Admin (D119, H-129).

---

### User Story 5 - Postular en nombre de una Persona sin acceso a la app (Priority: P3)

El Admin, desde el backoffice, crea una Postulación en nombre de una Persona apta que no usa la app (D97), con los mismos datos que cargaría ella, y queda registrado quién la creó.

**Why this priority**: Es la regla general del sistema para Personas sin acceso a la app (Flujo 12, D97). Afecta a pocas personas y no bloquea el flujo principal.

**Independent Test**: El Admin busca una Persona apta sin email, crea su Postulación a un Ministerio y Célula; la bandeja la muestra con "Creada por {Admin} en nombre de {Persona}", y se puede aprobar como cualquier otra.

**Acceptance Scenarios**:

1. **Given** una Persona apta, **When** el Admin crea una Postulación en su nombre, **Then** se aplican las mismas reglas que a la Persona (apta, sin pendiente, no en ese Ministerio) y queda `creado_por` con el Admin; la pantalla muestra durante toda la acción en nombre de quién está actuando (docs/15).
2. **Given** una Persona no apta, **When** el Admin intenta crear la Postulación en su nombre, **Then** el sistema lo rechaza explicando el motivo (esta spec no da una vía para saltear el requisito: la excepción es la Completitud Manual, spec 006 — ver Assumptions y Pregunta 4).
3. **Given** la Persona entra después a la app, **When** abre Mi camino, **Then** ve esa Postulación como propia (mismo criterio que la 004).

---

### User Story 6 - Dar de baja a alguien de su Ministerio (Priority: P3)

Cuando una Persona deja de servir (avisa por otro canal, se muda, etc.), el Admin la da de baja de su Ministerio desde el detalle del Ministerio. Su Postulación aprobada pasa a `inactiva` — no se borra — y la Persona puede volver a postularse más adelante.

**Why this priority**: Los documentos no traen cómo se deja un Ministerio (solo el cambio a otro). Sin esto, la lista de miembros solo crece y el alcance "Ministerio" de las notificaciones (D48) le llegaría a quien ya no está. Es una decisión de producto con peso → Pregunta 2; se especifica la recomendación.

**Independent Test**: El Admin da de baja a un miembro con motivo opcional; se verifica que su Postulación queda `inactiva`, que desaparece de los miembros activos, que su historial la conserva, y que la Persona ve en Mi camino que ya no está en ese Ministerio y puede postularse de nuevo.

**Acceptance Scenarios**:

1. **Given** un miembro activo, **When** el Admin toca "Dar de baja del Ministerio" y confirma (confirmación neutra: es reversible — D151), **Then** la Postulación pasa a `inactiva` con fecha, quién lo hizo y motivo opcional (solo visible en el backoffice).
2. **Given** esa Persona, **When** abre Mi camino, **Then** la card dice que ya no figura en {Ministerio}, que si fue un error consulte al equipo, y ofrece "Elegí un Ministerio".
3. **Given** la Persona dada de baja, **When** se postula de nuevo al mismo Ministerio, **Then** el sistema lo permite (D29).

---

### User Story 7 - La página pública de Ministerios muestra los Ministerios reales (Priority: P3)

Un Visitante que entra a Primeros pasos › Ministerios ve los Ministerios activos con su descripción, en vez del estado vacío actual, y una invitación a empezar el camino.

**Why this priority**: La página ya existe (spec 003) con un estado vacío que dice "pronto vas a poder conocerlos"; con el catálogo cargado, seguir mostrando eso sería falso. Es lectura de un dato que esta spec crea.

**Independent Test**: Con dos Ministerios activos y uno inactivo, la página pública muestra los dos activos (con sus Células activas como texto), sin el inactivo; sin ninguno activo, muestra el estado vacío actual.

**Acceptance Scenarios**:

1. **Given** Ministerios activos, **When** un Visitante abre `/ministerios`, **Then** ve cada uno con nombre, descripción y sus Células activas, con la miga "Primeros pasos › Ministerios" y un llamado a la acción hacia Primeros pasos (sin sesión) o hacia Mi camino (con sesión).
2. **Given** ningún Ministerio activo, **When** se abre la página, **Then** se ve el estado vacío actual.
3. **Given** el Admin edita o inactiva un Ministerio, **When** pasa el tiempo de revalidación, **Then** la página pública lo refleja (ver Assumptions).

---

### Edge Cases

- **La Persona deja de ser apta después de postularse**: el flag no se revoca en el flujo normal (D40); si se corrigiera por la vía del Flujo 9, la Postulación pendiente sigue y la decide el Admin. La aptitud se verifica al **crear** la Postulación, no al aprobarla.
- **El Admin inactiva un Ministerio con miembros**: las Postulaciones `aprobada` **no** cambian (inactivar es reversible y no debe borrar la historia de nadie); los miembros ven el aviso de la Historia 3, escenario 7; el Ministerio no aparece en las listas y no recibe Postulaciones nuevas. Al reactivarlo, todo vuelve como estaba.
- **El Admin inactiva una Célula con miembros**: la membresía sigue con esa Célula, marcada como inactiva en el backoffice; la Persona ve su Ministerio y la Célula con el aviso. Las Postulaciones pendientes a esa Célula no se pueden aprobar mientras esté inactiva (Historia 2, escenario 7): el Admin la reactiva o rechaza la Postulación.
- **Reactivar una Célula de un Ministerio inactivo**: no se permite; el sistema explica que primero hay que reactivar el Ministerio.
- **Dos pestañas o doble toque al postularse**: la segunda choca con la regla de una sola pendiente y recibe el error de "ya tenés una postulación en revisión", nunca un 500 (H-57 en la interfaz, garantía en la base).
- **Aprobar una Postulación ya resuelta** (otro Admin la rechazó un segundo antes): error que dice que ya fue resuelta y el estado actual; la bandeja se actualiza.
- **Retirar una Postulación que el Admin acaba de aprobar**: error que dice que ya fue aprobada; Mi camino se actualiza.
- **Postularse al Ministerio en el que ya está, pero a otra Célula**: no se permite en esta spec (Out of scope: cambio de Célula dentro del mismo Ministerio). El mensaje explica que para cambiar de Célula se consulta al equipo.
- **Postulación a un Ministerio que tiene Células, eligiendo una de otro Ministerio** (pedido armado a mano): error de validación en el campo Célula.
- **Ministerio eliminado (papelera) con miembros**: imposible por construcción — no se puede eliminar con Postulaciones (D119).
- **Persona menor de edad apta**: la regla es la aptitud, no la edad; esta spec no agrega restricción por edad (ver Assumptions).
- **Persona inactiva** (`activo = false`): sus Postulaciones quedan como están; no aparece en la lista de miembros activos.
- **Nombres largos** (Ministerio o Célula al máximo permitido, tildes, ñ): la card, la bandeja, el listado y el detalle no desbordan a 320 px (seed-demo con datos hostiles, D120).

## Requirements *(mandatory)*

### Functional Requirements

**Postulación (Persona)**

- **FR-001**: El sistema DEBE permitir que una Persona con sesión y apta para Ministerio cree una Postulación a un Ministerio activo, eligiendo opcionalmente una Célula activa de ese Ministerio, y completando opcionalmente "motivación" y "disponibilidad" (texto libre, hasta 500 caracteres cada uno).
- **FR-002**: El sistema DEBE rechazar la Postulación de una Persona que no es apta, con un código de error propio; la aptitud se lee de la fuente que define la spec 008 (rol de estado `apto_ministerio`), nunca de una regla propia de esta spec.
- **FR-003**: El sistema DEBE impedir que una Persona tenga más de una Postulación `pendiente` a la vez, a cualquier Ministerio (D60), garantizado también ante pedidos simultáneos.
- **FR-004**: El sistema DEBE impedir que una Persona se postule a un Ministerio en el que tiene una Postulación `aprobada`.
- **FR-005**: El sistema DEBE permitir volver a postularse al mismo Ministerio después de un rechazo, un retiro o una baja, creando una Postulación nueva (D29); las anteriores no se modifican.
- **FR-006**: La Persona DEBE poder retirar su Postulación `pendiente`, con confirmación neutra (D151); pasa a `retirada`. No puede retirar una ya resuelta.
- **FR-007**: El formulario DEBE validar por campo con la pieza compartida (H-50): la Célula debe pertenecer al Ministerio y estar activa; los textos no deben superar el máximo. Los errores dicen cómo corregir.
- **FR-008**: El envío DEBE quedar bloqueado con indicador de carga mientras se procesa y protegido de la reentrada (H-57).

**Lista de Ministerios para la Persona (app)**

- **FR-009**: La app con sesión DEBE ofrecer una lista de Ministerios activos (nombre, descripción, Células activas) y un detalle por Ministerio, dentro de la app (sin salir a la web pública, D107), alcanzables desde la card de Ministerio de Mi camino.
- **FR-010**: El detalle DEBE mostrar, según la situación de la Persona: el formulario (apta, sin pendiente, no es miembro de ese Ministerio); "Ya estás sirviendo en este Ministerio"; "Ya tenés una postulación en revisión a {Ministerio}" con enlace a Mi camino; o la explicación de que primero se completa Vida de Servicio (no apta).

**Card de Ministerio en Mi camino**

- **FR-011**: Mi camino DEBE mostrar una card de Ministerio con el estado de la Persona — `no_apta`, `puede_postularse` (con el último desenlace: rechazada, retirada o dada de baja, si lo hubo), `pendiente`, `miembro` (y `miembro` + `pendiente` a otro Ministerio a la vez) — cada uno con texto, ícono y qué pasa después (docs/15 "¿Y ahora qué?"), nunca solo color (D81).
- **FR-012**: La card DEBE mostrar si el Ministerio o la Célula de la Persona están inactivos, con un aviso y a quién consultar.
- **FR-013**: Las acciones de la card (retirar) DEBEN actualizar el estado sin recargar la página.
- **FR-014**: La card NO DEBE mostrar el motivo de rechazo ni el de baja (son notas internas del equipo).

**Revisión (Admin)**

- **FR-015**: La bandeja unificada de Solicitudes DEBE incluir las Postulaciones a Ministerio con la forma base común (Persona, tipo, estado, fecha, revisado por, creado por) y DEBE mostrar el filtro por tipo, reflejado en la URL, ahora que hay más de un tipo conectado.
- **FR-016**: El detalle de una Postulación DEBE mostrar la Persona (nombre, edad, contacto), el Ministerio, la Célula o "Sin preferencia", motivación, disponibilidad, fecha, creador si fue en nombre de, el Ministerio actual de la Persona si tiene, y el historial de sus Postulaciones anteriores.
- **FR-017**: El Admin DEBE poder aprobar una Postulación `pendiente`. Si la Persona tiene una Postulación `aprobada` en otro Ministerio, el sistema DEBE advertirlo ("Esta persona ya pertenece al Ministerio X. ¿Confirmás el cambio?") y, al confirmar, pasar la anterior a `inactiva` y la nueva a `aprobada` en una sola operación atómica. Sin confirmación explícita, la API DEBE rechazar la aprobación que implica un cambio (la advertencia no es solo de interfaz).
- **FR-018**: Al aprobar, la Persona DEBE quedar como Miembro de Ministerio (rol de estado escrito por el lugar único de roles de estado, D131 / FR-019 de la 005), con el Ministerio y la Célula de la Postulación.
- **FR-019**: El Admin DEBE poder rechazar una Postulación `pendiente` con un motivo opcional (hasta 500 caracteres), visible solo en el backoffice.
- **FR-020**: El sistema DEBE garantizar que una Persona nunca tenga dos Postulaciones `aprobada` a la vez, incluso con aprobaciones simultáneas.
- **FR-021**: El sistema DEBE impedir aprobar una Postulación cuyo Ministerio o Célula estén inactivos o eliminados, con un error que lo explique.
- **FR-022**: Aprobar y rechazar DEBEN registrar quién y cuándo (`revisado_por`, fecha).
- **FR-023**: El Pastor DEBE ver la bandeja, los detalles y los catálogos sin acciones (D64, D142); la API DEBE rechazar sus intentos de escritura.

**En nombre de otra Persona**

- **FR-024**: El Admin DEBE poder crear una Postulación en nombre de una Persona (D97), con las mismas reglas FR-001 a FR-007, registrando `creado_por`; la pantalla DEBE mostrar en nombre de quién actúa durante toda la acción.

**Baja de un Ministerio**

- **FR-025**: El Admin DEBE poder dar de baja a un miembro de su Ministerio desde el detalle del Ministerio: la Postulación `aprobada` pasa a `inactiva`, con fecha, quién y motivo opcional (solo backoffice). La Persona puede volver a postularse (FR-005).

**Catálogo de Ministerios y Células (Admin)**

- **FR-026**: El Admin DEBE poder crear y editar Ministerios (nombre obligatorio, hasta 80 caracteres, único entre los no eliminados sin distinguir mayúsculas ni tildes; descripción obligatoria, hasta 600 caracteres, texto plano).
- **FR-027**: El Admin DEBE poder crear y editar Células dentro de un Ministerio (nombre obligatorio, hasta 80 caracteres, único dentro de su Ministerio entre las no eliminadas).
- **FR-028**: El Admin DEBE poder inactivar y reactivar Ministerios y Células (soft delete con `activo`, D37). Si hay miembros activos o Postulaciones pendientes, la confirmación DEBE ser reforzada (escribir el nombre exacto, D38) y decir cuántos hay; si no, confirmación simple.
- **FR-029**: El sistema DEBE impedir reactivar una Célula mientras su Ministerio esté inactivo.
- **FR-030**: El Admin DEBE poder eliminar (borrado lógico con marca de eliminación y responsable, D119) un Ministerio sin Postulaciones ni Células (no eliminadas), y una Célula sin Postulaciones; si tiene datos relacionados, el botón DEBE aparecer deshabilitado con el motivo y ofrecer inactivar. Lo eliminado DEBE poder restaurarse desde una papelera (solo Admin).
- **FR-031**: Los listados de Ministerios DEBEN mostrar también los inactivos, con estado en texto + ícono, filtro activos / todos y búsqueda por nombre, con el estado en la URL (D117, D126); el detalle de un inactivo se abre y ofrece "Reactivar".
- **FR-032**: El detalle de un Ministerio DEBE mostrar sus miembros activos (nombre, Célula, desde) y la acción de dar de baja (FR-025).
- **FR-033**: El alta de Ministerio y de Célula DEBEN abrir en diálogo; la confirmación del alta de un Ministerio DEBE ofrecer "Agregar Células" (docs/15).

**Página pública**

- **FR-034**: La página pública `/ministerios` DEBE mostrar los Ministerios activos con su descripción y sus Células activas, y el estado vacío existente cuando no hay ninguno; sigue con SEO (D82).

**Notificaciones (costura para la spec 012)**

- **FR-035**: Cada transición DEBE emitir un evento tipado, después de confirmada la operación, con destinatario e ids (sin datos personales): Postulación creada (→ Admin), aprobada (→ Persona, importante), rechazada (→ Persona, importante), retirada (→ Admin), inactivada por cambio (→ Persona: incluida en el de aprobada), dada de baja (→ Persona, importante). El envío lo conecta la spec 012 (D149: Avisos + email).
- **FR-036**: El sistema DEBE exponer una única forma de resolver "los miembros activos de un Ministerio" para que la spec 012 la use como alcance `ministerio` de las notificaciones manuales (D48).

- **FR-041**: Mientras no haya envío de notificaciones, la tarjeta de pendientes del Inicio del backoffice DEBE mostrar cuántas Postulaciones pendientes hay, con enlace a la bandeja filtrada por ese tipo.

**Transversales**

- **FR-037**: Toda pantalla nueva o modificada DEBE tener sus cuatro estados (cargando, vacío, error, éxito) con `loading.tsx` / `error.tsx` (Principio VIII), textos de `next-intl` en rioplatense, colores solo de tokens, y en `apps/web` los tamaños de D150 (16 px, botones de 44 px).
- **FR-038**: Todo error de negocio nuevo DEBE tener su código propio en el catálogo compartido y su traducción (Principio X).
- **FR-039**: Ninguna Postulación, Ministerio ni Célula se borra físicamente (Principio III).
- **FR-040**: El seed de demostración DEBE incluir Ministerios y Células (activos, uno inactivo, uno eliminado), Postulaciones en todos los estados, una Persona que cambió de Ministerio, y nombres hostiles (D120).

### Key Entities *(include if feature involves data)*

- **Ministerio**: área de servicio (ej. Vida en Acción, Bienvenida). Nombre, descripción, `activo`, marca de eliminación (fecha y responsable). Contiene Células y recibe Postulaciones. No tiene cronograma ni Sede (docs/04, diagrama ER).
- **Célula**: subgrupo de un Ministerio (D15). Nombre, `activo`, marca de eliminación. Pertenece a un solo Ministerio.
- **Postulación a Ministerio**: el pedido de una Persona para servir en un Ministerio, con la forma base de las Solicitudes (D31): Persona, estado (`pendiente` / `aprobada` / `rechazada` / `inactiva` / `retirada`), fecha, `revisado_por`, `creado_por`, más sus campos propios: Ministerio, Célula (opcional), motivación y disponibilidad (opcionales), motivo de rechazo (opcional, interno), y para `inactiva` la fecha, quién y si fue por cambio de Ministerio o por baja (con motivo opcional, interno). La Postulación `aprobada` **es** la membresía: el Ministerio actual de una Persona es el de su única Postulación `aprobada` (D19).
- **Miembro de Ministerio**: rol de estado del proceso (docs/03, D131), escrito por el sistema al aprobarse la primera Postulación. Qué Ministerio y Célula tiene hoy se lee de la Postulación `aprobada`, no del rol.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una Persona apta completa una Postulación (desde abrir Mi camino hasta ver "Recibimos tu postulación") en menos de 2 minutos en un celular de 360 px.
- **SC-002**: El Admin resuelve una Postulación (abrir desde la bandeja, decidir, confirmar) en menos de 1 minuto, y en el 100% de los casos con cambio de Ministerio ve la advertencia antes de confirmar.
- **SC-003**: En ninguna circunstancia (incluidos pedidos simultáneos) una Persona queda con dos Postulaciones pendientes o dos aprobadas: verificado por tests de concurrencia.
- **SC-004**: Ninguna Postulación, Ministerio ni Célula desaparece de la base: después de recorrer todos los flujos, la cantidad de filas solo crece o se mantiene.
- **SC-005**: La Persona puede saber en qué estado está su Postulación y qué pasa después sin preguntarle a nadie: la card cubre el 100% de los estados posibles con texto + ícono.
- **SC-006**: Todas las pantallas nuevas pasan axe sin violaciones en modo claro y oscuro, y no tienen scroll horizontal a 320 px.
- **SC-007**: Desactivar por error un Ministerio con personas sirviendo requiere escribir su nombre exacto; el 100% de las inactivaciones se pueden revertir desde la interfaz.

## Assumptions

- **Aptitud (dependencia de la spec 008)**: "apta para Ministerio" es tener el rol de estado `apto_ministerio`, que escribe la spec 008 al completarse una Inscripción de Vida de Servicio (D40). Esta spec solo lo **lee**. Si la 008 todavía no está mergeada al implementar, los tests siembran el rol directamente.
- **Completitud Manual (dependencia de la spec 006)**: quien hizo Vida de Servicio fuera del sistema llega a apto por la Completitud Manual de un Curso de Vida de Servicio (D74, D144). Se asume que la 006/008 escriben `apto_ministerio` también en ese caso; si no, es un hueco de esas specs (ver Pregunta 4), no de esta.
- **Sin "Ya lo hice" en la card de Ministerio**: quien ya sirve desde antes de la app declara Vida de Servicio en su card (D144) y después se postula a su Ministerio como cualquiera; el Admin la aprueba. No hay una vía para "ya soy miembro" sin Postulación (ver Pregunta 1).
- **La Célula es una preferencia opcional**: "elige la Célula (si aplica)" (Flujo 5). Con Células activas se ofrecen como radio con la opción "No tengo preferencia"; el Admin no la cambia al aprobar (D30). Ver Pregunta 3.
- **Datos adicionales**: "motivación" y "disponibilidad" (los ejemplos del Flujo 5), dos textos libres opcionales de hasta 500 caracteres. No se reusa el editor de franjas de la 004: la disponibilidad para un Ministerio no se cruza con nada.
- **Motivos internos**: los motivos de rechazo y de baja los ve solo el backoffice; la Persona ve un texto amable y a quién consultar (docs/15). Ver Pregunta 5.
- **Cambio de Célula dentro del mismo Ministerio**: fuera de alcance; hoy se resuelve con baja + nueva Postulación. Si aparece como necesidad real, es una historia chica posterior.
- **Sin restricción por edad**: la condición para postularse es la aptitud; si un menor llega a apto, puede postularse (los roles de **cargo** están vedados a menores — D133 —, pero Miembro de Ministerio es un rol de estado).
- **Página pública**: se revalida con el mismo criterio que el resto de las páginas públicas con datos del catálogo (ISR, revalidación periódica); el Admin no necesita "publicar".
- **Notificaciones**: el envío es de la spec 012 (D149). Mientras tanto, la Persona se entera por Mi camino y el Admin por la bandeja y la tarjeta de pendientes del Inicio.
- **Vista unificada de Persona (D61)**: no existe todavía en el backoffice. Esta spec deja el endpoint con el Ministerio actual y el historial de Postulaciones de una Persona; la sección dentro de esa vista la agrega la spec que la construya.
- **Volumen**: decenas de Ministerios y Células, cientos de Postulaciones. El listado de Ministerios no necesita paginación de servidor (catálogo chico, docs/15 "no en catálogos de dos o tres filas"), pero la bandeja sí (ya la tiene) y la lista de miembros de un Ministerio sí (puede crecer).
- **Contenido específico del Ministerio** ("Contenido específico de su Ministerio/Célula", docs/03): no hay entidad de contenido de Ministerio definida en los docs; queda fuera de alcance.

## Out of Scope

- Botón "Quiero servir en un Ministerio" y activación manual del flag (D28, superada por D40).
- Activación de `apto_ministerio` (spec 008) y Completitud Manual (spec 006).
- Envío de notificaciones (spec 012) — solo los eventos.
- Líder de Ministerio propio que revisa Postulaciones (Fase 2, `docs/08`).
- Contenido específico por Ministerio/Célula, necesidades de voluntariado puntual (Fase 2).
- Cambio de Célula dentro del mismo Ministerio sin nueva Postulación.
- Traducciones del contenido cargado por el Admin (Fase 2, D84).
- La vista unificada de Persona en sí (D61).

## Preguntas para Echu

Ninguna bloquea: cada una tiene una recomendación ya especificada arriba. Si Echu elige otra opción, cambia el requisito citado.

1. **¿Cómo entra al sistema alguien que ya sirve en un Ministerio desde antes de la app?** Recomendación: sin trámite especial — declara Vida de Servicio con "Ya lo hice" (D144), el Admin lo confirma, y después se postula a su Ministerio y el Admin la aprueba (o el Admin la postula en su nombre, Historia 5). Alternativa: un "Ya sirvo en un Ministerio" en la card que crea la membresía directo al confirmarlo el Admin (agrega un tipo más de declaración).
2. **¿Cómo deja alguien un Ministerio?** Los docs solo describen el cambio a otro. Recomendación: lo hace el Admin ("Dar de baja del Ministerio", Historia 6), cuando la Persona avisa por otro canal; la Persona no tiene un botón para salirse sola desde la app, para que la salida pase por una conversación. Alternativa: un "Dejar de servir" en la card, con confirmación.
3. **¿La Célula es obligatoria cuando el Ministerio tiene Células?** Recomendación: opcional, con "No tengo preferencia" (el Flujo 5 dice "si aplica", y quien recién llega a un Ministerio muchas veces no conoce las Células). Alternativa: obligatoria — más simple de leer en la lista de miembros, pero obliga a elegir sin conocer.
4. **¿La Completitud Manual de Vida de Servicio hace apta a la Persona?** Recomendación: sí — es el sentido de la Completitud Manual ("como si hubiera completado el Curso") y D144 la usa para el historial previo. Hay que asegurarlo en la 006/008, que escriben el flag; esta spec solo lo lee.
5. **¿La Persona ve el motivo cuando la rechazan o la dan de baja?** Recomendación: no — el motivo es una nota interna, y la Persona ve un mensaje amable que le dice que puede volver a postularse y a quién consultar (docs/15: "nunca un Rechazada seco"). Alternativa: mostrarlo si el Admin marca "compartir con la persona".
