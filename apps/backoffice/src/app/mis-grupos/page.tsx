import { EstadoVacio } from '@vida-sobrenatural/ui';
import { requerirPermiso } from '../../auth';

export default async function MisGruposPage() {
  // H-132: exige el mismo permiso que le asigna NAV_BACKOFFICE — sin esto,
  // cualquier sesión entraba por URL (la regla pantalla-declara-permiso lo marca).
  await requerirPermiso('mis_grupos.ver');
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Mis grupos</h1>
      <EstadoVacio mensaje="Todavía no tenés Grupos asignados." />
    </div>
  );
}
