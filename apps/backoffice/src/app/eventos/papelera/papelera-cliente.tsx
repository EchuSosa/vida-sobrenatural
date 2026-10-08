'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { apiFetch, formatearFechaHora, formatearInicioEvento, type EventoResumen } from '@vida-sobrenatural/shared-types';
import { Button, MigaDePan, TablaDatos, mensajeDeError, type ColumnaTabla } from '@vida-sobrenatural/ui';

/** spec 011, T038 — isla de la papelera: "Restaurar" por fila, con su propio indicador. */
export function PapeleraEventosCliente({ eventos, apiToken, puedeGestionar }: { eventos: EventoResumen[]; apiToken: string; puedeGestionar: boolean }) {
  const t = useTranslations('eventos.gestion');
  const te = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const [restaurando, setRestaurando] = useState<string | null>(null);

  async function restaurar(e: EventoResumen) {
    if (restaurando) return;
    setRestaurando(e.id);
    try {
      await apiFetch(`/eventos/${e.id}/restaurar`, { method: 'POST', headers: { Authorization: `Bearer ${apiToken}` } });
      toast(t('papeleraPagina.restaurado'));
      router.refresh();
    } catch (error) {
      toast.error(mensajeDeError(error, te, t));
    } finally {
      setRestaurando(null);
    }
  }

  const columnas: ColumnaTabla<EventoResumen>[] = [
    { id: 'nombre', encabezado: t('columnas.nombre'), celda: (e) => <span className="font-medium">{e.nombre}</span> },
    { id: 'fecha', encabezado: t('columnas.fecha'), className: 'hidden sm:table-cell', celda: (e) => formatearInicioEvento(e.inicio, null, locale) },
    {
      id: 'eliminadoEn',
      encabezado: t('papeleraPagina.eliminadoEl'),
      className: 'hidden md:table-cell',
      celda: (e) => (e.eliminadoEn ? formatearFechaHora(e.eliminadoEn, locale) : '—'),
    },
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10">
      <MigaDePan tramos={[{ label: t('titulo'), href: '/eventos' }, { label: t('papeleraPagina.miga') }]} LinkComponente={Link} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t('papeleraPagina.titulo')}</h1>
        <p className="text-sm text-muted-foreground">{t('papeleraPagina.descripcion')}</p>
      </div>
      <TablaDatos
        columnas={columnas}
        datos={eventos}
        obtenerId={(e) => e.id}
        etiqueta={t('papeleraPagina.titulo')}
        mensajeVacio={t('papeleraPagina.vacia')}
        encabezadoAcciones={t('columnas.acciones')}
        acciones={
          puedeGestionar
            ? (e) => (
                <Button variant="outline" size="sm" loading={restaurando === e.id} loadingText={t('papeleraPagina.restaurando')} onClick={() => void restaurar(e)}>
                  {t('papeleraPagina.restaurar')}
                </Button>
              )
            : undefined
        }
      />
    </div>
  );
}
