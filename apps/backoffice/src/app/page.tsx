import { EstadoVacio } from '@vida-sobrenatural/ui';

/**
 * H-116 (revisión manual): el chequeo de sesión (y la pantalla de
 * "necesitás iniciar sesión" para cuando no la hay) ya lo resuelve
 * apps/backoffice/src/app/layout.tsx, para todo el backoffice — esta
 * página vuelve a ser lo que siempre debió ser, contenido sin nada de
 * sesión adentro.
 */
export default function InicioBackofficePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Inicio</h1>
      <EstadoVacio mensaje="Todavía no hay métricas ni pendientes para mostrar acá." />
    </div>
  );
}
