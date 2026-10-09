# Feature Specification: Grupos de Extensión

**Feature Branch**: `014-grupos-extension`

**Created**: 2026-10-09

**Status**: Draft

**Input**: Pedido de Echu del 2026-10-09: Grupos de Extensión pasa al MVP. Hoy el proceso es por
WhatsApp (la persona le escribe al Admin su edad, género y zona; el Admin le manda un listado; la
persona elige y el Admin le avisa a la líder, que la contacta). El Admin es solo intermediario y es
un cuello de botella: la app lo automatiza. Decisiones de Echu (1 a 7 del pedido) ya tomadas; quedan
en `docs/05-decisiones.md` como D220–D228.

**Fuentes**: `docs/08-roadmap-producto.md` (sección Grupos de Extensión, relato del 8/10/2026),
`docs/04-dominio-entidades.md` (patrón común de Solicitudes), `docs/15-guia-ux-ui.md`,
`docs/17-paleta-y-tokens.md`, y las decisiones D81, D97, D132, D133, D142, D150, D151, D178, D197,
D201, D208, D218.

## Clarifications

### Session 2026-10-09 (corrida sin la dueña: lo no definido, como Assumption)

Echu no está mirando esta corrida. Lo que el pedido no decide quedó resuelto con la opción más
conservadora (sección **Assumptions**) y, cuando tiene peso de producto, además en **Preguntas para
Echu** al final, con su recomendación. Ninguna bloquea el plan.

- Q: ¿El aviso al líder dice el nombre de quien pide sumarse ("{nombre} quiere sumarse")? → A: No en
  el texto del aviso: el catálogo de avisos no lleva datos personales (FR-013 de la 012, D197; un
  test lo exige). El aviso dice "Tenés un pedido nuevo para {grupo}" y, al tocarlo, el líder ve el
  pedido con el nombre y el contacto. Pregunta 1.
- Q: ¿Qué pasa al inactivar un Grupo con integrantes o pedidos? → A: No se puede: primero se quitan
  los integrantes y se resuelven los pedidos (nada se cierra solo sin que la persona se entere).
- Q: ¿Un Grupo sin rango de edad, a quién se le muestra? → A: A cualquier edad. Pregunta 2.
- Q: ¿La persona puede salir sola de su Grupo? → A: No en esta tanda: le pide al líder o al Admin, que
  la quita. Pregunta 3.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Encontrar mi Grupo y pedir sumarme (Priority: P1) ⭐

Una persona registrada entra a Mi camino, toca la card "Mi grupo de extensión" y llega a "Encontrá tu
grupo". Escribe su dirección (o toca "Usar mi ubicación") y ve los Grupos activos que le corresponden
por su género y su edad, ordenados por cercanía ("a 1,2 km"), con nombre, líder, días y horario y
zona — nunca la dirección exacta. Elige uno y toca "Quiero sumarme".

**Why this priority**: Es lo que reemplaza el ida y vuelta de WhatsApp con el Admin.

**Independent Test**: Con 4 Grupos (dos de mujeres a distinta distancia, uno de varones, uno de
mujeres fuera de su edad), una mujer de 30 busca por dirección y ve solo los dos de mujeres de su
edad, el más cercano primero, sin la dirección exacta; pide sumarse al primero y queda un pedido
pendiente.

**Acceptance Scenarios**:

1. **Given** una persona activa sin Grupo ni pedido, **When** abre Mi camino, **Then** ve, aparte de
   las cuatro etapas, la card "Mi grupo de extensión" con "Encontrá tu grupo".
2. **Given** "Encontrá tu grupo", **When** escribe una dirección que se puede ubicar y toca "Buscar",
   **Then** ve los Grupos activos de su género (o mixtos) cuyo rango de edad la incluye, ordenados por
   distancia, cada uno con nombre, nombre del líder, días y horario, zona y "a X km".
3. **Given** la misma pantalla, **When** toca "Usar mi ubicación" y el navegador la da, **Then** ve la
   misma lista ordenada desde ese punto; si la niega o falla, un mensaje le dice que escriba su
   dirección.
4. **Given** una dirección que no se puede ubicar, **When** busca, **Then** ve el error debajo del campo
   diciendo cómo escribirla ("calle y número, o calle y entre calles").
