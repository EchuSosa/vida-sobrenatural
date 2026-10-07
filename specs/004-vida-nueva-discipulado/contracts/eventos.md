# Contrato: eventos para el sistema de notificaciones futuro (FR-023, FR-048)

El envío de notificaciones está fuera de alcance. Lo que este spec deja es **la costura**: cada
transición emite un evento tipado con destinatario y datos, y hoy una sola función lo recibe y
escribe un log estructurado sin datos personales (Principio X). Cuando exista el sistema de
Notificaciones (`docs/16-sistemas-transversales.md`, disparador `solicitud_actualizada`), esa
función es el único enchufe. Research #17.

## Tipo (`packages/shared-types/src/eventos-discipulado.ts`)

```ts
type Destinatario =
  | { tipo: 'persona'; personaId: string }        // la interesada
  | { tipo: 'discipulador'; personaId: string }
  | { tipo: 'admin' };                             // todos los que tengan solicitudes.aprobar / grupos.gestionar

type EventoDiscipulado =
  | { nombre: 'propuesta_nueva';           a: Destinatario /*discipulador*/; datos: { propuestaId; solicitudId?; grupoId? } }
  | { nombre: 'propuesta_aceptada';        a: Destinatario /*persona*/;      datos: { solicitudId; grupoId; discipuladorId } }
  | { nombre: 'propuesta_declinada';       a: Destinatario /*admin*/;        datos: { propuestaId; solicitudId?; grupoId? } }
  | { nombre: 'propuesta_retirada';        a: Destinatario /*admin*/;        datos: { propuestaId; retiradaPor: 'admin' | 'persona' } }
  | { nombre: 'propuesta_sin_respuesta';   a: Destinatario /*admin*/;        datos: { propuestaId; dias: number } }   // derivado, no emitido: lo calcula pendientes-admin
  | { nombre: 'solicitud_rechazada';       a: Destinatario /*persona*/;      datos: { solicitudId } }
  | { nombre: 'finalizacion_propuesta';    a: Destinatario /*admin*/;        datos: { grupoId } }
  | { nombre: 'finalizacion_confirmada';   a: Destinatario /*persona*/;      datos: { grupoId; inscripcionId } }
  | { nombre: 'baja_propuesta';            a: Destinatario /*admin*/;        datos: { grupoId; inscripcionId } }
  | { nombre: 'baja_confirmada';           a: Destinatario /*persona*/;      datos: { grupoId; inscripcionId } };
```

Solo ids en `datos`: el texto del aviso se arma cuando se envíe, en el idioma de cada destinatario
(D84, D96). Ningún nombre, teléfono ni motivo viaja en el evento.

## Función (`apps/api/src/discipulado/eventos.ts`)

`emitirEventoDiscipulado(evento: EventoDiscipulado): void` — se llama **después** de que la
transacción confirmó (nunca adentro: un evento de algo que se deshizo sería peor que ninguno). Hoy
escribe `logger.log({ evento: nombre, a: tipo, ...datos })`. Tiene un test unitario que afirma que
cada transición de los contratos emite el evento que dice esta tabla — así, cuando se conecte el
envío, no falta ninguno.

## Quién lo ve mientras no hay envío

| Destinatario | Dónde se entera |
|---|---|
| Discipulador | Al entrar a Mis discipulados: las propuestas pendientes van primero (FR-037). |
| Admin | Tarjeta "Pendientes" en Inicio del backoffice (`GET /discipulado/pendientes-admin`, FR-048), y los filtros `pendiente=` de `/grupos` y la bandeja de `/solicitudes`. |
| Persona | Mi camino (FR-026 a FR-028). |
