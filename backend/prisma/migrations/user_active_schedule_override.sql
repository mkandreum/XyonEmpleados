-- Usuario activo/inactivo (idempotente)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

-- Excepciones de horario por dia (usuario o departamento)
CREATE TABLE IF NOT EXISTS "ScheduleOverride" (
    "id" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "userId" TEXT,
    "userKey" TEXT NOT NULL DEFAULT '',
    "date" TEXT NOT NULL,
    "dayOff" BOOLEAN NOT NULL DEFAULT false,
    "horaEntrada" TEXT,
    "horaSalida" TEXT,
    "toleranciaMinutos" INTEGER,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScheduleOverride_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ScheduleOverride_department_userKey_date_key" ON "ScheduleOverride"("department", "userKey", "date");
CREATE INDEX IF NOT EXISTS "ScheduleOverride_department_date_idx" ON "ScheduleOverride"("department", "date");
CREATE INDEX IF NOT EXISTS "ScheduleOverride_userId_date_idx" ON "ScheduleOverride"("userId", "date");
DO $$ BEGIN
    ALTER TABLE "ScheduleOverride" ADD CONSTRAINT "ScheduleOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
