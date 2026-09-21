import { auth } from '../../../auth';

export default async function InicioAppPage() {
  const session = await auth();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        Hola, {session?.user.givenName ?? session?.user.name}
      </h1>
      <p className="text-foreground">
        Este es tu Inicio. Acá vas a ver novedades y tus próximos pasos sugeridos.
      </p>
    </div>
  );
}
