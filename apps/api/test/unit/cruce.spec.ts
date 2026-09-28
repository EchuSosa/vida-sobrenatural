import type { Franja } from '@vida-sobrenatural/shared-types';
import { armarCruce, type CandidatoCruce } from '../../src/discipulado/cruce-puro.js';

/**
 * specs/004, T011c (FR-034/FR-035): el reparto por franja, las reglas (D138) y
 * la sugerencia, sobre candidatos ya cargados. La parte de base (disponibles,
 * gruposConLugar) se prueba en integración; esto es la lógica pura.
 */
const martes: Franja = { diaSemana: 2, inicio: 1080, fin: 1200 }; // 18:00–20:00
const sabado: Franja = { diaSemana: 6, inicio: 600, fin: 780 }; // 10:00–13:00

function candidato(over: Partial<CandidatoCruce> & { id: string; apellido: string }): CandidatoCruce {
  return {
    nombre: 'N',
    genero: 'femenino',
    franjas: [martes],
    carga: { discipuladosActivos: 0, propuestasPendientes: 0 },
    gruposConLugar: [],
    ...over,
  };
}

describe('armarCruce', () => {
  it('sin candidatos → sinDisponibles, sin sugerido', () => {
    const cruce = armarCruce([], { franjas: [martes], genero: 'femenino' });
    expect(cruce.sinDisponibles).toBe(true);
    expect(cruce.sugeridoId).toBeNull();
    expect(cruce.franjas).toEqual([{ franja: martes, coinciden: [] }]);
  });

  it('hay candidatos pero ninguno coincide en horario → coinciden vacío, noCoinciden con "horario", sin sugerido', () => {
    const c = candidato({ id: 'a', apellido: 'A', franjas: [sabado] });
    const cruce = armarCruce([c], { franjas: [martes], genero: 'femenino' });
    expect(cruce.sinDisponibles).toBe(false);
    expect(cruce.franjas[0].coinciden).toEqual([]);
    expect(cruce.noCoinciden).toHaveLength(1);
    expect(cruce.noCoinciden[0].incumple).toEqual(['horario']);
    expect(cruce.sugeridoId).toBeNull();
  });

  it('un candidato que cubre dos franjas objetivo aparece en las dos', () => {
    const c = candidato({ id: 'a', apellido: 'A', franjas: [martes, sabado] });
    const cruce = armarCruce([c], { franjas: [martes, sabado], genero: 'femenino' });
    expect(cruce.franjas[0].coinciden.map((d) => d.id)).toEqual(['a']);
    expect(cruce.franjas[1].coinciden.map((d) => d.id)).toEqual(['a']);
    expect(cruce.sugeridoId).toBe('a');
  });

  it('género distinto → va a noCoinciden con "genero", aunque coincida el horario', () => {
    const c = candidato({ id: 'a', apellido: 'A', genero: 'masculino' });
    const cruce = armarCruce([c], { franjas: [martes], genero: 'femenino' });
    expect(cruce.franjas[0].coinciden).toEqual([]);
    expect(cruce.noCoinciden[0].incumple).toEqual(['genero']);
    expect(cruce.sugeridoId).toBeNull();
  });

  it('sugerido = menor carga (discipulados activos + propuestas pendientes)', () => {
    const cargado = candidato({ id: 'a', apellido: 'A', carga: { discipuladosActivos: 2, propuestasPendientes: 1 } });
    const libre = candidato({ id: 'b', apellido: 'B', carga: { discipuladosActivos: 0, propuestasPendientes: 1 } });
    const cruce = armarCruce([cargado, libre], { franjas: [martes], genero: 'femenino' });
    expect(cruce.sugeridoId).toBe('b');
  });

  it('empate de carga → sugerido por apellido y nombre', () => {
    const zeta = candidato({ id: 'z', apellido: 'Zabala' });
    const abel = candidato({ id: 'x', apellido: 'Abel' });
    const cruce = armarCruce([zeta, abel], { franjas: [martes], genero: 'femenino' });
    expect(cruce.sugeridoId).toBe('x');
  });

  it('pasa a través los gruposConLugar del candidato (FR-045)', () => {
    const c = candidato({ id: 'a', apellido: 'A', gruposConLugar: [{ grupoId: 'g1', ocupado: 1, maximo: 3, coincideHorario: true, personas: ['Ana P'] }] });
    const cruce = armarCruce([c], { franjas: [martes], genero: 'femenino' });
    expect(cruce.franjas[0].coinciden[0].gruposConLugar).toEqual([{ grupoId: 'g1', ocupado: 1, maximo: 3, coincideHorario: true, personas: ['Ana P'] }]);
  });
});
