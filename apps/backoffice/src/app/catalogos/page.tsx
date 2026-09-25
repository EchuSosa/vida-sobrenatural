import Link from 'next/link';
import { EstadoVacio } from '@vida-sobrenatural/ui';
import { requerirPermiso } from '../../auth';

export default async function CatalogosPage() {
  // H-132: exige el mismo permiso que le asigna NAV_BACKOFFICE — sin esto,
  // cualquier sesión entraba por URL (la regla pantalla-declara-permiso lo marca).
  await requerirPermiso('catalogos.ver');
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Catálogos</h1>
      <Link href="/sedes" className="text-primary underline underline-offset-4">
        Sedes
      </Link>
      <EstadoVacio mensaje="Cursos, Ministerios y Células todavía no están acá." />
    </div>
  );
}
