-- CreateEnum
CREATE TYPE "Idioma" AS ENUM ('es');

-- CreateEnum
CREATE TYPE "TemaPreferido" AS ENUM ('claro', 'oscuro', 'sistema');

-- AlterTable
ALTER TABLE "personas" ADD COLUMN     "idiomaPreferido" "Idioma" NOT NULL DEFAULT 'es',
ADD COLUMN     "temaPreferido" "TemaPreferido" NOT NULL DEFAULT 'sistema';
