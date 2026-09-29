'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CalendarClock, CalendarDays, CircleCheck, Info, Trash2 } from 'lucide-react';
import {
  apiFetch,
  ApiError,
  erroresPorCampo,
  formatearFechaLarga,
  hoyEnArgentina,
  MAX_PERSONAS_POR_GRUPO_VIDA_NUEVA,
  type BloqueoDisponibilidad,
  type ErrorCode,
  type Franja,
  type FranjaAgenda,
  type MiDisponibilidad,
} from '@vida-sobrenatural/shared-types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  ConfirmDestructiveDialog,
  EditorDeFranjas,
  MensajeErrorCampo,
  ResumenErrores,
  minutosAHHMM,
  useEnvio,
  useValidacionCampos,
  type EtiquetasEditorFranjas,
} from '@vida-sobrenatural/ui';

/** Del `campo` que devuelve la API al id del control en pantalla (`campo-…`, lo que enlaza ResumenErrores). */
const CAMPO_FRANJA_EN_PANTALLA: Record<string, string> = { diaSemana: 'franja-dia', inicio: 'franja-desde', fin: 'franja-hasta' };

const CLASE_CAMPO = 'h-11 rounded-md border border-input bg-transparent px-2 text-base font-normal sm:text-sm dark:bg-input/30';

/**
 * specs/004, Historia 4 (T039), a 360 px primero (FR-046): arriba, en
 * palabras, si hoy el Admin lo ve (FR-047); abajo, las cuatro cosas que lo
 * deciden, en el orden en que se cargan: horarios, disponibilidad, máximo por
 * Grupo y períodos. Cada acción devuelve `MiDisponibilidad` entera y la
 * pantalla la reemplaza: la frase de arriba nunca queda desfasada.
 */
