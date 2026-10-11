'use client';

import { useTranslations } from 'next-intl';
import { GraduationCap, Sparkles, UsersRound } from 'lucide-react';
import { MAX_MINISTERIOS_POR_PERSONA, type MinisterioParaElegir, type OpcionElegida } from '@vida-sobrenatural/shared-types';
import { cn } from '@vida-sobrenatural/ui';

/** La selección: un área por Ministerio (`ministerioId → celulaId`, o `ENTERO` si no tiene áreas). */
export type SeleccionMinisterios = Readonly<Record<string, string>>;

/** El Ministerio entero, cuando no tiene áreas (docs/22: Ceremonial, Mesa de entrada…). */
const ENTERO = '*';
const NINGUNA = '';

export function opcionesDe(seleccion: SeleccionMinisterios): OpcionElegida[] {
  return Object.entries(seleccion).map(([ministerioId, celulaId]) => ({ ministerioId, celulaId: celulaId === ENTERO ? null : celulaId }));
}

export function seleccionDe(opciones: ReadonlyArray<{ ministerio: { id: string }; celula: { id: string } | null }>): SeleccionMinisterios {
  return Object.fromEntries(opciones.map((o) => [o.ministerio.id, o.celula?.id ?? ENTERO]));
}

/** "Bienvenida · Seguridad", o solo el Ministerio si se eligió entero. */
export function textoOpcion(o: { ministerio: string; celula: string | null }): string {
  return o.celula ? `${o.ministerio} · ${o.celula}` : o.ministerio;
}

/**
 * spec 015 (D239): el listado para elegir ministerio — el mismo para la
 * persona y para el líder de Vida de Servicio en la charla. Tres bloques:
 * "Para empezar a servir ya", "Requieren formación antes" (docs/22) y lo que
 * se hace al mismo tiempo que otro ministerio (Discipulados Vida Nueva, D217).
 * Cada Ministerio es un grupo de radios con "Ninguna de este ministerio": un
 * área por Ministerio. Con 2 Ministerios elegidos, el resto queda
 * deshabilitado y el texto dice por qué (nunca solo color, D81).
 */
