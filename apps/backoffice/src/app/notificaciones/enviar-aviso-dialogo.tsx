'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AlertTriangle, Mail, Users } from 'lucide-react';
import {
  apiFetch,
  ApiError,
  MENSAJE_AVISO_MAX,
  TITULO_AVISO_MAX,
  validarNuevaNotificacion,
  type AlcanceManual,
  type ConteoDestinatarios,
  type OpcionesAlcance,
} from '@vida-sobrenatural/shared-types';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  MensajeErrorCampo,
  ResumenErrores,
  useEnvio,
  useValidacionCampos,
} from '@vida-sobrenatural/ui';

const CAMPO =
  'w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive dark:bg-input/30';

/**
 * spec 012, T049 (FR-027, FR-028, FR-029, FR-034; D151) — "Enviar un aviso".
 * Dos pasos en el mismo diálogo: el formulario (con el conteo de personas en
 * vivo, que usa la misma resolución que el envío) y la confirmación, que dice
 * qué va a pasar. Errores por campo + resumen con foco (H-50); "Mandar aviso"
 * con `useEnvio` contra el doble envío (H-57). Confirmación neutra: no es
 * destructivo.
 */
export function EnviarAvisoDialogo({ trigger, apiToken }: { trigger: ReactElement; apiToken: string }) {
  const t = useTranslations('notificaciones.dialogo');
  const tn = useTranslations('notificaciones');
  const te = useTranslations('errors');
  const router = useRouter();
  const validacion = useValidacionCampos();

  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso] = useState<'editar' | 'confirmar'>('editar');
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [alcance, setAlcance] = useState<AlcanceManual>('todos');
  const [alcanceId, setAlcanceId] = useState('');
  const [importante, setImportante] = useState(false);
  const [opciones, setOpciones] = useState<OpcionesAlcance | null>(null);
  const [conteo, setConteo] = useState<ConteoDestinatarios | null>(null);
  const [contando, setContando] = useState(false);
  const [errorConteo, setErrorConteo] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' };
  const textoError = (code: string) => (te.has(`campos.${code}`) ? te(`campos.${code}`) : te.has(code) ? te(code) : t('errorGenerico'));

  function reiniciar() {
    setPaso('editar');
    setTitulo('');
    setMensaje('');
    setAlcance('todos');
    setAlcanceId('');
    setImportante(false);
    setConteo(null);
    setErrorConteo(null);
    setErrorGeneral(null);
    validacion.reset();
  }

  // Las opciones de Grupo y Ministerio, al abrir.
  useEffect(() => {
    if (!abierto || opciones) return;
    apiFetch<OpcionesAlcance>('/notificaciones/opciones-alcance', { headers: { Authorization: `Bearer ${apiToken}` } })
      .then(setOpciones)
      .catch(() => setOpciones({ grupos: [], ministerios: [] }));
  }, [abierto, opciones, apiToken]);

  // FR-028: el conteo en vivo, con 300 ms de espera.
  useEffect(() => {
    if (!abierto || (alcance !== 'todos' && !alcanceId)) return;
    const temporizador = setTimeout(() => {
      setContando(true);
      apiFetch<ConteoDestinatarios>('/notificaciones/destinatarios', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ alcance, alcanceId: alcance === 'todos' ? undefined : alcanceId }),
      })
        .then((c) => {
          setConteo(c);
          setErrorConteo(c.personas === 0 ? te('NOTIFICACION_SIN_DESTINATARIOS') : null);
        })
        .catch((e: unknown) => {
          setConteo(null);
          setErrorConteo(e instanceof ApiError && te.has(e.code) && e.code !== 'ERROR_INTERNO' ? te(e.code) : t('conteoError'));
        })
        .finally(() => setContando(false));
    }, 300);
    return () => clearTimeout(temporizador);
  }, [abierto, alcance, alcanceId, apiToken, t, te]);

  function revisar() {
    setErrorGeneral(null);
    const errores = validarNuevaNotificacion({ titulo, mensaje, alcance, alcanceId: alcance === 'todos' ? undefined : alcanceId, importante });
    if (errores.length > 0) {
      validacion.reemplazar(Object.fromEntries(errores.map((e) => [e.campo, textoError(e.code)])));
      return;
    }
    if (errorConteo || !conteo || conteo.personas === 0) {
      validacion.reemplazar({ alcanceId: errorConteo ?? te('NOTIFICACION_SIN_DESTINATARIOS') });
      return;
    }
    validacion.reset();
    setPaso('confirmar');
  }

  const { enviando, ejecutar } = useEnvio(async () => {
    try {
      await apiFetch('/notificaciones', {
        method: 'POST',
        headers,
        body: JSON.stringify({ titulo, mensaje, alcance, alcanceId: alcance === 'todos' ? undefined : alcanceId, importante }),
      });
      setAbierto(false);
      reiniciar();
      toast(tn('enviado'));
      router.refresh();
    } catch (e) {
      setPaso('editar');
      if (e instanceof ApiError && e.errors?.length) {
        validacion.reemplazar(Object.fromEntries(e.errors.map((x) => [x.campo, textoError(x.code)])));
      } else if (e instanceof ApiError && (e.code === 'NOTIFICACION_SIN_DESTINATARIOS' || e.code === 'ALCANCE_NO_DISPONIBLE')) {
        validacion.reemplazar({ alcanceId: te(e.code) });
      } else {
        setErrorGeneral(e instanceof ApiError && e.requestId ? `${t('errorGenerico')} (${e.requestId})` : t('errorGenerico'));
      }
    }
  });

  const m = validacion.mensajes;
  const describe = (campo: string, ayuda?: string) => [ayuda, m[campo] ? `campo-${campo}-error` : undefined].filter(Boolean).join(' ') || undefined;

  return (
    <AlertDialog
      open={abierto}
      onOpenChange={(v) => {
        setAbierto(v);
        if (!v) reiniciar();
      }}
    >
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent data-tono="neutro" className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {paso === 'editar' ? (
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              revisar();
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>{t('titulo')}</AlertDialogTitle>
              <AlertDialogDescription>{t('descripcion')}</AlertDialogDescription>
            </AlertDialogHeader>
            <ResumenErrores errores={validacion.resumen} titulo={t('resumenErrores')} foco={validacion.foco} />
            {errorGeneral && (
              <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {errorGeneral}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="campo-titulo" className="font-medium">
                {t('tituloEtiqueta')}
              </label>
              <input
                id="campo-titulo"
                value={titulo}
                maxLength={TITULO_AVISO_MAX + 20}
                onChange={(e) => {
                  setTitulo(e.target.value);
                  validacion.limpiar('titulo');
                }}
                aria-invalid={m.titulo ? true : undefined}
                aria-describedby={describe('titulo', 'ayuda-titulo contador-titulo')}
                className={`${CAMPO} h-10`}
              />
              <p id="ayuda-titulo" className="text-sm text-muted-foreground">
                {t('tituloAyuda')}
              </p>
              <p id="contador-titulo" className="text-sm text-muted-foreground">
                {t('contador', { actual: titulo.trim().length, maximo: TITULO_AVISO_MAX })}
              </p>
              <MensajeErrorCampo id="campo-titulo-error" mensaje={m.titulo} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="campo-mensaje" className="font-medium">
                {t('mensajeEtiqueta')}
              </label>
              <textarea
                id="campo-mensaje"
                value={mensaje}
                rows={6}
                onChange={(e) => {
                  setMensaje(e.target.value);
                  validacion.limpiar('mensaje');
                }}
                aria-invalid={m.mensaje ? true : undefined}
                aria-describedby={describe('mensaje', 'contador-mensaje')}
                className={`${CAMPO} py-2`}
              />
              <p id="contador-mensaje" className="text-sm text-muted-foreground">
                {t('contador', { actual: mensaje.trim().length, maximo: MENSAJE_AVISO_MAX })}
              </p>
              <MensajeErrorCampo id="campo-mensaje-error" mensaje={m.mensaje} />
            </div>

            <fieldset id="campo-alcance" className="flex flex-col gap-2" aria-describedby={m.alcance ? 'campo-alcance-error' : undefined}>
              <legend className="mb-1 font-medium">{t('alcanceEtiqueta')}</legend>
              {(['todos', 'grupo', 'ministerio'] as const).map((a) => {
                const sinOpciones = opciones !== null && a !== 'todos' && (a === 'grupo' ? opciones.grupos : opciones.ministerios).length === 0;
                return (
                  <div key={a} className="flex flex-col">
                    <label className="flex min-h-9 items-center gap-2">
                      <input
                        type="radio"
                        name="alcance"
                        value={a}
                        checked={alcance === a}
                        disabled={sinOpciones}
                        aria-describedby={sinOpciones ? `sin-opciones-${a}` : undefined}
                        onChange={() => {
                          setAlcance(a);
                          setAlcanceId('');
                          setConteo(null);
                          setErrorConteo(null);
                          validacion.limpiar('alcance');
                          validacion.limpiar('alcanceId');
                        }}
                        className="size-4 accent-primary"
                      />
                      {t(a === 'todos' ? 'alcanceTodos' : a === 'grupo' ? 'alcanceGrupo' : 'alcanceMinisterio')}
                    </label>
                    {sinOpciones && (
                      <p id={`sin-opciones-${a}`} className="ml-6 text-sm text-muted-foreground">
                        {t(a === 'grupo' ? 'sinGrupos' : 'sinMinisterios')}
                      </p>
                    )}
                  </div>
                );
              })}
              <MensajeErrorCampo id="campo-alcance-error" mensaje={m.alcance} />
            </fieldset>

            {alcance !== 'todos' && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="campo-alcanceId" className="font-medium">
                  {t(alcance === 'grupo' ? 'grupoEtiqueta' : 'ministerioEtiqueta')}
                </label>
                <select
                  id="campo-alcanceId"
                  value={alcanceId}
                  onChange={(e) => {
                    setAlcanceId(e.target.value);
                    setConteo(null);
                    setErrorConteo(null);
                    validacion.limpiar('alcanceId');
                  }}
                  aria-invalid={m.alcanceId ? true : undefined}
                  aria-describedby={m.alcanceId ? 'campo-alcanceId-error' : undefined}
                  className={`${CAMPO} h-10 bg-background`}
                >
                  <option value="">{t('elegir')}</option>
                  {alcance === 'grupo'
                    ? (opciones?.grupos ?? []).map((g) => (
                        <option key={g.id} value={g.id}>
                          {t('opcionGrupo', { curso: g.curso, nombre: g.nombre })}
                        </option>
                      ))
                    : (opciones?.ministerios ?? []).map((mi) => (
                        <option key={mi.id} value={mi.id}>
                          {mi.nombre}
                        </option>
                      ))}
                </select>
                <MensajeErrorCampo id="campo-alcanceId-error" mensaje={m.alcanceId} />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="flex items-start gap-2 font-medium">
                <input type="checkbox" checked={importante} onChange={(e) => setImportante(e.target.checked)} className="mt-1 size-4 accent-primary" aria-describedby="advertencia-importante" />
                {t('importanteEtiqueta')}
              </label>
              <p id="advertencia-importante" className="ml-6 flex items-start gap-1.5 text-sm text-muted-foreground">
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {t('importanteAdvertencia')}
              </p>
            </div>

            <div aria-live="polite" className="flex flex-col gap-1 rounded-lg bg-muted p-3 text-sm">
              {contando ? (
                <span>{t('contando')}</span>
              ) : conteo && conteo.personas > 0 ? (
                <>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <Users aria-hidden="true" className="size-4" />
                    {t('conteo', { personas: conteo.personas })}
                  </span>
                  {importante && (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail aria-hidden="true" className="size-4" />
                      {t('conteoEmail', { conEmail: conteo.conEmail })}
                    </span>
                  )}
                </>
              ) : errorConteo ? (
                <span className="inline-flex items-center gap-1.5">
                  <AlertTriangle aria-hidden="true" className="size-4" />
                  {errorConteo}
                </span>
              ) : null}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancelar')}</AlertDialogCancel>
              <Button type="submit">{t('seguir')}</Button>
            </AlertDialogFooter>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <AlertDialogHeader>
              <AlertDialogTitle>{t('confirmarTitulo', { personas: conteo?.personas ?? 0 })}</AlertDialogTitle>
              <AlertDialogDescription>
                {importante ? `${t('confirmarEmail', { conEmail: conteo?.conEmail ?? 0 })} ` : ''}
                {t('confirmarDespues')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-1 rounded-lg border border-border p-3">
              <p className="font-semibold break-words">{titulo.trim()}</p>
              <p className="text-sm whitespace-pre-line break-words">{mensaje.trim()}</p>
            </div>
            <AlertDialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaso('editar')} disabled={enviando}>
                {t('volver')}
              </Button>
              <Button type="button" loading={enviando} onClick={() => void ejecutar()}>
                {enviando ? t('enviando') : t('mandar')}
              </Button>
            </AlertDialogFooter>
          </div>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
