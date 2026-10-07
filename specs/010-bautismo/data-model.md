# Data Model: Bautismo (spec 010)

Extiende `apps/api/prisma/schema.prisma`. Lo que viene de la spec 011 (`Evento`,
`InscripcionEvento`) se nombra pero **no se define acá** — ver `contracts/dependencia-evento.md`.

## Enum nuevo

```prisma
enum EstadoSolicitudBautismo {
  pendiente   // pedida, sin revisar
  aprobada    // "aceptada" en la interfaz; sin o con Evento asignado
  rechazada
  retirada    // la retiró la Persona (o el Admin en su nombre)
  realizada   // el Admin confirmó que se bautizó (Historia 7)
}
```

## `SolicitudBautismo` (`solicitudes_bautismo`) — nueva

| Campo | Tipo | Regla |
|---|---|---|
| `id` | `String @id @default(uuid())` | |
| `personaId` | `String` → `Persona` | La interesada. |
| `estado` | `EstadoSolicitudBautismo @default(pendiente)` | |
| `comentario` | `String?` | Texto opcional de la Persona (o del Admin en su nombre), ≤ 500 (`COMENTARIO_BAUTISMO_MAX`). Reemplaza `fecha_deseada` (research, spec Assumptions). |
| `creadoPorId` | `String?` → `Persona` | `null` = la pidió la propia Persona (D97, `docs/04`). |
| `revisadoPorId` | `String?` → `Persona` | Quién aceptó o rechazó. |
| `revisadaEn` | `DateTime?` | |
| `motivoRechazo` | `String?` | Solo equipo (Admin, Pastor). ≤ 500. Nunca sale en `/bautismo/me`. |
| `inscripcionEventoId` | `String? @unique` → `InscripcionEvento` (spec 011) | La asignación vigente (research #1). |
| `realizadaEn` | `DateTime?` | = `Evento.fecha` al confirmar. |
| `retiradaEn` | `DateTime?` | |
| `createdAt` / `updatedAt` | `DateTime` | `createdAt` es la fecha de pedido de la forma base. |

Índices: `@@index([personaId])`, `@@index([estado, createdAt])`. En SQL, a mano en la migración:

- `solicitudes_bautismo_una_abierta`: único parcial en `("personaId") WHERE estado IN ('pendiente','aprobada')` (FR-004).
- CHECK `"inscripcionEventoId" IS NULL OR estado IN ('aprobada','realizada')`.
- CHECK `(estado = 'realizada') = ("realizadaEn" IS NOT NULL)`.
- CHECK `char_length(comentario) <= 500 AND char_length("motivoRechazo") <= 500` (nulos permitidos).

### Transiciones

```
               aceptar (Admin)                 asignar/reasignar (Admin)
 pendiente ─────────────────────► aprobada ◄──────────────────────────┐
     │                             │  ▲ │ quitar / "No puedo ese día" / │
     │ rechazar (Admin)            │  │ │ Evento cancelado / destildada │
     ▼                             │  └─┘ (FK → null)                   │
 rechazada                         │                                    │
                                   │ confirmar (Admin, Evento pasado)   │
 pendiente | aprobada ── retirar ──┼──► retirada                        │
   (Persona o Admin)               ▼                                    │
                               realizada                                │
```

- `rechazada`, `retirada` y `realizada` son finales. Desde `rechazada`/`retirada` la Persona puede
  crear **otra** Solicitud (si cumple FR-002); desde `realizada`, no (FR-005).
- Solo `aprobada` con `inscripcionEventoId` puede pasar a `realizada`.
- Ninguna fila se borra (FR-034, Principio III).

## `Persona` — dos campos nuevos

| Campo | Tipo | Regla |
|---|---|---|
| `bautismoHabilitadoEn` | `DateTime?` | Habilitación del Admin (D147, FR-021). |
| `bautismoHabilitadoPorId` | `String?` → `Persona` | Quién la habilitó. CHECK: los dos nulos o los dos con valor. |

Relaciones inversas: `solicitudesBautismo`, `solicitudesBautismoCreadas`,
`solicitudesBautismoRevisadas`, `bautismosHabilitados` (nombres de relación explícitos, como en la
004).

## Vista `bandeja_solicitudes` (research #4)

```sql
CREATE VIEW bandeja_solicitudes AS
  SELECT id, 'discipulado'::text AS tipo, "personaId", estado::text AS estado, "createdAt",
         "revisadoPorId", "creadoPorId"
    FROM solicitudes_discipulado
  UNION ALL
  SELECT id, 'bautismo', "personaId", estado::text, "createdAt", "revisadoPorId", "creadoPorId"
    FROM solicitudes_bautismo;
```

Solo lectura. Si otra spec ya la creó al mergear, esta migración hace `CREATE OR REPLACE VIEW`
sumando su rama.

## Lo que se lee de la spec 011 (sin definirlo)

- `Evento`: `id`, `nombre`, `fecha` (instante con hora), `lugar` o equivalente, `sedeId`, `activo`,
  `slug`, y el discriminador de bautismo (`tipo = bautismo` o el nombre que la 011 elija).
- `InscripcionEvento`: `id`, `personaId`, `eventoId`, `estado` (`confirmada`, `cancelada`),
  `creadoPorId`.

## Valores compartidos (`packages/shared-types/src/bautismo.ts`)

- `EstadoSolicitudBautismo` (unión de los cinco valores).
- `COMENTARIO_BAUTISMO_MAX = 500`, `MOTIVO_RECHAZO_BAUTISMO_MAX = 500`,
  `EDAD_MINIMA_PEDIR_BAUTISMO_SOLO = 12`.
- `EstadoCardBautismo` — unión discriminada de FR-019:
  `no_habilitada` · `lo_pide_su_tutor` · `puede_pedir { ultimo?: 'rechazada' | 'retirada' }` ·
  `en_revision { solicitudId, desde }` · `esperando_fecha { solicitudId, aceptadaEn }` ·
  `con_fecha { solicitudId, evento: { id, nombre, fecha, lugar, slug } }` ·
  `fecha_pasada_sin_confirmar { solicitudId, evento }` · `bautizada { en: string | null }`.
- `HechosBautismo` y las funciones puras `estadoCardBautismo(hechos)` y
  `motivoNoPuedePedir(hechos)` (research #6).
- `TipoSolicitud` (de `discipulado.ts`) pasa a `'discipulado' | 'bautismo'`.
- `SolicitudBautismoDetalle`, `EventoDeBautismoResumen`, `AsignacionResultado`.

## Seeds (D120)

- `db:seed`: nada nuevo.
- Fixtures e2e: una Persona con Vida Nueva en curso (`e2e-bautismo-vn@…`), una sin Vida Nueva
  (`e2e-bautismo-sin-vn@…`), una de 11 años (`e2e-bautismo-menor@…`), y un Evento de bautismo
  futuro y uno pasado (vía el helper de la 011).
- `db:seed-demo`: una Persona en cada estado de la card (pendiente, esperando fecha, con fecha,
  pasada sin confirmar, bautizada, rechazada), una habilitada por el Admin sin Vida Nueva, una
  creada en nombre de una Persona sin acceso, un Evento de bautismo próximo con tres asignados y uno
  pasado ya confirmado; nombres largos y con tildes (D120).
