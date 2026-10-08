'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CircleAlert, CircleCheckBig, Clock, LockKeyhole, LockKeyholeOpen, Plus, UserRoundX } from 'lucide-react';
import {
  NOMBRE_EDICION_MAX,
  SEMANAS_MAX,
  SEMANAS_MIN,
  ApiError,
  apiFetch,
  cronogramaPropuesto,
  erroresPorCampo,
  formatearDiaEnArgentina,
  hoyEnArgentina,
  type EdicionAdminResumen,
  type Pagina,
} from '@vida-sobrenatural/shared-types';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Input,
  MensajeErrorCampo,
  Paginacion,
  ResumenErrores,
  TablaDatos,
  useEnvio,
  type ColumnaTabla,
} from '@vida-sobrenatural/ui';
import { useControlesTablaUrl } from '../../../hooks/use-controles-tabla-url';

/**
 * spec 008, T019 (FR-002, FR-003, FR-006, FR-038, docs/15 "Alta en modal"):
 * las ediciones de Vida de Servicio. Filtros y página en la URL (H-88,
 * H-101); los pendientes y el estado de la inscripción con texto + ícono
 * (D81). En celular quedan la edición, lo pendiente y "Ver" (docs/15). Una
 * sola acción principal: "Crear una edición".
 */
