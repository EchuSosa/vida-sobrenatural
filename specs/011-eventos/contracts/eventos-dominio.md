# Contrato — Sucesos de Eventos (la costura para los avisos de la 012)

Mismo patrón que `specs/004-vida-nueva-discipulado/contracts/eventos.md`: cada transición emite un
`SucesoEvento` **después** de confirmar su transacción. Hoy `SucesosEventoService.emitir()` solo lo
loguea (nombre, tipo de destinatario e ids — nunca nombres, montos, motivos ni datos personales,
Principio X). La spec 012 conecta ahí su `NotificacionService`; esta spec no envía nada.

Se llaman **sucesos** para no confundirlos con la entidad Evento.

```ts
// packages/shared-types/src/sucesos-evento.ts
export type DestinatarioSuceso =
  | { tipo: 'persona'; personaId: string }          // la dueña de la Inscripción
  | { tipo: 'inscriptos_evento'; eventoId: string } // las Inscripciones abiertas del Evento al momento del suceso
  | { tipo: 'admin' };                              // los que tienen el permiso que corresponda

export type SucesoEvento =
  | { nombre: 'inscripcion_creada';    a: DestinatarioSuceso; datos: { eventoId: string; inscripcionId: string; estado: 'confirmada' | 'pendiente' | 'lista_espera'; enNombreDeOtro: boolean } }
  | { nombre: 'inscripcion_aprobada';  a: DestinatarioSuceso; datos: { eventoId: string; inscripcionId: string } }
  | { nombre: 'inscripcion_rechazada'; a: DestinatarioSuceso; datos: { eventoId: string; inscripcionId: string } }
  | { nombre: 'inscripcion_promovida'; a: DestinatarioSuceso; datos: { eventoId: string; inscripcionId: string; estado: 'confirmada' | 'pendiente' } }
  | { nombre: 'inscripcion_cancelada'; a: DestinatarioSuceso; datos: { eventoId: string; inscripcionId: string; por: 'persona' | 'admin' | 'pago_rechazado' } }
  | { nombre: 'pago_registrado';       a: DestinatarioSuceso; datos: { eventoId: string; inscripcionId: string; pagoId: string } }
  | { nombre: 'pago_verificado';       a: DestinatarioSuceso; datos: { eventoId: string; inscripcionId: string; pagoId: string } }
  | { nombre: 'pago_rechazado';        a: DestinatarioSuceso; datos: { eventoId: string; inscripcionId: string; pagoId: string } }
  | { nombre: 'evento_modificado';     a: DestinatarioSuceso; datos: { eventoId: string; cambios: Array<'inicio' | 'fin' | 'lugar'> } }
  | { nombre: 'evento_cancelado';      a: DestinatarioSuceso; datos: { eventoId: string } };
```

## Tabla: quién lo dispara, a quién, y qué aviso propone para la 012

| Suceso | Lo dispara | Destinatario | Aviso propuesto (D49/D96/D149) |
|---|---|---|---|
| `inscripcion_creada` (Persona) | FR-015 | `admin` solo si `pendiente` | ninguno a la Persona (ya ve la confirmación en pantalla); al Admin, el contador de pendientes (sin aviso) |
| `inscripcion_creada` (Admin en nombre) | FR-027 | `persona` | `solicitud_actualizada`, normal (se entera de que la anotaron) |
| `inscripcion_aprobada` | FR-026 | `persona` | `solicitud_actualizada`, **importante** (`docs/16`) |
| `inscripcion_rechazada` | FR-026 | `persona` | `solicitud_actualizada`, **importante** |
| `inscripcion_promovida` | FR-018 | `persona` | `solicitud_actualizada`, **importante** (Flujo 8 paso 9) |
| `inscripcion_cancelada` por `admin` | FR-027 | `persona` | `solicitud_actualizada`, normal |
| `inscripcion_cancelada` por `persona` | FR-022 | — | ninguno |
| `pago_registrado` | FR-030 | `admin` | ninguno (bandeja + pendientes del Inicio) |
| `pago_verificado` | FR-033 | `persona` | `solicitud_actualizada`, **importante** (`docs/16`) |
| `pago_rechazado` | FR-035 | `persona` | `solicitud_actualizada`, **importante**; lleva a Mis eventos |
| `evento_modificado` | FR-050 | `inscriptos_evento` | **decisión nueva D193**: normal |
| `evento_cancelado` | FR-040 | `inscriptos_evento` | **decisión nueva D193**: importante |

`entidad_relacionada` (D59) para la 012: la Inscripción (`inscripcionId`) → lleva a `/mis-eventos`;
los de Evento → `/eventos/{slug}`.

## Recordatorios programados (los dispara la 012, no esta spec)

- **`evento_proximo`** (D49, alcance `evento`): a las Inscripciones `confirmada` de los Eventos
  `publicado`, no eliminados, cuyo `inicio` cae dentro de la antelación. **Propuesta**: 1 día antes.
  Consulta disponible: `EventosConsultasService.destinatariosEventoProximo(eventoId)`.
- **`recordatorio_inscripcion`** (D73, alcance `todos`): para Eventos `general` con
  `requiereInscripcion` y `diasAnticipacionRecordatorio` no nulo, cuando `inicio - dias` es hoy
  (zona AR), si el Evento sigue `publicado` y con inscripción abierta (no `cupo_completo`).
  Consulta disponible: `EventosConsultasService.eventosParaRecordatorioInscripcion(hoy)`.

Las dos consultas viven en `apps/api/src/evento/eventos-consultas.service.ts`, exportadas por
`EventoModule`, con test de integración; la 012 las usa en su tarea programada.
