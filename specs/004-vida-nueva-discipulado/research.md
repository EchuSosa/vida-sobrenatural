# Research: Vida Nueva / Discipulado

Decisiones técnicas del plan. Lo que ya decidieron el spec 005 y `docs/` no se vuelve a abrir acá:
se cita. Cada entrada dice qué se eligió, por qué y qué se descartó.

## 1. Discipulados activos de una Persona (cierra H-127) — D137

- **Decisión:** se calculan en el momento. Un discipulado activo es un `Liderazgo` con
  `hasta = null` en un `Grupo` con `estado = en_curso`. No hay contador ni flag en `Persona`.
  La consulta vive en **una** función de la API (`discipuladosActivosDe(tx, personaId)`,
  `apps/api/src/discipulado/discipulados-activos.ts`) y la usan `quitarRol` (FR-009 del 005) y
  el listado de Personas (para que el panel de roles no ofrezca una quita que va a fallar, H-133).
- **Cómo entra en la guarda:** `puedeQuitarRol` (`packages/shared-types/src/permisos.ts`) recibe
  `discipuladosActivos` como dato de `persona`, igual que hoy recibe `adminSembrado`. Si la lista
  no está vacía, devuelve el motivo `DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS` (el código ya existe: el 005 lo dejó reservado para este caso), y la API lo
  rechaza nombrando esos discipulados. El motivo que fallaba cerrado
  (`DISCIPULADOR_SIN_VERIFICACION_DE_DISCIPULADOS_ACTIVOS`) **se elimina** del catálogo de errores:
  dejarlo sería un código muerto que alguien podría volver a usar.
- **Carrera:** `quitarRol` ya bloquea la fila de la Persona (H-142). Aprobar una Solicitud y
  reasignar bloquean **la misma fila** (la del Discipulador que reciben) antes de crear el
  Liderazgo, y verifican que siga teniendo el rol `discipulador` y que siga disponible. Las dos
  operaciones quedan serializadas por la base, sin un mecanismo nuevo.
- **Descartado:** un contador `Persona.discipuladosActivos`. Es una segunda fuente de verdad
  (Principio XI) que cada operación que abre o cierra un Liderazgo tendría que mantener.
  Confirmado por Echu el 2026-09-27.

## 2. Solicitud de Discipulado: una tabla por tipo, forma base común

- **Decisión:** modelo `SolicitudDiscipulado` propio, con la forma base de `docs/04` (`personaId`,
  `estado`, fecha, `revisadoPorId`, `creadoPorId`) más sus campos propios (`grupoId` al aprobarse).
  La bandeja genérica (FR-025) es un **tipo compartido de listado** (`SolicitudResumen` en
  `packages/shared-types`, con un `tipo`) que el endpoint de Discipulado produce. Cuando exista un
  segundo tipo, el listado une las dos fuentes. La resolución queda específica (FR-025a).
- **Por qué:** es lo que `docs/04-dominio-entidades.md` ya fija (Solicitud de Bautismo, de
  Discipulado, Postulación e Inscripción a Evento son entidades distintas con una forma común), y
  lo que la clarificación del 23/9 pidió: genérica en el listado, específica en la resolución.
- **Descartado:** una tabla `Solicitud` única con `tipo` y campos opcionales por tipo. Es la
  abstracción armada sobre un solo caso real que FR-025a prohíbe.
- **No duplicados (FR-001, regla de `docs/04`):** índice único parcial
  `UNIQUE (personaId) WHERE estado = 'pendiente'`, escrito en SQL en la migración, como los CHECK
  del spec 005 (H-140). Así la regla la garantiza la base, además del servicio.

## 3. Liderazgo con vigencia (reasignación, FR-030)

- **Decisión:** `Liderazgo` tiene `desde` y `hasta` (nullable). Reasignar cierra el vigente
  (`hasta = now`, `cerradoPorId`) y abre uno nuevo en la misma transacción. Nunca se borra ni se
  sobrescribe: el historial de quién lideró el Grupo es el registro que FR-030 pide.
- **Un solo Liderazgo vigente por Grupo de Vida Nueva individual:** lo sostiene el servicio, no un
  índice. `docs/04` dice que un Grupo puede tener varios líderes (Vida de Servicio, la variante
  grupal), así que un índice único sobre `grupoId` rompería el modelo que viene.
