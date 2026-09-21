'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  type Libro,
  type ErrorCode,
  type ErrorDeCampo,
  apiFetch,
  ApiError,
  erroresPorCampo,
  MIME_TIPOS_PORTADA_PERMITIDOS,
  PORTADA_TAMANO_MAXIMO_BYTES,
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
  AlertDialogTrigger,
  Button,
  ConfirmDestructiveDialog,
  EstadoActivoBadge,
  PlaceholderImagen,
  useEnvio,
} from '@vida-sobrenatural/ui';
import { toast } from 'sonner';
import { FormularioLibro, libroAValoresFormulario, datosLibroParaEnviar, type ValoresLibro } from '../../../components/formulario-libro';

const TAMANO_MAXIMO_MB = Math.round(PORTADA_TAMANO_MAXIMO_BYTES / (1024 * 1024));

/**
 * Historia 4 (D64): `libro` llega ya cargado desde page.tsx. Isla de
 * cliente: formulario de edición, subir/reemplazar/quitar portada,
 * inactivar/reactivar y eliminar (D119, FR-020: siempre permitido, sin la
 * rama "bloqueada" que sí tiene Sede). Pastor (`esAdmin: false`) ve todo
 * sin ningún control habilitado.
 */
export function LibroDetalleCliente({ libro, apiToken, esAdmin }: { libro: Libro; apiToken: string; esAdmin: boolean }) {
  const router = useRouter();
  const te = useTranslations('errors');
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [erroresCampoGuardar, setErroresCampoGuardar] = useState<ErrorDeCampo[] | null>(null);

  const { enviando, ejecutar: guardar } = useEnvio(async (valores: ValoresLibro) => {
    setErrorGuardar(null);
    setErroresCampoGuardar(null);
    try {
      await apiFetch(`/libros/${libro.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify(datosLibroParaEnviar(valores)),
      });
      toast('Cambios guardados.');
      router.refresh();
    } catch (e) {
      const campos = erroresPorCampo(e);
      if (campos) {
        setErroresCampoGuardar(campos);
      } else {
        setErrorGuardar(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos guardar los cambios.');
      }
    }
  });

  const { enviando: desactivando, ejecutar: desactivar } = useEnvio(async () => {
    try {
      await apiFetch(`/libros/${libro.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ activo: false }),
      });
      toast('Libro inactivado.');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos inactivar el Libro.');
    }
  });

  const { enviando: reactivando, ejecutar: reactivar } = useEnvio(async () => {
    try {
      await apiFetch(`/libros/${libro.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ activo: true }),
      });
      toast('Libro reactivado.');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos reactivar el Libro.');
    }
  });

  const { enviando: eliminando, ejecutar: eliminar } = useEnvio(async () => {
    try {
      await apiFetch(`/libros/${libro.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${apiToken}` } });
      toast('Libro eliminado.');
      router.push('/libros');
    } catch (e) {
      toast.error(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos eliminar el Libro.');
    }
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <Link href="/libros" className="text-sm text-muted-foreground underline underline-offset-4">
        ← Volver a Libros
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{libro.titulo}</h1>
          <EstadoActivoBadge activo={libro.activo} textoActivo="Activo" textoInactivo="Inactivo" />
        </div>

        {esAdmin &&
          (libro.activo ? (
            <ConfirmDestructiveDialog
              trigger={
                <Button variant="outline" className="text-destructive" loading={desactivando} loadingText="Inactivando…">
                  Inactivar
                </Button>
              }
              titulo={`¿Inactivar ${libro.titulo}?`}
              descripcion="Deja de mostrarse en Ediciones VS. No se borra nada: podés volver a activarlo cuando quieras."
              textoConfirmar="Sí, inactivar"
              textoCancelar="Volver"
              onConfirmar={desactivar}
            />
          ) : (
            <ConfirmDestructiveDialog
              trigger={
                <Button loading={reactivando} loadingText="Reactivando…">
                  Reactivar
                </Button>
              }
              titulo={`¿Reactivar ${libro.titulo}?`}
              descripcion="Vuelve a mostrarse en Ediciones VS."
              textoConfirmar="Sí, reactivar"
              textoCancelar="Volver"
              onConfirmar={reactivar}
            />
          ))}
      </div>

      <PortadaLibro libro={libro} apiToken={apiToken} esAdmin={esAdmin} />

      <FormularioLibro
        key={libro.id}
        valoresIniciales={libroAValoresFormulario(libro)}
        onGuardar={guardar}
        enviando={enviando}
        textoBoton="Guardar cambios"
        textoEnviando="Guardando…"
        error={errorGuardar}
        erroresCampo={erroresCampoGuardar}
        soloLectura={!esAdmin}
      />

      {esAdmin && (
        <div className="border-t border-border pt-6">
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="outline" className="text-destructive">
                  Eliminar Libro
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar {libro.titulo}?</AlertDialogTitle>
                {/* FR-020: sin la advertencia de "tiene datos relacionados" que sí lleva Sede — hoy nada referencia a Libro. */}
                <AlertDialogDescription>
                  Es para corregir un error de carga (duplicado, de prueba) — se saca de todas las vistas y queda en la
                  papelera, desde donde se puede restaurar.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction variant="destructive" loading={eliminando} loadingText="Eliminando…" onClick={eliminar}>
                  Sí, eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

/**
 * FR-021 a FR-027: subir/reemplazar/quitar portada, con validación de UI
 * (tipo/tamaño) antes de intentar subir — el servidor es la fuente de
 * verdad real (research.md Decisión 5, defensa en profundidad), esto es
 * sólo para no hacer un viaje al servidor con un archivo obviamente
 * inválido. Texto alternativo obligatorio en cuanto hay portada (FR-025).
 */
function PortadaLibro({ libro, apiToken, esAdmin }: { libro: Libro; apiToken: string; esAdmin: boolean }) {
  const router = useRouter();
  const te = useTranslations('errors');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [portadaDescripcion, setPortadaDescripcion] = useState(libro.portadaDescripcion ?? '');
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [errorSubida, setErrorSubida] = useState<string | null>(null);

  function elegirArchivo(seleccionado: File | null) {
    setErrorArchivo(null);
    setErrorSubida(null);
    if (!seleccionado) {
      setArchivo(null);
      return;
    }
    if (!MIME_TIPOS_PORTADA_PERMITIDOS.includes(seleccionado.type as (typeof MIME_TIPOS_PORTADA_PERMITIDOS)[number])) {
      setErrorArchivo('La portada tiene que ser un archivo JPG, PNG o WebP.');
      setArchivo(null);
      return;
    }
    if (seleccionado.size > PORTADA_TAMANO_MAXIMO_BYTES) {
      setErrorArchivo(`La portada pesa más del máximo permitido (${TAMANO_MAXIMO_MB} MB) — probá con un archivo más liviano.`);
      setArchivo(null);
      return;
    }
    setArchivo(seleccionado);
  }

  const { enviando: subiendo, ejecutar: subir } = useEnvio(async () => {
    if (!archivo) return;
    if (!portadaDescripcion.trim()) {
      setErrorSubida('Completá el texto alternativo de la portada antes de subirla.');
      return;
    }
    setErrorSubida(null);
    try {
      const formData = new FormData();
      formData.append('portada', archivo);
      formData.append('portadaDescripcion', portadaDescripcion);
      await apiFetch(`/libros/${libro.id}/portada`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiToken}` },
        body: formData,
      });
      toast('Portada guardada.');
      setArchivo(null);
      router.refresh();
    } catch (e) {
      setErrorSubida(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos subir la portada.');
    }
  });

  const { enviando: quitando, ejecutar: quitar } = useEnvio(async () => {
    try {
      await apiFetch(`/libros/${libro.id}/portada`, { method: 'DELETE', headers: { Authorization: `Bearer ${apiToken}` } });
      toast('Portada quitada.');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos quitar la portada.');
    }
  });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium">Portada</h2>
      <div className="flex gap-4">
        {libro.portadaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- portada servida por apps/api (D110)
          <img src={libro.portadaUrl} alt={libro.portadaDescripcion ?? ''} className="aspect-[2/3] w-32 rounded-md object-cover" />
        ) : (
          <PlaceholderImagen aspecto="portada" etiqueta={`Portada de ${libro.titulo}`} className="w-32" />
        )}

        {esAdmin && (
          <div className="flex flex-1 flex-col gap-2">
            <label htmlFor="campo-portada-archivo" className="text-sm font-medium">
              {libro.portadaUrl ? 'Reemplazar portada' : 'Subir portada'} (opcional)
            </label>
            <input
              id="campo-portada-archivo"
              type="file"
              accept={MIME_TIPOS_PORTADA_PERMITIDOS.join(',')}
              onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
            {errorArchivo && <p className="text-sm text-destructive">{errorArchivo}</p>}

            {archivo && (
              <>
                <label htmlFor="campo-portada-alt" className="text-sm font-medium">
                  Texto alternativo
                </label>
                <input
                  id="campo-portada-alt"
                  required
                  value={portadaDescripcion}
                  onChange={(e) => setPortadaDescripcion(e.target.value)}
                  placeholder="Ej. Tapa del libro Mujer Maravilla"
                  className="rounded-md border border-input bg-transparent px-3 py-2 text-sm dark:bg-input/30"
                />
                {errorSubida && <p className="text-sm text-destructive">{errorSubida}</p>}
                <Button size="sm" loading={subiendo} loadingText="Subiendo…" onClick={subir} className="w-fit">
                  {libro.portadaUrl ? 'Reemplazar portada' : 'Subir portada'}
                </Button>
              </>
            )}

            {libro.portadaUrl && !archivo && (
              <Button variant="outline" size="sm" loading={quitando} loadingText="Quitando…" onClick={quitar} className="w-fit">
                Quitar portada
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
