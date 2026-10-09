import type { ContextoSeedDemo } from './contexto.js';

/**
 * Datos de demo unificados (rama final-demo-manual): las personas con las que
 * se recorre `docs/23-manual-de-pruebas.md` por `/dev/entrar`. Todas son
 * ficticias. Complementa — no reemplaza — lo que sembró cada spec en su
 * archivo: acá va lo que faltaba para que ninguna pantalla quede vacía (un
 * Admin y un Pastor de demo, Discipuladores con agenda y distinta carga, la
 * bandeja de Vida Nueva en cada estado, Grupos con Encuentros, un menor con su
 * tutora, una Persona sin email y comentarios de "Contanos qué te parece").
 *
 * Dos pasos, porque las otras partes del seed usan "el primer Admin" y "las
 * primeras Personas activas":
 * - `sembrarElencoDemo` corre ANTES que el resto: crea las Personas.
 * - `sembrarHistoriaDemo` corre AL FINAL: arma los discipulados y lo demás.
 *
 * Idempotente: cada Persona se identifica por su email (Héctor, que no tiene,
 * por nombre y apellido); la historia de cada una se arma solo la primera vez.
 */

const DIA = 86_400_000;
const hace = (dias: number) => new Date(Date.now() - dias * DIA);
const fechaCivil = (dias: number) => {
  const d = new Date(Date.now() + dias * DIA - 3 * 3_600_000); // día civil en Argentina (UTC-3)
  return new Date(`${d.toISOString().slice(0, 10)}T00:00:00Z`);
};
const nacidoHace = (anios: number, dias = 40) => new Date(Date.now() - (anios * 365.25 + dias) * DIA);
const hs = (h: number, m = 0) => h * 60 + m;

type Genero = 'femenino' | 'masculino';

interface DatosPersona {
  email: string | null;
  nombre: string;
  apellido: string;
  genero: Genero;
  edad: number;
  telefono: string;
  rol?: string[];
  direccion?: string;
}

/** Las Personas del manual, por clave. */
const ELENCO = {
  admin: { email: 'demo-admin@example.com', nombre: 'Mónica', apellido: 'Cabrera', genero: 'femenino', edad: 51, telefono: '+54 9 221 600-0001', rol: ['miembro_registrado', 'admin'] },
  pastor: { email: 'demo-pastor@example.com', nombre: 'Roberto', apellido: 'Medina', genero: 'masculino', edad: 58, telefono: '+54 9 221 600-0002', rol: ['miembro_registrado', 'pastor'] },
  laura: { email: 'demo-disc-laura@example.com', nombre: 'Laura', apellido: 'Gómez', genero: 'femenino', edad: 38, telefono: '+54 9 221 600-0011', rol: ['miembro_registrado', 'discipulador'] },
  marcela: { email: 'demo-disc-marcela@example.com', nombre: 'Marcela', apellido: 'Ruiz', genero: 'femenino', edad: 45, telefono: '+54 9 221 600-0012', rol: ['miembro_registrado', 'discipulador'] },
  jorge: { email: 'demo-disc-jorge@example.com', nombre: 'Jorge', apellido: 'Acosta', genero: 'masculino', edad: 49, telefono: '+54 9 221 600-0013', rol: ['miembro_registrado', 'discipulador'] },
  pablo: { email: 'demo-disc-pablo@example.com', nombre: 'Pablo', apellido: 'Herrera', genero: 'masculino', edad: 34, telefono: '+54 9 221 600-0014', rol: ['miembro_registrado', 'discipulador'] },
  nueva: { email: 'demo-nueva@example.com', nombre: 'Florencia', apellido: 'Arias', genero: 'femenino', edad: 27, telefono: '+54 9 221 600-0021' },
  sofia: { email: 'demo-vn-pendiente@example.com', nombre: 'Sofía', apellido: 'Molina', genero: 'femenino', edad: 31, telefono: '+54 9 221 600-0022' },
  camila: { email: 'demo-vn-propuesta@example.com', nombre: 'Julieta', apellido: 'Ferreyra', genero: 'femenino', edad: 24, telefono: '+54 9 221 600-0023' },
  agustina: { email: 'demo-vn-en-curso@example.com', nombre: 'Agustina', apellido: 'Paz', genero: 'femenino', edad: 29, telefono: '+54 9 221 600-0024' },
  rocio: { email: 'demo-vn-rocio@example.com', nombre: 'Rocío', apellido: 'Aguirre', genero: 'femenino', edad: 36, telefono: '+54 9 221 600-0025' },
  matias: { email: 'demo-vn-matias@example.com', nombre: 'Matías', apellido: 'Vera', genero: 'masculino', edad: 33, telefono: '+54 9 221 600-0026' },
  lucas: { email: 'demo-vn-lucas@example.com', nombre: 'Lucas', apellido: 'Godoy', genero: 'masculino', edad: 41, telefono: '+54 9 221 600-0027' },
  emanuel: { email: 'demo-vn-terminada@example.com', nombre: 'Emanuel', apellido: 'Ortiz', genero: 'masculino', edad: 26, telefono: '+54 9 221 600-0028' },
  valeria: { email: 'demo-vn-rechazada@example.com', nombre: 'Valeria', apellido: 'Domínguez', genero: 'femenino', edad: 44, telefono: '+54 9 221 600-0029' },
  nicolas: { email: 'demo-vn-retirada@example.com', nombre: 'Nicolás', apellido: 'Peña', genero: 'masculino', edad: 22, telefono: '+54 9 221 600-0030' },
  silvina: { email: 'demo-tutora-silvina@example.com', nombre: 'Silvina', apellido: 'Ledesma', genero: 'femenino', edad: 42, telefono: '+54 9 221 600-0031' },
  tomas: { email: 'demo-menor-tomas@example.com', nombre: 'Tomás', apellido: 'Ledesma', genero: 'masculino', edad: 14, telefono: '+54 9 221 600-0031' },
  ramon: { email: null, nombre: 'Héctor', apellido: 'Ríos', genero: 'masculino', edad: 67, telefono: '+54 9 221 600-0040', direccion: 'Calle 66 N°890, La Plata' },
} satisfies Record<string, DatosPersona>;

