import type { ContextoSeedDemo } from './contexto.js';

/**
 * spec 012, T017 (D120, FR-041) — avisos para mirar la app con datos: para
 * cada Persona Admin (la que entra con `SEED_ADMIN_EMAIL`) ~25 avisos —
 * alcanza para ver el paginado de a 20 —, leídos y sin leer, uno por cada
 * evento de la 004 que le llega a una Persona, la activación de cuenta y
 * otros de 008–011; para otras tres Personas de demo, unos pocos. Dos avisos
 * manuales del Admin con datos hostiles (título de 80 caracteres con tildes y
 * eñes; mensaje de 1000 con saltos de línea) y uno importante con un mail que
 * no salió y otro por salir. Ficticio e idempotente: si ya está el manual
 * largo, no se siembra de nuevo.
 */
const TITULO_LARGO = '¡Ñandúes, pingüinos y cigüeñas: el retiro de otoño cambió de lugar y de horario!';
const MENSAJE_LARGO = (() => {
  const parrafos = [
    'Queridos hermanos y hermanas:',
    'Les contamos que el retiro de otoño se muda a la Quinta Los Pinos (Ruta 2, km 45). La salida es el sábado a las 8 desde la sede de La Plata.',
    'Traigan ropa abrigada, bolsa de dormir, Biblia, cuaderno y muchas ganas de compartir. Va a haber mate, guitarra y fogón a la noche.',
    'Si necesitan que los pasemos a buscar, avísenle al equipo de bienvenida antes del jueves. Si tienen alguna dificultad para pagar, hablen con confianza: nadie se queda afuera por eso.',
    'Más información en https://ejemplo.org/retiro (este enlace se muestra como texto, no se puede tocar).',
  ];
  let texto = parrafos.join('\n\n');
  while (texto.length < 1000) texto += ' ¡Los esperamos!';
  return texto.slice(0, 1000);
})();

const DIA = 86_400_000;
const haceDias = (d: number, h = 0) => new Date(Date.now() - d * DIA - h * 3_600_000);

type Automatico = { evento: string; params: Record<string, unknown>; importante?: boolean };

/** Los automáticos de demo, en el orden en que "llegaron" (el primero es el más nuevo). */
function automaticosPara(personaId: string): Automatico[] {
  const ev = { eventoId: 'demo-evento', evento: 'Campamento de jóvenes', slug: 'demo-campamento-de-jovenes' };
  return [
    { evento: 'evento.proximo', params: { eventoId: 'demo-evento', evento: 'Noche de alabanza' } },
    { evento: 'evento.lista_espera_promovida', params: { inscripcionId: 'demo-i', ...ev, estadoNuevo: 'confirmada' }, importante: true },
    { evento: 'evento.recordatorio_inscripcion', params: { ...ev, dias: 3 } },
    { evento: 'evento.pago_verificado', params: { pagoId: 'demo-p', inscripcionId: 'demo-i', ...ev }, importante: true },
    { evento: 'vida_servicio.contenido_liberado', params: { grupoId: 'demo-g', cronogramaItemId: 'demo-c', semana: 3 } },
    { evento: 'ministerio.postulacion_aprobada', params: { postulacionId: 'demo-po', ministerioId: 'demo-m', ministerio: 'Alabanza', celulaId: null, reemplazaA: null }, importante: true },
    { evento: 'discipulado.finalizacion_confirmada', params: { grupoId: 'demo-g', inscripcionId: 'demo-i' } },
    { evento: 'discipulado.propuesta_aceptada', params: { solicitudId: 'demo-s', grupoId: 'demo-g', discipuladorId: 'demo-d' }, importante: true },
    { evento: 'discipulado.propuesta_nueva', params: { propuestaId: 'demo-pr', solicitudId: 'demo-s' }, importante: true },
    { evento: 'discipulado.solicitud_rechazada', params: { solicitudId: 'demo-s2' }, importante: true },
    { evento: 'discipulado.baja_confirmada', params: { grupoId: 'demo-g2', inscripcionId: 'demo-i2' } },
    { evento: 'persona.cuenta_activada', params: { personaId }, importante: true },
    { evento: 'evento.modificado', params: ev },
    { evento: 'historial.declaracion_confirmada', params: { declaracionId: 'demo-dec', etapa: 'bienvenida' }, importante: true },
    { evento: 'vida_servicio.inscripcion_aprobada', params: { solicitudId: 'demo-vs', grupoId: 'demo-g3', inscripcionId: 'demo-i3' }, importante: true },
    { evento: 'evento.inscripcion_confirmada', params: { inscripcionId: 'demo-i4', ...ev }, importante: true },
    { evento: 'vida_servicio.contenido_liberado', params: { grupoId: 'demo-g', cronogramaItemId: 'demo-c2', semana: 2 } },
    { evento: 'vida_servicio.contenido_liberado', params: { grupoId: 'demo-g', cronogramaItemId: 'demo-c1', semana: 1 } },
    { evento: 'evento.pago_rechazado', params: { pagoId: 'demo-p0', inscripcionId: 'demo-i', ...ev }, importante: true },
    { evento: 'evento.inscripcion_creada_por_admin', params: { inscripcionId: 'demo-i5', ...ev, estado: 'pendiente' } },
    { evento: 'historial.completitud_registrada', params: { completitudId: 'demo-cm', etapa: 'vida_nueva' } },
    { evento: 'bautismo.solicitud_aceptada', params: { solicitudId: 'demo-b' }, importante: true },
  ];
}

