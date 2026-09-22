import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

/**
 * Vista previa por defecto al compartir cualquier página pública — FR-041,
 * SC-007. Next.js detecta este archivo por convención de nombre y lo usa
 * como `openGraph.images` de toda página bajo (publica) que no defina la
 * suya propia — no hace falta declarar nada en cada `metadata`. Generado con
 * `next/og` en vez de un PNG estático: mismo resultado, sin depender de
 * herramientas externas de edición de imagen.
 *
 * research.md Decisión 9: este archivo corre como código de servidor (Node,
 * generado por `next/og` en build/request), así que puede leer el PNG
 * origen directo del filesystem del monorepo con `fs.readFileSync` — sin
 * pasar por `public/` ni por el bundler de assets del cliente — y
 * convertirlo a `data:` URI para el `<img>` del layout. Fondo oscuro fijo
 * (no depende del tema de quien mira la vista previa, D95/D106 no aplica
 * acá): usa el logotipo en su versión blanca (docs/marca/README.md).
 *
 * `process.cwd()` en vez de `import.meta.url`: en build de producción este
 * archivo se empaqueta a una ruta distinta de la fuente, mientras que
 * `process.cwd()` en runtime de Next.js siempre resuelve a la raíz de
 * `apps/web` — mismo motivo por el que Next documenta este patrón para leer
 * assets del filesystem desde una ruta de `next/og`.
 */
const logotipoBlanco = readFileSync(
  join(process.cwd(), '../../packages/ui/src/assets/marca/logotipo-blanco-2048.png'),
).toString('base64');

export const alt = 'Vida Sobrenatural';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#18181b',
          color: '#fafafa',
        }}
      >
        <img src={`data:image/png;base64,${logotipoBlanco}`} alt="Vida Sobrenatural" width={600} height={80} />
        <div style={{ fontSize: 32, fontWeight: 400, marginTop: 24, color: '#a1a1aa' }}>
          La Plata, Buenos Aires
        </div>
      </div>
    ),
    { ...size },
  );
}
