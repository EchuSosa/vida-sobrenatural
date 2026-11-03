'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CalendarCheck, CalendarDays, CalendarOff, CalendarPlus, PencilRuler, Trash2, Undo2, Users } from 'lucide-react';
import {
  ApiError,
  CUPO_TURNO_MAXIMO,
  POSICIONES_EN_MES,
  apiFetch,
  cupoTurnoValido,
  erroresDeReglaDiaDeServicio,
  formatearDiaDeServicio,
  type DiaDeServicioVista,
  type DiasDeServicioDelMinisterio,
  type EstadoFechaDeServicio,
  type ReglaDiaDeServicio,
} from '@vida-sobrenatural/shared-types';
import { Button, ConfirmDestructiveDialog, MensajeErrorCampo, ResumenErrores, mensajesDeCampo, useEnvio, useValidacionCampos, type Traductor } from '@vida-sobrenatural/ui';

const CLASE_CAMPO =
  'h-11 rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30';

/** `mensajesDeCampo` cae en `errores.generico`; acá el genérico de la sección. */
function genericoDe(t: (clave: 'errorGenerico') => string): Traductor {
  return Object.assign(() => t('errorGenerico'), { has: () => true });
}

const ICONO_ESTADO: Record<EstadoFechaDeServicio, typeof CalendarDays> = {
  borrador: PencilRuler,
  publicada: CalendarCheck,
  suspendida: CalendarOff,
};

/**
 * spec 017, US1 (D250, D251): los días de servicio del Ministerio, cuánta gente hace falta por
 * fecha en cada área y las próximas fechas con "Este día no hay". El Admin gestiona; el Pastor
 * ve lo mismo sin botones. Cada estado va con texto e ícono (D81).
 */
