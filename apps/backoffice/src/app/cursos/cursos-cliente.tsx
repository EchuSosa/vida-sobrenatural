'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import {
  ApiError,
  CURSO_DESCRIPCION_MAX,
  apiFetch,
  erroresPorCampo,
  type CursoDisponible,
  type CursoListado,
  type ErrorCode,
} from '@vida-sobrenatural/shared-types';
import {
  Button,
  ButtonLink,
  EstadoActivoBadge,
  Input,
  MensajeErrorCampo,
  MigaDePan,
  ResumenErrores,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  TablaDatos,
  useEnvio,
  useValidacionCampos,
  type ColumnaTabla,
} from '@vida-sobrenatural/ui';
import { useControlesTablaUrl } from '../../hooks/use-controles-tabla-url';
import { combinacion } from './textos';

/**
 * spec 013 (T074, FR-051, FR-056): el listado de Cursos y el alta en modal
 * (`docs/15`, "Alta en modal"). Las filas llevan al detalle, donde se edita.
 */
export function CursosCliente({
  cursos,
  todos,
  apiToken,
  puedeGestionar,
  vePapelera,
}: {
  cursos: CursoListado[];
  todos: boolean;
  apiToken: string;
  puedeGestionar: boolean;
  vePapelera: boolean;
}) {
  const t = useTranslations('cursos');
  const { actualizarParams } = useControlesTablaUrl();

  const columnas: ColumnaTabla<CursoListado>[] = [
    {
      id: 'nombre',
      encabezado: t('columnas.nombre'),
      celda: (c) => (
        <span className="flex flex-col gap-0.5">
          <Link href={`/cursos/${c.id}`} className="font-medium underline underline-offset-2">
            {c.nombre}
          </Link>
          <span className="text-muted-foreground sm:hidden">{combinacion(t, c.categoria, c.tipo)}</span>
        </span>
      ),
    },
    { id: 'curso', encabezado: t('columnas.curso'), className: 'hidden sm:table-cell', celda: (c) => combinacion(t, c.categoria, c.tipo) },
    {
      id: 'estado',
      encabezado: t('columnas.estado'),
      className: todos ? undefined : 'hidden md:table-cell',
      celda: (c) => <EstadoActivoBadge activo={c.activo} textoActivo={t('activo')} textoInactivo={t('inactivo')} />,
    },
    { id: 'grupos', encabezado: t('columnas.grupos'), className: 'hidden md:table-cell', celda: (c) => c.gruposEnCurso },
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-2">
        <MigaDePan tramos={[{ label: t('miga'), href: '/catalogos' }, { label: t('titulo') }]} LinkComponente={Link} />
        <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
        <p className="text-muted-foreground">{t('descripcion')}</p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          {t('filtro')}
          <select
            value={todos ? 'todos' : 'activos'}
            onChange={(e) => actualizarParams({ estado: e.target.value === 'todos' ? 'todos' : null })}
            className="h-10 rounded-md border border-input bg-transparent px-2 text-sm font-normal dark:bg-input/30"
          >
            <option value="activos">{t('filtros.activos')}</option>
            <option value="todos">{t('filtros.todos')}</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          {vePapelera && (
            <ButtonLink variant="ghost" render={<Link href="/cursos/papelera" />}>
              <Trash2 aria-hidden className="size-4" />
              {t('papelera')}
            </ButtonLink>
          )}
          {puedeGestionar && <AltaCurso apiToken={apiToken} />}
        </div>
      </div>

      <TablaDatos
        columnas={columnas}
        datos={cursos}
        obtenerId={(c) => c.id}
        etiqueta={t('tabla')}
        mensajeVacio={todos ? t('vacioTodos') : t('vacio')}
        encabezadoAcciones={t('columnas.acciones')}
        acciones={(c) => (
          <ButtonLink variant="outline" size="sm" render={<Link href={`/cursos/${c.id}`} />} aria-label={t('verDe', { nombre: c.nombre })}>
            {t('ver')}
          </ButtonLink>
        )}
      />
    </div>
  );
}

