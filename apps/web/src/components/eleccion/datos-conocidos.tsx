import { useTranslations } from 'next-intl';
import { House, Phone, UserRound } from 'lucide-react';
import type { DatosConocidos } from '@vida-sobrenatural/shared-types';

/** spec 015 (D239): "Esto ya lo sabemos" — lo que la app tiene y no se vuelve a preguntar. */
export function DatosConocidosVista({ datos, titulo }: { datos: DatosConocidos; titulo: string }) {
  const t = useTranslations('eleccion');
  return (
    <section aria-labelledby="conocido-titulo" className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <h2 id="conocido-titulo" className="text-lg font-semibold">
        {titulo}
      </h2>
      <ul className="flex flex-col gap-1.5 text-base">
        <li className="flex gap-2">
          <UserRound aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          {t('conocidoNombre', { nombre: `${datos.nombre} ${datos.apellido}` })}
        </li>
        <li className="flex gap-2">
          <Phone aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          {t('conocidoCelular', { telefono: datos.telefono })}
        </li>
        <li className="flex gap-2">
          <House aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          {datos.grupoExtension
            ? t('conocidoGrupo', { grupo: datos.grupoExtension.nombre, lideres: datos.grupoExtension.lideres.join(', ') || t('sinLider') })
            : t('conocidoSinGrupo')}
        </li>
      </ul>
    </section>
  );
}