export async function sembrarDemo012(ctx: ContextoSeedDemo): Promise<void> {
  const { prisma } = ctx;
  if (await prisma.notificacion.findFirst({ where: { tipo: 'manual', titulo: TITULO_LARGO }, select: { id: true } })) {
    console.log('seed-demo 012: los avisos de demo ya están; no se duplican.');
    return;
  }
  const activas = await prisma.persona.findMany({
    where: { estado: 'activa', activo: true },
    orderBy: { createdAt: 'asc' },
    take: 30,
    select: { id: true, rol: true, email: true },
  });
  if (activas.length === 0) {
    console.log('seed-demo 012: no hay Personas activas; no se siembran avisos.');
    return;
  }
  // Si nadie es Admin todavía (el seed mínimo da el rol a SEED_ADMIN_EMAIL recién
  // cuando esa Persona se registra), la primera Persona hace de Admin de demo.
  const conRolAdmin = activas.filter((p) => p.rol.includes('admin'));
  const admins = conRolAdmin.length > 0 ? conRolAdmin : [activas[0]];
  const autor = admins[0];
  const otras = activas.filter((p) => !admins.includes(p)).slice(0, 3);

  async function automatico(personaId: string, a: Automatico, fecha: Date, leida: boolean) {
    const n = await prisma.notificacion.create({
      data: {
        tipo: 'automatica',
        prioridad: a.importante ? 'importante' : 'normal',
        alcance: 'persona',
        alcanceId: personaId,
        evento: a.evento,
        params: a.params as object,
        createdAt: fecha,
      },
      select: { id: true },
    });
    await prisma.entregaNotificacion.create({
      data: { notificacionId: n.id, personaId, canal: 'app', estado: 'enviada', enviadaEn: fecha, leidaEn: leida ? fecha : null, createdAt: fecha },
    });
    return n.id;
  }

  async function manual(datos: { titulo: string; mensaje: string; importante: boolean; fecha: Date }, para: { id: string; leida: boolean }[]) {
    const n = await prisma.notificacion.create({
      data: {
        tipo: 'manual',
        prioridad: datos.importante ? 'importante' : 'normal',
        alcance: 'todos',
        titulo: datos.titulo,
        mensaje: datos.mensaje,
        creadoPorId: autor.id,
        createdAt: datos.fecha,
      },
      select: { id: true },
    });
    await prisma.entregaNotificacion.createMany({
      data: para.map((p) => ({ notificacionId: n.id, personaId: p.id, canal: 'app' as const, estado: 'enviada' as const, enviadaEn: datos.fecha, leidaEn: p.leida ? datos.fecha : null, createdAt: datos.fecha })),
    });
    return n.id;
  }

  // ~25 por Admin: 22 automáticos + 3 manuales; los cinco más nuevos sin leer.
  for (const admin of admins) {
    const lista = automaticosPara(admin.id);
    for (const [i, a] of lista.entries()) await automatico(admin.id, a, haceDias(i + 1, i % 5), i >= 5);
  }
  // Unos pocos para otras Personas de demo (para que su pantalla tampoco quede vacía).
  for (const [j, p] of otras.entries()) {
    for (const [i, a] of automaticosPara(p.id).slice(j, j + 4).entries()) await automatico(p.id, a, haceDias(i * 2 + 1), i > 1);
  }

  const todas = [...admins, ...otras];
  await manual({ titulo: TITULO_LARGO, mensaje: MENSAJE_LARGO, importante: false, fecha: haceDias(0, 3) }, todas.map((p) => ({ id: p.id, leida: false })));
  await manual(
    { titulo: 'Culto especial de aniversario', mensaje: 'Este domingo celebramos 15 años de la iglesia.\nHay un solo culto, a las 18.', importante: false, fecha: haceDias(6) },
    todas.map((p, i) => ({ id: p.id, leida: i % 2 === 0 })),
  );

  // Importante con un mail que no salió (aparece en el detalle del backoffice) y otro por salir.
  const importante = await manual(
    { titulo: 'Cambio de horario del culto', mensaje: 'Desde el domingo que viene, el culto empieza a las 19.', importante: true, fecha: haceDias(2) },
    todas.map((p) => ({ id: p.id, leida: true })),
  );
  const conEmail = todas.filter((p) => p.email);
  if (conEmail[0]) {
    await prisma.entregaNotificacion.create({
      data: { notificacionId: importante, personaId: conEmail[0].id, canal: 'email', estado: 'enviada', intentos: 1, enviadaEn: haceDias(2) },
    });
  }
  if (conEmail[1]) {
    await prisma.entregaNotificacion.create({
      data: { notificacionId: importante, personaId: conEmail[1].id, canal: 'email', estado: 'fallida', intentos: 5, ultimoError: 'ENVIO_FALLIDO' },
    });
  }
  // Un automático importante cuyo mail no salió: lo lista "Mails que no salieron" (FR-031).
  if (otras[0]) {
    const n = await automatico(otras[0].id, automaticosPara(otras[0].id)[7], haceDias(1), false);
    await prisma.entregaNotificacion.create({
      data: { notificacionId: n, personaId: otras[0].id, canal: 'email', estado: 'fallida', intentos: 5, ultimoError: 'ENVIO_FALLIDO' },
    });
  }
  // Uno por salir: lo manda el proceso de mails apenas arranca la API (a Mailpit, en local).
  if (otras[1]?.email) {
    const n = await automatico(otras[1].id, automaticosPara(otras[1].id)[11], haceDias(0, 1), false);
    await prisma.entregaNotificacion.create({
      data: { notificacionId: n, personaId: otras[1].id, canal: 'email', estado: 'pendiente', proximoIntentoEn: new Date() },
    });
  }
  console.log(`seed-demo 012: avisos sembrados para ${admins.length} Admin y ${otras.length} Personas más.`);
}
