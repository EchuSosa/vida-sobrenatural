import { ImageResponse } from 'next/og';

/**
 * Vista previa por defecto al compartir cualquier página pública — FR-035,
 * SC-007. Next.js detecta este archivo por convención de nombre y lo usa
 * como `openGraph.images` de toda página bajo (publica) que no defina la
 * suya propia — no hace falta declarar nada en cada `metadata`. Generado con
 * `next/og` en vez de un PNG estático: mismo resultado, sin depender de
 * herramientas externas de edición de imagen. Placeholder simple,
 * reemplazable cuando exista la identidad visual definitiva
 * (docs/09-notas-identidad-visual.md).
 */
export const alt = 'Iglesia Vida Sobrenatural';
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
          fontSize: 64,
          fontWeight: 600,
        }}
      >
        Iglesia Vida Sobrenatural
        <div style={{ fontSize: 32, fontWeight: 400, marginTop: 24, color: '#a1a1aa' }}>
          La Plata, Buenos Aires
        </div>
      </div>
    ),
    { ...size },
  );
}
