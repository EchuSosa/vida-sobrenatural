import { CircleCheck, CircleDot, Lightbulb, MessageCircleWarning } from 'lucide-react';
import type { TipoComentario } from '@vida-sobrenatural/shared-types';

/** spec 013 (T065, D81): el tipo y el estado de un comentario, siempre con texto e ícono (nunca solo color). */
export function TipoConIcono({ tipo, texto }: { tipo: TipoComentario; texto: string }) {
  const Icono = tipo === 'problema' ? MessageCircleWarning : Lightbulb;
  return (
    <span className="inline-flex items-center gap-1 font-medium">
      <Icono aria-hidden className="size-4" />
      {texto}
    </span>
  );
}

export function Estado({ revisado, textoRevisado, textoSinRevisar }: { revisado: boolean; textoRevisado: string; textoSinRevisar: string }) {
  const Icono = revisado ? CircleCheck : CircleDot;
  return (
    <span className="inline-flex items-center gap-1">
      <Icono aria-hidden className="size-4" />
      {revisado ? textoRevisado : textoSinRevisar}
    </span>
  );
}
