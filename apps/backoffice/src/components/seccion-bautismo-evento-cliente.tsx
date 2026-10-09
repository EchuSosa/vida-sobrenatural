'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CalendarX, CircleCheck, Hourglass, UserPlus } from 'lucide-react';
import {
  ApiError,
  apiFetch,
  formatearFechaCorta,
  type AsignacionResultado,
  type ConfirmacionBautismosResultado,
  type SeccionBautismoEventoDatos,
} from '@vida-sobrenatural/shared-types';
import { Button, ConfirmDestructiveDialog, EstadoVacio, Paginacion, useEnvio } from '@vida-sobrenatural/ui';

/**
 * spec 010, T036 y T058 — la parte interactiva de la sección Bautismo del
 * Evento. Casillas reales con su nombre accesible; "Sumar al bautismo (N)"
 * es la acción principal y el resultado parcial se dice en texto (FR-014).
 * "Quitar" y "Confirmar bautismos" son reversibles o corrigen datos: sus
 * diálogos son neutros (D151). Cada acción bloquea su botón mientras se
 * procesa (H-57) y al terminar recarga los datos del servidor.
 */
export function SeccionBautismoEventoCliente({
  datos,
  apiToken,
  puedeGestionar,
  paginaEsperando,
  totalPaginasEsperando,
}: {
  datos: SeccionBautismoEventoDatos;
  apiToken: string;
  puedeGestionar: boolean;
  paginaEsperando: number;
  totalPaginasEsperando: number;
}) {
  const t = useTranslations('eventos.bautismo');
  const te = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const { evento, asignadas, esperandoFecha, puedeConfirmar } = datos;
  const [elegidas, setElegidas] = useState<Set<string>>(new Set());
  const porConfirmar = asignadas.items.filter((a) => a.estado === 'aprobada');
  const [noBautizadas, setNoBautizadas] = useState<Set<string>>(new Set());
  const [resultado, setResultado] = useState<string | null>(null);
  const puedeAsignar = puedeGestionar && !evento.cancelado && !evento.yaEmpezo;
  const nombre = (p: { nombre: string; apellido: string }) => `${p.nombre} ${p.apellido}`;

  async function post<T>(ruta: string, body?: unknown): Promise<T> {
    return apiFetch<T>(ruta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
      body: JSON.stringify(body ?? {}),
    });
  }

  function mensajeDeError(error: unknown) {
    const code = error instanceof ApiError ? error.code : null;
    return code && te.has(code) ? te(code) : t('errorGenerico');
  }

  const { enviando: sumando, ejecutar: sumar } = useEnvio(async () => {
    try {
      const r = await post<AsignacionResultado>(`/bautismo/eventos/${evento.id}/asignar`, { solicitudIds: [...elegidas] });
      const texto =
        r.noAsignadas.length === 0
          ? t('resultadoTodas', { cantidad: r.asignadas.length })
          : t('resultadoParcial', { cantidad: r.asignadas.length, fuera: r.noAsignadas.length });
      setResultado(texto);
      if (r.noAsignadas.length === 0) toast.success(texto);
      else toast.info(texto);
      setElegidas(new Set());
    } catch (error) {
      toast.error(mensajeDeError(error));
    }
    router.refresh();
  });

  const { enviando: confirmando, ejecutar: confirmar } = useEnvio(async () => {
    try {
      const r = await post<ConfirmacionBautismosResultado>(`/bautismo/eventos/${evento.id}/confirmar`, {
        realizadas: porConfirmar.filter((a) => !noBautizadas.has(a.solicitudId)).map((a) => a.solicitudId),
      });
      toast.success(t('confirmados', { cantidad: r.realizadas, devueltas: r.devueltasAEspera }));
      setNoBautizadas(new Set());
    } catch (error) {
      toast.error(mensajeDeError(error));
    }
    router.refresh();
  });

  async function quitar(solicitudId: string, quien: string) {
    try {
      await post(`/bautismo/solicitudes/${solicitudId}/quitar-de-evento`);
      toast.success(t('quitada', { nombre: quien }));
    } catch (error) {
      toast.error(mensajeDeError(error));
    }
    router.refresh();
  }

  const todasElegidas = esperandoFecha.items.length > 0 && esperandoFecha.items.every((f) => elegidas.has(f.solicitudId));
  const cantidadAConfirmar = porConfirmar.length - noBautizadas.size;

  return (
    <div className="flex flex-col gap-8">
      {/* Personas a bautizar */}
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">{t('asignadasTitulo', { cantidad: asignadas.total })}</h3>
        {asignadas.items.length === 0 ? (
          <EstadoVacio mensaje={puedeAsignar ? t('asignadasVacioConAccion') : t('asignadasVacio')} />
        ) : puedeConfirmar && puedeGestionar ? (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-base font-medium">{t('confirmarLeyenda')}</legend>
            <p className="text-sm text-muted-foreground">{t('confirmarAyuda')}</p>
            <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
              {asignadas.items.map((a) => (
                <li key={a.solicitudId} className="flex min-h-11 items-center gap-3 px-3 py-2">
                  {a.estado === 'aprobada' ? (
                    <label className="flex flex-1 items-center gap-3">
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={!noBautizadas.has(a.solicitudId)}
                        onChange={(e) =>
                          setNoBautizadas((s) => {
                            const n = new Set(s);
                            if (e.target.checked) n.delete(a.solicitudId);
                            else n.add(a.solicitudId);
                            return n;
                          })
                        }
                      />
                      <span>{nombre(a.persona)}</span>
                    </label>
                  ) : (
                    <span className="flex flex-1 items-center gap-3">
                      <CircleCheck aria-hidden className="size-4 text-primary" />
                      {nombre(a.persona)} · {t('seBautizo')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex sm:justify-end">
              <ConfirmDestructiveDialog
                tono="neutro"
                trigger={
                  <Button type="button" className="h-11" loading={confirmando}>
                    <CircleCheck aria-hidden />
                    {t('confirmar', { cantidad: cantidadAConfirmar })}
                  </Button>
                }
                titulo={t('confirmarTitulo')}
                descripcion={t('confirmarDescripcion', { cantidad: cantidadAConfirmar, devueltas: noBautizadas.size })}
                textoConfirmar={t('confirmarEnviar')}
                textoCancelar={t('volver')}
                onConfirmar={() => void confirmar()}
              />
            </div>
          </fieldset>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
            {asignadas.items.map((a) => (
              <li key={a.solicitudId} className="flex min-h-11 flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span className="flex items-center gap-2">
                  {a.estado === 'realizada' ? (
                    <CircleCheck aria-hidden className="size-4 text-primary" />
                  ) : (
                    <Hourglass aria-hidden className="size-4 text-muted-foreground" />
                  )}
                  <Link href={`/solicitudes/bautismo/${a.solicitudId}`} className="underline underline-offset-2">
                    {nombre(a.persona)}
                  </Link>
                  <span className="text-sm text-muted-foreground">· {a.estado === 'realizada' ? t('seBautizo') : t('aBautizar')}</span>
                </span>
                {puedeAsignar && a.estado === 'aprobada' && (
                  <ConfirmDestructiveDialog
                    tono="neutro"
                    trigger={
                      <Button type="button" variant="outline" size="sm">
                        <CalendarX aria-hidden />
                        {t('quitar')}
                        <span className="sr-only"> {nombre(a.persona)}</span>
                      </Button>
                    }
                    titulo={t('quitarTitulo', { nombre: nombre(a.persona) })}
                    descripcion={t('quitarDescripcion')}
                    textoConfirmar={t('quitarEnviar')}
                    textoCancelar={t('volver')}
                    onConfirmar={() => void quitar(a.solicitudId, nombre(a.persona))}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Esperando fecha */}
      {puedeAsignar && (
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold">{t('esperandoTitulo', { cantidad: esperandoFecha.total })}</h3>
          <p className="text-sm text-muted-foreground">{t('esperandoAyuda')}</p>
          {esperandoFecha.items.length === 0 ? (
            <EstadoVacio mensaje={t('esperandoVacio')} />
          ) : (
            <fieldset className="flex flex-col gap-3">
              <legend className="sr-only">{t('esperandoLeyenda')}</legend>
              <label className="flex min-h-11 w-fit items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={todasElegidas}
                  onChange={(e) => setElegidas(e.target.checked ? new Set(esperandoFecha.items.map((f) => f.solicitudId)) : new Set())}
                />
                {t('seleccionarTodas')}
              </label>
              <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
                {esperandoFecha.items.map((f) => (
                  <li key={f.solicitudId} className="flex min-h-11 items-center px-3 py-2">
                    <label className="flex flex-1 items-center gap-3">
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={elegidas.has(f.solicitudId)}
                        onChange={(e) =>
                          setElegidas((s) => {
                            const n = new Set(s);
                            if (e.target.checked) n.add(f.solicitudId);
                            else n.delete(f.solicitudId);
                            return n;
                          })
                        }
                      />
                      <span>{nombre(f.persona)}</span>
                      <span className="text-sm text-muted-foreground">· {t('aceptadaEl', { fecha: formatearFechaCorta(f.aceptadaEn, locale) })}</span>
                    </label>
                  </li>
                ))}
              </ul>
              {totalPaginasEsperando > 1 && (
                <Paginacion
                  paginaActual={paginaEsperando}
                  totalPaginas={totalPaginasEsperando}
                  renderEnlace={(p) => <Link href={`/eventos/${evento.id}?esperando=${p}#bautismo`} />}
                />
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                {resultado && (
                  <p role="status" className="text-sm">
                    {resultado}
                  </p>
                )}
                <Button type="button" className="h-11" loading={sumando} disabled={elegidas.size === 0} onClick={() => void sumar()}>
                  <UserPlus aria-hidden />
                  {t('sumar', { cantidad: elegidas.size })}
                </Button>
              </div>
            </fieldset>
          )}
        </div>
      )}
    </div>
  );
}
