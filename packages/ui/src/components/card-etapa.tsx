import { Children, type ReactElement, type ReactNode } from 'react';
import { cn } from '../lib/utils';
import { ButtonLink } from './ui/button-link';
import { PlegableEtapa } from './card-etapa-plegable';

export interface CardEtapaProps {
  /** Para el `id` del título (la card es una región nombrada por su título). */
  id: string;
  titulo: string;
  /**
   * La explicación de la etapa. Las de Vida Nueva, Vida de Servicio y
   * Ministerio vienen de Primeros pasos, donde empiezan en minúscula (siguen a
   * un guion): la card las muestra con la primera letra en mayúscula.
   */
  descripcion: string;
  /**
   * El estado en palabras + ícono, nunca solo color (D81): `texto` es lo que
   * pasa y `detalle` qué sigue ("¿Y ahora qué?", docs/15). El ícono es
   * decorativo (`aria-hidden`): el texto ya lo dice.
   */
  estado: { icono: ReactNode; texto: string; detalle?: ReactNode };
  /** Un mensaje que va ARRIBA del estado (ej. "No pudimos confirmarlo"). */
  aviso?: ReactNode;
  /**
   * El destino de la card, si tiene (ej. `<Link href="/mi-camino/vida-nueva" />`):
   * se pinta como el botón principal de la card. Sin destino, nada en la card
   * es un enlace (FR-004: una etapa "Próximamente" no parece tocable).
   */
  enlace?: { render: ReactElement; texto: string };
  /** La zona de acciones ("Ya lo hice", "Retirar", lo propio de cada etapa). */
  children?: ReactNode;
  className?: string;
  /**
   * Mi camino, propuesta A (Echu, 2026-10-10): la card se pliega. Plegada
   * muestra solo el título y el estado; el botón del título la abre (patrón
   * acordeón: `<h2><button aria-expanded>`). Se abre sola si la URL apunta a
   * su `id` (el resumen de arriba enlaza `#<id>`).
   */
  plegable?: { abiertaAlInicio: boolean };
  /** Sin la explicación y con fondo suave: para una card que va arriba, chica (el grupo de extensión). */
  compacta?: boolean;
}

/**
 * spec 006, T019 (FR-001, FR-002, FR-004, research #3): una card de Mi
 * camino. Sin Next (el enlace llega por `render`, mismo patrón que
 * `ButtonLink`), para que la use la web app y, si hace falta, el backoffice.
 * La acción principal va a la derecha en escritorio y arriba en celular
 * (docs/15), en la zona del pulgar.
 */
export function CardEtapa({ id, titulo, descripcion, estado, aviso, enlace, children, className, plegable, compacta }: CardEtapaProps) {
  const idTitulo = `${id}-titulo`;
  const acciones = Children.toArray(children);

  const estadoEnPalabras = (
    <div className="flex gap-3">
      <span className="mt-0.5 flex shrink-0 [&_svg]:size-5" aria-hidden="true">
        {estado.icono}
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium">{estado.texto}</p>
        {estado.detalle && <div className="text-base text-muted-foreground">{estado.detalle}</div>}
      </div>
    </div>
  );

  const zonaAcciones = (acciones.length > 0 || enlace) && (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
      {acciones}
      {enlace && (
        <ButtonLink render={enlace.render} size="xl" className="text-base">
          {enlace.texto}
        </ButtonLink>
      )}
    </div>
  );

  if (plegable) {
    return (
      <section id={id} aria-labelledby={idTitulo} className={cn('scroll-mt-24 rounded-lg border border-border', className)}>
        <PlegableEtapa
          idTitulo={idTitulo}
          idCuerpo={`${id}-cuerpo`}
          idAncla={id}
          titulo={titulo}
          resumen={estado.texto}
          icono={estado.icono}
          abiertaAlInicio={plegable.abiertaAlInicio}
        >
          <p className="text-base text-muted-foreground first-letter:uppercase">{descripcion}</p>
          {aviso}
          {estado.detalle && <div className="text-base text-muted-foreground">{estado.detalle}</div>}
          {zonaAcciones}
        </PlegableEtapa>
      </section>
    );
  }

  return (
    <section
      id={compacta ? id : undefined}
      aria-labelledby={idTitulo}
      className={cn('flex flex-col gap-4 rounded-lg border border-border p-5', compacta && 'gap-3 border-transparent bg-secondary p-4', className)}
    >
      <div className="flex flex-col gap-1">
        <h2 id={idTitulo} className={cn('text-xl font-semibold', compacta && 'text-lg')}>
          {titulo}
        </h2>
        {!compacta && <p className="text-base text-muted-foreground first-letter:uppercase">{descripcion}</p>}
      </div>

      {aviso}
      {estadoEnPalabras}
      {zonaAcciones}
    </section>
  );
}
