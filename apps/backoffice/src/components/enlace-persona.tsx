import Link from 'next/link';
import type { PersonaBreve } from '@vida-sobrenatural/shared-types';
import { cn } from '@vida-sobrenatural/ui';

/**
 * spec 013 (FR-010, T034): el nombre de una Persona como enlace a su perfil,
 * igual en todo el backoffice — subrayado permanente (D81: un enlace no se
 * reconoce solo por el color).
 */
export function EnlacePersona({ persona, className }: { persona: Pick<PersonaBreve, 'id' | 'nombre' | 'apellido'>; className?: string }) {
  return (
    <Link href={`/personas/${persona.id}`} className={cn('underline underline-offset-2', className)}>
      {`${persona.nombre} ${persona.apellido}`}
    </Link>
  );
}
