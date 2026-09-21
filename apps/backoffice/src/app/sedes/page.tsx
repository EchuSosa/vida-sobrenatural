'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { MoreVertical, Trash2 } from 'lucide-react';
import {
  type Sede,
  type ErrorCode,
  type ErrorDeCampo,
  apiFetch,
  ApiError,
  erroresPorCampo,
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
  buttonVariants,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EstadoActivoBadge,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  TablaDatos,
  type ColumnaTabla,
  useEnvio,
} from '@vida-sobrenatural/ui';
import { toast } from 'sonner';
import { FormularioSede, VALORES_SEDE_VACIOS, datosSedeParaEnviar, type ValoresSede } from '../../components/formulario-sede';

type Filtro = 'activas' | 'todas';

/**
 * H-51/H-52 (revisión manual ronda 4, D117): el listado muestra también las
 * Sedes inactivas (con un filtro activas/todas). H-69 (ronda 6): pasa de
 * tarjetas sueltas a la tabla compartida de packages/ui — columnas,
 * columna de acciones y orden, con filtro y orden reflejados en la URL. Las
 * filas ya no llevan al detalle por sí solas (ese comportamiento quedaba
 * reñido con tener botones propios adentro) — "Ver detalle" es una acción
 * explícita más, junto con Inactivar/Reactivar y Eliminar (D119).
 */
export default function SedesPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-16">Cargando…</div>}>
      <SedesPageInterna />
    </Suspense>
  );
}

