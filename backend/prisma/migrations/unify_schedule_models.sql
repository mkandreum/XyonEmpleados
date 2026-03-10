-- Migration: Unify schedule models (idempotente)
-- Migrate all DepartmentSchedule data to DepartmentShift

DO $$
BEGIN
  IF to_regclass('public."DepartmentSchedule"') IS NOT NULL
     AND to_regclass('public."DepartmentShift"') IS NOT NULL THEN
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
    ON CONFLICT ("department", "name") DO UPDATE SET
      "horaEntrada" = EXCLUDED."horaEntrada",
      "horaSalida" = EXCLUDED."horaSalida",
      "horaEntradaTarde" = EXCLUDED."horaEntradaTarde",
      "horaSalidaMañana" = EXCLUDED."horaSalidaMañana",
      "toleranciaMinutos" = EXCLUDED."toleranciaMinutos",
      "flexibleSchedule" = EXCLUDED."flexibleSchedule",
      "scheduleOverrides" = EXCLUDED."scheduleOverrides",
      "updatedAt" = NOW();
  END IF;
END $$;

-- Note: DepartmentSchedule table will be kept for now for safety
-- Remove it in a future migration after verifying data integrity
-- DROP TABLE "DepartmentSchedule" CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS "idx_departmentshift_department" ON "DepartmentShift"("department");
