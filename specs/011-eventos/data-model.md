# Data Model — 011 Eventos

Fase 1 de `/speckit-plan`. Tres modelos nuevos (`Evento`, `InscripcionEvento`, `Pago`) y sus enums,
en `apps/api/prisma/schema.prisma`, con `@@map` en plural snake_case como el resto. Los nombres de
`docs/04` se respetan; `InscripcionEvento` (y no `Inscripcion`) porque `Inscripcion` ya es la
relación Persona–Grupo (004).

## Enums

```prisma
enum TipoEvento { general bautismo }                     // D147, decisión nueva D188
enum EstadoEvento { publicado cancelado }                // el `activo` del ER (D119: estado del negocio)
enum EstadoInscripcionEvento { confirmada pendiente rechazada lista_espera cancelada } // docs/04
enum MotivoCancelacionInscripcion { persona admin pago_rechazado }                      // research #5
enum MedioPago { transferencia efectivo otro }
enum EstadoPago { pendiente_verificacion verificado rechazado }                         // docs/04
```

## Evento

| Campo | Tipo | Regla |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `sedeId` | `String` → `Sede` | obligatoria; Sede activa al crear |
| `nombre` | `String` | 3–120 caracteres |
| `slug` | `String @unique` | generado al crear, nunca cambia (research #9) |
| `descripcion` | `String` | 1–5000, texto plano con saltos de línea |
| `tipo` | `TipoEvento @default(general)` | no cambia con Inscripciones (FR-014) |
| `inicio` | `DateTime @db.Timestamptz` | obligatorio (D189) |
| `fin` | `DateTime? @db.Timestamptz` | `> inicio` (CHECK) |
| `lugar` | `String?` | 0–300; `null` = dirección de la Sede (D190) |
| `publicoObjetivo` | `String?` | 0–120, informativo |
| `imagenUrl` / `imagenRuta` | `String?` | flyer público (research #7); `imagenRuta` para borrar el archivo |
| `descripcionImagen` | `String?` | obligatorio si hay imagen (CHECK, D83), 1–500 |
| `requiereInscripcion` | `Boolean` | |
| `requiereAprobacion` | `Boolean @default(false)` | solo con inscripción (CHECK) |
| `cupo` | `Int?` | `>= 1` (CHECK) |
| `permiteListaEspera` | `Boolean @default(false)` | solo con cupo (CHECK) |
| `costo` | `Decimal? @db.Decimal(10,2)` | `> 0` (CHECK) |
| `instruccionesPago` | `String?` | obligatorio si hay costo (CHECK, D191), 1–1000 |
| `diasAnticipacionRecordatorio` | `Int?` | 1–60, solo con inscripción (CHECK) |
| `estado` | `EstadoEvento @default(publicado)` | |
| `canceladoEn` / `canceladoPorId` | `DateTime?` / `String?` | se completan al cancelar, se limpian al reactivar |
| `eliminadoEn` / `eliminadoPorId` | `DateTime?` / `String?` | D119; toda consulta normal filtra `eliminadoEn IS NULL` |
| `creadoPorId` | `String` → `Persona` | |
| `createdAt` / `updatedAt` | `DateTime` | |

Índices: `@@index([estado, inicio])` (cartelera), `@@index([sedeId])`, `@@index([tipo, inicio])`
(próximos Eventos de bautismo, FR-048), `@@index([eliminadoEn])`.

CHECKs en SQL (migración, patrón H-140):
- `fin IS NULL OR fin > inicio`
- `"requiereAprobacion" = false OR "requiereInscripcion" = true`
- `cupo IS NULL OR cupo >= 1`
- `"permiteListaEspera" = false OR cupo IS NOT NULL`
- `costo IS NULL OR costo > 0`
- `(costo IS NULL) = ("instruccionesPago" IS NULL)`
- `"diasAnticipacionRecordatorio" IS NULL OR ("requiereInscripcion" AND "diasAnticipacionRecordatorio" BETWEEN 1 AND 60)`
- `("imagenUrl" IS NULL) = ("descripcionImagen" IS NULL)`
- `tipo <> 'bautismo' OR ("requiereInscripcion" AND NOT "requiereAprobacion" AND costo IS NULL AND NOT "permiteListaEspera" AND "diasAnticipacionRecordatorio" IS NULL)` (FR-045)

Valores derivados (no se guardan): `ocupados` = Inscripciones `confirmada` + `pendiente`;
`enEspera`; `lugaresDisponibles = cupo - ocupados` (o `null` sin cupo); `estadoInscripcion` del
Evento para la página (`no_requiere` / `abierta` / `lista_espera` / `cupo_completo` / `cerrada` /
`cancelado` / `solo_admin`), calculado por `estadoInscripcionDeEvento()` en `shared-types`.

## InscripcionEvento

| Campo | Tipo | Regla |
|---|---|---|
| `id` | `String @id` | |
| `eventoId` | `String` → `Evento` | |
| `personaId` | `String` → `Persona` | Persona `activa` |
| `estado` | `EstadoInscripcionEvento` | |
| `createdAt` | `DateTime` | la `fecha` del ER |
| `creadoPorId` | `String?` | `null` = la propia Persona (patrón Solicitudes, `docs/04`) |
| `enListaDesde` | `DateTime?` | se completa al entrar a `lista_espera`; orden de la lista (research #3) |
| `promovidaEn` | `DateTime?` | cuándo subió desde la lista |
| `promocionVistaEn` | `DateTime?` | el Admin la marcó como avisada (FR-025) |
| `revisadoPorId` / `revisadoEn` | `String?` / `DateTime?` | aprobación o rechazo |
| `motivoRechazo` | `String?` | 0–500 |
| `canceladaEn` / `canceladaPorId` | `DateTime?` / `String?` | |
| `motivoCancelacion` | `MotivoCancelacionInscripcion?` | obligatorio si `cancelada` (CHECK) |
| `updatedAt` | `DateTime` | |

Índices: `@@index([eventoId, estado])`, `@@index([personaId])`, `@@index([eventoId, estado,
enListaDesde])`, y en SQL `inscripciones_evento_una_abierta` (único parcial, research #2).
CHECKs: `estado <> 'lista_espera' OR "enListaDesde" IS NOT NULL`; `estado <> 'cancelada' OR
"motivoCancelacion" IS NOT NULL`.

### Transiciones

```text
(nueva) ──► confirmada | pendiente | lista_espera         FR-015 (Persona) / FR-027 (Admin)
pendiente ──► confirmada                                   aprobar (FR-026)
pendiente ──► rechazada                                    rechazar (FR-026) → promover
lista_espera ──► confirmada | pendiente                    promover (FR-018)
confirmada | pendiente | lista_espera ──► cancelada        Persona (FR-022) / Admin (FR-027) → promover si ocupaba
confirmada ──► cancelada (pago_rechazado)                  rechazar Pago (FR-035) → promover
rechazada, cancelada: finales (se vuelve a anotar con una Inscripción nueva, FR-021)
```

Precondiciones comunes: Evento `publicado`, no eliminado; la Persona solo actúa si `now() <
inicio`; el Admin puede cancelar después del inicio (Edge Cases).

## Pago

| Campo | Tipo | Regla |
|---|---|---|
| `id` | `String @id` | |
| `inscripcionEventoId` | `String` → `InscripcionEvento` | Inscripción `confirmada` al crear |
| `monto` | `Decimal @db.Decimal(10,2)` | `> 0` (CHECK); por defecto el costo |
| `medio` | `MedioPago` | |
| `fechaPago` | `DateTime @db.Date` | no futura |
| `comprobanteRuta` | `String?` | área privada `comprobantes`; obligatorio si lo crea la Persona |
| `comprobanteMime` | `String?` | detectado al subir |
| `estado` | `EstadoPago` | |
| `creadoPorId` | `String?` | `null` = la Persona; si es el Admin, nace `verificado` (FR-036) |
| `verificadoPorId` / `revisadoEn` | `String?` / `DateTime?` | quien verificó o rechazó (el `verificado_por` del ER) |
| `motivoRechazo` | `String?` | obligatorio si `rechazado` (CHECK), 1–500 |
| `createdAt` / `updatedAt` | `DateTime` | |

Índices: `@@index([inscripcionEventoId])`, `@@index([estado, createdAt])` (bandeja), y en SQL
`pagos_uno_pendiente_por_inscripcion` (único parcial).

Nunca se borra (Principio III). Un Pago rechazado queda como historial.

## Relaciones con lo existente

- `Sede 1—N Evento` (la Sede con Eventos ya no se puede eliminar, solo inactivar: D119 (a) — hay que
  sumar `eventos` al chequeo de datos relacionados de `sede.service.ts`).
- `Persona 1—N InscripcionEvento`; `Persona` como autora en `creadoPorId`, `revisadoPorId`,
  `canceladaPorId`, `verificadoPorId` (referencias con `@relation` nombradas, como en la 004).
- `limpiar-e2e.ts` borra, en orden, `Pago → InscripcionEvento → Evento` de las Personas y Eventos
  `e2e-` (única excepción al soft delete: datos de test).

## Tipos en `packages/shared-types/src/eventos.ts`

`TipoEvento`, `EstadoEvento`, `EstadoInscripcionEvento`, `MotivoCancelacionInscripcion`,
`MedioPago`, `EstadoPago`, `EstadoPagoInscripcion` (`no_aplica | sin_pago | pendiente_verificacion
| verificado`), `EstadoInscripcionDeEvento`, `EventoPublico`, `EventoResumen`, `EventoDetalle`,
`InscripcionEventoResumen`, `MiInscripcionEvento`, `PagoResumen`, y las funciones puras
`estadoPagoDeInscripcion()`, `estadoInscripcionDeEvento()`, `instanteEnArgentina()`,
`destinoSeguro()`; límites (`EVENTO_NOMBRE_MAX = 120`, `EVENTO_DESCRIPCION_MAX = 5000`,
`EVENTO_LUGAR_MAX = 300`, `INSTRUCCIONES_PAGO_MAX = 1000`, `MOTIVO_MAX` reutilizado,
`DIAS_RECORDATORIO_MAX = 60`), `MIME_TIPOS_COMPROBANTE_PERMITIDOS`,
`COMPROBANTE_TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024`, y las constantes del flyer.
