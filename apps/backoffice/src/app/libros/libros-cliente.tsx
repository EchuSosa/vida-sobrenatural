'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, GripVertical, MoreVertical, Trash2 } from 'lucide-react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  ControlesTabla,
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
import { useControlesTablaUrl } from '../../hooks/use-controles-tabla-url';
import { FormularioLibro, VALORES_LIBRO_VACIOS, datosLibroParaEnviar, type ValoresLibro } from '../../components/formulario-libro';

type Filtro = 'activas' | 'todas';

/**
 * H-89 (paso 2, arrastrar y soltar): dnd-kit exige que cada fila arrastrable
 * llame a `useSortable` en su PROPIO componente (Reglas de los Hooks — no
 * se puede llamar un hook dentro del `.map()` de un callback). TablaDatos
 * (packages/ui) es agnóstica de dnd-kit: solo cede el `<tr>` de cada fila
 * vía `EnvoltorioFila` (ver tabla-datos.tsx). `FilaLibroSortable` es ese
 * envoltorio; el asa de arrastre vive DENTRO de la columna de acciones
 * (definida más abajo, agnóstica también), así que sus `attributes`/
 * `listeners` de dnd-kit viajan por este Context — es la única forma de
 * que un `celda`/`acciones` (una función, no un componente) los reciba sin
 * llamar el hook por su cuenta.
 */
const ContextoFilaArrastrable = createContext<{
  attributes: ReturnType<typeof useSortable>['attributes'];
  listeners: ReturnType<typeof useSortable>['listeners'];
  setActivatorNodeRef: ReturnType<typeof useSortable>['setActivatorNodeRef'];
} | null>(null);

function FilaLibroSortable({ fila, children }: { fila: Libro; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: fila.id });
  return (
    <ContextoFilaArrastrable.Provider value={{ attributes, listeners, setActivatorNodeRef }}>
      <tr
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className={`border-b border-border last:border-0 hover:bg-muted/50 ${isDragging ? 'relative z-10 bg-muted' : ''}`}
      >
        {children}
      </tr>
    </ContextoFilaArrastrable.Provider>
  );
}

/**
 * El asa (ícono de agarre) es lo único con los listeners de arrastre — el
 * resto de la fila sigue siendo clickeable sin iniciar un drag por
 * accidente. `setActivatorNodeRef` (no solo `attributes`/`listeners`) es
 * lo que le dice a dnd-kit que ESTE nodo, no el `<tr>` de `setNodeRef`, es
 * el que arranca el drag — sin esto la alternativa por teclado (Espacio,
 * flecha, Espacio) no activa: `KeyboardSensor` compara `event.target`
 * contra `active.activatorNode.current`.
 */
function AsaDeArrastre({ etiqueta }: { etiqueta: string }) {
  const contexto = useContext(ContextoFilaArrastrable);
  if (!contexto) return null;
  return (
    <button
      // eslint-disable-next-line react-hooks/refs -- falso positivo: pasar un callback ref recibido por Context es un patrón normal (no se lee .current acá), pero el linter lo confunde con leer un ref durante el render.
      ref={contexto.setActivatorNodeRef}
      type="button"
      aria-label={etiqueta}
      className="touch-none rounded p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
      // eslint-disable-next-line react-hooks/refs -- falso positivo: `contexto` tiene un ref-setter (setActivatorNodeRef) como propiedad hermana, pero attributes/listeners son objetos planos de dnd-kit, no refs — no se lee ningún .current acá.
      {...contexto.attributes}
      // eslint-disable-next-line react-hooks/refs -- mismo motivo que arriba.
      {...contexto.listeners}
    >
      <GripVertical className="size-4" aria-hidden="true" />
    </button>
  );
}

