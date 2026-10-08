import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import type { ComentarioDetalle, ComentarioResumen, Pagina } from '@vida-sobrenatural/shared-types';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { configurarApp } from '../../src/configurar-app.js';
import { EmailService } from '../../src/email/email.service.js';
import { huella } from '../../src/codigo-ingreso/huella.js';
import { EmailServiceFalso } from '../email-service-falso.js';
import { Escenario, tokenDe } from './discipulado-fixtures.js';

/**
 * spec 013, T063 (Historia 5, H5.1–H5.8, SC-006): "Contanos qué te parece"
 * contra la base de test, con `EmailServiceFalso` (nunca un mail real).
 */
describe('Contanos qué te parece (integración, spec 013 T063)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let escenario: Escenario;
  const email = new EmailServiceFalso();
  const sufijo = `coment${Date.now()}`;
  const SECRETO = () => process.env.INTERNAL_API_SECRET ?? '';
  const id: Record<string, string> = {};
  const token: Record<string, string> = {};
  const creados: string[] = [];
  let contadorOrigen = 0;
  const destinoAntes = process.env.EMAIL_COMENTARIOS_DESTINO;
  const backofficeAntes = process.env.BACKOFFICE_URL;

  /** Un origen distinto por prueba, para que el límite por IP no cruce casos. */
  const origen = () => `10.13.${Date.now() % 250}.${++contadorOrigen}`;
  const valido = (extra: object = {}) => ({ tipo: 'problema', texto: 'No me carga la página de libros', aceptaContacto: false, paginaOrigen: '/libros', app: 'web', ...extra });

  async function enviar(cuerpo: object, o: { ip?: string; token?: string; secreto?: string } = {}) {
    let r = request(app.getHttpServer())
      .post('/comentarios')
      .set('X-Internal-Secret', o.secreto ?? SECRETO())
      .set('X-Origen-Cliente', o.ip ?? origen());
    if (o.token) r = r.set('Authorization', `Bearer ${o.token}`);
    const res = await r.send(cuerpo);
    if (res.status === 201) creados.push(res.body.id);
    return res;
  }
  const como = (t: string, metodo: 'get' | 'post' | 'delete', ruta: string) => request(app.getHttpServer())[metodo](ruta).set('Authorization', `Bearer ${t}`);

  beforeAll(async () => {
    process.env.EMAIL_COMENTARIOS_DESTINO = 'desarrolladora@example.com';
    process.env.BACKOFFICE_URL = 'http://localhost:3002/';
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(EmailService).useValue(email).compile();
    app = modulo.createNestApplication<INestApplication<Server>>();
    configurarApp(app);
    await app.init();
    prisma = modulo.get(PrismaService);
    escenario = new Escenario(prisma, sufijo);
    await escenario.preparar();
    id.admin = await escenario.persona('admin', { rol: ['miembro_registrado', 'admin'] });
    id.pastor = await escenario.persona('pastor', { rol: ['miembro_registrado', 'pastor'] });
    id.rosa = await escenario.persona('rosa', { telefono: '+5492215550199' });
    token.admin = await tokenDe(id.admin, ['miembro_registrado', 'admin']);
    token.pastor = await tokenDe(id.pastor, ['miembro_registrado', 'pastor']);
    token.rosa = await tokenDe(id.rosa, ['miembro_registrado']);
  });

  beforeEach(() => email.limpiar());

  afterAll(async () => {
    await prisma.comentarioApp.deleteMany({ where: { OR: [{ id: { in: creados } }, { personaId: { in: Object.values(id) } }, { revisadoPorId: { in: Object.values(id) } }] } });
    await escenario.limpiar();
    await app.close();
    process.env.EMAIL_COMENTARIOS_DESTINO = destinoAntes;
    process.env.BACKOFFICE_URL = backofficeAntes;
  });

  it('H5.1: sin sesión guarda página (sin query), navegador, requestId y la huella del origen, nunca la IP', async () => {
    const ip = origen();
    const res = await enviar(valido({ paginaOrigen: '/libros?buscar=rosa#arriba', navegador: 'Chrome 141 · Android', ultimoRequestId: 'req-abc-123' }), { ip });
    expect(res.status).toBe(201);
    const fila = await prisma.comentarioApp.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(fila).toMatchObject({ paginaOrigen: '/libros', navegador: 'Chrome 141 · Android', ultimoRequestId: 'req-abc-123', app: 'web', personaId: null, origenHuella: huella(ip) });
    expect(JSON.stringify(fila)).not.toContain(ip);
  });

  it('H5.2: con sesión queda a nombre de la Persona y sin contacto propio; si acepta, el detalle usa los de su perfil', async () => {
    const res = await enviar(valido({ tipo: 'sugerencia', aceptaContacto: true, contactoEmail: 'otro@example.com', app: 'backoffice' }), { token: token.rosa });
    expect(res.status).toBe(201);
    const fila = await prisma.comentarioApp.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(fila).toMatchObject({ personaId: id.rosa, contactoEmail: null, contactoTelefono: null, aceptaContacto: true, app: 'backoffice' });
    const detalle = (await como(token.admin, 'get', `/comentarios/${res.body.id}`)).body as ComentarioDetalle;
    expect(detalle.persona).toMatchObject({ id: id.rosa, activo: true });
    expect(detalle.contacto).toEqual({ email: `integ-disc-rosa-${sufijo}@example.com`, telefono: '+5492215550199' });
  });

  it('H5.3: "Pueden contactarme" sin sesión pide email o teléfono; con uno alcanza; con formato malo, error en su campo', async () => {
    const sinNada = await enviar(valido({ aceptaContacto: true }));
    expect(sinNada.status).toBe(400);
    expect(sinNada.body.errors).toEqual([{ campo: 'contacto', code: 'CONTACTO_INVALIDO' }]);

    const malo = await enviar(valido({ aceptaContacto: true, contactoEmail: 'sin-arroba', contactoTelefono: '123' }));
    expect(malo.body.errors).toEqual(
      expect.arrayContaining([
        { campo: 'contactoEmail', code: 'CONTACTOEMAIL_INVALIDO' },
        { campo: 'contactoTelefono', code: 'CONTACTOTELEFONO_INVALIDO' },
      ]),
    );

    const conTelefono = await enviar(valido({ aceptaContacto: true, contactoTelefono: '+54 221 555 0101' }));
    expect(conTelefono.status).toBe(201);
    const detalle = (await como(token.admin, 'get', `/comentarios/${conTelefono.body.id}`)).body as ComentarioDetalle;
    expect(detalle.contacto).toEqual({ email: null, telefono: '+54 221 555 0101' });

    // Sin la casilla, el contacto que venga no se guarda.
    const sinCasilla = await enviar(valido({ contactoEmail: 'ana@example.com' }));
    expect((await prisma.comentarioApp.findUniqueOrThrow({ where: { id: sinCasilla.body.id } })).contactoEmail).toBeNull();
  });

  it('H5.4: texto vacío o de 2001 caracteres → TEXTO_INVALIDO en el campo texto', async () => {
    for (const texto of ['   ', 'a'.repeat(2001)]) {
      const res = await enviar(valido({ texto }));
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ code: 'VALIDACION', errors: [{ campo: 'texto', code: 'TEXTO_INVALIDO' }] });
    }
    expect((await enviar(valido({ texto: 'a'.repeat(2000) }))).status).toBe(201);
  });

  it('H5.5: el sexto comentario en la hora desde el mismo origen → 429 con reintentarEn; otro origen sigue pudiendo', async () => {
    const ip = origen();
    for (let i = 0; i < 5; i++) expect((await enviar(valido(), { ip })).status).toBe(201);
    const sexto = await enviar(valido(), { ip });
    expect(sexto.status).toBe(429);
    expect(sexto.body.code).toBe('DEMASIADOS_PEDIDOS');
    expect(sexto.body.reintentarEn).toBeGreaterThan(3500);
    expect(sexto.body.reintentarEn).toBeLessThanOrEqual(3600);
    expect((await enviar(valido())).status).toBe(201);
  });

  it('sin X-Internal-Secret → 401 (el navegador no llama directo); token inválido → 401', async () => {
    expect((await enviar(valido(), { secreto: 'otro' })).status).toBe(401);
    expect((await enviar(valido(), { token: 'no-es-un-token' })).status).toBe(401);
  });

  it('H5.6: manda un email con asunto sin el texto y enlace al detalle; si el envío falla, igual queda guardado', async () => {
    const res = await enviar(valido({ texto: 'Mi teléfono es 2215550101 y no anda <b>nada</b>' }));
    expect(email.enviados).toHaveLength(1);
    const [mail] = email.enviados;
    expect(mail).toMatchObject({ para: 'desarrolladora@example.com', asunto: 'Nuevo comentario en la app (problema)' });
    expect(mail!.asunto).not.toContain('2215550101');
    expect(mail!.texto).toContain(`http://localhost:3002/comentarios/${res.body.id}`);
    expect(mail!.html).toContain('&lt;b&gt;nada&lt;/b&gt;');

    email.fallarLosProximos(1);
    const conFalla = await enviar(valido());
    expect(conFalla.status).toBe(201);
    expect(await prisma.comentarioApp.findUnique({ where: { id: conFalla.body.id } })).not.toBeNull();
  });

  it('H5.7: listar sin revisar, marcar (idempotente, con quién y cuándo) y deshacer; el conteo acompaña', async () => {
    const { body } = await enviar(valido({ tipo: 'sugerencia', texto: `Sugerencia ${sufijo} `.repeat(20) }));
    const antes = (await como(token.admin, 'get', '/comentarios/conteo-sin-revisar')).body.total as number;

    const lista = (await como(token.admin, 'get', '/comentarios?take=100')).body as Pagina<ComentarioResumen>;
    const fila = lista.items.find((c) => c.id === body.id)!;
    expect(fila).toMatchObject({ tipo: 'sugerencia', revisado: null, persona: null, app: 'web' });
    expect(fila.extracto.length).toBeLessThanOrEqual(141);
    expect(fila).not.toHaveProperty('texto');

    const marcado = await como(token.admin, 'post', `/comentarios/${body.id}/revisado`);
    expect(marcado.status).toBe(200);
    expect(marcado.body.revisado).toMatchObject({ por: { id: id.admin } });
    const otraVez = await como(token.admin, 'post', `/comentarios/${body.id}/revisado`);
    expect(otraVez.body.revisado).toEqual(marcado.body.revisado);
    expect((await como(token.admin, 'get', '/comentarios/conteo-sin-revisar')).body.total).toBe(antes - 1);
    const revisados = (await como(token.admin, 'get', '/comentarios?revisado=si&tipo=sugerencia&take=100')).body as Pagina<ComentarioResumen>;
    expect(revisados.items.some((c) => c.id === body.id)).toBe(true);

    const deshecho = await como(token.admin, 'delete', `/comentarios/${body.id}/revisado`);
    expect(deshecho.body.revisado).toBeNull();
    expect((await como(token.admin, 'delete', `/comentarios/${body.id}/revisado`)).status).toBe(200);
    expect((await como(token.admin, 'get', '/comentarios?revisado=otro')).status).toBe(400);
    expect((await como(token.admin, 'get', '/comentarios/00000000-0000-4000-8000-000000000000')).status).toBe(404);
  });

  it('H5.8: el Pastor lee el listado y el detalle, pero no marca; una Persona sin permiso no lee', async () => {
    const { body } = await enviar(valido());
    expect((await como(token.pastor, 'get', '/comentarios')).status).toBe(200);
    expect((await como(token.pastor, 'get', `/comentarios/${body.id}`)).status).toBe(200);
    expect((await como(token.pastor, 'post', `/comentarios/${body.id}/revisado`)).status).toBe(403);
    expect((await como(token.rosa, 'get', '/comentarios')).status).toBe(403);
  });
});