export function SelectorMinisterios({
  catalogo,
  seleccion,
  onCambio,
  deshabilitado = false,
  invalido = false,
  idError,
}: {
  catalogo: MinisterioParaElegir[];
  seleccion: SeleccionMinisterios;
  onCambio: (s: SeleccionMinisterios) => void;
  deshabilitado?: boolean;
  invalido?: boolean;
  idError?: string;
}) {
  const t = useTranslations('eleccion');
  const enParalelo = (celulaId: string) => catalogo.some((m) => m.areas.some((a) => a.id === celulaId && a.enParalelo));
  const principales = Object.values(seleccion).filter((celulaId) => celulaId && !enParalelo(celulaId)).length;
  const lleno = principales >= MAX_MINISTERIOS_POR_PERSONA;

  const soloParalelo = (m: MinisterioParaElegir) => m.areas.length > 0 && m.areas.every((a) => a.enParalelo);
  const bloques = [
    { clave: 'ya', titulo: t('bloqueYa'), ayuda: t('bloqueYaAyuda'), icono: <Sparkles aria-hidden className="size-5 shrink-0 text-primary" />, ministerios: catalogo.filter((m) => !m.requiereFormacion && !soloParalelo(m)) },
    { clave: 'formacion', titulo: t('bloqueFormacion'), ayuda: t('bloqueFormacionAyuda'), icono: <GraduationCap aria-hidden className="size-5 shrink-0 text-primary" />, ministerios: catalogo.filter((m) => m.requiereFormacion && !soloParalelo(m)) },
    { clave: 'paralelo', titulo: t('bloqueParalelo'), ayuda: t('bloqueParaleloAyuda'), icono: <UsersRound aria-hidden className="size-5 shrink-0 text-primary" />, ministerios: catalogo.filter(soloParalelo) },
  ].filter((b) => b.ministerios.length > 0);

  function elegir(ministerioId: string, celulaId: string) {
    const siguiente = { ...seleccion };
    if (celulaId === NINGUNA) delete siguiente[ministerioId];
    else siguiente[ministerioId] = celulaId;
    onCambio(siguiente);
  }

  return (
    <div id="campo-opciones" tabIndex={-1} aria-invalid={invalido || undefined} aria-describedby={idError} className="flex flex-col gap-6 outline-none">
      <p role="status" aria-live="polite" className="text-base font-medium">
        {lleno ? t('contadorLleno', { maximo: MAX_MINISTERIOS_POR_PERSONA }) : t('contador', { cantidad: principales, maximo: MAX_MINISTERIOS_POR_PERSONA })}
      </p>
      {bloques.map((bloque) => (
        <section key={bloque.clave} aria-labelledby={`bloque-${bloque.clave}`} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 id={`bloque-${bloque.clave}`} className="flex items-center gap-2 text-xl font-semibold">
              {bloque.icono}
              {bloque.titulo}
            </h2>
            <p className="text-base text-muted-foreground">{bloque.ayuda}</p>
          </div>
          {bloque.ministerios.map((m) => {
            const elegida = seleccion[m.id] ?? NINGUNA;
            return (
              <fieldset key={m.id} className={cn('flex flex-col gap-2 rounded-lg border border-border p-4', elegida && 'border-primary')}>
                <legend className="px-1 text-lg font-semibold break-words">{m.nombre}</legend>
                <p className="text-base text-muted-foreground">{m.descripcion}</p>
                {m.areas.length === 0 && (
                  <label className={cn('flex min-h-11 cursor-pointer items-center gap-3 text-base', (deshabilitado || (lleno && !elegida)) && 'cursor-not-allowed text-muted-foreground')}>
                    <input
                      type="radio"
                      name={`ministerio-${m.id}`}
                      value={ENTERO}
                      checked={elegida === ENTERO}
                      onChange={() => elegir(m.id, ENTERO)}
                      disabled={deshabilitado || (lleno && !elegida)}
                      className="size-5 shrink-0 accent-primary"
                    />
                    <span className="font-medium">{t('quieroServirAca')}</span>
                  </label>
                )}
                {m.areas.map((a) => {
                  // Con 2 Ministerios elegidos, no se suma un tercero (sí se cambia de área dentro de uno elegido).
                  const bloqueada = !a.enParalelo && lleno && !elegida;
                  return (
                    <label key={a.id} className={cn('flex min-h-11 cursor-pointer items-start gap-3 text-base', (deshabilitado || bloqueada) && 'cursor-not-allowed text-muted-foreground')}>
                      <input
                        type="radio"
                        name={`ministerio-${m.id}`}
                        value={a.id}
                        checked={elegida === a.id}
                        onChange={() => elegir(m.id, a.id)}
                        disabled={deshabilitado || bloqueada}
                        className="mt-1 size-5 shrink-0 accent-primary"
                      />
                      <span className="flex flex-col">
                        <span className="font-medium">{a.nombre}</span>
                        {a.descripcion && <span className="text-muted-foreground">{a.descripcion}</span>}
                      </span>
                    </label>
                  );
                })}
                <label className={cn('flex min-h-11 cursor-pointer items-center gap-3 text-base', deshabilitado && 'cursor-not-allowed text-muted-foreground')}>
                  <input
                    type="radio"
                    name={`ministerio-${m.id}`}
                    value={NINGUNA}
                    checked={elegida === NINGUNA}
                    onChange={() => elegir(m.id, NINGUNA)}
                    disabled={deshabilitado}
                    className="size-5 shrink-0 accent-primary"
                  />
                  {t('ninguna')}
                </label>
              </fieldset>
            );
          })}
        </section>
      ))}
    </div>
  );
}
