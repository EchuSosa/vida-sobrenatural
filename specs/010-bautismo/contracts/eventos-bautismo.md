# Contrato: eventos de aviso de Bautismo (costura hacia la spec 012)

El envío (Avisos in-app + email para lo importante, D149; push después) lo construye la spec 012.
Esta spec deja un evento tipado por transición, con solo ids (FR-024), emitido **después** del
commit. Mismo patrón que `specs/004-vida-nueva-discipulado/contracts/eventos.md`.

## Tipo (`packages/shared-types/src/eventos-bautismo.ts`)

```ts
type EventoBautismo =
  | { nombre: 'solicitud_bautismo_aceptada';  personaId: string; datos: { solicitudId: string } }
  | { nombre: 'solicitud_bautismo_rechazada'; personaId: string; datos: { solicitudId: string } }
  | { nombre: 'bautismo_fecha_asignada';      personaId: string; datos: { solicitudId: string; eventoId: string } }
  | { nombre: 'bautismo_fecha_quitada';       personaId: string; datos: { solicitudId: string; eventoId: string } }
  | { nombre: 'bautismo_evento_cancelado';    personaId: string; datos: { solicitudId: string; eventoId: string } }
  | { nombre: 'bautismo_realizado';           personaId: string; datos: { solicitudId: string; eventoId: string } };
```

## Cómo lo mapea la 012

| Evento | Disparador (`docs/07` Flujo 10) | Prioridad | Alcance | Entidad relacionada |
|---|---|---|---|---|
| `solicitud_bautismo_aceptada` | `solicitud_actualizada` | importante | `persona` | la Solicitud → Mi camino |
| `solicitud_bautismo_rechazada` | `solicitud_actualizada` | importante | `persona` | la Solicitud → Mi camino |
| `bautismo_fecha_asignada` | `solicitud_actualizada` | importante | `persona` | la Solicitud → Mi camino |
| `bautismo_fecha_quitada` | `solicitud_actualizada` | importante | `persona` | la Solicitud → Mi camino |
| `bautismo_evento_cancelado` | `solicitud_actualizada` | importante | `persona` | la Solicitud → Mi camino |
| `bautismo_realizado` | `solicitud_actualizada` | normal | `persona` | la Solicitud → Mi camino |

**Texto fuera de la app** (push y asunto de email, `docs/13` punto 5): genérico, sin "bautismo" ni
el estado — "Tenés una novedad sobre tu solicitud". El cuerpo del aviso **dentro** de Avisos (con
sesión) puede decir el detalle. La 012 arma el texto en el idioma de la Persona (D84).

**Sin aviso** (FR-025): pedir, retirar, "No puedo ese día", crear en nombre de, habilitar.

## Función (`apps/api/src/bautismo/eventos.ts`)

`emitirEventoBautismo(evento): void` — hoy un `Logger` estructurado con `nombre` e ids. Test
unitario: no se loguea nada fuera de ids; y un test por transición del contrato de la API que afirma
que emite exactamente el evento de esta tabla (así, al conectar la 012, no falta ninguno).

## Recordatorio de Evento próximo

No es de esta spec: como la asignación es una Inscripción a Evento `confirmada` (research #1), el
`evento_proximo` de la 012 le llega a la Persona igual que a cualquier inscripto. Requisito hacia la
012: que su texto fuera de la app no nombre el Evento si es de bautismo (ver
`contracts/dependencia-evento.md`).