type Clave = keyof typeof ELENCO;

async function buscar(ctx: ContextoSeedDemo, clave: Clave): Promise<string | null> {
  const datos: DatosPersona = ELENCO[clave];
  const p = datos.email
    ? await ctx.prisma.persona.findUnique({ where: { email: datos.email }, select: { id: true } })
    : await ctx.prisma.persona.findFirst({ where: { email: null, nombre: datos.nombre, apellido: datos.apellido }, select: { id: true } });
  return p?.id ?? null;
}

/** Paso 1 (antes que el resto del seed demo): las Personas del manual. */
export async function sembrarElencoDemo(ctx: ContextoSeedDemo): Promise<void> {
  const { prisma, sedes } = ctx;
  let creadas = 0;
  for (const clave of Object.keys(ELENCO) as Clave[]) {
    if (await buscar(ctx, clave)) continue;
    const d: DatosPersona = ELENCO[clave];
    const esAdminAlta = clave === 'ramon';
    await prisma.persona.create({
      data: {
        email: d.email,
        nombre: d.nombre,
        apellido: d.apellido,
        genero: d.genero,
        fechaNacimiento: nacidoHace(d.edad),
        telefono: d.telefono,
        direccion: d.direccion ?? 'Calle 13 N°1450, La Plata',
        sedeId: sedes.laPlata,
        estadoCivil: d.edad < 18 ? 'soltero_a' : clave === 'ramon' ? 'viudo_a' : 'casado_a',
        profesion: d.edad < 18 ? 'estudiante' : clave === 'ramon' ? 'jubilado_a' : 'educacion',
        congregaDesde: clave === 'nueva' ? new Date().getFullYear() : 2018,
        estado: 'activa',
        consentimientoDatos: true,
        consentimientoDatosFecha: hace(30),
        consentimientoDatosOrigen: esAdminAlta || d.edad < 18 ? 'presencial' : 'app',
        origenAlta: esAdminAlta ? 'admin' : 'autorregistro',
        rol: d.rol ?? ['miembro_registrado'],
        // El Admin y el Pastor, los más antiguos: el seed de avisos (012) se los
        // deja al primer Admin entre las 30 Personas activas más antiguas.
        createdAt: hace(clave === 'nueva' ? 1 : clave === 'admin' || clave === 'pastor' ? 1000 : 60),
      },
    });
    creadas += 1;
  }
  console.log(`seed-demo historia: elenco del manual listo (${creadas} Personas nuevas).`);
}

