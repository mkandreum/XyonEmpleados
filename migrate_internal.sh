#!/bin/sh
set -e

# Configuration
# NOTE: Update these if your Coolify internal DNS names differ.
# Usually 'db' or 'postgres' is the service name reachable within the network.
DB_HOST="db" 
DB_USER="postgres"
# Assumes env var POSTGRES_PASSWORD or PGPASSWORD is set in the container environment.
# If not, you might need to export it here:
# export PGPASSWORD="secure_pg_password_123" 

OLD_DB="velilla_db"
NEW_DB="xyonempleados_db"

echo "📦 Installing PostgreSQL Client tools..."
apk add --no-cache postgresql-client

echo "🚀 Starting Internal Migration: $OLD_DB -> $NEW_DB"

# Check if we can connect
if ! psql -h "$DB_HOST" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$OLD_DB"; then
    echo "❌ Error: Could not connect to database host '$DB_HOST' or database '$OLD_DB' does not exist."
    echo "   Ensure you are running this inside the app container and 'db' is the correct hostname."
    exit 1
fi

echo "🔨 Creating database $NEW_DB..."
# Create DB if not exists
psql -h "$DB_HOST" -U "$DB_USER" -tc "SELECT 1 FROM pg_database WHERE datname = '$NEW_DB'" | grep -q 1 || \
psql -h "$DB_HOST" -U "$DB_USER" -c "CREATE DATABASE $NEW_DB;"

echo "🔄 Dumping $OLD_DB and Restoring to $NEW_DB..."
pg_dump -h "$DB_HOST" -U "$DB_USER" "$OLD_DB" | psql -h "$DB_HOST" -U "$DB_USER" "$NEW_DB"

if [ $? -eq 0 ]; then
    echo "✅ Migration Successful!"
    echo "👉 Now update your environment variable DATABASE_URL in Coolify to point to '$NEW_DB' and redeploy."
else
    echo "❌ Migration Failed."
    exit 1
fi
