import { getTranslations } from 'next-intl/server';
import { type EstadoMiDiscipulado, apiFetch } from '@vida-sobrenatural/shared-types';
import { EstadoVacio } from '@vida-sobrenatural/ui';
import { auth } from '../../../auth';
import { MiCaminoCliente } from './mi-camino-cliente';

/**
 * specs/004, Historias 1 y 2 (T019, T034): Mi camino. Por ahora, Vida Nueva
 * (FR-026 a FR-028, FR-039, FR-044); el resto de los pasos sigue como estado
 * vacío. Si la API falla, lo atrapa `error.tsx` de esta ruta.
 */
export default async function MiCaminoPage() {
  const session = await auth();
  const t = await getTranslations('miCamino');
  const estado = await apiFetch<EstadoMiDiscipulado>('/discipulado/me', {
    headers: { Authorization: `Bearer ${session?.apiToken}` },
    cache: 'no-store',
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
      <MiCaminoCliente estadoInicial={estado} />
      <EstadoVacio mensaje={t('proximosPasos')} />
    </div>
  );
}
