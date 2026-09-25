import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

/**
 * specs/005-roles-permisos-acceso, T015 (Historia 1, FR-001/FR-003,
 * contracts/cli-recrear-admin.md): corre el script de verdad, como proceso
 * aparte contra la base de test (`DATABASE_URL` de .env.test, que dotenv no
 * pisa dentro del script) — lo que se prueba es el comando que va a correr
 * quien instala, no una función suelta.
 */
const RAIZ_API = join(dirname(fileURLToPath(import.meta.url)), '..');

function recrearAdmin(...args: string[]): { salida: string; codigo: number } {
  try {
    const salida = execFileSync('npx', ['tsx', 'scripts/recrear-admin.ts', ...args], {
      cwd: RAIZ_API,
      env: process.env,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return { salida, codigo: 0 };
  } catch (error) {
    const fallo = error as { stdout?: string; stderr?: string; status?: number };
    return { salida: `${fallo.stdout ?? ''}${fallo.stderr ?? ''}`, codigo: fallo.status ?? 1 };
  }
}

describe('db:recrear-admin (integración, contra base de datos de test)', () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const sufijo = Date.now();
  const emailNuevo = `integ-recrear-admin-${sufijo}@example.com`;
  const emailExistente = `integ-recrear-admin-existente-${sufijo}@example.com`;
  const emailMenor = `integ-recrear-admin-menor-${sufijo}@example.com`;
  let sedeId: string;

  beforeAll(async () => {
    const sede = await prisma.sede.create({
      data: { nombre: `Sede de test ${sufijo}`, direccion: 'Dirección de test', horarios: 'Horario de test', activo: true },
    });
    sedeId = sede.id;
  });

  afterAll(async () => {
    // Historia 6: la FK de cambios_de_rol es RESTRICT — primero el historial.
    await prisma.cambioDeRol.deleteMany({ where: { persona: { email: { in: [emailNuevo, emailExistente, emailMenor] } } } });
    await prisma.persona.deleteMany({ where: { email: { in: [emailNuevo, emailExistente, emailMenor] } } });
    await prisma.sede.delete({ where: { id: sedeId } });
    await prisma.$disconnect();
  });

  function datosPersona(email: string, fechaNacimiento: string) {
    return {
      email,
      nombre: 'Integ',
      apellido: 'Recrear',
      genero: 'femenino' as const,
      fechaNacimiento: new Date(fechaNacimiento),
      telefono: '+5492211234567',
      direccion: 'Calle 1 y 50',
      sedeId,
      estadoCivil: 'soltero_a' as const,
      profesion: 'otro' as const,
      tiempoCongregacion: 'menos_6_meses' as const,
      estado: 'activa' as const,
      activo: true,
      consentimientoDatos: true,
    };
  }

  it('crea la Persona con admin y adminSembrado, y una segunda corrida no la duplica ni la cambia', async () => {
    const argumentos = ['--email', emailNuevo, '--nombre', 'Marta', '--apellido', 'Instaladora', '--genero', 'femenino', '--fecha-nacimiento', '1980-04-02'];

    const primera = recrearAdmin(...argumentos);
    expect(primera.codigo).toBe(0);
    const creada = await prisma.persona.findUniqueOrThrow({ where: { email: emailNuevo } });
    expect(creada).toMatchObject({ nombre: 'Marta', apellido: 'Instaladora', rol: ['admin'], adminSembrado: true, estado: 'activa', activo: true });
    // No se inventa un consentimiento que nadie dio.
    expect(creada.consentimientoDatos).toBe(false);

    const segunda = recrearAdmin(...argumentos);
    expect(segunda.codigo).toBe(0);
    expect(segunda.salida).toContain('no se cambió nada');
    expect(await prisma.persona.count({ where: { email: emailNuevo } })).toBe(1);
    const despues = await prisma.persona.findUniqueOrThrow({ where: { email: emailNuevo } });
    expect(despues.updatedAt).toEqual(creada.updatedAt);

    // H-141: la creación es un otorgamiento de admin — queda auditada, sin
    // autor (lo corrió quien tenga acceso al servidor). La segunda corrida no
    // cambió nada: no suma fila.
    const historial = await prisma.cambioDeRol.findMany({ where: { personaId: creada.id } });
    expect(historial).toHaveLength(1);
    expect(historial[0]).toMatchObject({ rol: 'admin', accion: 'otorgado', origen: 'recuperacion_cli', realizadoPorId: null });
  });

  it('a una Persona que ya existe le agrega admin sin quitarle sus otros roles, pidiendo solo el email', async () => {
    await prisma.persona.create({ data: { ...datosPersona(emailExistente, '1985-01-01'), rol: ['miembro_registrado', 'pastor'] } });

    const resultado = recrearAdmin('--email', emailExistente);

    expect(resultado.codigo).toBe(0);
    const persona = await prisma.persona.findUniqueOrThrow({ where: { email: emailExistente } });
    expect(persona.rol).toEqual(['miembro_registrado', 'pastor', 'admin']);
    expect(persona.adminSembrado).toBe(true);

    // H-141: el camino más consecuente del sistema (admin a una Persona
    // existente, sin actor autenticado, e irrevocable por FR-002) ya no
    // queda afuera de la auditoría.
    const historial = await prisma.cambioDeRol.findMany({ where: { personaId: persona.id } });
    expect(historial).toHaveLength(1);
    expect(historial[0]).toMatchObject({ rol: 'admin', accion: 'otorgado', origen: 'recuperacion_cli', realizadoPorId: null });
  });

  it('no le otorga el rol a una Persona menor de edad (FR-011, venga por donde venga)', async () => {
    const haceDiezAnios = new Date();
    haceDiezAnios.setUTCFullYear(haceDiezAnios.getUTCFullYear() - 10);
    await prisma.persona.create({ data: { ...datosPersona(emailMenor, haceDiezAnios.toISOString()), rol: [] } });

    const resultado = recrearAdmin('--email', emailMenor);

    expect(resultado.codigo).not.toBe(0);
    expect(resultado.salida).toContain('FR-011');
    const persona = await prisma.persona.findUniqueOrThrow({ where: { email: emailMenor } });
    expect(persona.rol).toEqual([]);
    expect(persona.adminSembrado).toBe(false);
    expect(await prisma.cambioDeRol.count({ where: { personaId: persona.id } })).toBe(0);
  });
});
