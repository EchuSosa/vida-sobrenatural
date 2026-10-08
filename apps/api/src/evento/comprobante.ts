import sharp from 'sharp';
import { COMPROBANTE_TAMANO_MAXIMO_BYTES } from '@vida-sobrenatural/shared-types';
import { AppException } from '../common/errors/app-exception.js';

/**
 * spec 011, T016 (research #6, FR-031) — un comprobante de pago: el tipo se
 * decide por la FIRMA del archivo, no por la extensión ni por lo que dice el
 * navegador. Las imágenes se re-codifican sin metadatos (una foto del celular
 * trae la ubicación en el EXIF); el PDF se guarda tal cual.
 */
export type MimeComprobante = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';

export function tipoPorFirma(b: Buffer): MimeComprobante | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.length >= 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (b.length >= 5 && b.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  return null;
}

export async function prepararComprobante(buffer: Buffer): Promise<{ buffer: Buffer; mimeType: MimeComprobante }> {
  if (buffer.length > COMPROBANTE_TAMANO_MAXIMO_BYTES) {
    throw new AppException('COMPROBANTE_TAMANO_EXCEDIDO', 400, 'El comprobante pesa más de 5 MB.');
  }
  const tipo = tipoPorFirma(buffer);
  if (!tipo) throw new AppException('COMPROBANTE_TIPO_INVALIDO', 400, 'El comprobante tiene que ser JPG, PNG, WebP o PDF.');
  if (tipo === 'application/pdf') return { buffer, mimeType: tipo };
  try {
    // `rotate()` aplica la orientación del EXIF antes de descartarlo; sharp no copia metadatos si no se le pide.
    const imagen = sharp(buffer).rotate();
    const salida = tipo === 'image/png' ? await imagen.png().toBuffer() : tipo === 'image/webp' ? await imagen.webp().toBuffer() : await imagen.jpeg({ quality: 85 }).toBuffer();
    return { buffer: salida, mimeType: tipo };
  } catch {
    throw new AppException('COMPROBANTE_TIPO_INVALIDO', 400, 'No pudimos leer la imagen del comprobante.');
  }
}

export const EXTENSION_COMPROBANTE: Record<MimeComprobante, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};
