#!/bin/bash
# Script de backup automático para PostgreSQL
# Este script debe

 ejecutarse con cron diariamente

# Configuración
BACKUP_DIR="/var/backups/xyonempleados"
CONTAINER_NAME="xyonempleados-db-1"
DB_NAME="xyonempleados_db"
DB_USER="postgres"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/xyonempleados_${DATE}.sql.gz"
LOG_FILE="/var/log/xyonempleados_backup.log"

# Crear directorio de backups si no existe
mkdir -p $BACKUP_DIR

# Función de log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "📦 Iniciando backup de la base de datos..."

# Realizar backup
docker exec $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_FILE

# Verificar si el backup fue exitoso
if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h $BACKUP_FILE | cut -f1)
    log "✅ Backup completado exitosamente: $BACKUP_FILE (${BACKUP_SIZE})"
else
    log "❌ Error durante el backup"
    exit 1
fi

# Eliminar backups antiguos (más de 7 días)
log "🧹 Limpiando backups antiguos..."
DELETED_COUNT=$(find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete -print | wc -l)
log "✅ Eliminados $DELETED_COUNT backups antiguos (>7 días)"

# Mostrar backups existentes
BACKUP_COUNT=$(ls -1 $BACKUP_DIR/*.sql.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh $BACKUP_DIR | cut -f1)
log "📊 Total de backups: $BACKUP_COUNT (Espacio total: $TOTAL_SIZE)"

log "🎉 Proceso de backup finalizado"
