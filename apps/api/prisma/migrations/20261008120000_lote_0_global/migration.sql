-- CreateEnum
CREATE TYPE "TipoBaja" AS ENUM ('dada_de_baja', 'abandono');

-- CreateEnum
CREATE TYPE "EtapaCamino" AS ENUM ('vida_nueva', 'vida_de_servicio', 'ministerio', 'bautismo');

-- CreateEnum
CREATE TYPE "EstadoDeclaracion" AS ENUM ('pendiente', 'confirmada', 'rechazada', 'retirada');

-- CreateEnum
CREATE TYPE "OrigenCompletitud" AS ENUM ('declaracion', 'admin');

-- CreateEnum
CREATE TYPE "EstadoPostulacion" AS ENUM ('pendiente', 'aprobada', 'rechazada', 'inactiva', 'retirada');

-- CreateEnum
CREATE TYPE "MotivoInactivacionPostulacion" AS ENUM ('cambio_de_ministerio', 'baja');

-- CreateEnum
CREATE TYPE "EstadoSolicitudBautismo" AS ENUM ('pendiente', 'aprobada', 'rechazada', 'retirada', 'realizada');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('general', 'bautismo');

-- CreateEnum
CREATE TYPE "EstadoEvento" AS ENUM ('publicado', 'cancelado');

-- CreateEnum
CREATE TYPE "EstadoInscripcionEvento" AS ENUM ('confirmada', 'pendiente', 'rechazada', 'lista_espera', 'cancelada');

-- CreateEnum
CREATE TYPE "MotivoCancelacionInscripcion" AS ENUM ('persona', 'admin', 'pago_rechazado');

-- CreateEnum
CREATE TYPE "MedioPago" AS ENUM ('transferencia', 'efectivo', 'otro');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('pendiente_verificacion', 'verificado', 'rechazado');

-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('manual', 'automatica');

-- CreateEnum
CREATE TYPE "PrioridadNotificacion" AS ENUM ('normal', 'importante');

-- CreateEnum
CREATE TYPE "AlcanceNotificacion" AS ENUM ('todos', 'grupo', 'ministerio', 'evento', 'persona');

-- CreateEnum
CREATE TYPE "CanalEntrega" AS ENUM ('app', 'email', 'push');

-- CreateEnum
CREATE TYPE "EstadoEntrega" AS ENUM ('pendiente', 'enviada', 'fallida');

-- CreateEnum
CREATE TYPE "TipoComentario" AS ENUM ('problema', 'sugerencia');

-- CreateEnum
CREATE TYPE "AppOrigen" AS ENUM ('web', 'backoffice');

-- AlterEnum
ALTER TYPE "CategoriaCurso" ADD VALUE 'vida_de_servicio';

-- AlterEnum
ALTER TYPE "ModalidadCurso" ADD VALUE 'liberacion_programada';

-- AlterTable
ALTER TABLE "cursos" ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "eliminadoEn" TIMESTAMP(3),
ADD COLUMN     "eliminadoPor" TEXT,
ADD COLUMN     "prerequisitoCategoria" "CategoriaCurso";

-- AlterTable
ALTER TABLE "encuentros" ALTER COLUMN "capitulos" DROP NOT NULL;

-- AlterTable
ALTER TABLE "grupos" ADD COLUMN     "fechaInicio" DATE,
ADD COLUMN     "inscripcionAbierta" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nombre" TEXT;

-- AlterTable
ALTER TABLE "inscripciones" ADD COLUMN     "bajaPropuestaTipo" "TipoBaja",
ADD COLUMN     "solicitudVidaServicioId" TEXT,
ALTER COLUMN "solicitudId" DROP NOT NULL;

-- ============================================================================
-- personas — cambios con migración de datos, escritos a mano (lote 0 global).
-- ============================================================================

-- spec 007 (research #8): el email se guarda normalizado (trim + minúsculas,
-- `normalizarEmail` de shared-types). Antes de tocar nada, si dos Personas
-- chocan al normalizar, la migración FALLA con la lista — nunca fusiona.
DO $$
DECLARE choques TEXT;
BEGIN
  SELECT string_agg(normalizado, ', ') INTO choques FROM (
    SELECT lower(btrim(email)) AS normalizado FROM "personas"
    WHERE email IS NOT NULL GROUP BY lower(btrim(email)) HAVING count(*) > 1
  ) t;
  IF choques IS NOT NULL THEN
    RAISE EXCEPTION 'Emails de Persona que chocan al normalizarlos (resolver a mano antes de migrar): %', choques;
  END IF;
END $$;
UPDATE "personas" SET "email" = lower(btrim("email")) WHERE "email" IS NOT NULL AND "email" <> lower(btrim("email"));

-- spec 006 (D145): email opcional. Sigue único entre quienes lo tienen.
ALTER TABLE "personas" ALTER COLUMN "email" DROP NOT NULL;

-- spec 010 (D147): habilitación del bautismo por el Admin.
ALTER TABLE "personas" ADD COLUMN "bautismoHabilitadoEn" TIMESTAMP(3),
ADD COLUMN "bautismoHabilitadoPorId" TEXT;
ALTER TABLE "personas" ADD CONSTRAINT "personas_habilitacion_bautismo_coherente"
  CHECK (("bautismoHabilitadoEn" IS NULL) = ("bautismoHabilitadoPorId" IS NULL));

