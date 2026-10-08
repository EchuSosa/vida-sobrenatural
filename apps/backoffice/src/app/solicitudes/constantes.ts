import {
  BANDEJA_PAGINA,
  FILTROS_ABIERTAS,
  ORDENES_BANDEJA,
  esEstadoDeTipo,
  esTipoSolicitud,
  type FiltroAbiertas,
  type OrdenBandeja,
  type TipoSolicitud,
} from '@vida-sobrenatural/shared-types';

// Sin `'use client'` a propósito (H-113): lo importan page.tsx (servidor) y el cliente.
export const TAMANIO_PAGINA = BANDEJA_PAGINA;

/** Lo que la URL de la bandeja pide, ya validado contra los tipos conectados (spec 013, FR-004, FR-005). */
export interface VistaBandeja {
  filtro: FiltroAbiertas;
  /** El tipo elegido en el filtro (solo si hay más de uno conectado; con uno solo, ese). */
  tipo: TipoSolicitud | null;
  /** Un estado del `tipo`; si está, reemplaza a `filtro`. */
  estado: string | null;
  persona: string | null;
  orden: OrdenBandeja;
  dir: 'asc' | 'desc';
}

export interface ParametrosBandeja {
  filtro?: string;
  tipo?: string;
  estado?: string;
  persona?: string;
  orden?: string;
  dir?: string;
}

/**
 * Lee la URL. Acepta los enlaces viejos de la 004 (`?estado=abiertas|todas`
 * y `?estado=pendiente` sin tipo = Discipulado). Lo que no corresponde se
 * ignora y `corregida` avisa para hacer redirect a la URL limpia.
 */
export function leerVistaBandeja(p: ParametrosBandeja, conectados: readonly TipoSolicitud[]): { vista: VistaBandeja; corregida: boolean } {
  let corregida = false;
  let filtro: FiltroAbiertas = 'abiertas';
  let estado: string | null = null;
  let tipo: TipoSolicitud | null = null;

  if (p.filtro !== undefined) {
    if ((FILTROS_ABIERTAS as readonly string[]).includes(p.filtro)) filtro = p.filtro as FiltroAbiertas;
    else corregida = true;
  }
  if (p.tipo !== undefined) {
    if (esTipoSolicitud(p.tipo) && conectados.includes(p.tipo)) tipo = p.tipo;
    else corregida = true;
  }
  if (p.estado !== undefined) {
    if (p.estado === 'abiertas' || p.estado === 'todas') {
      filtro = p.estado;
      corregida = true;
    } else {
      const tipoDelEstado = tipo ?? 'discipulado';
      if (conectados.includes(tipoDelEstado) && esEstadoDeTipo(tipoDelEstado, p.estado)) {
        estado = p.estado;
        tipo = tipoDelEstado;
      } else corregida = true;
    }
  }
  if (tipo === null && conectados.length === 1) tipo = conectados[0];

  const orden = (ORDENES_BANDEJA as readonly string[]).includes(p.orden ?? '') ? (p.orden as OrdenBandeja) : 'espera';
  if (p.orden !== undefined && orden !== p.orden) corregida = true;
  const dir = p.dir === 'desc' ? 'desc' : 'asc';
  return { vista: { filtro, tipo, estado, persona: p.persona?.trim() || null, orden, dir }, corregida };
}

/** Los query params de `GET /solicitudes` para una vista y una página (contracts/bandeja-api.md). */
export function parametrosApi(vista: VistaBandeja, buscar: string, skip: number): URLSearchParams {
  const params = new URLSearchParams({ filtro: vista.filtro, orden: vista.orden, dir: vista.dir, skip: String(skip), take: String(TAMANIO_PAGINA) });
  if (vista.tipo) params.set('tipo', vista.tipo);
  if (vista.estado) params.set('estado', vista.estado);
  if (vista.persona) params.set('persona', vista.persona);
  if (buscar) params.set('buscar', buscar);
  return params;
}

/** La URL limpia de la bandeja (lo que no es el default no va). */
export function urlBandeja(vista: VistaBandeja, buscar: string, pagina: number, conectados: readonly TipoSolicitud[]): string {
  const params = new URLSearchParams();
  if (buscar) params.set('q', buscar);
  if (vista.estado) params.set('estado', vista.estado);
  else if (vista.filtro !== 'abiertas') params.set('filtro', vista.filtro);
  // Con un solo tipo conectado, el tipo es implícito (el filtro no se muestra).
  if (vista.tipo && conectados.length > 1) params.set('tipo', vista.tipo);
  if (vista.persona) params.set('persona', vista.persona);
  if (vista.orden !== 'espera') params.set('orden', vista.orden);
  if (vista.dir === 'desc') params.set('dir', 'desc');
  if (pagina > 1) params.set('pagina', String(pagina));
  const query = params.toString();
  return query ? `/solicitudes?${query}` : '/solicitudes';
}

/** Días enteros desde un instante: "hace N días" de la espera y de la propuesta (FR-002, FR-038). */
export function diasDesde(iso: string, ahora: number = Date.now()): number {
  return Math.max(0, Math.floor((ahora - new Date(iso).getTime()) / 86_400_000));
}
