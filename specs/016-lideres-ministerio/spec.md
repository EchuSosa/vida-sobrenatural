# Feature Specification: Líderes de Ministerio

**Feature Branch**: `016-lideres-ministerio`

**Created**: 2026-10-12

**Status**: Aprobada por Echu el 2026-10-12 (Preguntas 1 y 2: "sí", "sí, los ve"). Cubre solo la
parte que no depende de lo que falta averiguar con la iglesia (el líder por Ministerio); lo de los
turnos queda anotado en "Out of Scope" y en `docs/06-preguntas-abiertas.md` hasta tener respuestas.

**Input**: Pedido de Echu del 2026-10-12: "tenemos forma de saber quiénes son los integrantes de cada
ministerio y que desde el admin se puedan agregar personas a un ministerio con su área? cada domingo
tenemos ministerios que trabajan y se organizan (…) presentame una propuesta". Lo primero ya existe
(spec 009 y D243: lista de integrantes por área y "Agregar a alguien que ya sirve"). Sobre lo segundo,
Echu: "No tengo mucha información, creo que lo dejamos para cuando hable con la iglesia, pero sí le
asignaría un líder al menos a cada ministerio (…) que luego ya les preguntaré, como para no hacer nada
en vano."

**Lo que sabemos (Echu, 2026-10-12)**: cada Ministerio tiene **uno o varios líderes**; no sabemos cómo
organizan hoy quién sirve cada domingo. Los domingos hay una sola reunión. Bienvenida sirve los
domingos (puerta, seguridad, atención a quienes ministran); Ceremonial arma la Santa Cena, que es el
**segundo domingo del mes**; Vida en Acción tiene actividades entre semana (el comedor del Mercadito
es los sábados).

**Fuentes**: `specs/009-ministerios-celulas` (Ministerio, Célula, membresía = Postulación aprobada,
D170), `specs/014-grupos-extension` (líderes de un grupo asignados desde el backoffice, rol que da y
quita el sistema, D226), `specs/015-eleccion-ministerio` (D241–D243), `docs/03-roles-permisos.md`
(D132, D133), `docs/22-ministerios.md`, y D14, D81, D97, D142.

## Clarifications

### Session 2026-10-12

- Q: ¿El líder de un Ministerio decide algo sobre las Postulaciones y la elección? → A: **Todavía
  no.** D14 y D242 siguen: decide el Admin. Esta spec le da al líder **ver** a su equipo; revisar
  Postulaciones queda en el roadmap (Fase 2) para cuando se sepa cómo trabaja cada Ministerio.
- Q: ¿El líder tiene que ser miembro del Ministerio? → A: No se exige. Si no lo es, el Admin lo
  puede sumar como miembro con "Agregar a alguien que ya sirve" (D243), aparte.
- Q: ¿Se muestra el líder en la página pública de Ministerios? → A: No. La página pública sigue como
  dice `docs/22`: nombre y una línea. Dentro de la app, al postularse o elegir, tampoco por ahora.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El Admin asigna los líderes de un Ministerio (Priority: P1) ⭐

En el backoffice, en el detalle de un Ministerio, hay una sección **"Líderes"** con la lista vigente
(nombre, desde cuándo) y el botón **"Asignar líder"**: busca a una Persona activa (el mismo buscador
de "Agregar a alguien que ya sirve") y la asigna. Cada líder tiene **"Quitar"** (con confirmación):
el liderazgo se cierra con fecha, no se borra (Principio III). Puede haber varios líderes a la vez.

**Independent Test**: el Admin asigna a dos personas como líderes de Bienvenida; las dos aparecen en
la lista con la fecha de hoy y reciben el rol `lider_ministerio`; quita a una y deja de tener el rol.

**Acceptance Scenarios**:

1. **Given** un Ministerio activo, **When** el Admin asigna a una Persona activa y mayor de edad,
   **Then** aparece en "Líderes" con la fecha, se le otorga el rol `lider_ministerio` con su
   CambioDeRol (D133, como `lider_extension` en D226), y recibe el aviso "Sos líder de Bienvenida".
2. **Given** ya es líder de ese Ministerio, **When** se la intenta asignar de nuevo, **Then** 409
   `YA_ES_LIDER_DEL_MINISTERIO` y el backoffice lo dice.
3. **Given** es menor, **Then** no se puede asignar (D133): el buscador lo dice en texto.
4. **When** el Admin quita a un líder, **Then** el liderazgo queda con `hasta`, y si no lidera ningún
   otro Ministerio activo se le quita el rol `lider_ministerio` (con su CambioDeRol).
5. **Given** el Ministerio se inactiva o se manda a la papelera, **Then** sus líderes dejan de
   contar como vigentes para el rol (igual que los grupos de extensión); al reactivarlo vuelven.
6. El Perfil de la Persona en el backoffice muestra "Líder de: Bienvenida".

### User Story 2 - El líder ve a su equipo (Priority: P1) ⭐

En la web app (como el Discipulador y el líder de extensión, D142, D226), el líder tiene
**"Mi ministerio"** en el menú (o "Mis ministerios" si lidera más de uno): el Ministerio con sus
áreas y, en cada área, los integrantes vigentes con nombre, desde cuándo sirven y **contacto**
(celular con "Escribir por WhatsApp", email), igual que el líder de extensión ve a sus integrantes.
Quien no tiene área (Ministerio sin áreas, o membresía vieja) aparece en "Sin área". Arriba, el total
de integrantes y cuántos por área. Se puede buscar por nombre.

**Acceptance Scenarios**:

1. **Given** es líder vigente de Bienvenida, **When** entra a "Mi ministerio", **Then** ve las áreas
   de Bienvenida con sus integrantes y el contacto de cada uno.
