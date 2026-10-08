import type { BusquedaPersona } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../prisma/prisma.service.js';
import { calcularEdad } from './calcular-edad.js';

/**
 * spec 006, Pregunta 5 (respondida: se adopta la recomendación, D153–D213):
 * la búsqueda de "Pedir Vida Nueva en nombre de…" para quien no ve Personas
 * (el Discipulador, D143). Solo Personas activas SIN acceso a la app (sin
 * email, D145) y solo nombre, apellido y edad — sin email ni teléfono, como
 * FR-011 de la 004 hasta que acepte un discipulado. El Admin sigue con la
 * búsqueda completa (`PersonaService.buscarPersonas`).
 */
export async function buscarPersonasSinAcceso(prisma: PrismaService, q: string): Promise<BusquedaPersona[]> {
  const termino = q.trim();
  if (termino.length < 2) return [];
  const personas = await prisma.persona.findMany({
    where: {
      activo: true,
      estado: 'activa',
      email: null,
      OR: [
        { nombre: { contains: termino, mode: 'insensitive' } },
        { apellido: { contains: termino, mode: 'insensitive' } },
      ],
    },
    select: { id: true, nombre: true, apellido: true, fechaNacimiento: true },
    orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }],
    take: 10,
  });
  return personas.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    apellido: p.apellido,
    email: null,
    telefono: '',
    rol: [],
    edad: calcularEdad(p.fechaNacimiento),
  }));
}
