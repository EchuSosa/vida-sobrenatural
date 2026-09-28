import { estadoMiDiscipulado, type HechosMiDiscipulado } from '../../src/solicitud-discipulado/reglas-solicitud.js';
import { MARTES_19_A_21, crearServicio, haceAnios, propuesta, solicitud } from './solicitud-discipulado-de-test.js';

const AYER = new Date(Date.now() - 86_400_000);
const HOY = new Date();

function hechos(extra: Partial<HechosMiDiscipulado> = {}): HechosMiDiscipulado {
  return { edad: 30, inscripcionActiva: null, inscripcionCompletada: null, ultimaSolicitud: null, ...extra };
}

function ultima(estado: NonNullable<HechosMiDiscipulado['ultimaSolicitud']>['estado'], inscripcion: NonNullable<HechosMiDiscipulado['ultimaSolicitud']>['inscripcion'] = null) {
  return { id: 's1', estado, franjas: [MARTES_19_A_21], createdAt: AYER, inscripcion };
}

/** specs/004, T032 — la precedencia de EstadoMiDiscipulado (contracts/solicitudes-api.md, FR-026 a FR-028, FR-044). */
describe('estadoMiDiscipulado (T032)', () => {
  it('sin nada → puede_pedir sin último desenlace', () => {
    expect(estadoMiDiscipulado(hechos())).toEqual({ estado: 'puede_pedir' });
  });

  it('Inscripción activa → en_curso con su Discipulador', () => {
    const e = estadoMiDiscipulado(
      hechos({
        inscripcionActiva: { grupoId: 'g1', desde: AYER, discipulador: { nombre: 'Marta', apellido: 'Gómez', telefono: '1155' } },
        ultimaSolicitud: ultima('aprobada', { estado: 'activa', cerradaEn: null }),
      }),
    );
    expect(e).toEqual({ estado: 'en_curso', grupoId: 'g1', discipulador: { nombre: 'Marta', apellido: 'Gómez', telefono: '1155' }, desde: AYER.toISOString() });
  });

  it('Inscripción completada → finalizado', () => {
    expect(estadoMiDiscipulado(hechos({ inscripcionCompletada: { cerradaEn: HOY, createdAt: AYER } }))).toEqual({ estado: 'finalizado', finalizadoEn: HOY.toISOString() });
  });

  it('pendiente y propuesta → el MISMO buscando, sin nada de la Propuesta (FR-026)', () => {
    const pendiente = estadoMiDiscipulado(hechos({ ultimaSolicitud: ultima('pendiente') }));
    const propuesta = estadoMiDiscipulado(hechos({ ultimaSolicitud: ultima('propuesta') }));

    expect(pendiente).toEqual({ estado: 'buscando', solicitudId: 's1', franjas: [MARTES_19_A_21], createdAt: AYER.toISOString() });
    expect(propuesta).toEqual(pendiente);
    expect(JSON.stringify(propuesta)).not.toMatch(/discipulador/i);
  });

  it.each(['rechazada', 'retirada'] as const)('%s → puede_pedir con ultimo', (estado) => {
    expect(estadoMiDiscipulado(hechos({ ultimaSolicitud: ultima(estado) }))).toEqual({ estado: 'puede_pedir', ultimo: estado });
  });

  it('abandono como lo último → baja (y puede volver a pedir)', () => {
    expect(estadoMiDiscipulado(hechos({ ultimaSolicitud: ultima('aprobada', { estado: 'abandono', cerradaEn: HOY }) }))).toEqual({ estado: 'baja', en: HOY.toISOString() });
  });

  it('abandono y después volvió a pedir → buscando; y si esa la rechazaron → puede_pedir rechazada', () => {
    expect(estadoMiDiscipulado(hechos({ ultimaSolicitud: ultima('pendiente') })).estado).toBe('buscando');
    expect(estadoMiDiscipulado(hechos({ ultimaSolicitud: ultima('rechazada') }))).toEqual({ estado: 'puede_pedir', ultimo: 'rechazada' });
  });

  describe('menor de 12 (FR-044)', () => {
    it('sin Solicitud → lo_pide_su_tutor', () => {
      expect(estadoMiDiscipulado(hechos({ edad: 11 }))).toEqual({ estado: 'lo_pide_su_tutor' });
    });

    it('con una Solicitud creada en su nombre → el estado que corresponda (buscando)', () => {
      expect(estadoMiDiscipulado(hechos({ edad: 9, ultimaSolicitud: ultima('pendiente') })).estado).toBe('buscando');
    });

    it('con la Solicitud rechazada → lo_pide_su_tutor: no tiene botón que apretar', () => {
      expect(estadoMiDiscipulado(hechos({ edad: 9, ultimaSolicitud: ultima('rechazada') }))).toEqual({ estado: 'lo_pide_su_tutor' });
    });

    it('con 12 cumplidos → puede_pedir', () => {
      expect(estadoMiDiscipulado(hechos({ edad: 12 }))).toEqual({ estado: 'puede_pedir' });
    });
  });
});

describe('SolicitudDiscipuladoService.estadoPropio (T032)', () => {
  it('una Solicitud creada en su nombre se ve igual que una propia', async () => {
    const s = solicitud('ana', 'propuesta', { creadoPorId: 'admin' });
    const { service } = await crearServicio({
      personas: [{ id: 'ana' }],
      solicitudes: [s],
      franjas: [{ ...MARTES_19_A_21, solicitudId: s.id }],
      propuestas: [propuesta(s.id, 'disc-1')],
    });

    expect(await service.estadoPropio('ana')).toEqual({ estado: 'buscando', solicitudId: s.id, franjas: [MARTES_19_A_21], createdAt: s.createdAt.toISOString() });
  });

  it('tras una reasignación aceptada ve al Discipulador VIGENTE, no al anterior', async () => {
    const s = solicitud('ana', 'aprobada');
    const { service } = await crearServicio({
      personas: [{ id: 'ana' }, { id: 'viejo', nombre: 'Pedro' }, { id: 'nuevo', nombre: 'Marta', apellido: 'Gómez', telefono: '1155' }],
      solicitudes: [s],
      inscripciones: [{ personaId: 'ana', grupoId: 'g1', solicitudId: s.id, estado: 'activa', createdAt: AYER, cerradaEn: null }],
      liderazgos: [
        { grupoId: 'g1', personaId: 'viejo', hasta: AYER },
        { grupoId: 'g1', personaId: 'nuevo', hasta: null },
      ],
    });

    expect(await service.estadoPropio('ana')).toMatchObject({ estado: 'en_curso', discipulador: { nombre: 'Marta', apellido: 'Gómez', telefono: '1155' } });
  });

  it('menor de 12 sin nada → lo_pide_su_tutor', async () => {
    const { service } = await crearServicio({ personas: [{ id: 'nina', fechaNacimiento: haceAnios(10) }] });

    expect(await service.estadoPropio('nina')).toEqual({ estado: 'lo_pide_su_tutor' });
  });
});
