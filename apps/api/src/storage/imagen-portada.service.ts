import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { PORTADA_ASPECTO } from '@vida-sobrenatural/shared-types';
import { AppException } from '../common/errors/app-exception.js';

// Ancho fijo razonable para una portada de libro en pantalla — el alto se
// deriva de PORTADA_ASPECTO (2:3) para que ambos números nunca puedan
// divergir del valor compartido. También son el piso de dimensiones de
// origen (ver `procesar`): por debajo de esto, cubrir el recorte 2:3
// requeriría agrandar.
const ANCHO_PORTADA = 800;
const ALTO_PORTADA = Math.round((ANCHO_PORTADA * PORTADA_ASPECTO.alto) / PORTADA_ASPECTO.ancho);

/**
 * FR-023/FR-024 (research.md Decisión 1): redimensiona, recomprime y —
 * cuando la imagen no es ya vertical (foto apaisada o cuadrada) — recorta
 * centrada a 2:3, todo en un solo paso con `sharp`. Normaliza toda
 * portada a JPEG de salida (sea cual sea el formato de entrada entre los
 * permitidos, JPG/PNG/WebP): FR-023 solo pide redimensionar/recomprimir y
 * asignar un nombre propio, no conservar el formato original.
 */
@Injectable()
export class ImagenPortadaService {
  async procesar(buffer: Buffer): Promise<{ buffer: Buffer; mimeType: string }> {
    // H-94: el `resize` de abajo no traía `withoutEnlargement` — una
    // imagen de 200×300 se agrandaba a 800×1200 en silencio, y quedaba
    // borrosa. `withoutEnlargement` solo no alcanza: dejaría pasar esa
    // imagen chica sin agrandarla, pero igual entraría una portada
    // minúscula (agrandada o no, sigue siendo la fuente equivocada). El
    // mínimo se rechaza, no se tolera — se leen las dimensiones de origen
    // ANTES de procesar y se corta acá si no alcanzan.
    //
    // La condición correcta es "¿el recorte cover a 800×1200 necesitaría
    // agrandar?", que equivale exactamente a "¿el ancho o el alto de
    // origen es menor que el del destino?" (cover escala por
    // max(destino/origen) en cada eje; ese máximo es > 1 si y solo si
    // origen < destino en algún eje).
    const { width, height } = await sharp(buffer).metadata();
    if (!width || !height || width < ANCHO_PORTADA || height < ALTO_PORTADA) {
      throw new AppException(
        'PORTADA_DIMENSION_INSUFICIENTE',
        400,
        `La imagen es más chica que el mínimo para una portada (${ANCHO_PORTADA}×${ALTO_PORTADA}px).`,
      );
    }

    const procesada = await sharp(buffer)
      .resize(ANCHO_PORTADA, ALTO_PORTADA, { fit: 'cover', position: 'centre', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    return { buffer: procesada, mimeType: 'image/jpeg' };
  }
}
