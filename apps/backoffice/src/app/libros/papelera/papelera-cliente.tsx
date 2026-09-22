'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { type Libro, type ErrorCode, apiFetch, ApiError, formatearFechaHora } from '@vida-sobrenatural/shared-types';
import { Button, ControlesTabla, MigaDePan, TablaDatos, type ColumnaTabla, type OrdenTabla } from '@vida-sobrenatural/ui';
import { toast } from 'sonner';
import { useControlesTablaUrl } from '../../../hooks/use-controles-tabla-url';

/**
 * D119: mismo patrón que la papelera de Sedes. Pastor (`esAdmin: false`) ve
 * la papelera sin poder restaurar. H-88: búsqueda/orden en la URL.
 */
export function PapeleraCliente({
  libros,
  orden,
  apiToken,
  esAdmin,
}: {
  libros: Libro[];
  orden: OrdenTabla;
  apiToken: string;
  esAdmin: boolean;
}) {
  const router = useRouter();
  const te = useTranslations('errors');
  const locale = useLocale();
  const procesandoRef = useRef(new Set<string>());
  const [restaurandoId, setRestaurandoId] = useState<string | null>(null);
  const { busqueda, setBusqueda, actualizarParams, limpiar } = useControlesTablaUrl();

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
    {
      id: 'titulo',
      encabezado: 'Título',
      ordenable: true,
      celda: (libro) => <span className="font-medium">{libro.titulo}</span>,
    },
    { id: 'autor', encabezado: 'Autor/a', ordenable: true, className: 'hidden sm:table-cell', celda: (libro) => libro.autor },
    {
      id: 'eliminadoEn',
      encabezado: 'Eliminado el',
      ordenable: true,
      className: 'hidden sm:table-cell',
      celda: (libro) => (libro.eliminadoEn ? formatearFechaHora(libro.eliminadoEn, locale) : '—'),
    },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      {/* H-95: la miga de pan reemplaza el "Volver a X" escrito a mano — va
          arriba del <h1>, mismo componente en toda la app. */}
      <MigaDePan
        tramos={[{ label: 'Libros', href: '/libros' }, { label: 'Papelera' }]}
        LinkComponente={Link}
      />
      {/* H-96: el texto de acá abajo es lo único que necesita saber quien
          usa el backoffice — las referencias a decisiones (D119: borrado
          recuperable) van en comentarios como este, no en la interfaz. */}
      <h1 className="text-2xl font-semibold">Papelera de Libros</h1>
      <p className="text-sm text-muted-foreground">
        Libros eliminados. Restaurar los devuelve a &quot;Todos&quot;.
      </p>

      <ControlesTabla
        busqueda={busqueda}
        onBuscarChange={setBusqueda}
        etiquetaBusqueda="Buscar por título o autor/a"
        placeholderBusqueda="Ej. Antídotos, Natalia Spetale"
        hayAlgoAplicado={busqueda.trim() !== ''}
        onLimpiar={() => limpiar()}
        cantidadResultados={libros.length}
      />

      <TablaDatos
        columnas={columnas}
        datos={libros}
        obtenerId={(libro) => libro.id}
        etiqueta="Papelera de Libros"
        mensajeVacio={busqueda.trim() ? `No encontramos Libros que coincidan con "${busqueda.trim()}".` : 'La papelera está vacía.'}
        orden={orden}
        onOrdenar={(columnaId) =>
          actualizarParams({
            orden: columnaId === 'titulo' ? null : columnaId,
            dir: orden.columna === columnaId && orden.direccion === 'asc' ? 'desc' : null,
          })
        }
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
