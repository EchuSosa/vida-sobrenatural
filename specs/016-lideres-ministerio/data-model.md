# Data Model — spec 016

### `LiderMinisterio` → `lideres_ministerio`

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | |
| ministerioId | uuid | |
| personaId | uuid | |
| desde | timestamp | default now |
| hasta | timestamp? | null = vigente |
| asignadoPorId | uuid | Admin |
| quitadoPorId | uuid? | Admin |

Índices por `ministerioId` y `personaId`; único parcial `lideres_ministerio_vigente (ministerioId,
personaId) WHERE hasta IS NULL`.

### `Persona.rol`

Suma el valor `lider_ministerio` (texto en el array, como `lider_extension`). Lo escribe solo
`rol-lider-ministerio.ts`, con su `CambioDeRol`.
