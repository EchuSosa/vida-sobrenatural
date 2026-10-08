'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Info } from 'lucide-react';
import { ApiError, CURSO_DESCRIPCION_MAX, apiFetch, erroresPorCampo, type CursoDetalle, type ErrorCode } from '@vida-sobrenatural/shared-types';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  ConfirmDestructiveDialog,
  EstadoActivoBadge,
  Input,
  MensajeErrorCampo,
  MigaDePan,
  ResumenErrores,
  useEnvio,
  useValidacionCampos,
} from '@vida-sobrenatural/ui';
import { combinacion } from '../textos';

/**
 * spec 013 (T074): el detalle de un Curso. Inactivar es reversible: confirmación
 * neutra (D151); con Grupos en curso, reforzada escribiendo el nombre (D38).
 * Eliminar, con Grupos, queda deshabilitado con su explicación y la oferta de
 * inactivar (D119, `docs/15`).
 */
export function CursoDetalleCliente({ curso, apiToken, puedeGestionar }: { curso: CursoDetalle; apiToken: string; puedeGestionar: boolean }) {
  const t = useTranslations('cursos');
  const td = useTranslations('cursos.detalle');
  const tn = useTranslations('cursos.nuevo');
  const te = useTranslations('errors');
  const router = useRouter();
  const [nombre, setNombre] = useState(curso.nombre);
  const [descripcion, setDescripcion] = useState(curso.descripcion ?? '');
  const validacion = useValidacionCampos();

  async function enviar(cuerpo: object) {
    await apiFetch(`/cursos/${curso.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
      body: JSON.stringify(cuerpo),
    });
  }
  const mensajeError = (e: unknown) => (e instanceof ApiError ? te(e.code as ErrorCode) : td('error'));

  const { enviando: guardando, ejecutar: guardar } = useEnvio(async () => {
    const errores: Record<string, string> = {};
    if (!nombre.trim() || nombre.trim().length > 120) errores.nombre = tn('errores.nombre');
    if (descripcion.length > CURSO_DESCRIPCION_MAX) errores.descripcion = tn('errores.descripcion');
    if (Object.keys(errores).length > 0) return validacion.reemplazar(errores);
    try {
      await enviar({ nombre: nombre.trim(), descripcion: descripcion.trim() || null });
      toast(td('guardado'));
      router.refresh();
    } catch (e) {
      const campos = erroresPorCampo(e);
      if (campos) validacion.reemplazar(Object.fromEntries(campos.map((c) => [c.campo, te(c.code as ErrorCode)])));
      else toast.error(mensajeError(e));
    }
  });

  const { enviando: cambiandoEstado, ejecutar: cambiarEstado } = useEnvio(async (activo: boolean) => {
    try {
      await enviar({ activo });
      toast(activo ? td('reactivado') : td('inactivado'));
      router.refresh();
    } catch (e) {
      toast.error(mensajeError(e));
    }
  });

  const { enviando: eliminando, ejecutar: eliminar } = useEnvio(async () => {
    try {
      await apiFetch(`/cursos/${curso.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${apiToken}` } });
      toast(td('eliminado'));
      router.push('/cursos');
    } catch (e) {
      toast.error(mensajeError(e));
    }
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-2">
        <MigaDePan tramos={[{ label: t('miga'), href: '/catalogos' }, { label: t('titulo'), href: '/cursos' }, { label: curso.nombre }]} LinkComponente={Link} />
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{curso.nombre}</h1>
          <EstadoActivoBadge activo={curso.activo} textoActivo={t('activo')} textoInactivo={t('inactivo')} />
        </div>
        <p className="text-muted-foreground">
          {combinacion(t, curso.categoria, curso.tipo)} · {td('modalidad')}: {t(`modalidades.${curso.modalidad}`)}
        </p>
        <p>{td('grupos', { cantidad: curso.gruposEnCurso })}</p>
      </div>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void guardar();
        }}
        className="flex flex-col gap-5"
      >
        <ResumenErrores errores={validacion.resumen} titulo={tn('resumen')} foco={validacion.foco} />
        <div className="flex flex-col gap-1">
          <label htmlFor="campo-nombre" className="font-medium">
            {tn('nombre')}
          </label>
          <Input
            id="campo-nombre"
            value={nombre}
            maxLength={120}
            readOnly={!puedeGestionar}
            onChange={(e) => {
              setNombre(e.target.value);
              validacion.limpiar('nombre');
            }}
            aria-invalid={!!validacion.mensajes.nombre}
            aria-describedby={validacion.mensajes.nombre ? 'campo-nombre-error' : undefined}
            className="h-11"
          />
          <MensajeErrorCampo id="campo-nombre-error" mensaje={validacion.mensajes.nombre} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="campo-descripcion" className="font-medium">
            {tn('descripcionCampo')}
          </label>
          <p id="campo-descripcion-ayuda" className="text-sm text-muted-foreground">
            {tn('descripcionAyuda')}
          </p>
          <textarea
            id="campo-descripcion"
            value={descripcion}
            rows={4}
            readOnly={!puedeGestionar}
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
        {puedeGestionar && (
          <Button type="submit" loading={guardando} loadingText={td('guardando')} className="self-start">
            {td('guardar')}
          </Button>
        )}
      </form>

      {puedeGestionar && (
        <section aria-label={t('columnas.estado')} className="flex flex-col gap-4 border-t border-border pt-6">
          <div className="flex flex-wrap gap-2">
            {!curso.activo ? (
              <ConfirmDestructiveDialog
                tono="neutro"
                trigger={
                  <Button variant="outline" loading={cambiandoEstado} loadingText={td('reactivando')}>
                    {td('reactivar')}
                  </Button>
                }
                titulo={td('reactivarTitulo', { nombre: curso.nombre })}
                descripcion={td('reactivarTexto')}
                textoConfirmar={td('reactivarConfirmar')}
                textoCancelar={td('volver')}
                onConfirmar={() => void cambiarEstado(true)}
              />
            ) : curso.gruposEnCurso > 0 ? (
              <InactivarReforzado curso={curso} enviando={cambiandoEstado} onConfirmar={() => void cambiarEstado(false)} />
            ) : (
              <ConfirmDestructiveDialog
                tono="neutro"
                trigger={
                  <Button variant="outline" loading={cambiandoEstado} loadingText={td('inactivando')}>
                    {td('inactivar')}
                  </Button>
                }
                titulo={td('inactivarTitulo', { nombre: curso.nombre })}
                descripcion={td('inactivarTexto')}
                textoConfirmar={td('inactivarConfirmar')}
                textoCancelar={td('volver')}
                onConfirmar={() => void cambiarEstado(false)}
              />
            )}
            {curso.tieneGrupos ? (
              <Button variant="outline" disabled aria-describedby="eliminar-explicacion">
                {td('eliminar')}
              </Button>
            ) : (
              <ConfirmDestructiveDialog
                trigger={
                  <Button variant="outline" className="text-destructive" loading={eliminando} loadingText={td('eliminando')}>
                    {td('eliminar')}
                  </Button>
                }
                titulo={td('eliminarTitulo', { nombre: curso.nombre })}
                descripcion={td('eliminarTexto')}
                textoConfirmar={td('eliminarConfirmar')}
                textoCancelar={td('volver')}
                onConfirmar={() => void eliminar()}
              />
            )}
          </div>
          {curso.tieneGrupos && (
            <p id="eliminar-explicacion" className="flex items-start gap-2 text-muted-foreground">
              <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
              {td('noSePuedeEliminar')}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

/** D38: con Grupos en curso, inactivar pide escribir el nombre exacto del Curso. Sigue siendo neutro (D151). */
function InactivarReforzado({ curso, enviando, onConfirmar }: { curso: CursoDetalle; enviando: boolean; onConfirmar: () => void }) {
  const td = useTranslations('cursos.detalle');
  const [abierto, setAbierto] = useState(false);
  const [escrito, setEscrito] = useState('');
  return (
    <>
      <Button
        variant="outline"
        loading={enviando}
        loadingText={td('inactivando')}
        onClick={() => {
          setEscrito('');
          setAbierto(true);
        }}
      >
        {td('inactivar')}
      </Button>
      <AlertDialog open={abierto} onOpenChange={setAbierto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{td('inactivarTitulo', { nombre: curso.nombre })}</AlertDialogTitle>
            <AlertDialogDescription>{td('inactivarConGrupos', { cantidad: curso.gruposEnCurso })}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-1">
            <label htmlFor="confirmar-nombre" className="font-medium">
              {td('escribiNombre')}
            </label>
            <Input id="confirmar-nombre" value={escrito} onChange={(e) => setEscrito(e.target.value)} autoComplete="off" className="h-11" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{td('volver')}</AlertDialogCancel>
            <Button
              disabled={escrito.trim() !== curso.nombre}
              onClick={() => {
                setAbierto(false);
                onConfirmar();
              }}
            >
              {td('inactivarConfirmar')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
