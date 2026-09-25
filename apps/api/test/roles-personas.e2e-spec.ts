import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import type { Server } from 'node:http';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { configurarApp } from '../src/configurar-app.js';

/**
 * specs/005-roles-permisos-acceso, T026 (Historia 2): de punta a punta — HTTP
 * real, `PermisosGuard` real contra `CATALOGO_PERMISOS`, `ValidationPipe` y
 * `AllExceptionsFilter` reales (configurarApp), base de test real. Los
 * cuatro rechazos tienen que llegar al cliente con su código propio, no
 * como un 403 genérico.
 */
async function token(personaId: string | null, rol: string[]): Promise<string> {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
  return new SignJWT({ email: `token-${personaId ?? 'sin-persona'}@example.com`, personaId, estado: 'activa', rol })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

function haceAnios(anios: number): Date {
  const fecha = new Date();
  fecha.setUTCFullYear(fecha.getUTCFullYear() - anios);
  return fecha;
}

describe('Roles de cargo y listado de Personas (integración, contra base de datos de test)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let sedeId: string;
  const sufijo = Date.now();
  // Apellido único de esta corrida: cada búsqueda lo usa para no depender
  // de lo que haya en la base de test.
  const apellido = `Rolesinteg${sufijo}`;
  const ids: Record<'admin' | 'sembrado' | 'adulta' | 'menor' | 'discipuladora', string> = {
    admin: '',
    sembrado: '',
    adulta: '',
    menor: '',
    discipuladora: '',
  };
  let tokenAdmin: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    configurarApp(app);
    await app.init();
    prisma = moduleFixture.get(PrismaService);

    const sede = await prisma.sede.create({
      data: { nombre: `Sede roles integ ${sufijo}`, direccion: 'Dirección', horarios: 'Horario', activo: true },
    });
    sedeId = sede.id;

    const crear = async (clave: keyof typeof ids, nombre: string, fechaNacimiento: Date, rol: string[], adminSembrado = false) => {
      const persona = await prisma.persona.create({
        data: {
          email: `integ-roles-${clave}-${sufijo}@example.com`,
          nombre,
          apellido,
          genero: 'femenino',
          fechaNacimiento,
          telefono: '+5492211234567',
          direccion: 'Calle 1 y 50',
          sedeId,
          estadoCivil: 'soltero_a',
          profesion: 'otro',
          tiempoCongregacion: 'menos_6_meses',
          estado: 'activa',
          activo: true,
          consentimientoDatos: true,
          rol,
          adminSembrado,
        },
      });
      ids[clave] = persona.id;
    };
    await crear('admin', 'Adela', new Date('1980-01-01'), ['miembro_registrado', 'admin']);
    await crear('sembrado', 'Berta', new Date('1975-01-01'), ['admin'], true);
    await crear('adulta', 'Carla', new Date('1990-01-01'), ['miembro_registrado']);
    // Menor `activa` a propósito (Flujo 7): la regla mira la fecha de
    // nacimiento, no el estado.
    await crear('menor', 'Dora', haceAnios(16), ['miembro_registrado']);
    await crear('discipuladora', 'Elsa', new Date('1988-01-01'), ['miembro_registrado', 'discipulador']);

    tokenAdmin = await token(ids.admin, ['miembro_registrado', 'admin']);
  });

  afterAll(async () => {
    // Historia 6: la FK de cambios_de_rol es RESTRICT — primero el historial
    // de las Personas de esta corrida (base de test, verificada por H-130).
    await prisma.cambioDeRol.deleteMany({ where: { persona: { apellido } } });
    await prisma.persona.deleteMany({ where: { apellido } });
    await prisma.sede.delete({ where: { id: sedeId } });
    await app.close();
  });

  const servidor = () => request(app.getHttpServer());

  describe('otorgar y quitar (FR-006/FR-007)', () => {
    it('otorga un rol de cargo, lo acumula, y quitarlo deja los demás', async () => {
      const otorgado = await servidor()
        .post(`/personas/${ids.adulta}/roles`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ rol: 'lider_curso' });
      expect(otorgado.status).toBe(201);
      expect(otorgado.body.rol).toEqual(['miembro_registrado', 'lider_curso']);

      const repetido = await servidor()
        .post(`/personas/${ids.adulta}/roles`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ rol: 'lider_curso' });
      expect(repetido.status).toBe(201);
      expect(repetido.body.rol).toEqual(['miembro_registrado', 'lider_curso']);

      const quitado = await servidor()
        .delete(`/personas/${ids.adulta}/roles/lider_curso`)
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(quitado.status).toBe(200);
      expect((await prisma.persona.findUniqueOrThrow({ where: { id: ids.adulta } })).rol).toEqual(['miembro_registrado']);
    });

    it('rechaza un rol que no es de cargo (el de estado lo escribe el sistema, D131)', async () => {
      const respuesta = await servidor()
        .post(`/personas/${ids.adulta}/roles`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ rol: 'miembro_registrado' });
      expect(respuesta.status).toBe(400);
      expect(respuesta.body.errors).toEqual([{ campo: 'rol', code: 'ROL_INVALIDO' }]);
    });
  });

  describe('los cuatro rechazos, con su código propio', () => {
    it('menor de edad (FR-011) — aunque esté activa', async () => {
      const respuesta = await servidor()
        .post(`/personas/${ids.menor}/roles`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ rol: 'pastor' });
      expect(respuesta.status).toBe(409);
      expect(respuesta.body.code).toBe('PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO');
      expect((await prisma.persona.findUniqueOrThrow({ where: { id: ids.menor } })).rol).toEqual(['miembro_registrado']);
    });

    it('Admin sembrado (FR-002)', async () => {
      const respuesta = await servidor()
        .delete(`/personas/${ids.sembrado}/roles/admin`)
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(respuesta.status).toBe(409);
      expect(respuesta.body.code).toBe('NO_SE_PUEDE_DEGRADAR_AL_ADMIN_SEMBRADO');
      expect((await prisma.persona.findUniqueOrThrow({ where: { id: ids.sembrado } })).rol).toEqual(['admin']);
    });

    it('auto-revocación de admin (FR-010)', async () => {
      const respuesta = await servidor()
        .delete(`/personas/${ids.admin}/roles/admin`)
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(respuesta.status).toBe(409);
      expect(respuesta.body.code).toBe('ADMIN_NO_PUEDE_AUTO_REVOCARSE');
      expect((await prisma.persona.findUniqueOrThrow({ where: { id: ids.admin } })).rol).toContain('admin');
    });

    it('discipulador, siempre por ahora (FR-009/H-127, fallo cerrado)', async () => {
      const respuesta = await servidor()
        .delete(`/personas/${ids.discipuladora}/roles/discipulador`)
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(respuesta.status).toBe(409);
      expect(respuesta.body.code).toBe('DISCIPULADOR_SIN_VERIFICACION_DE_DISCIPULADOS_ACTIVOS');
      expect((await prisma.persona.findUniqueOrThrow({ where: { id: ids.discipuladora } })).rol).toContain('discipulador');
    });
  });

  describe('permisos (catálogo, D132)', () => {
    it('otorgar/quitar es solo del Admin: un Pastor recibe 403 y no cambia nada', async () => {
      const tokenPastor = await token('pastor-x', ['pastor']);
      const otorgar = await servidor()
        .post(`/personas/${ids.adulta}/roles`)
        .set('Authorization', `Bearer ${tokenPastor}`)
        .send({ rol: 'pastor' });
      const quitar = await servidor()
        .delete(`/personas/${ids.discipuladora}/roles/discipulador`)
        .set('Authorization', `Bearer ${tokenPastor}`);
      expect(otorgar.status).toBe(403);
      expect(quitar.status).toBe(403);
      expect((await prisma.persona.findUniqueOrThrow({ where: { id: ids.adulta } })).rol).not.toContain('pastor');
    });

    it('GET /personas/buscar sigue abierto a admin y discipulador, y cerrado a pastor (T025, sin cambio de roles)', async () => {
      const q = `?q=${apellido}`;
      expect((await servidor().get(`/personas/buscar${q}`).set('Authorization', `Bearer ${tokenAdmin}`)).status).toBe(200);
      expect((await servidor().get(`/personas/buscar${q}`).set('Authorization', `Bearer ${await token('d', ['discipulador'])}`)).status).toBe(200);
      expect((await servidor().get(`/personas/buscar${q}`).set('Authorization', `Bearer ${await token('p', ['pastor'])}`)).status).toBe(403);
    });

    it('GET /personas: lo ven admin y pastor (personas.ver), no un discipulador', async () => {
      expect((await servidor().get('/personas').set('Authorization', `Bearer ${await token('p', ['pastor'])}`)).status).toBe(200);
      expect((await servidor().get('/personas').set('Authorization', `Bearer ${await token('d', ['discipulador'])}`)).status).toBe(403);
    });

    // T070 (D64): la lista de pendientes de tutor — la única compuesta
    // enteramente por menores — la lee quien tiene pendientes_tutor.ver
    // (incluido el Pastor); activar y cerrar siguen en .gestionar.
    it('GET /personas/pendientes-tutor lo leen admin, discipulador y pastor; activar y cerrar no son del pastor', async () => {
      const tokenPastor = await token('p', ['pastor']);
      expect((await servidor().get('/personas/pendientes-tutor').set('Authorization', `Bearer ${tokenPastor}`)).status).toBe(200);
      expect((await servidor().get('/personas/pendientes-tutor').set('Authorization', `Bearer ${await token('d', ['discipulador'])}`)).status).toBe(200);
      expect((await servidor().get('/personas/pendientes-tutor').set('Authorization', `Bearer ${await token('l', ['lider_curso'])}`)).status).toBe(403);
      const activar = await servidor().patch(`/personas/${ids.menor}/activar`).set('Authorization', `Bearer ${tokenPastor}`).send({});
      const cerrar = await servidor().patch(`/personas/${ids.menor}/marcar-inactiva`).set('Authorization', `Bearer ${tokenPastor}`);
      expect(activar.status).toBe(403);
      expect(cerrar.status).toBe(403);
    });
  });

  describe('listado paginado (GET /personas) y búsqueda de tutor (GET /personas/buscar)', () => {
    const nombres = (items: Array<{ nombre: string }>) => items.map((p) => p.nombre).sort();

    it('soloMayores=true excluye a la menor (FR-024), en los items y en el total', async () => {
      const respuesta = await servidor()
        .get(`/personas?buscar=${apellido}&soloMayores=true`)
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(respuesta.status).toBe(200);
      expect(nombres(respuesta.body.items)).toEqual(['Adela', 'Berta', 'Carla', 'Elsa']);
      expect(respuesta.body.total).toBe(4);
    });

    it('sin soloMayores lista a todas, menores incluidas — el default no esconde a nadie', async () => {
      const respuesta = await servidor().get(`/personas?buscar=${apellido}`).set('Authorization', `Bearer ${tokenAdmin}`);
      expect(nombres(respuesta.body.items)).toEqual(['Adela', 'Berta', 'Carla', 'Dora', 'Elsa']);
      expect(respuesta.body.total).toBe(5);
    });

    it('pagina en la base: take/skip con el total completo, ordenado por nombre', async () => {
      const pagina2 = await servidor()
        .get(`/personas?buscar=${apellido}&orden=nombre&take=2&skip=2`)
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(pagina2.body.items.map((p: { nombre: string }) => p.nombre)).toEqual(['Carla', 'Dora']);
      expect(pagina2.body.total).toBe(5);
      expect(pagina2.body.items[0]).toEqual(expect.objectContaining({ rol: expect.any(Array) }));
      expect(pagina2.body.items[0]).not.toHaveProperty('fechaNacimiento');
    });

    it('GET /personas/buscar NO cambió: sigue siendo un arreglo, trae los roles y no filtra por edad', async () => {
      const respuesta = await servidor().get(`/personas/buscar?q=${apellido}`).set('Authorization', `Bearer ${tokenAdmin}`);
      expect(Array.isArray(respuesta.body)).toBe(true);
      expect(nombres(respuesta.body)).toEqual(['Adela', 'Berta', 'Carla', 'Dora', 'Elsa']);
      expect(respuesta.body[0]).toEqual(expect.objectContaining({ rol: expect.any(Array) }));
      expect(respuesta.body[0]).not.toHaveProperty('fechaNacimiento');
    });
  });
  // H-139: el pisado es ALCANZABLE, no teórico. La guarda de edad de
  // otorgarRol mira la fecha de nacimiento, no el estado (H-128, está bien
  // que así sea): alguien que se registró a los 17 queda pendiente_tutor con
  // rol [], cumple 18 esperando al tutor, un Admin le otorga un rol de cargo
  // (pasa), y después llega la autorización. `activar` escribía
  // `rol = ['miembro_registrado']` y el rol de cargo desaparecía sin error.
  describe('H-139: activar agrega miembro_registrado, no pisa los roles que ya tiene', () => {
    it('quien se registró a los 17, cumplió 18 esperando al tutor y recibió un rol de cargo, lo conserva al activarse', async () => {
      const unDiaMas = new Date(haceAnios(18).getTime() - 24 * 60 * 60 * 1000);
      const persona = await prisma.persona.create({
        data: {
          email: `integ-roles-h139-${sufijo}@example.com`,
          nombre: 'Flor',
          apellido,
          genero: 'femenino',
          fechaNacimiento: unDiaMas,
          telefono: '+5492211234567',
          direccion: 'Calle 1 y 50',
          sedeId,
          estadoCivil: 'soltero_a',
          profesion: 'otro',
          tiempoCongregacion: 'menos_6_meses',
          estado: 'pendiente_tutor',
          activo: true,
          consentimientoDatos: false,
          rol: [],
        },
      });

      const otorgar = await servidor()
        .post(`/personas/${persona.id}/roles`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ rol: 'pastor' });
      expect(otorgar.status).toBeLessThan(300);

      const activar = await servidor()
        .patch(`/personas/${persona.id}/activar`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ tutorNombre: 'Tutora', tutorApellido: apellido, tutorTelefono: '+5492217654321' });
      expect(activar.status).toBe(200);

      const final = await prisma.persona.findUniqueOrThrow({ where: { id: persona.id } });
      expect(final.estado).toBe('activa');
      expect(final.rol).toEqual(expect.arrayContaining(['pastor', 'miembro_registrado']));
    });
  });
  // H-140: el chequeo de AUTOR va primero. Con `?? null`, para una sesión sin
  // Persona `personaId === adminId` era `personaId === null` — falso siempre:
  // FR-010 no existía para esa sesión. Ahora ni llega a FR-010.
  describe('H-140: una sesión sin Persona no cambia roles — la corta el chequeo de autor, primero', () => {
    it('quitarse admin a sí misma sin Persona: SESION_SIN_PERSONA (no FR-010), sin cambio ni registro', async () => {
      const filasAntes = await prisma.cambioDeRol.count({ where: { personaId: ids.admin } });
      const respuesta = await servidor()
        .delete(`/personas/${ids.admin}/roles/admin`)
        .set('Authorization', `Bearer ${await token(null, ['admin'])}`);
      expect(respuesta.status).toBe(403);
      expect(respuesta.body.code).toBe('SESION_SIN_PERSONA');
      expect((await prisma.persona.findUniqueOrThrow({ where: { id: ids.admin } })).rol).toContain('admin');
      expect(await prisma.cambioDeRol.count({ where: { personaId: ids.admin } })).toBe(filasAntes);
    });

    it('otorgar sin Persona: SESION_SIN_PERSONA, sin cambio ni registro', async () => {
      const respuesta = await servidor()
        .post(`/personas/${ids.adulta}/roles`)
        .set('Authorization', `Bearer ${await token(null, ['admin'])}`)
        .send({ rol: 'pastor' });
      expect(respuesta.status).toBe(403);
      expect(respuesta.body.code).toBe('SESION_SIN_PERSONA');
      expect((await prisma.persona.findUniqueOrThrow({ where: { id: ids.adulta } })).rol).not.toContain('pastor');
    });
  });

  // T053 (FR-022/FR-023): otorgar y quitar dejan cada uno su fila, con quién,
  // qué rol, a quién y cuándo — consultable, el más reciente primero.
  describe('auditoría de cambios de rol (Historia 6)', () => {
    it('otorgar y quitar dejan dos filas consultables vía GET /cambios-de-rol, con el Admin que lo hizo', async () => {
      const gala = await prisma.persona.create({
        data: {
          email: `integ-roles-auditoria-${sufijo}@example.com`,
          nombre: 'Gala',
          apellido,
          genero: 'femenino',
          fechaNacimiento: new Date('1992-03-03'),
          telefono: '+5492211234567',
          direccion: 'Calle 1 y 50',
          sedeId,
          estadoCivil: 'soltero_a',
          profesion: 'otro',
          tiempoCongregacion: 'menos_6_meses',
          estado: 'activa',
          activo: true,
          consentimientoDatos: true,
          rol: ['miembro_registrado'],
        },
      });
      const otorgar = await servidor().post(`/personas/${gala.id}/roles`).set('Authorization', `Bearer ${tokenAdmin}`).send({ rol: 'lider_curso' });
      expect(otorgar.status).toBeLessThan(300);
      // Idempotente: otorgar otra vez no es un cambio, no deja fila.
      await servidor().post(`/personas/${gala.id}/roles`).set('Authorization', `Bearer ${tokenAdmin}`).send({ rol: 'lider_curso' });
      const quitar = await servidor().delete(`/personas/${gala.id}/roles/lider_curso`).set('Authorization', `Bearer ${tokenAdmin}`);
      expect(quitar.status).toBe(200);

      const historial = await servidor().get(`/cambios-de-rol?personaId=${gala.id}`).set('Authorization', `Bearer ${tokenAdmin}`);
      expect(historial.status).toBe(200);
      expect(historial.body.total).toBe(2);
      expect(historial.body.items.map((f: { accion: string }) => f.accion)).toEqual(['quitado', 'otorgado']);
      for (const fila of historial.body.items) {
        expect(fila).toMatchObject({ personaId: gala.id, rol: 'lider_curso', origen: 'backoffice', realizadoPor: { id: ids.admin, nombre: 'Adela' } });
        expect(typeof fila.createdAt).toBe('string');
      }
    });

    it('el historial es del Admin (personas.gestionar_roles): Pastor y Discipulador reciben 403', async () => {
      expect((await servidor().get('/cambios-de-rol').set('Authorization', `Bearer ${await token('p', ['pastor'])}`)).status).toBe(403);
      expect((await servidor().get('/cambios-de-rol').set('Authorization', `Bearer ${await token('d', ['discipulador'])}`)).status).toBe(403);
    });

    it('no hay escritura directa sobre el historial (sin POST/PATCH/DELETE)', async () => {
      expect((await servidor().post('/cambios-de-rol').set('Authorization', `Bearer ${tokenAdmin}`).send({})).status).toBe(404);
      expect((await servidor().delete('/cambios-de-rol').set('Authorization', `Bearer ${tokenAdmin}`)).status).toBe(404);
    });

    // H-140: la invariante del actor la sostiene la BASE, no un comentario.
    it('la base rechaza una fila de backoffice sin autor, y una del CLI con autor', async () => {
      await expect(
        prisma.cambioDeRol.create({ data: { personaId: ids.adulta, rol: 'pastor', accion: 'otorgado', origen: 'backoffice', realizadoPorId: null } }),
      ).rejects.toThrow(/cambios_de_rol_backoffice_con_autor|check constraint/i);
      await expect(
        prisma.cambioDeRol.create({ data: { personaId: ids.adulta, rol: 'admin', accion: 'otorgado', origen: 'recuperacion_cli', realizadoPorId: ids.admin } }),
      ).rejects.toThrow(/cambios_de_rol_cli_sin_autor|check constraint/i);
    });
  });
  // H-142: otorgarRol/quitarRol leían AFUERA de la transacción y escribían el
  // arreglo entero desde ese snapshot. Dos cambios simultáneos: uno se perdía
  // y los DOS dejaban su fila de auditoría — el historial decía una cosa y la
  // Persona otra. El caso serio: una quita concurrente con un otorgamiento se
  // perdía y el historial decía que el rol se había revocado. Cada escenario
  // se repite con una Persona nueva, para que la carrera no pase por suerte.
  describe('H-142: cambios de rol concurrentes — ninguno se pierde y el historial coincide con la Persona', () => {
    const REPETICIONES = 5;
    let n = 0;
    const personaNueva = async (rol: string[]) =>
      prisma.persona.create({
        data: {
          email: `integ-roles-h142-${sufijo}-${n++}@example.com`,
          nombre: 'Hebe',
          apellido,
          genero: 'femenino',
          fechaNacimiento: new Date('1990-05-05'),
          telefono: '+5492211234567',
          direccion: 'Calle 1 y 50',
          sedeId,
          estadoCivil: 'soltero_a',
          profesion: 'otro',
          tiempoCongregacion: 'menos_6_meses',
          estado: 'activa',
          activo: true,
          consentimientoDatos: true,
          rol,
        },
      });
    const otorgar = (id: string, rol: string) =>
      servidor().post(`/personas/${id}/roles`).set('Authorization', `Bearer ${tokenAdmin}`).send({ rol });
    const quitar = (id: string, rol: string) =>
      servidor().delete(`/personas/${id}/roles/${rol}`).set('Authorization', `Bearer ${tokenAdmin}`);
    const historial = (personaId: string) =>
      prisma.cambioDeRol.findMany({ where: { personaId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });

    it('cuatro otorgamientos simultáneos de roles distintos dejan los cuatro roles y cuatro filas', async () => {
      for (let i = 0; i < REPETICIONES; i++) {
        const p = await personaNueva(['miembro_registrado']);
        const respuestas = await Promise.all(['admin', 'pastor', 'discipulador', 'lider_curso'].map((r) => otorgar(p.id, r)));
        for (const r of respuestas) expect(r.status).toBeLessThan(300);
        const final = await prisma.persona.findUniqueOrThrow({ where: { id: p.id } });
        expect([...final.rol].sort()).toEqual(['admin', 'discipulador', 'lider_curso', 'miembro_registrado', 'pastor']);
        const filas = await historial(p.id);
        expect(filas.map((f) => `${f.accion}:${f.rol}`).sort()).toEqual(['otorgado:admin', 'otorgado:discipulador', 'otorgado:lider_curso', 'otorgado:pastor']);
      }
    });

    it('una quita concurrente con un otorgamiento no se pierde, y el historial dice lo mismo que la Persona', async () => {
      for (let i = 0; i < REPETICIONES; i++) {
        const p = await personaNueva(['miembro_registrado', 'pastor']);
        const [q, o] = await Promise.all([quitar(p.id, 'pastor'), otorgar(p.id, 'lider_curso')]);
        expect(q.status).toBe(200);
        expect(o.status).toBeLessThan(300);
        const final = await prisma.persona.findUniqueOrThrow({ where: { id: p.id } });
        expect(final.rol).not.toContain('pastor');
        expect(final.rol).toContain('lider_curso');
        const filas = await historial(p.id);
        expect(filas.map((f) => `${f.accion}:${f.rol}`).sort()).toEqual(['otorgado:lider_curso', 'quitado:pastor']);
      }
    });

    it('tres otorgamientos simultáneos del MISMO rol dejan el rol una vez y una sola fila', async () => {
      for (let i = 0; i < REPETICIONES; i++) {
        const p = await personaNueva(['miembro_registrado']);
        const respuestas = await Promise.all([otorgar(p.id, 'pastor'), otorgar(p.id, 'pastor'), otorgar(p.id, 'pastor')]);
        for (const r of respuestas) expect(r.status).toBeLessThan(300);
        const final = await prisma.persona.findUniqueOrThrow({ where: { id: p.id } });
        expect(final.rol.filter((r) => r === 'pastor')).toHaveLength(1);
        expect(await historial(p.id)).toHaveLength(1);
      }
    });
  });
});
