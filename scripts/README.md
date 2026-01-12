# Scripts de Backup y Restore

Esta carpeta contiene scripts para realizar backups y restauraciones de la base de datos PostgreSQL.

## 📦 Backup Automático

### Script: `backup.sh`

Realiza un backup completo de la base de datos y mantiene los últimos 7 días de backups.

#### Características:
- ✅ Backup comprimido en formato `.sql.gz`
- ✅ Retención automática de 7 días
- ✅ Logging detallado de todas las operaciones
- ✅ Validación de éxito del backup

#### Uso Manual:
```bash
chmod +x scripts/backup.sh
./scripts/backup.sh
```

#### Configurar Backup Automático (Cron):

**En Linux/Mac:**
```bash
# Editar crontab
crontab -e

# Agregar línea para backup diario a las 2 AM
0 2 * * * /ruta/completa/al/proyecto/scripts/backup.sh >> /var/log/xyonempleados_backup.log 2>&1
```

**En Windows:**
Usar "Programador de tareas" (Task Scheduler):
1. Abrir "Programador de tareas"
2. Crear tarea básica
3. Nombre: "XyonEmpleados Backup"
4. Desencadenador: Diariamente a las 2:00 AM
5. Acción: `bash scripts/backup.sh`

#### Ubicación de Backups:
- **Directorio:** `/var/backups/xyonempleados/`
- **Formato de nombre:** `xyonempleados_YYYYMMDD_HHMMSS.sql.gz`
- **Log:** `/var/log/xyonempleados_backup.log`

---

## 🔄 Restauración de Backup

### Script: `restore.sh`

Restaura la base de datos desde un archivo de backup.

#### Características:
- ✅ Backup de seguridad antes de restaurar
- ✅ Confirmación del usuario antes de proceder
- ✅ Rollback automático en caso de error
- ✅ Validación del archivo de backup

#### Uso:
```bash
chmod +x scripts/restore.sh

# Listar backups disponibles
ls -lh /var/backups/xyonempleados/

# Restaurar desde un backup específico
./scripts/restore.sh /var/backups/xyonempleados/xyonempleados_20260112_020000.sql.gz
```

#### Proceso de Restauración:
1. El script solicita confirmación (debe escribir "SI")
2. Crea un backup de seguridad antes de proceder
3. Elimina la base de datos actual
4. Crea una nueva base de datos
5. Restaura los datos desde el backup
6. En caso de error, restaura automáticamente desde el backup de seguridad

#### ⚠️ IMPORTANTE:
- La restauración es DESTRUCTIVA - eliminará todos los datos actuales
- Se recomienda hacer un backup manual antes de restaurar
- Después de restaurar, reiniciar la aplicación:
  ```bash
  docker-compose restart app
  ```

---

## 📋 Ejemplo de Workflow Completo

### Backup y Restauración de Prueba:
```bash
# 1. Realizar backup manual
./scripts/backup.sh

# 2. Ver archivos de backup
ls -lh /var/backups/xyonempleados/

# 3. Restaurar desde backup (si es necesario)
./scripts/restore.sh /var/backups/xyonempleados/xyonempleados_20260112_143000.sql.gz

#4. Reiniciar la aplicación
docker-compose restart app
```

### Verificar Estado de Backup:
```bash
# Ver último backup
ls -lt /var/backups/xyonempleados/ | head -n 2

# Ver tamaño total de backups
du -sh /var/backups/xyonempleados/

# Ver log de backups
tail -f /var/log/xyonempleados_backup.log
```

---

## 🛡️ Mejores Prácticas

1. **Backups Automáticos:**
   - Configurar cron para backups diarios
   - Verificar periódicamente que los backups se crean correctamente

2. **Retención:**
   - Los scripts mantienen 7 días automáticamente
   - Para retención más larga, copiar backups a almacenamiento externo (S3, Google Cloud Storage, etc.)

3. **Pruebas de Restauración:**
   - Probar la restauración al menos una vez al mes en un entorno de desarrollo
   - Verificar la integridad de los datos después de restaurar

4. **Monitoreo:**
   - Revisar logs regularmente
   - Configurar alertas si un backup falla

5. **Seguridad:**
   - Los backups contienen datos sensibles
   - Almacenar en ubicaciones seguras con permisos restrictivos
   - Considerar encriptación para backups críticos

---

## 📞 Troubleshooting

### Problema: "Cannot exec into container"
**Solución:** Verificar que Docker esté corriendo y que el nombre del contenedor sea correcto:
```bash
docker ps | grep db
# Si el nombre es diferente, actualizar la variable CONTAINER_NAME en los scripts
```

### Problema: "Permission denied"
**Solución:** Dar permisos de ejecución:
```bash
chmod +x scripts/backup.sh
chmod +x scripts/restore.sh
```

### Problema: "No space left on device"
**Solución:** Limpiar backups antiguos manualmente:
```bash
# Eliminar backups de más de 30 días
find /var/backups/xyonempleados/ -name "*.sql.gz" -mtime +30 -delete
```

### Problema: Backup tarda mucho tiempo
**Esto es normal** para bases de datos grandes. Considerar:
- Ejecutar backups en horarios de baja demanda
- Usar compresión más ligera si es necesario
- Verificar espacio en disco disponible
