import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ApiError, apiFetch, type GrupoExtensionDetalle, type Sede } from '@vida-sobrenatural/shared-types';
import { MigaDePan } from '@vida-sobrenatural/ui';
import { requerirPermiso } from '../../../../auth';
import { FormularioGrupoExtension } from '../../formulario';

/** spec 014 (D221): editar un Grupo de Extensión (solo Admin). */
export default async function EditarGrupoExtensionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requerirPermiso('grupos_extension.gestionar');
  const { id } = await params;
  const t = await getTranslations('gruposExtension');
  let g: GrupoExtensionDetalle;
  try {
    g = await apiFetch<GrupoExtensionDetalle>(`/grupos-extension/${id}`, { headers: { Authorization: `Bearer ${session.apiToken}` }, cache: 'no-store' });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') notFound();
    throw e;
  }
  const sedes = await apiFetch<Sede[]>('/sedes', { cache: 'no-store' });
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <MigaDePan tramos={[{ label: t('titulo'), href: '/grupos-extension' }, { label: g.nombre, href: `/grupos-extension/${g.id}` }, { label: t('form.tituloEditar') }]} LinkComponente={Link} />
      <FormularioGrupoExtension
        apiToken={session.apiToken}
        sedes={sedes.map((s) => ({ id: s.id, nombre: s.nombre }))}
        inicial={{
          id: g.id,
          nombre: g.nombre,
          lideres: g.lideres.map((l) => ({ id: l.id, nombre: l.nombre, apellido: l.apellido, genero: l.genero })),
          dias: g.dias,
          horaInicio: g.horaInicio,
          cupo: g.cupo,
          edadMinima: g.edadMinima,
          edadMaxima: g.edadMaxima,
          enLaIglesia: g.enLaIglesia,
          sedeId: g.sedeId,
          calle: g.calle,
          numero: g.numero,
          entreCalle1: g.entreCalle1,
          entreCalle2: g.entreCalle2,
          zona: g.zona,
        }}
      />
    </div>
  );
}
