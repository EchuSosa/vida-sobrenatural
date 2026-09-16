import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existente = await prisma.sede.findFirst({ where: { activo: true } });
  if (existente) {
    console.log(`Ya existe una Sede activa (${existente.nombre}), no se crea otra.`);
    return;
  }

  const sede = await prisma.sede.create({
    data: {
      nombre: 'La Plata',
      direccion: 'Dirección a confirmar — La Plata, Buenos Aires',
      contactoTelefono: '+54 9 221 000-0000',
      horarios: 'Domingos 10 y 18 hs',
      descripcionBienvenida:
        'Bienvenido/a a Vida Sobrenatural La Plata. Nos alegra que te hayas acercado.',
      activo: true,
    },
  });

  console.log(`Sede creada: ${sede.nombre} (${sede.id})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
