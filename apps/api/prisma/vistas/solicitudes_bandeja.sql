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
