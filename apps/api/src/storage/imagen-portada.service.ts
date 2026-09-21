import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { PORTADA_ASPECTO } from '@vida-sobrenatural/shared-types';

// Ancho fijo razonable para una portada de libro en pantalla — el alto se
// deriva de PORTADA_ASPECTO (2:3) para que ambos números nunca puedan
// divergir del valor compartido.
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
    const procesada = await sharp(buffer)
      .resize(ANCHO_PORTADA, ALTO_PORTADA, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 82 })
      .toBuffer();
    return { buffer: procesada, mimeType: 'image/jpeg' };
  }
}
