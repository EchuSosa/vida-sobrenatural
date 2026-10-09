'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import type { GrupoServicioActivo } from '@vida-sobrenatural/shared-types';

/**
 * spec 008, T068 (FR-040, D167): por qué no se puede quitar `lider_curso` —
 * nombrando cada edición de Vida de Servicio en curso que lidera, con el
 * enlace a su detalle, donde se lo saca (mismo patrón que el bloqueo del
 * Discipulador, FR-043 de la 004). Ícono + texto (D81).
 */
export function BloqueoLiderCurso({ grupos }: { grupos: readonly GrupoServicioActivo[] }) {
  const t = useTranslations('edicionesServicio.bloqueoLider');
  return (
    <div className="flex items-start gap-2 text-sm text-muted-foreground">
      <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p>{t('intro')}</p>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {grupos.map((g) => (
            <li key={g.grupoId}>
              <Link href={`/grupos/vida-de-servicio/${g.grupoId}`} className="text-foreground underline underline-offset-4">
                {g.nombre}
              </Link>
            </li>
          ))}
        </ul>
        <p>{t('comoDestrabar')}</p>
      </div>
    </div>
  );
}
