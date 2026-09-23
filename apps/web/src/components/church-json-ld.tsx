import type { Sede } from '@vida-sobrenatural/shared-types';

/**
 * Datos estructurados schema.org/Church — Historia 7, FR-036. Server
 * Component puro (sin JS en el cliente): solo inyecta el <script> con el
 * JSON-LD.
 */
export function ChurchJsonLd({ sede }: { sede: Sede }) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'Church',
    name: 'Vida Sobrenatural',
    address: sede.direccion,
    openingHours: sede.horarios,
    telephone: sede.contactoTelefono ?? undefined,
    email: sede.contactoEmail ?? undefined,
  };

  return (
    // H-117: patrón estándar de Next.js para JSON-LD (<script type="application/ld+json">), no
    // HTML de usuario — distinto del campo que motivó la regla (Markdown de texto libre guardado
    // sin sanitizar).
    // eslint-disable-next-line local/no-dangerously-set-inner-html -- ver comentario arriba.
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
  );
}
