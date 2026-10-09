import { Logger } from '@nestjs/common';
import { distanciaKm, type Coordenadas } from '@vida-sobrenatural/shared-types';

/**
 * spec 014, D223 (research #1): convertir una dirección en coordenadas.
 *
 * Una interfaz y tres implementaciones: Georef (servicio oficial argentino,
 * entiende calles numeradas y esquinas), Nominatim (OpenStreetMap, de
 * respaldo, con User-Agent propio como pide su política de uso) y una falsa
 * para tests y CI (sin red). `GEOCODIFICADOR=falso` (o `NODE_ENV=test`) elige
 * la falsa.
 *
 * PRIVACIDAD (D224): la consulta puede ser la dirección de la casa de una
 * persona. Nada de acá la loguea: solo se registra qué servicio respondió y
 * si encontró algo.
 */
export interface Geocodificador {
  /** null = el servicio respondió pero no encontró la dirección. Lanza si el servicio no responde. */
  ubicar(consulta: string): Promise<Coordenadas | null>;
}

export const GEOCODIFICADOR = Symbol('GEOCODIFICADOR');

const TIMEOUT_MS = 5_000;

/**
 * Las direcciones de La Plata se escriben "64 nro 820", "7 n° 1200",
 * "64 e/ 11 y 12": se llevan a la forma que entienden los servicios
 * ("calle 64 820", "calle 64 entre calle 11 y calle 12").
 */
export function normalizarDireccionLaPlata(texto: string): string {
  let t = ` ${texto.trim().replace(/\s+/g, ' ')} `;
  t = t.replace(/\s(nro\.?|n°|nº|n\.|num\.?|número|numero)\s*/gi, ' ');
  t = t.replace(/\s(e\/|e\s?\/\s?|entre)\s*/gi, ' entre ');
  // Un número suelto que es nombre de calle ("64 820" → "calle 64 820"; "y 12" → "y calle 12").
  t = t.replace(/(^|\s(?:y|entre|esquina|esq\.?)\s)(\d{1,3}(?:\s?bis)?)(?=\s|$)/gi, (_m, pre: string, n: string) => `${pre}calle ${n}`);
  t = t.replace(/^\s(\d{1,3}(?:\s?bis)?)(?=\s)/i, ' calle $1');
  return t.trim().replace(/\s+/g, ' ');
}

async function getJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const respuesta = await fetch(url, { headers: { Accept: 'application/json', ...headers }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
  return respuesta.json();
}

function coordenadasValidas(lat: number, lon: number): Coordenadas | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  // Argentina continental, con margen: descarta respuestas absurdas.
  if (lat < -56 || lat > -21 || lon < -74 || lon > -53) return null;
  return { latitud: lat, longitud: lon };
}

