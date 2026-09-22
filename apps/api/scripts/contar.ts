import 'dotenv/config';
import { createHash } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

/**
 * H-78: cuenta y saca huella de la base a la que apunte DATABASE_URL. Existe
 * para la verificación manual — la única prueba válida de que los e2e ya no
 * tocan la base de desarrollo es medir antes y después de correrlos.
 *
 * La cuenta sola no alcanza: si un test modifica un registro en vez de crear
 * uno, el total no se mueve. Por eso además va una huella de los ids y de los
 * campos que más se tocan; si algo cambió, la huella cambia aunque el número
 * quede igual.
 */
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function huella(valores: string[]): string {
  return createHash('sha256').update([...valores].sort().join('|')).digest('hex').slice(0, 12);
}

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? '');
  console.log(`\nBase: ${url.pathname.replace(/^\//, '')}  (${url.host})\n`);

  const [sedes, personas, libros, palabras, relaciones] = await Promise.all([
    prisma.sede.findMany({ select: { id: true, nombre: true, activo: true } }),
    prisma.persona.findMany({ select: { id: true, email: true, estado: true, activo: true } }),
    prisma.libro.findMany({ select: { id: true, titulo: true, orden: true, activo: true, portadaUrl: true } }),
    prisma.palabraProfetica.findMany({ select: { id: true, anio: true, vigente: true } }),
    prisma.relacionFamiliar.findMany({ select: { id: true } }),
  ]);

  const filas: [string, number, string][] = [
    ['Sedes', sedes.length, huella(sedes.map((s) => `${s.id}${s.nombre}${s.activo}`))],
    ['Personas', personas.length, huella(personas.map((p) => `${p.id}${p.email}${p.estado}${p.activo}`))],
    ['Libros', libros.length, huella(libros.map((l) => `${l.id}${l.titulo}${l.orden}${l.activo}${l.portadaUrl}`))],
    ['Palabras Proféticas', palabras.length, huella(palabras.map((p) => `${p.id}${p.anio}${p.vigente}`))],
    ['Relaciones familiares', relaciones.length, huella(relaciones.map((r) => r.id))],
  ];

  console.log('Tabla                    Filas   Huella');
  console.log('------------------------------------------');
  for (const [nombre, cantidad, h] of filas) {
    console.log(`${nombre.padEnd(24)} ${String(cantidad).padStart(5)}   ${h}`);
  }
  console.log(`\nHuella total: ${huella(filas.map(([n, c, h]) => `${n}${c}${h}`))}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
