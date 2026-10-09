import type { Prisma } from '../generated/prisma/client.js';

/**
 * spec 011, ampliación 2026-10-09 (FR-070, D232) — lo que la app ya sabe de
 * cada inscripta, para que el Admin no lo pregunte en el formulario: los
 * Ministerios donde sirve (Postulaciones aprobadas, D170) y quién la acompaña
 * (Discipulador o Líder del Grupo más reciente: el activo si hay, si no el
 * último) y su grupo de extensión con su(s) líder(es) vigente(s) (spec 014: la
 * pertenencia ES la Solicitud `aceptada`, D225).
 */
export interface LoQueLaAppSabe {
  ministerios: string[];
  referente: string | null;
  grupoExtension: { nombre: string; lider: string | null } | null;
}

export async function loQueLaAppSabe(db: Prisma.TransactionClient, personaIds: readonly string[]): Promise<Map<string, LoQueLaAppSabe>> {
  const ids = [...new Set(personaIds)];
  const mapa = new Map<string, LoQueLaAppSabe>(ids.map((id) => [id, { ministerios: [], referente: null, grupoExtension: null }]));
  if (ids.length === 0) return mapa;

  const [postulaciones, inscripciones, extension] = await Promise.all([
    db.postulacion.findMany({
      where: { personaId: { in: ids }, estado: 'aprobada' },
      orderBy: { createdAt: 'asc' },
      select: { personaId: true, ministerio: { select: { nombre: true } }, celula: { select: { nombre: true } } },
    }),
    db.inscripcion.findMany({
      where: { personaId: { in: ids } },
      orderBy: { createdAt: 'desc' },
      select: { personaId: true, estado: true, grupo: { select: { liderazgos: { orderBy: { desde: 'desc' }, select: { personaId: true, hasta: true } } } } },
    }),
    db.solicitudGrupoExtension.findMany({
      where: { personaId: { in: ids }, estado: 'aceptada' },
      orderBy: { createdAt: 'desc' },
      select: {
        personaId: true,
        grupo: {
          select: {
            nombre: true,
            lideres: { where: { hasta: null }, orderBy: { desde: 'asc' }, select: { persona: { select: { nombre: true, apellido: true } } } },
          },
        },
      },
    }),
  ]);
  for (const s of extension) {
    const datos = mapa.get(s.personaId);
    if (!datos || datos.grupoExtension) continue;
    const lideres = s.grupo.lideres.map((l) => `${l.persona.nombre} ${l.persona.apellido}`).join(', ');
    datos.grupoExtension = { nombre: s.grupo.nombre, lider: lideres || null };
  }
  for (const p of postulaciones) {
    mapa.get(p.personaId)?.ministerios.push(p.celula ? `${p.ministerio.nombre} · ${p.celula.nombre}` : p.ministerio.nombre);
  }

  // El Grupo más reciente de cada Persona (el activo primero) y sus líderes vigentes (o los últimos).
  const lideresPorPersona = new Map<string, string[]>();
  for (const personaId of ids) {
    const propias = inscripciones.filter((i) => i.personaId === personaId);
    const grupo = (propias.find((i) => i.estado === 'activa') ?? propias[0])?.grupo;
    if (!grupo) continue;
    const vigentes = grupo.liderazgos.filter((l) => l.hasta === null);
    const lideres = (vigentes.length > 0 ? vigentes : grupo.liderazgos.slice(0, 1)).map((l) => l.personaId);
    if (lideres.length > 0) lideresPorPersona.set(personaId, lideres);
  }
  const nombres = new Map(
    (
      await db.persona.findMany({
        where: { id: { in: [...new Set([...lideresPorPersona.values()].flat())] } },
        select: { id: true, nombre: true, apellido: true },
      })
    ).map((p) => [p.id, `${p.nombre} ${p.apellido}`]),
  );
  for (const [personaId, lideres] of lideresPorPersona) {
    const texto = lideres.map((id) => nombres.get(id)).filter(Boolean).join(', ');
    mapa.get(personaId)!.referente = texto || null;
  }
  return mapa;
}
