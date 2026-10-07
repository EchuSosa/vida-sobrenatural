# Contrato: eventos para el sistema de notificaciones (FR-035, FR-036) — costura para la spec 012

Mismo patrón que `specs/004-vida-nueva-discipulado/contracts/eventos.md`: cada transición emite un
evento tipado **después** de confirmar la transacción; hoy una sola función lo recibe y escribe un log
estructurado sin datos personales (Principio X). La spec 012 conecta el envío (Avisos + email para lo
importante, D149) en ese único enchufe.

## Tipo (`packages/shared-types/src/eventos-ministerio.ts`)

```ts
type Destinatario =
  | { tipo: 'persona'; personaId: string }
  | { tipo: 'admin' }; // quienes tengan solicitudes.aprobar

type EventoMinisterio =
  | { nombre: 'postulacion_creada';    a: { tipo: 'admin' };   prioridad: 'normal';     datos: { postulacionId; ministerioId; enNombreDe: boolean } }
  | { nombre: 'postulacion_retirada';  a: { tipo: 'admin' };   prioridad: 'normal';     datos: { postulacionId } }
  | { nombre: 'postulacion_aprobada';  a: Destinatario /*persona*/; prioridad: 'importante'; datos: { postulacionId; ministerioId; celulaId: string | null; reemplazaA: string | null } }
  | { nombre: 'postulacion_rechazada'; a: Destinatario /*persona*/; prioridad: 'importante'; datos: { postulacionId } }
  | { nombre: 'miembro_dado_de_baja';  a: Destinatario /*persona*/; prioridad: 'importante'; datos: { postulacionId; ministerioId } };
```

- La inactivación por cambio **no** es un evento aparte: viaja en `postulacion_aprobada.reemplazaA`
  (un solo aviso a la Persona: "ahora estás en Z").
- Solo ids: el texto se arma al enviar, en el idioma de la Persona (D84), sin nombre de Ministerio en el
  asunto del email ni en push (docs/16: el Ministerio revela afiliación religiosa, D5).
- Para docs/04 (Notificación): todos mapean al disparador `solicitud_actualizada`, alcance `persona`,
  `entidad_relacionada_tipo = 'postulacion'` (salvo los de `admin`, que la 012 decide si van a Avisos
  del Admin o solo a la tarjeta de pendientes).

## Función (`apps/api/src/ministerio/eventos.ts`)

`emitirEventoMinisterio(evento: EventoMinisterio): void` — hoy `logger.log({ evento: nombre, a: tipo, prioridad, ...datos })`.
Test unitario: cada transición de `postulaciones-api.md` y `ministerios-api.md` emite el evento de esta
tabla, y ningún campo fuera de ids viaja.

## Alcance `ministerio` para notificaciones manuales (D48)

`miembrosActivosDe(tx, ministerioId): Promise<string[]>` en `apps/api/src/ministerio/miembros.ts` —
**la única** definición de "quiénes están hoy en un Ministerio": Postulación `aprobada` en ese
Ministerio, Persona `activo = true`. La usan `GET /ministerios/:id/miembros` (con paginado) y la 012.

## Quién se entera mientras no hay envío

| Destinatario | Dónde |
|---|---|
| Persona | Card de Ministerio en Mi camino (FR-011). |
| Admin | Bandeja de Solicitudes (filtro abiertas) y la tarjeta "Pendientes" del Inicio del backoffice: esta spec le suma "Postulaciones pendientes: N" (`GET /discipulado/pendientes-admin` sigue de la 004; se agrega un contador propio). |