/** El alta en un panel: elegir una combinación reconocida (o recuperarla de la papelera), nombre y descripción. */
function AltaCurso({ apiToken }: { apiToken: string }) {
  const t = useTranslations('cursos.nuevo');
  const tCursos = useTranslations('cursos');
  const te = useTranslations('errors');
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [disponibles, setDisponibles] = useState<CursoDisponible[] | null>(null);
  const [eleccion, setEleccion] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const validacion = useValidacionCampos();

  async function abrir() {
    setAbierto(true);
    setEleccion('');
    setNombre('');
    setDescripcion('');
    setErrorGeneral(null);
    validacion.reset();
    setDisponibles(null);
    try {
      setDisponibles(await apiFetch<CursoDisponible[]>('/cursos/disponibles-para-alta', { headers: { Authorization: `Bearer ${apiToken}` } }));
    } catch {
      setDisponibles([]);
      setErrorGeneral(tCursos('detalle.error'));
    }
  }

  const { enviando, ejecutar } = useEnvio(async () => {
    const errores: Record<string, string> = {};
    if (!eleccion) errores.combinacion = t('errores.combinacion');
    if (!nombre.trim() || nombre.trim().length > 120) errores.nombre = t('errores.nombre');
    if (descripcion.length > CURSO_DESCRIPCION_MAX) errores.descripcion = t('errores.descripcion');
    if (Object.keys(errores).length > 0) {
      validacion.reemplazar(errores);
      return;
    }
    const [categoria, tipo] = eleccion.split(':');
    try {
      await apiFetch('/cursos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ categoria, tipo, nombre: nombre.trim(), descripcion: descripcion.trim() || undefined }),
      });
      setAbierto(false);
      toast(t('agregado', { nombre: nombre.trim() }));
      router.refresh();
    } catch (e) {
      const campos = erroresPorCampo(e);
      if (campos) validacion.reemplazar(Object.fromEntries(campos.map((c) => [c.campo === 'tipo' || c.campo === 'categoria' ? 'combinacion' : c.campo, te(c.code as ErrorCode)])));
      else setErrorGeneral(e instanceof ApiError ? te(e.code as ErrorCode) : tCursos('detalle.error'));
    }
  });

  return (
    <Sheet open={abierto} onOpenChange={setAbierto}>
      <Button onClick={abrir} className="h-10">
        {t('boton')}
      </Button>
      <SheetContent side="right" etiquetaCerrar={t('cancelar')}>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void ejecutar();
          }}
          className="flex h-full flex-col"
        >
          <SheetHeader>
            <SheetTitle>{t('titulo')}</SheetTitle>
            <SheetDescription>{t('descripcion')}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-5 overflow-y-auto px-4">
            <ResumenErrores errores={validacion.resumen} titulo={t('resumen')} foco={validacion.foco} />
            {errorGeneral && <p role="alert">{errorGeneral}</p>}
            {disponibles !== null && disponibles.length === 0 && !errorGeneral ? (
              <p>{t('sinDisponibles')}</p>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <label htmlFor="campo-combinacion" className="font-medium">
                    {t('combinacion')}
                  </label>
                  <select
                    id="campo-combinacion"
                    value={eleccion}
                    onChange={(e) => {
                      setEleccion(e.target.value);
                      validacion.limpiar('combinacion');
                    }}
                    aria-invalid={!!validacion.mensajes.combinacion}
                    aria-describedby={validacion.mensajes.combinacion ? 'campo-combinacion-error' : undefined}
                    className="h-11 rounded-md border border-input bg-transparent px-2 dark:bg-input/30"
                  >
                    <option value="" />
                    {(disponibles ?? []).map((d) => {
                      const texto = combinacion(tCursos, d.categoria, d.tipo);
                      return (
                        <option key={`${d.categoria}:${d.tipo}`} value={`${d.categoria}:${d.tipo}`}>
                          {d.restaurar ? t('restaurar', { curso: texto }) : texto}
                        </option>
                      );
                    })}
                  </select>
                  <MensajeErrorCampo id="campo-combinacion-error" mensaje={validacion.mensajes.combinacion} />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="campo-nombre" className="font-medium">
                    {t('nombre')}
                  </label>
                  <p id="campo-nombre-ayuda" className="text-sm text-muted-foreground">
                    {t('nombreAyuda')}
                  </p>
                  <Input
                    id="campo-nombre"
                    value={nombre}
                    maxLength={120}
                    onChange={(e) => {
                      setNombre(e.target.value);
                      validacion.limpiar('nombre');
                    }}
                    aria-invalid={!!validacion.mensajes.nombre}
                    aria-describedby={`campo-nombre-ayuda${validacion.mensajes.nombre ? ' campo-nombre-error' : ''}`}
                    className="h-11"
                  />
                  <MensajeErrorCampo id="campo-nombre-error" mensaje={validacion.mensajes.nombre} />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="campo-descripcion" className="font-medium">
                    {t('descripcionCampo')}
                  </label>
                  <p id="campo-descripcion-ayuda" className="text-sm text-muted-foreground">
                    {t('descripcionAyuda')}
                  </p>
                  <textarea
                    id="campo-descripcion"
                    value={descripcion}
                    rows={4}
                    onChange={(e) => {
                      setDescripcion(e.target.value);
                      validacion.limpiar('descripcion');
                    }}
                    aria-invalid={!!validacion.mensajes.descripcion}
                    aria-describedby={`campo-descripcion-ayuda${validacion.mensajes.descripcion ? ' campo-descripcion-error' : ''}`}
                    className="rounded-md border border-input bg-transparent px-3 py-2 dark:bg-input/30"
                  />
                  <MensajeErrorCampo id="campo-descripcion-error" mensaje={validacion.mensajes.descripcion} />
                </div>
              </>
            )}
          </div>
          <SheetFooter>
            <Button type="submit" loading={enviando} loadingText={t('agregando')} disabled={disponibles === null || disponibles.length === 0}>
              {t('agregar')}
            </Button>
            <Button type="button" variant="outline" onClick={() => setAbierto(false)}>
              {t('cancelar')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