- **Acceso por registro (Principio V):** "¿es tu discipulado?" = existe un Liderazgo **vigente**
  del usuario sobre ese Grupo. Un Discipulador reasignado pierde el acceso en el acto.

## 4. Finalización y su rechazo (FR-019, FR-019a)

- **Decisión:** campos en `Grupo`, sin una entidad aparte: `propuestaFinalizacionEn`,
  `propuestaFinalizacionPorId`, `finalizacionRechazadaEn`, `finalizacionRechazadaMotivo`,
  `finalizadoEn`, `finalizadoPorId`. Hay una propuesta vigente si `propuestaFinalizacionEn` no es
  null. Rechazar la limpia y guarda la fecha y el motivo del rechazo. Confirmar pasa el Grupo a
  `finalizado` y **todas** las Inscripciones `activa` a `completada` (mecanismo común de `docs/04`),
  en una transacción.
- **Por qué:** el spec pide que el Discipulador vea *el* último rechazo, no un historial de
  rechazos. Una tabla `PropuestaFinalizacion` agregaría una entidad sin requisito que la use
  (Principio IV).
- **`apto_ministerio` no se toca** (FR-022): el mecanismo común lo activa solo para Vida de
  Servicio, que no existe todavía. No se escribe ningún condicional para eso: no hay campo que
  activar.

## 5. Encuentro: capítulos como texto corto

- **Decisión:** `Encuentro.capitulos` es un texto corto obligatorio (hasta 200 caracteres,
  por ejemplo "1 y 2" o "3 a 5"), `notas` es texto opcional, y `fecha` es una fecha civil
  (`@db.Date`).
