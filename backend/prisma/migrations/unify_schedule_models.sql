-- Migration: Unify schedule models
-- Migrate all DepartmentSchedule data to DepartmentShift
-- DepartmentSchedule per-day fields will be converted to scheduleOverrides JSON

-- First, ensure all existing DepartmentSchedule records exist in DepartmentShift
INSERT INTO "DepartmentShift" 
  (id, department, name, "activeDays", "horaEntrada", "horaSalida", "horaEntradaTarde", "horaSalidaMañana", "toleranciaMinutos", "flexibleSchedule", "scheduleOverrides", "createdAt", "updatedAt")
SELECT 
  COALESCE(gen_random_uuid()::text, uuid_generate_v4()::text),
  ds.department,
  COALESCE(ds.name, 'General'),
  'LUNES,MARTES,MIERCOLES,JUEVES,VIERNES', -- Default work week (can be customized later)
  ds."horaEntrada",
  ds."horaSalida",
  ds."horaEntradaTarde",
  ds."horaSalidaMañana",
  ds."toleranciaMinutos",
  ds."flexibleSchedule",
  -- Convert per-day schedules to scheduleOverrides JSON
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
ON CONFLICT ("department", name) DO UPDATE SET
  "horaEntrada" = EXCLUDED."horaEntrada",
  "horaSalida" = EXCLUDED."horaSalida",
  "horaEntradaTarde" = EXCLUDED."horaEntradaTarde",
  "horaSalidaMañana" = EXCLUDED."horaSalidaMañana",
  "toleranciaMinutos" = EXCLUDED."toleranciaMinutos",
  "flexibleSchedule" = EXCLUDED."flexibleSchedule",
  "scheduleOverrides" = EXCLUDED."scheduleOverrides",
  "updatedAt" = NOW();

-- Note: DepartmentSchedule table will be kept for now for safety
-- Remove it in a future migration after verifying data integrity
-- DROP TABLE "DepartmentSchedule" CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS "idx_departmentshift_department" ON "DepartmentShift"("department");
