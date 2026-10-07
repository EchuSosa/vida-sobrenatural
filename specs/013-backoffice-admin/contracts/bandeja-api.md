# Contrato: Bandeja unificada de Solicitudes

Errores en Problem Details con `code` de `error-code.ts`. Autenticación: `JwtNextAuthGuard` + `PermisosGuard`.

## `GET /solicitudes` — generaliza el endpoint de la 004

Permiso: `solicitudes.ver` (Admin, Pastor).

Query:

| Param | Valores | Default |
|---|---|---|
| `filtro` | `abiertas` \| `resueltas` \| `todas` | `abiertas` |
| `tipo` | un `TipoSolicitud` conectado | (todos) |
| `estado` | lista separada por comas de estados **del tipo elegido**; ignorado sin `tipo`; si viene, reemplaza a `filtro` | — |
| `persona` | id de Persona | — |
| `buscar` | texto (nombre, apellido o "nombre apellido") | — |
| `orden` | `espera` \| `fecha` \| `persona` | `espera` |
| `dir` | `asc` \| `desc` | `asc` |
| `skip`, `take` | enteros; `take` ≤ 100 | 0, 20 |

Compatibilidad 004: `estado=pendiente,propuesta` sin `tipo` sigue aceptándose mientras `discipulado` sea el único tipo
conectado (se interpreta como `tipo=discipulado`); la pantalla nueva siempre manda `filtro`.

Respuesta `200`: `Pagina<SolicitudBandeja>`

```ts
interface SolicitudBandeja {
  tipo: TipoSolicitud;
  id: string;
  persona: PersonaBreve;          // id, nombre, apellido, fotoUrl
  estado: string;                 // clave del estado de ese tipo, se traduce en el cliente
  abierta: boolean;
  createdAt: string;
  esperaDesde: string;
  creadoPor: PersonaBreve | null; // null = la pidió la propia Persona
  revisadoPor: PersonaBreve | null;
  revisadaEn: string | null;
  extra?: { propuestaVigente?: { discipulador: PersonaBreve; propuestaEn: string } }; // por tipo
}
```

Errores: `400 VALIDACION` (`tipo` desconocido, `estado` que no es del tipo, `take` fuera de rango) con
`errors: [{campo, code}]`; `403 SIN_PERMISO`.

## `GET /solicitudes/conteo-abiertas`

Permiso: `solicitudes.ver`. Respuesta `200`: `ConteoAbiertas` — `{ discipulado: 4, bautismo: 2 }`; solo tipos
conectados; un tipo sin abiertas viene con `0`.

## Contrato para las specs de tipo (008–011)

Para sumar el tipo `X`:
1. `packages/shared-types/src/bandeja.ts`: agregar `X` a `TipoSolicitud`, `TIPOS_SOLICITUD`, `ESTADOS_POR_TIPO[X]`,
   `ESTADOS_ABIERTOS[X]`.
2. `apps/api/prisma/vistas/solicitudes_bandeja.sql`: sumar la rama `X` con las columnas de `data-model.md` §3, y una
   migración que haga `CREATE OR REPLACE VIEW` con el archivo completo.
3. `apps/api`: un provider `FuenteSolicitudes` con `tipo = X` y `resumenes(ids)` que devuelva `SolicitudBandeja[]`
   en el orden de `ids`, registrado en `FUENTES_SOLICITUDES`.
4. `apps/backoffice/src/config/solicitudes.ts`: `RUTA_DETALLE_SOLICITUD[X]` e `ICONO_TIPO_SOLICITUD[X]`.
5. `apps/backoffice/src/messages/es.json`: `bandeja.tipos.X` y `bandeja.estados.X.*`.
6. Correr el test de coherencia de la vista (research #3) — falla si 1 y 2 no coinciden.
