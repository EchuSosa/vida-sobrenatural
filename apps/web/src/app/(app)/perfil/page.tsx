import { auth } from '../../../auth';
import { apiFetch } from '../../../lib/api-client';
import { SelectorTema } from '../../../components/selector-tema';

interface PersonaPerfil {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  fotoUrl: string | null;
  temaPreferido: 'claro' | 'oscuro' | 'sistema';
}

export default async function PerfilPage() {
  const session = await auth();
  const perfil = await apiFetch<PersonaPerfil>('/personas/me', {
    headers: { Authorization: `Bearer ${session?.apiToken}` },
    cache: 'no-store',
  }).catch(() => null);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Perfil</h1>
      <div className="flex flex-col gap-1 text-zinc-700 dark:text-zinc-300">
        <p>
          {perfil ? `${perfil.nombre} ${perfil.apellido}` : session?.user.name}
        </p>
        <p>{perfil?.email ?? session?.user.email}</p>
      </div>
      <SelectorTema valorInicial={perfil?.temaPreferido ?? session?.user.temaPreferido ?? 'sistema'} />
    </div>
  );
}
