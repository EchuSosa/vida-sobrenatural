import type { TalleRemera } from '@vida-sobrenatural/shared-types';
import type { ContextoSeedDemo } from './contexto.js';

const DIA = 86_400_000;
/** Un instante a `dias` de hoy, a las `hora` de Argentina (UTC-3). */
const en = (dias: number, hora = 18) => {
  const d = new Date(Date.now() + dias * DIA);
  d.setUTCHours(hora + 3, 0, 0, 0);
  return d;
};

/**
 * spec 010, T062 (D120) — Bautismo con datos para mirar: una Persona en cada
 * estado de la card (en revisión, aceptada esperando fecha, con fecha,
 * pasada sin confirmar, bautizada, rechazada, retirada), una habilitada sin
 * Vida Nueva, un pedido creado en nombre de una Persona sin acceso a la app,
 * un Evento de bautismo próximo con tres asignadas y uno pasado ya
 * confirmado. Los pedidos tienen talles de remera variados y uno "Sin dato"
 * (como los de antes de D220), para ver el resumen de talles del Evento. La
 * descripción del Evento lleva la charla pre-bautismo y qué traer. Nombres
 * largos con tildes y apellidos compuestos, para ver que la card y la sección del Evento no desbordan a 360 px. Emails `demo-`;
 * idempotente (si ya hay pedidos de bautismo de demo, no hace nada).
 */
