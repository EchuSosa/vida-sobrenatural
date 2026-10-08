import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { CursoDetalle, CursoListado } from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { CursoService } from '../../src/curso/curso.service.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';

/**
 * spec 013, T073 (Historia 6): el catálogo de Cursos contra la base real. Se
 * trabaja SOLO con "Vida Nueva grupal" (`vida_nueva`/`grupal`), que ningún
 * otro spec usa: el Curso individual lo comparten los tests del discipulado
 * que corren en paralelo. Al terminar se borra de verdad.
 */
describe('Cursos (integración, spec 013 T073)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let escenario: Escenario;
  let admin: string;
  let pastor: string;
  let cursoId = '';

  const api = () => request(app.getHttpServer());
  const como = (token: string) => ({
    get: (ruta: string) => api().get(ruta).set('Authorization', `Bearer ${token}`),
    post: (ruta: string, cuerpo?: object) => api().post(ruta).set('Authorization', `Bearer ${token}`).send(cuerpo ?? {}),
    patch: (ruta: string, cuerpo: object) => api().patch(ruta).set('Authorization', `Bearer ${token}`).send(cuerpo),
    del: (ruta: string) => api().delete(ruta).set('Authorization', `Bearer ${token}`),
  });

  async function borrarGrupal() {
    const curso = await prisma.curso.findUnique({ where: { categoria_tipo: { categoria: 'vida_nueva', tipo: 'grupal' } }, select: { id: true } });
    if (!curso) return;
    await prisma.grupo.deleteMany({ where: { cursoId: curso.id } });
    await prisma.curso.delete({ where: { id: curso.id } });
  }

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    escenario = new Escenario(prisma, `cursos${Date.now()}`);
    await escenario.preparar();
    admin = await tokenDe(await escenario.persona('admin', { rol: ['miembro_registrado', 'admin'] }), ['miembro_registrado', 'admin']);
    pastor = await tokenDe(await escenario.persona('pastor', { rol: ['miembro_registrado', 'pastor'] }), ['miembro_registrado', 'pastor']);
    await borrarGrupal();
  });

  afterAll(async () => {
    await borrarGrupal();
    await escenario.limpiar();
    await app.close();
  });

  it('FR-056: alta de una combinación reconocida; repetida → 409; no reconocida → 400', async () => {
    const disponibles = (await como(admin).get('/cursos/disponibles-para-alta')).body as Array<{ categoria: string; tipo: string; restaurar: boolean }>;
    expect(disponibles).toContainEqual(expect.objectContaining({ categoria: 'vida_nueva', tipo: 'grupal', restaurar: false }));

    const alta = await como(admin).post('/cursos', { categoria: 'vida_nueva', tipo: 'grupal', nombre: '  Vida Nueva en grupo ', descripcion: 'Para matrimonios.' });
    expect(alta.status).toBe(201);
    cursoId = (alta.body as CursoDetalle).id;
    expect(alta.body).toMatchObject({ nombre: 'Vida Nueva en grupo', modalidad: 'seguimiento_por_encuentros', activo: true, gruposEnCurso: 0, tieneGrupos: false, descripcion: 'Para matrimonios.' });

    const repetida = await como(admin).post('/cursos', { categoria: 'vida_nueva', tipo: 'grupal', nombre: 'Otra' });
    expect(repetida.status).toBe(409);
    expect(repetida.body.code).toBe('CURSO_YA_EXISTE');
    const rara = await como(admin).post('/cursos', { categoria: 'vida_de_servicio', tipo: 'individual', nombre: 'No existe' });
    expect(rara.status).toBe(400);
    expect(rara.body.code).toBe('CURSO_NO_RECONOCIDO');
  });

  it('H6.2: el listado con sus Grupos en curso; PATCH no acepta categoría', async () => {
    await prisma.grupo.create({ data: { cursoId, sedeId: escenario.sedeId } });
    const listado = (await como(admin).get('/cursos')).body as CursoListado[];
    expect(listado.find((c) => c.id === cursoId)).toMatchObject({ gruposEnCurso: 1, tieneGrupos: true });

    const conCategoria = await como(admin).patch(`/cursos/${cursoId}`, { categoria: 'vida_de_servicio' });
    expect(conCategoria.status).toBe(400);
    expect(conCategoria.body.errors).toEqual([{ campo: 'categoria', code: 'CATEGORIA_INVALIDO' }]);
    const renombrado = await como(admin).patch(`/cursos/${cursoId}`, { nombre: 'Vida Nueva grupal' });
    expect(renombrado.body).toMatchObject({ nombre: 'Vida Nueva grupal', categoria: 'vida_nueva' });
  });

  it('H6.3 / FR-054: inactivar con Grupos en curso: los Grupos siguen; no se abren nuevos (exigirActivo)', async () => {
    const inactivo = await como(admin).patch(`/cursos/${cursoId}`, { activo: false });
    expect(inactivo.body).toMatchObject({ activo: false, gruposEnCurso: 1 });
    expect(await prisma.grupo.count({ where: { cursoId, estado: 'en_curso' } })).toBe(1);
    expect(((await como(admin).get('/cursos')).body as CursoListado[]).some((c) => c.id === cursoId)).toBe(false);
    expect(((await como(admin).get('/cursos?incluirInactivos=true')).body as CursoListado[]).some((c) => c.id === cursoId)).toBe(true);

    const cursos = app.get(CursoService);
    await expect(cursos.exigirActivo(cursoId)).rejects.toMatchObject({ code: 'CURSO_INACTIVO' });
    await como(admin).patch(`/cursos/${cursoId}`, { activo: true });
    await expect(cursos.exigirActivo(cursoId)).resolves.toBeUndefined();
  });

  it('H6.4: eliminar con un Grupo (aunque esté terminado) → 409; sin Grupos va a la papelera y se restaura (H6.5)', async () => {
    await prisma.grupo.updateMany({ where: { cursoId }, data: { estado: 'finalizado', motivoCierre: 'completado' } });
    const conGrupo = await como(admin).del(`/cursos/${cursoId}`);
    expect(conGrupo.status).toBe(409);
    expect(conGrupo.body.code).toBe('CURSO_TIENE_GRUPOS');

    await prisma.grupo.deleteMany({ where: { cursoId } });
    expect((await como(admin).del(`/cursos/${cursoId}`)).status).toBe(204);
    expect((await como(admin).get(`/cursos/${cursoId}`)).status).toBe(404);
    await expect(app.get(CursoService).exigirActivo(cursoId)).rejects.toMatchObject({ code: 'CURSO_INACTIVO' });
    expect((await como(admin).get('/cursos/papelera')).body).toContainEqual(expect.objectContaining({ id: cursoId }));
    expect((await como(admin).get('/cursos/disponibles-para-alta')).body).toContainEqual(expect.objectContaining({ categoria: 'vida_nueva', tipo: 'grupal', restaurar: true }));

    const restaurado = await como(admin).post(`/cursos/${cursoId}/restaurar`);
    expect(restaurado.status).toBe(200);
    expect(restaurado.body).toMatchObject({ id: cursoId });
  });

  it('H6.6: el Pastor lee el catálogo y el resumen; no escribe ni ve la papelera', async () => {
    expect((await como(pastor).get('/cursos')).status).toBe(200);
    expect((await como(pastor).get(`/cursos/${cursoId}`)).status).toBe(200);
    const resumen = await como(pastor).get('/catalogos/resumen');
    expect(resumen.body).toMatchObject({ sedes: { activos: expect.any(Number), total: expect.any(Number) }, cursos: { activos: expect.any(Number), total: expect.any(Number) } });
    expect(resumen.body.cursos.total).toBeGreaterThanOrEqual(2);
    expect((await como(pastor).patch(`/cursos/${cursoId}`, { nombre: 'x' })).status).toBe(403);
    expect((await como(pastor).post('/cursos', { categoria: 'vida_nueva', tipo: 'grupal', nombre: 'x' })).status).toBe(403);
    expect((await como(pastor).del(`/cursos/${cursoId}`)).status).toBe(403);
    expect((await como(pastor).post(`/cursos/${cursoId}/restaurar`)).status).toBe(403);
    expect((await como(pastor).get('/cursos/papelera')).status).toBe(403);
  });
});
