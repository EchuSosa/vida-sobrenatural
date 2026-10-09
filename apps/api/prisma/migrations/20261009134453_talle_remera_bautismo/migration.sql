-- D229: talle de la remera que regala la iglesia en el pedido de bautismo.
-- Nullable a propósito: los pedidos existentes quedan sin talle ("Sin dato");
-- desde ahora la API lo exige al pedir (TALLE_REQUERIDO).
-- CreateEnum
CREATE TYPE "TalleRemera" AS ENUM ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL');

-- AlterTable
ALTER TABLE "solicitudes_bautismo" ADD COLUMN     "talleRemera" "TalleRemera";
