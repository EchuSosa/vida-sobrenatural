'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { UserRound } from 'lucide-react';
import {
  apiFetch,
  COMPROBANTE_TAMANO_MAXIMO_BYTES,
  diaCivilEnArgentina,
  formatearFechaHora,
  MEDIOS_PAGO,
  MIME_TIPOS_COMPROBANTE_PERMITIDOS,
  type BusquedaPersona,
  type EstadoInscripcionEvento,
  type EventoDetalle,
  type InscripcionEventoResumen,
  type MedioPago,
  type ResultadoAprobarLote,
} from '@vida-sobrenatural/shared-types';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  ButtonLink,
  CampoArchivo,
  CampoFecha,
  ConfirmDestructiveDialog,
  EstadoInscripcionBadge,
  Input,
  MensajeErrorCampo,
  ResumenErrores,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  TablaDatos,
  mensajeDeError,
  mensajesDeCampo,
  useEnvio,
  useValidacionCampos,
  type ColumnaTabla,
} from '@vida-sobrenatural/ui';

/**
 * spec 011, T074 (FR-025 a FR-027, docs/15 §Backoffice) — la tabla de
 * inscriptos de una pestaña: estado y pago con texto + ícono, "falta el
 * pago, hace N días", "subió desde la lista" con "Ya le avisé", selección y
 * "Aprobar seleccionadas" con resumen, rechazar con motivo opcional, dar de
 * baja (neutro, D151), "Registrar pago" en nombre (FR-036) y "Anotar a una
 * Persona" con su nombre visible durante toda la acción.
 */
