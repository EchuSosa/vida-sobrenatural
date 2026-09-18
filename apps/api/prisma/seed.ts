import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// H-09 (revisión manual, actualización 2026-09-18): datos reales de
// docs/12-contenido-bienvenida.md / docs/09-notas-identidad-visual.md — antes
// tenía una dirección placeholder ("a confirmar") y un horario inventado
// ("10 y 18 hs") que no correspondía a ningún dato real.
const DIRECCION_REAL = 'Calle 23 N°1665 e/ 66 y 67, La Plata, Buenos Aires';
const HORARIOS_REAL = 'Domingos 10:30 hs (presencial y online, por YouTube)';

async function crearSedeDemo() {
  const existente = await prisma.sede.findFirst({ where: { activo: true } });
  if (existente) {
    // Corrige una Sede demo ya sembrada con los valores placeholder viejos,
    // sin pisar una Sede que un Admin ya haya editado a mano.
    if (existente.direccion.includes('a confirmar') || existente.horarios === 'Domingos 10 y 18 hs') {
      const corregida = await prisma.sede.update({
        where: { id: existente.id },
        data: { direccion: DIRECCION_REAL, horarios: HORARIOS_REAL },
      });
      console.log(`Sede demo corregida con los datos reales: ${corregida.nombre} (${corregida.id})`);
      return corregida;
    }
    console.log(`Ya existe una Sede activa (${existente.nombre}), no se crea otra.`);
    return existente;
  }

  const sede = await prisma.sede.create({
    data: {
      nombre: 'La Plata',
      direccion: DIRECCION_REAL,
      contactoTelefono: '+54 9 221 000-0000',
      horarios: HORARIOS_REAL,
      descripcionBienvenida:
        'Bienvenido/a a Vida Sobrenatural La Plata. Nos alegra que te hayas acercado.',
      activo: true,
    },
  });

  console.log(`Sede creada: ${sede.nombre} (${sede.id})`);
  return sede;
}

/**
 * Personas de ejemplo, mínimo viable — Historia 8 (specs/002-base-transversal,
 * Clarifications): una o dos por cada estado ya definido en el spec 001, con
 * nombres genéricos en español que nunca podrían confundirse con una persona
 * real. Idempotente (por email), igual que la Sede — se puede ampliar sin
 * rehacer lo ya generado (FR-041).
 */
async function crearPersonasDemo(sedeId: string) {
  const datosComunes = {
    direccion: 'Calle 50 y 15, La Plata',
    sedeId,
    estadoCivil: 'soltero_a' as const,
    profesion: 'otro' as const,
    profesionDetalle: 'Dato de ejemplo',
    tiempoCongregacion: 'menos_6_meses' as const,
  };

  const personas: Array<Parameters<typeof prisma.persona.create>[0]['data']> = [
    {
      ...datosComunes,
      email: 'demo-activa@example.com',
      nombre: 'Ana',
      apellido: 'Ejemplo',
      genero: 'femenino',
      fechaNacimiento: new Date('1990-05-20'),
      telefono: '+54 9 221 100-0001',
      estado: 'activa',
      activo: true,
      consentimientoDatos: true,
      rol: ['miembro_registrado'],
    },
    {
      ...datosComunes,
      email: 'demo-pendiente-tutor@example.com',
      nombre: 'Juan',
      apellido: 'Demo',
      genero: 'masculino',
      fechaNacimiento: new Date('2012-03-10'),
      telefono: '+54 9 221 100-0002',
      estado: 'pendiente_tutor',
      activo: true,
      consentimientoDatos: false,
      rol: [],
    },
    {
      ...datosComunes,
      email: 'demo-inactiva@example.com',
      nombre: 'Sofía',
      apellido: 'Prueba',
      genero: 'femenino',
      fechaNacimiento: new Date('2011-08-15'),
      telefono: '+54 9 221 100-0003',
      estado: 'pendiente_tutor',
      // Caso no autorizado por el tutor — FR-014/T091 (Historia 8, Acceptance
      // Scenario 2: cubre también el estado "inactiva").
      activo: false,
      consentimientoDatos: false,
      rol: [],
    },
  ];

  for (const persona of personas) {
    const existente = await prisma.persona.findUnique({ where: { email: persona.email } });
    if (existente) {
      console.log(`Ya existe una Persona demo con email ${persona.email}, no se duplica.`);
      continue;
    }
    const creada = await prisma.persona.create({ data: persona });
    console.log(`Persona demo creada: ${creada.nombre} ${creada.apellido} (${creada.estado}, activo=${creada.activo})`);
  }
}

async function main() {
  const sede = await crearSedeDemo();
  await crearPersonasDemo(sede.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
