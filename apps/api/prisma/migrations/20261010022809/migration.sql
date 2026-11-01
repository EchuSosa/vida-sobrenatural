-- DropForeignKey
ALTER TABLE "grupos_extension" DROP CONSTRAINT "grupos_extension_sedeId_fkey";

-- AddForeignKey
ALTER TABLE "grupos_extension" ADD CONSTRAINT "grupos_extension_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "sedes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
