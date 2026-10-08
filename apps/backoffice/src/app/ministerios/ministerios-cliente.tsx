'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { GraduationCap, Plus } from 'lucide-react';
import { ApiError, apiFetch, type MinisterioCatalogo } from '@vida-sobrenatural/shared-types';
import {
  Button,
  ButtonLink,
  ControlesTabla,
  EstadoActivoBadge,
  MigaDePan,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  TablaDatos,
  type ColumnaTabla,
} from '@vida-sobrenatural/ui';
import { useControlesTablaUrl } from '../../hooks/use-controles-tabla-url';
import { FormularioMinisterio } from './formularios';

/**
 * spec 009, T041 (FR-026, FR-031, FR-033): la isla de cliente del catálogo —
 * búsqueda y filtro que navegan (URL), la tabla (nombre como enlace
 * subrayado al detalle, D81; estado en texto + ícono) y el alta en panel. La
 * confirmación del alta ofrece "Agregar áreas" (docs/15): lleva al detalle con
 * el panel de área abierto. Inactivar, eliminar y las áreas viven en el detalle.
 */
export function MinisteriosCliente({
  ministerios,
  filtro,
  apiToken,
  puedeGestionar,
  puedeAbrirPapelera,
}: {
  ministerios: MinisterioCatalogo[];
  filtro: 'activos' | 'todos';
  apiToken: string;
  puedeGestionar: boolean;
  puedeAbrirPapelera: boolean;
}) {
  const t = useTranslations('ministerios');
  const tc = useTranslations('comun');
  const te = useTranslations('errors');
  const router = useRouter();
  const [creando, setCreando] = useState(false);
  const { busqueda, setBusqueda, actualizarParams, limpiar } = useControlesTablaUrl();

  const columnas: ColumnaTabla<MinisterioCatalogo>[] = [
    {
      id: 'nombre',
      encabezado: t('columnaNombre'),
      celda: (m) => (
        <span className="flex flex-col gap-0.5">
          <Link href={`/ministerios/${m.id}`} className="font-medium break-words underline underline-offset-4">
            {m.nombre}
          </Link>
          {m.requiereFormacion && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <GraduationCap aria-hidden className="size-3.5" />
              {t('requiereFormacion')}
            </span>
          )}
        </span>
      ),
    },
    { id: 'celulas', encabezado: t('columnaCelulas'), className: 'hidden sm:table-cell', celda: (m) => m.celulasActivas },
    { id: 'miembros', encabezado: t('columnaMiembros'), className: 'hidden sm:table-cell', celda: (m) => m.miembrosActivos },
    ...(filtro === 'todos'
      ? [{ id: 'estado', encabezado: t('columnaEstado'), celda: (m: MinisterioCatalogo) => <EstadoActivoBadge activo={m.activo} textoActivo={t('detalle.estadoActivo')} textoInactivo={t('detalle.estadoInactivo')} /> } satisfies ColumnaTabla<MinisterioCatalogo>]
      : []),
  ];

  async function crear(datos: Parameters<typeof FormularioMinisterio>[0]['inicial']) {
    let creado: MinisterioCatalogo;
    try {
      creado = await apiFetch<MinisterioCatalogo>('/ministerios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify(datos),
      });
    } catch (error) {
      if (error instanceof ApiError && error.errors?.length) throw error;
      toast.error(error instanceof ApiError && te.has(error.code) ? te(error.code) : t('errorGenerico'));
      return;
    }
    setCreando(false);
    toast.success(t('creado', { nombre: creado.nombre }), {
      action: { label: t('creadoAgregarCelulas'), onClick: () => router.push(`/ministerios/${creado.id}?agregarArea=1`) },
    });
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <MigaDePan tramos={[{ label: t('catalogos'), href: '/catalogos' }, { label: t('titulo') }]} LinkComponente={Link} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
        <div className="flex gap-2">
          {puedeAbrirPapelera && (
            <ButtonLink render={<Link href="/ministerios/papelera" />} variant="outline" size="sm">
              {t('papelera')}
            </ButtonLink>
          )}
          {puedeGestionar && (
            <Button size="sm" onClick={() => setCreando(true)}>
              <Plus aria-hidden />
              {t('crear')}
            </Button>
          )}
        </div>
      </div>
      {!puedeGestionar && <p className="text-sm text-muted-foreground">{t('soloLectura')}</p>}

      <ControlesTabla
        busqueda={busqueda}
        onBuscarChange={setBusqueda}
        etiquetaBusqueda={t('buscar')}
        placeholderBusqueda={t('buscarEjemplo')}
        filtros={
          <div className="flex gap-2" role="group" aria-label={t('filtroEstado')}>
            <Button variant={filtro === 'activos' ? 'default' : 'outline'} size="sm" aria-pressed={filtro === 'activos'} onClick={() => actualizarParams({ estado: null })}>
              {t('activos')}
            </Button>
            <Button variant={filtro === 'todos' ? 'default' : 'outline'} size="sm" aria-pressed={filtro === 'todos'} onClick={() => actualizarParams({ estado: 'todos' })}>
              {t('todos')}
            </Button>
          </div>
        }
        hayAlgoAplicado={busqueda.trim() !== '' || filtro === 'todos'}
        onLimpiar={() => limpiar(['estado'])}
        cantidadResultados={ministerios.length}
      />

      <TablaDatos
        columnas={columnas}
        datos={ministerios}
        obtenerId={(m) => m.id}
        etiqueta={t('titulo')}
        mensajeVacio={busqueda.trim() ? t('vacioBusqueda', { busqueda: busqueda.trim() }) : filtro === 'activos' ? t('vacioActivos') : t('vacioTodos')}
      />

      <Sheet open={creando} onOpenChange={setCreando}>
        <SheetContent side="right" etiquetaCerrar={tc('cerrarPanel')}>
          <SheetHeader>
            <SheetTitle>{t('crear')}</SheetTitle>
            <SheetDescription>{t('form.descripcionSheet')}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
            <FormularioMinisterio
              inicial={{ nombre: '', descripcion: '', lineaPublica: '', requiereFormacion: false }}
              textoEnviar={t('form.crear')}
              enviar={crear}
              onCancelar={() => setCreando(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
