'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CalendarCheck, CircleAlert, CircleCheck, Copy, PencilRuler, Plus, Send, TriangleAlert, UserMinus } from 'lucide-react';
import {
  ApiError,
  apiFetch,
  erroresPorCampo,
  formatearDiaDeServicio,
  puedeIrEnArea,
  type AreaDeTurnos,
  type FechaDeLaGrilla,
  type GrillaDeTurnos,
  type IntegranteParaTurno,
  type TurnoAsignado,
} from '@vida-sobrenatural/shared-types';
import { Button } from './ui/button';
import { ConfirmDestructiveDialog } from './confirm-destructive-dialog';
import { useEnvio } from '../hooks/use-envio';
import { textoDeCampo } from '../lib/texto-de-campo';
import type { Traductor } from '../lib/discipulado-comun';
import { cn } from '../lib/utils';

/** El `t` de next-intl del namespace `turnos.grilla`: el componente no sabe español (D84). */
export type TraductorGrilla = (clave: string, valores?: Record<string, string | number>) => string;

export interface GrillaTurnosProps {
  grilla: GrillaDeTurnos;
  apiToken: string;
  locale: string;
  t: TraductorGrilla;
  /** El `t` de `errors` (con `has`), para los códigos de la API. */
  te: Traductor;
  /** Después de cada cambio (en Next: `router.refresh()`). */
  onCambio: () => void;
}

const nombreDe = (p: { nombre: string; apellido: string }) => `${p.nombre} ${p.apellido}`;

/**
 * spec 017, US2 (D252–D256): la grilla de turnos del líder (web) y del Admin (backoffice), una sola
 * pieza (Principio XI). Arriba, las próximas fechas con su estado y cuánto falta; abajo, la fecha
 * elegida con sus áreas: así en celular se ve una fecha por vez y en una pantalla ancha las áreas
 * quedan en columnas. Cada estado va con texto e ícono (D81). Una acción a la vez (`useEnvio`,
 * H-57); si la API falla, el aviso trae "Reintentar". Con `puedeEditar` en false (Pastor, D253) se
 * ve lo mismo sin botones.
 */
