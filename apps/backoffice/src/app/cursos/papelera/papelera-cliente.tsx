'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useState } from 'react';
import { apiFetch, formatearDiaEnArgentina, type CursoEnPapelera } from '@vida-sobrenatural/shared-types';
import { Button, MigaDePan, TablaDatos, type ColumnaTabla } from '@vida-sobrenatural/ui';
import { combinacion } from '../textos';

/** spec 013 (T074): la papelera de Cursos con "Recuperar" por fila. */
export function PapeleraCursosCliente({ cursos, apiToken, puedeGestionar }: { cursos: CursoEnPapelera[]; apiToken: string; puedeGestionar: boolean }) {
  const t = useTranslations('cursos');
  const tp = useTranslations('cursos.papeleraPagina');
  const locale = useLocale();
  const router = useRouter();
  const [restaurandoId, setRestaurandoId] = useState<string | null>(null);

  async function restaurar(curso: CursoEnPapelera) {
    if (restaurandoId) return;
    setRestaurandoId(curso.id);
    try {
      await apiFetch(`/cursos/${curso.id}/restaurar`, { method: 'POST', headers: { Authorization: `Bearer ${apiToken}` } });
      toast(tp('restaurado', { nombre: curso.nombre }));
      router.refresh();
    } catch {
      toast.error(tp('error'));
    } finally {
      setRestaurandoId(null);
    }
  }

  const columnas: ColumnaTabla<CursoEnPapelera>[] = [
    {
      id: 'nombre',
      encabezado: t('columnas.nombre'),
      celda: (c) => (
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">{c.nombre}</span>
          <span className="text-muted-foreground">{combinacion(t, c.categoria, c.tipo)}</span>
          <span className="text-muted-foreground">{tp('eliminadoEl', { fecha: formatearDiaEnArgentina(c.eliminadoEn, locale) })}</span>
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-2">
        <MigaDePan tramos={[{ label: t('miga'), href: '/catalogos' }, { label: t('titulo'), href: '/cursos' }, { label: t('papelera') }]} LinkComponente={Link} />
        <h1 className="text-2xl font-semibold">{tp('titulo')}</h1>
        <p className="text-muted-foreground">{tp('descripcion')}</p>
      </div>
      <TablaDatos
        columnas={columnas}
        datos={cursos}
        obtenerId={(c) => c.id}
        etiqueta={tp('titulo')}
        mensajeVacio={tp('vacio')}
        {...(puedeGestionar
          ? {
              encabezadoAcciones: t('columnas.acciones'),
              acciones: (c: CursoEnPapelera) => (
                <Button variant="outline" size="sm" loading={restaurandoId === c.id} aria-label={tp('restaurarDe', { nombre: c.nombre })} onClick={() => void restaurar(c)}>
                  {tp('restaurar')}
                </Button>
              ),
            }
          : {})}
      />
    </div>
  );
}
