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
    // specs/005-roles-permisos-acceso: los cambios de rol de una Persona de
    // e2e (por personaId o por realizadoPorId) referencian a la Persona por FK
    // y hay que borrarlos antes que ella. Faltaba desde el 005 (ninguna suite
    // lo detectaba hasta que una corrida dejó una fila); se agrega acá, en la
    // única lista de "qué borrar" (Principio XI).
    nombre: 'CambioDeRol (de Personas de e2e)',
    borrar: async () => {
      const idsE2E = (
        await prisma.persona.findMany({ where: { email: { startsWith: 'e2e-' } }, select: { id: true } })
      ).map((p) => p.id);
      if (idsE2E.length === 0) return 0;
      const { count } = await prisma.cambioDeRol.deleteMany({
        where: { OR: [{ personaId: { in: idsE2E } }, { realizadoPorId: { in: idsE2E } }] },
      });
      return count;
    },
  },
  {
    // specs/004-vida-nueva-discipulado (T010): todo lo que cuelga de una
    // Persona de e2e (como discípula o como Discipuladora), en orden de FK.
    // Los Grupos no tienen prefijo propio: se los ubica por sus Inscripciones,
    // Liderazgos y Solicitudes de Personas de e2e.
    nombre: 'discipulado (de Personas de e2e)',
    borrar: async () => {
      const idsE2E = (
        await prisma.persona.findMany({ where: { email: { startsWith: 'e2e-' } }, select: { id: true } })
      ).map((p) => p.id);
      if (idsE2E.length === 0) return 0;

      const solicitudes = await prisma.solicitudDiscipulado.findMany({ where: { personaId: { in: idsE2E } }, select: { id: true } });
      const solicitudIds = solicitudes.map((s) => s.id);
      const grupoIds = [
        ...new Set([
          ...(await prisma.inscripcion.findMany({ where: { personaId: { in: idsE2E } }, select: { grupoId: true } })).map((i) => i.grupoId),
          ...(await prisma.liderazgo.findMany({ where: { personaId: { in: idsE2E } }, select: { grupoId: true } })).map((l) => l.grupoId),
        ]),
      ];

      let total = 0;
      const sumar = (c: { count: number }) => (total += c.count);
      if (grupoIds.length) sumar(await prisma.asistencia.deleteMany({ where: { encuentro: { grupoId: { in: grupoIds } } } }));
      if (grupoIds.length) sumar(await prisma.encuentro.deleteMany({ where: { grupoId: { in: grupoIds } } }));
      sumar(await prisma.liderazgo.deleteMany({ where: { OR: [{ personaId: { in: idsE2E } }, { grupoId: { in: grupoIds } }] } }));
      sumar(await prisma.inscripcion.deleteMany({ where: { OR: [{ personaId: { in: idsE2E } }, { grupoId: { in: grupoIds } }] } }));
      sumar(
        await prisma.propuestaDiscipulado.deleteMany({
          where: { OR: [{ discipuladorId: { in: idsE2E } }, { solicitudId: { in: solicitudIds } }, { grupoId: { in: grupoIds } }] },
        }),
      );
      if (solicitudIds.length) sumar(await prisma.franjaSolicitud.deleteMany({ where: { solicitudId: { in: solicitudIds } } }));
      sumar(await prisma.solicitudDiscipulado.deleteMany({ where: { personaId: { in: idsE2E } } }));
      if (grupoIds.length) sumar(await prisma.grupo.deleteMany({ where: { id: { in: grupoIds } } }));
      sumar(await prisma.franjaAgenda.deleteMany({ where: { personaId: { in: idsE2E } } }));
      sumar(await prisma.bloqueoDisponibilidad.deleteMany({ where: { personaId: { in: idsE2E } } }));
      return total;
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
  //
  // palabra-profetica.spec.ts marca vigente al registro `e2e-` que crea (es
  // justamente lo que prueba, FR-012/SC-006) — al borrarlo acá no queda
  // ninguna Palabra Profética vigente, y apps/web/e2e/palabra-profetica.spec.ts
  // (lectura pública) necesita que siempre haya una. Ese registro sin
  // vigente rompe la otra suite sin que nada en esta lo detecte, así que
  // esta entrada repone la vigencia sobre el registro base del seed mínimo
  // ('Fidelidad y crecimiento', apps/api/prisma/seed.ts) si el borrado deja
  // la tabla sin ninguna vigente — no es una reposición genérica, es el
  // mismo criterio de "reponer lo que borró este script", acotado a este
  // caso conocido.
  {
    nombre: 'PalabraProfetica',
    borrar: async () => {
      const { count } = await prisma.palabraProfetica.deleteMany({ where: { titulo: { startsWith: 'e2e-' } } });
      if (count > 0) {
        const quedaVigente = await prisma.palabraProfetica.findFirst({ where: { vigente: true } });
        if (!quedaVigente) {
          await prisma.palabraProfetica.updateMany({
            where: { titulo: 'Fidelidad y crecimiento' },
            data: { vigente: true },
          });
        }
      }
      return count;
    },
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
