import sharp from 'sharp';
import { prepararComprobante, tipoPorFirma } from '../../src/evento/comprobante.js';

/** spec 011, T016 — FR-031: tipo por firma, tamaño y EXIF afuera. */
describe('comprobante (FR-031)', () => {
  const imagen = (formato: 'jpeg' | 'png' | 'webp') => sharp({ create: { width: 40, height: 40, channels: 3, background: '#336699' } })[formato]().toBuffer();

  it.each(['jpeg', 'png', 'webp'] as const)('acepta %s por su firma', async (formato) => {
    const r = await prepararComprobante(await imagen(formato));
    expect(r.mimeType).toBe(`image/${formato}`);
  });

  it('acepta un PDF tal cual', async () => {
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
    expect(await prepararComprobante(pdf)).toEqual({ buffer: pdf, mimeType: 'application/pdf' });
  });

  it('un ejecutable con nombre .pdf → COMPROBANTE_TIPO_INVALIDO', async () => {
    const exe = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(100)]);
    expect(tipoPorFirma(exe)).toBeNull();
    await expect(prepararComprobante(exe)).rejects.toMatchObject({ code: 'COMPROBANTE_TIPO_INVALIDO' });
  });

  it('más de 5 MB → COMPROBANTE_TAMANO_EXCEDIDO', async () => {
    await expect(prepararComprobante(Buffer.alloc(5 * 1024 * 1024 + 1))).rejects.toMatchObject({ code: 'COMPROBANTE_TAMANO_EXCEDIDO' });
  });

  it('una foto con EXIF de ubicación sale sin EXIF', async () => {
    const conExif = await sharp({ create: { width: 40, height: 40, channels: 3, background: '#aa0000' } })
      .jpeg()
      .withExifMerge({ IFD3: { GPSLatitudeRef: 'S', GPSLatitude: '34/1 55/1 0/1' } })
      .toBuffer();
    expect((await sharp(conExif).metadata()).exif).toBeDefined();
    const limpia = await prepararComprobante(conExif);
    expect((await sharp(limpia.buffer).metadata()).exif).toBeUndefined();
  });
});
