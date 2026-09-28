import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

/**
 * H-34 (revisión manual ronda 3): los e2e de `apps/backoffice` necesitan una
 * Persona con rol de cargo para entrar vía el proveedor `test-login`. Una
 * Persona POR ROL de cargo (specs/005, T073/H-138): e2e-admin es `admin` a
 * secas — antes tenía admin + discipulador + lider_curso, y ningún e2e podía
 * distinguir "el Admin puede X" de "alguna de las tres puede X". No existe un seed de demo con ese
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
// El Discipulador de e2e (el nombre viene de cuando era "otro rol, ni Admin
// ni Pastor"; hoy es la Persona con `discipulador` a secas).
const EMAIL_OTRO_ROL_E2E = 'e2e-otro-rol@example.com';
const EMAIL_LIDER_CURSO_E2E = 'e2e-lider-curso@example.com';
// specs/005, T062: un Admin sembrado (FR-002) — para verificar que la pantalla
// no le ofrece a nadie quitarle el rol de Admin.
const EMAIL_SEMBRADO_E2E = 'e2e-sembrado@example.com';
// specs/004-vida-nueva-discipulado (T009): tres Discipuladores para los e2e de
// la 004. Uno femenino con agenda (martes y sábado), uno masculino con agenda
// (martes), y uno sin agenda ni disponibilidad (como arranca cualquiera, para
// el estado vacío de FR-047).
const EMAIL_DISCIPULADOR_E2E = 'e2e-discipulador@example.com';
const EMAIL_DISCIPULADOR_2_E2E = 'e2e-discipulador-2@example.com';
const EMAIL_DISCIPULADOR_SIN_AGENDA_E2E = 'e2e-discipulador-sin-agenda@example.com';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface OpcionesFixture {
  genero?: 'femenino' | 'masculino';
  adminSembrado?: boolean;
  disponibleDiscipulado?: boolean;
  /** Franjas de agenda (FR-031): día 0..6, inicio/fin en minutos desde las 0:00. */
  franjas?: Array<{ diaSemana: number; inicio: number; fin: number }>;
}

async function sembrarPersona(email: string, apellido: string, rol: string[], sedeId: string, opciones: OpcionesFixture = {}) {
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
      genero: opciones.genero ?? 'femenino',
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
      adminSembrado: opciones.adminSembrado ?? false,
      disponibleDiscipulado: opciones.disponibleDiscipulado ?? false,
    },
  });
  if (opciones.franjas?.length) {
    await prisma.franjaAgenda.createMany({
      data: opciones.franjas.map((f) => ({ personaId: creada.id, ...f })),
    });
  }
  console.log(`sembrar-e2e-admin: Persona creada ${creada.email} (${creada.id}), rol=${rol.join(',')}.`);
}

async function main() {
  const sede = await prisma.sede.findFirst({ where: { activo: true } });
  if (!sede) {
    throw new Error('sembrar-e2e-admin: no hay ninguna Sede activa — corré db:seed primero.');
  }

  // T073 (H-138): una Persona por rol de cargo, cada una con UN solo rol. El
  // smoke de axe ya no depende de un superusuario: recorre cada ruta con la
  // Persona que tiene su permiso (axe-todas-las-rutas.spec.ts).
  await sembrarPersona(EMAIL_ADMIN_E2E, 'E2E', ['admin'], sede.id);
  await sembrarPersona(EMAIL_PASTOR_E2E, 'Pastor', ['pastor'], sede.id);
  await sembrarPersona(EMAIL_OTRO_ROL_E2E, 'OtroRol', ['discipulador'], sede.id);
  await sembrarPersona(EMAIL_LIDER_CURSO_E2E, 'LiderCurso', ['lider_curso'], sede.id);
  await sembrarPersona(EMAIL_SEMBRADO_E2E, 'Sembrado', ['admin'], sede.id, { adminSembrado: true });

  // specs/004 (T009): agenda en minutos desde las 0:00 — martes 19:00–21:00 =
  // {2, 1140, 1260}; sábado 10:00–13:00 = {6, 600, 780}. Los dos con agenda
  // arrancan disponibles (prendido por fixture, como si ya lo hubieran hecho);
  // el tercero queda sin agenda y apagado, para FR-047.
  await sembrarPersona(EMAIL_DISCIPULADOR_E2E, 'Discipuladora', ['discipulador'], sede.id, {
    genero: 'femenino',
    disponibleDiscipulado: true,
    franjas: [
      { diaSemana: 2, inicio: 1140, fin: 1260 },
      { diaSemana: 6, inicio: 600, fin: 780 },
    ],
  });
  await sembrarPersona(EMAIL_DISCIPULADOR_2_E2E, 'Discipulador', ['discipulador'], sede.id, {
    genero: 'masculino',
    disponibleDiscipulado: true,
    franjas: [{ diaSemana: 2, inicio: 1140, fin: 1260 }],
  });
  await sembrarPersona(EMAIL_DISCIPULADOR_SIN_AGENDA_E2E, 'SinAgenda', ['discipulador'], sede.id, {
    genero: 'femenino',
    disponibleDiscipulado: false,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
