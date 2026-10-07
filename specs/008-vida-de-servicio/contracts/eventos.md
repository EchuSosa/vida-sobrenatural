# Contrato: eventos de Vida de Servicio para el sistema de notificaciones (spec 012)

El envío no se construye acá (FR-041). Cada transición emite un evento tipado **después** de
confirmar la transacción. Hoy `emitirEventoVidaDeServicio()` (en `apps/api/src/vida-de-servicio/eventos.ts`)
escribe un log estructurado con nombre, tipo de destinatario e ids — nunca nombres, teléfonos ni
motivos (Principio X). La 012 reemplaza el cuerpo de esa función: es el único enchufe. Mismo patrón
que `eventos-discipulado.ts` (004).

## Tipo (`packages/shared-types/src/eventos-vida-de-servicio.ts`)

```ts
type DestinatarioVS =
  | { tipo: 'persona'; personaId: string }
  | { tipo: 'lideres_del_grupo'; grupoId: string }          // Liderazgos vigentes al enviar
  | { tipo: 'inscriptos_activos_del_grupo'; grupoId: string } // = alcance `grupo` de docs/04
  | { tipo: 'admin' };                                        // quienes tengan grupos.gestionar / solicitudes.aprobar

type EventoVidaDeServicio = { a: DestinatarioVS; prioridad: 'normal' | 'importante';
  disparador: 'solicitud_actualizada' | 'contenido_liberado' | null } & (
  | { nombre: 'solicitud_creada';        datos: { solicitudId } }                    // admin, normal, null
  | { nombre: 'solicitud_aprobada';      datos: { solicitudId; grupoId; inscripcionId } } // persona, importante, solicitud_actualizada
  | { nombre: 'solicitud_rechazada';     datos: { solicitudId } }                    // persona, importante, solicitud_actualizada
  | { nombre: 'contenido_liberado';      datos: { grupoId; contenidoId; numeroSemana } } // inscriptos_activos, normal, contenido_liberado
  | { nombre: 'lider_asignado';          datos: { grupoId } }                        // persona (el Líder), normal, null
  | { nombre: 'baja_propuesta';          datos: { grupoId; inscripcionId } }         // admin, normal, null
  | { nombre: 'baja_rechazada';          datos: { grupoId; inscripcionId } }         // lideres_del_grupo, normal, null
  | { nombre: 'baja_aplicada';           datos: { grupoId; inscripcionId; tipo: 'dada_de_baja' | 'abandono' } } // persona, importante, null
  | { nombre: 'finalizacion_propuesta';  datos: { grupoId } }                        // admin, normal, null
  | { nombre: 'finalizacion_rechazada';  datos: { grupoId } }                        // lideres_del_grupo, normal, null
  | { nombre: 'finalizacion_confirmada'; datos: { grupoId; inscripcionId } }         // persona (una por completada), importante, null
);
```

`entidad_relacionada` para la 012 (D59): Solicitud → `/mi-camino` (card de Vida de Servicio);
contenido → `/mi-camino/vida-de-servicio/semanas/:numero`; Líder → `/mis-grupos/:grupoId`; Admin →
el detalle correspondiente del backoffice.

`disparador: null` = evento que `docs/04` todavía no nombra; la 012 decide si lo envía y con qué
disparador (propuesta de nombre: `grupo_actualizado`). Ver "Cambios a docs al mergear" del plan.

## La liberación por fecha

`ContenidoService.marcarLiberacionesDeHoy(hoy: string): Promise<number>` — research #4. Idempotente,
segura ante dos corridas simultáneas (`UPDATE … WHERE "liberacionAvisadaEn" IS NULL RETURNING`). Emite
un `contenido_liberado` por Contenido marcado. **La llama el proceso programado de la 012** (diario,
temprano a la mañana de Argentina). Mientras la 012 no exista, nadie la llama: el contenido se ve
igual (la visibilidad no depende del aviso) y solo falta el aviso.

## Quién se entera mientras no hay envío

| Destinatario | Dónde |
|---|---|
| Persona | Card de Vida de Servicio en Mi camino (FR-025). |
| Líder | Mis grupos: estado por semana, bajas y finalización rechazadas con motivo. |
| Admin | Bandeja de Solicitudes y tarjeta de pendientes del Inicio (FR-039). |

## Test

`apps/api/test/unit/eventos-vida-de-servicio.spec.ts`: cada transición del contrato de API emite el
evento de esta tabla con su destinatario, prioridad y disparador; y ningún campo fuera de ids viaja en
`datos`.
