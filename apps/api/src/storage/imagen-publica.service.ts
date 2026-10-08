import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { PORTADA_ASPECTO, type ErrorCode } from '@vida-sobrenatural/shared-types';
import { AppException } from '../common/errors/app-exception.js';

/**
 * spec 011 (research #7, T015): el procesamiento de imágenes PÚBLICAS, por
 * perfil. Mismo criterio que las portadas (D110 enmendada): `fit: 'inside'`
 * sin recorte, `withoutEnlargement`, mínimo sobre el lado corto, salida JPEG.
 * Los flyers vienen de Instagram (1:1, 4:5, 9:16) y recortarlos se come texto.
 *
 * `ImagenPortadaService` (003) delega acá con el perfil `PORTADA`, sin cambiar
 * su firma: los tests de libros y portadas siguen iguales.
 */
export interface PerfilImagenPublica {
  anchoMaximo: number;
  altoMaximo: number;
  ladoCortoMinimo: number;
  codigoDimension: ErrorCode;
  nombre: string;
}

const ANCHO_PORTADA = 800;

export const PERFIL_PORTADA: PerfilImagenPublica = {
  anchoMaximo: ANCHO_PORTADA,
  altoMaximo: Math.round((ANCHO_PORTADA * PORTADA_ASPECTO.alto) / PORTADA_ASPECTO.ancho),
  ladoCortoMinimo: ANCHO_PORTADA,
  codigoDimension: 'PORTADA_DIMENSION_INSUFICIENTE',
  nombre: 'una portada',
};

/** FR-012: formato de flyer de Instagram (4:5), lado corto mínimo 600. */
export const PERFIL_FLYER: PerfilImagenPublica = {
  anchoMaximo: 1080,
  altoMaximo: 1350,
  ladoCortoMinimo: 600,
  codigoDimension: 'FLYER_DIMENSION_INSUFICIENTE',
  nombre: 'un flyer',
};

export async function procesarImagenPublica(
  buffer: Buffer,
  perfil: PerfilImagenPublica,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const { width, height } = await sharp(buffer).metadata();
  if (!width || !height || Math.min(width, height) < perfil.ladoCortoMinimo) {
    throw new AppException(
      perfil.codigoDimension,
      400,
      `La imagen es más chica que el mínimo para ${perfil.nombre} (el lado corto tiene que ser de al menos ${perfil.ladoCortoMinimo}px).`,
    );
  }
  const procesada = await sharp(buffer)
    .rotate()
    .resize(perfil.anchoMaximo, perfil.altoMaximo, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  return { buffer: procesada, mimeType: 'image/jpeg' };
}

@Injectable()
export class ImagenPublicaService {
  procesar(buffer: Buffer, perfil: PerfilImagenPublica): Promise<{ buffer: Buffer; mimeType: string }> {
    return procesarImagenPublica(buffer, perfil);
  }
}
