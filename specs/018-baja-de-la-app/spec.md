# Feature Specification: Baja de la app y borrado de datos personales

**Feature Branch**: `018-baja-de-la-app`

**Created**: 2026-11-03

**Status**: Decisiones tomadas por Echu el 2026-11-03 (D261–D264). Va **antes de publicar** con
personas reales (pedido de Echu: "Spec propia para la baja de la app, con borrado de datos
personales. Va antes de publicar").

**Input**: el caso borde que quedó afuera de la spec 017 ("una persona con turno se da de baja de la
app") y el pendiente de `docs/06` "Derecho de supresión / baja de datos" (Ley 25.326).

**Fuentes**: `docs/06-preguntas-abiertas.md` (privacidad), `docs/13-requisitos-no-funcionales.md`
§3, `docs/04-dominio-entidades.md` (Persona y todo lo que cuelga de ella), D5, D37, D97, D145,
D170, D244, D258, y la spec 017 (`liberarTurnosFuturos`).

> **No reemplaza una consulta legal.** La Política de Privacidad y la inscripción de la base
> (`docs/06`) siguen pendientes. Esta spec da la herramienta técnica para cumplir un pedido de
> supresión dentro del plazo de la ley (5 días hábiles, art. 16 de la Ley 25.326), sin depender de
> que alguien borre filas a mano.

## Decisiones (Echu, 2026-11-03)

| # | Decisión |
|---|---|
| D261 | **Se anonimiza, no se borra la fila.** La Persona queda como "Persona dada de baja": se borran nombre, apellido, email, DNI, teléfono, dirección, fecha de nacimiento, foto, datos familiares, y los textos libres y archivos que escribió o subió. Quedan, sin nombre, los registros que sostienen a otros (turnos pasados, grupos, inscripciones y pagos para los conteos), para que no se rompan historiales ajenos. |
| D262 | **En el momento.** Con una confirmación que dice que no se puede deshacer. No hay período de gracia: no queda nada pendiente de borrar. |
| D263 | **La pide la persona o el Admin.** La persona desde su Perfil; el Admin en su nombre desde el backoffice (pedido por WhatsApp o en persona; para un menor, a pedido del tutor). |
| D264 | **Con cargos vigentes, se cierran y se avisa.** Liderazgos de Ministerio, de Grupo de Extensión y de Grupo; turnos futuros (como la baja de un integrante, spec 017); discipulados y propuestas en curso. A quien corresponde le llega el aviso. **Solo frena si es el único Admin.** |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - La persona se da de baja desde su Perfil (Priority: P1) ⭐

En el Perfil de la web, al final, **"Darme de baja de la app"**. Lleva a una pantalla que explica en
lenguaje simple qué pasa: "Se borran tu nombre, tus datos de contacto y lo que escribiste. No se
puede deshacer. Si más adelante querés volver, te registrás de nuevo." Para confirmar, escribe la
palabra **BAJA** y toca "Darme de baja". Sale de la sesión y ve una pantalla final de despedida.

**Independent Test**: una persona con un turno publicado se da de baja; no puede volver a entrar
con ese email (si lo intenta, va al registro como alguien nuevo), su nombre no aparece en ninguna
pantalla y la líder recibe el aviso de que falta cubrir ese turno.

**Acceptance Scenarios**:

1. **When** confirma, **Then** en una sola transacción se anonimizan sus datos (FR-002), se cierran
   sus cargos con aviso (FR-005), sus sesiones dejan de valer (D258: la API ve `activo = false`) y se
   borran sus archivos (FR-004).
2. **When** escribe otra cosa que no es BAJA, **Then** el botón no envía y el campo dice cómo
   corregirlo (H-50).
3. **Given** es el único Admin, **Then** la pantalla le dice que primero tiene que haber otro Admin y
   la API responde 409 `ULTIMO_ADMIN`.
4. Errores: si la API falla, el aviso dice qué pasó y no se borró nada (todo o nada); doble toque en
   "Darme de baja" hace una sola baja.

### User Story 2 - El Admin da de baja a alguien en su nombre (Priority: P1) ⭐

En el backoffice, en el Perfil de una Persona, **"Dar de baja de la app"** (destructivo, rojo +
ícono, D151), con el mismo texto de qué se borra, la palabra BAJA y un motivo interno opcional
("lo pidió por WhatsApp", "a pedido del tutor"). Vale también para Personas sin email (dadas de
alta por el Admin, D145) y para menores.

**Acceptance Scenarios**:

1. **When** confirma, **Then** pasa lo mismo que en US1 y vuelve al listado con "Listo: se dio de
   baja a la persona". En el listado ya no aparece.
2. **Given** la Persona ya estaba dada de baja, **Then** 404 (no hay a quién dar de baja).
3. El Pastor no ve el botón y la API responde 403 (`personas.baja` es solo del Admin, D132).
4. Errores: API caída → aviso con "Reintentar"; doble toque → una sola baja.

### User Story 3 - Lo que queda se ve sin nombre (Priority: P1)

Donde antes aparecía la persona en un registro de otro (un turno pasado en la grilla, un
discipulado cerrado, un pago verificado en Pagos, un grupo de Vida de Servicio terminado), se ve
**"Persona dada de baja"**, sin foto ni contacto, y no se puede abrir su Perfil.

**Acceptance Scenarios**:

1. **Given** sirvió en turnos pasados, **Then** la grilla y los conteos siguen igual, con "Persona
   dada de baja" donde estaba su nombre.
2. **Given** buscan su nombre, email, teléfono o DNI en el backoffice, **Then** no aparece.
3. **Given** el registro de auditoría de roles (CambioDeRol), **Then** las filas quedan, sin nombre.

### Edge Cases

- **Una persona que se registra de nuevo con el mismo email**: es una Persona nueva, sin historial
  (el email de la dada de baja quedó en null, así que no choca con el único).
- **Un menor**: la baja la pide el tutor y la hace el Admin (US2). Si tenía relación familiar
  cargada, se borra la relación; la Persona del tutor no cambia.
- **Respuestas sensibles de Eventos** (spec 011): se borran en el momento, sin esperar los 30 días.
- **Notas privadas de la elección de ministerio** (spec 015) y motivos que escribieron otros sobre
  ella (rechazos, bajas, "No puedo ir"): se borran — son datos sobre la persona.
- **Lo que la persona escribió sobre otros** (notas de Encuentros como Discipuladora, motivos de
  rechazo como Admin): queda, porque es del registro del otro; solo se le quita el autor.
- **Comentarios de la app** ("Contanos qué te parece") con su nombre o contacto: se borran texto y
  contacto.
- **Avisos**: se borran sus entregas; los avisos manuales que creó como Admin quedan sin autor.
- **Códigos de ingreso** pedidos con su email: se borran.
- **Logs y Sentry**: no tienen datos personales (D101), así que no hay nada que borrar ahí; el log de
  la baja lleva solo el id y quién la hizo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La baja MUST poder pedirla la persona (`POST /personas/me/baja`) o el Admin
  (`POST /personas/:id/baja`, permiso nuevo `personas.baja` → `['admin']`), con la palabra de
  confirmación `BAJA` validada en la API (error por campo `confirmacion`).
- **FR-002**: La baja MUST anonimizar la Persona en el mismo momento (D261, D262): `nombre` = "Persona",
  `apellido` = "dada de baja", y `email`, `dni`, `fotoUrl`, `profesionDetalle` en null; `telefono`,
  `direccion` vacíos; `fechaNacimiento` reemplazada por la fecha fija **1900-01-01** (ni la edad
  queda); `activo = false`,
  `estado` sin cambio, y la marca `dadaDeBajaEn` (+ `dadaDeBajaPorId`).
- **FR-003**: La baja MUST borrar los textos libres que la identifican o hablan de ella (lista en
  `data-model.md`): comentarios de sus pedidos, motivos sobre ella, notas privadas de su elección,
  respuestas de Eventos, motivo de "No puedo ir", relaciones familiares, franjas de agenda y
  bloqueos, suscripciones y códigos de ingreso.
- **FR-004**: La baja MUST borrar sus archivos privados (comprobantes de Pago) del `StorageService`.
  Si el borrado de un archivo falla, la baja igual se completa y el archivo queda en una lista de
  pendientes que una tarea reintenta (nunca se deja el dato en la base por un archivo).
- **FR-005**: La baja MUST cerrar sus cargos vigentes (D264), en la misma transacción, con los avisos
  que ya existen: liderazgo de Ministerio (D244), de Grupo de Extensión, de Grupo de Vida de Servicio,
  turnos futuros (`liberarTurnosFuturos`), membresías (Postulaciones aprobadas → inactivas por baja),
  discipulados en curso como discípula o como Discipuladora (al Admin, en Pendientes) y propuestas
  pendientes (retiradas). Sus roles de cargo se quitan con su CambioDeRol.
- **FR-006**: La baja MUST frenar con 409 `ULTIMO_ADMIN` si la persona es la única con rol `admin`
  activa.
- **FR-007**: Donde se muestra una Persona dada de baja, MUST verse "Persona dada de baja", sin foto
  ni contacto ni enlace a su Perfil; y no MUST aparecer en búsquedas ni listados de Personas.
- **FR-008**: Todo MUST ser una sola transacción (todo o nada), salvo el borrado físico de archivos
  (FR-004), que va después de confirmar la transacción.
- **FR-009**: El log de la baja MUST llevar solo `personaId`, quién la hizo y cuántas cosas se
  cerraron (Principio X); el motivo interno del Admin queda en la base, no en el log.
- **FR-010**: La API MUST responder 401 a cualquier sesión de una Persona dada de baja (ya lo hace
  D258 por `activo = false`).

### Key Entities

- **Persona**: suma `dadaDeBajaEn`, `dadaDeBajaPorId`, `motivoBajaInterno` (solo Admin, hasta 200).
- **ArchivoPendienteDeBorrar** (nuevo, chico): ruta y fecha, para el reintento de FR-004.

## Success Criteria *(mandatory)*

- **SC-001**: Después de una baja, una búsqueda en la base del nombre, email, teléfono y DNI viejos
  no encuentra nada (test de integración que lo recorre tabla por tabla).
- **SC-002**: Ninguna pantalla de las dos apps muestra el nombre de la persona dada de baja (e2e).
- **SC-003**: Los historiales de otros (grupos, turnos, pagos verificados) siguen contando igual
  antes y después de la baja.
- **SC-004**: Una baja con la API caída a mitad de camino no deja datos a medias (integración que
  fuerza el error dentro de la transacción).

## Out of Scope

- La Política de Privacidad y los términos (`docs/06`): textos legales, no de producto.
- Exportar los datos antes de la baja (derecho de acceso): otra spec si la iglesia la pide.
- Inactivar sin borrar ("pausar la cuenta"): no se pidió.