export function GrillaTurnos({ grilla, apiToken, locale, t, te, onCambio }: GrillaTurnosProps) {
  const [diaElegido, setDiaElegido] = useState<string | null>(grilla.fechas[0]?.dia ?? null);
  const [errorCelda, setErrorCelda] = useState<{ clave: string; mensaje: string } | null>(null);
  const fecha = grilla.fechas.find((f) => f.dia === diaElegido) ?? grilla.fechas[0];
  const textoFecha = (dia: string) => formatearDiaDeServicio(dia, locale);

  const llamar = <T,>(ruta: string, method: 'POST' | 'DELETE', cuerpo?: object) =>
    apiFetch<T>(ruta, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
      ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
    });

  // Una acción a la vez en toda la grilla: el guard va en el envío (H-57).
  const { enviando, ejecutar } = useEnvio(async (accion: () => Promise<void>) => accion());

  const avisarFalla = (error: unknown, reintentar: () => void) => {
    const code = error instanceof ApiError ? error.code : null;
    toast.error(code && te.has(code) ? te(code) : t('errorGenerico'), { action: { label: t('reintentar'), onClick: reintentar } });
  };

  const asignar = (f: FechaDeLaGrilla, area: AreaDeTurnos, i: IntegranteParaTurno): void => {
    const correr = () =>
      void ejecutar(async () => {
        const clave = `${f.dia}:${area.id ?? 'todo'}`;
        setErrorCelda(null);
        try {
          const r = await llamar<TurnoAsignado>(`/ministerios/${grilla.ministerio.id}/fechas/${f.dia}/turnos`, 'POST', { personaId: i.persona.id, celulaId: area.id });
          const otro = r.advertencias[0]?.ministerio;
          toast.success(
            otro
              ? t('asignadoConAviso', { nombre: nombreDe(i.persona), fecha: textoFecha(f.dia), ministerio: otro })
              : t('asignado', { nombre: nombreDe(i.persona), fecha: textoFecha(f.dia) }),
          );
          onCambio();
        } catch (error) {
          const campo = erroresPorCampo(error)?.[0];
          if (campo) {
            setErrorCelda({ clave, mensaje: textoDeCampo(te, campo.code, t('errorGenerico')) });
            return;
          }
          avisarFalla(error, correr);
        }
      });
    correr();
  };

  const quitar = (f: FechaDeLaGrilla, turnoId: string, nombre: string): void => {
    const correr = () =>
      void ejecutar(async () => {
        try {
          await llamar(`/turnos/${turnoId}`, 'DELETE');
          toast.success(t('quitado', { nombre, fecha: textoFecha(f.dia) }));
          onCambio();
        } catch (error) {
          avisarFalla(error, correr);
        }
      });
    correr();
  };

  const copiar = (f: FechaDeLaGrilla): void => {
    const correr = () =>
      void ejecutar(async () => {
        try {
          const r = await llamar<{ copiados: number }>(`/ministerios/${grilla.ministerio.id}/fechas/${f.dia}/copiar-anterior`, 'POST');
          toast.success(t('copiados', { n: r.copiados }));
          onCambio();
        } catch (error) {
          const code = error instanceof ApiError ? error.code : null;
          if (code === 'SIN_FECHA_ANTERIOR') {
            toast.info(te(code));
            return;
          }
          avisarFalla(error, correr);
        }
      });
    correr();
  };

  const publicar = (f: FechaDeLaGrilla): void => {
    const correr = () =>
      void ejecutar(async () => {
        try {
          await llamar(`/ministerios/${grilla.ministerio.id}/fechas/${f.dia}/publicacion`, 'POST');
          toast.success(t('publicada', { fecha: textoFecha(f.dia) }));
          onCambio();
        } catch (error) {
          avisarFalla(error, correr);
        }
      });
    correr();
  };

  if (!fecha) {
    return <p className="rounded-lg border border-border p-5 text-base text-muted-foreground">{t('sinFechas')}</p>;
  }

  const asignadosEnFecha = (f: FechaDeLaGrilla) => f.celdas.reduce((n, c) => n + c.turnos.length, 0);
  const faltanEnFecha = (f: FechaDeLaGrilla) => f.celdas.reduce((n, c) => n + c.faltan, 0);

  return (
    <div className="flex flex-col gap-5">
      {!grilla.puedeEditar && <p className="text-muted-foreground">{t('soloVer')}</p>}
      <nav aria-label={t('fechas')}>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {grilla.fechas.map((f) => {
            const faltan = faltanEnFecha(f);
            const elegida = f.dia === fecha.dia;
            return (
              <li key={f.dia}>
                <button
                  type="button"
                  aria-pressed={elegida}
                  onClick={() => {
                    setDiaElegido(f.dia);
                    setErrorCelda(null);
                  }}
                  className={cn(
                    'flex min-h-11 w-full flex-col items-start gap-0.5 rounded-lg border p-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                    elegida ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted',
                  )}
                >
                  <span className="font-medium first-letter:uppercase">{textoFecha(f.dia)}</span>
                  <EstadoFecha estado={f.estado} t={t} />
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    {faltan > 0 ? <CircleAlert aria-hidden className="size-4" /> : <CircleCheck aria-hidden className="size-4" />}
                    {faltan > 0 ? t('faltan', { n: faltan }) : t('completa')}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <section aria-labelledby="fecha-elegida" className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="fecha-elegida" className="text-xl font-semibold first-letter:uppercase">
              {textoFecha(fecha.dia)}
            </h2>
            <EstadoFecha estado={fecha.estado} t={t} />
            <p className="text-sm text-muted-foreground">{fecha.estado === 'publicada' ? t('publicadaAvisa') : t('borradorAyuda')}</p>
          </div>
          {grilla.puedeEditar && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={enviando} onClick={() => copiar(fecha)}>
                <Copy aria-hidden />
                {t('copiar')}
              </Button>
              {fecha.estado === 'borrador' && (
                <ConfirmDestructiveDialog
                  tono="neutro"
                  trigger={
                    <Button loading={enviando}>
                      <Send aria-hidden />
                      {t('publicar')}
                    </Button>
                  }
                  titulo={t('publicarTitulo', { fecha: textoFecha(fecha.dia) })}
                  descripcion={t('publicarDescripcion', { n: asignadosEnFecha(fecha) })}
                  textoConfirmar={t('publicarConfirmar')}
                  textoCancelar={t('volver')}
                  onConfirmar={() => publicar(fecha)}
                />
              )}
            </div>
          )}
        </div>

        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {grilla.areas.map((area) => {
            const celda = fecha.celdas.find((c) => c.areaId === area.id) ?? { areaId: area.id, turnos: [], faltan: area.cupo };
            const clave = `${fecha.dia}:${area.id ?? 'todo'}`;
            const tituloArea = area.nombre ?? t('todoElMinisterio');
            const yaEstan = new Set(fecha.celdas.flatMap((c) => c.turnos.map((x) => x.persona.id)));
            const disponibles = grilla.integrantes.filter((i) => puedeIrEnArea(i, area.id) && !yaEstan.has(i.persona.id));
            const error = errorCelda?.clave === clave ? errorCelda.mensaje : null;
            return (
              <li key={clave} className="flex flex-col gap-2 rounded-md border border-border p-3">
                <h3 id={`area-${clave}`} className="font-semibold">
                  {tituloArea}
                </h3>
                <p className="text-sm text-muted-foreground">{t('necesita', { n: area.cupo })}</p>
                <p className="flex items-center gap-1 text-sm font-medium">
                  {celda.faltan > 0 ? <TriangleAlert aria-hidden className="size-4 text-destructive" /> : <CircleCheck aria-hidden className="size-4 text-primary" />}
                  {celda.faltan > 0 ? t('faltan', { n: celda.faltan }) : t('completa')}
                </p>
                {celda.turnos.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {celda.turnos.map((x) => (
                      <li key={x.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span className="break-words">{nombreDe(x.persona)}</span>
                        {grilla.puedeEditar && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={enviando}
                            aria-label={t('quitarA', { nombre: nombreDe(x.persona), fecha: textoFecha(fecha.dia) })}
                            onClick={() => quitar(fecha, x.id, nombreDe(x.persona))}
                          >
                            <UserMinus aria-hidden />
                            {t('quitar')}
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                {grilla.puedeEditar && (
                  <details className="group">
                    <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-lg border border-border px-3 font-medium hover:bg-muted">
                      <Plus aria-hidden className="size-4" />
                      {t('agregarEn', { area: tituloArea })}
                    </summary>
                    {disponibles.length === 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">{t('sinDisponibles')}</p>
                    ) : (
                      <ul className="mt-2 flex flex-col gap-1">
                        {disponibles.map((i) => {
                          const otro = fecha.enOtroMinisterio.find((o) => o.personaId === i.persona.id);
                          return (
                            <li key={i.persona.id}>
                              <button
                                type="button"
                                disabled={enviando}
                                onClick={() => asignar(fecha, area, i)}
                                className="flex min-h-11 w-full flex-col items-start rounded-md px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                              >
                                <span className="font-medium">{t('asignar', { nombre: nombreDe(i.persona) })}</span>
                                <span className="text-sm text-muted-foreground">{t('vecesQueSirvio', { n: i.vecesQueSirvio })}</span>
                                {otro && (
                                  <span className="flex items-center gap-1 text-sm text-foreground">
                                    <TriangleAlert aria-hidden className="size-4 shrink-0" />
                                    {t('enOtroMinisterio', { ministerio: otro.ministerio })}
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function EstadoFecha({ estado, t }: { estado: FechaDeLaGrilla['estado']; t: TraductorGrilla }) {
  const Icono = estado === 'publicada' ? CalendarCheck : PencilRuler;
  return (
    <span className="flex items-center gap-1 text-sm">
      <Icono aria-hidden className="size-4" />
      {t(`estado.${estado}`)}
    </span>
  );
}
