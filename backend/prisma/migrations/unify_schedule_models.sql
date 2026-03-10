-- Migration: Unify schedule models (idempotente)
-- Migrate all DepartmentSchedule data to DepartmentShift

DO $$
BEGIN
  IF to_regclass('public."DepartmentSchedule"') IS NOT NULL
     AND to_regclass('public."DepartmentShift"') IS NOT NULL THEN
    UPDATE "DepartmentShift" dsh
    SET
      "horaEntrada" = ds."horaEntrada",
      "horaSalida" = ds."horaSalida",
      "horaEntradaTarde" = ds."horaEntradaTarde",
      "horaSalidaMañana" = ds."horaSalidaMañana",
      "toleranciaMinutos" = ds."toleranciaMinutos",
      "flexibleSchedule" = ds."flexibleSchedule",
      "scheduleOverrides" = CASE
        WHEN (ds."scheduleLunes" IS NOT NULL OR ds."scheduleMartes" IS NOT NULL OR
              ds."scheduleMiercoles" IS NOT NULL OR ds."scheduleJueves" IS NOT NULL OR
              ds."scheduleViernes" IS NOT NULL OR ds."scheduleSabado" IS NOT NULL OR
              ds."scheduleDomingo" IS NOT NULL) THEN
          jsonb_build_object(
            'LUNES', ds."scheduleLunes",
            'MARTES', ds."scheduleMartes",
            'MIERCOLES', ds."scheduleMiercoles",
            'JUEVES', ds."scheduleJueves",
            'VIERNES', ds."scheduleViernes",
            'SABADO', ds."scheduleSabado",
            'DOMINGO', ds."scheduleDomingo"
          )
        ELSE NULL
      END,
      "updatedAt" = NOW()
    FROM "DepartmentSchedule" ds
    WHERE dsh."department" = ds."department"
      AND dsh."name" = COALESCE(ds."name", 'General');

    INSERT INTO "DepartmentShift"
      (id, department, name, "activeDays", "horaEntrada", "horaSalida", "horaEntradaTarde", "horaSalidaMañana", "toleranciaMinutos", "flexibleSchedule", "scheduleOverrides", "createdAt", "updatedAt")
    SELECT
      md5(random()::text || clock_timestamp()::text),
      ds.department,
      COALESCE(ds.name, 'General'),
      'LUNES,MARTES,MIERCOLES,JUEVES,VIERNES',
      ds."horaEntrada",
      ds."horaSalida",
      ds."horaEntradaTarde",
      ds."horaSalidaMañana",
      ds."toleranciaMinutos",
      ds."flexibleSchedule",
      CASE
        WHEN (ds."scheduleLunes" IS NOT NULL OR ds."scheduleMartes" IS NOT NULL OR
              ds."scheduleMiercoles" IS NOT NULL OR ds."scheduleJueves" IS NOT NULL OR
              ds."scheduleViernes" IS NOT NULL OR ds."scheduleSabado" IS NOT NULL OR
              ds."scheduleDomingo" IS NOT NULL) THEN
          jsonb_build_object(
            'LUNES', ds."scheduleLunes",
            'MARTES', ds."scheduleMartes",
            'MIERCOLES', ds."scheduleMiercoles",
            'JUEVES', ds."scheduleJueves",
            'VIERNES', ds."scheduleViernes",
            'SABADO', ds."scheduleSabado",
            'DOMINGO', ds."scheduleDomingo"
          )
        ELSE NULL
      END,
      NOW(),
      NOW()
    FROM "DepartmentSchedule" ds
    WHERE NOT EXISTS (
      SELECT 1
      FROM "DepartmentShift" dsh
      WHERE dsh."department" = ds."department"
        AND dsh."name" = COALESCE(ds."name", 'General')
    );
  END IF;
END $$;

-- Note: DepartmentSchedule table will be kept for now for safety
-- Remove it in a future migration after verifying data integrity
-- DROP TABLE "DepartmentSchedule" CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS "idx_departmentshift_department" ON "DepartmentShift"("department");
