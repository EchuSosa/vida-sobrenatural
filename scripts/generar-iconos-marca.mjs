#!/usr/bin/env node
// Historia 5 (specs/003-contenido-institucional, research.md Decisión 8): deriva
// los íconos de favicon/PWA a partir del isotipo fuente — no son una copia
// (Principio XI no aplica: son un redimensionado distinto por cada uso), son
// salida generada de este script, commiteada como cualquier otro build
// artifact. Se corre a mano cuando cambia el isotipo origen, no en cada
// dev/build (docs/marca/README.md: "no se le vuelve a pedir archivos al
// equipo de diseño").
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const raiz = dirname(fileURLToPath(import.meta.url));
const origen = join(raiz, '..', 'packages/ui/src/assets/marca/logo-oscuro-1024.png');

const salidas = [
  { destino: 'apps/web/src/app/icon.png', tamano: 512 },
  { destino: 'apps/web/src/app/apple-icon.png', tamano: 180 },
  { destino: 'apps/web/public/icons/icon-192.png', tamano: 192 },
  { destino: 'apps/web/public/icons/icon-512.png', tamano: 512 },
  { destino: 'apps/backoffice/src/app/icon.png', tamano: 512 },
];

async function main() {
  const bufferOrigen = await readFile(origen);
  for (const { destino, tamano } of salidas) {
    const rutaDestino = join(raiz, '..', destino);
    await mkdir(dirname(rutaDestino), { recursive: true });
    const buffer = await sharp(bufferOrigen).resize(tamano, tamano).png().toBuffer();
    await writeFile(rutaDestino, buffer);
    console.log(`generar-iconos-marca: ${destino} (${tamano}×${tamano})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
