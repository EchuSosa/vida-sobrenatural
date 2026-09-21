import { auth } from '../../../auth';
import { type PersonaPerfil, apiFetch } from '@vida-sobrenatural/shared-types';
import { SelectorTema } from '../../../components/selector-tema';
import { CerrarSesionBoton } from '../../../components/cerrar-sesion-boton';
import { PerfilFormulario } from '../../../components/perfil-formulario';

export default async function PerfilPage() {
  const session = await auth();
  const perfil = await apiFetch<PersonaPerfil>('/personas/me', {
    headers: { Authorization: `Bearer ${session?.apiToken}` },
    cache: 'no-store',
  }).catch(() => null);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Perfil</h1>
      <div className="flex flex-col gap-1 text-foreground">
        <p>
          {perfil ? `${perfil.nombre} ${perfil.apellido}` : session?.user.name}
        </p>
        <p>{perfil?.email ?? session?.user.email}</p>
      </div>
      {/* H-35 (Flujo 11): sin datos de perfil (ej. la API no respondió), no se
          muestra un formulario a medio llenar — mejor nada que datos vacíos
          que parezcan reales. */}
      {perfil && (
        <PerfilFormulario
          perfil={{
            telefono: perfil.telefono,
            direccion: perfil.direccion,
            estadoCivil: perfil.estadoCivil,
            profesion: perfil.profesion,
            profesionDetalle: perfil.profesionDetalle,
          }}
        />
      )}
      <SelectorTema valorInicial={perfil?.temaPreferido ?? session?.user.temaPreferido ?? 'claro'} />
      <CerrarSesionBoton />
    </div>
  );
}
