# Data Model: Vida de Servicio

Extiende el schema que dejó la 004 (`apps/api/prisma/schema.prisma`). Los CHECK y los índices únicos
parciales van en SQL a mano en la migración (patrón H-140). Todo borrado es lógico (Principio III).
Toda consulta con `select` explícito; FKs y filtros frecuentes con índice (H-42).

## Enums (extensiones)

- `CategoriaCurso`: suma `vida_de_servicio`.
- `ModalidadCurso`: suma `liberacion_programada`.
- `TipoBaja` (nuevo): `dada_de_baja`, `abandono` — el tipo propuesto o aplicado de una baja.
- `EstadoSolicitud`: se reusa (Vida de Servicio no usa `propuesta`; CHECK en SQL).

## Curso (extensión)

| Campo | Tipo | Notas |
|---|---|---|
| `prerequisitoCategoria` | `CategoriaCurso?` | nuevo. `vida_nueva` para Vida de Servicio; null para Vida Nueva. |

Seed idempotente: `upsert` de `(vida_de_servicio, grupal, liberacion_programada, prerequisitoCategoria
= vida_nueva)`, nombre "Vida de Servicio" (FR-001).

## Grupo (extensión)

| Campo | Tipo | Notas |
|---|---|---|
| `nombre` | `String?` | obligatorio para Vida de Servicio (servicio + CHECK por curso no expresable: lo valida el servicio), ≤ 80. Vida Nueva lo deja null. |
| `fechaInicio` | `DateTime? @db.Date` | ídem. |
| `inscripcionAbierta` | `Boolean @default(false)` | Vida de Servicio la crea en `true` (FR-006). |
| `items` | `ItemCronograma[]` | relación inversa. |
| `contenidos` | `Contenido[]` | relación inversa. |

Se reusan `estado`, `motivoCierre`, `propuestaFinalizacion*`, `finalizacionRechazada*`, `cerrado*`
(D39, FR-035/036).

## ItemCronograma (nuevo — research #2)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `grupoId` | FK Grupo | |
| `numeroSemana` | `Int` | 1..52 |
| `fechaLiberacion` | `DateTime @db.Date` | fecha civil de Argentina |
| `eliminadoEn` | `DateTime?` | quitar la última semana sin liberar (FR-004) es borrado lógico |
| `createdAt`, `updatedAt` | | |

Únicos parciales `WHERE "eliminadoEn" IS NULL`: `(grupoId, numeroSemana)` y `(grupoId,
fechaLiberacion)`. CHECK `numeroSemana BETWEEN 1 AND 52`. Índice `(grupoId, fechaLiberacion)`.
Regla de orden (fechas estrictamente crecientes con el número) en el servicio, con unit test
(`cronogramaValido`).

## Contenido (nuevo — research #3)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `grupoId` | FK Grupo | redundante con el item, para el filtro por Grupo (índice) |
| `itemCronogramaId` | FK ItemCronograma, `@unique` | uno por semana |
| `titulo` | `String` | ≤ 120 |
| `texto` | `String?` | ≤ 10.000 |
| `cargadoPorId`, `cargadoEn` | | quién lo creó |
| `editadoPorId?`, `editadoEn?` | | última edición (FR-020) |
| `liberacionAvisadaEn` | `DateTime?` | research #4: el aviso `contenido_liberado` sale una sola vez |

Índices: `(grupoId)`, `(liberacionAvisadaEn)` parcial `WHERE "liberacionAvisadaEn" IS NULL`.
"Material cargado" = existe el Contenido y tiene `texto` no vacío, o al menos un archivo o enlace
vivo (servicio + `materialCargado()` puro).

## ArchivoContenido (nuevo — research #5)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | es el id público de la descarga |
| `contenidoId` | FK Contenido | |
| `ruta` | `String` | ruta en el `StorageService` privado; nunca sale de la API |
| `nombreOriginal` | `String` | ≤ 200, para mostrar |
| `mimeType` | `String` | detectado por contenido: `application/pdf`, `image/jpeg`, `image/png`, `image/webp` |
| `tamanioBytes` | `Int` | ≤ 15 MB (CHECK) |
| `textoAlternativo` | `String?` | obligatorio si es imagen (servicio, D83) |
| `orden` | `Int` | |
| `eliminadoEn`, `eliminadoPorId` | | quitar un archivo es lógico; el binario queda |

Índice `(contenidoId, eliminadoEn)`. Máximo 5 vivos por Contenido (servicio).

## EnlaceContenido (nuevo)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `contenidoId` | FK Contenido | |
| `texto` | `String` | ≤ 120, lo que se lee (D81: nunca "click acá") |
| `url` | `String` | `https://` obligatorio, ≤ 2.000 |
| `orden` | `Int` | |
| `eliminadoEn` | `DateTime?` | |

