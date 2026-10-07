# Contrato: eventos para el sistema de notificaciones (costura, FR-018)

Mismo patrón que `specs/004-vida-nueva-discipulado/contracts/eventos.md`: se definen en
`packages/shared-types/src/eventos-historial.ts` y la API los emite por el mismo mecanismo que la
004 (`apps/api/src/discipulado/eventos.ts` → hoy un no-op con log sin datos personales). La spec
012 los envía. Ninguno incluye datos sensibles en el título (`docs/16`).

| Evento | Cuándo | Destinatario | Datos |
|---|---|---|---|
| `declaracion_historial_creada` | POST /camino/me/declaraciones | Admins (`historial.resolver`) | `declaracionId`, `etapa` |
| `declaracion_historial_confirmada` | confirmar | la Persona | `declaracionId`, `etapa` |
| `declaracion_historial_rechazada` | rechazar | la Persona | `declaracionId`, `etapa`, `tieneMotivo` |
| `completitud_manual_registrada` | registro directo del Admin | la Persona (si tiene acceso) | `completitudId`, `etapa` |

Entidad relacionada para "a dónde lleva" (D59): `etapa` → `/mi-camino` en la web app; para el
Admin, `/solicitudes/historial/[id]` en el backoffice.

Test unitario: cada transición emite exactamente su evento, una vez, después del commit.
