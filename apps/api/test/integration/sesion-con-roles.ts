import { SignJWT } from 'jose';
import { PrismaService } from '../../src/prisma/prisma.service.js';

/**
 * D258 (docs/25, S-02): la API ya no confía en el `rol` del token; lo lee de la Persona en la base
 * en cada pedido. Los tests que antes firmaban un token con `personaId: 'x'` y `rol: ['admin']`
 * necesitan una Persona de verdad con ese rol. Esto la crea (una por combinación de roles, con un
 * email fijo, así no se acumulan entre corridas) y firma su token.
 */
let prisma: PrismaService | null = null;
const cache = new Map<string, Promise<string>>();

function conexion(): PrismaService {
  prisma ??= new PrismaService();
  return prisma;
}

async function sedeParaSesiones(db: PrismaService): Promise<string> {
  const nombre = 'Sede de las sesiones de test (D258)';
  const existente = await db.sede.findFirst({ where: { nombre }, select: { id: true } });
  if (existente) return existente.id;
  return (await db.sede.create({ data: { nombre, direccion: 'Calle 1 y 50', horarios: 'Domingos 10 hs', activo: true }, select: { id: true } })).id;
}

async function personaConRoles(rol: string[], estado: 'activa' | 'pendiente_tutor'): Promise<string> {
  const db = conexion();
  const clave = `${[...rol].sort().join('-') || 'sin-rol'}-${estado}`;
  const email = `sesion-test-${clave}@example.com`;
  const datos = { rol, estado, activo: true };
  const existente = await db.persona.findUnique({ where: { email }, select: { id: true } });
  if (existente) {
    await db.persona.update({ where: { id: existente.id }, data: datos });
    return existente.id;
  }
  try {
    const creada = await db.persona.create({
      data: {
        email,
        nombre: 'Sesión',
        apellido: `De test ${clave}`,
        genero: 'femenino',
        fechaNacimiento: new Date('1985-03-12'),
        telefono: '+5492215550000',
        direccion: 'Calle 1 y 50',
        sedeId: await sedeParaSesiones(db),
        estadoCivil: 'soltero_a',
        profesion: 'otro',
        congregaDesde: 2020,
        consentimientoDatos: true,
        ...datos,
      },
      select: { id: true },
    });
    return creada.id;
  } catch {
    // Otro archivo de test la creó al mismo tiempo (email único): se usa esa.
    return (await db.persona.findUniqueOrThrow({ where: { email }, select: { id: true } })).id;
  }
}

/** El token de una Persona real que tiene exactamente `rol` en la base. */
export async function tokenConRoles(rol: string[], opciones: { estado?: 'activa' | 'pendiente_tutor' } = {}): Promise<string> {
  const estado = opciones.estado ?? 'activa';
  const clave = `${[...rol].sort().join('-')}|${estado}`;
  let personaId = cache.get(clave);
  if (!personaId) {
    personaId = personaConRoles(rol, estado);
    cache.set(clave, personaId);
  }
  const id = await personaId;
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
  return new SignJWT({ email: `sesion-test-${clave}@example.com`, personaId: id, estado, rol })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

/** Para el `afterAll` de cada archivo: cierra la conexión propia del helper. */
export async function cerrarSesionesDeTest(): Promise<void> {
  if (prisma) await prisma.$disconnect();
  prisma = null;
  cache.clear();
}
