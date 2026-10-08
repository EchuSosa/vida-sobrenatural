'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  type PersonaPendienteTutor,
  type BusquedaPersona,
  type ErrorCode,
  type Pagina,
  TELEFONO_REGEX,
  apiFetch,
  ApiError,
  erroresPorCampo,
  mensajeDeCampo,
  formatearFechaCorta,
  formatearFechaHora,
} from '@vida-sobrenatural/shared-types';
import {
  Button,
  CampoTelefono,
  ConfirmDestructiveDialog,
  ControlesTabla,
  Input,
  MensajeErrorCampo,
  Paginacion,
  ResumenErrores,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  TablaDatos,
  type ColumnaTabla,
  type OrdenTabla,
  useEnvio,
  useValidacionCampos,
  type ValidacionCampo,
} from '@vida-sobrenatural/ui';
import { toast } from 'sonner';
import { useControlesTablaUrl } from '../../hooks/use-controles-tabla-url';
import { EnlacePersona } from '../../components/enlace-persona';

/**
 * Cierre de H-101 (D-paginado, antes de la spec 004): `pagina` llega ya
 * cargada desde page.tsx (Server Component) — SIN isla de cliente que
 * traiga datos. "Cargar más" (H-42/H-43, la excepción que esto tenía
 * antes) desapareció junto con el estado que acumulaba: no hay más
 * `apiFetch` en este archivo para pedir la lista, ni estado que
 * sincronizar con una prop que cambia — la única prop que cambia
 * (`pagina`, en cada request nueva) YA es la fuente de verdad completa de
 * lo que hay que mostrar, sin acumular nada de una request a la anterior.
 *
 * Lo que sigue en cliente es solo lo que de verdad lo necesita:
 * interactividad (Activar, Cerrar el caso, sus diálogos) y la
 * sincronización de `busqueda`/orden/página con la URL. Después de
 * Activar/Cerrar el caso, `router.refresh()` vuelve a pedir la MISMA URL
 * al servidor (misma página, mismo orden, misma búsqueda) — si esa acción
 * dejó la página actual vacía (era el último caso de la última página),
 * page.tsx ya resuelve eso solo: el mecanismo de "`?pagina=` más allá de
 * la última real" (ver su comentario) redirige a la nueva última página
 * válida, sin código extra acá.
 */
