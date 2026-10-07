'use client';

import type { Cruce, DiscipuladorEnCruce, Franja, GrupoConLugar, NombreRegla } from '@vida-sobrenatural/shared-types';
import { minutosAHHMM, Button } from '@vida-sobrenatural/ui';

/**
 * specs/004-vida-nueva-discipulado (T012c): el componente de pantalla del
 * cruce. Presentacional: recibe un `Cruce` ya armado por la API (CruceService)
 * y avisa qué Discipulador eligió el Admin. Lo usan la propuesta (T027a,
 * /solicitudes/[id]) y la reasignación (T052, /grupos/[id]) — un solo
 * componente (Principio XI). Todo texto llega por prop (H-151): no sabe
 * español, así cada página pasa sus claves de next-intl (incluidos los días y
 * los nombres de las reglas). Nunca oculta a los que no coinciden (D25): los
 * muestra con la razón.
 */
export interface EtiquetasCruce {
  /** Los siete días, domingo (0) a sábado (6). */
  dias: [string, string, string, string, string, string, string];
  sinDisponibles: string;
  ningunoCoincide: string;
  tituloNoCoinciden: string;
  sugerido: string;
  elegir: string;
  sumarAlGrupo: string;
  /** Nombre legible de cada regla que no se cumple. */
  razones: Record<NombreRegla, string>;
  /** "2 de 3" y si el horario del Grupo coincide. */
  lugar: (g: GrupoConLugar) => string;
  coincideHorario: string;
  noCoincideHorario: string;
}

export interface CruceProps {
  cruce: Cruce;
  etiquetas: EtiquetasCruce;
  onElegir: (discipuladorId: string, grupoDestinoId?: string) => void;
  disabled?: boolean;
}

function nombreFranja(f: Franja, dias: EtiquetasCruce['dias']): string {
  return `${dias[f.diaSemana]} ${minutosAHHMM(f.inicio)} a ${minutosAHHMM(f.fin)}`;
}

function TarjetaDiscipulador({
  d,
  esSugerido,
  etiquetas,
  onElegir,
  disabled,
  incumple,
}: {
  d: DiscipuladorEnCruce;
  esSugerido: boolean;
  etiquetas: EtiquetasCruce;
  onElegir: CruceProps['onElegir'];
  disabled?: boolean;
  incumple?: NombreRegla[];
}) {
  return (
    <li className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">
          {d.nombre} {d.apellido}
          {esSugerido && (
            <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-xs font-normal text-muted-foreground">
              ★ {etiquetas.sugerido}
            </span>
          )}
        </span>
        {/* Echu (merge de la 004): en una lista, el botón de cada ítem es outline. */}
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onElegir(d.id)}>
          {etiquetas.elegir}
        </Button>
      </div>
      {incumple && incumple.length > 0 && (
        <p className="text-sm text-muted-foreground">{incumple.map((r) => etiquetas.razones[r]).join(' · ')}</p>
      )}
      {d.gruposConLugar.map((g) => (
        <div key={g.grupoId} className="flex items-center justify-between gap-2 rounded border border-dashed border-border px-2 py-1 text-sm">
          <span>
            {etiquetas.lugar(g)} — {g.coincideHorario ? etiquetas.coincideHorario : etiquetas.noCoincideHorario}
          </span>
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onElegir(d.id, g.grupoId)}>
            {etiquetas.sumarAlGrupo}
          </Button>
        </div>
      ))}
    </li>
  );
}

export function CruceDiscipuladores({ cruce, etiquetas, onElegir, disabled }: CruceProps) {
  if (cruce.sinDisponibles) {
    return <p className="text-sm text-muted-foreground">{etiquetas.sinDisponibles}</p>;
  }
  const hayCoincidencias = cruce.franjas.some((f) => f.coinciden.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {hayCoincidencias ? (
        cruce.franjas
          .filter((f) => f.coinciden.length > 0)
          .map((f) => (
            <section key={`${f.franja.diaSemana}-${f.franja.inicio}`} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">{nombreFranja(f.franja, etiquetas.dias)}</h3>
              <ul className="flex flex-col gap-2">
                {f.coinciden.map((d) => (
                  <TarjetaDiscipulador key={d.id} d={d} esSugerido={d.id === cruce.sugeridoId} etiquetas={etiquetas} onElegir={onElegir} disabled={disabled} />
                ))}
              </ul>
            </section>
          ))
      ) : (
        <p className="text-sm text-muted-foreground">{etiquetas.ningunoCoincide}</p>
      )}

      {cruce.noCoinciden.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{etiquetas.tituloNoCoinciden}</h3>
          <ul className="flex flex-col gap-2">
            {cruce.noCoinciden.map((d) => (
              <TarjetaDiscipulador key={d.id} d={d} esSugerido={false} etiquetas={etiquetas} onElegir={onElegir} disabled={disabled} incumple={d.incumple} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