export function DiasDeServicio({
  ministerioId,
  datos,
  puedeGestionar,
  apiToken,
}: {
  ministerioId: string;
  datos: DiasDeServicioDelMinisterio;
  puedeGestionar: boolean;
  apiToken: string;
}) {
  const t = useTranslations('ministerios.diasDeServicio');
  const te = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const textoRegla = (r: ReglaDiaDeServicio) =>
    r.frecuencia === 'semanal'
      ? t('reglaSemanal', { dia: t(`diasPlural.${r.diaSemana}`) })
      : t('reglaMensual', { posicion: t(`posiciones.${r.posicionEnMes}`), dia: t(`dias.${r.diaSemana}`) });
  const fecha = (dia: string) => formatearDiaDeServicio(dia, locale);

  const llamar = async (ruta: string, method: 'POST' | 'DELETE' | 'PATCH', cuerpo?: object) =>
    apiFetch(ruta, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
      ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
    });
  const avisarError = (error: unknown) => {
    const code = error instanceof ApiError ? error.code : null;
    toast.error(code && te.has(code) ? te(code) : t('errorGenerico'));
  };

  // Una sola acción a la vez en toda la sección (H-57: el guard va en el envío, no solo en el botón).
  const { enviando, ejecutar } = useEnvio(async (accion: () => Promise<void>) => accion());

  const quitar = (r: DiaDeServicioVista) =>
    ejecutar(async () => {
      try {
        await llamar(`/ministerios/${ministerioId}/dias-de-servicio/${r.id}`, 'DELETE');
        toast.success(t('quitada', { regla: textoRegla(r) }));
        router.refresh();
      } catch (error) {
        avisarError(error);
      }
    });

  const suspender = (dia: string, suspendida: boolean) =>
    ejecutar(async () => {
      try {
        await llamar(`/ministerios/${ministerioId}/fechas/${dia}/suspension`, suspendida ? 'DELETE' : 'POST');
        toast.success(suspendida ? t('habilitada', { fecha: fecha(dia) }) : t('suspendida', { fecha: fecha(dia) }));
        router.refresh();
      } catch (error) {
        avisarError(error);
      }
    });

  return (
    <section aria-labelledby="dias-servicio-titulo" className="flex flex-col gap-4">
      <h2 id="dias-servicio-titulo" className="flex items-center gap-2 text-lg font-semibold">
        <CalendarDays aria-hidden className="size-5 text-primary" />
        {t('titulo')}
      </h2>
      <p className="text-sm text-muted-foreground">{t('ayuda')}</p>

      {datos.reglas.length === 0 ? (
        <p className="text-muted-foreground">{t('sinReglas')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {datos.reglas.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <span className="font-medium">{textoRegla(r)}</span>
              {puedeGestionar && (
                <ConfirmDestructiveDialog
                  tono="neutro"
                  trigger={
                    <Button variant="outline" size="sm" disabled={enviando} aria-label={`${t('quitar')}: ${textoRegla(r)}`}>
                      <Trash2 aria-hidden />
                      {t('quitar')}
                    </Button>
                  }
                  titulo={t('quitarTitulo', { regla: textoRegla(r) })}
                  descripcion={t('quitarDescripcion')}
                  textoConfirmar={t('quitarConfirmar')}
                  textoCancelar={t('volver')}
                  onConfirmar={() => void quitar(r)}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {puedeGestionar && (
        <AgregarRegla ministerioId={ministerioId} apiToken={apiToken} textoRegla={textoRegla} />
      )}

      <Cupos ministerioId={ministerioId} datos={datos} puedeGestionar={puedeGestionar} apiToken={apiToken} />

      <div className="flex flex-col gap-2">
        <h3 className="font-semibold">{t('proximasTitulo')}</h3>
        {datos.proximas.length === 0 ? (
          <p className="text-muted-foreground">{t('sinProximas')}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
            {datos.proximas.map((p) => {
              const Icono = ICONO_ESTADO[p.estado];
              const suspendida = p.estado === 'suspendida';
              return (
                <li key={p.dia} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium first-letter:uppercase">{fecha(p.dia)}</span>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Icono aria-hidden className="size-4" />
                      {t(`estado.${p.estado}`)} · {t('turnos', { n: p.turnosAsignados })}
                    </span>
                  </span>
                  {puedeGestionar &&
                    (suspendida ? (
                      <Button variant="outline" size="sm" disabled={enviando} onClick={() => void suspender(p.dia, true)} aria-label={`${t('habilitar')}: ${fecha(p.dia)}`}>
                        <Undo2 aria-hidden />
                        {t('habilitar')}
                      </Button>
                    ) : (
                      <ConfirmDestructiveDialog
                        tono="neutro"
                        trigger={
                          <Button variant="outline" size="sm" disabled={enviando} aria-label={`${t('suspender')}: ${fecha(p.dia)}`}>
                            <CalendarOff aria-hidden />
                            {t('suspender')}
                          </Button>
                        }
                        titulo={t('suspenderTitulo', { fecha: fecha(p.dia) })}
                        descripcion={p.turnosAsignados > 0 ? t('suspenderDescripcionConTurnos', { n: p.turnosAsignados }) : t('suspenderDescripcion')}
                        textoConfirmar={t('suspenderConfirmar')}
                        textoCancelar={t('volver')}
                        onConfirmar={() => void suspender(p.dia, false)}
                      />
                    ))}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

/** El formulario de "Agregar un día" (D250), con los errores por campo de H-50. */
function AgregarRegla({ ministerioId, apiToken, textoRegla }: { ministerioId: string; apiToken: string; textoRegla: (r: ReglaDiaDeServicio) => string }) {
  const t = useTranslations('ministerios.diasDeServicio');
  const te = useTranslations('errors');
  const tc = useTranslations('errors.campos');
  const router = useRouter();
  const validacion = useValidacionCampos();
  const [frecuencia, setFrecuencia] = useState<'' | 'semanal' | 'mensual'>('');
  const [posicion, setPosicion] = useState('');
  const [dia, setDia] = useState('');

  const { enviando, ejecutar } = useEnvio(async () => {
    const regla = {
      frecuencia,
      diaSemana: dia === '' ? undefined : Number(dia),
      posicionEnMes: frecuencia === 'mensual' && posicion !== '' ? Number(posicion) : null,
    };
    const errores = erroresDeReglaDiaDeServicio(regla);
    if (errores.length > 0) {
      const campo = { FRECUENCIA_INVALIDA: 'frecuencia', DIA_SEMANA_INVALIDO: 'diaSemana', POSICION_EN_MES_INVALIDA: 'posicionEnMes' } as const;
      validacion.reemplazar(Object.fromEntries(errores.map((code) => [campo[code], tc(code)])));
      return;
    }
    try {
      await apiFetch(`/ministerios/${ministerioId}/dias-de-servicio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify(regla),
      });
      toast.success(t('agregada', { regla: textoRegla(regla as ReglaDiaDeServicio) }));
      setFrecuencia('');
      setPosicion('');
      setDia('');
      validacion.reset();
      router.refresh();
    } catch (error) {
      const campos = mensajesDeCampo(error, te as unknown as Traductor, genericoDe(t));
      if (campos) {
        validacion.reemplazar(campos);
        return;
      }
      const code = error instanceof ApiError ? error.code : null;
      toast.error(code && te.has(code) ? te(code) : t('errorGenerico'));
    }
  });
  const m = validacion.mensajes;
  const aria = (campo: string) => ({
    id: `campo-${campo}`,
    'aria-invalid': m[campo] ? true : undefined,
    'aria-describedby': m[campo] ? `campo-${campo}-error` : undefined,
  });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void ejecutar();
      }}
      className="flex flex-col gap-3 rounded-md border border-border p-3"
      aria-labelledby="agregar-dia-titulo"
    >
      <h3 id="agregar-dia-titulo" className="flex items-center gap-2 font-semibold">
        <CalendarPlus aria-hidden className="size-4" />
        {t('agregarTitulo')}
      </h3>
      <ResumenErrores errores={validacion.resumen} foco={validacion.foco} titulo={t('resumenErrores')} />
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="campo-frecuencia" className="font-medium">{t('frecuencia')}</label>
          <select {...aria('frecuencia')} value={frecuencia} className={CLASE_CAMPO} onChange={(e) => { setFrecuencia(e.target.value as '' | 'semanal' | 'mensual'); validacion.limpiar('frecuencia'); validacion.limpiar('posicionEnMes'); }}>
            <option value="" disabled>{t('elegir')}</option>
            <option value="semanal">{t('frecuenciaSemanal')}</option>
            <option value="mensual">{t('frecuenciaMensual')}</option>
          </select>
          <MensajeErrorCampo id="campo-frecuencia-error" mensaje={m.frecuencia} />
        </div>
        {frecuencia === 'mensual' && (
          <div className="flex flex-col gap-1">
            <label htmlFor="campo-posicionEnMes" className="font-medium">{t('posicion')}</label>
            <select {...aria('posicionEnMes')} value={posicion} className={CLASE_CAMPO} onChange={(e) => { setPosicion(e.target.value); validacion.limpiar('posicionEnMes'); }}>
              <option value="" disabled>{t('elegir')}</option>
              {POSICIONES_EN_MES.map((p) => (
                <option key={p} value={p}>{t(`posiciones.${p}`)}</option>
              ))}
            </select>
            <MensajeErrorCampo id="campo-posicionEnMes-error" mensaje={m.posicionEnMes} />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor="campo-diaSemana" className="font-medium">{t('dia')}</label>
          <select {...aria('diaSemana')} value={dia} className={CLASE_CAMPO} onChange={(e) => { setDia(e.target.value); validacion.limpiar('diaSemana'); }}>
            <option value="" disabled>{t('elegir')}</option>
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <option key={d} value={d}>{t(`dias.${d}`)}</option>
            ))}
          </select>
          <MensajeErrorCampo id="campo-diaSemana-error" mensaje={m.diaSemana} />
        </div>
      </div>
      <div>
        <Button type="submit" loading={enviando}>
          <CalendarPlus aria-hidden />
          {t('agregar')}
        </Button>
      </div>
    </form>
  );
}

/** D251: el cupo de cada área (o del Ministerio sin áreas). */
function Cupos({ ministerioId, datos, puedeGestionar, apiToken }: { ministerioId: string; datos: DiasDeServicioDelMinisterio; puedeGestionar: boolean; apiToken: string }) {
  const t = useTranslations('ministerios.diasDeServicio');
  const filas =
    datos.celulas.length > 0
      ? datos.celulas.map((c) => ({ id: c.id, nombre: c.nombre, cupo: c.cupoTurno, ruta: `/celulas/${c.id}/cupo-turno` }))
      : [{ id: 'ministerio', nombre: t('cupoMinisterio'), cupo: datos.cupoMinisterio, ruta: `/ministerios/${ministerioId}/cupo-turno` }];
  return (
    <div className="flex flex-col gap-2">
      <h3 className="flex items-center gap-2 font-semibold">
        <Users aria-hidden className="size-4" />
        {t('cuposTitulo')}
      </h3>
      <p className="text-sm text-muted-foreground">{t('cuposAyuda')}</p>
      <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
        {filas.map((f) => (
          <li key={f.id} className="p-3">
            <CupoFila fila={f} puedeGestionar={puedeGestionar} apiToken={apiToken} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CupoFila({ fila, puedeGestionar, apiToken }: { fila: { id: string; nombre: string; cupo: number; ruta: string }; puedeGestionar: boolean; apiToken: string }) {
  const t = useTranslations('ministerios.diasDeServicio');
  const te = useTranslations('errors');
  const tc = useTranslations('errors.campos');
  const router = useRouter();
  const [valor, setValor] = useState(String(fila.cupo));
  const [error, setError] = useState<string | undefined>();
  const idCampo = `campo-cupo-${fila.id}`;
  const { enviando, ejecutar } = useEnvio(async () => {
    const cupo = Number(valor);
    if (!cupoTurnoValido(cupo)) {
      setError(tc('CUPO_TURNO_INVALIDO'));
      document.getElementById(idCampo)?.focus();
      return;
    }
    try {
      await apiFetch(fila.ruta, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` }, body: JSON.stringify({ cupo }) });
      setError(undefined);
      toast.success(t('cupoGuardado', { area: fila.nombre, cupo }));
      router.refresh();
    } catch (e) {
      const campos = mensajesDeCampo(e, te as unknown as Traductor, genericoDe(t));
      if (campos?.cupo) {
        setError(campos.cupo);
        return;
      }
      const code = e instanceof ApiError ? e.code : null;
      toast.error(code && te.has(code) ? te(code) : t('errorGenerico'));
    }
  });
  if (!puedeGestionar) {
    return (
      <span className="flex flex-wrap justify-between gap-2">
        <span className="font-medium">{fila.nombre}</span>
        <span>{fila.cupo}</span>
      </span>
    );
  }
  return (
    <form
      noValidate
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void ejecutar();
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={idCampo} className="font-medium">{t('cupo', { area: fila.nombre })}</label>
        <input
          id={idCampo}
          type="number"
          inputMode="numeric"
          min={1}
          max={CUPO_TURNO_MAXIMO}
          value={valor}
          onChange={(e) => {
            setValor(e.target.value);
            setError(undefined);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${idCampo}-error` : undefined}
          className={`${CLASE_CAMPO} w-28`}
        />
        <MensajeErrorCampo id={`${idCampo}-error`} mensaje={error} />
      </div>
      <Button type="submit" variant="outline" loading={enviando}>
        {t('guardarCupo')}
      </Button>
    </form>
  );
}