Máximo 10 vivos por Contenido.

## SolicitudVidaServicio (nuevo — research #6)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `personaId` | String | referencia lógica, como en la 004 |
| `estado` | `EstadoSolicitud` | `pendiente` → `aprobada` / `rechazada` / `retirada` (CHECK `estado <> 'propuesta'`) |
| `grupoId` | `String?` | edición pedida; null = "para la próxima edición" (FR-011) |
| `creadoPorId` | `String?` | null = la propia Persona (FR-013, D97) |
| `revisadoPorId`, `revisadaEn` | | |
| `motivoRechazo` | `String?` | ≤ 500, solo Admin (FR-017) |
| `createdAt`, `updatedAt` | | |

Único parcial `(personaId) WHERE estado = 'pendiente'` (FR-012, D60). Índices `(estado, createdAt)`,
`(grupoId)`, `(personaId)`.

## Inscripcion (extensión)

| Campo | Cambio |
|---|---|
| `solicitudId` | pasa a `String? @unique` (antes obligatorio) |
| `solicitudVidaServicioId` | nuevo, `String? @unique` |
| `bajaPropuestaTipo` | nuevo, `TipoBaja?` — solo Vida de Servicio (research #10) |

CHECK `num_nonnulls("solicitudId", "solicitudVidaServicioId") = 1`. Se reusan `estado`,
`bajaPropuesta*`, `bajaRechazada*`, `cerradaEn` (fecha de cierre para FR-034) y
`@@unique([personaId, grupoId])`. "Una sola Inscripción `activa` de Vida de Servicio por Persona" la
valida el servicio dentro de la transacción, bloqueando la fila de la Persona (patrón H-142).

## Encuentro (extensión)

| Campo | Cambio |
|---|---|
| `capitulos` | pasa a `String?` — Vida Nueva lo sigue exigiendo en su servicio |

Único parcial `encuentros ("grupoId", fecha) WHERE capitulos IS NULL` (research #13): un Encuentro de
asistencia por Grupo de Vida de Servicio y fecha.

## Asistencia

Sin cambios (`@@unique([encuentroId, inscripcionId])`, `presente`).

## Liderazgo

Sin cambios. Para Vida de Servicio: varios vigentes por Grupo (D20), `propuestaId` null, `desde` =
asignación, `hasta` = cuando el Admin lo saca (`cerradoPorId`). "Al menos un vigente" lo valida el
servicio bloqueando la fila del Grupo.

## Persona

Sin columnas nuevas. `rol` suma el valor de estado `apto_ministerio` (research #9), escrito solo por
`RolesDeEstadoService`.

## Consultas (no entidades)

- **Prerrequisito** (`estadoPrerrequisito`, research #8): Inscripciones `completada` con
  `grupo.curso.categoria`, más Completitudes Manuales (006).
- **Liberada / visible** (`liberada`, `semanasVisibles`, research #4 y #11): funciones puras de
  `shared-types`.
- **Faltas** (`faltasPorInscripcion(grupoId)`): `groupBy inscripcionId where presente = false`.
- **Grupos de servicio activos de un Líder** (FR-040): Liderazgo vigente en Grupo `en_curso` con
  `curso.categoria = vida_de_servicio`; y `discipuladosActivosDe` (D137) pasa a filtrar
  `curso.categoria = vida_nueva`.

## Transiciones

```text
SolicitudVidaServicio: pendiente ─aprobar→ aprobada  (crea Inscripcion activa)
                       pendiente ─rechazar→ rechazada
                       pendiente ─retirar (Persona)→ retirada

Inscripcion (VS): activa ─proponer baja→ activa+bajaPropuesta ─confirmar→ dada_de_baja | abandono
                                                              ─rechazar→ activa (bajaRechazada*)
                  activa ─baja directa (Admin)→ dada_de_baja | abandono
                  activa ─finalización confirmada→ completada (+ rol apto_ministerio)

Grupo (VS): en_curso ─proponer finalización (última fecha alcanzada)→ en_curso+propuesta
            ─confirmar (sin bajas propuestas)→ finalizado/completado
            ─rechazar→ en_curso (finalizacionRechazada*)
```

## Seeds

- `seed.ts`: el Curso Vida de Servicio (idempotente).
- `sembrar-e2e-admin.ts`: dos Personas `e2e-lider…@` con `lider_curso`; una Persona con Vida Nueva
  completada (por Inscripción) y otra sin.
- `limpiar-e2e.ts`: borra en orden ArchivoContenido → EnlaceContenido → Contenido → ItemCronograma →
  SolicitudVidaServicio, antes de lo que ya borra de la 004 (excepción documentada al soft delete para
  datos de test).
- `seed-demo.ts`: FR-045.
