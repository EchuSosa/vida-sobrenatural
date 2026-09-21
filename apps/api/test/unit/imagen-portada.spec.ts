import sharp from 'sharp';
import { ImagenPortadaService } from '../../src/storage/imagen-portada.service.js';

async function crearImagenSintetica(ancho: number, alto: number): Promise<Buffer> {
  return sharp({
    create: { width: ancho, height: alto, channels: 3, background: { r: 100, g: 150, b: 200 } },
  })
    .png()
    .toBuffer();
}

// FR-023/FR-024 (specs/003-contenido-institucional).
describe('ImagenPortadaService', () => {
  const service = new ImagenPortadaService();

  it('una imagen ya vertical (2:3) queda con las mismas proporciones, sin deformar', async () => {
    const original = await crearImagenSintetica(400, 600);
    const { buffer, mimeType } = await service.procesar(original);
    const metadata = await sharp(buffer).metadata();

    expect(mimeType).toBe('image/jpeg');
    expect(metadata.width).toBe(800);
    expect(metadata.height).toBe(1200);
  });

  it('una imagen apaisada se recorta centrada a 2:3, sin dejar franjas vacías', async () => {
    const original = await crearImagenSintetica(1200, 600);
    const { buffer } = await service.procesar(original);
    const metadata = await sharp(buffer).metadata();

    expect(metadata.width).toBe(800);
    expect(metadata.height).toBe(1200);
  });

  it('una imagen cuadrada se recorta centrada a 2:3', async () => {
    const original = await crearImagenSintetica(500, 500);
    const { buffer } = await service.procesar(original);
    const metadata = await sharp(buffer).metadata();

    expect(metadata.width).toBe(800);
    expect(metadata.height).toBe(1200);
  });

  it('recomprime — la salida es un JPEG válido', async () => {
    const original = await crearImagenSintetica(400, 600);
    const { buffer, mimeType } = await service.procesar(original);
    const metadata = await sharp(buffer).metadata();

    expect(mimeType).toBe('image/jpeg');
    expect(metadata.format).toBe('jpeg');
  });
});
