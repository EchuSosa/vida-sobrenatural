'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CircleAlert, CircleCheck, CircleX, Save } from 'lucide-react';
import { ApiError, apiFetch, erroresPorCampo, type AsistenciaDelDia } from '@vida-sobrenatural/shared-types';
import { Button, MensajeErrorCampo, ResumenErrores, useEnvio } from '@vida-sobrenatural/ui';

/**
 * spec 008, T052: la lista de inscriptos con un interruptor de un toque
 * (44 px, `aria-pressed`, con texto "Vino"/"No vino" además del ícono, D81),
 * el contador en vivo y el envío único (H-57).
 */
export function TomarAsistencia({
  grupoId,
  asistencia,
  hoy,
  minimo,
  fechaLegible,
}: {
  grupoId: string;
  asistencia: AsistenciaDelDia;
  hoy: string;
  minimo: string;
  fechaLegible: string;
}) {
  const t = useTranslations('misGrupos.asistencia');
  const tg = useTranslations('misGrupos');
  const te = useTranslations('errors');
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [ausentes, setAusentes] = useState<Set<string>>(new Set(asistencia.inscriptos.filter((i) => !i.presente).map((i) => i.inscripcionId)));
  const [fecha, setFecha] = useState(asistencia.fecha);
  const [error, setError] = useState<string | undefined>();
  const [foco, setFoco] = useState(0);
  const presentes = asistencia.inscriptos.length - ausentes.size;

  const { enviando, ejecutar } = useEnvio(async () => {
    try {
      await apiFetch(`/vida-de-servicio/mis-grupos/${grupoId}/asistencia/${asistencia.fecha}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.apiToken}` },
        body: JSON.stringify({ ausentes: [...ausentes] }),
      });
      toast.success(t('guardada', { fecha: fechaLegible }));
      router.refresh();
    } catch (e) {
      const campo = erroresPorCampo(e)?.[0];
      if (campo) {
        setError(te.has(`campos.${campo.code}`) ? te(`campos.${campo.code}`) : tg('errorGenerico'));
        setFoco((f) => f + 1);
        return;
      }
      const code = e instanceof ApiError ? e.code : null;
      toast.error(code && te.has(code) ? te(code) : tg('errorGenerico'));
    }
  });

  return (
    <div className="flex flex-col gap-4">
      <ResumenErrores errores={error ? [{ campo: 'fecha', mensaje: error }] : []} titulo={tg('resumenErrores')} foco={foco} />
      <form
        className="flex flex-col gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`${pathname}?fecha=${fecha}`);
        }}
      >
        <label htmlFor="campo-fecha" className="text-base font-medium">
          {t('fechaEtiqueta')}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="campo-fecha"
            type="date"
            value={fecha}
            min={minimo}
            max={hoy}
            onChange={(e) => setFecha(e.target.value)}
            aria-describedby="ayuda-fecha"
            className="h-11 rounded-md border border-input bg-background px-3 text-base"
          />
          {fecha !== asistencia.fecha && (
            <Button type="submit" variant="outline" size="xl" className="text-base">
              {t('cambiarFecha')}
            </Button>
          )}
        </div>
        <p id="ayuda-fecha" className="text-base text-muted-foreground">
          {t('fechaAyuda')}
        </p>
        <MensajeErrorCampo id="error-fecha" mensaje={error} />
      </form>

      <p className="text-base">{asistencia.guardada ? t('guardadaAntes') : t('nuevaTodos')}</p>

      {asistencia.inscriptos.length === 0 ? (
        <p className="text-base text-muted-foreground">{t('sinInscriptos')}</p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {asistencia.inscriptos.map((i) => {
              const ausente = ausentes.has(i.inscripcionId);
              const nombre = `${i.nombre} ${i.apellido}`;
              return (
                <li key={i.inscripcionId}>
                  <button
                    type="button"
                    aria-pressed={!ausente}
                    aria-label={t('marcar', { nombre, estado: ausente ? t('ausente') : t('presente') })}
                    onClick={() =>
                      setAusentes((a) => {
                        const nuevo = new Set(a);
                        if (ausente) nuevo.delete(i.inscripcionId);
                        else nuevo.add(i.inscripcionId);
                        return nuevo;
                      })
                    }
                    className="flex min-h-14 w-full items-center justify-between gap-3 rounded-lg border border-border p-3 text-left text-base aria-[pressed=false]:border-foreground aria-[pressed=false]:bg-muted"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="font-medium break-words">{nombre}</span>
                      {i.alertaFaltas && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <CircleAlert aria-hidden className="size-4 text-primary" />
                          {t('faltasAlerta', { cantidad: i.faltas })}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 font-medium">
                      {ausente ? <CircleX aria-hidden className="size-5" /> : <CircleCheck aria-hidden className="size-5 text-success" />}
                      {ausente ? t('ausente') : t('presente')}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="sticky bottom-20 z-10 -mx-4 border-t border-border bg-background p-4 md:bottom-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-base font-medium" aria-live="polite" data-testid="contador-asistencia">
                {t('contador', { presentes, ausentes: ausentes.size })}
              </p>
              <Button type="button" size="xl" className="w-full text-base sm:w-fit" loading={enviando} onClick={() => void ejecutar()}>
                <Save aria-hidden />
                {t('guardar')}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
