import type { NombreRegla } from '@vida-sobrenatural/shared-types';
import { reglaHorario } from '../../src/discipulado/reglas-de-asignacion/horario.js';
import { reglaGenero } from '../../src/discipulado/reglas-de-asignacion/genero.js';
import { REGLAS, evaluar } from '../../src/discipulado/reglas-de-asignacion/reglas.js';

/**
 * specs/004, T011a (D138): cada regla por separado y `evaluar` juntas. El
 * último test es la red que evita que una regla nueva quede a medias: toda
 * `NombreRegla` de shared-types tiene que estar en la lista.
 */
const martesTarde = { diaSemana: 2, inicio: 1080, fin: 1200 }; // 18:00–20:00
const martesTardeCorto = { diaSemana: 2, inicio: 1080, fin: 1140 }; // 18:00–19:00
const sabadoManiana = { diaSemana: 6, inicio: 600, fin: 780 }; // 10:00–13:00

describe('reglaHorario', () => {
  it('cumple si alguna franja de la Solicitud coincide con alguna de la agenda', () => {
    expect(
      reglaHorario.cumple({
        solicitud: { franjas: [martesTarde], genero: 'femenino' },
        discipulador: { franjas: [sabadoManiana, martesTardeCorto], genero: 'femenino' },
      }),
    ).toBe(true);
  });

  it('no cumple si ninguna franja coincide', () => {
    expect(
      reglaHorario.cumple({
        solicitud: { franjas: [martesTarde], genero: 'femenino' },
        discipulador: { franjas: [sabadoManiana], genero: 'femenino' },
      }),
    ).toBe(false);
  });
});

describe('reglaGenero', () => {
  it('cumple con el mismo género', () => {
    expect(reglaGenero.cumple({ solicitud: { franjas: [], genero: 'masculino' }, discipulador: { franjas: [], genero: 'masculino' } })).toBe(true);
  });
  it('no cumple con distinto género', () => {
    expect(reglaGenero.cumple({ solicitud: { franjas: [], genero: 'masculino' }, discipulador: { franjas: [], genero: 'femenino' } })).toBe(false);
  });
});

describe('evaluar', () => {
  it('cumple todas → incumple vacío', () => {
    expect(
      evaluar({ solicitud: { franjas: [martesTarde], genero: 'femenino' }, discipulador: { franjas: [martesTarde], genero: 'femenino' } }),
    ).toEqual({ cumpleTodas: true, incumple: [] });
  });

  it('solo falla género', () => {
    expect(
      evaluar({ solicitud: { franjas: [martesTarde], genero: 'femenino' }, discipulador: { franjas: [martesTarde], genero: 'masculino' } }),
    ).toEqual({ cumpleTodas: false, incumple: ['genero'] });
  });

  it('fallan las dos, en el orden de la lista', () => {
    expect(
      evaluar({ solicitud: { franjas: [martesTarde], genero: 'femenino' }, discipulador: { franjas: [sabadoManiana], genero: 'masculino' } }),
    ).toEqual({ cumpleTodas: false, incumple: ['horario', 'genero'] });
  });
});

describe('cobertura de reglas', () => {
  it('toda NombreRegla vigente tiene su regla en la lista', () => {
    const nombresEnLista = new Set(REGLAS.map((r) => r.nombre));
    const todos: NombreRegla[] = ['horario', 'genero'];
    for (const n of todos) expect(nombresEnLista.has(n)).toBe(true);
    expect(REGLAS.length).toBe(todos.length);
  });
});
