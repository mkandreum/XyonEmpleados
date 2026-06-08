-- Migration: add_dashboard_layout
-- DashboardWidgetType enum
DO $$ BEGIN
    CREATE TYPE "DashboardWidgetType" AS ENUM (
        'FICHAJE', 'VACATIONS', 'PAYROLL', 'EVENTS',
        'NEWS', 'BENEFITS', 'ALERTS', 'ADJUSTMENTS', 'BANNER'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DashboardWidgetScope enum
DO $$ BEGIN
    CREATE TYPE "DashboardWidgetScope" AS ENUM (
        'ALL', 'EMPLOYEE', 'MANAGER', 'ADMIN'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DashboardLayout table
CREATE TABLE IF NOT EXISTS "DashboardLayout" (
    "id"          TEXT        NOT NULL PRIMARY KEY,
    "name"        TEXT        NOT NULL,
    "description" TEXT,
    "isActive"    BOOLEAN     NOT NULL DEFAULT false,
    "startDate"   TIMESTAMPTZ,
    "endDate"     TIMESTAMPTZ,
    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DashboardWidget table
CREATE TABLE IF NOT EXISTS "DashboardWidget" (
    "id"         TEXT                    NOT NULL PRIMARY KEY,
    "layoutId"   TEXT                    NOT NULL,
    "type"       "DashboardWidgetType"   NOT NULL,
    "label"      TEXT                    NOT NULL,
    "isActive"   BOOLEAN                 NOT NULL DEFAULT true,
    "order"      INTEGER                 NOT NULL DEFAULT 0,
    "scope"      "DashboardWidgetScope"  NOT NULL DEFAULT 'ALL',
    "department" TEXT,
    "config"     JSONB,
    "createdAt"  TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    "updatedAt"  TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    CONSTRAINT "DashboardWidget_layoutId_fkey"
        FOREIGN KEY ("layoutId") REFERENCES "DashboardLayout"("id") ON DELETE CASCADE
);

-- Index for efficient ordered queries
CREATE INDEX IF NOT EXISTS "DashboardWidget_layoutId_order_idx"
    ON "DashboardWidget"("layoutId", "order");
