import { pendientesDelDiscipulador, type MiDiscipulado, type PropuestaParaMi } from '@vida-sobrenatural/shared-types';

/**
 * spec 006, T054 (FR-021, FR-022): los pendientes del Discipulador — propuestas
 * por responder y rechazos del Admin todavía no vueltos a proponer.
 */
function persona(nombre: string, extra: Partial<MiDiscipulado['personas'][number]> = {}): MiDiscipulado['personas'][number] {
  return {
    personaId: nombre,
    inscripcionId: `i-${nombre}`,
    nombre,
    apellido: 'Pérez',
    edad: 30,
    contacto: { telefono: '1', direccion: 'x', tutor: null },
    bajaPropuesta: null,
    bajaRechazada: null,
    ...extra,
  };
}

function discipulado(extra: Partial<MiDiscipulado> = {}): MiDiscipulado {
  return {
    grupoId: 'g1',
    personas: [persona('Ana')],
    desde: '2026-09-01T00:00:00Z',
    estado: 'en_curso',
    lugar: { ocupado: 1, maximo: 1 },
    propuestaFinalizacionEn: null,
    finalizacionRechazada: null,
    ...extra,
  };
}

const propuesta = { propuestaId: 'p1' } as PropuestaParaMi;

describe('pendientesDelDiscipulador (spec 006, T054)', () => {
  it('sin nada: cero', () => {
    expect(pendientesDelDiscipulador({ propuestas: [], discipulados: [discipulado()] })).toEqual({ propuestas: 0, rechazos: [], total: 0 });
  });

  it('cuenta las propuestas por responder', () => {
    expect(pendientesDelDiscipulador({ propuestas: [propuesta, propuesta], discipulados: [] }).total).toBe(2);
  });

  it('una finalización rechazada cuenta hasta que la vuelve a proponer', () => {
    const rechazada = discipulado({ finalizacionRechazada: { en: '2026-10-02T00:00:00Z', motivo: 'Falta un encuentro' } });
    expect(pendientesDelDiscipulador({ propuestas: [], discipulados: [rechazada] })).toEqual({
      propuestas: 0,
      rechazos: [{ tipo: 'finalizacion', grupoId: 'g1', personas: ['Ana Pérez'], en: '2026-10-02T00:00:00Z', motivo: 'Falta un encuentro' }],
      total: 1,
    });
    const reprpuesta = { ...rechazada, propuestaFinalizacionEn: '2026-10-05T00:00:00Z' };
    expect(pendientesDelDiscipulador({ propuestas: [], discipulados: [reprpuesta] }).total).toBe(0);
    const propuestaVieja = { ...rechazada, propuestaFinalizacionEn: '2026-10-01T00:00:00Z' };
    expect(pendientesDelDiscipulador({ propuestas: [], discipulados: [propuestaVieja] }).total).toBe(1);
  });

  it('una baja rechazada cuenta por Persona hasta que la vuelve a proponer', () => {
    const d = discipulado({
      personas: [
        persona('Ana', { bajaRechazada: { en: '2026-10-02T00:00:00Z', motivo: null } }),
        persona('Beto', { bajaRechazada: { en: '2026-10-02T00:00:00Z', motivo: null }, bajaPropuesta: { en: '2026-10-03T00:00:00Z', motivo: null } }),
      ],
    });
    const r = pendientesDelDiscipulador({ propuestas: [propuesta], discipulados: [d] });
    expect(r.rechazos).toEqual([{ tipo: 'baja', grupoId: 'g1', persona: 'Ana Pérez', en: '2026-10-02T00:00:00Z', motivo: null }]);
    expect(r.total).toBe(2);
  });

  it('un discipulado terminado no deja pendientes', () => {
    const terminado = discipulado({ estado: 'finalizado', finalizacionRechazada: { en: '2026-10-02T00:00:00Z', motivo: null } });
    expect(pendientesDelDiscipulador({ propuestas: [], discipulados: [terminado] }).total).toBe(0);
  });
});
