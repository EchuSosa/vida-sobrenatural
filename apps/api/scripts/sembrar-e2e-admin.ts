import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

/**
 * H-34 (revisión manual ronda 3): los e2e de `apps/backoffice` necesitan una
 * Persona con rol de cargo para entrar vía el proveedor `test-login`. Hoy
 * e2e-admin tiene admin + discipulador + lider_curso (ver más abajo: el
 * tercero lo sumó H-132 para que el smoke de axe alcance las 18 rutas) —
 * con tres roles, ningún e2e distingue "el Admin puede X" de "alguna de
 * las tres puede X" (H-138, T073: una Persona por rol) — no existe un seed de demo con ese
 * rol (H-12: `SEED_ADMIN_EMAIL` promueve el email real de quien corre el
 * seed, no sirve para un fixture portable de test). Email con el prefijo
 * `e2e-` para que `db:limpiar-e2e` la borre al final de la corrida, igual
 * que las Personas que crean los e2e de `apps/web`. Idempotente — se corre
 * como `globalSetup` de `apps/backoffice/playwright.config.ts`.
 *
 * specs/003-contenido-institucional (Historias 3/4, D64): se suman acá
 * mismo (un solo hook de globalSetup, Principio IV) dos fixtures más —
 * Pastor (lee, no edita) y un rol que no es ni Admin ni Pastor (bloqueado
 * del todo) — para los e2e de Palabra Profética y Libros.
 */
const EMAIL_ADMIN_E2E = 'e2e-admin@example.com';
const EMAIL_PASTOR_E2E = 'e2e-pastor@example.com';
const EMAIL_OTRO_ROL_E2E = 'e2e-otro-rol@example.com';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function sembrarPersona(email: string, apellido: string, rol: string[], sedeId: string) {
  const existente = await prisma.persona.findUnique({ where: { email } });
  if (existente) {
    console.log(`sembrar-e2e-admin: ${email} ya existe, no se duplica.`);
    return;
  }

  const creada = await prisma.persona.create({
    data: {
      email,
      nombre: 'E2E',
      apellido,
      genero: 'femenino',
      fechaNacimiento: new Date('1990-01-01'),
      telefono: '+54 9 221 900-0000',
      direccion: 'Calle 50 y 15, La Plata',
      sedeId,
      estadoCivil: 'soltero_a',
      profesion: 'otro',
      profesionDetalle: 'Fixture de e2e',
      tiempoCongregacion: 'menos_6_meses',
      estado: 'activa',
      activo: true,
      consentimientoDatos: true,
      rol,
    },
  });
  console.log(`sembrar-e2e-admin: Persona creada ${creada.email} (${creada.id}), rol=${rol.join(',')}.`);
}

async function main() {
  const sede = await prisma.sede.findFirst({ where: { activo: true } });
  if (!sede) {
    throw new Error('sembrar-e2e-admin: no hay ninguna Sede activa — corré db:seed primero.');
  }

  // H-132: con `lider_curso` además, esta Persona alcanza las 18 rutas del
  // backoffice — el smoke de axe (axe-todas-las-rutas.spec.ts) las recorre
  // con ella y exige que ninguna le dé 404.
  await sembrarPersona(EMAIL_ADMIN_E2E, 'E2E', ['admin', 'discipulador', 'lider_curso'], sede.id);
  await sembrarPersona(EMAIL_PASTOR_E2E, 'Pastor', ['pastor'], sede.id);
  await sembrarPersona(EMAIL_OTRO_ROL_E2E, 'OtroRol', ['discipulador'], sede.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
