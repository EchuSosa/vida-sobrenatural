# Contrato: API de Avisos (web app, la Persona con sesión)

Todos exigen sesión (mismo guard que `/personas/me`) y operan **solo** sobre las Entregas `canal =
app` de la Persona de la sesión (Principio V). El `id` de un aviso es el id de su Entrega `app`.
Errores en Problem Details con `code` del catálogo.

## `GET /avisos?pagina=1`

Respuesta `200` — `Pagina<AvisoResumen>` (`AVISOS_POR_PAGINA = 20`, orden `createdAt desc, id desc`).
`pagina` inválida o fuera de rango: la API recorta a la válida más cercana y la web corrige la URL
con redirect (`docs/15` §Listados paginados, punto 5).

```ts
interface AvisoResumen {
  id: string;                    // id de la Entrega app
  tipo: 'manual' | 'automatica';
  evento: NombreEventoAviso | null;            // automática
  params: Record<string, string | number> | null; // automática, para el texto (FR-013)
  titulo: string | null;         // manual
  extracto: string | null;       // manual: primeros 140 caracteres del mensaje, sin cortar palabras
  importante: boolean;
  leido: boolean;
  fecha: string;                 // ISO
  destino: string;               // ruta de la web: catálogo, o `/avisos/{id}` si es manual
}
```

## `GET /avisos/sin-leer`

`200` — `{ cantidad: number }`. Usa el índice parcial `entregas_sin_leer`.

## `GET /avisos/:id`

`200` — `AvisoDetalle = AvisoResumen & { mensaje: string | null }` (mensaje completo si es manual).
De otra Persona o inexistente: `404 NO_ENCONTRADO`.

## `PATCH /avisos/:id/leido`

`200` — `{ destino: string }`. Pone `leidaEn = now()` solo si era `null` (FR-008: idempotente, no
pisa la primera fecha). De otra Persona o inexistente: `404 NO_ENCONTRADO`. Lo usa la ruta de la web
`/avisos/{id}/ir` (research #9).

## `POST /avisos/leer-todos`

`200` — `{ marcados: number }`. Un solo `UPDATE … WHERE "personaId" = $1 AND canal = 'app' AND
"leidaEn" IS NULL`.

## Rutas de la web app (`apps/web/src/app/(app)/avisos/`)

| Ruta | Qué es |
|---|---|
| `/avisos?pagina=N` | Lista (Server Component), `loading.tsx`, `error.tsx` |
| `/avisos/[id]` | Aviso completo (manual o automático), con miga de pan "Avisos" |
| `/avisos/[id]/ir` | Route Handler: `PATCH …/leido` y `303` al destino (si la API falla, `303` al destino del listado o a `/avisos`) |
