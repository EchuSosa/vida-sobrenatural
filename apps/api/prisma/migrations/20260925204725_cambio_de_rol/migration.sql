-- CreateEnum
CREATE TYPE "AccionCambioRol" AS ENUM ('otorgado', 'quitado');

-- CreateEnum
CREATE TYPE "OrigenCambioRol" AS ENUM ('backoffice', 'recuperacion_cli');

-- CreateTable
CREATE TABLE "cambios_de_rol" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "accion" "AccionCambioRol" NOT NULL,
    "origen" "OrigenCambioRol" NOT NULL,
    "realizadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cambios_de_rol_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cambios_de_rol_personaId_idx" ON "cambios_de_rol"("personaId");

-- AddForeignKey
ALTER TABLE "cambios_de_rol" ADD CONSTRAINT "cambios_de_rol_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- H-140: la invariante del actor discriminado vive en la base, no en un
-- comentario. Una fila de `backoffice` SIEMPRE tiene autor (un Admin
-- identificado); una de `recuperacion_cli` NUNCA lo tiene — no se inventa
-- (lo corre quien tenga acceso al servidor, y la app no puede nombrarlo).
ALTER TABLE "cambios_de_rol" ADD CONSTRAINT "cambios_de_rol_backoffice_con_autor"
  CHECK ("origen" <> 'backoffice' OR "realizadoPorId" IS NOT NULL);
ALTER TABLE "cambios_de_rol" ADD CONSTRAINT "cambios_de_rol_cli_sin_autor"
  CHECK ("origen" <> 'recuperacion_cli' OR "realizadoPorId" IS NULL);
