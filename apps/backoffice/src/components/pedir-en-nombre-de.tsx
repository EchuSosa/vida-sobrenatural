'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { UserRound } from 'lucide-react';
import { type BusquedaPersona, type Franja, ApiError, apiFetch, erroresPorCampo } from '@vida-sobrenatural/shared-types';
import {
  Button,
  EditorDeFranjas,
  Input,
  MensajeErrorCampo,
  ResumenErrores,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  useEnvio,
  useValidacionCampos,
  type EtiquetasEditorFranjas,
} from '@vida-sobrenatural/ui';

export interface PersonaElegible {
  id: string;
  nombre: string;
  apellido: string;
}

export interface PedirEnNombreDeProps {
  apiToken: string;
  /** Si se pasa, la Persona ya viene elegida (sin buscador). */
  persona?: PersonaElegible;
  /** Después de crear la Solicitud; por ejemplo, `router.refresh()`. */
  onCreado?: (solicitudId: string) => void;
}

/**
 * specs/004, FR-002 (T020): el Admin o un Discipulador piden Vida Nueva en
 * nombre de otra Persona (típicamente sin acceso a la app, D97) — el buscador
 * de `GET /personas/buscar` (patrón del buscador de tutor de
 * pendientes-tutor), el editor de franjas de packages/ui y "Pedir Vida
 * Nueva". El nombre de la Persona queda visible durante toda la acción
 * (docs/15, "en nombre de otra Persona"). Lo usan /solicitudes (T027) y
 * /mis-discipulados (T046, lote B). El permiso lo decide quien lo monta
 * (`solicitudes.crear_en_nombre`).
 */
export function PedirEnNombreDe({ apiToken, persona: personaFija, onCreado }: PedirEnNombreDeProps) {
  const t = useTranslations('solicitudes.pedirEnNombre');
  const tc = useTranslations('comun');
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
      <Button type="button" onClick={() => setAbierto(true)} className="h-11 self-start">
        {t('boton')}
      </Button>
      <SheetContent side="right" etiquetaCerrar={tc('cerrarPanel')}>
        <Contenido
          key={instancia}
          apiToken={apiToken}
          personaFija={personaFija}
          onCreado={(id) => {
            setAbierto(false);
            onCreado?.(id);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

function useEtiquetasFranjas(): EtiquetasEditorFranjas {
  const t = useTranslations('franjas');
  const te = useTranslations('errors');
  return {
    dias: t.raw('dias') as EtiquetasEditorFranjas['dias'],
    dia: t('dia'),
    desde: t('desde'),
    hasta: t('hasta'),
    hora: t('hora'),
    minutos: t('minutos'),
    agregar: t('agregar'),
    quitar: t('quitar'),
    sinFranjas: t('sinFranjas'),
    errorRango: t('errorRango'),
    errorMuyCorta: te('campos.FRANJA_MUY_CORTA'),
    errorRepetida: te('campos.FRANJA_REPETIDA'),
    errorSuperpuesta: te('campos.FRANJA_SUPERPUESTA'),
    separador: t('separador'),
  };
}

function Contenido({
  apiToken,
  personaFija,
  onCreado,
}: {
  apiToken: string;
  personaFija?: PersonaElegible;
  onCreado: (solicitudId: string) => void;
}) {
  const t = useTranslations('solicitudes.pedirEnNombre');
  const te = useTranslations('errors');
  const etiquetas = useEtiquetasFranjas();
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
        setResultados(
          await apiFetch<BusquedaPersona[]>(`/personas/buscar?q=${encodeURIComponent(busqueda.trim())}`, {
            headers: { Authorization: `Bearer ${apiToken}` },
          }),
        );
      } catch {
        // Búsqueda incidental: si falla, se puede volver a escribir.
      }
    }, 300);
    return () => clearTimeout(idTimeout);
  }, [busqueda, persona, apiToken]);

  const { enviando, ejecutar: pedir } = useEnvio(async () => {
    setErrorGeneral(null);
    const errores: Record<string, string> = {};
    if (!persona) errores.persona = t('personaRequerida');
    if (franjas.length === 0) errores.franjas = t('franjasRequeridas');
    if (!persona || Object.keys(errores).length > 0) {
      validacion.reemplazar(errores);
      return;
    }
    try {
      const creada = await apiFetch<{ id: string }>('/discipulado/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ personaId: persona.id, franjas }),
      });
      toast.success(t('creado', { nombre }));
      onCreado(creada.id);
    } catch (error) {
      if (erroresPorCampo(error)) {
        validacion.reemplazar({ franjas: t('franjasRequeridas') });
        return;
      }
      const code = error instanceof ApiError ? error.code : null;
      setErrorGeneral(code && te.has(code) ? te(code) : t('errores.generico'));
    }
  });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void pedir();
      }}
      className="flex h-full flex-col"
    >
      <SheetHeader>
        <SheetTitle>{persona ? t('tituloCon', { nombre }) : t('titulo')}</SheetTitle>
        <SheetDescription>{t('descripcion')}</SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
        {errorGeneral && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorGeneral}
          </p>
        )}
        <ResumenErrores errores={validacion.resumen} foco={validacion.foco} titulo={t('resumenErrores')} />

        {persona ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
            <p className="flex items-center gap-2">
              <UserRound aria-hidden className="size-4 shrink-0" />
              <span>{t('enNombreDe', { nombre })}</span>
            </p>
            {!personaFija && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setPersona(null)} disabled={enviando}>
                {t('cambiar')}
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="campo-persona">
              {t('buscar')}
            </label>
            <p id="campo-persona-ayuda" className="text-sm text-muted-foreground">
              {t('buscarAyuda')}
            </p>
            <Input
              id="campo-persona"
              placeholder={t('buscarPlaceholder')}
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
              <p className="text-sm text-muted-foreground">{t('sinResultados', { q: busqueda.trim() })}</p>
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
                        — {r.email}
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
          <legend className="mb-2 text-sm font-medium">{t('franjasTitulo')}</legend>
          <EditorDeFranjas
            value={franjas}
            onChange={(nuevas) => {
              setFranjas(nuevas);
              if (nuevas.length > 0) validacion.limpiar('franjas');
            }}
            etiquetas={etiquetas}
            idBase="franja-en-nombre"
            disabled={enviando}
          />
          <MensajeErrorCampo id="campo-franjas-error" mensaje={validacion.mensajes.franjas} />
        </fieldset>
      </div>

      <SheetFooter>
        <Button type="submit" loading={enviando} loadingText={t('pidiendo')} className="h-11">
          {t('pedir')}
        </Button>
      </SheetFooter>
    </form>
  );
}
