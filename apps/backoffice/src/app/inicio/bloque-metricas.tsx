'use client';

import { useLocale, useTranslations } from 'next-intl';
import { CircleMinus } from 'lucide-react';
import type { Metricas } from '@vida-sobrenatural/shared-types';
import { BarraProporcion } from '@vida-sobrenatural/ui';
import { useDatosApi } from '../../hooks/use-datos-api';
import { Bloque } from './bloque';

/** Porcentaje entero de `parte` sobre `total`; con total 0 es 0, sin dividir (H3.4: nunca "NaN"). */
export function porcentaje(parte: number, total: number): number {
  return total > 0 ? Math.round((parte * 100) / total) : 0;
}

/**
 * spec 013, H3.1–H3.4 (FR-022–FR-024): Personas activas, desde cuándo vienen
 * (D214) y por Sede — cantidad y porcentaje en texto, con la barra como
 * apoyo visual (nunca el dato solo en la barra, D81).
 */
export function BloqueMetricas({ apiToken }: { apiToken: string }) {
  const t = useTranslations('metricas');
  const locale = useLocale();
  const carga = useDatosApi<Metricas>('/inicio/metricas', apiToken);
  const numero = new Intl.NumberFormat(locale);

  return (
    <Bloque
      id="bloque-metricas"
      titulo={t('titulo')}
      estado={carga.estado}
      mensajeError={t('error')}
      etiquetaReintentar={t('reintentar')}
      etiquetaCargando={t('cargando')}
      reintentar={carga.reintentar}
    >
      {carga.estado === 'listo' &&
        (carga.datos.personasActivas === 0 ? (
          <p>{t('vacio')}</p>
        ) : (
          <div className="flex flex-col gap-6">
            <p className="flex flex-col">
              <span className="text-4xl font-semibold">{numero.format(carga.datos.personasActivas)}</span>
              <span className="text-muted-foreground">{t('personasActivas')}</span>
            </p>
            <Tabla
              titulo={t('porTiempo')}
              ayuda={t('ayudaTiempo')}
              columnaGrupo={t('columnas.desde')}
              columnaCantidad={t('columnas.cantidad')}
              filas={carga.datos.porTiempoCongregacion.map((r) => ({ clave: r.valor, etiqueta: t(`rangos.${r.valor}`), cantidad: r.cantidad }))}
              total={carga.datos.personasActivas}
              formatear={(n) => numero.format(n)}
            />
            <Tabla
              titulo={t('porSede')}
              columnaGrupo={t('columnas.sede')}
              columnaCantidad={t('columnas.cantidad')}
              filas={carga.datos.porSede.map((s) => ({
                clave: s.sedeId,
                etiqueta: s.nombre,
                marca: s.activa ? undefined : t('sedeInactiva'),
                cantidad: s.cantidad,
              }))}
              total={carga.datos.personasActivas}
              formatear={(n) => numero.format(n)}
            />
          </div>
        ))}
    </Bloque>
  );
}

function Tabla({
  titulo,
  ayuda,
  columnaGrupo,
  columnaCantidad,
  filas,
  total,
  formatear,
}: {
  titulo: string;
  ayuda?: string;
  columnaGrupo: string;
  columnaCantidad: string;
  filas: Array<{ clave: string; etiqueta: string; marca?: string; cantidad: number }>;
  total: number;
  formatear: (n: number) => string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <table className="w-full border-collapse">
        <caption className="text-left font-medium">
          {titulo}
          {ayuda && <span className="block text-sm font-normal text-muted-foreground">{ayuda}</span>}
        </caption>
        <thead>
          <tr className="border-b border-border text-left text-sm text-muted-foreground">
            <th scope="col" className="py-2 pr-2 font-medium">
              {columnaGrupo}
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              {columnaCantidad}
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const pct = porcentaje(f.cantidad, total);
            return (
              <tr key={f.clave} className="border-b border-border last:border-0">
                <th scope="row" className="py-2 pr-2 text-left font-normal">
                  <span className="flex flex-col gap-1">
                    <span>
                      {f.etiqueta}
                      {f.marca && (
                        <span className="ml-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <CircleMinus aria-hidden className="size-3.5" />
                          {f.marca}
                        </span>
                      )}
                    </span>
                    <BarraProporcion porcentaje={pct} className="max-w-64" />
                  </span>
                </th>
                <td className="py-2 text-right whitespace-nowrap tabular-nums">
                  {formatear(f.cantidad)} · {pct} %
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
