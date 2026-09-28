# Data Model: Vida Nueva / Discipulado

Modelos Prisma nuevos en `apps/api/prisma/schema.prisma`, más una extensión de `Persona`. Los
nombres son los de `docs/04-dominio-entidades.md` (Principio II). Todo query usa `select`
explícito, los listados se paginan con `Pagina<T>` y cada FK y cada filtro frecuente lleva índice
(Restricciones Técnicas, H-42). **Actualizado el 2026-09-27** con la agenda, la propuesta y
aceptación, los Grupos de varias Personas y la baja.

## Persona (extensión)

| Campo | Tipo | Notas |
|---|---|---|
| `disponibleDiscipulado` | `Boolean @default(true)` | FR-015. **Arranca prendido**: la puerta es la agenda (FR-006). Solo lo cambia el propio Discipulador; el sistema nunca. |
| `maxPersonasPorGrupo` | `Int @default(1)` | FR-045. CHECK `1 <= x <= 6` en la migración; el 6 es `MAX_PERSONAS_POR_GRUPO_VIDA_NUEVA` de `shared-types`. Bajarlo no toca los Grupos existentes. |

Relaciones inversas nuevas: `solicitudesDiscipulado`, `inscripciones`, `liderazgos`,
`franjasAgenda`, `bloqueosDisponibilidad`, `propuestasComoDiscipulador`.

## Curso (nuevo, dato de referencia)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `nombre` | `String` | "Vida Nueva". |
| `categoria` | `enum CategoriaCurso { vida_nueva }` | Clave estable (Principio IX). |
| `tipo` | `enum TipoCurso { individual, grupal }` | D44. Este spec solo usa `individual` (FR-014): nombra la variante, no la cantidad de Personas por Grupo. |
| `modalidad` | `enum ModalidadCurso { seguimiento_por_encuentros }` | `liberacion_programada` entra con Vida de Servicio. |
| `activo` | `Boolean @default(true)` | Soft delete (Principio III). |

Seed idempotente: un Curso `(vida_nueva, individual)`. `@@unique([categoria, tipo])`.

## FranjaAgenda (nuevo — la agenda del Discipulador, FR-031)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `personaId` | `String` → `Persona` | El Discipulador. |
| `diaSemana` | `Int` | `0` domingo … `6` sábado. CHECK `0..6`. La etiqueta la pone next-intl (D84). |
| `inicio` | `Int` | Minutos desde las 0:00 (`0..1439`). |
| `fin` | `Int` | Minutos (`1..1440`). CHECK `fin > inicio` (FR-017). |
| `eliminadaEn` | `DateTime?` | Borrado lógico (FR-040, Principio III). Toda consulta filtra `IS NULL`. |
| `createdAt` | `DateTime @default(now())` | |

- `@@index([personaId, eliminadaEn])`. Varias por día; pueden superponerse.
- **Tiene agenda** (condición de FR-006) = al menos una franja con `eliminadaEn IS NULL`.

## FranjaSolicitud (nuevo — los horarios de la Persona, FR-032)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `solicitudId` | `String` → `SolicitudDiscipulado` | Indexado. |
| `diaSemana` / `inicio` / `fin` | `Int` | Mismas reglas y CHECK que `FranjaAgenda`. |

- Son **de la Solicitud** (Assumption): al editar (FR-039) se reemplazan todas en una transacción;
  al pedir de nuevo, se cargan de nuevo. Al menos una por Solicitud (lo exige el servicio, no la
  base: una FK no puede exigir "al menos una hija").
- Mismo tipo compartido `Franja = { diaSemana, inicio, fin }` para las dos tablas
  (`packages/shared-types`), con `franjasCoinciden(a, b, minimo = 60)`: mismo `diaSemana` y
  `min(a.fin, b.fin) - max(a.inicio, b.inicio) >= minimo`.