export function InscriptosCliente({
  evento,
  estado,
  inscripciones,
  apiToken,
  puedeGestionar,
  puedeVerificar,
}: {
  evento: EventoDetalle;
  estado: EstadoInscripcionEvento;
  inscripciones: InscripcionEventoResumen[];
  apiToken: string;
  puedeGestionar: boolean;
  puedeVerificar: boolean;
}) {
  const t = useTranslations('eventos.inscriptos');
  const te = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const [elegidas, setElegidas] = useState<Set<string>>(new Set());
  const [rechazando, setRechazando] = useState<InscripcionEventoResumen | null>(null);
  const [pagoDe, setPagoDe] = useState<InscripcionEventoResumen | null>(null);
  const auth = { Authorization: `Bearer ${apiToken}` };
  const conLote = puedeGestionar && estado === 'pendiente' && inscripciones.length > 0;
  const [ahora] = useState(() => Date.now());
  const empezo = new Date(evento.inicio).getTime() <= ahora;

  async function accion(ruta: string, ok: string, body?: object) {
    try {
      await apiFetch(ruta, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });
      toast(ok);
      router.refresh();
    } catch (e) {
      toast.error(mensajeDeError(e, te, t));
    }
  }

  const aprobarLote = useEnvio(async () => {
    try {
      const r = await apiFetch<ResultadoAprobarLote>(`/eventos/${evento.id}/inscripciones/aprobar-lote`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...elegidas] }),
      });
      toast(t('loteResumen', { aprobadas: r.aprobadas.length, fallidas: r.fallidas.length }));
      setElegidas(new Set());
      router.refresh();
    } catch (e) {
      toast.error(mensajeDeError(e, te, t));
    }
  });

  const nombre = (i: InscripcionEventoResumen) => `${i.persona.nombre} ${i.persona.apellido}`;

  const columnas: ColumnaTabla<InscripcionEventoResumen>[] = [
    ...(conLote
      ? [
          {
            id: 'seleccionar',
            encabezado: t('columnas.seleccionar'),
            celda: (i: InscripcionEventoResumen) => (
              <input
                type="checkbox"
                className="size-4"
                aria-label={t('seleccionar', { nombre: nombre(i) })}
                checked={elegidas.has(i.id)}
                onChange={(e) =>
                  setElegidas((a) => {
                    const n = new Set(a);
                    if (e.target.checked) n.add(i.id);
                    else n.delete(i.id);
                    return n;
                  })
                }
              />
            ),
          },
        ]
      : []),
    {
      id: 'persona',
      encabezado: t('columnas.persona'),
      celda: (i) => (
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">{nombre(i)}</span>
          {!i.persona.tieneAcceso && <span className="text-xs text-muted-foreground">{t('sinAcceso')}</span>}
          {i.creadoPor && <span className="text-xs text-muted-foreground">{t('anotadaPor', { nombre: `${i.creadoPor.nombre} ${i.creadoPor.apellido}` })}</span>}
          {i.promovidaSinVer && <span className="text-xs font-medium">{t('subioDeLista')}</span>}
        </span>
      ),
    },
    {
      id: 'estado',
      encabezado: t('columnas.estado'),
      celda: (i) => <EstadoInscripcionBadge estado={i.estado} texto={t(`estadoFila.${i.estado}`, { posicion: i.posicionEnLista ?? 0 })} className="text-sm" />,
    },
    {
      id: 'pago',
      encabezado: t('columnas.pago'),
      className: 'hidden md:table-cell',
      celda: (i) =>
        i.estadoPago === 'no_aplica' || i.estado !== 'confirmada' ? (
          '—'
        ) : (
          <span className="flex flex-col gap-0.5">
            <EstadoInscripcionBadge estado={i.estadoPago} texto={t(`pago.${i.estadoPago}`)} className="text-sm" />
            {i.diasSinPago !== null && <span className="text-xs text-muted-foreground">{t('faltaPago', { dias: i.diasSinPago })}</span>}
          </span>
        ),
    },
    { id: 'fecha', encabezado: t('columnas.fecha'), className: 'hidden lg:table-cell', celda: (i) => formatearFechaHora(i.createdAt, locale) },
  ];

  return (
    <div className="flex flex-col gap-4">
      {puedeGestionar && !empezo && evento.estado === 'publicado' && <AnotarPersona evento={evento} apiToken={apiToken} />}
      {conLote && (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setElegidas(new Set(inscripciones.map((i) => i.id)))}>
            {t('seleccionarTodas')}
          </Button>
          <Button disabled={elegidas.size === 0} loading={aprobarLote.enviando} loadingText={t('aprobando')} onClick={() => void aprobarLote.ejecutar()}>
            {t('aprobarLote', { cantidad: elegidas.size })}
          </Button>
        </div>
      )}
      <TablaDatos
        columnas={columnas}
        datos={inscripciones}
        obtenerId={(i) => i.id}
        etiqueta={t(`estados.${estado}`)}
        mensajeVacio={t('vacio')}
        encabezadoAcciones={t('columnas.acciones')}
        acciones={
          puedeGestionar || puedeVerificar
            ? (i) => (
                <div className="flex flex-wrap justify-end gap-2">
                  {puedeGestionar && i.estado === 'pendiente' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => void accion(`/inscripciones-evento/${i.id}/aprobar`, t('aprobada'))}>
                        {t('aprobar')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRechazando(i)}>
                        {t('rechazar')}
                      </Button>
                    </>
                  )}
                  {puedeGestionar && i.promovidaSinVer && (
                    <Button size="sm" variant="outline" onClick={() => void accion(`/inscripciones-evento/${i.id}/promocion-vista`, t('yaLeAvise'))}>
                      {t('yaLeAvise')}
                    </Button>
                  )}
                  {puedeVerificar && i.pagoPendienteId && (
                    <ButtonLink size="sm" variant="outline" render={<Link href={`/solicitudes/pago/${i.pagoPendienteId}`} />}>
                      {t('verificarPago')}
                    </ButtonLink>
                  )}
                  {puedeVerificar && i.estado === 'confirmada' && i.estadoPago === 'sin_pago' && (
                    <Button size="sm" variant="outline" onClick={() => setPagoDe(i)}>
                      {t('registrarPago')}
                    </Button>
                  )}
                  {puedeGestionar && (i.estado === 'confirmada' || i.estado === 'pendiente' || i.estado === 'lista_espera') && (
                    <ConfirmDestructiveDialog
                      tono="neutro"
                      trigger={
                        <Button size="sm" variant="outline">
                          {t('darDeBaja')}
                        </Button>
                      }
                      titulo={t('darDeBajaTitulo', { nombre: nombre(i) })}
                      descripcion={t('darDeBajaTexto')}
                      textoConfirmar={t('darDeBajaSi')}
                      textoCancelar={t('volver')}
                      onConfirmar={() => void accion(`/inscripciones-evento/${i.id}/dar-de-baja`, t('dadaDeBaja'))}
                    />
                  )}
                </div>
              )
            : undefined
        }
      />
      {rechazando && <RechazarInscripcion inscripcion={rechazando} onCerrar={() => setRechazando(null)} onRechazar={(motivo) => accion(`/inscripciones-evento/${rechazando.id}/rechazar`, t('rechazada'), { motivo })} />}
      {pagoDe && <RegistrarPago inscripcion={pagoDe} costo={evento.costo} apiToken={apiToken} onCerrar={() => setPagoDe(null)} />}
    </div>
  );
}

