import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import type { Server } from 'node:http';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { configurarApp } from '../src/configurar-app.js';

/**
 * specs/005-roles-permisos-acceso, T016 (Historia 1, Acceptance Scenario 2):
 * el Admin sembrado es indegradable — `DELETE /personas/:id/roles/admin`
 * sobre una Persona con `adminSembrado=true` devuelve
 * `NO_SE_PUEDE_DEGRADAR_AL_ADMIN_SEMBRADO` SIN IMPORTAR QUIÉN LO PIDA: otro
 * Admin, el propio sembrado (FR-002 se evalúa antes que FR-010, así que el
 * código que recibe es el de sembrado, no el de auto-revocación) o una
 * tercera sesión Admin. Una sesión SIN Persona ni llega a esta guarda: la
 * corta antes el chequeo de autor (SESION_SIN_PERSONA, Historia 6/H-140 —
 * probado en roles-personas.e2e-spec.ts). La guarda es solo sobre `admin`:
 * sus otros roles de cargo se quitan normalmente.
 */
async function token(personaId: string | null, rol: string[]): Promise<string> {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
  return new SignJWT({ email: `token-${personaId ?? 'sin-persona'}@example.com`, personaId, estado: 'activa', rol })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

describe('Admin sembrado indegradable (integración, contra base de datos de test)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let sedeId: string;
  const sufijo = Date.now();
  const apellido = `Sembradointeg${sufijo}`;
  const ids: Record<'otroAdmin' | 'terceraAdmin' | 'sembrado', string> = { otroAdmin: '', terceraAdmin: '', sembrado: '' };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    configurarApp(app);
    await app.init();
    prisma = moduleFixture.get(PrismaService);

    const sede = await prisma.sede.create({
      data: { nombre: `Sede sembrado integ ${sufijo}`, direccion: 'Dirección', horarios: 'Horario', activo: true },
    });
    sedeId = sede.id;

    const crear = async (clave: keyof typeof ids, nombre: string, rol: string[], adminSembrado: boolean) => {
      const persona = await prisma.persona.create({
        data: {
          email: `integ-sembrado-${clave}-${sufijo}@example.com`,
          nombre,
          apellido,
          genero: 'femenino',
          fechaNacimiento: new Date('1975-01-01'),
          telefono: '+5492211234567',
          direccion: 'Calle 1 y 50',
          sedeId,
          estadoCivil: 'soltero_a',
          profesion: 'otro',
          congregaDesde: 2020,
          estado: 'activa',
          activo: true,
          consentimientoDatos: true,
          rol,
          adminSembrado,
        },
      });
      ids[clave] = persona.id;
    };
    await crear('otroAdmin', 'Adela', ['miembro_registrado', 'admin'], false);
    await crear('terceraAdmin', 'Clara', ['admin'], false);
    await crear('sembrado', 'Berta', ['admin', 'pastor'], true);
  });

  afterAll(async () => {
    // Historia 6: la FK de cambios_de_rol es RESTRICT — primero el historial.
    await prisma.cambioDeRol.deleteMany({ where: { persona: { apellido } } });
    await prisma.persona.deleteMany({ where: { apellido } });
    await prisma.sede.delete({ where: { id: sedeId } });
    await app.close();
  });

  const quitarAdminAlSembrado = async (tokenQuePide: string) =>
    request(app.getHttpServer()).delete(`/personas/${ids.sembrado}/roles/admin`).set('Authorization', `Bearer ${tokenQuePide}`);

  const rolesDelSembrado = async () => (await prisma.persona.findUniqueOrThrow({ where: { id: ids.sembrado } })).rol;

  it.each([
    ['otro Admin', () => token(ids.otroAdmin, ['miembro_registrado', 'admin'])],
    ['el propio Admin sembrado (FR-002 antes que FR-010)', () => token(ids.sembrado, ['admin', 'pastor'])],
    // Historia 6 (H-140): antes este caso era "una sesión Admin SIN Persona".
    // Ahora el chequeo de autor va primero y lo corta con SESION_SIN_PERSONA
    // antes de llegar a FR-002 — eso se prueba en roles-personas.e2e-spec.ts.
    // Acá el caso es otra sesión Admin identificada, con su propia Persona.
    ['una tercera sesión Admin, con su propia Persona', () => token(ids.terceraAdmin, ['admin'])],
  ])('lo pida %s: 409 NO_SE_PUEDE_DEGRADAR_AL_ADMIN_SEMBRADO y el rol queda', async (_quien, crearToken) => {
    const respuesta = await quitarAdminAlSembrado(await crearToken());
    expect(respuesta.status).toBe(409);
    expect(respuesta.body.code).toBe('NO_SE_PUEDE_DEGRADAR_AL_ADMIN_SEMBRADO');
    expect(await rolesDelSembrado()).toContain('admin');
  });

  it('la guarda es solo sobre admin: su rol de pastor se quita normalmente', async () => {
    const respuesta = await request(app.getHttpServer())
      .delete(`/personas/${ids.sembrado}/roles/pastor`)
      .set('Authorization', `Bearer ${await token(ids.otroAdmin, ['miembro_registrado', 'admin'])}`);
    expect(respuesta.status).toBe(200);
    expect(await rolesDelSembrado()).toEqual(['admin']);
  });
});
