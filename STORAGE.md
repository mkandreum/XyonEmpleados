# Almacenamiento Persistente - XyonEmpleados

## Estructura de Almacenamiento

Este proyecto utiliza volúmenes de Docker para garantizar que todos los archivos subidos (PDFs, logos, fotos, etc.) se mantengan persistentes incluso cuando los contenedores se reinician o actualizan.

### Directorios de Uploads

```
/app/uploads/
├── public/          # Archivos accesibles públicamente vía URL estática
│   ├── logos/       # Logos de la empresa
│   ├── avatars/     # Fotos de perfil de usuarios
│   └── news/        # Imágenes de noticias
└── private/         # Archivos protegidos, accesibles solo vía API autenticada
    ├── payrolls/    # PDFs de nóminas
    └── justifications/  # Documentos de justificaciones
```

### Configuración de Docker

#### docker-compose.yaml
```yaml
services:
  app:
    volumes:
      - uploads:/app/uploads  # Volumen persistente para uploads
    
volumes:
  uploads:  # Volumen nombrado que persiste entre reinicios
```

#### Dockerfile
```dockerfile
# Crea la estructura de directorios
RUN mkdir -p uploads/public/logos uploads/public/avatars uploads/public/news \
             uploads/private/payrolls uploads/private/justifications

# Declara el volumen para persistencia
VOLUME ["/app/uploads"]
```

## Tipos de Archivos

### Archivos Públicos
- **Logos**: Formatos permitidos: JPEG, JPG, PNG, GIF, SVG
- **Avatares**: Formatos permitidos: JPEG, JPG, PNG
- **Noticias**: Formatos permitidos: JPEG, JPG, PNG, GIF

**URL de acceso**: `/uploads/public/{tipo}/{nombre-archivo}`

### Archivos Privados
- **Nóminas**: Formato permitido: PDF
- **Justificaciones**: Formatos permitidos: JPEG, JPG, PNG, PDF

**URL de acceso**: `/api/files/{tipo}/{nombre-archivo}` (requiere autenticación)

## Límites de Tamaño

- **Tamaño máximo por archivo**: 10 MB
- **Límite de body JSON**: 10 KB (para prevenir ataques DoS)

## Coolify / Producción

En Coolify, el volumen `uploads` se gestiona automáticamente:

1. **Primera vez**: Se crea el volumen vacío
2. **Actualizaciones**: El volumen persiste entre despliegues
3. **Backups**: Puedes hacer backup del volumen desde Coolify o manualmente:

```bash
# Backup manual del volumen
docker run --rm -v xyonempleados_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz /data

# Restaurar backup
docker run --rm -v xyonempleados_uploads:/data -v $(pwd):/backup alpine tar xzf /backup/uploads-backup.tar.gz -C /
```

## Verificación

Para verificar que los archivos se están guardando correctamente:

```bash
# Listar archivos en el volumen
docker exec -it <container-name> ls -la /app/uploads/public/
docker exec -it <container-name> ls -la /app/uploads/private/

# Ver el volumen en Docker
docker volume inspect xyonempleados_uploads
```

## Notas Importantes

1. ✅ Los archivos **NO se pierden** al actualizar el código
2. ✅ Los archivos **NO se pierden** al reiniciar contenedores
3. ✅ Los archivos **persisten** entre despliegues en Coolify
4. ⚠️ Si eliminas el volumen manualmente, **perderás todos los archivos**
5. 💡 Recomendación: Configura backups automáticos en Coolify

## Seguridad

- Los archivos privados (nóminas, justificaciones) **requieren autenticación** para acceder
- Los archivos públicos (logos, avatares, noticias) son accesibles sin autenticación
- Todos los uploads tienen validación de tipo de archivo
- Rate limiting aplicado para prevenir abuso
