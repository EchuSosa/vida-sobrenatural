import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

/**
 * H-17 (revisión manual, actualización 2026-09-18): los e2e de apps/web crean
 * Personas reales (`POST /registro`) contra la API que tengan levantada —
 * por defecto la de desarrollo (`localhost:3333` / DB `vidasobrenatural`), no
 * una aislada — y no se borraban nunca. Cada Persona de e2e tiene el email
 * con el prefijo `e2e-` (ver apps/web/e2e/*.spec.ts, apps/backoffice/e2e/*.spec.ts);
 * este script borra físicamente (no soft-delete — son datos de test, no del
 * dominio, el Principio III no aplica acá) todo lo que matchee ese prefijo.
 * Se corre automáticamente como `globalTeardown` de Playwright
 * (apps/web/playwright.config.ts, apps/backoffice/playwright.config.ts).
 *
 * H-34 (revisión manual ronda 3): los e2e de H-29 en apps/backoffice vinculan
 * un tutor con una Relación Familiar real — sin borrar esas filas primero,
 * `persona.deleteMany` choca con la FK de `relacionFamiliar` (tanto del lado
 * `personaId` como `familiarId`) y no borra nada.
 */
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const idsE2E = (
    await prisma.persona.findMany({ where: { email: { startsWith: 'e2e-' } }, select: { id: true } })
  ).map((p) => p.id);

  if (idsE2E.length > 0) {
    await prisma.relacionFamiliar.deleteMany({
      where: { OR: [{ personaId: { in: idsE2E } }, { familiarId: { in: idsE2E } }] },
    });
  }

  const { count } = await prisma.persona.deleteMany({
    where: { email: { startsWith: 'e2e-' } },
  });
  console.log(`limpiar-e2e: ${count} Persona(s) de e2e borradas.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
