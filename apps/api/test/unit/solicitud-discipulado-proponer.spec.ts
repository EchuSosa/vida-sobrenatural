import { MARTES_19_A_21, crearServicio, errorDe, propuesta, solicitud } from './solicitud-discipulado-de-test.js';

const GRUPO_CON_LUGAR = { grupoId: 'g-lugar', ocupado: 1, maximo: 3, coincideHorario: true, personas: ['Bea Díaz'] };

async function conSolicitudPendiente(disponibles: Parameters<typeof crearServicio>[1] = [{ id: 'disc-1' }]) {
  const s = solicitud('ana', 'pendiente');
  const armado = await crearServicio(
    {
      personas: [{ id: 'ana' }, { id: 'disc-1' }, { id: 'disc-apagado' }, { id: 'admin' }],
      solicitudes: [s],
      franjas: [{ ...MARTES_19_A_21, solicitudId: s.id }],
    },
    disponibles,
  );
  return { ...armado, s };
}

/**
 * specs/004, T023 — proponer, retirar la propuesta y rechazar (FR-003,
 * FR-006, FR-008, FR-036, FR-045, D25). "No disponible" lo decide la misma
 * consulta del cruce (CruceService.disponibles): sin rol, sin agenda, toggle
 * apagado o bloqueo vigente quedan todos fuera de esa lista.
 */
describe('SolicitudDiscipuladoService — proponer (T023)', () => {
  it('pendiente → propuesta, con la Propuesta pendiente, revisadoPor y el evento al Discipulador; sin Grupo', async () => {
    const { service, s, base, emitir } = await conSolicitudPendiente();

    const { propuestaId } = await service.proponer(s.id, 'disc-1', undefined, 'admin');

    expect(s).toMatchObject({ estado: 'propuesta', revisadoPorId: 'admin' });
    expect(s.revisadaEn).toBeInstanceOf(Date);
    expect(base.propuestas).toEqual([
      expect.objectContaining({ id: propuestaId, tipo: 'nueva', solicitudId: s.id, discipuladorId: 'disc-1', estado: 'pendiente', propuestaPorId: 'admin', grupoDestinoId: null }),
    ]);
    expect(base.inscripciones).toHaveLength(0);
    expect(emitir).toHaveBeenCalledWith(expect.anything(), { nombre: 'discipulado.propuesta_nueva', a: { tipo: 'discipulador', personaId: 'disc-1' }, datos: { propuestaId, solicitudId: s.id } });
  });

  it.each(['propuesta', 'aprobada', 'rechazada', 'retirada'] as const)('una Solicitud %s → SOLICITUD_NO_PENDIENTE', async (estado) => {
    const { service, s, base } = await conSolicitudPendiente();
    s.estado = estado;

    expect((await errorDe(service.proponer(s.id, 'disc-1', undefined, 'admin'))).code).toBe('SOLICITUD_NO_PENDIENTE');
    expect(base.propuestas).toHaveLength(0);
  });

  it('un Discipulador fuera de los disponibles de FR-006 (sin rol, sin agenda, toggle apagado o bloqueo vigente) → DISCIPULADOR_NO_DISPONIBLE', async () => {
    const { service, s, base } = await conSolicitudPendiente();

    expect((await errorDe(service.proponer(s.id, 'disc-apagado', undefined, 'admin'))).code).toBe('DISCIPULADOR_NO_DISPONIBLE');
    expect(s.estado).toBe('pendiente');
    expect(base.propuestas).toHaveLength(0);
  });

  it('una Persona que no existe → DISCIPULADOR_NO_DISPONIBLE', async () => {
    const { service, s } = await conSolicitudPendiente([{ id: 'fantasma' }]);

    expect((await errorDe(service.proponer(s.id, 'fantasma', undefined, 'admin'))).code).toBe('DISCIPULADOR_NO_DISPONIBLE');
  });

  it('a la propia Persona de la Solicitud → DISCIPULADOR_NO_DISPONIBLE', async () => {
    const { service, s } = await conSolicitudPendiente([{ id: 'ana' }]);

    expect((await errorDe(service.proponer(s.id, 'ana', undefined, 'admin'))).code).toBe('DISCIPULADOR_NO_DISPONIBLE');
  });

  it('a uno de "no coinciden" funciona: el cruce no filtra, el Admin decide (D25)', async () => {
    // `disponibles` no evalúa reglas: quien no coincide en horario ni en género igual está en la lista.
    const { service, s } = await conSolicitudPendiente([{ id: 'disc-1' }]);

    await expect(service.proponer(s.id, 'disc-1', undefined, 'admin')).resolves.toHaveProperty('propuestaId');
  });

  describe('Grupo destino (FR-045)', () => {
    it('un Grupo con lugar del mismo Discipulador → queda en la Propuesta', async () => {
      const { service, s, base } = await conSolicitudPendiente([{ id: 'disc-1', gruposConLugar: [GRUPO_CON_LUGAR] }]);

      await service.proponer(s.id, 'disc-1', 'g-lugar', 'admin');

      expect(base.propuestas[0].grupoDestinoId).toBe('g-lugar');
    });

    it('un Grupo de otro Discipulador o sin lugar (no está en sus gruposConLugar) → GRUPO_SIN_LUGAR', async () => {
      const { service, s, base } = await conSolicitudPendiente([{ id: 'disc-1', gruposConLugar: [GRUPO_CON_LUGAR] }]);

      expect((await errorDe(service.proponer(s.id, 'disc-1', 'g-lleno-o-ajeno', 'admin'))).code).toBe('GRUPO_SIN_LUGAR');
      expect(base.propuestas).toHaveLength(0);
    });
  });

  it('si la Persona ya cursa Vida Nueva → VIDA_NUEVA_EN_CURSO_O_COMPLETADA', async () => {
    const { service, s, base } = await conSolicitudPendiente();
    base.inscripciones.push({ personaId: 'ana', grupoId: 'g', solicitudId: 'otra', estado: 'activa', createdAt: new Date(), cerradaEn: null });

    expect((await errorDe(service.proponer(s.id, 'disc-1', undefined, 'admin'))).code).toBe('VIDA_NUEVA_EN_CURSO_O_COMPLETADA');
  });
});

