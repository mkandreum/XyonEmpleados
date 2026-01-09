#!/bin/bash
set -e

# Configuration
OLD_DB="velilla_db"
NEW_DB="xyonempleados_db"
DB_USER="postgres"
CONTAINER_SERVICE="db"

echo "🚀 Starting Database Migration: $OLD_DB -> $NEW_DB"

# 1. Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose could not be found."
    exit 1
fi

# 2. Backup Old Database
echo "📦 Backing up $OLD_DB..."
docker-compose exec -T $CONTAINER_SERVICE pg_dump -U $DB_USER $OLD_DB > backup_velilla.sql

if [ $? -eq 0 ]; then
    echo "✅ Backup successful: backup_velilla.sql"
else
    echo "❌ Backup failed!"
    exit 1
fi

# 3. Create New Database
echo "🔨 Creating new database $NEW_DB..."
# Ignore error if DB exists
docker-compose exec $CONTAINER_SERVICE createdb -U $DB_USER $NEW_DB || echo "⚠️  Database might already exist, continuing..."

# 4. Restore Data to New Database
echo "📥 Restoring data to $NEW_DB..."
cat backup_velilla.sql | docker-compose exec -T $CONTAINER_SERVICE psql -U $DB_USER $NEW_DB

if [ $? -eq 0 ]; then
    echo "✅ Data migration successful!"
    echo ""
    echo "👉 NEXT STEP: Update your docker-compose.yaml to use POSTGRES_DB=$NEW_DB and restart."
else
    echo "❌ Restore failed!"
    exit 1
fi
