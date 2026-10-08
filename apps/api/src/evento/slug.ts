/**
 * spec 011, FR-011 (research #9): el slug de un Evento se calcula UNA vez, al
 * crearlo, y no cambia al renombrarlo — los QR se imprimen y los links se
 * comparten por WhatsApp. Sin tildes, en minúsculas, con guiones, hasta 60
 * caracteres; si ya existe (incluidos los eliminados), `-2`, `-3`…
 */
export const SLUG_EVENTO_MAX = 60;

export function baseDeSlug(nombre: string): string {
  const base = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_EVENTO_MAX)
    .replace(/-+$/g, '');
  return base || 'evento';
}

/** Rutas de la API bajo `/eventos/publicos/` que un slug no puede tapar. */
const SLUGS_RESERVADOS = new Set(['slugs']);

export async function slugDeEvento(nombre: string, existe: (slug: string) => Promise<boolean>): Promise<string> {
  const base = baseDeSlug(nombre);
  if (!SLUGS_RESERVADOS.has(base) && !(await existe(base))) return base;
  for (let n = 2; ; n++) {
    const sufijo = `-${n}`;
    const candidato = `${base.slice(0, SLUG_EVENTO_MAX - sufijo.length).replace(/-+$/g, '')}${sufijo}`;
    if (!(await existe(candidato))) return candidato;
  }
}
