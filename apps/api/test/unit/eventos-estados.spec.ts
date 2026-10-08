import { estadoInscripcionDeEvento, estadoPagoDeInscripcion } from '@vida-sobrenatural/shared-types';

/** spec 011, T003 — FR-002, FR-004, FR-005, FR-024, FR-046. */
describe('estadoPagoDeInscripcion (FR-024)', () => {
  const ayer = new Date('2026-10-01T12:00:00Z');
  const hoy = new Date('2026-10-02T12:00:00Z');

  it('sin costo → no_aplica', () => {
    expect(estadoPagoDeInscripcion(null, [])).toEqual({ estado: 'no_aplica', ultimoRechazo: null });
  });
  it('con costo y sin pagos → sin_pago', () => {
    expect(estadoPagoDeInscripcion('15000.00', [])).toEqual({ estado: 'sin_pago', ultimoRechazo: null });
  });
  it('uno pendiente → pendiente_verificacion', () => {
    expect(estadoPagoDeInscripcion('100', [{ estado: 'pendiente_verificacion', createdAt: hoy }]).estado).toBe('pendiente_verificacion');
  });
  it('uno verificado → verificado', () => {
    expect(estadoPagoDeInscripcion('100', [{ estado: 'verificado', createdAt: hoy }]).estado).toBe('verificado');
  });
  it('rechazado + nuevo pendiente → pendiente, con el motivo del rechazo', () => {
    const r = estadoPagoDeInscripcion('100', [
      { estado: 'rechazado', createdAt: ayer, motivoRechazo: 'No se ve el monto' },
      { estado: 'pendiente_verificacion', createdAt: hoy },
    ]);
    expect(r).toEqual({ estado: 'pendiente_verificacion', ultimoRechazo: 'No se ve el monto' });
  });
  it('solo rechazados → sin_pago con el último rechazo expuesto', () => {
    const r = estadoPagoDeInscripcion('100', [
      { estado: 'rechazado', createdAt: ayer, motivoRechazo: 'viejo' },
      { estado: 'rechazado', createdAt: hoy, motivoRechazo: 'nuevo' },
    ]);
    expect(r).toEqual({ estado: 'sin_pago', ultimoRechazo: 'nuevo' });
  });
});

describe('estadoInscripcionDeEvento (FR-002, FR-004, FR-005, FR-046)', () => {
  const ahora = new Date('2026-10-08T12:00:00Z');
  const base = {
    tipo: 'general' as const,
    estado: 'publicado' as const,
    requiereInscripcion: true,
    inicio: '2026-11-14T22:00:00Z',
    cupo: 10,
    permiteListaEspera: false,
  };

  it('sin inscripción → no_requiere', () => {
    expect(estadoInscripcionDeEvento({ ...base, requiereInscripcion: false }, 0, ahora)).toBe('no_requiere');
  });
  it('con lugar → abierta', () => {
    expect(estadoInscripcionDeEvento(base, 3, ahora)).toBe('abierta');
  });
  it('sin cupo → siempre abierta', () => {
    expect(estadoInscripcionDeEvento({ ...base, cupo: null }, 500, ahora)).toBe('abierta');
  });
  it('lleno con lista → lista_espera', () => {
    expect(estadoInscripcionDeEvento({ ...base, permiteListaEspera: true }, 10, ahora)).toBe('lista_espera');
  });
  it('lleno sin lista → cupo_completo', () => {
    expect(estadoInscripcionDeEvento(base, 10, ahora)).toBe('cupo_completo');
  });
  it('ya empezó → cerrada', () => {
    expect(estadoInscripcionDeEvento({ ...base, inicio: '2026-10-08T11:00:00Z' }, 0, ahora)).toBe('cerrada');
  });
  it('cancelado → cancelado (aunque haya pasado)', () => {
    expect(estadoInscripcionDeEvento({ ...base, estado: 'cancelado', inicio: '2026-01-01T00:00:00Z' }, 0, ahora)).toBe('cancelado');
  });
  it('bautismo → solo_admin', () => {
    expect(estadoInscripcionDeEvento({ ...base, tipo: 'bautismo' }, 0, ahora)).toBe('solo_admin');
  });
});
