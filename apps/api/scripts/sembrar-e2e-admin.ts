import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

/**
 * H-34 (revisión manual ronda 3): los e2e de `apps/backoffice` necesitan una
 * Persona con rol admin+discipulador para entrar a Pendientes de tutor y
 * Sedes vía el proveedor `test-login` — no existe un seed de demo con ese
 * rol (H-12: `SEED_ADMIN_EMAIL` promueve el email real de quien corre el
 * seed, no sirve para un fixture portable de test). Email con el prefijo
 * `e2e-` para que `db:limpiar-e2e` la borre al final de la corrida, igual
 * que las Personas que crean los e2e de `apps/web`. Idempotente — se corre
 * como `globalSetup` de `apps/backoffice/playwright.config.ts`.
 */
const EMAIL_ADMIN_E2E = 'e2e-admin@example.com';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const sede = await prisma.sede.findFirst({ where: { activo: true } });
  if (!sede) {
    throw new Error('sembrar-e2e-admin: no hay ninguna Sede activa — corré db:seed primero.');
  }

  const existente = await prisma.persona.findUnique({ where: { email: EMAIL_ADMIN_E2E } });
  if (existente) {
    console.log(`sembrar-e2e-admin: ${EMAIL_ADMIN_E2E} ya existe, no se duplica.`);
    return;
  }

  const creada = await prisma.persona.create({
    data: {
      email: EMAIL_ADMIN_E2E,
      nombre: 'Admin',
      apellido: 'E2E',
      genero: 'femenino',
      fechaNacimiento: new Date('1990-01-01'),
      telefono: '+54 9 221 900-0000',
      direccion: 'Calle 50 y 15, La Plata',
      sedeId: sede.id,
      estadoCivil: 'soltero_a',
      profesion: 'otro',
      profesionDetalle: 'Fixture de e2e',
      tiempoCongregacion: 'menos_6_meses',
      estado: 'activa',
      activo: true,
      consentimientoDatos: true,
      rol: ['admin', 'discipulador'],
    },
  });
  console.log(`sembrar-e2e-admin: Persona creada ${creada.email} (${creada.id}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
