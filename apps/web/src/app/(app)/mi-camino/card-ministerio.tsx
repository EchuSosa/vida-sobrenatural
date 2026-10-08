'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ArrowRightLeft, CircleAlert, CircleMinus, GraduationCap, Hourglass, CirclePause, Sparkles, Undo2, UsersRound } from 'lucide-react';
import { ApiError, apiFetch, formatearDiaEnArgentina, type EstadoMiMinisterio, type PendienteVista } from '@vida-sobrenatural/shared-types';
import { AvisoEstado, Button, ButtonLink, ConfirmDestructiveDialog, useEnvio } from '@vida-sobrenatural/ui';

const ICONO = 'text-primary';
const ICONO_NEUTRO = 'text-muted-foreground';

/**
 * spec 009, T035 (FR-011 a FR-014, SC-005): la card de Ministerio. Cada estado
 * de `EstadoMiMinisterio` con su ícono y "¿y ahora qué?" (docs/15), nunca
 * solo color (D81). Nunca muestra un motivo de rechazo ni de baja (FR-014).
 * Retirar es reversible: confirmación neutra (D151); la card cambia sin
 * recargar (FR-013) y `router.refresh()` actualiza el resto de Mi camino.
 */
export function CardMinisterioCliente({ estadoInicial }: { estadoInicial: EstadoMiMinisterio }) {
  const [estado, setEstado] = useState(estadoInicial);
  const t = useTranslations('miCamino.ministerio');
  const locale = useLocale();
  const fecha = (iso: string) => formatearDiaEnArgentina(iso, locale);

  switch (estado.estado) {
    case 'no_apta':
      return (
        <div className="flex flex-col gap-3">
          <AvisoEstado icono={<GraduationCap className={ICONO_NEUTRO} />} titulo={t('noAptaTitulo')}>
            {t('noAptaTexto')}
          </AvisoEstado>
          <ButtonLink render={<Link href="/mi-camino/ministerios" />} variant="outline" size="xl" className="w-full text-base sm:w-fit">
            {t('conocer')}
          </ButtonLink>
        </div>
      );

    case 'puede_postularse': {
      const ultimo = estado.ultimo;
      return (
        <div className="flex flex-col gap-3">
          {ultimo && (
            <AvisoEstado
              icono={ultimo.tipo === 'rechazada' ? <CircleAlert className={ICONO_NEUTRO} /> : ultimo.tipo === 'retirada' ? <Undo2 className={ICONO_NEUTRO} /> : <CircleMinus className={ICONO_NEUTRO} />}
              titulo={
                ultimo.tipo === 'rechazada'
                  ? t('ultimoRechazada', { ministerio: ultimo.ministerio.nombre })
                  : ultimo.tipo === 'retirada'
                    ? t('ultimoRetirada', { ministerio: ultimo.ministerio.nombre, fecha: fecha(ultimo.en) })
                    : t('ultimoBaja', { ministerio: ultimo.ministerio.nombre, fecha: fecha(ultimo.en) })
              }
            />
          )}
          <ButtonLink render={<Link href="/mi-camino/ministerios" />} size="xl" className="w-full text-base sm:w-fit">
            <Sparkles aria-hidden />
            {t('elegir')}
          </ButtonLink>
        </div>
      );
    }

    case 'pendiente':
      return <Pendiente pendiente={estado.pendiente} fecha={fecha} onCambio={setEstado} />;

    case 'miembro': {
      const { membresia, pendiente } = estado;
      return (
        <div className="flex flex-col gap-4">
          <AvisoEstado icono={<UsersRound className={ICONO} />} titulo={t('miembroTitulo', { ministerio: membresia.ministerio.nombre })}>
            <span className="flex flex-col gap-1">
              {membresia.celula && <span>{t('miembroCelula', { celula: membresia.celula.nombre })}</span>}
              <span>{t('miembroDesde', { fecha: fecha(membresia.desde) })}</span>
            </span>
          </AvisoEstado>
          {!membresia.ministerio.activo && (
            <AvisoEstado role="note" icono={<CirclePause className={ICONO_NEUTRO} />} titulo={t('ministerioPausado', { ministerio: membresia.ministerio.nombre })} />
          )}
          {membresia.ministerio.activo && membresia.celula && !membresia.celula.activo && (
            <AvisoEstado role="note" icono={<CirclePause className={ICONO_NEUTRO} />} titulo={t('celulaPausada', { celula: membresia.celula.nombre })} />
          )}
          {pendiente ? (
            <Pendiente pendiente={pendiente} fecha={fecha} onCambio={setEstado} actual={membresia.ministerio.nombre} />
          ) : (
            <ButtonLink render={<Link href="/mi-camino/ministerios" />} variant="ghost" size="xl" className="w-full text-base sm:w-fit">
              <ArrowRightLeft aria-hidden />
              {t('cambiar')}
            </ButtonLink>
          )}
        </div>
      );
    }
  }
}

/** Una postulación en revisión, con "Retirar postulación" (FR-006). `actual`: el Ministerio en el que ya sirve, si es un cambio. */
function Pendiente({
  pendiente,
  fecha,
  onCambio,
  actual,
}: {
  pendiente: PendienteVista;
  fecha: (iso: string) => string;
  onCambio: (e: EstadoMiMinisterio) => void;
  actual?: string;
}) {
  const t = useTranslations('miCamino.ministerio');
  const te = useTranslations('errors');
  const router = useRouter();
  const { data: session } = useSession();
  const ministerio = pendiente.ministerio.nombre;

  const { enviando, ejecutar } = useEnvio(async () => {
    try {
      const nuevo = await apiFetch<EstadoMiMinisterio>(`/postulaciones/me/${pendiente.postulacionId}/retirar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.apiToken}` },
      });
      onCambio(nuevo);
      toast.success(t('retirada'));
    } catch (error) {
      const code = error instanceof ApiError ? error.code : null;
      toast.error(code && te.has(code) ? te(code) : t('errorGenerico'));
    }
    router.refresh();
  });

  const datos = { ministerio, fecha: fecha(pendiente.createdAt) };
  return (
    <div className="flex flex-col gap-3">
      <AvisoEstado
        icono={<Hourglass className={ICONO} />}
        titulo={actual ? t('pendienteOtroTitulo', { ministerio }) : t('pendienteTitulo')}
      >
        <span className="flex flex-col gap-1">
          <span>{pendiente.celula ? t('pendienteTextoCelula', { ...datos, celula: pendiente.celula.nombre }) : t('pendienteTexto', datos)}</span>
          {actual && <span>{t('pendienteOtroTexto', { actual })}</span>}
        </span>
      </AvisoEstado>
      {pendiente.requiereFormacion && (
        <AvisoEstado role="note" icono={<GraduationCap className={ICONO_NEUTRO} />} titulo={t('requiereFormacion')} />
      )}
      <ConfirmDestructiveDialog
        tono="neutro"
        trigger={
          <Button type="button" variant="outline" size="xl" className="w-full text-base sm:w-fit" loading={enviando}>
            <Undo2 aria-hidden />
            {t('retirar')}
          </Button>
        }
        titulo={t('retirarTitulo', { ministerio })}
        descripcion={t('retirarDescripcion')}
        textoConfirmar={t('retirarConfirmar')}
        textoCancelar={t('retirarMantener')}
        onConfirmar={() => void ejecutar()}
      />
    </div>
  );
}
