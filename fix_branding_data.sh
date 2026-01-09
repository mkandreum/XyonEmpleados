#!/bin/sh

# Fix Branding Data in Database
# This script removes the old "Velilla" overrides from the database,
# forcing the application to use the new "XyonEmpleados" defaults defined in the code.

export PGPASSWORD=secure_pg_password_123
DB_HOST="db"
DB_NAME="xyonempleados_db"
DB_USER="postgres"

echo "🧹 Cleaning legacy branding from database..."

# Install client if missing (for Alpine/Coolify)
if ! command -v psql &> /dev/null; then
  echo "Installing postgresql-client..."
  apk add --no-cache postgresql-client
fi

# 1. Update Company Name (or delete to use default)
# We choose to DELETE so it falls back to the code default "XyonEmpleados"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "DELETE FROM \"GlobalSettings\" WHERE key = 'companyName';"

# 2. Check if we need to remove old logo/icon if they refer to Velilla?
# psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "DELETE FROM \"GlobalSettings\" WHERE key = 'logoUrl';"
# (Optional: Commented out to avoid removing valid uploaded logo if it's generic)

echo "✅ Legacy branding removed. Application should now show defaults (XyonEmpleados)."