/** Paso 2 (al final del seed demo): discipulados, bandeja, menor con tutora y comentarios. */
export async function sembrarHistoriaDemo(ctx: ContextoSeedDemo): Promise<void> {
  const { prisma, sedes } = ctx;
  const id = {} as Record<Clave, string>;
  for (const clave of Object.keys(ELENCO) as Clave[]) {
    const encontrado = await buscar(ctx, clave);
    if (!encontrado) throw new Error(`seed-demo historia: falta ${clave}; ¿corrió sembrarElencoDemo?`);
    id[clave] = encontrado;
  }

  // Héctor (sin email) lo cargó el Admin.
  await prisma.persona.update({ where: { id: id.ramon }, data: { altaPor: id.admin } });

  // Si Laura ya tiene agenda, la historia ya está armada: no se duplica nada.
  if (await prisma.franjaAgenda.findFirst({ where: { personaId: id.laura } })) {
    console.log('seed-demo historia: la historia del manual ya estaba sembrada.');
    return;
  }

  const curso = await prisma.curso.findUniqueOrThrow({ where: { categoria_tipo: { categoria: 'vida_nueva', tipo: 'individual' } } });
  const admin = id.admin;

  // --- Discipuladores: agenda, disponibilidad y carga distinta -------------
  const agendas: Array<[Clave, number, number, number]> = [
    ['laura', 2, hs(18), hs(21)],
    ['laura', 4, hs(18), hs(21)],
    ['marcela', 2, hs(19), hs(22)],
    ['marcela', 6, hs(10), hs(13)],
    ['jorge', 1, hs(19), hs(21)],
    ['jorge', 3, hs(19), hs(21)],
    ['pablo', 3, hs(18), hs(20)],
  ];
  for (const [clave, diaSemana, inicio, fin] of agendas) {
    await prisma.franjaAgenda.create({ data: { personaId: id[clave], diaSemana, inicio, fin } });
  }
  await prisma.persona.updateMany({ where: { id: { in: [id.laura, id.marcela, id.jorge, id.pablo] } }, data: { disponibleDiscipulado: true } });
  await prisma.persona.update({ where: { id: id.laura }, data: { maxPersonasPorGrupo: 2 } });
  await prisma.persona.update({ where: { id: id.marcela }, data: { maxPersonasPorGrupo: 2 } });
  // Pablo está de vacaciones: tiene agenda pero hoy no aparece en el cruce.
  await prisma.bloqueoDisponibilidad.create({ data: { personaId: id.pablo, desde: fechaCivil(-3), hasta: fechaCivil(18) } });

  // --- Solicitudes de Vida Nueva en cada estado -----------------------------
  async function solicitud(
    clave: Clave,
    estado: 'pendiente' | 'propuesta' | 'aprobada' | 'rechazada' | 'retirada',
    franjas: Array<{ diaSemana: number; inicio: number; fin: number }>,
    dias: number,
    extra: { creadoPorId?: string; grupoId?: string } = {},
  ): Promise<string> {
    const revisada = estado !== 'pendiente' && estado !== 'retirada';
    const s = await prisma.solicitudDiscipulado.create({
      data: {
        personaId: id[clave],
        estado,
        creadoPorId: extra.creadoPorId,
        grupoId: extra.grupoId,
        revisadoPorId: revisada ? admin : null,
        revisadaEn: revisada ? hace(Math.max(dias - 2, 0)) : null,
        createdAt: hace(dias),
        franjas: { create: franjas },
      },
      select: { id: true },
    });
    return s.id;
  }
  const MARTES_19_21 = { diaSemana: 2, inicio: hs(19), fin: hs(21) };
  const LUNES_19_21 = { diaSemana: 1, inicio: hs(19), fin: hs(21) };

  // Sofía: pendiente, con una propuesta que Marcela declinó (Inicio → "propuesta declinada").
  const sSofia = await solicitud('sofia', 'pendiente', [MARTES_19_21], 9);
  await prisma.propuestaDiscipulado.create({
    data: {
      tipo: 'nueva', solicitudId: sSofia, discipuladorId: id.marcela, propuestaPorId: admin, propuestaEn: hace(7),
      estado: 'declinada', respondidaEn: hace(6), motivoDeclinacion: 'Ese martes ya tengo el grupo completo.',
    },
  });
  // Héctor (sin email): pendiente, cargada por el Admin.
  await solicitud('ramon', 'pendiente', [LUNES_19_21], 3, { creadoPorId: admin });
  // Julieta: propuesta a Laura hace 5 días, sin respuesta (Inicio → "sin respuesta hace más de 3 días").
  const sCamila = await solicitud('camila', 'propuesta', [{ diaSemana: 4, inicio: hs(18, 30), fin: hs(20, 30) }], 8);
  await prisma.propuestaDiscipulado.create({
    data: { tipo: 'nueva', solicitudId: sCamila, discipuladorId: id.laura, propuestaPorId: admin, propuestaEn: hace(5) },
  });
  await solicitud('valeria', 'rechazada', [{ diaSemana: 5, inicio: hs(9), fin: hs(11) }], 20);
  await solicitud('nicolas', 'retirada', [{ diaSemana: 3, inicio: hs(20), fin: hs(22) }], 15);

  // --- Grupos de Vida Nueva con Encuentros ----------------------------------
  async function grupo(
    discipulador: Clave,
    personas: Clave[],
    franja: { diaSemana: number; inicio: number; fin: number },
    desdeDias: number,
    opciones: { finalizado?: boolean; pidioTerminar?: boolean; encuentros?: Array<{ dias: number; capitulos: string; notas?: string; falto?: Clave }> } = {},
  ): Promise<string> {
    const g = await prisma.grupo.create({
      data: {
        cursoId: curso.id,
        sedeId: sedes.laPlata,
        estado: opciones.finalizado ? 'finalizado' : 'en_curso',
        motivoCierre: opciones.finalizado ? 'completado' : null,
        cerradoEn: opciones.finalizado ? hace(10) : null,
        cerradoPorId: opciones.finalizado ? admin : null,
        propuestaFinalizacionEn: opciones.finalizado || opciones.pidioTerminar ? hace(opciones.finalizado ? 12 : 2) : null,
        propuestaFinalizacionPorId: opciones.finalizado || opciones.pidioTerminar ? id[discipulador] : null,
        createdAt: hace(desdeDias),
      },
      select: { id: true },
    });
    const inscripciones: Partial<Record<Clave, string>> = {};
    for (const [i, clave] of personas.entries()) {
      const s = await solicitud(clave, 'aprobada', [franja], desdeDias + 4, { grupoId: g.id });
      const propuesta = await prisma.propuestaDiscipulado.create({
        data: {
          tipo: 'nueva', solicitudId: s, discipuladorId: id[discipulador], propuestaPorId: admin, propuestaEn: hace(desdeDias + 1),
          estado: 'aceptada', respondidaEn: hace(desdeDias), grupoDestinoId: i > 0 ? g.id : null,
        },
        select: { id: true },
      });
      const insc = await prisma.inscripcion.create({
        data: {
          personaId: id[clave], grupoId: g.id, solicitudId: s,
          estado: opciones.finalizado ? 'completada' : 'activa',
          cerradaEn: opciones.finalizado ? hace(10) : null,
          createdAt: hace(desdeDias),
        },
        select: { id: true },
      });
      inscripciones[clave] = insc.id;
      if (i === 0) {
        await prisma.liderazgo.create({
          data: { personaId: id[discipulador], grupoId: g.id, propuestaId: propuesta.id, desde: hace(desdeDias) },
        });
      }
    }
    for (const e of opciones.encuentros ?? []) {
      const encuentro = await prisma.encuentro.create({
        data: { grupoId: g.id, fecha: fechaCivil(-e.dias), capitulos: e.capitulos, notas: e.notas, registradoPorId: id[discipulador] },
        select: { id: true },
      });
      for (const clave of personas) {
        await prisma.asistencia.create({ data: { encuentroId: encuentro.id, inscripcionId: inscripciones[clave]!, presente: clave !== e.falto } });
      }
    }
    return g.id;
  }

  // Marcela: un grupo de dos (lleno: 2 de 2), con tres Encuentros.
  await grupo('marcela', ['agustina', 'rocio'], { diaSemana: 6, inicio: hs(10), fin: hs(12) }, 25, {
    encuentros: [
      { dias: 21, capitulos: '1', notas: 'Muy buena primera charla. Agustina trajo muchas preguntas.' },
      { dias: 14, capitulos: '2 y 3', falto: 'rocio' },
      { dias: 7, capitulos: '4', notas: 'Rocío se puso al día con el capítulo 3.' },
    ],
  });
  // Jorge: mucha carga — Matías, Tomás (menor) y Lucas en curso; Emanuel ya terminó.
  await grupo('jorge', ['matias'], LUNES_19_21, 18, { encuentros: [{ dias: 11, capitulos: '1 y 2' }] });
  await grupo('jorge', ['tomas'], { diaSemana: 3, inicio: hs(19), fin: hs(20, 30) }, 12, {
    encuentros: [{ dias: 5, capitulos: '1', notas: 'Vino con su mamá a la primera.' }],
  });
  await grupo('jorge', ['lucas'], LUNES_19_21, 70, {
    pidioTerminar: true,
    encuentros: [
      { dias: 63, capitulos: '1 y 2' },
      { dias: 49, capitulos: '3 a 5' },
      { dias: 35, capitulos: '6 y 7' },
      { dias: 21, capitulos: '8 y 9' },
    ],
  });
  await grupo('jorge', ['emanuel'], { diaSemana: 3, inicio: hs(19), fin: hs(21) }, 90, {
    finalizado: true,
    encuentros: [
      { dias: 80, capitulos: '1 a 3' },
      { dias: 60, capitulos: '4 a 6' },
      { dias: 40, capitulos: '7 a 9' },
    ],
  });

  // --- Tomás (14) y su tutora Silvina ----------------------------------------
  await prisma.relacionFamiliar.create({ data: { personaId: id.tomas, familiarId: id.silvina, tipoRelacion: 'tutor' } });

  // --- Coherencia del camino (010 y 009) ---------------------------------------
  // Pedir el bautismo exige Vida Nueva en curso o hecha, o la habilitación del
  // Admin (D147); y quien ya terminó Vida de Servicio (apta para un Ministerio)
  // hizo antes Vida Nueva. Las Personas de demo que no lo cumplen quedan con
  // Vida Nueva registrada por la iglesia (Flujo 9), como quien la hizo antes
  // de que existiera la app.
  const sinRequisito = await prisma.persona.findMany({
    where: {
      OR: [
        { solicitudesBautismo: { some: {} }, bautismoHabilitadoEn: null, email: { startsWith: 'demo-' } },
        { solicitudesBautismo: { some: {} }, bautismoHabilitadoEn: null, email: null },
        { rol: { has: 'apto_ministerio' }, email: { startsWith: 'demo-' } },
      ],
    },
    select: { id: true },
  });
  for (const { id: personaId } of sinRequisito) {
    const conVn = await prisma.inscripcion.findFirst({ where: { personaId, grupo: { curso: { categoria: 'vida_nueva' } } }, select: { id: true } });
    const registrada = await prisma.completitudManual.findFirst({ where: { personaId, etapa: 'vida_nueva', anuladaEn: null }, select: { id: true } });
    if (conVn || registrada) continue;
    await prisma.completitudManual.create({
      data: { personaId, etapa: 'vida_nueva', origen: 'admin', nota: 'Hizo Vida Nueva antes de que existiera la app.', registradaPorId: admin, registradaEn: hace(120) },
    });
  }

  // --- "Contanos qué te parece": sin revisar y revisados ----------------------
  const comentarios = [
    { tipo: 'sugerencia' as const, texto: 'Estaría bueno poder ver los horarios del culto en el Inicio de la app, sin entrar a Visitanos.', personaId: id.agustina, paginaOrigen: '/inicio', dias: 1 },
    { tipo: 'problema' as const, texto: 'Quise subir el comprobante del campamento desde el celular y la foto tardó mucho en cargar.', personaId: id.rocio, paginaOrigen: '/mis-eventos', dias: 2 },
    { tipo: 'sugerencia' as const, texto: 'Me encantó la página de Primeros pasos. ¿Podrían sumar un mapa de cómo llegar en colectivo?', aceptaContacto: true, contactoEmail: 'visita.lp@example.com', paginaOrigen: '/primeros-pasos', dias: 3 },
    { tipo: 'problema' as const, texto: 'No encontraba dónde cambiar mi teléfono. Al final estaba en Perfil, pero tardé.', personaId: id.matias, paginaOrigen: '/perfil', dias: 12, revisado: true },
  ];
  for (const c of comentarios) {
    await prisma.comentarioApp.create({
      data: {
        tipo: c.tipo,
        texto: c.texto,
        aceptaContacto: c.aceptaContacto ?? false,
        contactoEmail: c.contactoEmail,
        personaId: c.personaId,
        paginaOrigen: c.paginaOrigen,
        app: 'web',
        origenHuella: 'seed-demo',
        createdAt: hace(c.dias),
        revisadoEn: c.revisado ? hace(c.dias - 1) : null,
        revisadoPorId: c.revisado ? admin : null,
      },
    });
  }

  console.log('seed-demo historia: discipulados, bandeja de Vida Nueva, menor con tutora y comentarios sembrados.');
}