function RechazarInscripcion({
  inscripcion,
  onCerrar,
  onRechazar,
}: {
  inscripcion: InscripcionEventoResumen;
  onCerrar: () => void;
  onRechazar: (motivo: string) => Promise<void>;
}) {
  const t = useTranslations('eventos.inscriptos');
  const [motivo, setMotivo] = useState('');
  const enviar = useEnvio(async () => {
    await onRechazar(motivo);
    onCerrar();
  });
  return (
    <AlertDialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <AlertDialogContent data-tono="neutro">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('rechazarTitulo', { nombre: `${inscripcion.persona.nombre} ${inscripcion.persona.apellido}` })}</AlertDialogTitle>
          <AlertDialogDescription>{t('rechazarTexto')}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-1">
          <label htmlFor="campo-motivo-rechazo" className="text-sm font-medium">
            {t('motivo')}
          </label>
          <p id="campo-motivo-rechazo-ayuda" className="text-sm text-muted-foreground">
            {t('motivoAyuda')}
          </p>
          <textarea
            id="campo-motivo-rechazo"
            rows={3}
            maxLength={500}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            aria-describedby="campo-motivo-rechazo-ayuda"
            className="rounded-md border border-input bg-transparent px-3 py-2 text-sm dark:bg-input/30"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('volver')}</AlertDialogCancel>
          <Button loading={enviar.enviando} onClick={() => void enviar.ejecutar()}>
            {t('rechazarSi')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** FR-036: el Admin registra un pago en nombre de la Persona; queda verificado; comprobante opcional. */
function RegistrarPago({ inscripcion, costo, apiToken, onCerrar }: { inscripcion: InscripcionEventoResumen; costo: string | null; apiToken: string; onCerrar: () => void }) {
  const t = useTranslations('eventos.pagos');
  const tf = useTranslations('campoFecha');
  const te = useTranslations('errors');
  const router = useRouter();
  const [monto, setMonto] = useState(costo ? String(Number(costo)) : '');
  const [medio, setMedio] = useState<MedioPago>('efectivo');
  const [fecha, setFecha] = useState(() => diaCivilEnArgentina(new Date()));
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const v = useValidacionCampos();
  const nombre = `${inscripcion.persona.nombre} ${inscripcion.persona.apellido}`;

  const enviar = useEnvio(async () => {
    setErrorGeneral(null);
    const e: Record<string, string> = {};
    if (!(Number(monto.replace(',', '.')) > 0)) e.monto = t('errorMonto');
    if (!fecha) e.fechaPago = t('errorFecha');
    if (archivo && (!MIME_TIPOS_COMPROBANTE_PERMITIDOS.includes(archivo.type as (typeof MIME_TIPOS_COMPROBANTE_PERMITIDOS)[number]) || archivo.size > COMPROBANTE_TAMANO_MAXIMO_BYTES)) {
      e.comprobante = te('COMPROBANTE_TIPO_INVALIDO');
    }
    if (Object.keys(e).length) {
      v.reemplazar(e);
      return;
    }
    const datos = new FormData();
    datos.append('monto', monto.replace(',', '.'));
    datos.append('medio', medio);
    datos.append('fechaPago', fecha);
    if (archivo) datos.append('comprobante', archivo);
    try {
      await apiFetch(`/inscripciones-evento/${inscripcion.id}/pagos/en-nombre`, { method: 'POST', headers: { Authorization: `Bearer ${apiToken}` }, body: datos });
      toast(t('registrado'));
      onCerrar();
      router.refresh();
    } catch (error) {
      const campos = mensajesDeCampo(error, te, t);
      if (campos) v.reemplazar(campos);
      else setErrorGeneral(mensajeDeError(error, te, t));
    }
  });

  return (
    <Sheet open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <SheetContent side="right" etiquetaCerrar={t('cerrarPanel')} className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('registrarTitulo', { nombre })}</SheetTitle>
          <SheetDescription>{t('registrarDescripcion')}</SheetDescription>
        </SheetHeader>
        <form
          noValidate
          className="flex flex-col gap-4 px-4 pb-6"
          onSubmit={(ev) => {
            ev.preventDefault();
            void enviar.ejecutar();
          }}
        >
          {errorGeneral && (
            <p role="alert" className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm">
              {errorGeneral}
            </p>
          )}
          <ResumenErrores errores={v.resumen} foco={v.foco} />
          <div className="flex flex-col gap-1">
            <label htmlFor="campo-monto" className="text-sm font-medium">
              {t('monto')}
            </label>
            <input
              id="campo-monto"
              inputMode="decimal"
              value={monto}
              onChange={(ev) => {
                setMonto(ev.target.value);
                v.limpiar('monto');
              }}
              aria-invalid={v.mensajes.monto ? true : undefined}
              aria-describedby={v.mensajes.monto ? 'campo-monto-error' : undefined}
              className="h-10 w-40 rounded-md border border-input bg-transparent px-3 text-sm aria-invalid:border-destructive dark:bg-input/30"
            />
            <MensajeErrorCampo id="campo-monto-error" mensaje={v.mensajes.monto} />
          </div>
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-sm font-medium">{t('medio')}</legend>
            <div className="flex flex-wrap gap-4">
              {MEDIOS_PAGO.map((mp, i) => (
                <label key={mp} className="flex min-h-10 items-center gap-2 text-sm">
                  <input id={i === 0 ? 'campo-medio' : undefined} type="radio" name="medio-admin" className="size-4" checked={medio === mp} onChange={() => setMedio(mp)} />
                  {t(`medios.${mp}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <CampoFecha
            id="campo-fechaPago"
            etiqueta={t('fecha')}
            value={fecha}
            onChange={(f) => {
              setFecha(f);
              v.limpiar('fechaPago');
            }}
            etiquetas={{ dia: tf('dia'), mes: tf('mes'), anio: tf('anio'), meses: tf.raw('meses') as string[] }}
            error={Boolean(v.mensajes.fechaPago)}
            idError="campo-fechaPago-error"
          />
          <MensajeErrorCampo id="campo-fechaPago-error" mensaje={v.mensajes.fechaPago} />
          <CampoArchivo
            id="campo-comprobante"
            etiqueta={t('archivo')}
            ayuda={t('archivoAyuda')}
            textoBoton={t('elegir')}
            textoSinArchivo={t('sinArchivo')}
            accept={MIME_TIPOS_COMPROBANTE_PERMITIDOS.join(',')}
            archivo={archivo}
            onElegir={(f) => {
              setArchivo(f);
              v.limpiar('comprobante');
            }}
            error={v.mensajes.comprobante}
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={enviar.enviando} loadingText={t('registrando')}>
              {t('registrar')}
            </Button>
            <Button type="button" variant="outline" onClick={onCerrar}>
              {t('volver')}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/** FR-027: anotar a una Persona (con el buscador de Personas), con su nombre visible durante toda la acción. */
function AnotarPersona({ evento, apiToken }: { evento: EventoDetalle; apiToken: string }) {
  const t = useTranslations('eventos.inscriptos');
  const te = useTranslations('errors');
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<BusquedaPersona[] | null>(null);
  const [elegida, setElegida] = useState<BusquedaPersona | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) return;
    let vigente = true;
    const id = setTimeout(() => {
      apiFetch<BusquedaPersona[]>(`/personas/buscar?q=${encodeURIComponent(q.trim())}`, { headers: { Authorization: `Bearer ${apiToken}` } })
        .then((r) => vigente && setResultados(r))
        .catch(() => vigente && setResultados([]));
    }, 300);
    return () => {
      vigente = false;
      clearTimeout(id);
    };
  }, [q, apiToken]);

  const anotar = useEnvio(async () => {
    if (!elegida) return;
    setError(null);
    try {
      const r = await apiFetch<InscripcionEventoResumen>(`/eventos/${evento.id}/inscripciones`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId: elegida.id }),
      });
      toast(t('anotada', { nombre: `${elegida.nombre} ${elegida.apellido}`, estado: t(`estadoFila.${r.estado}`, { posicion: r.posicionEnLista ?? 0 }) }));
      setAbierto(false);
      setElegida(null);
      setQ('');
      setResultados(null);
      router.refresh();
    } catch (e) {
      setError(mensajeDeError(e, te, t));
    }
  });

  return (
    <>
      <Button variant="outline" className="w-fit" onClick={() => setAbierto(true)}>
        <UserRound aria-hidden="true" />
        {t('anotar')}
      </Button>
      <Sheet open={abierto} onOpenChange={setAbierto}>
        <SheetContent side="right" etiquetaCerrar={t('cerrarPanel')} className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{elegida ? t('estasAnotando', { nombre: `${elegida.nombre} ${elegida.apellido}` }) : t('anotarTitulo')}</SheetTitle>
            <SheetDescription>{t('anotarDescripcion')}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 pb-6">
            {error && (
              <p role="alert" className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm">
                {error}
              </p>
            )}
            {elegida ? (
              <>
                <p className="flex items-center gap-2 rounded-md bg-secondary p-3 text-sm font-medium">
                  <UserRound className="size-4" aria-hidden="true" />
                  {t('estasAnotando', { nombre: `${elegida.nombre} ${elegida.apellido}` })}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button loading={anotar.enviando} loadingText={t('anotando')} onClick={() => void anotar.ejecutar()}>
                    {t('anotarSi')}
                  </Button>
                  <Button variant="outline" onClick={() => setElegida(null)}>
                    {t('cambiar')}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <label htmlFor="buscar-persona-evento" className="text-sm font-medium">
                  {t('buscar')}
                </label>
                <p id="buscar-persona-evento-ayuda" className="text-sm text-muted-foreground">
                  {t('buscarAyuda')}
                </p>
                <Input id="buscar-persona-evento" value={q} onChange={(e) => setQ(e.target.value)} aria-describedby="buscar-persona-evento-ayuda" autoComplete="off" />
                {q.trim().length >= 2 && resultados && (
                  <ul className="flex flex-col gap-1" aria-live="polite">
                    {resultados.length === 0 ? (
                      <li className="text-sm text-muted-foreground">{t('sinResultados', { q: q.trim() })}</li>
                    ) : (
                      resultados.map((p) => (
                        <li key={p.id}>
                          <button type="button" className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring" onClick={() => setElegida(p)}>
                            {p.nombre} {p.apellido}
                            {!p.email && <span className="text-muted-foreground"> · {t('sinAcceso')}</span>}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
