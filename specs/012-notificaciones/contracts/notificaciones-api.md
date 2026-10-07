# Contrato: API de Notificaciones manuales (backoffice)

Permisos con `@RequierePermiso` contra `CATALOGO_PERMISOS` (D132): lectura `notificaciones.ver`
(`admin`, `pastor`), escritura `notificaciones.enviar` (`admin`, **nuevo**).

## `GET /notificaciones?pagina=1` — `notificaciones.ver`

Solo las manuales, `createdAt desc`. `Pagina<NotificacionManualResumen>`:

```ts
interface NotificacionManualResumen {
  id: string;
  titulo: string;
  alcance: 'todos' | 'grupo' | 'ministerio';
  alcanceNombre: string | null;  // nombre del Grupo / Ministerio, para la tabla
  importante: boolean;
  autor: { id: string; nombre: string; apellido: string };
  fecha: string;
  destinatarios: number;         // Entregas app
  leidas: number;                // Entregas app con leidaEn
}
```

## `GET /notificaciones/:id` — `notificaciones.ver`

`NotificacionManualDetalle = NotificacionManualResumen & { mensaje: string; emails: { enviados:
number; pendientes: number; fallidos: number; personasFallidas: { id; nombre; apellido }[] } | null }`
(`emails = null` si no es importante). `404 NO_ENCONTRADO` si no existe o es automática.

## `POST /notificaciones/destinatarios` — `notificaciones.enviar`

Body `{ alcance, alcanceId? }` → `200 { personas: number; conEmail: number }`. Mismo
`resolverDestinatarios` que el envío (Principio XI). Alcance no disponible → `409
ALCANCE_NO_DISPONIBLE`. Es `POST` porque es una consulta con cuerpo, no crea nada.

## `GET /notificaciones/opciones-alcance` — `notificaciones.enviar`

`200 { grupos: { id; nombre; curso }[]; ministerios: { id; nombre }[] }` — Grupos `en_curso` con al
menos una Inscripción activa; Ministerios activos (vacío mientras no exista la 009: la opción "A un
ministerio" se muestra deshabilitada con su explicación).

## `POST /notificaciones` — `notificaciones.enviar`

Body `NuevaNotificacionManual = { titulo: string; mensaje: string; alcance: 'todos' | 'grupo' |
'ministerio'; alcanceId?: string; importante: boolean }`.

- Validación por campo (`400 VALIDACION`, `errors: [{ campo, code }]`): `TITULO_REQUERIDO`,
  `TITULO_DEMASIADO_LARGO` (> 80), `MENSAJE_REQUERIDO`, `MENSAJE_DEMASIADO_LARGO` (> 1000),
  `ALCANCE_REQUERIDO`, `ALCANCE_ID_REQUERIDO` (grupo/ministerio sin id). Texto recortado
  (`trim`) antes de validar.
- `409 ALCANCE_NO_DISPONIBLE`; `409 NOTIFICACION_SIN_DESTINATARIOS` (0 Personas activas).
- `201` — `NotificacionManualResumen`. Crea la Notificación (`tipo = manual`, `creadoPorId` = sesión)
  y las Entregas en una transacción; empuja el envío de mails si es importante.
- No hay `PATCH` ni `DELETE` (FR-033).

## `GET /notificaciones/mails-fallidos?pagina=1` — `notificaciones.ver`

Entregas `email` `fallida` de Notificaciones **automáticas** de los últimos
`DIAS_MAILS_FALLIDOS_VISIBLES = 30` días: `Pagina<MailFallido>` con `{ entregaId, persona: { id,
nombre, apellido }, evento: NombreEventoAviso, fecha, motivo: 'SIN_EMAIL' | 'PERSONA_INACTIVA' |
'ENVIO_FALLIDO' }`. Nunca el email ni el texto del error del servidor.

## Pantallas (`apps/backoffice/src/app/notificaciones/`)

| Ruta | Qué es |
|---|---|
| `/notificaciones?pagina=N` | `TablaDatos` de manuales + "Enviar un aviso" (solo con `notificaciones.enviar`) + sección "Mails que no salieron" |
| (diálogo) | Formulario en `AlertDialog`, conteo en vivo, advertencia de "importante", confirmación |
| `/notificaciones/[id]` | Detalle con estadísticas y personas sin mail |
