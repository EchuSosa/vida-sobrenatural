import { EstadoVacio } from '@vida-sobrenatural/ui';
import { requerirPermiso } from '../../auth';

export default async function MiDisponibilidadPage() {
  // H-132: exige el mismo permiso que le asigna NAV_BACKOFFICE — sin esto,
  // cualquier sesión entraba por URL (la regla pantalla-declara-permiso lo marca).
  await requerirPermiso('mi_disponibilidad.ver');
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Mi disponibilidad</h1>
      <EstadoVacio mensaje="Todavía no podés gestionar tu disponibilidad acá." />
    </div>
  );
}
