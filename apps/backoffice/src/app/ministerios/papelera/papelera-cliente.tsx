'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';
import { ApiError, apiFetch, erroresPorCampo, formatearFechaHora, type EliminadoEnPapelera } from '@vida-sobrenatural/shared-types';
import { Button, EstadoVacio, MigaDePan, useEnvio } from '@vida-sobrenatural/ui';

/**
 * spec 009, T043 (FR-030, D119): la papelera de Ministerios. "Restaurar" lo
 * devuelve con su estado de antes; si mientras tanto se creó otro con el
 * mismo nombre, la API lo rechaza y se dice por qué.
 */
export function PapeleraMinisteriosCliente({ eliminados, apiToken, puedeRestaurar }: { eliminados: EliminadoEnPapelera[]; apiToken: string; puedeRestaurar: boolean }) {
  const t = useTranslations('ministerios');
  const locale = useLocale();
  const fecha = (iso: string) => formatearFechaHora(iso, locale);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <MigaDePan
        tramos={[{ label: t('catalogos'), href: '/catalogos' }, { label: t('titulo'), href: '/ministerios' }, { label: t('papelera') }]}
        LinkComponente={Link}
      />
      <h1 className="text-2xl font-semibold">{t('papeleraPagina.titulo')}</h1>
      {eliminados.length === 0 ? (
        <EstadoVacio mensaje={t('papeleraPagina.vacio')} />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {eliminados.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <span className="flex min-w-0 flex-col">
                <span className="font-medium break-words">{m.nombre}</span>
                <span className="text-sm text-muted-foreground">
                  {m.eliminadoPor
                    ? t('papeleraPagina.eliminadoPor', { fecha: fecha(m.eliminadoEn), nombre: `${m.eliminadoPor.nombre} ${m.eliminadoPor.apellido}` })
                    : t('papeleraPagina.eliminadoEl', { fecha: fecha(m.eliminadoEn) })}
                </span>
              </span>
              {puedeRestaurar && <Restaurar eliminado={m} apiToken={apiToken} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Restaurar({ eliminado, apiToken }: { eliminado: EliminadoEnPapelera; apiToken: string }) {
  const t = useTranslations('ministerios');
  const te = useTranslations('errors');
  const router = useRouter();
  const { enviando, ejecutar } = useEnvio(async () => {
    try {
      await apiFetch(`/ministerios/${eliminado.id}/restaurar`, { method: 'POST', headers: { Authorization: `Bearer ${apiToken}` } });
      toast.success(t('restaurado', { nombre: eliminado.nombre }));
    } catch (error) {
      const campo = erroresPorCampo(error)?.[0]?.code;
      const code = error instanceof ApiError ? error.code : null;
      toast.error(campo && te.has(`campos.${campo}`) ? te(`campos.${campo}`) : code && te.has(code) ? te(code) : t('errorGenerico'));
    }
    router.refresh();
  });
  return (
    <Button variant="outline" size="sm" loading={enviando} onClick={() => void ejecutar()} aria-label={`${t('papeleraPagina.restaurar')} ${eliminado.nombre}`}>
      <RotateCcw aria-hidden />
      {t('papeleraPagina.restaurar')}
    </Button>
  );
}