-- spec 006 (research #7): teléfono normalizado para el aviso de duplicado.
-- Mismo algoritmo que `normalizarTelefono` (shared-types): solo dígitos, y sin
-- el 9 de celular de Argentina (549… → 54…). Un test de integración compara
-- esta versión SQL con la de TypeScript sobre los teléfonos del seed.
-- Lo calcula un trigger en cada INSERT/UPDATE, así ningún camino de escritura
-- (registro, alta, edición, seeds, fixtures) puede olvidarlo.
ALTER TABLE "personas" ADD COLUMN "telefonoNormalizado" TEXT NOT NULL DEFAULT '';
CREATE FUNCTION "normalizar_telefono"(telefono TEXT) RETURNS TEXT
  LANGUAGE sql IMMUTABLE STRICT
  AS $$ SELECT regexp_replace(regexp_replace(telefono, '[^0-9]', '', 'g'), '^549', '54') $$;
CREATE FUNCTION "personas_telefono_normalizado"() RETURNS trigger
  LANGUAGE plpgsql
  AS $$ BEGIN NEW."telefonoNormalizado" := "normalizar_telefono"(NEW."telefono"); RETURN NEW; END $$;
CREATE TRIGGER "personas_telefono_normalizado"
  BEFORE INSERT OR UPDATE OF "telefono", "telefonoNormalizado" ON "personas"
  FOR EACH ROW EXECUTE FUNCTION "personas_telefono_normalizado"();
UPDATE "personas" SET "telefonoNormalizado" = "normalizar_telefono"("telefono");

-- D214: el año en que la Persona empezó a venir reemplaza al rango
-- `tiempoCongregacion`. Conversión: año de registro (en Argentina) menos el
-- límite inferior del rango declarado — nunca inventa antigüedad.
ALTER TABLE "personas" ADD COLUMN "congregaDesde" INTEGER;
UPDATE "personas" SET "congregaDesde" =
  EXTRACT(YEAR FROM ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Argentina/Buenos_Aires')::int
  - CASE "tiempoCongregacion"::text
      WHEN 'menos_6_meses' THEN 0
      WHEN '6_meses_a_1_anio' THEN 0
      WHEN '1_a_3_anios' THEN 1
      WHEN '3_a_5_anios' THEN 3
      WHEN 'mas_5_anios' THEN 5
      ELSE 0
    END;
ALTER TABLE "personas" ALTER COLUMN "congregaDesde" SET NOT NULL;
ALTER TABLE "personas" ADD CONSTRAINT "personas_congrega_desde_en_rango"
  CHECK ("congregaDesde" BETWEEN 1900 AND 2200);
ALTER TABLE "personas" DROP COLUMN "tiempoCongregacion";
DROP TYPE "TiempoCongregacion";

-- CreateTable
CREATE TABLE "declaraciones_historial" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "etapa" "EtapaCamino" NOT NULL,
    "estado" "EstadoDeclaracion" NOT NULL DEFAULT 'pendiente',
    "comentario" TEXT,
    "creadoPorId" TEXT,
    "revisadoPorId" TEXT,
    "revisadaEn" TIMESTAMP(3),
    "motivoRechazo" TEXT,
    "retiradaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "declaraciones_historial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "completitudes_manuales" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "etapa" "EtapaCamino" NOT NULL,
    "origen" "OrigenCompletitud" NOT NULL,
    "declaracionId" TEXT,
    "nota" TEXT,
    "registradaPorId" TEXT NOT NULL,
    "registradaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anuladaEn" TIMESTAMP(3),
    "anuladaPorId" TEXT,

    CONSTRAINT "completitudes_manuales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codigos_ingreso" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codigoHuella" TEXT NOT NULL,
    "origenHuella" TEXT NOT NULL,
    "venceEn" TIMESTAMP(3) NOT NULL,
    "intentosFallidos" INTEGER NOT NULL DEFAULT 0,
    "usadoEn" TIMESTAMP(3),
    "reemplazadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codigos_ingreso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items_cronograma" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "numeroSemana" INTEGER NOT NULL,
    "fechaLiberacion" DATE NOT NULL,
    "eliminadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_cronograma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contenidos" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "itemCronogramaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT,
    "cargadoPorId" TEXT NOT NULL,
    "cargadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editadoPorId" TEXT,
    "editadoEn" TIMESTAMP(3),
    "liberacionAvisadaEn" TIMESTAMP(3),

    CONSTRAINT "contenidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archivos_contenido" (
    "id" TEXT NOT NULL,
    "contenidoId" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "nombreOriginal" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanioBytes" INTEGER NOT NULL,
    "textoAlternativo" TEXT,
    "orden" INTEGER NOT NULL,
    "eliminadoEn" TIMESTAMP(3),
    "eliminadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivos_contenido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enlaces_contenido" (
    "id" TEXT NOT NULL,
    "contenidoId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "eliminadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enlaces_contenido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_vida_servicio" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'pendiente',
    "grupoId" TEXT,
    "creadoPorId" TEXT,
    "revisadoPorId" TEXT,
    "revisadaEn" TIMESTAMP(3),
    "motivoRechazo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_vida_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ministerios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "eliminadoEn" TIMESTAMP(3),
    "eliminadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ministerios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "celulas" (
    "id" TEXT NOT NULL,
    "ministerioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "eliminadoEn" TIMESTAMP(3),
    "eliminadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "celulas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postulaciones" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "ministerioId" TEXT NOT NULL,
    "celulaId" TEXT,
    "estado" "EstadoPostulacion" NOT NULL DEFAULT 'pendiente',
    "motivacion" TEXT,
    "disponibilidad" TEXT,
    "creadoPorId" TEXT,
    "revisadoPorId" TEXT,
    "revisadaEn" TIMESTAMP(3),
    "motivoRechazo" TEXT,
    "retiradaEn" TIMESTAMP(3),
    "motivoInactivacion" "MotivoInactivacionPostulacion",
    "inactivadaEn" TIMESTAMP(3),
    "inactivadaPorId" TEXT,
    "reemplazadaPorId" TEXT,
    "motivoBaja" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "postulaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_bautismo" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "estado" "EstadoSolicitudBautismo" NOT NULL DEFAULT 'pendiente',
    "comentario" TEXT,
    "creadoPorId" TEXT,
    "revisadoPorId" TEXT,
    "revisadaEn" TIMESTAMP(3),
    "motivoRechazo" TEXT,
    "inscripcionEventoId" TEXT,
    "realizadaEn" TIMESTAMP(3),
    "retiradaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_bautismo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tipo" "TipoEvento" NOT NULL DEFAULT 'general',
    "inicio" TIMESTAMPTZ NOT NULL,
    "fin" TIMESTAMPTZ,
    "lugar" TEXT,
    "publicoObjetivo" TEXT,
    "imagenUrl" TEXT,
    "imagenRuta" TEXT,
    "descripcionImagen" TEXT,
    "requiereInscripcion" BOOLEAN NOT NULL,
    "requiereAprobacion" BOOLEAN NOT NULL DEFAULT false,
    "cupo" INTEGER,
    "permiteListaEspera" BOOLEAN NOT NULL DEFAULT false,
    "costo" DECIMAL(10,2),
    "instruccionesPago" TEXT,
    "diasAnticipacionRecordatorio" INTEGER,
    "estado" "EstadoEvento" NOT NULL DEFAULT 'publicado',
    "canceladoEn" TIMESTAMP(3),
    "canceladoPorId" TEXT,
    "eliminadoEn" TIMESTAMP(3),
    "eliminadoPorId" TEXT,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscripciones_evento" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "estado" "EstadoInscripcionEvento" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPorId" TEXT,
    "enListaDesde" TIMESTAMP(3),
    "promovidaEn" TIMESTAMP(3),
    "promocionVistaEn" TIMESTAMP(3),
    "revisadoPorId" TEXT,
    "revisadoEn" TIMESTAMP(3),
    "motivoRechazo" TEXT,
    "canceladaEn" TIMESTAMP(3),
    "canceladaPorId" TEXT,
    "motivoCancelacion" "MotivoCancelacionInscripcion",
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inscripciones_evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" TEXT NOT NULL,
    "inscripcionEventoId" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "medio" "MedioPago" NOT NULL,
    "fechaPago" DATE NOT NULL,
    "comprobanteRuta" TEXT,
    "comprobanteMime" TEXT,
    "estado" "EstadoPago" NOT NULL,
    "creadoPorId" TEXT,
    "verificadoPorId" TEXT,
    "revisadoEn" TIMESTAMP(3),
    "motivoRechazo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" TEXT NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "prioridad" "PrioridadNotificacion" NOT NULL,
    "alcance" "AlcanceNotificacion" NOT NULL,
    "alcanceId" TEXT,
    "evento" TEXT,
    "params" JSONB,
    "entidadTipo" TEXT,
    "entidadId" TEXT,
    "titulo" VARCHAR(80),
    "mensaje" VARCHAR(1000),
    "creadoPorId" TEXT,
    "claveIdempotencia" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entregas_notificacion" (
    "id" TEXT NOT NULL,
    "notificacionId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "canal" "CanalEntrega" NOT NULL,
    "estado" "EstadoEntrega" NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "proximoIntentoEn" TIMESTAMP(3),
    "ultimoError" VARCHAR(64),
    "enviadaEn" TIMESTAMP(3),
    "leidaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entregas_notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentarios_app" (
    "id" TEXT NOT NULL,
    "tipo" "TipoComentario" NOT NULL,
    "texto" TEXT NOT NULL,
    "aceptaContacto" BOOLEAN NOT NULL DEFAULT false,
    "contactoEmail" TEXT,
    "contactoTelefono" TEXT,
    "paginaOrigen" TEXT NOT NULL,
    "navegador" TEXT,
    "ultimoRequestId" TEXT,
    "app" "AppOrigen" NOT NULL,
    "origenHuella" TEXT NOT NULL,
    "personaId" TEXT,
    "revisadoEn" TIMESTAMP(3),
    "revisadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentarios_app_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "declaraciones_historial_personaId_etapa_idx" ON "declaraciones_historial"("personaId", "etapa");

-- CreateIndex
CREATE INDEX "declaraciones_historial_estado_createdAt_idx" ON "declaraciones_historial"("estado", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "completitudes_manuales_declaracionId_key" ON "completitudes_manuales"("declaracionId");

-- CreateIndex
CREATE INDEX "completitudes_manuales_personaId_etapa_idx" ON "completitudes_manuales"("personaId", "etapa");

-- CreateIndex
CREATE INDEX "codigos_ingreso_email_creadoEn_idx" ON "codigos_ingreso"("email", "creadoEn");

-- CreateIndex
CREATE INDEX "codigos_ingreso_origenHuella_creadoEn_idx" ON "codigos_ingreso"("origenHuella", "creadoEn");

-- CreateIndex
CREATE INDEX "items_cronograma_grupoId_fechaLiberacion_idx" ON "items_cronograma"("grupoId", "fechaLiberacion");

-- CreateIndex
CREATE UNIQUE INDEX "contenidos_itemCronogramaId_key" ON "contenidos"("itemCronogramaId");

-- CreateIndex
CREATE INDEX "contenidos_grupoId_idx" ON "contenidos"("grupoId");

-- CreateIndex
CREATE INDEX "archivos_contenido_contenidoId_eliminadoEn_idx" ON "archivos_contenido"("contenidoId", "eliminadoEn");

-- CreateIndex
CREATE INDEX "enlaces_contenido_contenidoId_eliminadoEn_idx" ON "enlaces_contenido"("contenidoId", "eliminadoEn");

-- CreateIndex
CREATE INDEX "solicitudes_vida_servicio_personaId_idx" ON "solicitudes_vida_servicio"("personaId");

-- CreateIndex
CREATE INDEX "solicitudes_vida_servicio_estado_createdAt_idx" ON "solicitudes_vida_servicio"("estado", "createdAt");

-- CreateIndex
CREATE INDEX "solicitudes_vida_servicio_grupoId_idx" ON "solicitudes_vida_servicio"("grupoId");

-- CreateIndex
CREATE INDEX "ministerios_activo_eliminadoEn_idx" ON "ministerios"("activo", "eliminadoEn");

-- CreateIndex
CREATE INDEX "celulas_ministerioId_idx" ON "celulas"("ministerioId");

-- CreateIndex
CREATE INDEX "postulaciones_personaId_idx" ON "postulaciones"("personaId");

-- CreateIndex
CREATE INDEX "postulaciones_estado_createdAt_idx" ON "postulaciones"("estado", "createdAt");

-- CreateIndex
CREATE INDEX "postulaciones_ministerioId_estado_idx" ON "postulaciones"("ministerioId", "estado");

-- CreateIndex
CREATE INDEX "postulaciones_celulaId_idx" ON "postulaciones"("celulaId");

-- CreateIndex
CREATE UNIQUE INDEX "solicitudes_bautismo_inscripcionEventoId_key" ON "solicitudes_bautismo"("inscripcionEventoId");

-- CreateIndex
CREATE INDEX "solicitudes_bautismo_personaId_idx" ON "solicitudes_bautismo"("personaId");

-- CreateIndex
CREATE INDEX "solicitudes_bautismo_estado_createdAt_idx" ON "solicitudes_bautismo"("estado", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "eventos_slug_key" ON "eventos"("slug");

-- CreateIndex
CREATE INDEX "eventos_estado_inicio_idx" ON "eventos"("estado", "inicio");

-- CreateIndex
CREATE INDEX "eventos_sedeId_idx" ON "eventos"("sedeId");

-- CreateIndex
CREATE INDEX "eventos_tipo_inicio_idx" ON "eventos"("tipo", "inicio");

-- CreateIndex
CREATE INDEX "eventos_eliminadoEn_idx" ON "eventos"("eliminadoEn");

-- CreateIndex
CREATE INDEX "inscripciones_evento_eventoId_estado_idx" ON "inscripciones_evento"("eventoId", "estado");

-- CreateIndex
CREATE INDEX "inscripciones_evento_personaId_idx" ON "inscripciones_evento"("personaId");

-- CreateIndex
CREATE INDEX "inscripciones_evento_eventoId_estado_enListaDesde_idx" ON "inscripciones_evento"("eventoId", "estado", "enListaDesde");

-- CreateIndex
CREATE INDEX "pagos_inscripcionEventoId_idx" ON "pagos"("inscripcionEventoId");

-- CreateIndex
CREATE INDEX "pagos_estado_createdAt_idx" ON "pagos"("estado", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notificaciones_claveIdempotencia_key" ON "notificaciones"("claveIdempotencia");

-- CreateIndex
CREATE INDEX "notificaciones_tipo_createdAt_idx" ON "notificaciones"("tipo", "createdAt");

-- CreateIndex
CREATE INDEX "notificaciones_creadoPorId_idx" ON "notificaciones"("creadoPorId");

-- CreateIndex
CREATE INDEX "entregas_notificacion_personaId_canal_createdAt_idx" ON "entregas_notificacion"("personaId", "canal", "createdAt");

-- CreateIndex
CREATE INDEX "entregas_notificacion_canal_estado_proximoIntentoEn_idx" ON "entregas_notificacion"("canal", "estado", "proximoIntentoEn");

-- CreateIndex
CREATE INDEX "entregas_notificacion_notificacionId_canal_estado_idx" ON "entregas_notificacion"("notificacionId", "canal", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "entregas_notificacion_notificacionId_personaId_canal_key" ON "entregas_notificacion"("notificacionId", "personaId", "canal");

-- CreateIndex
CREATE INDEX "comentarios_app_revisadoEn_createdAt_idx" ON "comentarios_app"("revisadoEn", "createdAt");

-- CreateIndex
CREATE INDEX "comentarios_app_origenHuella_createdAt_idx" ON "comentarios_app"("origenHuella", "createdAt");

-- CreateIndex
CREATE INDEX "comentarios_app_personaId_createdAt_idx" ON "comentarios_app"("personaId", "createdAt");

-- CreateIndex
CREATE INDEX "comentarios_app_revisadoPorId_idx" ON "comentarios_app"("revisadoPorId");

-- CreateIndex
CREATE UNIQUE INDEX "inscripciones_solicitudVidaServicioId_key" ON "inscripciones"("solicitudVidaServicioId");

-- CreateIndex
CREATE INDEX "personas_telefonoNormalizado_idx" ON "personas"("telefonoNormalizado");

-- CreateIndex
CREATE INDEX "personas_fechaNacimiento_idx" ON "personas"("fechaNacimiento");

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_solicitudVidaServicioId_fkey" FOREIGN KEY ("solicitudVidaServicioId") REFERENCES "solicitudes_vida_servicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completitudes_manuales" ADD CONSTRAINT "completitudes_manuales_declaracionId_fkey" FOREIGN KEY ("declaracionId") REFERENCES "declaraciones_historial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_cronograma" ADD CONSTRAINT "items_cronograma_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contenidos" ADD CONSTRAINT "contenidos_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contenidos" ADD CONSTRAINT "contenidos_itemCronogramaId_fkey" FOREIGN KEY ("itemCronogramaId") REFERENCES "items_cronograma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos_contenido" ADD CONSTRAINT "archivos_contenido_contenidoId_fkey" FOREIGN KEY ("contenidoId") REFERENCES "contenidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enlaces_contenido" ADD CONSTRAINT "enlaces_contenido_contenidoId_fkey" FOREIGN KEY ("contenidoId") REFERENCES "contenidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_vida_servicio" ADD CONSTRAINT "solicitudes_vida_servicio_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "celulas" ADD CONSTRAINT "celulas_ministerioId_fkey" FOREIGN KEY ("ministerioId") REFERENCES "ministerios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulaciones" ADD CONSTRAINT "postulaciones_ministerioId_fkey" FOREIGN KEY ("ministerioId") REFERENCES "ministerios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulaciones" ADD CONSTRAINT "postulaciones_celulaId_fkey" FOREIGN KEY ("celulaId") REFERENCES "celulas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_bautismo" ADD CONSTRAINT "solicitudes_bautismo_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_bautismo" ADD CONSTRAINT "solicitudes_bautismo_inscripcionEventoId_fkey" FOREIGN KEY ("inscripcionEventoId") REFERENCES "inscripciones_evento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones_evento" ADD CONSTRAINT "inscripciones_evento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones_evento" ADD CONSTRAINT "inscripciones_evento_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_inscripcionEventoId_fkey" FOREIGN KEY ("inscripcionEventoId") REFERENCES "inscripciones_evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas_notificacion" ADD CONSTRAINT "entregas_notificacion_notificacionId_fkey" FOREIGN KEY ("notificacionId") REFERENCES "notificaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas_notificacion" ADD CONSTRAINT "entregas_notificacion_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios_app" ADD CONSTRAINT "comentarios_app_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios_app" ADD CONSTRAINT "comentarios_app_revisadoPorId_fkey" FOREIGN KEY ("revisadoPorId") REFERENCES "personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ============================================================================
-- Lote 0 global — CHECK, índices únicos parciales, índices de expresión y la
-- vista de la bandeja, a mano (patrón H-140): reglas que el schema de Prisma no
-- expresa. Son la red de seguridad en la base; los servicios validan además
-- con mensaje por campo.
-- ============================================================================

-- --- spec 006: historial previo y Completitud Manual ---
-- FR-010: una sola declaración pendiente por Persona y etapa.
CREATE UNIQUE INDEX "declaraciones_historial_una_pendiente"
  ON "declaraciones_historial" ("personaId", "etapa") WHERE "estado" = 'pendiente';
ALTER TABLE "declaraciones_historial" ADD CONSTRAINT "declaracion_revision_coherente"
  CHECK (("estado" IN ('confirmada', 'rechazada')) = ("revisadoPorId" IS NOT NULL AND "revisadaEn" IS NOT NULL));
ALTER TABLE "declaraciones_historial" ADD CONSTRAINT "declaracion_motivo_solo_rechazada"
  CHECK ("motivoRechazo" IS NULL OR "estado" = 'rechazada');
ALTER TABLE "declaraciones_historial" ADD CONSTRAINT "declaracion_retirada_coherente"
  CHECK (("estado" = 'retirada') = ("retiradaEn" IS NOT NULL));
ALTER TABLE "declaraciones_historial" ADD CONSTRAINT "declaracion_textos_largo"
  CHECK (char_length(coalesce("comentario", '')) <= 500 AND char_length(coalesce("motivoRechazo", '')) <= 500);
-- FR-015: una sola Completitud vigente por Persona y etapa.
CREATE UNIQUE INDEX "completitudes_manuales_una_vigente"
  ON "completitudes_manuales" ("personaId", "etapa") WHERE "anuladaEn" IS NULL;
ALTER TABLE "completitudes_manuales" ADD CONSTRAINT "completitud_origen_coherente"
  CHECK (("origen" = 'declaracion') = ("declaracionId" IS NOT NULL));
ALTER TABLE "completitudes_manuales" ADD CONSTRAINT "completitud_anulacion_coherente"
  CHECK (("anuladaEn" IS NULL) = ("anuladaPorId" IS NULL));
ALTER TABLE "completitudes_manuales" ADD CONSTRAINT "completitud_nota_largo"
  CHECK (char_length(coalesce("nota", '')) <= 500);

-- --- spec 008: Vida de Servicio ---
CREATE UNIQUE INDEX "items_cronograma_semana_unica"
  ON "items_cronograma" ("grupoId", "numeroSemana") WHERE "eliminadoEn" IS NULL;
CREATE UNIQUE INDEX "items_cronograma_fecha_unica"
  ON "items_cronograma" ("grupoId", "fechaLiberacion") WHERE "eliminadoEn" IS NULL;
ALTER TABLE "items_cronograma" ADD CONSTRAINT "items_cronograma_semana_en_rango"
  CHECK ("numeroSemana" BETWEEN 1 AND 52);
CREATE INDEX "contenidos_liberacion_sin_avisar"
  ON "contenidos" ("liberacionAvisadaEn") WHERE "liberacionAvisadaEn" IS NULL;
ALTER TABLE "archivos_contenido" ADD CONSTRAINT "archivos_contenido_tamanio_maximo"
  CHECK ("tamanioBytes" BETWEEN 1 AND 15728640);
-- FR-012 (D60): una sola Solicitud de Vida de Servicio pendiente por Persona.
CREATE UNIQUE INDEX "solicitudes_vida_servicio_una_pendiente"
  ON "solicitudes_vida_servicio" ("personaId") WHERE "estado" = 'pendiente';
ALTER TABLE "solicitudes_vida_servicio" ADD CONSTRAINT "solicitudes_vida_servicio_sin_propuesta"
  CHECK ("estado" <> 'propuesta');
ALTER TABLE "solicitudes_vida_servicio" ADD CONSTRAINT "solicitudes_vida_servicio_motivo_largo"
  CHECK (char_length(coalesce("motivoRechazo", '')) <= 500);
-- Una Inscripción nace de exactamente un pedido (Vida Nueva o Vida de Servicio).
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_un_origen"
  CHECK (num_nonnulls("solicitudId", "solicitudVidaServicioId") = 1);
-- research #13: un Encuentro de asistencia (sin capítulos) por Grupo y fecha.
CREATE UNIQUE INDEX "encuentros_uno_por_fecha_servicio"
  ON "encuentros" ("grupoId", "fecha") WHERE "capitulos" IS NULL;

-- --- spec 009: Ministerios y Células ---
CREATE UNIQUE INDEX "postulaciones_una_pendiente"
  ON "postulaciones" ("personaId") WHERE "estado" = 'pendiente';
CREATE UNIQUE INDEX "postulaciones_una_aprobada"
  ON "postulaciones" ("personaId") WHERE "estado" = 'aprobada';
ALTER TABLE "postulaciones" ADD CONSTRAINT "postulaciones_inactiva_con_motivo"
  CHECK (("estado" = 'inactiva') = ("motivoInactivacion" IS NOT NULL));
ALTER TABLE "postulaciones" ADD CONSTRAINT "postulaciones_rechazada_revisada"
  CHECK ("estado" <> 'rechazada' OR "revisadaEn" IS NOT NULL);
ALTER TABLE "postulaciones" ADD CONSTRAINT "postulaciones_aprobada_revisada"
  CHECK ("estado" <> 'aprobada' OR "revisadaEn" IS NOT NULL);
ALTER TABLE "postulaciones" ADD CONSTRAINT "postulaciones_cambio_con_reemplazo"
  CHECK ("motivoInactivacion" IS DISTINCT FROM 'cambio_de_ministerio' OR "reemplazadaPorId" IS NOT NULL);
ALTER TABLE "postulaciones" ADD CONSTRAINT "postulaciones_textos_largo"
  CHECK (char_length(coalesce("motivacion", '')) <= 500 AND char_length(coalesce("disponibilidad", '')) <= 500
     AND char_length(coalesce("motivoRechazo", '')) <= 500 AND char_length(coalesce("motivoBaja", '')) <= 500);

-- --- spec 010: Bautismo ---
-- FR-004: una sola Solicitud abierta (pendiente o aprobada) por Persona.
CREATE UNIQUE INDEX "solicitudes_bautismo_una_abierta"
  ON "solicitudes_bautismo" ("personaId") WHERE "estado" IN ('pendiente', 'aprobada');
ALTER TABLE "solicitudes_bautismo" ADD CONSTRAINT "solicitudes_bautismo_asignacion_coherente"
  CHECK ("inscripcionEventoId" IS NULL OR "estado" IN ('aprobada', 'realizada'));
ALTER TABLE "solicitudes_bautismo" ADD CONSTRAINT "solicitudes_bautismo_realizada_coherente"
  CHECK (("estado" = 'realizada') = ("realizadaEn" IS NOT NULL));
ALTER TABLE "solicitudes_bautismo" ADD CONSTRAINT "solicitudes_bautismo_textos_largo"
  CHECK (char_length(coalesce("comentario", '')) <= 500 AND char_length(coalesce("motivoRechazo", '')) <= 500);

-- --- spec 011: Eventos ---
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_fin_despues_del_inicio" CHECK ("fin" IS NULL OR "fin" > "inicio");
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_aprobacion_con_inscripcion" CHECK ("requiereAprobacion" = false OR "requiereInscripcion" = true);
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_cupo_positivo" CHECK ("cupo" IS NULL OR "cupo" >= 1);
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_lista_con_cupo" CHECK ("permiteListaEspera" = false OR "cupo" IS NOT NULL);
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_costo_positivo" CHECK ("costo" IS NULL OR "costo" > 0);
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_costo_con_instrucciones" CHECK (("costo" IS NULL) = ("instruccionesPago" IS NULL));
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_recordatorio_valido"
  CHECK ("diasAnticipacionRecordatorio" IS NULL OR ("requiereInscripcion" AND "diasAnticipacionRecordatorio" BETWEEN 1 AND 60));
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_flyer_con_texto_alternativo" CHECK (("imagenUrl" IS NULL) = ("descripcionImagen" IS NULL));
-- FR-045 (D188): un Evento de bautismo solo lo arma el Admin.
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_bautismo_config"
  CHECK ("tipo" <> 'bautismo' OR ("requiereInscripcion" AND NOT "requiereAprobacion" AND "costo" IS NULL
     AND NOT "permiteListaEspera" AND "diasAnticipacionRecordatorio" IS NULL));
-- research #2 (FR-021): una sola Inscripción abierta por Persona y Evento.
CREATE UNIQUE INDEX "inscripciones_evento_una_abierta"
  ON "inscripciones_evento" ("personaId", "eventoId") WHERE "estado" IN ('confirmada', 'pendiente', 'lista_espera');
ALTER TABLE "inscripciones_evento" ADD CONSTRAINT "inscripciones_evento_lista_con_fecha"
  CHECK ("estado" <> 'lista_espera' OR "enListaDesde" IS NOT NULL);
ALTER TABLE "inscripciones_evento" ADD CONSTRAINT "inscripciones_evento_cancelada_con_motivo"
  CHECK ("estado" <> 'cancelada' OR "motivoCancelacion" IS NOT NULL);
-- FR-030: a lo sumo un Pago pendiente por Inscripción.
CREATE UNIQUE INDEX "pagos_uno_pendiente_por_inscripcion"
  ON "pagos" ("inscripcionEventoId") WHERE "estado" = 'pendiente_verificacion';
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_monto_positivo" CHECK ("monto" > 0);
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_rechazo_con_motivo" CHECK ("estado" <> 'rechazado' OR "motivoRechazo" IS NOT NULL);

-- --- spec 012: Notificaciones ---
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_manual_coherente"
  CHECK ("tipo" <> 'manual' OR ("titulo" IS NOT NULL AND "mensaje" IS NOT NULL AND "creadoPorId" IS NOT NULL
     AND "evento" IS NULL AND "params" IS NULL AND "claveIdempotencia" IS NULL));
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_automatica_coherente"
  CHECK ("tipo" <> 'automatica' OR ("evento" IS NOT NULL AND "titulo" IS NULL AND "mensaje" IS NULL AND "creadoPorId" IS NULL));
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_alcance_coherente"
  CHECK (("alcance" = 'todos') = ("alcanceId" IS NULL));
ALTER TABLE "entregas_notificacion" ADD CONSTRAINT "entregas_leida_solo_app"
  CHECK ("canal" = 'app' OR "leidaEn" IS NULL);
-- research #10: el contador de sin leer.
CREATE INDEX "entregas_sin_leer"
  ON "entregas_notificacion" ("personaId") WHERE "canal" = 'app' AND "leidaEn" IS NULL;

-- --- spec 013: Backoffice del Admin ---
ALTER TABLE "comentarios_app" ADD CONSTRAINT "comentarios_texto_largo"
  CHECK (char_length("texto") BETWEEN 1 AND 2000);
ALTER TABLE "comentarios_app" ADD CONSTRAINT "comentarios_revision_coherente"
  CHECK (("revisadoEn" IS NULL) = ("revisadoPorId" IS NULL));
ALTER TABLE "comentarios_app" ADD CONSTRAINT "comentarios_contacto_solo_sin_sesion"
  CHECK ("personaId" IS NULL OR ("contactoEmail" IS NULL AND "contactoTelefono" IS NULL));
ALTER TABLE "comentarios_app" ADD CONSTRAINT "comentarios_contacto_si_acepta"
  CHECK ("personaId" IS NOT NULL OR NOT "aceptaContacto" OR "contactoEmail" IS NOT NULL OR "contactoTelefono" IS NOT NULL);
ALTER TABLE "cursos" ADD CONSTRAINT "cursos_descripcion_largo"
  CHECK (char_length(coalesce("descripcion", '')) <= 500);
-- Cumpleaños del mes (Prisma no modela índices de expresión).
CREATE INDEX "personas_mes_nacimiento_idx" ON "personas" ((EXTRACT(MONTH FROM "fechaNacimiento")));

-- --- Bandeja unificada (D178): copia de prisma/vistas/solicitudes_bandeja.sql ---
-- Vista de la bandeja unificada de Solicitudes (D178, D207, D208).
-- ÚNICA fuente versionada: toda migración que cambie la vista copia este
-- archivo entero con CREATE OR REPLACE VIEW (contrato de cinco pasos de
-- specs/013-backoffice-admin/contracts/bandeja-api.md).
--
-- Una rama por tipo (`TipoSolicitud`, packages/shared-types/src/bandeja.ts),
-- todas con la forma base de docs/04. `abierta` = espera una acción del Admin;
-- tiene que coincidir con ESTADOS_ABIERTOS (un test de integración las ata).
CREATE OR REPLACE VIEW "solicitudes_bandeja" AS
  -- 004: Solicitud de Discipulado. La espera de una `propuesta` cuenta desde
  -- la propuesta vigente.
  SELECT 'discipulado'::text AS "tipo", s."id", s."personaId", s."estado"::text AS "estado",
         (s."estado" IN ('pendiente', 'propuesta')) AS "abierta",
         s."createdAt", COALESCE(pr."propuestaEn", s."createdAt") AS "esperaDesde",
         s."creadoPorId", s."revisadoPorId", s."revisadaEn"
    FROM "solicitudes_discipulado" s
    LEFT JOIN "propuestas_discipulado" pr
      ON pr."solicitudId" = s."id" AND pr."estado" = 'pendiente'
  UNION ALL
  -- 006: Declaración de Historial ("Ya lo hice").
  SELECT 'historial', d."id", d."personaId", d."estado"::text,
         (d."estado" = 'pendiente'),
         d."createdAt", d."createdAt",
         d."creadoPorId", d."revisadoPorId", d."revisadaEn"
    FROM "declaraciones_historial" d
  UNION ALL
  -- 008: Solicitud de inscripción a Vida de Servicio.
  SELECT 'vida_de_servicio', v."id", v."personaId", v."estado"::text,
         (v."estado" = 'pendiente'),
         v."createdAt", v."createdAt",
         v."creadoPorId", v."revisadoPorId", v."revisadaEn"
    FROM "solicitudes_vida_servicio" v
  UNION ALL
  -- 009: Postulación a Ministerio.
  SELECT 'postulacion', p."id", p."personaId", p."estado"::text,
         (p."estado" = 'pendiente'),
         p."createdAt", p."createdAt",
         p."creadoPorId", p."revisadoPorId", p."revisadaEn"
    FROM "postulaciones" p
  UNION ALL
  -- 010: Solicitud de Bautismo. Una `aprobada` esperando fecha NO es abierta
  -- (D186): la bandeja la filtra aparte ("Esperando fecha").
  SELECT 'bautismo', b."id", b."personaId", b."estado"::text,
         (b."estado" = 'pendiente'),
         b."createdAt", b."createdAt",
         b."creadoPorId", b."revisadoPorId", b."revisadaEn"
    FROM "solicitudes_bautismo" b
  UNION ALL
  -- 011: Inscripción a Evento. Solo las de Eventos con aprobación llegan a
  -- `pendiente`; una confirmada con pago pendiente no es abierta (D196).
  SELECT 'inscripcion_evento', i."id", i."personaId", i."estado"::text,
         (i."estado" = 'pendiente'),
         i."createdAt", i."createdAt",
         i."creadoPorId", i."revisadoPorId", i."revisadoEn"
    FROM "inscripciones_evento" i
  UNION ALL
  -- 011: Pago (la Persona es la de su Inscripción).
  SELECT 'pago', g."id", ie."personaId", g."estado"::text,
         (g."estado" = 'pendiente_verificacion'),
         g."createdAt", g."createdAt",
         g."creadoPorId", g."verificadoPorId", g."revisadoEn"
    FROM "pagos" g
    JOIN "inscripciones_evento" ie ON ie."id" = g."inscripcionEventoId";
