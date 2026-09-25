import { EstadoVacio } from '@vida-sobrenatural/ui';
import { requerirPermiso } from '../../auth';

export default async function GruposPage() {
  // H-132: exige el mismo permiso que le asigna NAV_BACKOFFICE — sin esto,
  // cualquier sesión entraba por URL (la regla pantalla-declara-permiso lo marca).
  await requerirPermiso('grupos.ver');
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Grupos</h1>
      <EstadoVacio mensaje="Todavía no hay Grupos para gestionar acá." />
    </div>
  );
}
