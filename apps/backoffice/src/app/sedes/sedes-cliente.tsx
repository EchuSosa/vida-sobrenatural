'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MoreVertical, Trash2 } from 'lucide-react';
import { type Sede, type ErrorCode, type ErrorDeCampo, apiFetch, ApiError, erroresPorCampo } from '@vida-sobrenatural/shared-types';
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
  ButtonLink,
  ControlesTabla,
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
  type OrdenTabla,
  useEnvio,
} from '@vida-sobrenatural/ui';
import { toast } from 'sonner';
import { useControlesTablaUrl } from '../../hooks/use-controles-tabla-url';
import { FormularioSede, VALORES_SEDE_VACIOS, datosSedeParaEnviar, type ValoresSede } from '../../components/formulario-sede';

type Filtro = 'activas' | 'todas';

/**
 * H-51/H-52 (revisión manual ronda 4, D117): el listado muestra también las
 * Sedes inactivas (con un filtro activas/todas). H-69 (ronda 6): tabla
 * compartida — columnas, columna de acciones y orden. H-60 (ronda 7):
 * `sedes` llega ya cargada desde page.tsx (Server Component) — este
 * componente es la isla de cliente: el modal de alta, el filtro/orden que
 * navegan (`router.push`, vuelve a pasar por el servidor), y las acciones
 * de cada fila (Inactivar/Reactivar/Eliminar, D119). Después de cualquier
 * mutación, `router.refresh()` vuelve a pedir `sedes` al servidor sin
 * perder el estado de cliente (el modal, por ejemplo) — mismo mecanismo
 * que ya usa error.tsx (H-04).
 */
export function SedesCliente({
  sedes,
  filtro,
  orden,
  apiToken,
  puedeGestionar,
  puedeAbrirPapelera,
}: {
  sedes: Sede[];
  filtro: Filtro;
  orden: OrdenTabla;
  apiToken: string;
  /** H-133: crear, inactivar, reactivar y eliminar — `sedes.gestionar`. */
  puedeGestionar: boolean;
  /** T071: el enlace a /sedes/papelera — `sedes.papelera.ver`, el permiso de abrirla. */
  puedeAbrirPapelera: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // H-109: el diálogo "Necesitás al menos una Sede activa" ofrecía "Crear
  // una Sede" y llevaba solo al listado — dejaba el trabajo a medias
  // (renombrarlo a "Ir a Sedes" también, por eso no se hizo). El estado
  // inicial lee `?crear=1` una sola vez, al montar: es un enlace de
  // entrada, no algo que deba seguir reaccionando a cambios en la URL.
  const [modalAbierto, setModalAbierto] = useState(() => searchParams.get('crear') === '1');
  const [errorAlta, setErrorAlta] = useState<string | null>(null);
  const [erroresCampoAlta, setErroresCampoAlta] = useState<ErrorDeCampo[] | null>(null);
  const te = useTranslations('errors');
  const tc = useTranslations('comun');
  const procesandoRef = useRef(new Set<string>());
  const { busqueda, setBusqueda, actualizarParams, limpiar } = useControlesTablaUrl();
  const hayAlgoAplicado = busqueda.trim() !== '' || filtro === 'todas';

  // Limpia `?crear=1` de la URL una vez leído, para que cerrar el modal (o
  // volver con el botón "atrás") no lo vuelva a abrir solo.
  useEffect(() => {
    if (searchParams.get('crear') === '1') {
      router.replace('/sedes');
    }
  }, [searchParams, router]);

  const { enviando, ejecutar: crearSede } = useEnvio(async (valores: ValoresSede) => {
    setErrorAlta(null);
    setErroresCampoAlta(null);
    try {
      await apiFetch('/sedes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify(datosSedeParaEnviar(valores)),
      });
      toast('Sede creada.');
      setModalAbierto(false);
      router.refresh();
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ activo }),
      });
      toast(activo ? 'Sede reactivada.' : 'Sede inactivada.');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos actualizar la Sede.');
    } finally {
      procesandoRef.current.delete(sede.id);
    }
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
            ordenable: true,
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
          {/* Un control se condiciona al permiso de LO QUE PROVOCA. "Papelera" es
              navegación, no una acción: va con el permiso de ABRIR esa pantalla
              (`sedes.papelera.ver`), no con el de gestionar. Hoy los dos son solo del
              Admin y ninguna prueba distingue una opción de la otra — este
              comentario es lo que impide unificarlos cuando se separen (H-129/T071). */}
          {puedeAbrirPapelera && (
            <ButtonLink render={<Link href="/sedes/papelera" />} variant="outline" size="sm">
              Papelera
            </ButtonLink>
          )}
          {puedeGestionar && (
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
          )}
        </div>
      </div>

      <ControlesTabla
        busqueda={busqueda}
        onBuscarChange={setBusqueda}
        etiquetaBusqueda="Buscar por nombre"
        placeholderBusqueda="Ej. La Plata"
        filtros={
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
        }
        hayAlgoAplicado={hayAlgoAplicado}
        onLimpiar={() => limpiar(['estado'])}
        cantidadResultados={sedes.length}
      />

      <TablaDatos
        columnas={columnas}
        datos={sedes}
        obtenerId={(sede) => sede.id}
        etiqueta="Sedes"
        mensajeVacio={
          busqueda.trim()
            ? `No encontramos Sedes que coincidan con "${busqueda.trim()}".`
            : filtro === 'activas'
              ? 'Todavía no hay Sedes activas.'
              : 'Todavía no hay Sedes cargadas.'
        }
        orden={orden}
        onOrdenar={(columnaId) =>
          actualizarParams({
            orden: columnaId === 'nombre' ? null : columnaId,
            dir: orden.columna === columnaId && orden.direccion === 'asc' ? 'desc' : null,
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
                {/* "Ver detalle" es navegación (sedes.ver, quien ve el listado ya lo
                    tiene); Inactivar/Reactivar/Eliminar son acciones (sedes.gestionar). */}
                <DropdownMenuItem render={<Link href={`/sedes/${sede.id}`}>Ver detalle</Link>} />
                {puedeGestionar &&
                  (sede.activo ? (
                    <DropdownMenuItem onClick={() => cambiarActivo(sede, false)}>Inactivar</DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => cambiarActivo(sede, true)}>Reactivar</DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {puedeGestionar && <AccionEliminarSede sede={sede} apiToken={apiToken} />}
          </div>
        )}
      />

      <Sheet open={modalAbierto} onOpenChange={setModalAbierto}>
        <SheetContent side="right" etiquetaCerrar={tc('cerrarPanel')}>
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
 * donde un tooltip no serviría.
 */
function AccionEliminarSede({ sede, apiToken }: { sede: Sede; apiToken: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const te = useTranslations('errors');
  const bloqueada = sede.personasAsociadas > 0;

  const { enviando, ejecutar: eliminar } = useEnvio(async () => {
    try {
      await apiFetch(`/sedes/${sede.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      toast('Sede eliminada.');
      setOpen(false);
      router.refresh();
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
