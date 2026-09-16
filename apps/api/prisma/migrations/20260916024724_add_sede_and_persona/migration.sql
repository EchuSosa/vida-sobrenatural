-- CreateEnum
CREATE TYPE "Genero" AS ENUM ('masculino', 'femenino');

-- CreateEnum
CREATE TYPE "EstadoCivil" AS ENUM ('soltero_a', 'casado_a', 'en_concubinato', 'viudo_a', 'divorciado_a', 'separado_a');

-- CreateEnum
CREATE TYPE "TiempoCongregacion" AS ENUM ('menos_6_meses', '6_meses_a_1_anio', '1_a_3_anios', '3_a_5_anios', 'mas_5_anios');

-- CreateEnum
CREATE TYPE "EstadoPersona" AS ENUM ('activa', 'pendiente_tutor');

-- CreateTable
CREATE TABLE "sedes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "contactoTelefono" TEXT,
    "contactoEmail" TEXT,
    "horarios" TEXT NOT NULL,
    "descripcionBienvenida" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sedes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personas" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "genero" "Genero" NOT NULL,
    "fechaNacimiento" TIMESTAMP(3) NOT NULL,
    "telefono" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "estadoCivil" "EstadoCivil" NOT NULL,
    "profesion" TEXT NOT NULL,
    "tiempoCongregacion" "TiempoCongregacion" NOT NULL,
    "sedeId" TEXT NOT NULL,
    "estado" "EstadoPersona" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "consentimientoDatos" BOOLEAN NOT NULL DEFAULT false,
    "tutorNombre" TEXT,
    "tutorTelefono" TEXT,
    "rol" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "personas_email_key" ON "personas"("email");

-- AddForeignKey
ALTER TABLE "personas" ADD CONSTRAINT "personas_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