describe('SolicitudDiscipuladoService — retirar la propuesta y rechazar (T023)', () => {
  it('retirar deja la Propuesta retirada por admin y la Solicitud pendiente', async () => {
    const s = solicitud('ana', 'propuesta');
    const p = propuesta(s.id, 'disc-1');
    const { service, emitir } = await crearServicio({ personas: [{ id: 'ana' }], solicitudes: [s], propuestas: [p] });

    await service.retirarPropuesta(s.id);

    expect(p).toMatchObject({ estado: 'retirada', retiradaPor: 'admin' });
    expect(s.estado).toBe('pendiente');
    expect(emitir).toHaveBeenCalledWith(expect.anything(), { nombre: 'discipulado.propuesta_retirada', a: { tipo: 'admin' }, datos: { propuestaId: p.id, retiradaPor: 'admin' } });
  });

  it('retirar sobre una pendiente → SOLICITUD_NO_PROPUESTA', async () => {
    const s = solicitud('ana', 'pendiente');
    const { service } = await crearServicio({ personas: [{ id: 'ana' }], solicitudes: [s] });

    expect((await errorDe(service.retirarPropuesta(s.id))).code).toBe('SOLICITUD_NO_PROPUESTA');
  });

  it('rechazar deja la Solicitud rechazada y no crea nada', async () => {
    const s = solicitud('ana', 'pendiente');
    const { service, base, emitir } = await crearServicio({ personas: [{ id: 'ana' }], solicitudes: [s] });

    await service.rechazar(s.id, 'admin');

    expect(s).toMatchObject({ estado: 'rechazada', revisadoPorId: 'admin' });
    expect(base.propuestas).toHaveLength(0);
    expect(base.inscripciones).toHaveLength(0);
    expect(emitir).toHaveBeenCalledWith(expect.anything(), { nombre: 'discipulado.solicitud_rechazada', a: { tipo: 'persona', personaId: 'ana' }, datos: { solicitudId: s.id } });
  });

  it('rechazar una propuesta → SOLICITUD_NO_PENDIENTE (primero se retira la propuesta)', async () => {
    const s = solicitud('ana', 'propuesta');
    const { service } = await crearServicio({ personas: [{ id: 'ana' }], solicitudes: [s] });

    expect((await errorDe(service.rechazar(s.id, 'admin'))).code).toBe('SOLICITUD_NO_PENDIENTE');
  });

  it('una Solicitud inexistente → NO_ENCONTRADO', async () => {
    const { service } = await crearServicio();

    expect((await errorDe(service.rechazar('nada', 'admin'))).code).toBe('NO_ENCONTRADO');
    expect((await errorDe(service.proponer('nada', 'disc-1', undefined, 'admin'))).code).toBe('NO_ENCONTRADO');
  });
});
