import { hoyEnArgentina } from '@vida-sobrenatural/shared-types';
import type { ContextoSembrarE2e } from './contexto.js';

/**
 * Ids fijos de las Personas del perfil (spec 013, T035): el e2e entra por URL
 * sin tener que buscarlas (una dada de baja no aparece en el listado, y un
 * menor no aparece en `GET /personas`, que es `soloMayores`).
 */
export const PERFIL_E2E = {
  conFoto: '0013e2e0-0000-4000-8000-000000000001',
  menor: '0013e2e0-0000-4000-8000-000000000002',
  tutor: '0013e2e0-0000-4000-8000-000000000003',
  baja: '0013e2e0-0000-4000-8000-000000000004',
  cumpleHoy: '0013e2e0-0000-4000-8000-000000000005',
} as const;

/** Un PNG de 1×1 como data URI: la "foto de Google" sin depender de la red en el CI. */
const FOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

/** spec 013 — fixtures del perfil de Persona. Idempotente (upsert por id). */
export async function sembrarE2e013(ctx: ContextoSembrarE2e): Promise<void> {
  const { prisma, sedeId } = ctx;
  const anioMenor = new Date().getUTCFullYear() - 10;
  const base = {
    genero: 'femenino' as const,
    telefono: '+54 9 221 900-1300',
    direccion: 'Calle 13 y 50, La Plata',
    sedeId,
    estadoCivil: 'soltero_a' as const,
    profesion: 'estudiante' as const,
    congregaDesde: 2019,
    estado: 'activa' as const,
    consentimientoDatos: true,
    consentimientoDatosFecha: new Date('2026-01-10T12:00:00Z'),
    consentimientoDatosOrigen: 'app' as const,
    rol: ['miembro_registrado'],
  };
  const personas = [
    { id: PERFIL_E2E.conFoto, email: 'e2e-perfil-con-foto@example.com', nombre: 'Ana', apellido: 'Perfil Con Foto', fechaNacimiento: new Date('1990-05-20'), fotoUrl: FOTO },
    { id: PERFIL_E2E.tutor, email: 'e2e-perfil-tutor@example.com', nombre: 'Tomás', apellido: 'Perfil Tutor', fechaNacimiento: new Date('1980-03-03'), fotoUrl: null },
    {
      id: PERFIL_E2E.menor,
      email: 'e2e-perfil-menor@example.com',
      nombre: 'Mía',
      apellido: 'Perfil Menor',
      fechaNacimiento: new Date(`${anioMenor}-04-04`),
      fotoUrl: null,
      consentimientoDatosOrigen: 'presencial' as const,
    },
    // spec 013 (T053): cumple 30 hoy (fecha civil de Argentina del día de la corrida).
    { id: PERFIL_E2E.cumpleHoy, email: 'e2e-cumple-hoy@example.com', nombre: 'Celia', apellido: 'Cumple Hoy', fechaNacimiento: new Date(`${Number(hoyEnArgentina().slice(0, 4)) - 30}${hoyEnArgentina().slice(4)}`), fotoUrl: null },
    { id: PERFIL_E2E.baja, email: 'e2e-perfil-baja@example.com', nombre: 'Berta', apellido: 'Perfil Baja', fechaNacimiento: new Date('1975-07-07'), fotoUrl: null, activo: false },
  ];
  for (const p of personas) {
    // La fecha del cumpleaños de hoy se actualiza en cada corrida; el resto queda como se creó.
    await prisma.persona.upsert({ where: { id: p.id }, update: p.id === PERFIL_E2E.cumpleHoy ? { fechaNacimiento: p.fechaNacimiento } : {}, create: { ...base, ...p } });
  }
  const vinculo = { personaId: PERFIL_E2E.menor, familiarId: PERFIL_E2E.tutor, tipoRelacion: 'tutor' as const };
  await prisma.relacionFamiliar.upsert({ where: { personaId_familiarId_tipoRelacion: vinculo }, update: {}, create: vinculo });
}