export function EdicionesCliente({
  pagina,
  paginaActual,
  totalPaginas,
  estado,
  pendiente,
  puedeGestionar,
  sedes,
  lideres,
  apiToken,
}: {
  pagina: Pagina<EdicionAdminResumen>;
  paginaActual: number;
  totalPaginas: number;
  estado: 'en_curso' | 'finalizado';
  pendiente: 'finalizacion' | 'baja' | null;
  puedeGestionar: boolean;
  sedes: Array<{ id: string; nombre: string }>;
  lideres: Array<{ id: string; nombre: string; apellido: string }>;
  apiToken: string;
}) {
  const t = useTranslations('edicionesServicio');
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { actualizarParams } = useControlesTablaUrl();
  const fecha = (iso: string) => formatearDiaEnArgentina(iso, locale);

  function hrefPagina(n: number): string {
    const params = new URLSearchParams(searchParams);
    if (n <= 1) params.delete('pagina');
    else params.set('pagina', String(n));
    return `${pathname}?${params.toString()}`;
  }

  const columnas: ColumnaTabla<EdicionAdminResumen>[] = [
    { id: 'nombre', encabezado: t('tabla.nombre'), celda: (e) => <span className="font-medium break-words">{e.nombre}</span> },
    { id: 'inicio', encabezado: t('tabla.inicio'), className: 'hidden sm:table-cell', celda: (e) => fecha(e.fechaInicio) },
    { id: 'sede', encabezado: t('tabla.sede'), className: 'hidden md:table-cell', celda: (e) => e.sede },
    { id: 'lideres', encabezado: t('tabla.lideres'), className: 'hidden md:table-cell', celda: (e) => e.lideres.map((l) => `${l.nombre} ${l.apellido}`).join(', ') },
    {
      id: 'inscriptos',
      encabezado: t('tabla.inscriptos'),
      className: 'hidden sm:table-cell',
      celda: (e) => (
        <span className="flex flex-col">
          {e.inscriptosActivos}
          {e.conAlertaDeFaltas > 0 && (
            <span className="flex items-center gap-1 text-sm">
              <CircleAlert aria-hidden className="size-4 text-primary" />
              {t('tabla.conAlerta', { cantidad: e.conAlertaDeFaltas })}
            </span>
          )}
        </span>
      ),
    },
    {
      id: 'inscripcion',
      encabezado: t('tabla.inscripcion'),
      className: 'hidden lg:table-cell',
      celda: (e) =>
        e.estado === 'finalizado' ? (
          <span className="inline-flex items-center gap-1.5">
            <CircleCheckBig aria-hidden className="size-4" />
            {t('tabla.terminada')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            {e.inscripcionAbierta ? <LockKeyholeOpen aria-hidden className="size-4" /> : <LockKeyhole aria-hidden className="size-4" />}
            {e.inscripcionAbierta ? t('tabla.abierta') : t('tabla.cerrada')}
          </span>
        ),
    },
    {
      id: 'pendiente',
      encabezado: t('tabla.pendiente'),
      celda: (e) =>
        !e.pendientes.finalizacion && e.pendientes.bajas === 0 ? (
          <span className="text-muted-foreground">{t('tabla.nadaPendiente')}</span>
        ) : (
          <ul className="flex flex-col gap-1">
            {e.pendientes.finalizacion && (
              <li className="flex items-center gap-1.5">
                <CircleCheckBig aria-hidden className="size-4 shrink-0" />
                {t('tabla.pideCerrar')}
              </li>
            )}
            {e.pendientes.bajas > 0 && (
              <li className="flex items-center gap-1.5">
                <UserRoundX aria-hidden className="size-4 shrink-0" />
                {t('tabla.bajas', { cantidad: e.pendientes.bajas })}
              </li>
            )}
          </ul>
        ),
    },
  ];

  const mensajeVacio = pendiente ? t('tabla.vacioFiltro') : estado === 'finalizado' ? t('tabla.vacioFinalizados') : t('tabla.vacio');

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
          <p className="text-muted-foreground">{t('descripcion')}</p>
        </div>
        {puedeGestionar && <CrearEdicion sedes={sedes} lideres={lideres} apiToken={apiToken} />}
      </header>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('filtros.estado')}>
          <span className="text-sm font-medium">{t('filtros.estado')}:</span>
          <Button size="lg" variant={estado === 'en_curso' ? 'default' : 'outline'} aria-pressed={estado === 'en_curso'} onClick={() => actualizarParams({ estado: null, pendiente: null, pagina: null })}>
            <Clock aria-hidden />
            {t('filtros.enCurso')}
          </Button>
          <Button size="lg" variant={estado === 'finalizado' ? 'default' : 'outline'} aria-pressed={estado === 'finalizado'} onClick={() => actualizarParams({ estado: 'finalizado', pendiente: null, pagina: null })}>
            <CircleCheckBig aria-hidden />
            {t('filtros.finalizados')}
          </Button>
        </div>
        {estado === 'en_curso' && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('filtros.pendiente')}>
            <span className="text-sm font-medium">{t('filtros.pendiente')}:</span>
            {([null, 'finalizacion', 'baja'] as const).map((f) => (
              <Button key={f ?? 'todos'} size="lg" variant={pendiente === f ? 'default' : 'outline'} aria-pressed={pendiente === f} onClick={() => actualizarParams({ pendiente: f, pagina: null })}>
                {f ? t(`filtros.${f}`) : t('filtros.todos')}
              </Button>
            ))}
          </div>
        )}
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t('tabla.resultados', { cantidad: pagina.total })}
        </p>
      </div>

      <TablaDatos
        columnas={columnas}
        datos={pagina.items}
        obtenerId={(e) => e.grupoId}
        etiqueta={t('tabla.etiqueta')}
        mensajeVacio={mensajeVacio}
        encabezadoAcciones={t('tabla.acciones')}
        acciones={(e) => (
          <Link href={`/grupos/vida-de-servicio/${e.grupoId}`} className="inline-flex min-h-11 items-center underline underline-offset-4" aria-label={t('tabla.verDe', { nombre: e.nombre })}>
            {t('tabla.ver')}
          </Link>
        )}
      />

      <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} renderEnlace={(p) => <Link href={hrefPagina(p)} />} etiquetaNav={t('tabla.paginado')} />
    </div>
  );
}

/**
 * "Crear una edición" (FR-002, FR-003): nombre, Sede, inicio y cantidad de
 * semanas → la propuesta de fechas, editable → Líderes. Los errores de la API
 * se muestran en su campo y en el resumen (H-50).
 */
