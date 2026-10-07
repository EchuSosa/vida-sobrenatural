# Contrato: cómo emite un aviso cualquier módulo de la API

Reemplaza `specs/004-vida-nueva-discipulado/contracts/eventos.md` (research.md #1).

## Punto de entrada único (`apps/api/src/notificaciones/notificaciones.service.ts`)

```ts
@Injectable()
export class NotificacionesService {
  /**
   * Crea la Notificación y sus Entregas DENTRO de `tx` (la transacción del cambio de dominio).
   * Si `tx` se deshace, no queda nada. Devuelve si hay mails por mandar, para el "empujón".
   */
  emitir(tx: Prisma.TransactionClient, evento: EventoAviso): Promise<{ hayEmails: boolean }>;

  /** Para avisos manuales (backoffice); abre su propia transacción. */
  crearManual(autorId: string, datos: NuevaNotificacionManual): Promise<NotificacionManualResumen>;
}
```

Pasos de `emitir`:

1. Busca la entrada `CATALOGO_AVISOS[evento.nombre]` y verifica que `evento.a.tipo` sea el permitido
   (si no, lanza: es un error de programación, lo agarra un test).
2. Escribe el log estructurado de siempre: `{ evento: nombre, destinatario: a.tipo, ...ids de datos }`
   — nunca nombres, emails ni motivos (Principio X; el test de la 004 se adapta).
3. Si `destinatario = admin` → termina (FR-015).
4. Calcula `clave = entrada.clave(datos)`. Inserta la Notificación con
   `INSERT … ON CONFLICT ("claveIdempotencia") DO NOTHING`; si no insertó → termina (FR-014).
5. `resolverDestinatarios(tx, a)` → ids de Personas `estado = activa`, `activo = true` (FR-016).
   Si no hay ninguno, la Notificación queda igual (es el registro de que el hecho ocurrió).
6. Inserta una Entrega `app` (`estado = enviada`) por destinatario y, si `prioridad = importante`,
   una Entrega `email` (`estado = pendiente`, `proximoIntentoEn = now()`) por cada destinatario con
   email no nulo (FR-017). Una sola sentencia por canal.

Quien llama, **después** de que su `$transaction` confirma, puede llamar a
`envioEmails.empujar()` (no bloqueante) si `hayEmails`; si no lo hace, el mail sale igual en la
próxima vuelta del proceso (≤ 30 s).

## Cómo se ve en una transición (ejemplo, 004)

```ts
const { hayEmails } = await this.prisma.$transaction(async (tx) => {
  // … cambio de dominio …
  return this.notificaciones.emitir(tx, {
    nombre: 'discipulado.propuesta_aceptada',
    a: { tipo: 'persona', personaId: solicitud.personaId },
    datos: { solicitudId, grupoId, discipuladorId },
  });
});
if (hayEmails) this.envioEmails.empujar();
```

## Reglas para las specs que emiten

- Un evento por hecho de dominio, emitido en la **misma** transacción que lo confirma.
- Solo ids y datos no personales en `datos` (FR-013). El nombre de un Evento o Ministerio sí; el de
  una Persona, nunca.
- Cada transición que emite tiene un test (unitario con el `tx` falso o de integración) que afirma
  qué evento emite — el patrón de `apps/api/test/unit/eventos-discipulado.spec.ts`.
- El módulo que emite importa `NotificacionesModule`; nadie más escribe en `notificaciones` ni en
  `entregas_notificacion`.
