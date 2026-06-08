#!/bin/bash
# Script de restauración de backup de PostgreSQL
# Uso: ./restore.sh <archivo_backup.sql.gz>

# Configuración
CONTAINER_NAME="xyonempleados-db-1"
DB_NAME="xyonempleados_db"
DB_USER="postgres"
LOG_FILE="/var/log/xyonempleados_restore.log"

# Función de log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# Verificar argumento
if [ -z "$1" ]; then
    echo "❌ Error: Debe especificar el archivo de backup a restaurar"
    echo "Uso: $0 <archivo_backup.sql.gz>"
    echo ""
    echo "Backups disponibles:"
    ls -lh /var/backups/xyonempleados/*.sql.gz 2>/dev/null || echo "No se encontraron backups"
    exit 1
fi

BACKUP_FILE="$1"

# Verificar que el archivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: El archivo '$BACKUP_FILE' no existe"
    exit 1
fi

log "🔄 Iniciando restauración de backup: $BACKUP_FILE"

# Advertencia
echo "⚠️  ADVERTENCIA: Esta operación eliminará TODOS los datos actuales de la base de datos"
echo "Archivo de backup: $BACKUP_FILE"
echo "Base de datos: $DB_NAME"
echo ""
read -p "¿Está seguro de continuar? (escriba 'SI' para confirmar): " -r
echo

if [ "$REPLY" != "SI" ]; then
    log "❌ Operación cancelada por el usuario"
    exit 0
fi

log "📋 Creando backup de seguridad antes de restaurar..."
SAFETY_BACKUP="/var/backups/xyonempleados/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
docker exec $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME | gzip > $SAFETY_BACKUP
log "✅ Backup de seguridad creado: $SAFETY_BACKUP"

log "🗑️  Eliminando base de datos actual..."
docker exec $CONTAINER_NAME psql -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"

if [ $? -ne 0 ]; then
    log "❌ Error al eliminar la base de datos"
    exit 1
fi

log "🆕 Creando nueva base de datos..."
docker exec $CONTAINER_NAME psql -U $DB_USER -c "CREATE DATABASE $DB_NAME;"

if [ $? -ne 0 ]; then
    log "❌ Error al crear la base de datos"
    exit 1
fi

log "📥 Restaurando datos desde el backup..."
gunzip < "$BACKUP_FILE" | docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME > /dev/null 2>&1

if [ $? -eq 0 ]; then
    log "✅ Restauración completada exitosamente"
    log "📊 Backup utilizado: $BACKUP_FILE"
    log "🛡️  Backup de seguridad guardado en: $SAFETY_BACKUP"
    echo ""
    echo "✅ La base de datos ha sido restaurada correctamente"
    echo "🔄 Reinicia la aplicación para aplicar los cambios:"
    echo "   docker-compose restart app"
else
    log "❌ Error durante la restauración"
    log "⚠️  Restaurando desde el backup de seguridad..."
    gunzip < "$SAFETY_BACKUP" | docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME
    log "✅ Base de datos restaurada al estado previo"
    exit 1
fi
