import type { Prisma } from '../../src/generated/prisma/client.js';
import type { ContextoSeedDemo } from './contexto.js';

const DIA = 86_400_000;
const en = (dias: number, hora = 19) => {
  const d = new Date(Date.now() + dias * DIA);
  d.setUTCHours(hora + 3, 0, 0, 0); // hora de Argentina (UTC-3)
  return d;
};

/**
 * spec 011, T081 (research #17, D99, D120) — Eventos para mirar la app con
 * datos: informativo, lleno con lista de espera, campamento con costo y
 * Pagos en los tres estados, con aprobación y pendientes, cancelado, pasado,
 * eliminado, bautismo con dos Personas, y datos hostiles (nombre de 120
 * caracteres, descripción larga con saltos, lugar de dos renglones, costo
 * con centavos). Idempotente por slug. Sin flyers: se suben desde el
 * backoffice (necesitan el almacenamiento de archivos).
 */
export async function sembrarDemo011(ctx: ContextoSeedDemo): Promise<void> {
  const { prisma, sedes } = ctx;
  const personas = await prisma.persona.findMany({ where: { estado: 'activa' }, orderBy: { createdAt: 'asc' }, take: 10, select: { id: true, rol: true } });
  if (personas.length < 6) {
    console.log('seed-demo 011: hacen falta al menos 6 Personas activas; no se siembran Eventos.');
    return;
  }
  const admin = personas.find((p) => p.rol.includes('admin')) ?? personas[0];
  const [p1, p2, p3, p4, p5, p6] = personas.filter((p) => p.id !== admin.id);

  async function evento(slug: string, datos: Omit<Prisma.EventoUncheckedCreateInput, 'slug' | 'creadoPorId' | 'sedeId'> & { sedeId?: string }) {
    const existente = await prisma.evento.findUnique({ where: { slug }, select: { id: true } });
    if (existente) return { id: existente.id, nuevo: false };
    const creado = await prisma.evento.create({ data: { sedeId: sedes.laPlata, ...datos, slug, creadoPorId: admin.id }, select: { id: true } });
    return { id: creado.id, nuevo: true };
  }
  async function inscribir(eventoId: string, personaId: string, estado: 'confirmada' | 'pendiente' | 'lista_espera', minutos = 0) {
    return prisma.inscripcionEvento.create({
      data: { eventoId, personaId, estado, enListaDesde: estado === 'lista_espera' ? new Date(Date.now() - 1000 * 60 * (60 - minutos)) : null },
      select: { id: true },
    });
  }

  await evento('demo-noche-de-alabanza', {
    nombre: 'Noche de alabanza',
    descripcion: 'Una noche para adorar juntos. Traé a quien quieras: no hace falta anotarse.',
    inicio: en(5),
    fin: en(5, 22),
    requiereInscripcion: false,
  });

  const lleno = await evento('demo-taller-de-matrimonios', {
    nombre: 'Taller de matrimonios',
    descripcion: 'Tres encuentros para parejas. Cupo chico para poder conversar.',
    inicio: en(12, 20),
    requiereInscripcion: true,
    cupo: 2,
    permiteListaEspera: true,
    diasAnticipacionRecordatorio: 3,
  });
  if (lleno.nuevo) {
    await inscribir(lleno.id, p1.id, 'confirmada');
    await inscribir(lleno.id, p2.id, 'confirmada');
    await inscribir(lleno.id, p3.id, 'lista_espera', 0);
    await inscribir(lleno.id, p4.id, 'lista_espera', 10);
  }

  const campamento = await evento('demo-campamento-de-jovenes', {
    nombre: 'Campamento de jóvenes',
    descripcion: 'Tres días en la sierra.\n\nIncluye transporte, comidas y alojamiento.\nLlevá bolsa de dormir.',
    inicio: en(30, 8),
    fin: en(32, 18),
    lugar: 'Quinta Los Pinos\nRuta 2, km 45 (entrada por el camino de tierra)',
    publicoObjetivo: 'Jóvenes de 15 a 25',
    requiereInscripcion: true,
    cupo: 40,
    permiteListaEspera: true,
    costo: '45999.50',
    instruccionesPago: 'Transferí al alias VIDA.SOBRENATURAL.LP (Banco Provincia) y subí el comprobante.\nTambién podés pagar en efectivo en la secretaría.',
  });
  if (campamento.nuevo) {
    const conPagoEnRevision = await inscribir(campamento.id, p1.id, 'confirmada');
    await prisma.pago.create({ data: { inscripcionEventoId: conPagoEnRevision.id, monto: '45999.50', medio: 'transferencia', fechaPago: new Date(), estado: 'pendiente_verificacion' } });
    const conPagoVerificado = await inscribir(campamento.id, p2.id, 'confirmada');
    await prisma.pago.create({
      data: { inscripcionEventoId: conPagoVerificado.id, monto: '45999.50', medio: 'efectivo', fechaPago: new Date(), estado: 'verificado', creadoPorId: admin.id, verificadoPorId: admin.id, revisadoEn: new Date() },
    });
    const conRechazo = await inscribir(campamento.id, p3.id, 'confirmada');
    await prisma.pago.create({
      data: { inscripcionEventoId: conRechazo.id, monto: '4599.95', medio: 'transferencia', fechaPago: new Date(), estado: 'rechazado', motivoRechazo: 'El monto no coincide con el costo.', verificadoPorId: admin.id, revisadoEn: new Date() },
    });
    await inscribir(campamento.id, p4.id, 'confirmada');
  }

  const conAprobacion = await evento('demo-retiro-de-lideres', {
    nombre: 'Retiro de líderes',
    descripcion: 'Para quienes sirven en algún ministerio. Cada inscripción la revisa el equipo.',
    inicio: en(20, 9),
    requiereInscripcion: true,
    requiereAprobacion: true,
    cupo: 15,
  });
  if (conAprobacion.nuevo) {
    await inscribir(conAprobacion.id, p5.id, 'pendiente');
    await inscribir(conAprobacion.id, p6.id, 'pendiente');
  }

  await evento('demo-cena-cancelada', {
    nombre: 'Cena de fin de año',
    descripcion: 'Se suspendió por la lluvia.',
    inicio: en(8, 21),
    requiereInscripcion: false,
    estado: 'cancelado',
    canceladoEn: new Date(),
    canceladoPorId: admin.id,
  });
  await evento('demo-culto-de-aniversario', {
    nombre: 'Culto de aniversario',
    descripcion: 'Celebramos un año más como iglesia.',
    inicio: en(-10, 10),
    requiereInscripcion: false,
  });
  await evento('demo-evento-eliminado', {
    nombre: 'Evento cargado por error',
    descripcion: 'Duplicado.',
    inicio: en(15),
    requiereInscripcion: false,
    eliminadoEn: new Date(),
    eliminadoPorId: admin.id,
  });

  const bautismo = await evento('demo-bautismos-de-noviembre', {
    nombre: 'Bautismos de noviembre',
    descripcion: 'Celebración de bautismos. Si querés bautizarte, pedilo desde Mi camino.',
    inicio: en(25, 11),
    tipo: 'bautismo',
    requiereInscripcion: true,
    cupo: 12,
  });
  if (bautismo.nuevo) {
    await prisma.inscripcionEvento.create({ data: { eventoId: bautismo.id, personaId: p5.id, estado: 'confirmada', creadoPorId: admin.id } });
    await prisma.inscripcionEvento.create({ data: { eventoId: bautismo.id, personaId: p6.id, estado: 'confirmada', creadoPorId: admin.id } });
  }

  await evento('demo-nombre-largo', {
    nombre: `Encuentro ${'muy '.repeat(26)}largo`.slice(0, 120),
    descripcion: 'Una descripción larga para ver cómo se acomoda.\n'.repeat(40),
    inicio: en(40),
    requiereInscripcion: true,
    sedeId: sedes.buenosAires,
  });
}
