import sharp from 'sharp';
import { ImagenPortadaService } from '../../src/storage/imagen-portada.service.js';
import { AppException } from '../../src/common/errors/app-exception.js';

async function crearImagenSintetica(ancho: number, alto: number): Promise<Buffer> {
  return sharp({
    create: { width: ancho, height: alto, channels: 3, background: { r: 100, g: 150, b: 200 } },
  })
    .png()
    .toBuffer();
}

// FR-023/FR-024 (specs/003-contenido-institucional). H-94: el mínimo de
// dimensiones (800×1200, el propio destino) se agrega acá — las imágenes
// sintéticas de estos tests pasan a estar por encima de ese piso; el
// rechazo de las que están por debajo tiene sus propios tests al final.
describe('ImagenPortadaService', () => {
  const service = new ImagenPortadaService();

  it('una imagen ya vertical (2:3) queda con las mismas proporciones, sin deformar', async () => {
    const original = await crearImagenSintetica(1000, 1500);
    const { buffer, mimeType } = await service.procesar(original);
    const metadata = await sharp(buffer).metadata();

    expect(mimeType).toBe('image/jpeg');
    expect(metadata.width).toBe(800);
    expect(metadata.height).toBe(1200);
  });

  // D110 enmendada: las fotos provisorias de los libros no son archivos de
  // tapa — un recorte centrado les cortaba el libro (H-94a). `fit: 'inside'`
  // nunca corta: escala para entrar en el máximo, preservando la
  // proporción original.
  it('una imagen apaisada NO se recorta — mantiene su proporción original', async () => {
    const original = await crearImagenSintetica(2400, 1200); // 2:1
    const { buffer } = await service.procesar(original);
    const metadata = await sharp(buffer).metadata();

    // Con ANCHO_PORTADA×ALTO_PORTADA como máximo, el ancho es la
    // dimensión que ata la escala acá — 800×400 sigue siendo 2:1, sin
    // deformar ni cortar.
    expect(metadata.width).toBe(800);
    expect(metadata.height).toBe(400);
  });

  it('una imagen cuadrada NO se recorta — mantiene su proporción 1:1', async () => {
    const original = await crearImagenSintetica(1600, 1600);
    const { buffer } = await service.procesar(original);
    const metadata = await sharp(buffer).metadata();

    expect(metadata.width).toBe(metadata.height);
  });

  it('recomprime — la salida es un JPEG válido', async () => {
    const original = await crearImagenSintetica(1000, 1500);
    const { buffer, mimeType } = await service.procesar(original);
    const metadata = await sharp(buffer).metadata();

    expect(mimeType).toBe('image/jpeg');
    expect(metadata.format).toBe('jpeg');
  });

  it('H-94: una imagen más chica que el destino se rechaza, no se agranda en silencio', async () => {
    const original = await crearImagenSintetica(200, 300);
    await expect(service.procesar(original)).rejects.toMatchObject({
      code: 'PORTADA_DIMENSION_INSUFICIENTE',
    });
    await expect(service.procesar(original)).rejects.toBeInstanceOf(AppException);
  });

  it('H-94: rechaza igual cuando solo un eje está por debajo del mínimo (ancho suficiente, alto no)', async () => {
    // 2400×900: ancho (2400) sobra, pero cubrir 800×1200 con cover
    // necesitaría escalar por 1200/900 ≈ 1.33 — agrandaría.
    const original = await crearImagenSintetica(2400, 900);
    await expect(service.procesar(original)).rejects.toMatchObject({
      code: 'PORTADA_DIMENSION_INSUFICIENTE',
    });
  });

  it('H-94: una imagen justo en el mínimo (800×1200) se acepta, sin agrandar', async () => {
    const original = await crearImagenSintetica(800, 1200);
    const { buffer } = await service.procesar(original);
    const metadata = await sharp(buffer).metadata();

    expect(metadata.width).toBe(800);
    expect(metadata.height).toBe(1200);
  });
});
