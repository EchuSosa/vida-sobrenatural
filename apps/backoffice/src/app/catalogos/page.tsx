import Link from 'next/link';
import { EstadoVacio } from '@vida-sobrenatural/ui';

export default function CatalogosPage() {
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
