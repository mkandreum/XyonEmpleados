-- Add shiftReminderEmail column to User table (idempotente)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "shiftReminderEmail" BOOLEAN NOT NULL DEFAULT true;

-- Add comment explaining the field
COMMENT ON COLUMN "User"."shiftReminderEmail" IS 'Whether to send email reminder 30 minutes before shift start time';