5. **Given** un filtro de días elegido, **When** busca, **Then** ve solo los Grupos que se reúnen en
   alguno de esos días.
6. **Given** un Grupo con el cupo lleno, **When** aparece en la lista, **Then** dice "Completo" (texto +
   ícono) y no tiene botón.
7. **Given** un Grupo sin coordenadas (su dirección no se pudo ubicar), **When** aparece, **Then** va al
   final de la lista, sin distancia ("Distancia sin calcular").
8. **Given** la persona toca "Quiero sumarme", **When** confirma, **Then** queda un pedido pendiente; la
   card dice "Le avisamos a {líder}. Te va a escribir para contarte más" y ofrece "Retirar el pedido".
9. **Given** un pedido pendiente o un Grupo, **When** intenta pedir otro, **Then** no se ofrece y un
   intento directo se rechaza con un error propio.
10. **Given** la persona retira el pedido (confirmación neutra, D151), **Then** vuelve a poder buscar.
11. **Given** cualquier búsqueda, **Then** la dirección o la ubicación de la persona no se guarda en
    ningún lado ni aparece en los registros.

### User Story 2 - El líder recibe el pedido y acepta (Priority: P1) ⭐

El líder de un Grupo recibe un aviso, entra a "Mi grupo" en la web app, ve el pedido con nombre,
edad y contacto de la persona, le escribe por WhatsApp si quiere, y toca "Aceptar" o "No es para
este grupo" (con mensaje opcional). Ve la lista de integrantes con su contacto.

**Independent Test**: Una persona pide sumarse; el líder ve el aviso, abre "Mi grupo", ve el pedido
con el enlace "Escribir por WhatsApp" y lo acepta; la persona pasa a integrante.

**Acceptance Scenarios**:

1. **Given** un pedido nuevo, **Then** cada líder del Grupo recibe el aviso "Tenés un pedido nuevo
   para {grupo}" que lleva a "Mi grupo".
2. **Given** "Mi grupo", **Then** el líder ve cada Grupo que lidera, sus pedidos pendientes (nombre,
   edad, teléfono, email, desde cuándo espera) y sus integrantes (nombre, teléfono, email, desde cuándo).
3. **Given** un pedido, **Then** "Escribir por WhatsApp" (texto + ícono) abre `wa.me` con el teléfono de
   la persona y un saludo; sin teléfono, no aparece.
4. **Given** el líder acepta, **Then** la persona pasa a integrante y recibe el aviso "Ya formás parte
   del grupo {grupo}".
5. **Given** el líder toca "No es para este grupo" y opcionalmente escribe un mensaje, **Then** el pedido
   queda rechazado, la persona recibe un aviso amable y puede elegir otro Grupo; el mensaje lo ve la
   persona en su card.
6. **Given** el Grupo lleno, **When** el líder intenta aceptar, **Then** se rechaza con un error que lo
   explica.
7. **Given** alguien que no es líder de ese Grupo, **Then** no ve ni resuelve sus pedidos (404).

### User Story 3 - Ver mi Grupo y cómo llegar (Priority: P1) ⭐

Ya aceptada, la card "Mi grupo de extensión" muestra el Grupo, la dirección exacta, días y horario, el
líder con su contacto y "Cómo llegar" (abre Google Maps con la dirección).

**Acceptance Scenarios**:

1. **Given** una integrante, **When** abre su card o "Mi grupo de extensión", **Then** ve nombre, dirección
   exacta (o "En la iglesia" con la dirección de la Sede), zona, días y horario, líderes con teléfono y
   WhatsApp, y "Cómo llegar".
2. **Given** un pedido rechazado, **Then** la card lo dice con amabilidad, muestra el mensaje del líder
   si lo hubo, y ofrece "Encontrá otro grupo".

### User Story 4 - El Admin carga los Grupos (Priority: P1)

En Backoffice › Grupos de extensión el Admin crea, edita, inactiva y reactiva Grupos: nombre,
líder(es), días y horario, cupo opcional, rango de edad opcional, y lugar ("En la iglesia" o calle,
número opcional, entre calle y calle, barrio/zona). El Pastor solo ve.

**Acceptance Scenarios**:

1. **Given** el Admin completa el formulario y guarda, **Then** el Grupo queda creado; la dirección se
   ubica en el mapa; si no se pudo, se guarda igual con el aviso "No pudimos ubicar la dirección: el
   grupo no va a mostrar distancia".
