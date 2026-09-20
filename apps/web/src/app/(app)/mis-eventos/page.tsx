import { EstadoVacio } from '@vida-sobrenatural/ui';

/**
 * H-26 (revisión manual, actualización 2026-09-20, D107): pantalla propia
 * de Eventos dentro de la app con sesión — antes NAV_APP apuntaba a
 * `/eventos`, pero esa ruta vivía fuera de `(app)` (la pública), así que
 * tocar la pestaña sacaba de la app y perdía la barra de navegación.
 *
 * Vive en `/mis-eventos`, no en `/eventos`: Next.js no permite que dos
 * route groups distintos resuelvan la misma URL final — `(publica)/eventos`
 * ya existe (la cartelera pública) — así que se usa el mismo patrón de
 * nombre que `/mi-camino` para la versión con sesión. El texto visible de
 * la pestaña ("Eventos") no cambia, solo la URL.
 *
 * Mismo patrón de estado vacío que mi-camino/avisos, ver docs/14-navegacion.md.
 */
export default function EventosAppPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Eventos</h1>
      <EstadoVacio mensaje="Todavía no hay eventos publicados — volvé a visitarnos pronto." />
    </div>
  );
}
