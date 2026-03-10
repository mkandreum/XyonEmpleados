-- Migración: Renombrar sickLeaveDays a sickLeaveHours (idempotente)
-- Fecha: 2026-03-10

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'DepartmentBenefits'
      AND column_name = 'sickLeaveDays'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'DepartmentBenefits'
      AND column_name = 'sickLeaveHours'
  ) THEN
    ALTER TABLE "DepartmentBenefits"
      RENAME COLUMN "sickLeaveDays" TO "sickLeaveHours";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'UserBenefitsBalance'
      AND column_name = 'sickLeaveDaysUsed'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'UserBenefitsBalance'
      AND column_name = 'sickLeaveHoursUsed'
  ) THEN
    ALTER TABLE "UserBenefitsBalance"
      RENAME COLUMN "sickLeaveDaysUsed" TO "sickLeaveHoursUsed";
  END IF;
END $$;
