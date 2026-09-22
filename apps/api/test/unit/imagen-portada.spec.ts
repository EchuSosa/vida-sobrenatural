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

// FR-023/FR-024 (specs/003-contenido-institucional). H-94/H-94a: el mínimo
// es sobre el LADO CORTO (800px), no sobre ancho y alto por separado — las
// imágenes sintéticas de estos tests pasan a estar por encima de ese piso;
// el rechazo de las que están por debajo tiene sus propios tests al final.
describe('ImagenPortadaService', () => {
  const service = new ImagenPortadaService();

  it('una imagen vertical (2:3) mantiene su proporción original, sin deformar', async () => {
    // D125 (PORTADA_ASPECTO temporal 1:1): la caja de salida es cuadrada,
    // así que una imagen 2:3 ya no la llena — se verifica la proporción
    // (no deformada) y no en píxeles exactos, para no depender del redondeo.
    const original = await crearImagenSintetica(1000, 1500);
    const { buffer, mimeType } = await service.procesar(original);
    const metadata = await sharp(buffer).metadata();

    expect(mimeType).toBe('image/jpeg');
    expect(metadata.height).toBe(800);
    expect(metadata.width).toBeLessThanOrEqual(800);
    expect(metadata.width! / metadata.height!).toBeCloseTo(1000 / 1500, 2);
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

  it('H-94: una imagen con el lado corto muy por debajo del mínimo se rechaza, no se agranda en silencio', async () => {
    const original = await crearImagenSintetica(200, 300); // lado corto 200
    await expect(service.procesar(original)).rejects.toMatchObject({
      code: 'PORTADA_DIMENSION_INSUFICIENTE',
    });
    await expect(service.procesar(original)).rejects.toBeInstanceOf(AppException);
  });

  /**
   * H-94a: el bug que este test demuestra ahora resuelto. La regla vieja
   * ("ancho ≥ 800 Y alto ≥ 1200") asumía que toda portada se recortaba a
   * vertical — 2400×900 es una foto apaisada perfectamente buena (lado
   * corto 900 ≥ 800) que esa regla rechazaba igual, solo porque
   * 900 < 1200. Con el mínimo sobre el lado corto, se acepta.
   */
  it('H-94a: una foto apaisada con el lado corto por encima del mínimo se acepta (antes se rechazaba)', async () => {
    const original = await crearImagenSintetica(2400, 900);
    const { buffer } = await service.procesar(original);
    const metadata = await sharp(buffer).metadata();

    expect(metadata.width).toBe(800);
  });

  it('H-94a: el lado corto exactamente en el mínimo (800) se acepta, sin agrandar', async () => {
    const original = await crearImagenSintetica(800, 800); // lado corto 800
    const { buffer } = await service.procesar(original);
    const metadata = await sharp(buffer).metadata();

    expect(metadata.width).toBe(800);
    expect(metadata.height).toBe(800);
  });

  it('H-94a: el lado corto justo por debajo del mínimo (799) se rechaza', async () => {
    const original = await crearImagenSintetica(1000, 799);
    await expect(service.procesar(original)).rejects.toMatchObject({
      code: 'PORTADA_DIMENSION_INSUFICIENTE',
    });
  });
});
