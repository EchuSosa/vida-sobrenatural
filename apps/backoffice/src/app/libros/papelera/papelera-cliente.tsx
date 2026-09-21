'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { type Libro, type ErrorCode, apiFetch, ApiError, formatearFechaHora } from '@vida-sobrenatural/shared-types';
import { Button, TablaDatos, type ColumnaTabla } from '@vida-sobrenatural/ui';
import { toast } from 'sonner';

/** D119: mismo patrón que la papelera de Sedes. Pastor (`esAdmin: false`) ve la papelera sin poder restaurar. */
export function PapeleraCliente({ libros, apiToken, esAdmin }: { libros: Libro[]; apiToken: string; esAdmin: boolean }) {
  const router = useRouter();
  const te = useTranslations('errors');
  const locale = useLocale();
  const procesandoRef = useRef(new Set<string>());
  const [restaurandoId, setRestaurandoId] = useState<string | null>(null);

  async function restaurar(libro: Libro) {
    if (procesandoRef.current.has(libro.id)) return;
    procesandoRef.current.add(libro.id);
    setRestaurandoId(libro.id);
    try {
      await apiFetch(`/libros/${libro.id}/restaurar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      toast(`${libro.titulo} restaurado.`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos restaurar el Libro.');
    } finally {
      procesandoRef.current.delete(libro.id);
      setRestaurandoId(null);
    }
  }

  const columnas: ColumnaTabla<Libro>[] = [
    { id: 'titulo', encabezado: 'Título', celda: (libro) => <span className="font-medium">{libro.titulo}</span> },
    { id: 'autor', encabezado: 'Autor/a', className: 'hidden sm:table-cell', celda: (libro) => libro.autor },
    {
      id: 'eliminadoEn',
      encabezado: 'Eliminado el',
      className: 'hidden sm:table-cell',
      celda: (libro) => (libro.eliminadoEn ? formatearFechaHora(libro.eliminadoEn, locale) : '—'),
    },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Papelera de Libros</h1>
        <Link href="/libros" className="text-sm text-muted-foreground underline underline-offset-4">
          Volver a Libros
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Libros eliminados (D119) — corregí un error de carga acá. Restaurar los devuelve a &quot;Todos&quot;.
      </p>

      <TablaDatos
        columnas={columnas}
        datos={libros}
        obtenerId={(libro) => libro.id}
        etiqueta="Papelera de Libros"
        mensajeVacio="La papelera está vacía."
        acciones={
          esAdmin
            ? (libro) => (
                <Button
                  variant="outline"
                  size="sm"
                  loading={restaurandoId === libro.id}
                  loadingText="Restaurando…"
                  onClick={() => restaurar(libro)}
                >
                  Restaurar
                </Button>
              )
            : undefined
        }
      />
    </div>
  );
}
