import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { PORTADA_ASPECTO } from '@vida-sobrenatural/shared-types';
import { AppException } from '../common/errors/app-exception.js';

// Ancho fijo razonable para una portada de libro en pantalla — el alto se
// deriva de PORTADA_ASPECTO para que ambos números nunca puedan divergir
// del valor compartido. También son el piso de dimensiones de origen (ver
// `procesar`).
const ANCHO_PORTADA = 800;
const ALTO_PORTADA = Math.round((ANCHO_PORTADA * PORTADA_ASPECTO.alto) / PORTADA_ASPECTO.ancho);

// H-94a: mínimo de dimensiones de origen sobre el LADO CORTO, no sobre
// ancho y alto por separado. La regla original ("ancho ≥ 800 Y alto ≥
// 1200") asumía que toda portada se recortaba a vertical (D110, antes de
// la enmienda) — sin recorte esa regla rechazaba una foto apaisada
// perfectamente buena solo por no ser alta. Coincide en valor con
// `ANCHO_PORTADA` porque ese es el eje que ata la escala de salida en el
// peor caso (ver `procesar`), no porque sean el mismo concepto.
const LADO_CORTO_MINIMO = ANCHO_PORTADA;

/**
 * FR-023/FR-024 (research.md Decisión 1): redimensiona y recomprime con
 * `sharp`, **sin recortar** (D110, enmendada — revisión manual, portadas
 * reales de Ediciones VS 2026-09-24): las fotos provisorias de los libros
 * no son archivos de tapa — van de 0.81 a 1.30 de alto/ancho, casi todas
 * cuadradas — y un recorte centrado a 2:3 les cortaba entre 14% y 46% del
 * ancho; en "Vida nueva" el libro está corrido a la derecha, así que el
 * recorte se comía el libro directamente. `fit: 'inside'` escala la imagen
 * para que entre en el máximo (`ANCHO_PORTADA`×`ALTO_PORTADA`) sin
 * superarlo en ningún eje, respetando la proporción original — nunca
 * corta. Normaliza toda portada a JPEG de salida (sea cual sea el formato
 * de entrada entre los permitidos, JPG/PNG/WebP): FR-023 solo pide
 * redimensionar/recomprimir y asignar un nombre propio, no conservar el
 * formato original.
 */
@Injectable()
export class ImagenPortadaService {
  async procesar(buffer: Buffer): Promise<{ buffer: Buffer; mimeType: string }> {
    // H-94: el `resize` de abajo no traía `withoutEnlargement` — una
    // imagen de 200×300 se agrandaba a 800×1200 en silencio, y quedaba
    // borrosa. El mínimo se rechaza, no se tolera — se leen las
    // dimensiones de origen ANTES de procesar y se corta acá si no
    // alcanzan.
    const { width, height } = await sharp(buffer).metadata();
    if (!width || !height || Math.min(width, height) < LADO_CORTO_MINIMO) {
      throw new AppException(
        'PORTADA_DIMENSION_INSUFICIENTE',
        400,
        `La imagen es más chica que el mínimo para una portada (el lado corto tiene que ser de al menos ${LADO_CORTO_MINIMO}px).`,
      );
    }

    const procesada = await sharp(buffer)
      .resize(ANCHO_PORTADA, ALTO_PORTADA, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    return { buffer: procesada, mimeType: 'image/jpeg' };
  }
}
