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
    if (!width || !height || width < ANCHO_PORTADA || height < ALTO_PORTADA) {
      throw new AppException(
        'PORTADA_DIMENSION_INSUFICIENTE',
        400,
        `La imagen es más chica que el mínimo para una portada (${ANCHO_PORTADA}×${ALTO_PORTADA}px).`,
      );
    }

    const procesada = await sharp(buffer)
      .resize(ANCHO_PORTADA, ALTO_PORTADA, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    return { buffer: procesada, mimeType: 'image/jpeg' };
  }
}
