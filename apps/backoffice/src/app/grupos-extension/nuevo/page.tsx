import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { apiFetch, type Sede } from '@vida-sobrenatural/shared-types';
import { MigaDePan } from '@vida-sobrenatural/ui';
import { requerirPermiso } from '../../../auth';
import { FormularioGrupoExtension } from '../formulario';

/** spec 014 (D221): crear un Grupo de Extensión (solo Admin). */
export default async function NuevoGrupoExtensionPage() {
  const session = await requerirPermiso('grupos_extension.gestionar');
  const t = await getTranslations('gruposExtension');
  const sedes = await apiFetch<Sede[]>('/sedes', { cache: 'no-store' });
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <MigaDePan tramos={[{ label: t('titulo'), href: '/grupos-extension' }, { label: t('form.tituloNuevo') }]} LinkComponente={Link} />
      <FormularioGrupoExtension
        apiToken={session.apiToken}
        sedes={sedes.map((s) => ({ id: s.id, nombre: s.nombre }))}
        inicial={{ nombre: '', lideres: [], dias: [], horaInicio: '19:00', cupo: null, edadMinima: null, edadMaxima: null, enLaIglesia: false, sedeId: null, calle: '', numero: '', entreCalle1: '', entreCalle2: '', zona: '' }}
      />
    </div>
  );
}