function CrearEdicion({ sedes, lideres, apiToken }: { sedes: Array<{ id: string; nombre: string }>; lideres: Array<{ id: string; nombre: string; apellido: string }>; apiToken: string }) {
  const t = useTranslations('edicionesServicio.crear');
  const td = useTranslations('edicionesServicio.detalle');
  const te = useTranslations('errors');
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [sedeId, setSedeId] = useState(sedes.length === 1 ? sedes[0].id : '');
  const [inicio, setInicio] = useState(hoyEnArgentina());
  const [cantidad, setCantidad] = useState(8);
  const [fechas, setFechas] = useState<string[]>(cronogramaPropuesto(hoyEnArgentina(), 8));
  const [elegidos, setElegidos] = useState<Set<string>>(new Set());
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [foco, setFoco] = useState(0);
  const mensaje = (code: string) => (te.has(`campos.${code}`) ? te(`campos.${code}`) : td('errorGenerico'));

  function proponer(nuevoInicio: string, nuevaCantidad: number) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(nuevoInicio) && nuevaCantidad >= SEMANAS_MIN && nuevaCantidad <= SEMANAS_MAX) setFechas(cronogramaPropuesto(nuevoInicio, nuevaCantidad));
  }

  const { enviando, ejecutar } = useEnvio(async () => {
    try {
      const { grupoId } = await apiFetch<{ grupoId: string }>('/grupos/vida-de-servicio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ nombre, sedeId, fechaInicio: inicio, semanas: fechas, lideres: [...elegidos] }),
      });
      toast.success(t('creada', { nombre: nombre.trim() }));
      setAbierto(false);
      router.push(`/grupos/vida-de-servicio/${grupoId}`);
    } catch (e) {
      const campos = erroresPorCampo(e);
      if (campos) {
        setErrores(Object.fromEntries(campos.map((c) => [c.campo, mensaje(c.code)])));
        setFoco((f) => f + 1);
        return;
      }
      const code = e instanceof ApiError ? e.code : null;
      toast.error(code && te.has(code) ? te(code) : td('errorGenerico'));
    }
  });

  const resumen = Object.entries(errores).map(([campo, m]) => ({ campo, mensaje: m }));
  const describir = (campo: string, ayuda?: string) => [errores[campo] ? `error-${campo}` : null, ayuda].filter(Boolean).join(' ') || undefined;

  return (
    <AlertDialog open={abierto} onOpenChange={setAbierto}>
      <AlertDialogTrigger
        render={
          <Button type="button" className="h-11 w-full sm:w-fit">
            <Plus aria-hidden />
            {t('boton')}
          </Button>
        }
      />
      <AlertDialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl" data-tono="neutro">
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void ejecutar();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{t('titulo')}</AlertDialogTitle>
            <AlertDialogDescription>{t('descripcion')}</AlertDialogDescription>
          </AlertDialogHeader>
          <ResumenErrores errores={resumen} titulo={td('resumenErrores')} foco={foco} />

          <div className="flex flex-col gap-1">
            <label htmlFor="campo-nombre" className="font-medium">{t('nombre')}</label>
            <Input id="campo-nombre" value={nombre} maxLength={NOMBRE_EDICION_MAX + 20} onChange={(e) => setNombre(e.target.value)} aria-invalid={errores.nombre ? true : undefined} aria-describedby={describir('nombre', 'ayuda-nombre')} className="h-11" />
            <p id="ayuda-nombre" className="text-sm text-muted-foreground">{t('nombreAyuda')}</p>
            <MensajeErrorCampo id="error-nombre" mensaje={errores.nombre} />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="campo-sedeId" className="font-medium">{t('sede')}</label>
            <select id="campo-sedeId" value={sedeId} onChange={(e) => setSedeId(e.target.value)} aria-invalid={errores.sedeId ? true : undefined} aria-describedby={describir('sedeId')} className="h-11 rounded-md border border-input bg-background px-3">
              <option value="">{t('elegirSede')}</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
            <MensajeErrorCampo id="error-sedeId" mensaje={errores.sedeId} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="campo-fechaInicio" className="font-medium">{t('fechaInicio')}</label>
              <input
                id="campo-fechaInicio"
                type="date"
                value={inicio}
                onChange={(e) => {
                  setInicio(e.target.value);
                  proponer(e.target.value, cantidad);
                }}
                aria-invalid={errores.fechaInicio ? true : undefined}
                aria-describedby={describir('fechaInicio')}
                className="h-11 rounded-md border border-input bg-background px-3"
              />
              <MensajeErrorCampo id="error-fechaInicio" mensaje={errores.fechaInicio} />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="campo-cantidad" className="font-medium">{t('semanas')}</label>
              <Input
                id="campo-cantidad"
                type="number"
                min={SEMANAS_MIN}
                max={SEMANAS_MAX}
                value={cantidad}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setCantidad(n);
                  proponer(inicio, n);
                }}
                aria-describedby="ayuda-cantidad"
                className="h-11"
              />
              <p id="ayuda-cantidad" className="text-sm text-muted-foreground">{t('semanasAyuda')}</p>
            </div>
          </div>

          <fieldset id="campo-semanas" tabIndex={-1} className="flex flex-col gap-2 outline-none" aria-describedby={describir('semanas', 'ayuda-semanas')}>
            <legend className="font-medium">{t('cronograma')}</legend>
            <p id="ayuda-semanas" className="text-sm text-muted-foreground">{t('cronogramaAyuda')}</p>
            <MensajeErrorCampo id="error-semanas" mensaje={errores.semanas} />
            <ol className="grid gap-2 sm:grid-cols-2">
              {fechas.map((f, i) => (
                <li key={i} className="flex flex-col gap-1">
                  <label htmlFor={`campo-semanas.${i}`} className="text-sm">{t('semana', { numero: i + 1 })}</label>
                  <input
                    id={`campo-semanas.${i}`}
                    type="date"
                    value={f}
                    onChange={(e) => setFechas((xs) => xs.map((x, j) => (j === i ? e.target.value : x)))}
                    aria-invalid={errores[`semanas.${i}`] ? true : undefined}
                    aria-describedby={describir(`semanas.${i}`)}
                    className="h-11 rounded-md border border-input bg-background px-3"
                  />
                  <MensajeErrorCampo id={`error-semanas.${i}`} mensaje={errores[`semanas.${i}`]} />
                </li>
              ))}
            </ol>
          </fieldset>

          <fieldset id="campo-lideres" tabIndex={-1} className="flex flex-col gap-2 outline-none" aria-describedby={describir('lideres', 'ayuda-lideres')}>
            <legend className="font-medium">{t('lideres')}</legend>
            <p id="ayuda-lideres" className="text-sm text-muted-foreground">{lideres.length === 0 ? t('sinLideres') : t('lideresAyuda')}</p>
            {lideres.map((l) => (
              <label key={l.id} htmlFor={`lider-${l.id}`} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border px-3 has-[:checked]:border-primary">
                <input
                  id={`lider-${l.id}`}
                  type="checkbox"
                  checked={elegidos.has(l.id)}
                  onChange={() =>
                    setElegidos((s) => {
                      const nuevo = new Set(s);
                      if (nuevo.has(l.id)) nuevo.delete(l.id);
                      else nuevo.add(l.id);
                      return nuevo;
                    })
                  }
                  className="size-4 accent-primary"
                />
                {l.nombre} {l.apellido}
              </label>
            ))}
            <MensajeErrorCampo id="error-lideres" mensaje={errores.lideres} />
          </fieldset>

          <AlertDialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={() => setAbierto(false)} disabled={enviando}>
              {t('volver')}
            </Button>
            <Button type="submit" className="h-11" loading={enviando}>
              {t('enviar')}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