function SedesPageInterna() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [errorAlta, setErrorAlta] = useState<string | null>(null);
  const [erroresCampoAlta, setErroresCampoAlta] = useState<ErrorDeCampo[] | null>(null);
  const te = useTranslations('errors');
  const procesandoRef = useRef(new Set<string>());

  const filtro: Filtro = searchParams.get('estado') === 'todas' ? 'todas' : 'activas';
  const ordenColumna = searchParams.get('orden') === 'direccion' ? 'direccion' : 'nombre';
  const ordenDireccion: 'asc' | 'desc' = searchParams.get('dir') === 'desc' ? 'desc' : 'asc';

  function actualizarParams(cambios: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams);
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor === null) params.delete(clave);
      else params.set(clave, valor);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const cargarSedes = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setSedes(await apiFetch<Sede[]>(`/sedes?estado=${filtro}`));
    } catch {
      // GET /sedes es público — un fallo acá es de red, no de permisos.
      setError('No pudimos cargar las Sedes.');
    } finally {
      setCargando(false);
    }
  }, [filtro]);

  useEffect(() => {
    async function ejecutar() {
      await cargarSedes();
    }
    ejecutar();
  }, [cargarSedes]);

  const sedesOrdenadas = useMemo(() => {
    const copia = [...sedes];
    copia.sort((a, b) => {
      const cmp = String(a[ordenColumna]).localeCompare(String(b[ordenColumna]), 'es');
      return ordenDireccion === 'asc' ? cmp : -cmp;
    });
    return copia;
  }, [sedes, ordenColumna, ordenDireccion]);

  const { enviando, ejecutar: crearSede } = useEnvio(async (valores: ValoresSede) => {
    setErrorAlta(null);
    setErroresCampoAlta(null);
    try {
      await apiFetch('/sedes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.apiToken}` },
        body: JSON.stringify(datosSedeParaEnviar(valores)),
      });
      toast('Sede creada.');
      setModalAbierto(false);
      await cargarSedes();
    } catch (e) {
      const campos = erroresPorCampo(e);
      if (campos) {
        setErroresCampoAlta(campos);
      } else {
        setErrorAlta(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos crear la Sede.');
      }
    }
  });

  // H-57: el guard va en el envío, no solo en el control — `procesandoRef`
  // evita un doble PATCH si alguien reabre el menú y clickea de nuevo
  // mientras el primer pedido todavía está en curso.
  async function cambiarActivo(sede: Sede, activo: boolean) {
    if (procesandoRef.current.has(sede.id)) return;
    procesandoRef.current.add(sede.id);
    try {
      await apiFetch(`/sedes/${sede.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.apiToken}` },
        body: JSON.stringify({ activo }),
      });
      toast(activo ? 'Sede reactivada.' : 'Sede inactivada.');
      await cargarSedes();
    } catch (e) {
      toast.error(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos actualizar la Sede.');
    } finally {
      procesandoRef.current.delete(sede.id);
    }
  }

  if (status === 'loading') {
    return <div className="mx-auto max-w-3xl px-4 py-16">Cargando…</div>;
  }

  if (status === 'unauthenticated') {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold">Sedes</h1>
        <Button onClick={() => signIn('google')}>Continuar con Google</Button>
      </div>
    );
  }

  const columnas: ColumnaTabla<Sede>[] = [
    {
      id: 'nombre',
      encabezado: 'Nombre',
      ordenable: true,
      celda: (sede) => <span className="font-medium">{sede.nombre}</span>,
    },
    {
      id: 'direccion',
      encabezado: 'Dirección',
      ordenable: true,
      // H-62/H-69: a 320px solo caben Nombre y Acciones sin scroll horizontal.
      className: 'hidden sm:table-cell',
      celda: (sede) => sede.direccion,
    },
    {
      id: 'horarios',
      encabezado: 'Horarios',
      className: 'hidden md:table-cell',
      celda: (sede) => sede.horarios,
    },
    ...(filtro === 'todas'
      ? [
          {
            id: 'estado',
            encabezado: 'Estado',
            celda: (sede: Sede) => <EstadoActivoBadge activo={sede.activo} />,
          } satisfies ColumnaTabla<Sede>,
        ]
      : []),
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Sedes</h1>
        <div className="flex gap-2">
          <Link href="/sedes/papelera" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Papelera
          </Link>
          <Button
            size="sm"
            onClick={() => {
              setErrorAlta(null);
              setErroresCampoAlta(null);
              setModalAbierto(true);
            }}
          >
            Crear Sede
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={cargarSedes}>
            Reintentar
          </Button>
        </div>
      )}

      <div className="flex gap-2" role="group" aria-label="Filtrar por estado">
        <Button
          variant={filtro === 'activas' ? 'default' : 'outline'}
          size="sm"
          onClick={() => actualizarParams({ estado: null })}
        >
          Activas
        </Button>
        <Button
          variant={filtro === 'todas' ? 'default' : 'outline'}
          size="sm"
          onClick={() => actualizarParams({ estado: 'todas' })}
        >
          Todas
        </Button>
      </div>

      <TablaDatos
        columnas={columnas}
        datos={sedesOrdenadas}
        obtenerId={(sede) => sede.id}
        etiqueta="Sedes"
        cargando={cargando}
        mensajeVacio={filtro === 'activas' ? 'Todavía no hay Sedes activas.' : 'Todavía no hay Sedes cargadas.'}
        orden={{ columna: ordenColumna, direccion: ordenDireccion }}
        onOrdenar={(columnaId) =>
          actualizarParams({
            orden: columnaId === 'nombre' ? null : columnaId,
            dir: ordenColumna === columnaId && ordenDireccion === 'asc' ? 'desc' : null,
          })
        }
        acciones={(sede) => (
          <div className="flex items-center justify-end gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-sm" aria-label={`Acciones para ${sede.nombre}`}>
                    <MoreVertical className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem render={<Link href={`/sedes/${sede.id}`}>Ver detalle</Link>} />
                {sede.activo ? (
                  <DropdownMenuItem onClick={() => cambiarActivo(sede, false)}>Inactivar</DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => cambiarActivo(sede, true)}>Reactivar</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <AccionEliminarSede sede={sede} onEliminado={cargarSedes} />
          </div>
        )}
      />

      <Sheet open={modalAbierto} onOpenChange={setModalAbierto}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Crear Sede</SheetTitle>
            <SheetDescription>Se agrega activa; podés editarla después desde su detalle.</SheetDescription>
          </SheetHeader>
          <div className="px-4">
            <FormularioSede
              valoresIniciales={VALORES_SEDE_VACIOS}
              onGuardar={crearSede}
              enviando={enviando}
              textoBoton="Crear Sede"
              textoEnviando="Creando…"
              error={errorAlta}
              erroresCampo={erroresCampoAlta}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/**
 * D119: Eliminar es distinto de Inactivar — nunca un botón gris sin
 * explicación (D94). En vez de deshabilitar el ícono cuando hay Personas
 * asociadas, sigue siendo clickeable: abre un diálogo que explica por qué
 * no se puede y ofrece inactivar en su lugar — funciona igual en celular,
 * donde no hay hover para un tooltip.
 */
function AccionEliminarSede({ sede, onEliminado }: { sede: Sede; onEliminado: () => Promise<void> }) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const te = useTranslations('errors');
  const bloqueada = sede.personasAsociadas > 0;

  const { enviando, ejecutar: eliminar } = useEnvio(async () => {
    try {
      await apiFetch(`/sedes/${sede.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.apiToken}` },
      });
      toast('Sede eliminada.');
      setOpen(false);
      await onEliminado();
    } catch (e) {
      toast.error(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos eliminar la Sede.');
    }
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Eliminar ${sede.nombre}`}
            className={bloqueada ? 'text-muted-foreground' : 'text-destructive hover:text-destructive'}
          >
            <Trash2 className="size-4" />
          </Button>
        }
      />
      <AlertDialogContent>
        {bloqueada ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>No se puede eliminar {sede.nombre}</AlertDialogTitle>
              <AlertDialogDescription>
                Tiene {sede.personasAsociadas} {sede.personasAsociadas === 1 ? 'Persona asociada' : 'Personas asociadas'} —
                eliminar una Sede se lleva también su historia (Principio III). Si ya no se usa, inactivala: sigue
                viéndose en &quot;Todas&quot;, pero desaparece de Visitanos y del registro.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Entendido</AlertDialogCancel>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar {sede.nombre}?</AlertDialogTitle>
              <AlertDialogDescription>
                Es para corregir un error de carga (duplicada, de prueba) — se saca de todas las vistas y queda en la
                papelera, desde donde se puede restaurar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction variant="destructive" loading={enviando} loadingText="Eliminando…" onClick={eliminar}>
                Sí, eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
