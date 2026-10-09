import { Logger } from '@nestjs/common';
import type { EventoAviso } from '@vida-sobrenatural/shared-types';
import { NotificacionesService } from '../../src/notificaciones/notificaciones.service.js';

/**
 * spec 012, T012 — `emitir` con un `tx` falso (FR-013, FR-015, FR-017,
 * FR-024). Reemplaza al viejo test de `EventosDiscipuladoService`: el log
 * sigue sin datos personales.
 */
function txFalso(destinatarios: { id: string; tieneEmail: boolean }[]) {
  const $queryRaw = jest.fn((strings: TemplateStringsArray) => {
    const sql = strings.join('?');
    if (sql.includes('INSERT INTO "notificaciones"')) return Promise.resolve([{ id: 'not-1' }]);
    if (sql.includes('FROM "personas"')) return Promise.resolve(destinatarios);
    throw new Error(`SQL inesperado: ${sql}`);
  });
  return {
    $queryRaw,
    notificacion: { create: jest.fn().mockResolvedValue({ id: 'not-1' }) },
    entregaNotificacion: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
  };
}

const aceptada: EventoAviso = {
  nombre: 'discipulado.propuesta_aceptada',
  a: { tipo: 'persona', personaId: 'per-1' },
  datos: { solicitudId: 'sol-1', grupoId: 'gru-1', discipuladorId: 'dis-1' },
};

describe('NotificacionesService.emitir (T012)', () => {
  let log: jest.SpyInstance;
  beforeEach(() => {
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => log.mockRestore());

  it('un evento al Admin solo se loguea: ninguna escritura (D201)', async () => {
    const tx = txFalso([]);
    const r = await new NotificacionesService().emitir(tx as never, {
      nombre: 'discipulado.propuesta_declinada',
      a: { tipo: 'admin' },
      datos: { propuestaId: 'pro-1' },
    });
    expect(r).toEqual({ hayEmails: false });
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(tx.notificacion.create).not.toHaveBeenCalled();
    expect(tx.entregaNotificacion.createMany).not.toHaveBeenCalled();
  });

  it('un destinatario distinto del del catálogo lanza', async () => {
    const tx = txFalso([]);
    const evento = { ...aceptada, a: { tipo: 'discipulador', personaId: 'per-1' } } as unknown as EventoAviso;
    await expect(new NotificacionesService().emitir(tx as never, evento)).rejects.toThrow(/discipulado.propuesta_aceptada/);
    expect(tx.notificacion.create).not.toHaveBeenCalled();
  });

  it('el log tiene solo el evento, el tipo de destinatario y los ids de datos (FR-024)', async () => {
    await new NotificacionesService().emitir(txFalso([]) as never, aceptada);
    expect(log).toHaveBeenCalledTimes(1);
    const registrado = log.mock.calls[0][0] as Record<string, unknown>;
    expect(registrado).toEqual({
      evento: 'discipulado.propuesta_aceptada',
      destinatario: 'persona',
      solicitudId: 'sol-1',
      grupoId: 'gru-1',
      discipuladorId: 'dis-1',
    });
  });

  it('un aviso normal crea solo Entregas app (FR-017)', async () => {
    const tx = txFalso([{ id: 'per-1', tieneEmail: true }]);
    const r = await new NotificacionesService().emitir(tx as never, {
      nombre: 'discipulado.finalizacion_confirmada',
      a: { tipo: 'persona', personaId: 'per-1' },
      datos: { grupoId: 'gru-1', inscripcionId: 'ins-1' },
    });
    expect(r).toEqual({ hayEmails: false });
    expect(tx.entregaNotificacion.createMany).toHaveBeenCalledTimes(1);
    expect(tx.entregaNotificacion.createMany.mock.calls[0][0].data).toEqual([expect.objectContaining({ personaId: 'per-1', canal: 'app', estado: 'enviada' })]);
  });

  it('un importante crea app para todos y email solo para quien tiene email (FR-015, FR-017)', async () => {
    const tx = txFalso([
      { id: 'con', tieneEmail: true },
      { id: 'sin', tieneEmail: false },
    ]);
    const r = await new NotificacionesService().emitir(tx as never, {
      nombre: 'evento.cancelado',
      a: { tipo: 'evento_inscriptos', eventoId: 'eve-1' },
      datos: { eventoId: 'eve-1', evento: 'Retiro', slug: 'retiro' },
    });
    expect(r).toEqual({ hayEmails: true });
    const [app, email] = tx.entregaNotificacion.createMany.mock.calls.map((c) => c[0].data as { personaId: string; canal: string; estado: string }[]);
    expect(app.map((e) => [e.personaId, e.canal])).toEqual([
      ['con', 'app'],
      ['sin', 'app'],
    ]);
    expect(email.map((e) => [e.personaId, e.canal, e.estado])).toEqual([['con', 'email', 'pendiente']]);
  });

  it('sin destinatarios activos no crea Entregas', async () => {
    const tx = txFalso([]);
    const r = await new NotificacionesService().emitir(tx as never, aceptada);
    expect(r).toEqual({ hayEmails: false });
    expect(tx.notificacion.create).toHaveBeenCalledTimes(1);
    expect(tx.entregaNotificacion.createMany).not.toHaveBeenCalled();
  });
});
