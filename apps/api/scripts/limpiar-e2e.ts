import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

/**
 * H-17 (revisión manual, actualización 2026-09-18): los e2e de apps/web y
 * apps/backoffice crean entidades reales contra la API que tengan levantada
 * —por defecto la de desarrollo (`localhost:3333` / DB `vidasobrenatural`),
 * no una aislada— y no se borraban nunca. Cada entidad de e2e lleva el
 * prefijo `e2e-` en un campo de texto (ver apps/web/e2e/*.spec.ts,
 * apps/backoffice/e2e/*.spec.ts); este script borra físicamente (no
 * soft-delete — son datos de test, no del dominio, el Principio III no
 * aplica acá) todo lo que matchee ese prefijo. Se corre automáticamente
 * como `globalTeardown` de Playwright (apps/web/playwright.config.ts,
 * apps/backoffice/playwright.config.ts).
 *
 * H-67 (revisión manual ronda 6): el script solo borraba Personas — los e2e
 * de Sedes (Lote 5, H-34) quedaban en la base de desarrollo sin que nada
 * los limpiara. En vez de otro caso especial, `ENTIDADES_E2E` es la única
 * lista de "qué borrar" (Principio XI): cada entidad nueva que un test cree
 * con el prefijo `e2e-` se agrega ahí, no en un script aparte. El orden de
 * la lista importa — van primero las entidades que dependen de otra por FK
 * (RelacionFamiliar y Persona dependen de Sede vía `sedeId`), para que
 * borrar la dependiente no choque con la que todavía la referencia.
 */
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const ENTIDADES_E2E: { nombre: string; borrar: () => Promise<number> }[] = [
  {
    // H-34: sin borrar esto primero, `persona.deleteMany` choca con la FK de
    // `relacionFamiliar` (tanto del lado `personaId` como `familiarId`).
    nombre: 'RelacionFamiliar (de Personas de e2e)',
    borrar: async () => {
      const idsE2E = (
        await prisma.persona.findMany({ where: { email: { startsWith: 'e2e-' } }, select: { id: true } })
      ).map((p) => p.id);
      if (idsE2E.length === 0) return 0;
      const { count } = await prisma.relacionFamiliar.deleteMany({
        where: { OR: [{ personaId: { in: idsE2E } }, { familiarId: { in: idsE2E } }] },
      });
      return count;
    },
  },
  {
    nombre: 'Persona',
    borrar: async () => (await prisma.persona.deleteMany({ where: { email: { startsWith: 'e2e-' } } })).count,
  },
  {
    nombre: 'Sede',
    borrar: async () => (await prisma.sede.deleteMany({ where: { nombre: { startsWith: 'e2e-' } } })).count,
  },
  // specs/003-contenido-institucional: los e2e de Historia 3/4
  // (apps/backoffice/e2e/palabra-profetica.spec.ts, libros.spec.ts) crean
  // PalabraProfetica/Libro con `titulo` prefijado `e2e-` — mismo criterio
  // que el resto de la lista, agregado acá y no en un script aparte.
  {
    nombre: 'PalabraProfetica',
    borrar: async () => (await prisma.palabraProfetica.deleteMany({ where: { titulo: { startsWith: 'e2e-' } } })).count,
  },
  {
    nombre: 'Libro',
    borrar: async () => (await prisma.libro.deleteMany({ where: { titulo: { startsWith: 'e2e-' } } })).count,
  },
];

async function main() {
  for (const entidad of ENTIDADES_E2E) {
    const count = await entidad.borrar();
    console.log(`limpiar-e2e: ${count} ${entidad.nombre} de e2e borrada(s).`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