## SolicitudDiscipulado (nuevo)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `personaId` | `String` → `Persona` | La interesada. Indexado. |
| `estado` | `enum EstadoSolicitud { pendiente, propuesta, aprobada, rechazada, retirada }` | Forma base de `docs/04` más `propuesta` (FR-036) y `retirada` (por la Persona, FR-039). |
| `creadoPorId` | `String?` | `null` si la pidió la propia Persona, o el Admin/Discipulador que la creó en su nombre (FR-002). Referencia lógica, como `Persona.altaPor`. |
| `revisadoPorId` | `String?` | El Admin que la propuso por última vez o la rechazó. |
| `revisadaEn` | `DateTime?` | Con `estado` y `revisadoPorId`, la costura de FR-023. |
| `grupoId` | `String?` → `Grupo` | Solo en `aprobada`. **No único**: varias Solicitudes pueden terminar en el mismo Grupo (FR-045). Indexado. |
| `createdAt` / `updatedAt` | `DateTime` | `updatedAt` cambia al editar franjas. |

- **Un solo pedido abierto por Persona:** índice único parcial
  `(personaId) WHERE estado IN ('pendiente', 'propuesta')`, en SQL (research #2).
- **Índices:** `@@index([personaId])`, `@@index([estado, createdAt])`, `@@index([grupoId])`.

**Transiciones:**

```text
pendiente ──proponer (Admin, FR-036)──▶ propuesta
propuesta ──aceptar (Discipulador)──▶ aprobada        (crea Grupo/Inscripción/Liderazgo)
propuesta ──declinar (Discipulador)──▶ pendiente      (Propuesta → declinada, con motivo)
propuesta ──retirar (Admin)──▶ pendiente              (Propuesta → retirada, por admin)
propuesta ──editar franjas (Persona, FR-039)──▶ pendiente (Propuesta → retirada, por persona)
pendiente | propuesta ──retirar (Persona, FR-039)──▶ retirada
pendiente ──rechazar (Admin, FR-008)──▶ rechazada
```

`rechazada` y `retirada` no bloquean una Solicitud nueva. Ninguna otra transición existe.

## PropuestaDiscipulado (nuevo — FR-036 a FR-038, research #13)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `tipo` | `enum TipoPropuesta { nueva, reasignacion }` | `nueva` sobre una Solicitud; `reasignacion` sobre un Grupo en curso (FR-030). |
| `solicitudId` | `String?` → `SolicitudDiscipulado` | Obligatoria si `tipo = nueva` (CHECK). Indexado. |
| `grupoId` | `String?` → `Grupo` | Obligatoria si `tipo = reasignacion` (CHECK). Indexado. |
| `discipuladorId` | `String` → `Persona` | A quién se le propone. Indexado con `estado`. |
| `grupoDestinoId` | `String?` → `Grupo` | Solo en `nueva`: sumar la Persona a este Grupo en curso en vez de abrir uno (FR-045). |
| `propuestaPorId` | `String` | El Admin. |
| `propuestaEn` | `DateTime @default(now())` | "Hace N días" (FR-038). |
| `estado` | `enum EstadoPropuesta { pendiente, aceptada, declinada, retirada }` | |
| `respondidaEn` | `DateTime?` | Aceptada, declinada o retirada. |
| `motivoDeclinacion` | `String?` | Hasta 500. Lo ve solo el Admin. |
| `retiradaPor` | `enum RetiradaPor { admin, persona }?` | Solo en `retirada`. |

- **Índices únicos parciales:** una `pendiente` por Solicitud y una `pendiente` por Grupo
  (`WHERE estado = 'pendiente'`).
- **Propuestas pendientes de un Discipulador** (FR-035, FR-043) =
  `WHERE discipuladorId = ? AND estado = 'pendiente'`. Lo calcula la misma función que los
  discipulados activos (research #1), para que la carga y la guarda del rol lean lo mismo.
- Nunca se borra: es el historial de FR-038.

## Grupo (nuevo)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `cursoId` | `String` → `Curso` | Indexado. |
| `sedeId` | `String` → `Sede` | La de la primera Persona inscripta. Indexado. |
| `estado` | `enum EstadoGrupo { en_curso, finalizado }` | |
| `motivoCierre` | `enum MotivoCierreGrupo { completado, abandonado }?` | Solo en `finalizado` (CHECK). FR-021, FR-042. |
| `propuestaFinalizacionEn` / `propuestaFinalizacionPorId` | `DateTime?` / `String?` | Propuesta vigente si no es null (research #4). |
| `finalizacionRechazadaEn` / `finalizacionRechazadaMotivo` | `DateTime?` / `String?` | El último rechazo (FR-019a). Motivo hasta 500. |
| `cerradoEn` / `cerradoPorId` | `DateTime?` / `String?` | Quién confirmó la finalización o la última baja. |
| `createdAt` | `DateTime @default(now())` | "Desde cuándo". |

- **Índices:** `@@index([cursoId])`, `@@index([sedeId])`, `@@index([estado])`.
- **Lugar** (FR-045) = `maxPersonasPorGrupo` del Discipulador vigente menos las Inscripciones
  `activa`. Se calcula, no se guarda. **Horario del Grupo**: derivado (research #14), no se guarda.
- Sin borrado: un Grupo `finalizado` es el registro de un proceso terminado.

**Transiciones del Grupo:**

```text
en_curso ──proponer finalización (Discipulador vigente)──▶ en_curso + propuesta
en_curso + propuesta ──rechazar (Admin)──▶ en_curso (propuesta limpia, rechazo guardado)
en_curso + propuesta ──confirmar (Admin)──▶ finalizado/completado  (Inscripciones activas → completada)
en_curso ──confirmar sin propuesta──▶ ✗ FINALIZACION_NO_PROPUESTA (FR-020)
en_curso ──última baja confirmada (FR-042)──▶ finalizado/abandonado
en_curso ──reasignación aceptada (FR-030)──▶ en_curso (Liderazgo cerrado + nuevo; la propuesta de finalización, si hay, se conserva)
```

## Inscripcion (nuevo)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `personaId` | `String` → `Persona` | Indexado. |
| `grupoId` | `String` → `Grupo` | Indexado. Uno a muchos (FR-014, FR-045). |
| `solicitudId` | `String @unique` → `SolicitudDiscipulado` | De qué pedido nació: sus franjas son el horario de esta Persona en el Grupo (research #14). |
| `estado` | `enum EstadoInscripcion { activa, completada, dada_de_baja, abandono }` | Los cuatro de `docs/04`. Este spec escribe `activa`, `completada` y `abandono`; `dada_de_baja` queda sin flujo. |
| `bajaPropuestaEn` / `bajaPropuestaPorId` / `bajaPropuestaMotivo` | `DateTime?` / `String?` / `String?` | FR-042. Motivo hasta 500. Propuesta vigente si `bajaPropuestaEn` no es null. |
| `bajaRechazadaEn` / `bajaRechazadaMotivo` | `DateTime?` / `String?` | El último rechazo. |
| `cerradaEn` | `DateTime?` | Cuándo pasó a `completada` o `abandono`. |
| `createdAt` | `DateTime @default(now())` | |

- `@@unique([personaId, grupoId])`.
- **"Está cursando o completó Vida Nueva"** (FR-001) = Inscripción `activa` o `completada` en un
  Grupo de Curso `vida_nueva`. `abandono` y `dada_de_baja` **no** cuentan.

**Transiciones de la Inscripción:**

```text
activa ──proponer baja (Discipulador vigente)──▶ activa + baja propuesta
activa + baja propuesta ──rechazar (Admin)──▶ activa (propuesta limpia, rechazo guardado)
activa + baja propuesta ──confirmar (Admin)──▶ abandono   (+ Grupo → abandonado si no queda ninguna activa)
activa ──finalización confirmada del Grupo──▶ completada
```

## Liderazgo (nuevo)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `personaId` | `String` → `Persona` | El Discipulador. |
| `grupoId` | `String` → `Grupo` | |
| `desde` | `DateTime @default(now())` | |
| `hasta` | `DateTime?` | `null` = vigente. Lo cierra una reasignación aceptada. |
| `propuestaId` | `String` → `PropuestaDiscipulado` | La aceptación que lo abrió: así queda quién lo propuso y quién aceptó. |
| `cerradoPorId` | `String?` | El Admin que propuso la reasignación. |

- **Índices:** `@@index([personaId, hasta])`, `@@index([grupoId, hasta])`.
- **Discipulado activo (D137):** `hasta IS NULL` y `Grupo.estado = en_curso`. Lo calcula solo
  `discipuladosActivosDe()`. Un solo vigente por Grupo: lo sostiene el servicio (research #3).

## Encuentro (nuevo)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `grupoId` | `String` → `Grupo` | Indexado. |
| `fecha` | `DateTime @db.Date` | Civil, no futura. |
| `capitulos` | `String` | 1 a 200 caracteres. |
| `notas` | `String?` | Hasta 2000. **Solo el Discipulador vigente** (D134, FR-029). |
| `registradoPorId` | `String` | |
| `createdAt` / `updatedAt` | `DateTime` | `updatedAt` es "última edición" (FR-041). |

- `@@index([grupoId, fecha])`. Se edita mientras el Grupo esté `en_curso`; no se borra.

## Asistencia (nuevo)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `encuentroId` | `String` → `Encuentro` | |
| `inscripcionId` | `String` → `Inscripcion` | Indexado. |
| `presente` | `Boolean` | FR-013; `true` por defecto (FR-013a). Editable con el Encuentro (FR-041). |

- `@@unique([encuentroId, inscripcionId])`. Una por Inscripción `activa` al crear el Encuentro.

## BloqueoDisponibilidad (nuevo)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `personaId` | `String` → `Persona` | |
| `desde` / `hasta` | `DateTime @db.Date` | CHECK `hasta >= desde` (FR-017). |
| `eliminadoEn` | `DateTime?` | Borrado lógico (FR-040, Principio III). |
| `createdAt` | `DateTime @default(now())` | |

- `@@index([personaId, hasta])`. Pueden superponerse.

## Discipulador disponible (FR-006, consulta, no entidad)

`'discipulador' = ANY(rol)` y `activo` y `disponibleDiscipulado` y **existe al menos una
`FranjaAgenda` con `eliminadaEn IS NULL`** y ningún `BloqueoDisponibilidad` vivo con
`desde <= hoy <= hasta`. Sin filtro de edad (FR-011 del 005). Es la entrada del cruce (research
#12), que además evalúa las reglas y marca el sugerido.

## Cambios a lo que dejó el spec 005

- `puedeQuitarRol(rol, persona, autorId)`: `persona` suma `discipuladosActivos` y
  `propuestasPendientes` (las dos `readonly DiscipuladoActivo[]`-like, con `grupoId` o
  `propuestaId` y el nombre de la Persona). La rama `discipulador` pasa de "siempre no" a "no si
  alguna lista no está vacía", motivo `DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS` (FR-043).
- `error-code.ts`: sale `DISCIPULADOR_SIN_VERIFICACION_DE_DISCIPULADOS_ACTIVOS`.
- `RolesService.quitarRol`: consulta las dos listas con la fila bloqueada. El 409 lleva
  `discipulados` (con `grupoId`, para el enlace del panel de roles) y `propuestas`.
- `GET /personas`: las dos listas de la página en **una** consulta agrupada.
- **Migración:** todos los CHECK y los índices parciales van en SQL dentro de la migración
  (patrón H-140): `franjas_agenda`/`franjas_solicitud` (`dia_semana`, `fin > inicio`),
  `bloqueos_disponibilidad` (`hasta >= desde`), `personas.max_personas_por_grupo` (`1..6`),
  `grupos` (`motivo_cierre` solo si `finalizado`), `propuestas_discipulado` (tipo ↔ FK), y los
  únicos parciales de Solicitud y Propuesta.
