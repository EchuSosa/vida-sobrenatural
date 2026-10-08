'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Cake } from 'lucide-react';
import { formatearFechaLarga, type CumpleanosSemana } from '@vida-sobrenatural/shared-types';
import { AvatarPersona } from '@vida-sobrenatural/ui';
import { EnlacePersona } from '../../components/enlace-persona';
import { useDatosApi } from '../../hooks/use-datos-api';
import { Bloque } from './bloque';

/** spec 013, H4.6 (FR-031): quién cumple hoy y en los próximos 7 días, con enlace al listado del mes. */
export function BloqueCumpleanos({ apiToken }: { apiToken: string }) {
  const t = useTranslations('cumpleanos');
  const locale = useLocale();
  const carga = useDatosApi<CumpleanosSemana>('/inicio/cumpleanos-semana', apiToken);

  return (
    <Bloque
      id="bloque-cumpleanos"
      titulo={t('bloque.titulo')}
      estado={carga.estado}
      mensajeError={t('bloque.error')}
      etiquetaReintentar={t('reintentar')}
      etiquetaCargando={t('cargando')}
      reintentar={carga.reintentar}
    >
      {carga.estado === 'listo' && (
        <div className="flex flex-col gap-3">
          {carga.datos.items.length === 0 ? (
            <p>{t('bloque.vacio')}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {carga.datos.items.map((c) => (
                <li key={c.persona.id} className="flex items-center gap-3">
                  <AvatarPersona nombre={c.persona.nombre} apellido={c.persona.apellido} fotoUrl={c.persona.fotoUrl} tamanio="sm" />
                  <span className="flex flex-col">
                    <EnlacePersona persona={c.persona} className="font-medium" />
                    <span className="text-sm text-muted-foreground">
                      {c.esHoy ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                          <Cake aria-hidden className="size-4" />
                          {t('bloque.hoyCumple', { anios: c.cumple })}
                        </span>
                      ) : (
                        t('bloque.elDia', { fecha: formatearFechaLarga(c.fecha, locale), anios: c.cumple })
                      )}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/cumpleanos" className="flex min-h-11 items-center self-start underline underline-offset-4">
            {carga.datos.hayMas ? t('bloque.verTodos') : t('bloque.verMes')}
          </Link>
        </div>
      )}
    </Bloque>
  );
}
