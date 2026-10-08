'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CircleCheck, CircleDashed, Clock, Hourglass, Plus, Undo2 } from 'lucide-react';
import {
  ApiError,
  NOTA_COMPLETITUD_MAX,
  apiFetch,
  erroresPorCampo,
  formatearFechaHora,
  type CaminoDePersonaAdmin,
  type EtapaDePersonaAdmin,
} from '@vida-sobrenatural/shared-types';
import { Button, ConfirmDestructiveDialog, DialogoTextoOpcional, useEnvio } from '@vida-sobrenatural/ui';

/**
 * spec 006, T047: las cuatro etapas de una Persona en su Perfil, con texto +
 * ícono por estado (D81). "Registrar como hecha" pide una nota opcional;
 * "Anular" es reversible (se puede volver a registrar), así que su
 * confirmación es neutra (D151).
 */
export function EtapasPersonaCliente({
  personaId,
  camino,
  apiToken,
  puedeGestionar,
}: {
  personaId: string;
  camino: CaminoDePersonaAdmin;
  apiToken: string;
  puedeGestionar: boolean;
}) {
  const t = useTranslations('etapasPersona');
  return (
    <ul className="flex flex-col gap-3">
      {camino.etapas.map((etapa) => (
        <FilaEtapa key={etapa.etapa} personaId={personaId} etapa={etapa} apiToken={apiToken} puedeGestionar={puedeGestionar} />
      ))}
      {!puedeGestionar && <li className="text-sm text-muted-foreground">{t('soloLectura')}</li>}
    </ul>
  );
}

function FilaEtapa({ personaId, etapa, apiToken, puedeGestionar }: { personaId: string; etapa: EtapaDePersonaAdmin; apiToken: string; puedeGestionar: boolean }) {
  const t = useTranslations('etapasPersona');
  const tEtapas = useTranslations('etapas');
  const te = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const nombre = tEtapas(etapa.etapa);
  const vigente = etapa.completitudVigente;

  function avisarError(error: unknown) {
    const code = error instanceof ApiError ? error.code : null;
    toast.error(code && te.has(code) ? te(code) : t('errorGenerico'));
    router.refresh();
  }

  const { enviando: anulando, ejecutar: anular } = useEnvio(async () => {
    if (!vigente) return;
    try {
      await apiFetch(`/personas/${personaId}/completitudes/${vigente.id}/anular`, { method: 'POST', headers: { Authorization: `Bearer ${apiToken}` } });
      toast.success(t('anulada', { etapa: nombre }));
    } catch (error) {
      avisarError(error);
      return;
    }
    router.refresh();
  });

  const estado = etapa.completa
    ? {
        icono: <CircleCheck aria-hidden className="size-5 shrink-0 text-primary" />,
        texto: etapa.completa === 'sistema' ? t('completaSistema') : t('completaHistorial'),
      }
    : etapa.enCurso
      ? { icono: <Clock aria-hidden className="size-5 shrink-0 text-primary" />, texto: t('enCurso') }
      : etapa.declaracionPendiente
        ? { icono: <Hourglass aria-hidden className="size-5 shrink-0 text-primary" />, texto: t('declaracionPendiente') }
        : { icono: <CircleDashed aria-hidden className="size-5 shrink-0 text-muted-foreground" />, texto: t('sinHacer') };

  return (
    <li className="flex flex-col gap-3 rounded-md border border-border p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-3">
        {estado.icono}
        <div className="flex flex-col gap-1">
          <p className="font-medium">
            {nombre} — {estado.texto}
          </p>
          {vigente && (
            <p className="text-sm text-muted-foreground">
              {t(vigente.origen === 'declaracion' ? 'registradaDeclaracion' : 'registradaAdmin', {
                nombre: vigente.registradaPor ? `${vigente.registradaPor.nombre} ${vigente.registradaPor.apellido}` : t('alguienDelEquipo'),
                fecha: formatearFechaHora(vigente.registradaEn, locale),
              })}
            </p>
          )}
          {vigente?.nota && <p className="text-sm text-muted-foreground break-words">{t('nota', { nota: vigente.nota })}</p>}
          {etapa.declaracionPendiente && (
            <Link href={`/solicitudes/historial/${etapa.declaracionPendiente.id}`} className="w-fit text-sm underline underline-offset-4">
              {t('verDeclaracion')}
            </Link>
          )}
        </div>
      </div>

      {puedeGestionar && (
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          {vigente && (
            <ConfirmDestructiveDialog
              tono="neutro"
              trigger={
                <Button type="button" variant="outline" className="h-11" loading={anulando}>
                  <Undo2 aria-hidden />
                  {t('anular')}
                </Button>
              }
              titulo={t('anularTitulo', { etapa: nombre })}
              descripcion={t('anularDescripcion')}
              textoConfirmar={t('anularConfirmar')}
              textoCancelar={t('volver')}
              onConfirmar={() => void anular()}
            />
          )}
          {!etapa.completa && !etapa.enCurso && (
            <DialogoTextoOpcional
              trigger={
                <Button type="button" variant="outline" className="h-11">
                  <Plus aria-hidden />
                  {t('registrar')}
                </Button>
              }
              titulo={t('registrarTitulo', { etapa: nombre })}
              descripcion={etapa.declaracionPendiente ? t('registrarConDeclaracion') : t('registrarDescripcion')}
              campo="nota"
              etiqueta={t('notaEtiqueta')}
              ayuda={t('notaAyuda')}
              max={NOTA_COMPLETITUD_MAX}
              contador={(cantidad, maximo) => t('contador', { cantidad, maximo })}
              mensajeDemasiadoLargo={te('campos.NOTA_DEMASIADO_LARGA')}
              tituloResumen={t('resumenErrores')}
              textoEnviar={t('registrarEnviar')}
              textoVolver={t('volver')}
              onEnviar={async (nota) => {
                try {
                  await apiFetch(`/personas/${personaId}/completitudes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
                    body: JSON.stringify({ etapa: etapa.etapa, nota: nota ?? undefined }),
                  });
                  toast.success(t('registrada', { etapa: nombre }));
                } catch (error) {
                  if (erroresPorCampo(error)) return { errorCampo: te('campos.NOTA_DEMASIADO_LARGA') };
                  avisarError(error);
                  return;
                }
                router.refresh();
              }}
            />
          )}
        </div>
      )}
    </li>
  );
}
