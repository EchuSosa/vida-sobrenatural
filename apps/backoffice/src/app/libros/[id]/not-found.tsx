import Link from 'next/link';

export default function LibroNoEncontrado() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">No encontramos este Libro</h1>
      <Link href="/libros" className="text-sm underline underline-offset-4">
        Volver a Libros
      </Link>
    </div>
  );
}
