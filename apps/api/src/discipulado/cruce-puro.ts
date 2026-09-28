import type { Cruce, DiscipuladorEnCruce, Franja, GrupoConLugar } from '@vida-sobrenatural/shared-types';
import { franjasCoinciden } from '@vida-sobrenatural/shared-types';
import { evaluar } from './reglas-de-asignacion/reglas.js';

/**
 * Un candidato ya cargado de la base (con su agenda y su carga), listo para
 * cruzar. `armarCruce` es puro sobre esto: las reglas (D138), el reparto por
 * franja y la sugerencia (FR-035) sin tocar la base — así se prueba solo.
 */
export interface CandidatoCruce {
  id: string;
  nombre: string;
  apellido: string;
  genero: string;
  franjas: Franja[];
  carga: { discipuladosActivos: number; propuestasPendientes: number };
  gruposConLugar: GrupoConLugar[];
}

function aEnCruce(c: CandidatoCruce): DiscipuladorEnCruce {
  return {
    id: c.id,
    nombre: c.nombre,
    apellido: c.apellido,
    genero: c.genero,
    carga: c.carga,
    gruposConLugar: c.gruposConLugar,
  };
}

/**
 * FR-034/FR-035: por cada franja de la Persona, los candidatos que cumplen
 * TODAS las reglas y coinciden en esa franja; aparte, los que no cumplen
 * alguna, con cuáles. Sugerido = entre los que cumplen todas, el de menor
 * carga (discipulados activos + propuestas pendientes), empate por apellido y
 * nombre. Nunca oculta a nadie (D25).
 */
export function armarCruce(candidatos: CandidatoCruce[], objetivo: { franjas: Franja[]; genero: string }): Cruce {
  const conEvaluacion = candidatos.map((c) => ({
    c,
    ev: evaluar({ solicitud: { franjas: objetivo.franjas, genero: objetivo.genero }, discipulador: { franjas: c.franjas, genero: c.genero } }),
  }));

  const cumplenTodas = conEvaluacion.filter((x) => x.ev.cumpleTodas).map((x) => x.c);

  const franjas = objetivo.franjas.map((franja) => ({
    franja,
    coinciden: cumplenTodas
      .filter((c) => c.franjas.some((fa) => franjasCoinciden(franja, fa)))
      .map(aEnCruce),
  }));

  const noCoinciden = conEvaluacion
    .filter((x) => !x.ev.cumpleTodas)
    .map((x) => ({ ...aEnCruce(x.c), incumple: x.ev.incumple }));

  const sugerido = [...cumplenTodas].sort((a, b) => {
    const ca = a.carga.discipuladosActivos + a.carga.propuestasPendientes;
    const cb = b.carga.discipuladosActivos + b.carga.propuestasPendientes;
    if (ca !== cb) return ca - cb;
    return (a.apellido + a.nombre).localeCompare(b.apellido + b.nombre, 'es');
  })[0];

  return {
    franjas,
    noCoinciden,
    sugeridoId: sugerido ? sugerido.id : null,
    sinDisponibles: candidatos.length === 0,
  };
}