export function PendientesTutorCliente({
  pagina,
  paginaActual,
  totalPaginas,
  apiToken,
  orden,
  puedeGestionar,
}: {
  pagina: Pagina<PersonaPendienteTutor>;
  paginaActual: number;
  totalPaginas: number;
  apiToken: string;
  orden: OrdenTabla;
  /** T070: Activar y Cerrar el caso — `pendientes_tutor.gestionar`. El Pastor ve la lista (D64) sin estas acciones. */
  puedeGestionar: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParamsNav = useSearchParams();
  const [personaParaActivar, setPersonaParaActivar] = useState<PersonaPendienteTutor | null>(null);
  const te = useTranslations('errors');
  const locale = useLocale();
  // C3: cambiar la búsqueda tiene que volver a la página 1 (si no, buscar
  // algo con 3 resultados estando en la página 4 muestra vacío) — mismo
  // motivo para `limpiar(['pagina'])` y para el `pagina: null` explícito en
  // `onOrdenar`, más abajo.
  const { busqueda, setBusqueda, actualizarParams, limpiar } = useControlesTablaUrl({
    clavesAReiniciarConBusqueda: ['pagina'],
  });

  /** B2: `Paginacion` (packages/ui) no puede armar la URL — se la pasamos desde acá, enlace de verdad, no un botón con onClick. */
  function construirHrefPagina(numeroPagina: number): string {
    const params = new URLSearchParams(searchParamsNav);
    if (numeroPagina <= 1) params.delete('pagina');
    else params.set('pagina', String(numeroPagina));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  // H-57: el guard va también en el envío, no solo en el botón que lo
  // dispara (ConfirmDestructiveDialog ya lo cierra al confirmar).
  const { ejecutar: marcarInactiva } = useEnvio(async (id: string) => {
    try {
      await apiFetch(`/personas/${id}/marcar-inactiva`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      toast('Caso cerrado.');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos cerrar este caso.');
    }
  });

  // Revisión del criterio de H-88: "ordenar en cliente sería incorrecto
  // acá" (sigue siendo cierto — esto es una cola que pagina de verdad) NO
  // significaba "no ordenar" — significaba que el orden tiene que
  // resolverlo la API, igual que ya hace `buscar` (ver page.tsx). Nombre y
  // fecha de solicitud (createdAt) son las dos columnas ordenables; el
  // orden por defecto sigue siendo por fecha de solicitud, como siempre.
  const columnas: ColumnaTabla<PersonaPendienteTutor>[] = [
    {
      id: 'nombre',
      encabezado: 'Nombre',
      ordenable: true,
      celda: (persona) => (
        // spec 013 (T034): el nombre lleva al perfil.
        <EnlacePersona persona={persona} className="font-medium" />
      ),
    },
    {
      id: 'contacto',
      encabezado: 'Contacto',
      className: 'hidden sm:table-cell',
      celda: (persona) => (
        <span className="text-muted-foreground">
          {persona.telefono} — Nació: {formatearFechaCorta(persona.fechaNacimiento, locale)}
        </span>
      ),
    },
    {
      id: 'createdAt',
      encabezado: 'Solicitado',
      ordenable: true,
      className: 'hidden sm:table-cell',
      celda: (persona) => formatearFechaHora(persona.createdAt, locale),
    },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Casos pendientes de tutor</h1>
      <p className="text-muted-foreground">
        Menores de 18 años que intentaron registrarse (Historia 2b) — contactá al tutor antes de
        activar o cerrar el caso.
      </p>

      <ControlesTabla
        busqueda={busqueda}
        onBuscarChange={setBusqueda}
        etiquetaBusqueda="Buscar por nombre, apellido o teléfono"
        placeholderBusqueda="Ej. Juan Demo"
        hayAlgoAplicado={busqueda.trim() !== ''}
        onLimpiar={() => limpiar(['pagina'])}
        cantidadResultados={pagina.total}
      />

      <TablaDatos
        columnas={columnas}
        datos={pagina.items}
        obtenerId={(persona) => persona.id}
        etiqueta="Casos pendientes de tutor"
        mensajeVacio={
          busqueda.trim() ? `No encontramos casos que coincidan con "${busqueda.trim()}".` : 'No hay casos pendientes por ahora.'
        }
        orden={orden}
        onOrdenar={(columnaId) =>
          actualizarParams({
            orden: columnaId === 'createdAt' ? null : columnaId,
            dir: orden.columna === columnaId && orden.direccion === 'asc' ? 'desc' : null,
            // C3: cambiar el orden también vuelve a la página 1 — mismo motivo que la búsqueda.
            pagina: null,
          })
        }
        encabezadoAcciones={puedeGestionar ? 'Acciones' : undefined}
        acciones={puedeGestionar ? (persona) => (
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" onClick={() => setPersonaParaActivar(persona)}>
              Activar
            </Button>
            <ConfirmDestructiveDialog
              trigger={
                <Button variant="outline" size="sm">
                  Cerrar el caso
                </Button>
              }
              titulo={`¿Cerrar el caso de ${persona.nombre} ${persona.apellido}?`}
              descripcion="Confirmá que el tutor no autoriza el registro, o que no se lo pudo contactar. La Persona sale de esta lista; no se borra nada."
              textoConfirmar="Sí, cerrar el caso"
              textoCancelar="Volver"
              onConfirmar={() => marcarInactiva(persona.id)}
            />
          </div>
        ) : undefined}
      />

      <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} renderEnlace={(p) => <Link href={construirHrefPagina(p)} />} etiquetaNav="Paginado de casos pendientes de tutor" />

      <ActivarDialog
        key={personaParaActivar?.id ?? 'cerrado'}
        persona={personaParaActivar}
        apiToken={apiToken}
        onCerrar={() => setPersonaParaActivar(null)}
        onActivado={() => {
          setPersonaParaActivar(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function ActivarDialog({
  persona,
  apiToken,
  onCerrar,
  onActivado,
}: {
  persona: PersonaPendienteTutor | null;
  apiToken: string | undefined;
  onCerrar: () => void;
  onActivado: () => void;
}) {
  const te = useTranslations('errors');
  const tc = useTranslations('comun');
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<BusquedaPersona[]>([]);
  const [tutorElegido, setTutorElegido] = useState<BusquedaPersona | null>(null);
  const [tutorNombre, setTutorNombre] = useState('');
  // H-71 (revisión manual ronda 7): nombre y apellido separados, igual que
  // en el resto de la app (Persona ya los separa) — antes era un solo
  // campo de texto libre.
  const [tutorApellido, setTutorApellido] = useState('');
  const [tutorCodigoPais, setTutorCodigoPais] = useState('+54');
  const [tutorNumero, setTutorNumero] = useState('');
  const [error, setError] = useState<string | null>(null);
  // H-72 (revisión manual ronda 7): un error se limpia al escribir y se
  // revalida al salir del campo. Pieza compartida (H-50), usada igual en
  // los seis formularios.
  const validacion = useValidacionCampos();

  const ETIQUETAS_TUTOR: Record<string, string> = {
    tutorNombre: 'Nombre del tutor',
    tutorApellido: 'Apellido del tutor',
    tutorTelefono: 'Teléfono del tutor',
  };
  const requerido: ValidacionCampo<string> = { esValido: (v) => v.trim() !== '', mensaje: 'Revisá este dato.' };
  const validaciones = {
    tutorNombre: requerido,
    tutorApellido: requerido,
    tutorTelefono: {
      esValido: (v: { codigoPais: string; numero: string }) => TELEFONO_REGEX.test(`${v.codigoPais} ${v.numero}`),
      mensaje: mensajeDeCampo('TUTORTELEFONO_INVALIDO', ETIQUETAS_TUTOR.tutorTelefono),
    } satisfies ValidacionCampo<{ codigoPais: string; numero: string }>,
  };

  // El estado interno se resetea remontando este componente (key={persona?.id}
  // en el padre) en vez de un efecto que lo limpie al cerrar — evita
  // setState síncrono dentro de un efecto (react-hooks/set-state-in-effect).
  const resultadosVisibles = tutorElegido ? [] : resultados;

  useEffect(() => {
    if (!persona || tutorElegido || busqueda.trim().length < 2) return;
    const idTimeout = setTimeout(async () => {
      try {
        const datos = await apiFetch<BusquedaPersona[]>(
          `/personas/buscar?q=${encodeURIComponent(busqueda)}`,
          { headers: { Authorization: `Bearer ${apiToken}` } },
        );
        setResultados(datos);
      } catch {
        // Búsqueda incidental — un error acá no bloquea completar el resto
        // del formulario a mano.
      }
    }, 300);
    return () => clearTimeout(idTimeout);
  }, [busqueda, tutorElegido, persona, apiToken]);

  const { enviando, ejecutar: activar } = useEnvio(async () => {
    if (!persona) return;
    setError(null);
    validacion.reset();
    try {
      const body = tutorElegido
        ? { tutorPersonaId: tutorElegido.id }
        : { tutorNombre, tutorApellido, tutorTelefono: `${tutorCodigoPais} ${tutorNumero}` };
      await apiFetch(`/personas/${persona.id}/activar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify(body),
      });
      toast(`${persona.nombre} ${persona.apellido}: caso activado.`);
      onActivado();
    } catch (e) {
      // H-50: además del código general del error, ver si hay {campo, code}
      // por cada campo (ej. tutorTelefono mal formado) para mostrar debajo
      // del campo en vez de solo un mensaje genérico.
      const campos = erroresPorCampo(e);
      if (campos) {
        validacion.reemplazar(
          Object.fromEntries(campos.map(({ campo, code }) => [campo, mensajeDeCampo(code, ETIQUETAS_TUTOR[campo] ?? campo)])),
        );
      }
      setError(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos activar a esta Persona.');
    }
  });

  const puedeEnviar =
    tutorElegido !== null ||
    (tutorNombre.trim() !== '' && tutorApellido.trim() !== '' && tutorNumero.trim() !== '');

  return (
    <Sheet open={!!persona} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <SheetContent side="right" etiquetaCerrar={tc('cerrarPanel')}>
        <SheetHeader>
          <SheetTitle>Activar a {persona ? `${persona.nombre} ${persona.apellido}` : ''}</SheetTitle>
          <SheetDescription>
            Buscá al tutor si ya está registrado y se congrega, o cargá sus datos a mano.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <ResumenErrores errores={validacion.resumen} foco={validacion.foco} />

          {tutorElegido ? (
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="font-medium">
                  {tutorElegido.nombre} {tutorElegido.apellido}
                </p>
                <p className="text-sm text-muted-foreground">
                  {/* spec 006 (FR-038): el email es opcional (D145). */}
                  {[tutorElegido.email, tutorElegido.telefono].filter(Boolean).join(' — ')}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setTutorElegido(null)}>
                Quitar
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="buscar-tutor">
                  Buscar tutor ya registrado (opcional)
                </label>
                <Input
                  id="buscar-tutor"
                  placeholder="Nombre, email o teléfono"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                {resultadosVisibles.length > 0 && (
                  <ul className="flex flex-col gap-1 rounded-lg border border-border p-1">
                    {resultadosVisibles.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            setTutorElegido(r);
                            setBusqueda('');
                            setResultados([]);
                          }}
                        >
                          <span className="font-medium">
                            {r.nombre} {r.apellido}
                          </span>{' '}
                          <span className="text-muted-foreground">
                            {/* H-75 (revisión manual ronda 8): sin el `&&`, una Persona sin
                                teléfono (campo vacío, no ausente — el modelo lo pide siempre)
                                dejaba un guion final colgando, sin nada después. */}
                            {/* spec 006 (FR-038): el email es opcional (D145). */}
                            {r.email && ` — ${r.email}`}
                            {r.telefono && ` — ${r.telefono}`}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Separador texto="o" />

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="campo-tutorNombre">
                  Nombre del tutor
                </label>
                <Input
                  id="campo-tutorNombre"
                  value={tutorNombre}
                  onChange={(e) => {
                    setTutorNombre(e.target.value);
                    validacion.limpiar('tutorNombre');
                  }}
                  onBlur={() => validacion.revalidar('tutorNombre', tutorNombre, validaciones.tutorNombre)}
                  aria-invalid={Boolean(validacion.mensajes.tutorNombre)}
                  aria-describedby={validacion.mensajes.tutorNombre ? 'campo-tutorNombre-error' : undefined}
                />
                <MensajeErrorCampo id="campo-tutorNombre-error" mensaje={validacion.mensajes.tutorNombre} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="campo-tutorApellido">
                  Apellido del tutor
                </label>
                <Input
                  id="campo-tutorApellido"
                  value={tutorApellido}
                  onChange={(e) => {
                    setTutorApellido(e.target.value);
                    validacion.limpiar('tutorApellido');
                  }}
                  onBlur={() => validacion.revalidar('tutorApellido', tutorApellido, validaciones.tutorApellido)}
                  aria-invalid={Boolean(validacion.mensajes.tutorApellido)}
                  aria-describedby={validacion.mensajes.tutorApellido ? 'campo-tutorApellido-error' : undefined}
                />
                <MensajeErrorCampo id="campo-tutorApellido-error" mensaje={validacion.mensajes.tutorApellido} />
              </div>
              <CampoTelefono
                id="campo-tutorTelefono"
                labelTelefono="Teléfono del tutor"
                labelCodigo="Código de país"
                codigoPais={tutorCodigoPais}
                numero={tutorNumero}
                onChangeCodigo={(v) => {
                  setTutorCodigoPais(v);
                  validacion.limpiar('tutorTelefono');
                }}
                onChangeNumero={(v) => {
                  setTutorNumero(v);
                  validacion.limpiar('tutorTelefono');
                }}
                onBlurNumero={() =>
                  validacion.revalidar(
                    'tutorTelefono',
                    { codigoPais: tutorCodigoPais, numero: tutorNumero },
                    validaciones.tutorTelefono,
                  )
                }
                error={Boolean(validacion.mensajes.tutorTelefono)}
                errorTexto={validacion.mensajes.tutorTelefono}
              />
            </>
          )}
        </div>

        <SheetFooter>
          <Button onClick={() => void activar()} disabled={!puedeEnviar} loading={enviando} loadingText="Activando…">
            Activar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Separador({ texto }: { texto: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="h-px flex-1 bg-border" />
      {texto}
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