2. **Given** "En la iglesia", **Then** no se escriben calles: el lugar es la dirección de la Sede elegida.
3. **Given** líderes elegidos, **Then** el género del Grupo se calcula (todas mujeres → mujeres; todos
   varones → varones; ambos → mixto) y se muestra, y cada líder recibe el rol Líder de extensión.
4. **Given** una persona menor de edad como líder, **Then** se rechaza (D133).
5. **Given** la hora, **Then** se elige en pasos de 15 minutos; al menos un día es obligatorio.
6. **Given** errores de validación, **Then** se muestran por campo con resumen arriba (H-50).
7. **Given** un Grupo con integrantes o pedidos pendientes, **When** el Admin intenta inactivarlo,
   **Then** no se puede y se le dice por qué.
8. **Given** un líder que se saca de su último Grupo activo, **Then** pierde el rol Líder de extensión.
9. **Given** el Pastor, **Then** ve el listado y el detalle sin acciones.

### User Story 5 - El Admin destraba (Priority: P2)

En el detalle de un Grupo el Admin ve integrantes y pedidos pendientes, y puede aceptar un pedido,
agregar una Persona directamente o quitar a un integrante. Los pedidos pendientes aparecen también en
la bandeja unificada de Solicitudes con su espera.

**Acceptance Scenarios**:

1. **Given** un pedido pendiente, **Then** aparece en la bandeja (tipo "Grupo de extensión") y su
   detalle permite aceptarlo o rechazarlo.
2. **Given** el Admin agrega una Persona directamente, **Then** queda integrante (si no tiene otro Grupo
   ni pedido pendiente) y recibe el aviso "Te sumaron al grupo {grupo}".
3. **Given** el Admin quita a una integrante (confirmación neutra), **Then** deja de serlo y puede buscar
   otro Grupo.

### Edge Cases

- Dos líderes aceptan el mismo pedido a la vez → solo uno surte efecto; el otro ve "ya fue resuelto".
- Dos pedidos simultáneos de la misma persona → uno solo (índice único).
- El último lugar del cupo se ocupa entre que la persona ve la lista y pide → puede pedir; el cupo se
  controla al aceptar.
- Persona sin teléfono → sin botón de WhatsApp.
- El servicio de mapas no responde → al buscar, mensaje "No pudimos ubicar tu dirección ahora. Probá con
  'Usar mi ubicación' o más tarde"; al guardar un Grupo, se guarda sin distancia.
- Un Grupo se inactiva después de aceptar → no puede pasar (hay que quitar antes).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El Admin MUST poder crear, editar, inactivar y reactivar Grupos de Extensión con nombre,
  líder(es) (1 o más Personas activas mayores de edad), días (1 o más, lunes a domingo), hora de inicio
  (pasos de 15 min), cupo opcional (≥ 1), edad mínima y máxima opcionales, y lugar: "En la iglesia"
  (con una Sede) o calle + número opcional + entre calle y calle + zona.
- **FR-002**: El género del Grupo MUST calcularse de sus líderes (femenino, masculino o mixto).
- **FR-003**: Al guardar, el sistema MUST convertir la dirección en coordenadas con un servicio
  configurable (primero Georef, si no Nominatim); si nada resuelve, el Grupo se guarda sin coordenadas.
- **FR-004**: Asignar a alguien como líder MUST otorgarle el rol `lider_extension` (con su registro de
  cambio de rol); nunca a un menor (D133). Al dejar de liderar Grupos activos, se le quita.
- **FR-005**: La persona MUST poder buscar Grupos por dirección escrita o por su ubicación, con filtro
  opcional por días; ve solo Grupos activos compatibles con su género y su edad, ordenados por distancia.
- **FR-006**: La búsqueda MUST NOT guardar ni registrar la dirección o la ubicación de la persona.
- **FR-007**: La búsqueda MUST NOT devolver la dirección exacta ni el contacto del líder; solo zona,
  nombre del líder, días, horario, distancia y si está completo.
- **FR-008**: Una persona MUST tener como máximo un pedido pendiente y una pertenencia activa.
- **FR-009**: La persona MUST poder retirar su pedido pendiente.
- **FR-010**: Cada líder MUST recibir un aviso por cada pedido nuevo; la persona MUST recibir un aviso al
  ser aceptada, rechazada o agregada por el Admin. Los avisos se emiten en la misma transacción.