2. **Given** lidera dos Ministerios, **Then** elige cuál ver; la URL lleva el id del Ministerio.
3. **Given** no es líder vigente de ese Ministerio (o dejó de serlo), **Then** 404 — la API autoriza
   contra la base (líder vigente de ESE Ministerio), no contra el rol del JWT (D226).
4. Un Ministerio sin integrantes: estado vacío que lo dice y sugiere hablar con el Admin.
5. Cuatro estados (`loading.tsx`, `error.tsx`, `not-found.tsx`), axe en claro y oscuro, `@celular`.

### User Story 3 - El Admin ve quién lidera qué (Priority: P2)

La lista de Ministerios del backoffice muestra, por Ministerio, sus líderes (o "Sin líder", en texto,
D81), para que de un vistazo se vea qué Ministerio quedó sin asignar.

### Edge Cases

- Un líder que pierde su cuenta de acceso (persona `pendiente_tutor` o sin email) no puede entrar,
  pero el liderazgo queda; es un caso de datos que el Admin ve en el Perfil.
- Una Persona dada de baja como miembro del Ministerio sigue pudiendo ser líder (no se exige la
  membresía); el Admin decide si la quita.
- El Pastor ve los líderes en el backoffice (`ministerios.ver`), no los gestiona.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Un Ministerio puede tener **cero, uno o varios líderes vigentes**. El liderazgo tiene
  `desde` y `hasta` (null = vigente); no se borra.
- **FR-002**: Asignar y quitar líderes requiere `ministerios.gestionar` (Admin). La Persona debe estar
  `activa` y ser mayor de edad (D133).
- **FR-003**: El rol **`lider_ministerio`** lo da y lo quita el sistema al asignar o quitar líderes
  (con CambioDeRol), como `lider_extension` (D226). No está en el panel manual de roles ni en
  `ROLES_DE_CARGO`. Permisos nuevos en el catálogo (D132): `mi_ministerio.ver` →
  `['lider_ministerio']`. No hay `mi_ministerio.gestionar` todavía.
- **FR-004**: La pertenencia (qué Ministerio puede ver cada líder) la resuelve el servicio contra la
  base, no el catálogo (límite escrito en D132).
- **FR-005**: El líder ve, de cada integrante vigente: nombre, apellido, área, desde cuándo, celular y
  email. **No ve** la motivación ni la disponibilidad de la Postulación, ni las notas de la elección
  (D240), ni las Postulaciones pendientes.
- **FR-006**: Aviso `ministerio.lider_asignado` (normal) a la persona al asignarla. Nada al quitarla
  (lo conversa el Admin).
- **FR-007**: Textos por `next-intl`; colores de tokens; estado en texto + ícono (D81).

### Key Entities

- **LiderMinisterio** (`lideres_ministerio`): `id`, `ministerioId`, `personaId`, `desde`, `hasta`,
  `asignadoPorId`, `quitadoPorId`. Índices por `ministerioId` y `personaId`; único parcial
  `(ministerioId, personaId) WHERE hasta IS NULL`.
- **Rol `lider_ministerio`** en `RolDeCargo`.

## Success Criteria *(mandatory)*

- **SC-001**: El Admin deja a todos los Ministerios activos con al menos un líder en una sola sesión
  del backoffice (un buscador por Ministerio, sin salir del detalle).
- **SC-002**: Un líder encuentra el contacto de cualquier integrante de su Ministerio en menos de
  tres toques desde el Inicio de la app.
- **SC-003**: Nadie que no sea líder vigente de ese Ministerio ni Admin/Pastor puede ver la lista
  (integración: líder de otro Ministerio → 404; sin rol → 403).

## Assumptions

- El líder es una Persona de la iglesia con cuenta en la app (como el Discipulador y el líder de
  extensión).
- "Agregar a alguien que ya sirve" (D243) sigue siendo del Admin; el líder no carga integrantes por
  ahora.

## Out of Scope (hasta hablar con la iglesia)

- **Turnos de servicio** ("qué domingo le toca a quién"). Propuesta de Claude del 2026-10-12, sin
  desarrollar: una **fecha de servicio** (cualquier día: domingo, sábado del Mercadito, un Evento)
  por Ministerio con sus **turnos** (persona + área + fecha); fechas recurrentes cargadas una vez
  ("todos los domingos", "el segundo domingo del mes" para la Santa Cena); una grilla fecha × área
  que arma y publica el líder; la persona ve "Este domingo servís en Bienvenida — Seguridad" en el
  Inicio con recordatorio el viernes; después, disponibilidad previa, "No puedo" con reemplazo, y
  rotación automática que no ponga a nadie el mismo día en sus dos Ministerios (D241). **Antes de
  especificarlo hay que preguntar** (en `docs/06-preguntas-abiertas.md`): cómo arman hoy el rol,
  cuánta gente necesita cada área por fecha, si van todos todos los domingos o se turnan, y quién
  lidera cada Ministerio. Piloto sugerido: Bienvenida.
- El líder revisando Postulaciones y confirmando la elección de su Ministerio (roadmap Fase 2, D14,
  D242).
- El líder agregando o dando de baja integrantes.
- Áreas que no están en `docs/22`: "atender a quienes ministran" y "limpieza" (Echu las mencionó
  para los domingos); se confirman con la iglesia y se cargan desde el catálogo, sin cambios de
  código.

## Preguntas para Echu (respondidas el 2026-10-12)

1. ¿Está bien que el líder vea el **celular y el email** de sus integrantes (como el líder de
   extensión, D226)? Recomendación: sí, es a quien tiene que llamar para organizar el domingo.
   **Echu: sí.**
2. ¿El Pastor también puede **asignar** líderes, o solo verlos? Recomendación: solo verlos (D132:
   `ministerios.gestionar` es del Admin). **Echu: solo los ve.**
