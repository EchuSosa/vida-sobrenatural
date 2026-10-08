import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/** Un Curso que no existe (o está en la papelera): sin miga, con un enlace suelto al listado. */
export default async function CursoNoEncontrado() {
  const t = await getTranslations('cursos');
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('noEncontradoTitulo')}</h1>
      <Link href="/cursos" className="self-start underline underline-offset-4">
        {t('irACursos')}
      </Link>
    </div>
  );
}