- **FR-011**: El líder MUST ver en la web app sus pedidos e integrantes con contacto, y aceptar o
  rechazar (mensaje opcional, hasta 500 caracteres).
- **FR-012**: Aceptar MUST respetar el cupo (integrantes activos < cupo).
- **FR-013**: La integrante MUST ver la dirección exacta, días, horario, líderes con contacto y "Cómo
  llegar".
- **FR-014**: El Admin MUST poder aceptar/rechazar pedidos, agregar una Persona y quitar una integrante;
  los pedidos aparecen en la bandeja unificada (tipo `grupo_extension`).
- **FR-015**: Un Grupo con integrantes o pedidos pendientes MUST NOT poder inactivarse.
- **FR-016**: Todas las pantallas MUST cumplir los cuatro estados, tokens, D81, D150 y la checklist de
  `docs/15`.

### Key Entities

- **Grupo de Extensión**: nombre, días, hora de inicio, cupo, edad mín./máx., lugar (en la iglesia +
  Sede, o calle/número/entre calles/zona), coordenadas (opcionales), género calculado, activo.
- **Líder de Grupo de Extensión**: vínculo Grupo–Persona.
- **Solicitud de Grupo de Extensión**: el pedido de una Persona para sumarse. Estados: `pendiente`,
  `aceptada` (es la pertenencia), `rechazada`, `retirada`, `finalizada` (la quitaron). Guarda quién la
  creó (Admin, si la agregó él), quién la resolvió, cuándo, y el mensaje del líder.

## Success Criteria *(mandatory)*

- **SC-001**: Una persona encuentra un Grupo compatible y pide sumarse en menos de 2 minutos desde Mi
  camino, en el celular, sin escribirle al Admin.
- **SC-002**: El líder se entera del pedido sin intervención del Admin (aviso en el 100 % de los pedidos).
- **SC-003**: Ninguna búsqueda deja la dirección de la persona guardada ni en los registros.
- **SC-004**: La persona nunca ve un Grupo de otro género ni fuera de su rango de edad.
- **SC-005**: Las pantallas pasan axe sin violaciones en modo claro y oscuro.

## Assumptions

- La edad se calcula de la fecha de nacimiento del perfil, con la fecha de Argentina.
- Un Grupo sin rango de edad acepta cualquier edad (Pregunta 2).
- Un menor activo puede buscar Grupos y pedir sumarse (los que su rango de edad incluya).
- La distancia es en línea recta (no por calles), redondeada a 100 m.
- La persona no puede salir sola de su Grupo (Pregunta 3).
- El líder no es integrante de su propio Grupo; puede pedir sumarse a otro.
- Liderar varios Grupos está permitido; "Mi grupo" los muestra todos.
- El rol `lider_extension` lo maneja el sistema al asignar líderes: no aparece en el panel manual de
  roles de cargo (Pregunta 4).
- En CI el geocodificador está reemplazado por uno falso (sin red).

## Out of Scope

- Mapa embebido (solo enlace "Cómo llegar").
- Asistencia, material o encuentros de los Grupos de Extensión.
- Que la persona salga sola del Grupo; cambio de Grupo en un paso.
- Avisos al Admin (D201: los ve en la bandeja y en Pendientes).

## Preguntas para Echu

1. **Aviso al líder sin el nombre.** El catálogo de avisos no lleva datos personales (D197; los avisos
   van al mail y a los registros), así que el aviso dice "Tenés un pedido nuevo para {grupo}" y el
   nombre se ve al abrir el pedido. Recomendación: dejarlo así.
2. **Grupo sin rango de edad = cualquier edad** (incluidos menores). Recomendación: si los Grupos son
   solo para adultos, cargar edad mínima 18 en esos Grupos (no hace falta cambiar código).
3. **Salir del grupo.** Hoy la persona le pide al líder o al Admin. Recomendación: sumar "Dejar el
   grupo" en una próxima tanda si aparece la necesidad.
4. **Rol Líder de extensión.** Lo da y lo quita el sistema al asignar líderes; no está en el panel de
   roles de Personas. Recomendación: dejarlo así.