- **Por qué:** la cantidad de capítulos del libro físico no está en ningún documento del repo, y
  el spec no pide calcular "todos los capítulos vistos": la finalización la propone el
  Discipulador con su criterio (FR-019). Un texto alcanza para la vista administrativa ("qué
  capítulos se vieron", D134).
- **Descartado:** `Int[]` con validación contra el total del libro. Exige un dato que no tenemos y
  una regla que el spec no pide.
- **Edición de Encuentros:** fuera de alcance, ningún requisito la pide. Si se carga mal, hoy no
  se corrige desde la app (queda anotado en el cierre como decisión para Echu).

## 6. Asistencia en el 1 a 1 (FR-013, FR-013a)

- **Decisión:** al crear un Encuentro, la API crea en la misma transacción una `Asistencia` por
  cada Inscripción `activa` del Grupo. En el 1 a 1 es una sola, y llega en el mismo cuerpo del
  pedido como `presente: boolean`, con `true` por defecto. La pantalla lo muestra como una casilla
  "Faltó" sin marcar: un solo gesto para el caso raro.
- `@@unique([encuentroId, inscripcionId])`.

## 7. Disponibilidad y "hoy"

- **Decisión:** `Persona.disponibleDiscipulado Boolean @default(false)`. `BloqueoDisponibilidad`
  con `desde` y `hasta` como fechas civiles (`@db.Date`), más un CHECK `hasta >= desde` en la base
  y la misma validación en el servicio (FR-017, error por campo).
- **"Hoy"** es la fecha civil en `America/Argentina/Buenos_Aires`, calculada en **un** lugar de
  `packages/shared-types`, porque la usan la API (listado de disponibles) y el backoffice (qué
  bloqueo está vigente). Mismo criterio de fecha civil que `formato.ts` ya usa para mostrar
  fechas sin hora.
- **Vigente** = `desde <= hoy <= hasta` (los dos días inclusive).
- **Superposición:** se permite (Assumption del spec). El listado de FR-006 excluye a quien tenga
  **algún** bloqueo vigente.
- **Por qué `false` por defecto:** que el Admin le otorgue el rol a alguien no significa que esa
  persona ya esté en condiciones de tomar un discipulado. El toggle lo prende el Discipulador
  (FR-015). Es una decisión chica que queda anotada en el cierre por si Echu la prefiere al revés.
- **Borrar un bloqueo:** ningún requisito lo pide. No se construye (Principio IV); queda anotado
  en el cierre.

## 8. Solicitud en nombre de otra Persona (FR-002, D97)

- **Hallazgo:** `Persona.email` es obligatorio y único en el schema, y el alta por Admin del
  Flujo 12 (D97) todavía no está construida (`origenAlta` solo produce `autorregistro`). Hoy
  **no existe** en la base una Persona "sin acceso a la app".
- **Decisión:** el endpoint de "crear en nombre de" no exige que la Persona no tenga acceso,
  porque el sistema no tiene cómo saberlo. Deja registrado `creadoPorId`, y la Solicitud es la
  misma que si la hubiera pedido ella: si tiene acceso, la ve en Mi camino (FR-026). Cuando exista
  el alta de D97, esa Persona cae en el mismo camino sin cambios.
- **Permiso:** `solicitudes.crear_en_nombre` para `admin` y `discipulador`. Para elegir a la
  Persona se reutiliza `GET /personas/buscar`, que esos dos roles ya tienen (`personas.buscar`).

## 9. Permisos nuevos (D132)

Se agregan al catálogo (`packages/shared-types/src/permisos.ts`), sin roles literales en ningún
otro archivo (FR-013 del 005):

| Permiso | Roles | Para qué |
|---|---|---|
| `solicitudes.aprobar` | `admin` | Aprobar, con elección de Discipulador, o rechazar (FR-003 a FR-008). También da el listado de Discipuladores disponibles. |
| `solicitudes.crear_en_nombre` | `admin`, `discipulador` | FR-002. |
| `grupos.gestionar` | `admin` | Confirmar o rechazar una finalización y reasignar (FR-019, FR-019a, FR-030). |
| `mis_discipulados.gestionar` | `discipulador` | Registrar Encuentros y proponer la finalización (FR-009, FR-019). |
| `mi_disponibilidad.gestionar` | `discipulador` | Toggle y bloqueos (FR-015 a FR-017). |

`solicitudes.ver` y `grupos.ver` ya existen (`admin`, `pastor`), y el Pastor queda de solo lectura
(D64). `mis_discipulados.ver` y `mi_disponibilidad.ver` ya existen (`discipulador`), y D134 recorta
esas pantallas por identidad. El permiso responde "¿puede hacer esto?"; "¿es **su**
discipulado?" lo responde el servicio (Principio V).

Pedir Vida Nueva para uno mismo (FR-001) y ver el propio estado (FR-026 a FR-028) **no** llevan
permiso del catálogo: son de cualquier Persona con sesión y `estado = activa`, como
`/personas/me`. El catálogo es de roles de cargo, y `miembro_registrado` es un rol de estado.

## 10. Dónde vive cada pantalla (D134, `docs/14-navegacion.md`)

| Pantalla | Ruta | Hoy |
|---|---|---|
| Mi camino (pedir y ver el estado) | `apps/web` `/mi-camino` | Placeholder `EstadoVacio` |
| Bandeja de Solicitudes + resolver | `apps/backoffice` `/solicitudes` | Placeholder |
| Vista administrativa de discipulados | `apps/backoffice` `/grupos` y `/grupos/[id]` | Placeholder (solo `/grupos`) |
| Mis discipulados + detalle | `apps/backoffice` `/mis-discipulados` y `/mis-discipulados/[id]` | Placeholder (solo la lista) |
| Mi disponibilidad | `apps/backoffice` `/mi-disponibilidad` | Placeholder |
| Panel de roles (quitar `discipulador`) | `apps/backoffice` `/personas` | Construido en el 005, cambia el rechazo |

Las rutas `[id]` nuevas entran a `NAV_BACKOFFICE` con `enMenu: false` (patrón de `/sedes/[id]`),
y la regla `pantalla-declara-permiso` las exige.

## 11. Menores de edad que piden Vida Nueva

- **Hallazgo:** el spec no dice si una Persona menor de edad (activada por el Flujo 7) puede pedir
  Vida Nueva. El Discipulador vería sus datos de contacto (FR-011), que es justo la exposición que
  D133 cuida del lado de los roles.
- **Decisión del plan:** no se agrega ninguna restricción que el spec no pida. Queda como
  **pregunta para Echu** en el cierre, porque cambiaría FR-001 y no es una decisión técnica.