export async function sembrarDemo010(ctx: ContextoSeedDemo): Promise<void> {
  const { prisma, sedes } = ctx;
  const admin = await prisma.persona.findFirst({ where: { rol: { has: 'admin' }, estado: 'activa' }, select: { id: true } });
  if (!admin) {
    console.log('seed-demo 010: no hay un Admin activo; no se siembra Bautismo.');
    return;
  }
  if (await prisma.solicitudBautismo.findFirst({ where: { persona: { email: { startsWith: 'demo-bautismo-' } } }, select: { id: true } })) {
    console.log('seed-demo 010: Bautismo ya sembrado.');
    return;
  }

  async function persona(clave: string, nombre: string, apellido: string, opciones: { sinEmail?: boolean; nacimiento?: string } = {}): Promise<string> {
    const email = opciones.sinEmail ? null : `demo-bautismo-${clave}@example.com`;
    const existente = email
      ? await prisma.persona.findUnique({ where: { email }, select: { id: true } })
      : await prisma.persona.findFirst({ where: { nombre, apellido, email: null }, select: { id: true } });
    if (existente) return existente.id;
    const creada = await prisma.persona.create({
      data: {
        email,
        nombre,
        apellido,
        genero: clave.length % 2 === 0 ? 'femenino' : 'masculino',
        fechaNacimiento: new Date(opciones.nacimiento ?? '1987-06-14'),
        telefono: `+54 9 221 840-${String(1000 + clave.length * 37).slice(-4)}`,
        direccion: 'Calle 13 entre 44 y 45, La Plata',
        sedeId: sedes.laPlata,
        estadoCivil: 'soltero_a',
        profesion: 'otro',
        congregaDesde: 2023,
        estado: 'activa',
        consentimientoDatos: true,
        rol: ['miembro_registrado'],
      },
      select: { id: true },
    });
    return creada.id;
  }

  async function evento(slug: string, nombre: string, inicio: Date, lugar: string | null) {
    const existente = await prisma.evento.findUnique({ where: { slug }, select: { id: true } });
    if (existente) return existente.id;
    const creado = await prisma.evento.create({
      data: {
        sedeId: sedes.laPlata,
        nombre,
        slug,
        descripcion:
          'Un domingo para celebrar juntos a quienes deciden bautizarse.\n\n' +
          'Ese mismo día, a las 9, es la charla pre-bautismo, en el mismo lugar.\n\n' +
          'Qué traer: una muda de ropa, un toallón y ojotas o crocs. La remera te la regala la iglesia.',
        tipo: 'bautismo',
        inicio,
        fin: new Date(inicio.getTime() + 2 * 3_600_000),
        lugar,
        requiereInscripcion: true,
        creadoPorId: admin!.id,
      },
      select: { id: true },
    });
    return creado.id;
  }

  async function solicitud(personaId: string, datos: { estado?: 'pendiente' | 'aprobada' | 'rechazada' | 'retirada' | 'realizada'; comentario?: string; motivo?: string; dias?: number; creadoPor?: boolean; eventoId?: string; realizadaEn?: Date; talle?: TalleRemera | null }) {
    const estado = datos.estado ?? 'pendiente';
    const creada = new Date(Date.now() - (datos.dias ?? 3) * DIA);
    const inscripcion = datos.eventoId
      ? await prisma.inscripcionEvento.create({ data: { eventoId: datos.eventoId, personaId, estado: 'confirmada', creadoPorId: admin!.id }, select: { id: true } })
      : null;
    await prisma.solicitudBautismo.create({
      data: {
        personaId,
        estado,
        comentario: datos.comentario ?? null,
        // D220: `null` = como un pedido de antes del ajuste ("Sin dato").
        talleRemera: datos.talle === undefined ? 'M' : datos.talle,
        creadoPorId: datos.creadoPor ? admin!.id : null,
        createdAt: creada,
        ...(estado !== 'pendiente' && estado !== 'retirada' ? { revisadoPorId: admin!.id, revisadaEn: new Date(creada.getTime() + DIA) } : {}),
        motivoRechazo: datos.motivo ?? null,
        retiradaEn: estado === 'retirada' ? new Date(creada.getTime() + DIA) : null,
        realizadaEn: estado === 'realizada' ? (datos.realizadaEn ?? null) : null,
        inscripcionEventoId: inscripcion?.id ?? null,
      },
    });
  }

  const proximo = await evento('demo-bautismo-noviembre', 'Bautismos en el río — Punta Lara', en(18, 10), 'Balneario Punta Lara, bajada de la calle 13\n(nos encontramos frente al puesto de guardavidas)');
  const pasadoSinConfirmar = await evento('demo-bautismo-hace-unos-dias', 'Bautismos de primavera', en(-4, 11), null);
  const pasadoConfirmado = await evento('demo-bautismo-agosto', 'Bautismos de agosto', en(-60, 11), null);

  await solicitud(await persona('revision', 'María de los Ángeles', 'Fernández Etcheverry'), { comentario: 'Me gustaría bautizarme junto a mi hija, que también está haciendo Vida Nueva.', dias: 2, talle: 'L' });
  await solicitud(await persona('revision-2', 'Juan Ignacio', 'Pérez'), { dias: 9, talle: 'XL' });
  await solicitud(await persona('espera', 'Ana Sofía', 'Gómez Ruiz Díaz'), { estado: 'aprobada', dias: 21, talle: 'S' });
  await solicitud(await persona('espera-2', 'Agustín', 'Iturralde'), { estado: 'aprobada', dias: 12, talle: 'XXL' });
  for (const [clave, nombre, apellido, talle] of [
    ['fecha-1', 'Lucía Belén', 'Martínez de la Fuente', 'S'],
    ['fecha-2', 'Ezequiel', 'Núñez', 'L'],
    ['fecha-3', 'Florencia Abigail', 'Quiroga Saavedra', null],
  ] as const) {
    await solicitud(await persona(clave, nombre, apellido), { estado: 'aprobada', dias: 30, eventoId: proximo, talle });
  }
  await solicitud(await persona('confirmando', 'Ramón Esteban', 'Olmedo'), { estado: 'aprobada', dias: 40, eventoId: pasadoSinConfirmar, talle: 'XXXL' });
  for (const clave of ['bautizada-1', 'bautizada-2']) {
    const id = await persona(clave, clave === 'bautizada-1' ? 'Valentina' : 'Gonzalo Martín', clave === 'bautizada-1' ? 'Sánchez Lorenzo' : 'Ávalos');
    await solicitud(id, { estado: 'realizada', dias: 90, eventoId: pasadoConfirmado, realizadaEn: en(-60, 11), talle: clave === 'bautizada-1' ? 'XS' : 'M' });
  }
  await solicitud(await persona('rechazada', 'Camila', 'Benítez'), { estado: 'rechazada', motivo: 'Prefiere esperar a terminar Vida Nueva; lo charlamos con su Discipuladora.', dias: 15 });
  await solicitud(await persona('retirada', 'Federico', 'Luna Arrieta'), { estado: 'retirada', dias: 25 });
  await solicitud(await persona('sin-app', 'Haydée Teresa', 'Villalba de Cáceres', { sinEmail: true, nacimiento: '1946-02-03' }), {
    comentario: 'Lo pidió en la reunión del domingo; no usa la app.',
    creadoPor: true,
    dias: 5,
  });

  // FR-021: habilitada sin Vida Nueva (todavía no lo pidió).
  const habilitada = await persona('habilitada', 'Graciela Noemí', 'Toledo');
  await prisma.persona.update({ where: { id: habilitada }, data: { bautismoHabilitadoEn: new Date(Date.now() - 6 * DIA), bautismoHabilitadoPorId: admin.id } });

  console.log('seed-demo 010: pedidos de bautismo en cada estado y tres Eventos de bautismo.');
}
