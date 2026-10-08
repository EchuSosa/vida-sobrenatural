'use client';

import { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';
import { type BusquedaPersona, type Franja, erroresPorCampo } from '@vida-sobrenatural/shared-types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from './ui/sheet';
import { EditorDeFranjas, type EtiquetasEditorFranjas } from './editor-de-franjas';
import { MensajeErrorCampo, ResumenErrores } from './form-errors';
import { useEnvio } from '../hooks/use-envio';
import { useValidacionCampos } from '../hooks/use-validacion-campos';

export interface PersonaElegible {
  id: string;
  nombre: string;
  apellido: string;
}

/** Los textos, desde el next-intl de cada app (`packages/ui` no depende de Next). */
export interface EtiquetasPedirEnNombreDe {
  boton: string;
  titulo: string;
  tituloCon: (nombre: string) => string;
  descripcion: string;
  buscar: string;
  buscarAyuda: string;
  buscarPlaceholder: string;
  /** FR-029: para el Discipulador, que remita al equipo (sin alta). */
  sinResultados: (q: string) => string;
  enNombreDe: (nombre: string) => string;
  cambiar: string;
  franjasTitulo: string;
  personaRequerida: string;
  franjasRequeridas: string;
  resumenErrores: string;
  pedir: string;
  pidiendo: string;
  cerrarPanel: string;
  /** Para la búsqueda acotada del Discipulador, que trae la edad (spec 006, Pregunta 5). */
  edad: (edad: number) => string;
  franjas: EtiquetasEditorFranjas;
}

export interface PedirEnNombreDeProps {
  etiquetas: EtiquetasPedirEnNombreDe;
  /** `GET /personas/buscar` con el token de quien lo usa. */
  buscar: (q: string) => Promise<BusquedaPersona[]>;
  /** `POST /discipulado/solicitudes`; lanza el error de la API si no pudo. */
  enviar: (personaId: string, franjas: Franja[]) => Promise<{ id: string }>;
  /** El texto de un rechazo de la API (su código en `errors`), para mostrarlo arriba del formulario. */
  mensajeDeError: (error: unknown) => string;
  /** Si se pasa, la Persona ya viene elegida (sin buscador). */
  persona?: PersonaElegible;
  /** Después de crear la Solicitud (el aviso de éxito y `router.refresh()` los pone quien lo usa). */
  onCreado?: (solicitudId: string, nombre: string) => void;
}

/**
 * spec 006, T018 (FR-026, research #11): movido del backoffice a
 * `packages/ui` para que lo usen el Admin (bandeja) y el Discipulador (web
 * app) sin copiarlo; sin Next ni `apiFetch` — recibe `buscar`, `enviar` y los
 * textos por props.
 *
 * specs/004, FR-002 (T020): el Admin o un Discipulador piden Vida Nueva en
 * nombre de otra Persona (típicamente sin acceso a la app, D97) — el buscador
 * de `GET /personas/buscar` (patrón del buscador de tutor de
 * pendientes-tutor), el editor de franjas de packages/ui y "Pedir Vida
 * Nueva". El nombre de la Persona queda visible durante toda la acción
 * (docs/15, "en nombre de otra Persona"). Lo usan /solicitudes (T027) y
 * /mis-discipulados (T046, lote B). El permiso lo decide quien lo monta
 * (`solicitudes.crear_en_nombre`).
 */
export function PedirEnNombreDe({ etiquetas, buscar, enviar, mensajeDeError, persona: personaFija, onCreado }: PedirEnNombreDeProps) {
  const [abierto, setAbierto] = useState(false);
  const [instancia, setInstancia] = useState(0);

  return (
    <Sheet
      open={abierto}
      onOpenChange={(valor) => {
        setAbierto(valor);
        // Cada apertura arranca de cero: el contenido se remonta en vez de limpiarse con un efecto.
        if (valor) setInstancia((n) => n + 1);
      }}
    >
      <Button type="button" onClick={() => setAbierto(true)} className="h-11 self-start text-base">
        {etiquetas.boton}
      </Button>
      <SheetContent side="right" etiquetaCerrar={etiquetas.cerrarPanel}>
        <Contenido
          key={instancia}
          etiquetas={etiquetas}
          buscar={buscar}
          enviar={enviar}
          mensajeDeError={mensajeDeError}
          personaFija={personaFija}
          onCreado={(id, nombre) => {
            setAbierto(false);
            onCreado?.(id, nombre);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

function Contenido({
  etiquetas: e,
  buscar,
  enviar,
  mensajeDeError,
  personaFija,
  onCreado,
}: Omit<PedirEnNombreDeProps, 'persona' | 'onCreado'> & {
  personaFija?: PersonaElegible;
  onCreado: (solicitudId: string, nombre: string) => void;
}) {
  const [persona, setPersona] = useState<PersonaElegible | null>(personaFija ?? null);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<BusquedaPersona[] | null>(null);
  const [franjas, setFranjas] = useState<Franja[]>([]);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const validacion = useValidacionCampos();
  const nombre = persona ? `${persona.nombre} ${persona.apellido}` : '';

  useEffect(() => {
    if (persona || busqueda.trim().length < 2) return;
    const idTimeout = setTimeout(async () => {
      try {
        setResultados(await buscar(busqueda.trim()));
      } catch {
        // Búsqueda incidental: si falla, se puede volver a escribir.
      }
    }, 300);
    return () => clearTimeout(idTimeout);
  }, [busqueda, persona, buscar]);

  const { enviando, ejecutar: pedir } = useEnvio(async () => {
    setErrorGeneral(null);
    const errores: Record<string, string> = {};
    if (!persona) errores.persona = e.personaRequerida;
    if (franjas.length === 0) errores.franjas = e.franjasRequeridas;
    if (!persona || Object.keys(errores).length > 0) {
      validacion.reemplazar(errores);
      return;
    }
    try {
      const creada = await enviar(persona.id, franjas);
      onCreado(creada.id, nombre);
    } catch (error) {
      if (erroresPorCampo(error)) {
        validacion.reemplazar({ franjas: e.franjasRequeridas });
        return;
      }
      // FR-017 y los de la 004 (pedido abierto, en curso…): debajo del buscador, con el porqué.
      setErrorGeneral(mensajeDeError(error));
    }
  });

  return (
    <form
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault();
        void pedir();
      }}
      className="flex h-full flex-col"
    >
      <SheetHeader>
        <SheetTitle>{persona ? e.tituloCon(nombre) : e.titulo}</SheetTitle>
        <SheetDescription>{e.descripcion}</SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
        {errorGeneral && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorGeneral}
          </p>
        )}
        <ResumenErrores errores={validacion.resumen} foco={validacion.foco} titulo={e.resumenErrores} />

        {persona ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
            <p className="flex items-center gap-2">
              <UserRound aria-hidden className="size-4 shrink-0" />
              <span>{e.enNombreDe(nombre)}</span>
            </p>
            {!personaFija && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setPersona(null)} disabled={enviando}>
                {e.cambiar}
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label className="text-base font-medium" htmlFor="campo-persona">
              {e.buscar}
            </label>
            <p id="campo-persona-ayuda" className="text-base text-muted-foreground">
              {e.buscarAyuda}
            </p>
            <Input
              id="campo-persona"
              placeholder={e.buscarPlaceholder}
              value={busqueda}
              autoComplete="off"
              onChange={(e) => {
                setBusqueda(e.target.value);
                if (e.target.value.trim().length < 2) setResultados(null);
              }}
              aria-invalid={Boolean(validacion.mensajes.persona) || undefined}
              aria-describedby={validacion.mensajes.persona ? 'campo-persona-error' : 'campo-persona-ayuda'}
              className="h-11"
            />
            <MensajeErrorCampo id="campo-persona-error" mensaje={validacion.mensajes.persona} />
            {resultados && resultados.length === 0 && (
              <p className="text-sm text-muted-foreground">{e.sinResultados(busqueda.trim())}</p>
            )}
            {resultados && resultados.length > 0 && (
              <ul className="flex flex-col gap-1 rounded-lg border border-border p-1">
                {resultados.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="min-h-11 w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setPersona({ id: r.id, nombre: r.nombre, apellido: r.apellido });
                        setBusqueda('');
                        setResultados(null);
                        validacion.limpiar('persona');
                      }}
                    >
                      <span className="font-medium">
                        {r.nombre} {r.apellido}
                      </span>{' '}
                      <span className="text-muted-foreground">
                        {r.edad !== undefined && ` — ${e.edad(r.edad)}`}
                        {r.email && ` — ${r.email}`}
                        {r.telefono && ` — ${r.telefono}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <fieldset
          id="campo-franjas"
          tabIndex={-1}
          aria-describedby={validacion.mensajes.franjas ? 'campo-franjas-error' : undefined}
          className="flex flex-col gap-2 outline-none"
        >
          <legend className="mb-2 text-base font-medium">{e.franjasTitulo}</legend>
          <EditorDeFranjas
            value={franjas}
            onChange={(nuevas) => {
              setFranjas(nuevas);
              if (nuevas.length > 0) validacion.limpiar('franjas');
            }}
            etiquetas={e.franjas}
            idBase="franja-en-nombre"
            disabled={enviando}
          />
          <MensajeErrorCampo id="campo-franjas-error" mensaje={validacion.mensajes.franjas} />
        </fieldset>
      </div>

      <SheetFooter>
        <Button type="submit" loading={enviando} loadingText={e.pidiendo} className="h-11">
          {e.pedir}
        </Button>
      </SheetFooter>
    </form>
  );
}