export function MiDisponibilidadCliente({
  inicial,
  apiToken,
  puedeGestionar,
}: {
  inicial: MiDisponibilidad;
  apiToken: string;
  puedeGestionar: boolean;
}) {
  const t = useTranslations('miDisponibilidad');
  const tf = useTranslations('franjas');
  const te = useTranslations('errors');
  const locale = useLocale();
  const [datos, setDatos] = useState(inicial);

  const etiquetasFranjas: EtiquetasEditorFranjas = {
    dias: tf.raw('dias') as EtiquetasEditorFranjas['dias'],
    dia: tf('dia'),
    desde: tf('desde'),
    hasta: tf('hasta'),
    agregar: tf('agregar'),
    quitar: tf('quitar'),
    sinFranjas: t('agenda.vacio'),
    errorRango: t('errores.FRANJA_FIN_ANTERIOR_AL_INICIO'),
    separador: tf('separador'),
  };

  const fecha = (civil: string) => formatearFechaLarga(civil, locale);
  const textoFranja = (f: Franja) => `${etiquetasFranjas.dias[f.diaSemana]} ${minutosAHHMM(f.inicio)}${etiquetasFranjas.separador}${minutosAHHMM(f.fin)}`;

  /** Un code de campo de la API a su texto; si no tiene uno propio, el genérico (nunca solo "inválido"). */
  function mensajeDeCodigo(code: string): string {
    return t.has(`errores.${code}`) ? t(`errores.${code}`) : t('errores.generico');
  }

  /** Los errores que no son de un campo (sin permiso, red, etc.) van a un toast; la pantalla no cambia. */
  function avisarError(e: unknown) {
    toast.error(e instanceof ApiError ? te(e.code as ErrorCode) : te('ERROR_INTERNO'));
  }

  async function llamar(path: string, method: string, body?: unknown): Promise<MiDisponibilidad> {
    return apiFetch<MiDisponibilidad>(path, {
      method,
      headers: { Authorization: `Bearer ${apiToken}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  // ─── Horarios (FR-031) ────────────────────────────────────────────────
  const validacionFranja = useValidacionCampos();
  const [franjaABorrar, setFranjaABorrar] = useState<FranjaAgenda | null>(null);

  const { enviando: agregandoFranja, ejecutar: agregarFranja } = useEnvio(async (franja: Franja) => {
    try {
      setDatos(await llamar('/disponibilidad/me/franjas', 'POST', franja));
      validacionFranja.reset();
      toast(t('agenda.agregada'));
    } catch (e) {
      const campos = erroresPorCampo(e);
      if (campos) {
        validacionFranja.reemplazar(
          Object.fromEntries(campos.map(({ campo, code }) => [CAMPO_FRANJA_EN_PANTALLA[campo] ?? campo, mensajeDeCodigo(code)])),
        );
      } else {
        avisarError(e);
      }
    }
  });

  const { enviando: quitandoFranja, ejecutar: quitarFranja } = useEnvio(async (franja: FranjaAgenda) => {
    try {
      setDatos(await llamar(`/disponibilidad/me/franjas/${franja.id}`, 'DELETE'));
      toast(t('agenda.quitada'));
    } catch (e) {
      avisarError(e);
    }
  });

  /**
   * El editor (packages/ui) trabaja con la lista entera; la API, de a una
   * franja. Una más = agregar la última; una menos = la que falta, que se
   * confirma antes de borrar (acción destructiva, docs/15).
   */
  function onCambioFranjas(nuevas: Franja[]) {
    if (nuevas.length > datos.franjas.length) {
      void agregarFranja(nuevas[nuevas.length - 1]);
      return;
    }
    const indice = datos.franjas.findIndex((f, i) => nuevas[i] !== f);
    const quitada = datos.franjas[indice === -1 ? datos.franjas.length - 1 : indice];
    if (quitada) setFranjaABorrar(quitada);
  }

  // ─── Disponibilidad (FR-015) ─────────────────────────────────────────
  const { enviando: cambiandoToggle, ejecutar: cambiarToggle } = useEnvio(async (disponible: boolean) => {
    try {
      setDatos(await llamar('/disponibilidad/me', 'PUT', { disponible }));
      toast(disponible ? t('toggle.prendidaToast') : t('toggle.apagadaToast'));
    } catch (e) {
      avisarError(e);
    }
  });

  // ─── Máximo por Grupo (FR-045) ───────────────────────────────────────
  const validacionMaximo = useValidacionCampos();
  const [maximo, setMaximo] = useState(inicial.maxPersonasPorGrupo);

  const { enviando: guardandoMaximo, ejecutar: guardarMaximo } = useEnvio(async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    try {
      const nuevos = await llamar('/disponibilidad/me', 'PUT', { maxPersonasPorGrupo: maximo });
      setDatos(nuevos);
      validacionMaximo.reset();
      toast(t('maximo.guardado', { n: nuevos.maxPersonasPorGrupo }));
    } catch (e) {
      const campos = erroresPorCampo(e);
      if (campos) validacionMaximo.reemplazar(Object.fromEntries(campos.map(({ campo, code }) => [campo, mensajeDeCodigo(code)])));
      else avisarError(e);
    }
  });

  // ─── Períodos de no disponibilidad (FR-016, FR-017, FR-040) ──────────
  const validacionBloqueo = useValidacionCampos();
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const borrandoBloqueoRef = useRef(new Set<string>());
  const [borrandoBloqueoId, setBorrandoBloqueoId] = useState<string | null>(null);

  /** Las mismas reglas que la API (contracts/disponibilidad-api.md), para avisar antes de enviar. */
  function erroresDeBloqueo(valores: { desde: string; hasta: string }): Record<string, string> {
    const errores: Record<string, string> = {};
    if (!valores.desde) errores.desde = t('errores.desdeRequerido');
    if (!valores.hasta) errores.hasta = t('errores.hastaRequerido');
    else if (valores.desde && valores.hasta < valores.desde) errores.hasta = t('errores.BLOQUEO_FIN_ANTERIOR_AL_INICIO');
    else if (valores.hasta < hoyEnArgentina()) errores.hasta = t('errores.BLOQUEO_YA_VENCIDO');
    return errores;
  }

  function revalidarBloqueo(campo: 'desde' | 'hasta', valores: { desde: string; hasta: string }) {
    const mensaje = erroresDeBloqueo(valores)[campo];
    validacionBloqueo.revalidar(campo, valores[campo], { esValido: () => !mensaje, mensaje: mensaje ?? '' });
  }

  const { enviando: agregandoBloqueo, ejecutar: agregarBloqueo } = useEnvio(async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const locales = erroresDeBloqueo({ desde, hasta });
    if (Object.keys(locales).length > 0) {
      validacionBloqueo.reemplazar(locales);
      return;
    }
    try {
      setDatos(await llamar('/disponibilidad/me/bloqueos', 'POST', { desde, hasta }));
      validacionBloqueo.reset();
      setDesde('');
      setHasta('');
      toast(t('bloqueos.agregado'));
    } catch (e) {
      const campos = erroresPorCampo(e);
      if (campos) validacionBloqueo.reemplazar(Object.fromEntries(campos.map(({ campo, code }) => [campo, mensajeDeCodigo(code)])));
      else avisarError(e);
    }
  });

  async function borrarBloqueo(bloqueo: BloqueoDisponibilidad) {
    if (borrandoBloqueoRef.current.has(bloqueo.id)) return;
    borrandoBloqueoRef.current.add(bloqueo.id);
    setBorrandoBloqueoId(bloqueo.id);
    try {
      setDatos(await llamar(`/disponibilidad/me/bloqueos/${bloqueo.id}`, 'DELETE'));
      toast(t('bloqueos.borrado'));
    } catch (e) {
      avisarError(e);
    } finally {
      borrandoBloqueoRef.current.delete(bloqueo.id);
      setBorrandoBloqueoId(null);
    }
  }

  // ─── La frase de arriba (FR-047) ─────────────────────────────────────
  // Con bloqueo vigente, la API siempre lo incluye en `bloqueos` (vigente = hasta >= hoy).
  const bloqueoVigente = datos.bloqueos.find((b) => b.vigente);
  let frase: string;
  if (datos.porQueNo === null) frase = t('estado.aparece');
  else if (datos.porQueNo === 'bloqueo_vigente')
    frase = t('estado.bloqueo_vigente', { desde: bloqueoVigente ? fecha(bloqueoVigente.desde) : '', hasta: bloqueoVigente ? fecha(bloqueoVigente.hasta) : '' });
  else frase = t(`estado.${datos.porQueNo}`);
  const IconoEstado = datos.apareceEnElCruce ? CircleCheck : Info;
  const bloqueado = !puedeGestionar;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8 sm:py-16">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
        <p className="text-muted-foreground">{t('intro')}</p>
        <p
          role="status"
          data-testid="estado-disponibilidad"
          className={`flex items-start gap-3 rounded-lg border p-4 ${datos.apareceEnElCruce ? 'border-success text-success' : 'border-border bg-card text-card-foreground'}`}
        >
          <IconoEstado className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <span className="font-medium">{frase}</span>
        </p>
      </div>

      <section aria-labelledby="titulo-agenda" className="flex flex-col gap-3">
        <h2 id="titulo-agenda" className="text-xl font-medium">
          {t('agenda.titulo')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('agenda.ayuda')}</p>
        {/* Los resúmenes aparecen recién al primer intento de envío (`foco` > 0): ResumenErrores se
            enfoca al montarse, y montado por una validación al salir del campo le robaba el foco
            (y corría el botón bajo el dedo) — justo lo que H-72 quiere evitar. */}
        {validacionFranja.foco > 0 && <ResumenErrores errores={validacionFranja.resumen} titulo={t('errores.resumen')} foco={validacionFranja.foco} />}
        <EditorDeFranjas
          idBase="campo-franja"
          value={datos.franjas}
          onChange={onCambioFranjas}
          etiquetas={etiquetasFranjas}
          disabled={bloqueado || quitandoFranja}
          enviando={agregandoFranja}
          onErrorChange={(error) => (error ? validacionFranja.reemplazar({ 'franja-hasta': error }) : validacionFranja.reset())}
        />
      </section>

      <section aria-labelledby="titulo-toggle" className="flex flex-col gap-3">
        <h2 id="titulo-toggle" className="text-xl font-medium">
          {t('toggle.titulo')}
        </h2>
        <p className="flex items-start gap-2" data-testid="estado-toggle">
          {datos.disponible ? (
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
          ) : (
            <Info className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <span>{datos.disponible ? t('toggle.prendida') : t('toggle.apagada')}</span>
        </p>
        <p className="text-sm text-muted-foreground">{t('toggle.ayuda')}</p>
        <Button
          type="button"
          // Una sola acción principal por pantalla: prender es LA acción
          // cuando ya hay horarios y falta solo eso (porQueNo = toggle_apagado).
          variant={datos.porQueNo === 'toggle_apagado' ? 'default' : 'outline'}
          className="h-11 w-full sm:w-auto sm:self-start"
          disabled={bloqueado}
          loading={cambiandoToggle}
          loadingText={datos.disponible ? t('toggle.apagando') : t('toggle.prendiendo')}
          onClick={() => void cambiarToggle(!datos.disponible)}
        >
          {datos.disponible ? t('toggle.apagar') : t('toggle.prender')}
        </Button>
      </section>

      <section aria-labelledby="titulo-maximo" className="flex flex-col gap-3">
        <h2 id="titulo-maximo" className="text-xl font-medium">
          {t('maximo.titulo')}
        </h2>
        {validacionMaximo.foco > 0 && <ResumenErrores errores={validacionMaximo.resumen} titulo={t('errores.resumen')} foco={validacionMaximo.foco} />}
        <form noValidate onSubmit={(e) => void guardarMaximo(e)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1 text-sm font-medium">
            <label htmlFor="campo-maxPersonasPorGrupo">{t('maximo.etiqueta')}</label>
            <span id="ayuda-maxPersonasPorGrupo" className="font-normal text-muted-foreground">
              {t('maximo.ayuda')}
            </span>
            <select
              id="campo-maxPersonasPorGrupo"
              value={maximo}
              disabled={bloqueado}
              aria-invalid={validacionMaximo.mensajes.maxPersonasPorGrupo ? true : undefined}
              aria-describedby={`ayuda-maxPersonasPorGrupo${validacionMaximo.mensajes.maxPersonasPorGrupo ? ' error-maxPersonasPorGrupo' : ''}`}
              onChange={(e) => {
                setMaximo(Number(e.target.value));
                validacionMaximo.limpiar('maxPersonasPorGrupo');
              }}
              className={CLASE_CAMPO}
            >
              {Array.from({ length: MAX_PERSONAS_POR_GRUPO_VIDA_NUEVA }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {t('maximo.opcion', { n })}
                </option>
              ))}
            </select>
            <MensajeErrorCampo id="error-maxPersonasPorGrupo" mensaje={validacionMaximo.mensajes.maxPersonasPorGrupo} />
          </div>
          <Button type="submit" variant="outline" className="h-11 w-full sm:w-auto" disabled={bloqueado} loading={guardandoMaximo} loadingText={t('maximo.guardando')}>
            {t('maximo.guardar')}
          </Button>
        </form>
      </section>

      <section aria-labelledby="titulo-bloqueos" className="flex flex-col gap-3">
        <h2 id="titulo-bloqueos" className="text-xl font-medium">
          {t('bloqueos.titulo')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('bloqueos.ayuda')}</p>
        {datos.bloqueos.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('bloqueos.vacio')}</p>
        ) : (
          <ul className="flex flex-col gap-2" aria-label={t('bloqueos.titulo')}>
            {datos.bloqueos.map((b) => {
              const rango = { desde: fecha(b.desde), hasta: fecha(b.hasta) };
              return (
                <li key={b.id} className="flex flex-col gap-2 rounded-md border border-border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <span>{t('bloqueos.rango', rango)}</span>
                    <span className="flex items-center gap-1.5 font-medium">
                      {b.vigente ? <CalendarClock className="size-4" aria-hidden="true" /> : <CalendarDays className="size-4" aria-hidden="true" />}
                      {b.vigente ? t('bloqueos.vigente') : t('bloqueos.proximo')}
                    </span>
                  </div>
                  <ConfirmDestructiveDialog
                    trigger={
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-full sm:w-auto"
                        disabled={bloqueado}
                        loading={borrandoBloqueoId === b.id}
                        aria-label={`${t('bloqueos.borrar')}: ${t('bloqueos.rango', rango)}`}
                      >
                        <Trash2 aria-hidden="true" />
                        {t('bloqueos.borrar')}
                      </Button>
                    }
                    titulo={t('bloqueos.confirmarTitulo', rango)}
                    descripcion={t('bloqueos.confirmarDescripcion')}
                    textoConfirmar={t('bloqueos.confirmarBoton')}
                    textoCancelar={t('bloqueos.volver')}
                    onConfirmar={() => void borrarBloqueo(b)}
                  />
                </li>
              );
            })}
          </ul>
        )}

        <h3 className="text-lg font-medium">{t('bloqueos.nuevo')}</h3>
        {validacionBloqueo.foco > 0 && <ResumenErrores errores={validacionBloqueo.resumen} titulo={t('errores.resumen')} foco={validacionBloqueo.foco} />}
        <form noValidate onSubmit={(e) => void agregarBloqueo(e)} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
          {(['desde', 'hasta'] as const).map((campo) => {
            const error = validacionBloqueo.mensajes[campo];
            const valor = campo === 'desde' ? desde : hasta;
            return (
              <div key={campo} className="flex flex-col gap-1 text-sm font-medium">
                <label htmlFor={`campo-${campo}`}>{t(`bloqueos.${campo}`)}</label>
                <input
                  id={`campo-${campo}`}
                  type="date"
                  value={valor}
                  disabled={bloqueado}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `error-${campo}` : undefined}
                  onChange={(e) => {
                    if (campo === 'desde') setDesde(e.target.value);
                    else setHasta(e.target.value);
                    validacionBloqueo.limpiar(campo);
                  }}
                  onBlur={(e) => revalidarBloqueo(campo, { desde, hasta, [campo]: e.target.value })}
                  className={CLASE_CAMPO}
                />
                <MensajeErrorCampo id={`error-${campo}`} mensaje={error} />
              </div>
            );
          })}
          <Button
            type="submit"
            variant="outline"
            className="h-11 w-full sm:mt-6 sm:w-auto"
            disabled={bloqueado}
            loading={agregandoBloqueo}
            loadingText={t('bloqueos.agregando')}
          >
            {t('bloqueos.agregar')}
          </Button>
        </form>
      </section>

      <AlertDialog open={franjaABorrar !== null} onOpenChange={(abierto) => !abierto && setFranjaABorrar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{franjaABorrar ? t('agenda.confirmarTitulo', { franja: textoFranja(franjaABorrar) }) : ''}</AlertDialogTitle>
            <AlertDialogDescription>{t('agenda.confirmarDescripcion')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('agenda.volver')}</AlertDialogCancel>
            {/* Sin variant="destructive": en oscuro, sobre el pie del diálogo, da 3.48:1 (axe). Mismo botón que ConfirmDestructiveDialog. */}
            <AlertDialogAction
              onClick={() => {
                const franja = franjaABorrar;
                setFranjaABorrar(null);
                if (franja) void quitarFranja(franja);
              }}
            >
              <Trash2 aria-hidden="true" />
              {t('agenda.confirmarBoton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
