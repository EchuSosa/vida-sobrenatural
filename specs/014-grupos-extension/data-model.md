# Data Model: Grupos de Extensión

## Enums

- `DiaSemana`: lunes, martes, miercoles, jueves, viernes, sabado, domingo.
- `EstadoSolicitudGrupoExtension`: pendiente, aceptada, rechazada, retirada, finalizada.

## GrupoExtension (`grupos_extension`)

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | |
| nombre | text | 1..80 |
| dias | DiaSemana[] | ≥ 1 (CHECK) |
| horaInicio | text | `HH:MM`, minutos 00/15/30/45 (CHECK) |
| cupo | int? | ≥ 1 |
| edadMinima / edadMaxima | int? | 0..120, mín ≤ máx (CHECK) |
| enLaIglesia | bool | |
| sedeId | uuid? | obligatorio si enLaIglesia (CHECK) |
| calle, numero, entreCalle1, entreCalle2 | text? | calle obligatoria si no enLaIglesia (CHECK) |
| zona | text? | barrio/zona pública; obligatoria si no enLaIglesia |
| latitud / longitud | float? | las dos o ninguna (CHECK) |
| activo | bool | |
| creadoPorId | text | |
| createdAt / updatedAt | | |

El género no se guarda: se calcula de los líderes vigentes (D222).

## LiderGrupoExtension (`lideres_grupo_extension`)

grupoId, personaId, desde, hasta (null = vigente). Único parcial (grupoId, personaId) WHERE hasta IS NULL.

## SolicitudGrupoExtension (`solicitudes_grupo_extension`)

| Campo | Notas |
|---|---|
| personaId, grupoId | |
| estado | default pendiente |
| creadoPorId | Admin que la agregó directo (null si la pidió la persona) |
| revisadoPorId, revisadaEn | quién aceptó/rechazó (líder o Admin) |
| mensaje | mensaje opcional del rechazo (≤ 500) |
| retiradaEn | |
| finalizadaEn, finalizadaPorId | quitada por el Admin |

Índices únicos parciales: una `pendiente` y una `aceptada` por persona. CHECK: rechazada/aceptada ⇒
revisadaEn; retirada ⇒ retiradaEn; finalizada ⇒ finalizadaEn.

## Vista `solicitudes_bandeja`

Rama `grupo_extension`: abierta ⇔ `pendiente`.