/** Envuelve la tabla en el `DndContext`/`SortableContext` de dnd-kit solo cuando el reorden está habilitado — sin overhead ni listeners de drag cuando no aplica (H-89). */
function EnvoltorioDnd({
  puedeReordenar,
  sensors,
  onDragEnd,
  libros,
  children,
}: {
  puedeReordenar: boolean;
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (event: DragEndEvent) => void;
  libros: Libro[];
  children: ReactNode;
}) {
  if (!puedeReordenar) return children;
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={libros.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

/**
 * Historia 4 (FR-018, D64): mismo patrón que SedesCliente. `libros` llega
 * ya cargado, filtrado y ordenado desde page.tsx. Pastor (`esAdmin: false`)
 * ve todo pero no tiene ni el botón "Crear Libro" ni columna de acciones.
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
  const [modalAbierto, setModalAbierto] = useState(false);
  const [errorAlta, setErrorAlta] = useState<string | null>(null);
  const [erroresCampoAlta, setErroresCampoAlta] = useState<ErrorDeCampo[] | null>(null);
  const te = useTranslations('errors');
  const { busqueda, setBusqueda, actualizarParams, limpiar } = useControlesTablaUrl();
  const hayAlgoAplicado = busqueda.trim() !== '' || filtro === 'todas';

  // H-89: reordenar (mover arriba/abajo, arrastrar) solo tiene sentido
  // sobre el orden manual real — con un filtro, una búsqueda o una columna
  // ordenada aplicados, lo que se ve en pantalla no es la posición real
  // (page.tsx ya lo explica del lado del servidor); mostrar ahí los
  // controles de reordenar invitaría a "reordenar" algo que no existe.
  const puedeReordenar = esAdmin && filtro === 'activas' && orden.columna === 'orden' && busqueda.trim() === '';
  const [reordenando, setReordenando] = useState(false);
  const [anuncioOrden, setAnuncioOrden] = useState('');

  async function persistirOrden(idsNuevoOrden: string[], anuncio: string) {
    setReordenando(true);
    try {
      await apiFetch('/libros/reordenar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ ids: idsNuevoOrden }),
      });
      // H-89: "se anuncien a lectores de pantalla" — región viva más abajo.
      setAnuncioOrden(anuncio);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos guardar el orden nuevo.');
    } finally {
      setReordenando(false);
    }
  }

  function mover(libro: Libro, direccion: -1 | 1) {
    if (reordenando) return;
    const indiceActual = libros.findIndex((l) => l.id === libro.id);
    const indiceDestino = indiceActual + direccion;
    if (indiceActual === -1 || indiceDestino < 0 || indiceDestino >= libros.length) return;
    const idsNuevoOrden = libros.map((l) => l.id);
    [idsNuevoOrden[indiceActual], idsNuevoOrden[indiceDestino]] = [idsNuevoOrden[indiceDestino], idsNuevoOrden[indiceActual]];
    void persistirOrden(idsNuevoOrden, `${libro.titulo}, posición ${indiceDestino + 1} de ${libros.length}.`);
  }

  // H-89 (paso 2): PointerSensor para mouse/touch, KeyboardSensor para la
  // alternativa por teclado de verdad (no negociable, Principio VII/WCAG
  // 2.2) — Espacio levanta la fila enfocada, flechas la mueven, Espacio la
  // suelta, Escape cancela. `sortableKeyboardCoordinates` es el algoritmo
  // que dnd-kit trae para listas verticales, no algo armado a mano acá.
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const idsActuales = libros.map((l) => l.id);
    const indiceActivo = idsActuales.indexOf(String(active.id));
    const indiceDestino = idsActuales.indexOf(String(over.id));
    if (indiceActivo === -1 || indiceDestino === -1) return;
    const idsNuevoOrden = arrayMove(idsActuales, indiceActivo, indiceDestino);
    const libro = libros[indiceActivo];
    void persistirOrden(idsNuevoOrden, `${libro.titulo}, posición ${indiceDestino + 1} de ${libros.length}.`);
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

      <ControlesTabla
        busqueda={busqueda}
        onBuscarChange={setBusqueda}
        etiquetaBusqueda="Buscar por título o autor/a"
        placeholderBusqueda="Ej. Antídotos, Natalia Spetale"
        filtros={
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
        }
        hayAlgoAplicado={hayAlgoAplicado}
        onLimpiar={() => limpiar(['estado'])}
        cantidadResultados={libros.length}
      />

      <EnvoltorioDnd puedeReordenar={puedeReordenar} sensors={sensors} onDragEnd={onDragEnd} libros={libros}>
      <TablaDatos
        columnas={columnas}
        datos={libros}
        obtenerId={(libro) => libro.id}
        etiqueta="Libros"
        mensajeVacio={
          busqueda.trim()
            ? `No encontramos Libros que coincidan con "${busqueda.trim()}".`
            : filtro === 'activas'
              ? 'Todavía no hay Libros activos.'
              : 'Todavía no hay Libros cargados.'
        }
        orden={orden}
        onOrdenar={(columnaId) =>
          actualizarParams({
            orden: columnaId === 'orden' ? null : columnaId,
            dir: orden.columna === columnaId && orden.direccion === 'asc' ? 'desc' : null,
          })
        }
        acciones={
          esAdmin
            ? (libro) => {
                const indice = libros.findIndex((l) => l.id === libro.id);
                return (
                  <div className="flex items-center justify-end gap-1">
                    {puedeReordenar && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Mover ${libro.titulo} hacia arriba`}
                          disabled={reordenando || indice <= 0}
                          onClick={() => mover(libro, -1)}
                        >
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Mover ${libro.titulo} hacia abajo`}
                          disabled={reordenando || indice === -1 || indice >= libros.length - 1}
                          onClick={() => mover(libro, 1)}
                        >
                          <ArrowDown className="size-4" />
                        </Button>
                        <AsaDeArrastre etiqueta={`Arrastrar para reordenar ${libro.titulo}`} />
                      </>
                    )}
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
                );
              }
            : undefined
        }
        EnvoltorioFila={puedeReordenar ? FilaLibroSortable : undefined}
      />
      </EnvoltorioDnd>
      {/* H-89: "que los movimientos se anuncien a lectores de pantalla" —
          región viva, sin texto visible fijo (el mensaje ya lo es). */}
      <p aria-live="polite" className="sr-only">
        {anuncioOrden}
      </p>

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
