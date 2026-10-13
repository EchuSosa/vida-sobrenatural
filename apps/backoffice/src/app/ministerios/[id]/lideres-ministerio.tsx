'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Crown, UserMinus, UserPlus } from 'lucide-react';
import { ApiError, apiFetch, formatearDiaEnArgentina, type LiderMinisterioVista } from '@vida-sobrenatural/shared-types';
import { Button, ConfirmDestructiveDialog } from '@vida-sobrenatural/ui';
import { BuscarPersonaGex, type PersonaElegibleGex } from '../../grupos-extension/buscar-persona';

/**
 * spec 016 (D244): los líderes de un Ministerio. El Admin asigna (mismo
 * buscador que "Agregar a alguien que ya sirve") y quita con confirmación;
 * el liderazgo se cierra con fecha, no se borra. El Pastor solo ve la lista.
 * El rol `lider_ministerio` lo maneja la API (como `lider_extension`, D226).
 */
export function LideresMinisterio({
  ministerioId,
  ministerio,
  lideres,
  activo,
  puedeGestionar,
  apiToken,
}: {
  ministerioId: string;
  ministerio: string;
  lideres: LiderMinisterioVista[];
  activo: boolean;
  puedeGestionar: boolean;
  apiToken: string;
}) {
  const t = useTranslations('ministerios.lideres');
  const te = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  async function llamar(ruta: string, method: 'POST' | 'DELETE', cuerpo: object | undefined, exito: string) {
    if (enviando) return;
    setEnviando(true);
    try {
      await apiFetch(ruta, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
      });
      toast.success(exito);
      router.refresh();
    } catch (error) {
      const code = error instanceof ApiError ? error.code : null;
      toast.error(code && te.has(code) ? te(code) : t('errorGenerico'));
    } finally {
      setEnviando(false);
    }
  }

  const asignar = (p: PersonaElegibleGex) =>
    llamar(`/ministerios/${ministerioId}/lideres`, 'POST', { personaId: p.id }, t('asignado', { nombre: `${p.nombre} ${p.apellido}`, ministerio }));
  const quitar = (l: LiderMinisterioVista) =>
    llamar(`/ministerios/${ministerioId}/lideres/${l.persona.id}`, 'DELETE', undefined, t('quitado', { nombre: `${l.persona.nombre} ${l.persona.apellido}` }));

  return (
    <section aria-labelledby="lideres-titulo" className="flex flex-col gap-3">
      <h2 id="lideres-titulo" className="flex items-center gap-2 text-lg font-semibold">
        <Crown aria-hidden className="size-5 text-primary" />
        {t('titulo')} ({lideres.length})
      </h2>
      <p className="text-sm text-muted-foreground">{t('ayuda')}</p>
      {lideres.length === 0 ? (
        <p className="text-muted-foreground">{t('sinLideres')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {lideres.map((l) => {
            const nombre = `${l.persona.nombre} ${l.persona.apellido}`;
            return (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium break-words">{nombre}</span>
                  <span className="text-sm text-muted-foreground">{t('desde', { fecha: formatearDiaEnArgentina(l.desde, locale) })}</span>
                </span>
                {puedeGestionar && (
                  <ConfirmDestructiveDialog
                    tono="neutro"
                    trigger={
                      <Button variant="outline" size="sm" disabled={enviando} aria-label={`${t('quitar')}: ${nombre}`}>
                        <UserMinus aria-hidden />
                        {t('quitar')}
                      </Button>
                    }
                    titulo={t('quitarTitulo', { nombre, ministerio })}
                    descripcion={t('quitarDescripcion')}
                    textoConfirmar={t('quitarConfirmar')}
                    textoCancelar={t('volver')}
                    onConfirmar={() => void quitar(l)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
      {puedeGestionar && activo && (
        <details className="rounded-md border border-border p-3">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-medium">
            <UserPlus aria-hidden className="size-4" />
            {t('asignar')}
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{t('asignarAyuda')}</p>
            <BuscarPersonaGex
              id="asignar-lider-buscar"
              apiToken={apiToken}
              textoElegir={t('asignarBoton')}
              ariaElegir={(nombre) => t('asignarAria', { nombre })}
              onElegir={(p) => void asignar(p)}
              deshabilitado={enviando}
              bloquearMenores
            />
          </div>
        </details>
      )}
    </section>
  );
}
