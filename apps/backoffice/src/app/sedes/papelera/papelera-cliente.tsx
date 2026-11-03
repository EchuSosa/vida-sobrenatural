'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { type Sede, type ErrorCode, apiFetch, ApiError, formatearFechaHora } from '@vida-sobrenatural/shared-types';
import { Button, ControlesTabla, MigaDePan, TablaDatos, type ColumnaTabla, type OrdenTabla } from '@vida-sobrenatural/ui';
import { toast } from 'sonner';
import { useControlesTablaUrl } from '../../../hooks/use-controles-tabla-url';

/**
 * H-60 (revisión manual ronda 7): `sedes` llega ya cargada, filtrada y
 * ordenada desde page.tsx — isla de cliente: Restaurar, y la
 * búsqueda/orden que navegan (H-88). Restaurar pide `sedes.gestionar`
 * (`puedeGestionar`), distinto de `sedes.papelera.ver`, que es entrar —
 * hoy los dos son del Admin, pero son permisos separados a propósito.
 */
export function PapeleraCliente({
  sedes,
  orden,
  apiToken,
  puedeGestionar,
}: {
  sedes: Sede[];
  orden: OrdenTabla;
  apiToken: string;
  puedeGestionar: boolean;
}) {
  const router = useRouter();
  const te = useTranslations('errors');
  const tcat = useTranslations('catalogos');
  const ts = useTranslations('sedes');
  const t = useTranslations('sedes.papeleraPantalla');
  const locale = useLocale();
  const procesandoRef = useRef(new Set<string>());
  const [restaurandoId, setRestaurandoId] = useState<string | null>(null);
  const { busqueda, setBusqueda, actualizarParams, limpiar } = useControlesTablaUrl();

  async function restaurar(sede: Sede) {
    if (procesandoRef.current.has(sede.id)) return;
    procesandoRef.current.add(sede.id);
    setRestaurandoId(sede.id);
    try {
      await apiFetch(`/sedes/${sede.id}/restaurar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      toast(t('restaurada', { nombre: sede.nombre }));
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? te(e.code as ErrorCode) : t('errorRestaurar'));
    } finally {
      procesandoRef.current.delete(sede.id);
      setRestaurandoId(null);
    }
  }

  const columnas: ColumnaTabla<Sede>[] = [
    {
      id: 'nombre',
      encabezado: ts('columnas.nombre'),
      ordenable: true,
      celda: (sede) => <span className="font-medium">{sede.nombre}</span>,
    },
    {
      id: 'eliminadoEn',
      encabezado: ts('columnas.eliminadaEl'),
      ordenable: true,
      className: 'hidden sm:table-cell',
      celda: (sede) => (sede.eliminadoEn ? formatearFechaHora(sede.eliminadoEn, locale) : '—'),
    },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      {/* H-95: la miga de pan reemplaza el "Volver a X" escrito a mano — va
          arriba del <h1>, mismo componente en toda la app. */}
      <MigaDePan
        tramos={[{ label: tcat('titulo'), href: '/catalogos' }, { label: ts('titulo'), href: '/sedes' }, { label: ts('papelera') }]}
        LinkComponente={Link}
      />
      {/* H-96: el texto de acá abajo es lo único que necesita saber quien
          usa el backoffice — las referencias a decisiones (D119: borrado
          recuperable) van en comentarios como este, no en la interfaz. */}
      <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
      <p className="text-sm text-muted-foreground">
        {t('descripcion')}
      </p>

      <ControlesTabla
        busqueda={busqueda}
        onBuscarChange={setBusqueda}
        etiquetaBusqueda={ts('buscar')}
        placeholderBusqueda={ts('buscarEjemplo')}
        hayAlgoAplicado={busqueda.trim() !== ''}
        onLimpiar={() => limpiar()}
        cantidadResultados={sedes.length}
      />

      <TablaDatos
        columnas={columnas}
        datos={sedes}
        obtenerId={(sede) => sede.id}
        etiqueta={t('titulo')}
        mensajeVacio={busqueda.trim() ? ts('vacioBusqueda', { busqueda: busqueda.trim() }) : t('vacia')}
        orden={orden}
        onOrdenar={(columnaId) =>
          actualizarParams({
            orden: columnaId === 'nombre' ? null : columnaId,
            dir: orden.columna === columnaId && orden.direccion === 'asc' ? 'desc' : null,
          })
        }
        acciones={
          puedeGestionar
            ? (sede) => (
                <Button
                  variant="outline"
                  size="sm"
                  loading={restaurandoId === sede.id}
                  loadingText={t('restaurando')}
                  onClick={() => restaurar(sede)}
                >
                  {t('restaurar')}
                </Button>
              )
            : undefined
        }
      />
    </div>
  );
}
