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
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
  );
}
