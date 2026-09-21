'use client';

import { useCallback, useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import {
  type PersonaPendienteTutor,
  type BusquedaPersona,
  type ErrorCode,
  type Pagina,
  apiFetch,
  ApiError,
  erroresPorCampo,
  mensajeDeCampo,
} from '@vida-sobrenatural/shared-types';
import {
  Button,
  ConfirmDestructiveDialog,
  Input,
  MensajeErrorCampo,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  useEnvio,
} from '@vida-sobrenatural/ui';
import { toast } from 'sonner';

/**
 * H-29 (revisión manual, actualización 2026-09-20, D94/D102/D108): activar
 * y marcar inactiva pasan del alert/prompt/confirm nativo del navegador al
 * sistema de diseño. Activar ofrece vincular al tutor como Relación
 * Familiar (si ya está registrado) o cargar sus datos como texto libre — no
 * las dos cosas.
 */
// H-42 (revisión manual, revisión de código): GET /personas/pendientes-tutor pagina.
const TAMANIO_PAGINA = 20;

export default function PendientesTutorPage() {
  const { data: session, status } = useSession();
  const [pendientes, setPendientes] = useState<PersonaPendienteTutor[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [personaParaActivar, setPersonaParaActivar] = useState<PersonaPendienteTutor | null>(null);
  const te = useTranslations('errors');

  const cargarPendientes = useCallback(async () => {
    if (!session?.apiToken) return;
    setCargando(true);
    setError(null);
    try {
      const pagina = await apiFetch<Pagina<PersonaPendienteTutor>>(
        `/personas/pendientes-tutor?skip=0&take=${TAMANIO_PAGINA}`,
        { headers: { Authorization: `Bearer ${session.apiToken}` } },
      );
      setPendientes(pagina.items);
      setTotal(pagina.total);
    } catch (e) {
      setError(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos cargar la lista de pendientes.');
    } finally {
      setCargando(false);
    }
  }, [session, te]);

  async function cargarMas() {
    if (!session?.apiToken) return;
    setCargandoMas(true);
    try {
      const pagina = await apiFetch<Pagina<PersonaPendienteTutor>>(
        `/personas/pendientes-tutor?skip=${pendientes.length}&take=${TAMANIO_PAGINA}`,
        { headers: { Authorization: `Bearer ${session.apiToken}` } },
      );
      setPendientes((actuales) => [...actuales, ...pagina.items]);
      setTotal(pagina.total);
    } catch (e) {
      toast.error(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos cargar más casos.');
    } finally {
      setCargandoMas(false);
    }
  }

  useEffect(() => {
    async function ejecutar() {
      await cargarPendientes();
    }
    ejecutar();
  }, [cargarPendientes]);

  // H-57: el guard va también en el envío, no solo en el botón que lo
  // dispara (ConfirmDestructiveDialog ya lo cierra al confirmar).
  const { ejecutar: marcarInactiva } = useEnvio(async (id: string) => {
    try {
      await apiFetch(`/personas/${id}/marcar-inactiva`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session?.apiToken}` },
      });
      toast('Persona marcada como inactiva.');
      await cargarPendientes();
    } catch (e) {
      toast.error(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos marcar como inactiva a esta Persona.');
    }
  });

  if (status === 'loading') {
    return <div className="mx-auto max-w-3xl px-4 py-16">Cargando…</div>;
  }

  if (status === 'unauthenticated') {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold">Casos pendientes de tutor</h1>
        <Button onClick={() => signIn('google')}>Continuar con Google</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Casos pendientes de tutor</h1>
      <p className="text-muted-foreground">
        Menores de 18 años que intentaron registrarse (Historia 2b) — contactá al tutor antes de
        activar o cerrar el caso.
      </p>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {!cargando && pendientes.length === 0 && !error && (
        <p className="text-muted-foreground">No hay casos pendientes por ahora.</p>
      )}

      <ul className="flex flex-col gap-3">
        {pendientes.map((persona) => (
          <li
            key={persona.id}
            className="flex flex-col gap-2 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium">
                {persona.nombre} {persona.apellido}
              </p>
              <p className="text-sm text-muted-foreground">
                Tel: {persona.telefono} — Nació: {persona.fechaNacimiento}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setPersonaParaActivar(persona)}>
                Activar
              </Button>
              <ConfirmDestructiveDialog
                trigger={
                  <Button variant="outline" size="sm">
                    Marcar inactiva
                  </Button>
                }
                titulo={`¿Marcar inactiva a ${persona.nombre} ${persona.apellido}?`}
                descripcion="Confirmá que el tutor no autoriza el registro, o que no se lo pudo contactar. La Persona sale de esta lista; no se borra nada."
                textoConfirmar="Sí, marcar inactiva"
                textoCancelar="Volver"
                onConfirmar={() => marcarInactiva(persona.id)}
              />
            </div>
          </li>
        ))}
      </ul>

      {pendientes.length < total && (
        <Button variant="outline" onClick={cargarMas} disabled={cargandoMas} className="self-start">
          {cargandoMas ? 'Cargando…' : `Cargar más (${pendientes.length} de ${total})`}
        </Button>
      )}

      <ActivarDialog
        key={personaParaActivar?.id ?? 'cerrado'}
        persona={personaParaActivar}
        apiToken={session?.apiToken}
        onCerrar={() => setPersonaParaActivar(null)}
        onActivado={async () => {
          setPersonaParaActivar(null);
          await cargarPendientes();
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
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<BusquedaPersona[]>([]);
  const [tutorElegido, setTutorElegido] = useState<BusquedaPersona | null>(null);
  const [tutorNombre, setTutorNombre] = useState('');
  const [tutorTelefono, setTutorTelefono] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mensajesCampo, setMensajesCampo] = useState<Record<string, string>>({});

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
    setMensajesCampo({});
    try {
      const body = tutorElegido ? { tutorPersonaId: tutorElegido.id } : { tutorNombre, tutorTelefono };
      await apiFetch(`/personas/${persona.id}/activar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify(body),
      });
      toast(`${persona.nombre} ${persona.apellido} activada.`);
      onActivado();
    } catch (e) {
      // H-50: además del código general del error, ver si hay {campo, code}
      // por cada campo (ej. tutorTelefono mal formado) para mostrar debajo
      // del campo en vez de solo un mensaje genérico.
      const campos = erroresPorCampo(e);
      if (campos) {
        setMensajesCampo(
          Object.fromEntries(
            campos.map(({ campo, code }) => [
              campo,
              mensajeDeCampo(code, campo === 'tutorNombre' ? 'Nombre del tutor' : 'Teléfono del tutor'),
            ]),
          ),
        );
      }
      setError(e instanceof ApiError ? te(e.code as ErrorCode) : 'No pudimos activar a esta Persona.');
    }
  });

  const puedeEnviar = tutorElegido !== null || (tutorNombre.trim() !== '' && tutorTelefono.trim() !== '');

  return (
    <Sheet open={!!persona} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Activar a {persona ? `${persona.nombre} ${persona.apellido}` : ''}</SheetTitle>
          <SheetDescription>
            Buscá al tutor si ya está registrado y se congrega, o cargá sus datos a mano.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}

          {tutorElegido ? (
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="font-medium">
                  {tutorElegido.nombre} {tutorElegido.apellido}
                </p>
                <p className="text-sm text-muted-foreground">
                  {tutorElegido.email} — {tutorElegido.telefono}
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
                            — {r.email} — {r.telefono}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Separador texto="o" />

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="tutor-nombre">
                  Nombre del tutor
                </label>
                <Input
                  id="tutor-nombre"
                  value={tutorNombre}
                  onChange={(e) => setTutorNombre(e.target.value)}
                  aria-invalid={Boolean(mensajesCampo.tutorNombre)}
                  aria-describedby={mensajesCampo.tutorNombre ? 'tutor-nombre-error' : undefined}
                />
                <MensajeErrorCampo id="tutor-nombre-error" mensaje={mensajesCampo.tutorNombre} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="tutor-telefono">
                  Teléfono del tutor
                </label>
                <Input
                  id="tutor-telefono"
                  value={tutorTelefono}
                  onChange={(e) => setTutorTelefono(e.target.value)}
                  aria-invalid={Boolean(mensajesCampo.tutorTelefono)}
                  aria-describedby={mensajesCampo.tutorTelefono ? 'tutor-telefono-error' : undefined}
                />
                <MensajeErrorCampo id="tutor-telefono-error" mensaje={mensajesCampo.tutorTelefono} />
              </div>
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
