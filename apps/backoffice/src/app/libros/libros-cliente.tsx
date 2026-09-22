'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MoreVertical, Trash2 } from 'lucide-react';
import { type Libro, type ErrorCode, type ErrorDeCampo, apiFetch, ApiError, erroresPorCampo } from '@vida-sobrenatural/shared-types';
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
  buttonVariants,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EstadoActivoBadge,
  PlaceholderImagen,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  TablaDatos,
  type ColumnaTabla,
  type OrdenTabla,
  useEnvio,
} from '@vida-sobrenatural/ui';
import { toast } from 'sonner';
import { FormularioLibro, VALORES_LIBRO_VACIOS, datosLibroParaEnviar, type ValoresLibro } from '../../components/formulario-libro';

type Filtro = 'activas' | 'todas';

/**
 * Historia 4 (FR-018, D64): mismo patrón que SedesCliente. `libros` llega
 * ya cargado y ordenado desde page.tsx. Pastor (`esAdmin: false`) ve todo
 * pero no tiene ni el botón "Crear Libro" ni columna de acciones.
 */
export function LibrosCliente({
  libros,
  filtro,
  orden,
  apiToken,
  esAdmin,
}: {
  libros: Libro[];
  filtro: Filtro;
  orden: OrdenTabla;
  apiToken: string;
  esAdmin: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [errorAlta, setErrorAlta] = useState<string | null>(null);
  const [erroresCampoAlta, setErroresCampoAlta] = useState<ErrorDeCampo[] | null>(null);
  const te = useTranslations('errors');

  function actualizarParams(cambios: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams);
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor === null) params.delete(clave);
      else params.set(clave, valor);
    }
    const query = params.toString();
    router.push(query ? `/libros?${query}` : '/libros');
  }

  const { enviando, ejecutar: crearLibro } = useEnvio(async (valores: ValoresLibro) => {
    setErrorAlta(null);
    setErroresCampoAlta(null);
    try {
      await apiFetch('/libros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify(datosLibroParaEnviar(valores)),
      });
      toast('Libro creado.');
      setModalAbierto(false);
      router.refresh();
    } catch (e) {
      const campos = erroresPorCampo(e);
      if (campos) {
        setErroresCampoAlta(campos);
      } else {
        setErrorAlta(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos crear el Libro.');
      }
    }
  });

  async function cambiarActivo(libro: Libro, activo: boolean) {
    try {
      await apiFetch(`/libros/${libro.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ activo }),
      });
      toast(activo ? 'Libro reactivado.' : 'Libro inactivado.');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos actualizar el Libro.');
    }
  }

  const columnas: ColumnaTabla<Libro>[] = [
    {
      id: 'portada',
      encabezado: 'Portada',
      celda: (libro) =>
        libro.portadaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- portada servida por apps/api (D110)
          <img src={libro.portadaUrl} alt={libro.portadaDescripcion ?? ''} className="h-16 w-auto rounded object-cover" />
        ) : (
          <PlaceholderImagen aspecto="portada" etiqueta={`Portada de ${libro.titulo}`} className="h-16 w-auto" />
        ),
    },
    { id: 'titulo', encabezado: 'Título', ordenable: true, celda: (libro) => <span className="font-medium">{libro.titulo}</span> },
    { id: 'autor', encabezado: 'Autor/a', ordenable: true, className: 'hidden sm:table-cell', celda: (libro) => libro.autor },
    { id: 'anio', encabezado: 'Año', ordenable: true, className: 'hidden sm:table-cell', celda: (libro) => libro.anio },
    ...(filtro === 'todas'
      ? [
          {
            id: 'estado',
            encabezado: 'Estado',
            ordenable: true,
            celda: (libro: Libro) => <EstadoActivoBadge activo={libro.activo} textoActivo="Activo" textoInactivo="Inactivo" />,
          } satisfies ColumnaTabla<Libro>,
        ]
      : []),
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Libros</h1>
        <div className="flex gap-2">
          <Link href="/libros/papelera" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Papelera
          </Link>
          {esAdmin && (
            <Button
              size="sm"
              onClick={() => {
                setErrorAlta(null);
                setErroresCampoAlta(null);
                setModalAbierto(true);
              }}
            >
              Crear Libro
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2" role="group" aria-label="Filtrar por estado">
        <Button
          variant={filtro === 'activas' ? 'default' : 'outline'}
          size="sm"
          onClick={() => actualizarParams({ estado: null })}
        >
          Activos
        </Button>
        <Button variant={filtro === 'todas' ? 'default' : 'outline'} size="sm" onClick={() => actualizarParams({ estado: 'todas' })}>
          Todos
        </Button>
      </div>

      <TablaDatos
        columnas={columnas}
        datos={libros}
        obtenerId={(libro) => libro.id}
        etiqueta="Libros"
        mensajeVacio={filtro === 'activas' ? 'Todavía no hay Libros activos.' : 'Todavía no hay Libros cargados.'}
        orden={orden}
        onOrdenar={(columnaId) =>
          actualizarParams({
            orden: columnaId === 'orden' ? null : columnaId,
            dir: orden.columna === columnaId && orden.direccion === 'asc' ? 'desc' : null,
          })
        }
        acciones={
          esAdmin
            ? (libro) => (
                <div className="flex items-center justify-end gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon-sm" aria-label={`Acciones para ${libro.titulo}`}>
                          <MoreVertical className="size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem render={<Link href={`/libros/${libro.id}`}>Ver detalle</Link>} />
                      {libro.activo ? (
                        <DropdownMenuItem onClick={() => cambiarActivo(libro, false)}>Inactivar</DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => cambiarActivo(libro, true)}>Reactivar</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <AccionEliminarLibro libro={libro} apiToken={apiToken} />
                </div>
              )
            : undefined
        }
      />

      {esAdmin && (
        <Sheet open={modalAbierto} onOpenChange={setModalAbierto}>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Crear Libro</SheetTitle>
              <SheetDescription>Se agrega activo; la portada se sube después, desde su detalle.</SheetDescription>
            </SheetHeader>
            <div className="px-4">
              <FormularioLibro
                valoresIniciales={VALORES_LIBRO_VACIOS}
                onGuardar={crearLibro}
                enviando={enviando}
                textoBoton="Crear Libro"
                textoEnviando="Creando…"
                error={errorAlta}
                erroresCampo={erroresCampoAlta}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

/**
 * FR-020: a diferencia de Sede, eliminar un Libro siempre está permitido —
 * sin la rama "bloqueada" de AccionEliminarSede (nada referencia a Libro
 * hoy en el modelo).
 */
function AccionEliminarLibro({ libro, apiToken }: { libro: Libro; apiToken: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const te = useTranslations('errors');

  const { enviando, ejecutar: eliminar } = useEnvio(async () => {
    try {
      await apiFetch(`/libros/${libro.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      toast('Libro eliminado.');
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos eliminar el Libro.');
    }
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`Eliminar ${libro.titulo}`} className="text-destructive hover:text-destructive">
            <Trash2 className="size-4" />
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar {libro.titulo}?</AlertDialogTitle>
          <AlertDialogDescription>
            Es para corregir un error de carga (duplicado, de prueba) — se saca de todas las vistas y queda en la
            papelera, desde donde se puede restaurar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" loading={enviando} loadingText="Eliminando…" onClick={eliminar}>
            Sí, eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
