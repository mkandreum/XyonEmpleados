-- Migración: Renombrar sickLeaveDays a sickLeaveHours
-- Fecha: 2026-03-10
-- Descripción: Corrige la nomenclatura inconsistente donde sickLeaveDays realmente almacena HORAS

-- 1. Renombrar columna en DepartmentBenefits
ALTER TABLE "DepartmentBenefits" 
  RENAME COLUMN "sickLeaveDays" TO "sickLeaveHours";

-- 2. Renombrar columna en UserBenefitsBalance
ALTER TABLE "UserBenefitsBalance" 
  RENAME COLUMN "sickLeaveDaysUsed" TO "sickLeaveHoursUsed";

-- Notas:
-- - No se pierden datos en esta migración
-- - Los valores almacenados siguen siendo los mismos (horas)
-- - Solo cambia el nombre del campo para reflejar correctamente su contenido
-- - Después de esta migración, actualizar el schema.prisma y los controllers
