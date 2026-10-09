# Contrato API — Grupos de Extensión

Errores nuevos: `GRUPO_EXTENSION_NO_DISPONIBLE`, `GRUPO_EXTENSION_COMPLETO`,
`GRUPO_EXTENSION_YA_INTEGRANTE`, `GRUPO_EXTENSION_PEDIDO_PENDIENTE`, `GRUPO_EXTENSION_NO_COMPATIBLE`,
`GRUPO_EXTENSION_SOLICITUD_NO_PENDIENTE`, `GRUPO_EXTENSION_NO_INTEGRANTE`,
`GRUPO_EXTENSION_CON_INTEGRANTES`, `DIRECCION_NO_UBICADA`, `UBICACION_NO_DISPONIBLE`.

## Backoffice (permisos `grupos_extension.ver` admin+pastor, `grupos_extension.gestionar` admin)

- `GET /grupos-extension?estado=activos|todos` → `GrupoExtensionResumen[]`.
- `GET /grupos-extension/:id` → `GrupoExtensionDetalle` (con líderes, integrantes y pendientes con contacto).
- `POST /grupos-extension` / `PATCH /grupos-extension/:id` → `{ grupo, ubicado: boolean }`.
  400 VALIDACION por campo; 409 `PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO`.
- `POST /grupos-extension/:id/inactivar` (409 `GRUPO_EXTENSION_CON_INTEGRANTES`) / `…/reactivar`.
- `GET /grupos-extension/lideres-elegibles?q=` → Personas activas mayores.
- `POST /grupos-extension/:id/integrantes` `{ personaId }` → agrega directo.
- `POST /grupos-extension/:id/integrantes/:solicitudId/quitar`.
- `GET /solicitudes-grupo-extension/:id` (solicitudes.ver), `POST …/:id/aceptar`, `POST …/:id/rechazar { mensaje? }` (grupos_extension.gestionar).

## Persona (sesión activa)

- `GET /grupos-extension/me` → `EstadoMiGrupoExtension` (`sin_grupo` + última resuelta | `pendiente` | `integrante`).
- `POST /grupos-extension/buscar` `{ direccion? | latitud,longitud ; dias? }` → `GrupoExtensionEncontrado[]`
  (sin dirección exacta ni contacto). 400 `DIRECCION_NO_UBICADA`; 503 `UBICACION_NO_DISPONIBLE`.
- `POST /grupos-extension/:id/solicitudes/me` → crea pendiente. 409 `GRUPO_EXTENSION_PEDIDO_PENDIENTE`,
  `GRUPO_EXTENSION_YA_INTEGRANTE`, `GRUPO_EXTENSION_NO_DISPONIBLE`, `GRUPO_EXTENSION_NO_COMPATIBLE`,
  `GRUPO_EXTENSION_COMPLETO`.
- `POST /solicitudes-grupo-extension/me/:id/retirar`.

## Líder (`mi_grupo_extension.ver` / `.gestionar`: lider_extension, y además líder vigente de ese Grupo)

- `GET /grupos-extension/liderados` → `GrupoLiderado[]` (pendientes + integrantes con contacto).
- `POST /grupos-extension/liderados/solicitudes/:id/aceptar` / `…/rechazar { mensaje? }`.
