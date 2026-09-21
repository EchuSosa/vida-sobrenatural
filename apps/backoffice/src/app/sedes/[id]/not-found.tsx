import Link from 'next/link';

// H-60 (revisión manual ronda 7): not-found.tsx propio de esta ruta —
// mismo mensaje y link "Volver a Sedes" que tenía el `noEncontrada` armado
// a mano en el page.tsx de cliente, ahora disparado con notFound().
export default function SedeNoEncontrada() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">No encontramos esta Sede</h1>
      <Link href="/sedes" className="text-sm underline underline-offset-4">
        Volver a Sedes
      </Link>
    </div>
  );
}
