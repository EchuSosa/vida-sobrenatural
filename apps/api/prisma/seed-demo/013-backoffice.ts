import { festejoEnAnio, hoyEnArgentina, sumarDias } from '@vida-sobrenatural/shared-types';
import type { ContextoSeedDemo } from './contexto.js';

/**
 * spec 013 — su parte del seed demo (D120, T090): Personas para ver los
 * cumpleaños (hoy, mañana, el último día del mes y un 29 de febrero), una
 * Persona con Relaciones Familiares en las dos direcciones y un nombre largo
 * con tildes. Idempotente: por email (`demo-013-…`). Las fechas de "hoy" y
 * "mañana" se recalculan en cada corrida.
 */
export async function sembrarDemo013(ctx: ContextoSeedDemo): Promise<void> {
  const { prisma, sedes } = ctx;
  const hoy = hoyEnArgentina();
  const anio = Number(hoy.slice(0, 4));
  // El primero del mes que viene, menos un día.
  const ultimoDelMes = sumarDias(new Date(Date.UTC(anio, Number(hoy.slice(5, 7)), 1)).toISOString().slice(0, 10), -1);
  const fechas = {
    hoy: `${anio - 34}${hoy.slice(4)}`,
    manana: `${anio - 27}${sumarDias(hoy, 1).slice(4)}`,
    finDeMes: `${anio - 45}${ultimoDelMes.slice(4)}`,
    bisiesto: festejoEnAnio('2000-02-29', 2000),
  };
  const base = {
    genero: 'femenino' as const,
    telefono: '+54 9 221 555-0130',
    direccion: 'Calle 13 N°1300, La Plata',
    sedeId: sedes.laPlata,
    estadoCivil: 'casado_a' as const,
    profesion: 'educacion' as const,
    congregaDesde: anio - 3,
    estado: 'activa' as const,
    consentimientoDatos: true,
    consentimientoDatosFecha: new Date(),
    consentimientoDatosOrigen: 'app' as const,
    rol: ['miembro_registrado'],
  };
  const personas = [
    { email: 'demo-013-cumple-hoy@example.com', nombre: 'Lucía', apellido: 'Cumpleañera de Hoy', fechaNacimiento: fechas.hoy },
    { email: 'demo-013-cumple-manana@example.com', nombre: 'Martín', apellido: 'Cumple Mañana', fechaNacimiento: fechas.manana, genero: 'masculino' as const },
    { email: 'demo-013-cumple-fin-de-mes@example.com', nombre: 'Josefina', apellido: 'Fin de Mes', fechaNacimiento: fechas.finDeMes },
    { email: 'demo-013-cumple-29-febrero@example.com', nombre: 'Bisiesta', apellido: 'Veintinueve de Febrero', fechaNacimiento: fechas.bisiesto },
    { email: 'demo-013-familia-madre@example.com', nombre: 'María Ángeles', apellido: 'Núñez de la Peña Ibáñez', fechaNacimiento: '1970-06-15' },
    { email: 'demo-013-familia-hijo@example.com', nombre: 'Joaquín', apellido: 'Núñez de la Peña', fechaNacimiento: '1998-09-02', genero: 'masculino' as const },
  ];
  const ids: Record<string, string> = {};
  for (const p of personas) {
    const fechaNacimiento = new Date(`${p.fechaNacimiento}T00:00:00Z`);
    const persona = await prisma.persona.upsert({
      where: { email: p.email },
      update: { fechaNacimiento },
      create: { ...base, ...p, fechaNacimiento },
      select: { id: true },
    });
    ids[p.email] = persona.id;
  }
  // La madre carga a su hijo (hijo_a, desde ella); el hijo carga a la madre de cumpleañera de hoy como hermana (desde él):
  // así el perfil de cada uno muestra un vínculo guardado de su lado y otro del otro lado.
  const vinculos = [
    { personaId: ids['demo-013-familia-madre@example.com'], familiarId: ids['demo-013-familia-hijo@example.com'], tipoRelacion: 'hijo_a' as const },
    { personaId: ids['demo-013-familia-hijo@example.com'], familiarId: ids['demo-013-cumple-hoy@example.com'], tipoRelacion: 'hermano_a' as const },
  ];
  for (const v of vinculos) {
    await prisma.relacionFamiliar.upsert({ where: { personaId_familiarId_tipoRelacion: v }, update: {}, create: v });
  }
}
