# Data Model — spec 017

Nombres del dominio (Principio II): el "área" de la interfaz es la **Célula** del Ministerio
(`docs/04`). Un Ministerio sin Células (Ceremonial) tiene turnos del Ministerio entero.

### `DiaDeServicio` → `dias_de_servicio` (D250)

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | |
| ministerioId | uuid | |
| frecuencia | enum `semanal` \| `mensual` | |
| diaSemana | int 0–6 | 0 = domingo |
| posicionEnMes | int? 1–4, o -1 = último | solo si `mensual` |
| activo | boolean | quitar = `activo=false` (Principio III) |
| creadoPorId | uuid | Admin |
| createdAt / updatedAt | timestamp | |

Único parcial `(ministerioId, frecuencia, diaSemana, posicionEnMes) WHERE activo` →
409 `DIA_DE_SERVICIO_REPETIDO`.

### `FechaDeServicio` → `fechas_de_servicio`

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | |
| ministerioId | uuid | |
| dia | date | fecha civil en Argentina |
| estado | enum `borrador` \| `publicada` \| `suspendida` | |
| publicadaEn / publicadaPorId | timestamp? / uuid? | |
| suspendidaEn / suspendidaPorId | timestamp? / uuid? | |
| recordatorioEnviadoEn | timestamp? | lo marca la tarea diaria (D256) |

Único `(ministerioId, dia)`. Se crea al primer turno, suspensión o publicación (FR-002); las fechas
sin fila se calculan de las reglas.

### `Turno` → `turnos` (D255)

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | |
| fechaId | uuid | |
| personaId | uuid | integrante vigente (Postulación aprobada, D170) |
| celulaId | uuid? | null si el Ministerio no tiene Células |
| estado | enum `asignado` \| `cancelado_por_persona` \| `quitado` | |
| motivoCancelacion | varchar(200)? | solo líderes y Admin (D257); nunca a logs ni avisos |
| asignadoPorId / asignadoEn | uuid / timestamp | |
| cerradoPorId / cerradoEn | uuid? / timestamp? | |

Único parcial `(fechaId, personaId) WHERE estado = 'asignado'` → 409 `YA_TIENE_TURNO_ESE_DIA`.

### Cupo (D251)

- `Celula.cupoTurno int default 1` (1–20).
- `Ministerio.cupoTurno int default 1` (1–20), para los que no tienen Células.

### Constantes (shared-types, `turnos.ts`)

`CUPO_TURNO_POR_DEFECTO = 1`, `CUPO_TURNO_MAXIMO = 20`, `FECHAS_VISIBLES_TURNOS = 8`,
`FECHAS_PARA_CONTAR_TURNOS = 8`, `DIAS_RECORDATORIO_TURNO = 2`, `MOTIVO_CANCELACION_MAX = 200`.
`fechasDeServicio(reglas, desde, cantidad)` (pura, en Argentina) calcula las próximas fechas; la
usan la API y los tests.
