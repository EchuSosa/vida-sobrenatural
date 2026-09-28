# Data Model: Vida Nueva / Discipulado

Modelos Prisma nuevos en `apps/api/prisma/schema.prisma`, más una extensión de `Persona`. Los
nombres son los de `docs/04-dominio-entidades.md` (Principio II). Todo query usa `select`
explícito, los listados se paginan con `Pagina<T>` y cada FK y cada filtro frecuente lleva índice
(Restricciones Técnicas, H-42).

## Persona (extensión)

| Campo | Tipo | Notas |
|---|---|---|
| `disponibleDiscipulado` | `Boolean @default(false)` | FR-015. Solo lo cambia el propio Discipulador. El sistema nunca lo cambia solo, ni al finalizar un discipulado (research #7). |

Relaciones inversas nuevas (las exige Prisma): `solicitudesDiscipulado`, `inscripciones`,
`liderazgos`, `bloqueosDisponibilidad`.

## Curso (nuevo, dato de referencia)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `nombre` | `String` | "Vida Nueva". |
| `categoria` | `enum CategoriaCurso { vida_nueva }` | Clave estable (Principio IX). Vida de Servicio agrega su valor cuando exista su spec. |
| `tipo` | `enum TipoCurso { individual, grupal }` | D44. Este spec solo usa `individual` (FR-014). `grupal` se modela porque es la razón de que Grupo–Inscripción no sea uno a uno. |
| `modalidad` | `enum ModalidadCurso { seguimiento_por_encuentros }` | `liberacion_programada` entra con Vida de Servicio (Principio IV). |
| `activo` | `Boolean @default(true)` | Soft delete (Principio III). No hay pantalla que lo cambie en este spec. |

El seed mínimo (`db:seed`, idempotente) crea **un** Curso: Vida Nueva, `vida_nueva`, `individual`,
`seguimiento_por_encuentros`. La API lo busca por `(categoria, tipo)`, nunca por id fijo.
`@@unique([categoria, tipo])`.

## SolicitudDiscipulado (nuevo)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `personaId` | `String` → `Persona` | La interesada. Indexado. |
| `estado` | `enum EstadoSolicitud { pendiente, aprobada, rechazada }` | Forma base de `docs/04`. |
| `creadoPorId` | `String?` | `null` si la pidió la propia Persona, o el id del Admin/Discipulador que la creó en su nombre (FR-002, D97). Referencia lógica, mismo criterio que `Persona.altaPor`. |
| `revisadoPorId` | `String?` | El Admin que aprobó o rechazó. |
| `revisadaEn` | `DateTime?` | Junto con `estado` y `revisadoPorId`, es la costura de FR-023/SC-006: todo lo que un aviso futuro necesita (a quién, qué cambió, cuándo). |
| `grupoId` | `String? @unique` → `Grupo` | Solo al aprobarse. |
| `createdAt` | `DateTime @default(now())` | La "fecha" de la forma base. |

- **No duplicados:** índice único parcial `(personaId) WHERE estado = 'pendiente'`, en SQL dentro
  de la migración (research #2).
- **Índices:** `@@index([personaId])`, `@@index([estado, createdAt])` (orden y filtro de la bandeja).
- **Transiciones:** `pendiente → aprobada` (crea Grupo, Inscripción y Liderazgo) y
  `pendiente → rechazada`. Ninguna otra. Rechazada no bloquea una Solicitud nueva (FR-008).

## Grupo (nuevo)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `cursoId` | `String` → `Curso` | Indexado. |
| `sedeId` | `String` → `Sede` | La de la Persona inscripta al aprobarse (`docs/04`: de la Sede cuelgan los Grupos). Indexado. |
| `estado` | `enum EstadoGrupo { en_curso, finalizado }` | |
| `propuestaFinalizacionEn` | `DateTime?` | Hay propuesta vigente si no es null (research #4). |
| `propuestaFinalizacionPorId` | `String?` | El Discipulador que la propuso. |
| `finalizacionRechazadaEn` | `DateTime?` | El último rechazo (FR-019a). |
| `finalizacionRechazadaMotivo` | `String?` | Opcional, hasta 500 caracteres. |
| `finalizadoEn` | `DateTime?` | |
| `finalizadoPorId` | `String?` | El Admin que confirmó. |
| `createdAt` | `DateTime @default(now())` | "Desde cuándo" de la vista administrativa. |

- **Índices:** `@@index([cursoId])`, `@@index([sedeId])`, `@@index([estado])`.
- **Sin borrado:** ninguna operación de este spec desactiva un Grupo. Un Grupo `finalizado` es el
  registro de un proceso terminado (Principio III).

**Transiciones del Grupo:**

```text
en_curso ──proponer (Discipulador vigente)──▶ en_curso + propuesta
en_curso + propuesta ──rechazar (Admin)──▶ en_curso (propuesta limpia, rechazo guardado)
en_curso + propuesta ──confirmar (Admin)──▶ finalizado  (Inscripciones activas → completada)
en_curso ──confirmar sin propuesta──▶ ✗ FINALIZACION_NO_PROPUESTA (FR-020)
en_curso ──reasignar (Admin)──▶ en_curso (la propuesta vigente, si hay, se conserva)
```

## Inscripcion (nuevo)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `personaId` | `String` → `Persona` | Indexado. |
| `grupoId` | `String` → `Grupo` | Indexado. **No único** (FR-014, D44): un Grupo admite varias Inscripciones aunque en el 1 a 1 tenga una. |
| `estado` | `enum EstadoInscripcion { activa, completada, dada_de_baja, abandono }` | Los cuatro de `docs/04`. Este spec solo escribe `activa` y `completada`, y `dada_de_baja`/`abandono` quedan modelados sin flujo. |
| `createdAt` | `DateTime @default(now())` | |

- `@@unique([personaId, grupoId])`.
- **"Está cursando o completó Vida Nueva"** (FR-001, escenario 4 de la Historia 1) = tiene una
  Inscripción `activa` o `completada` en un Grupo cuyo Curso es de categoría `vida_nueva`. Es una
  función de la API, usada al crear y al aprobar una Solicitud.

## Liderazgo (nuevo)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `personaId` | `String` → `Persona` | El Discipulador. |
| `grupoId` | `String` → `Grupo` | |
| `desde` | `DateTime @default(now())` | |
| `hasta` | `DateTime?` | `null` = vigente. Lo cierra una reasignación (FR-030). |
| `asignadoPorId` | `String` | El Admin que aprobó o reasignó. |
| `cerradoPorId` | `String?` | El Admin que reasignó. |

- **Índices:** `@@index([personaId, hasta])` (discipulados activos de una Persona, D137, y "mis
  discipulados"), `@@index([grupoId, hasta])` (el Discipulador vigente de un Grupo).
- **Discipulado activo (D137):** `Liderazgo.hasta IS NULL` y `Grupo.estado = en_curso`. Lo calcula
  solo `discipuladosActivosDe()`.
- **Un vigente por Grupo en Vida Nueva individual:** lo sostiene el servicio (research #3).

## Encuentro (nuevo)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `grupoId` | `String` → `Grupo` | Indexado. |
| `fecha` | `DateTime @db.Date` | Fecha civil. No puede ser futura (fecha civil de hoy, research #7). |
| `capitulos` | `String` | Obligatorio, 1 a 200 caracteres (research #5). |
| `notas` | `String?` | Opcional, hasta 2000 caracteres. **Solo las ve el Discipulador vigente** (D134, FR-029). Ningún `select` de la vista administrativa ni de Mi camino lo incluye. |
| `registradoPorId` | `String` | El Discipulador que lo cargó. |
| `createdAt` | `DateTime @default(now())` | |

- `@@index([grupoId, fecha])` (historial en orden, FR-010).
- **Notas y reasignación:** las notas son del Grupo, así que el Discipulador nuevo ve las del
  anterior. Es lo que pide el escenario 8 de la Historia 3 ("con todos sus Encuentros
  anteriores") y D134 no lo contradice: sigue siendo "solo el Discipulador" del discipulado.

## Asistencia (nuevo)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `encuentroId` | `String` → `Encuentro` | |
| `inscripcionId` | `String` → `Inscripcion` | Indexado. |
| `presente` | `Boolean` | FR-013. En el 1 a 1 llega `true` por defecto (FR-013a). |

- `@@unique([encuentroId, inscripcionId])`.

## BloqueoDisponibilidad (nuevo)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `personaId` | `String` → `Persona` | El Discipulador. |
| `desde` | `DateTime @db.Date` | |
| `hasta` | `DateTime @db.Date` | CHECK `hasta >= desde` en la migración (FR-017). |
| `createdAt` | `DateTime @default(now())` | |

- `@@index([personaId, hasta])` (bloqueos vigentes o futuros de una Persona).
- Pueden superponerse (Assumption del spec).
- Sin borrado: no hay requisito (research #7).

## Listado de Discipuladores disponibles (FR-006, consulta, no entidad)

Personas con `'discipulador' = ANY(rol)` y `activo = true` y `disponibleDiscipulado = true`, y sin
ningún `BloqueoDisponibilidad` con `desde <= hoy <= hasta`. La mayoría de edad **no** se filtra
acá: la garantiza el otorgamiento del rol (FR-011 del 005). No se sugiere ni se ordena por carga
(D25): orden alfabético por apellido y nombre.

## Cambios a lo que dejó el spec 005

- `puedeQuitarRol(rol, persona, autorId)`: `persona` suma
  `discipuladosActivos: readonly DiscipuladoActivo[]`
  (`{ grupoId, persona: { nombre, apellido } }`). La rama de `discipulador` pasa de "siempre no" a
  "no si la lista no está vacía", con motivo `DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS`.
- `error-code.ts`: sale `DISCIPULADOR_SIN_VERIFICACION_DE_DISCIPULADOS_ACTIVOS`. `DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS`
  ya existe (el 005 lo reservó para FR-009) y pasa a ser uno de los `MotivoNoQuitable`.
- Errores de campo: van bajo `VALIDACION` con su código de campo (`errors: [{ campo, code }]`,
  el mismo mecanismo que `HORARIOS_INVALIDO`), no como códigos nuevos del catálogo.
- `RolesService.quitarRol`: consulta `discipuladosActivosDe(tx, personaId)` con la fila ya
  bloqueada y se la pasa a la guarda. El rechazo 409 lleva la lista (ver
  `contracts/discipulado-api.md`).
- El listado de Personas (`GET /personas`) calcula `discipuladosActivos` de la página en **una**
  consulta agrupada, no una por fila, para exponer `quitar.discipulador` correcto.