/** Quita "nro", "n°", etc.: Georef entiende "64 820", "64 e/ 11 y 12" y "64 y 11" tal como se escriben en La Plata. */
export function limpiarParaGeoref(texto: string): string {
  return ` ${texto.trim().replace(/\s+/g, ' ')} `
    .replace(/\s(nro\.?|n°|nº|n\.|num\.?|número|numero)\s*/gi, ' ')
    .replace(/,?\s*la plata\s*$/i, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/** El centro del casco de La Plata: desempata cuando una calle numerada existe en varias localidades del partido. */
function centroDeReferencia(): Coordenadas {
  const [lat, lon] = (process.env.GEOCODIFICADOR_CENTRO ?? '-34.9214,-57.9545').split(',').map(Number);
  return { latitud: lat, longitud: lon };
}

/**
 * apis.datos.gob.ar/georef/api/direcciones, con provincia y departamento como
 * pista. En el partido de La Plata una misma calle numerada existe en varias
 * localidades (la 7 del casco es "Avenida 7"; hay una "Calle 7" en Villa
 * Elisa): se piden varios candidatos, también como avenida, y gana el más
 * cercano al centro de referencia (`GEOCODIFICADOR_CENTRO`).
 */
export class GeorefGeocodificador implements Geocodificador {
  constructor(
    private readonly provincia = process.env.GEOCODIFICADOR_PROVINCIA ?? 'Buenos Aires',
    private readonly departamento = process.env.GEOCODIFICADOR_DEPARTAMENTO ?? 'La Plata',
    private readonly centro: Coordenadas = centroDeReferencia(),
  ) {}

  async ubicar(consulta: string): Promise<Coordenadas | null> {
    const texto = limpiarParaGeoref(consulta);
    const variantes = /^\d/.test(texto) ? [texto, `avenida ${texto}`] : [texto];
    const candidatos: Coordenadas[] = [];
    for (const direccion of variantes) {
      const params = new URLSearchParams({ direccion, provincia: this.provincia, max: '10' });
      if (this.departamento) params.set('departamento', this.departamento);
      const datos = (await getJson(`https://apis.datos.gob.ar/georef/api/direcciones?${params}`)) as {
        direcciones?: Array<{ ubicacion?: { lat?: number | null; lon?: number | null } }>;
      };
      for (const d of datos.direcciones ?? []) {
        const u = d.ubicacion;
        const c = u && u.lat != null && u.lon != null ? coordenadasValidas(u.lat, u.lon) : null;
        if (c) candidatos.push(c);
      }
    }
    if (candidatos.length === 0) return null;
    return candidatos.reduce((mejor, c) => (distanciaKm(c, this.centro) < distanciaKm(mejor, this.centro) ? c : mejor));
  }
}

/** nominatim.openstreetmap.org/search, con User-Agent propio (política de uso de OSM). */
export class NominatimGeocodificador implements Geocodificador {
  constructor(
    private readonly userAgent = process.env.GEOCODIFICADOR_USER_AGENT ?? 'VidaSobrenatural/1.0 (app de integracion de una iglesia de La Plata)',
    private readonly localidad = process.env.GEOCODIFICADOR_LOCALIDAD ?? 'La Plata, Buenos Aires',
  ) {}

  async ubicar(consulta: string): Promise<Coordenadas | null> {
    const texto = normalizarDireccionLaPlata(consulta).replace(/\sentre\s.*$/i, '');
    const q = /la plata|berisso|ensenada|buenos aires/i.test(texto) ? texto : `${texto}, ${this.localidad}`;
    const params = new URLSearchParams({ q, format: 'json', limit: '1', countrycodes: 'ar' });
    const datos = (await getJson(`https://nominatim.openstreetmap.org/search?${params}`, { 'User-Agent': this.userAgent })) as Array<{ lat?: string; lon?: string }>;
    const primero = datos[0];
    if (!primero?.lat || !primero.lon) return null;
    return coordenadasValidas(Number(primero.lat), Number(primero.lon));
  }
}

/**
 * Prueba los servicios en orden: el primero que encuentra gana. Si uno no
 * responde, sigue con el próximo; si NINGUNO respondió, lanza (para que la
 * búsqueda diga "probá más tarde" en vez de "no encontramos tu dirección").
 */
export class CadenaGeocodificadores implements Geocodificador {
  private readonly logger = new Logger('Geocodificador');

  constructor(private readonly servicios: ReadonlyArray<{ nombre: string; servicio: Geocodificador }>) {}

  async ubicar(consulta: string): Promise<Coordenadas | null> {
    let respondioAlguno = false;
    for (const { nombre, servicio } of this.servicios) {
      try {
        const resultado = await servicio.ubicar(consulta);
        respondioAlguno = true;
        if (resultado) {
          this.logger.log({ servicio: nombre, encontrado: true });
          return resultado;
        }
      } catch (error) {
        // Sin la consulta (D224): solo qué servicio falló y por qué.
        this.logger.warn({ servicio: nombre, error: error instanceof Error ? error.message : 'desconocido' });
      }
    }
    if (!respondioAlguno) throw new Error('Ningún servicio de geocodificación respondió.');
    this.logger.log({ encontrado: false });
    return null;
  }
}

/**
 * Para tests y CI (sin red): un diccionario fijo de direcciones de prueba,
 * buscado por inclusión sobre el texto normalizado. "sin servicio" simula que
 * ningún servicio responde.
 */
export const DIRECCIONES_FALSAS: ReadonlyArray<{ incluye: string; coordenadas: Coordenadas }> = [
  // Centro (plaza Moreno, aprox.)
  { incluye: 'calle 7 1200', coordenadas: { latitud: -34.9214, longitud: -57.9545 } },
  { incluye: 'calle 50 600', coordenadas: { latitud: -34.9180, longitud: -57.9530 } },
  // Tolosa
  { incluye: 'calle 528 1500', coordenadas: { latitud: -34.8975, longitud: -57.9760 } },
  { incluye: 'calle 64 820', coordenadas: { latitud: -34.9300, longitud: -57.9410 } },
  { incluye: 'calle 64 y calle 11', coordenadas: { latitud: -34.9298, longitud: -57.9420 } },
  // City Bell
  { incluye: 'calle 13 b 400', coordenadas: { latitud: -34.8700, longitud: -58.0450 } },
  { incluye: 'calle 13 y calle 473', coordenadas: { latitud: -34.8710, longitud: -58.0460 } },
  // Los Hornos
  { incluye: 'calle 137 y calle 60', coordenadas: { latitud: -34.9550, longitud: -57.9850 } },
  // La Sede de la iglesia en los datos de prueba
  { incluye: 'iglesia', coordenadas: { latitud: -34.9205, longitud: -57.9536 } },
];

export class GeocodificadorFalso implements Geocodificador {
  async ubicar(consulta: string): Promise<Coordenadas | null> {
    const texto = normalizarDireccionLaPlata(consulta).toLowerCase();
    if (texto.includes('sin servicio')) throw new Error('Servicio no disponible (simulado).');
    return DIRECCIONES_FALSAS.find((d) => texto.includes(d.incluye))?.coordenadas ?? null;
  }
}

export function crearGeocodificador(): Geocodificador {
  if (process.env.GEOCODIFICADOR === 'falso' || process.env.NODE_ENV === 'test') return new GeocodificadorFalso();
  return new CadenaGeocodificadores([
    { nombre: 'georef', servicio: new GeorefGeocodificador() },
    { nombre: 'nominatim', servicio: new NominatimGeocodificador() },
  ]);
}

/** Prueba cada consulta en orden hasta que una se ubica (calle y número; después las esquinas). */
export async function ubicarPrimera(geo: Geocodificador, consultas: readonly string[]): Promise<Coordenadas | null> {
  for (const consulta of consultas) {
    try {
      const resultado = await geo.ubicar(consulta);
      if (resultado) return resultado;
    } catch {
      // Al guardar un Grupo, que el servicio no responda es lo mismo que no encontrarla (D223).
    }
  }
  return null;
}
