import 'dotenv/config';
import { parseArgs } from 'node:util';
import { PrismaPg } from '@prisma/adapter-pg';
import { EDAD_MINIMA_ROL_DE_CARGO } from '@vida-sobrenatural/shared-types';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { calcularEdad } from '../src/persona/calcular-edad.js';

/**
 * specs/005-roles-permisos-acceso, Historia 1 (FR-001/FR-003/FR-004, D130/D131,
 * contracts/cli-recrear-admin.md): siembra o recupera el Admin de una
 * instalación. Es parte de INSTALAR el sistema para una iglesia
 * (docs/21-instalacion.md), no una utilidad de desarrollo — el atajo de
 * desarrollo sigue siendo `SEED_ADMIN_EMAIL` del seed (H-12).
 *
 * Va directo contra Postgres, sin pasar por la API: tiene que funcionar
 * justo cuando no queda ningún Admin que pueda entrar, aunque la API esté
 * caída (research.md #4). Idempotente — la primera instalación y la
 * recuperación de acceso son la misma operación en dos momentos:
 *
 * 1. No existe la Persona → la crea con `admin` y `adminSembrado = true`.
 *    Nombre, apellido, género y fecha de nacimiento se piden como datos
 *    reales porque la propia Persona no puede corregirlos después desde su
 *    Perfil (Flujo 11 solo edita contacto, estado civil y profesión); el
 *    resto queda con un valor provisorio que sí puede completar ahí.
 * 2. Existe sin `admin` → se lo agrega (acumulativo) y marca `adminSembrado`.
 * 3. Ya tiene las dos cosas → no toca nada y lo informa.
 *
 * FR-011 aplica también acá ("sin importar el camino"): un menor de edad
 * no recibe el rol, ni al crearlo ni si ya existía.
 */

const USO = `Uso:
  pnpm --filter api run db:recrear-admin -- --email <email>
      (la Persona ya existe: se registró desde la web)

  pnpm --filter api run db:recrear-admin -- --email <email> \\
      --nombre <nombre> --apellido <apellido> \\
      --genero <femenino|masculino> --fecha-nacimiento <AAAA-MM-DD>
      (la Persona todavía no existe: se crea)`;

const GENEROS = ['femenino', 'masculino'] as const;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Valores provisorios de los campos que la Persona completa después desde
// su Perfil (PATCH /personas/me). No se inventa consentimiento: queda en
// false hasta que lo dé ella misma.
const DATOS_PROVISORIOS = {
  telefono: 'A completar',
  direccion: 'A completar',
  estadoCivil: 'soltero_a',
  profesion: 'otro',
  profesionDetalle: 'A completar',
  tiempoCongregacion: 'menos_6_meses',
} as const;

function fallar(mensaje: string): never {
  console.error(`recrear-admin: ${mensaje}\n\n${USO}`);
  process.exit(1);
}

const { values } = parseArgs({
  args: process.argv.slice(2).filter((arg) => arg !== '--'),
  options: {
    email: { type: 'string' },
    nombre: { type: 'string' },
    apellido: { type: 'string' },
    genero: { type: 'string' },
    'fecha-nacimiento': { type: 'string' },
  },
});

const email = values.email?.trim().toLowerCase() || fallar('falta --email.');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function rechazarSiEsMenor(fechaNacimiento: Date) {
  if (calcularEdad(fechaNacimiento) < EDAD_MINIMA_ROL_DE_CARGO) {
    fallar(
      `${email} es menor de ${EDAD_MINIMA_ROL_DE_CARGO} años — el sistema no otorga roles de cargo a menores de edad (FR-011).`,
    );
  }
}

async function main() {
  const existente = await prisma.persona.findUnique({ where: { email } });

  if (existente) {
    if (!existente.activo) {
      fallar(`${email} está dada de baja (activo = false) — no se le otorga el rol a una Persona que no puede entrar.`);
    }
    rechazarSiEsMenor(existente.fechaNacimiento);

    if (existente.rol.includes('admin') && existente.adminSembrado) {
      console.log(`recrear-admin: ${email} ya es el Admin sembrado — no se cambió nada.`);
      return;
    }
    await prisma.persona.update({
      where: { id: existente.id },
      data: {
        rol: existente.rol.includes('admin') ? existente.rol : [...existente.rol, 'admin'],
        adminSembrado: true,
      },
    });
    console.log(`recrear-admin: ${email} ahora es el Admin sembrado (se conservan sus otros roles).`);
    return;
  }

  const nombre = values.nombre?.trim();
  const apellido = values.apellido?.trim();
  const genero = values.genero?.trim();
  const fechaTexto = values['fecha-nacimiento']?.trim();
  if (!nombre || !apellido || !genero || !fechaTexto) {
    fallar(`no existe ninguna Persona con el email ${email}: para crearla hacen falta --nombre, --apellido, --genero y --fecha-nacimiento.`);
  }
  if (!GENEROS.includes(genero as (typeof GENEROS)[number])) {
    fallar(`--genero tiene que ser uno de: ${GENEROS.join(', ')}.`);
  }
  const fechaNacimiento = new Date(`${fechaTexto}T00:00:00Z`);
  if (!FECHA.test(fechaTexto) || Number.isNaN(fechaNacimiento.getTime())) {
    fallar('--fecha-nacimiento tiene que tener el formato AAAA-MM-DD.');
  }
  rechazarSiEsMenor(fechaNacimiento);

  const sede = await prisma.sede.findFirst({ where: { activo: true, eliminadoEn: null }, orderBy: { createdAt: 'asc' } });
  if (!sede) {
    fallar('no hay ninguna Sede activa — la Persona necesita una. Ver docs/21-instalacion.md, paso "Sede".');
  }

  const creada = await prisma.persona.create({
    data: {
      ...DATOS_PROVISORIOS,
      email,
      nombre,
      apellido,
      genero: genero as (typeof GENEROS)[number],
      fechaNacimiento,
      sedeId: sede.id,
      estado: 'activa',
      activo: true,
      consentimientoDatos: false,
      rol: ['admin'],
      adminSembrado: true,
    },
  });
  console.log(
    `recrear-admin: Admin sembrado creado — ${creada.email} (${creada.id}), Sede ${sede.nombre}. ` +
      'Al entrar, que complete su Perfil (teléfono, dirección, estado civil y profesión quedaron provisorios).',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
