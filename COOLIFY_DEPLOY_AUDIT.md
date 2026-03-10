# Auditoría de Fallos y Autodeploy (Coolify + Docker Compose)

Fecha: 2026-03-10

## 1) Hallazgos críticos detectados

1. **Riesgo de fallo en build de imagen backend (Prisma CLI ausente)**
   - Causa: instalación `npm install --only=production` en runtime, pero `postinstall` ejecuta `prisma generate` (CLI en devDependencies).
   - Impacto: build/deploy puede fallar en Coolify durante instalación.

2. **`seed` ejecutándose en cada arranque del contenedor**
   - Causa: `CMD` corría `npm run seed` en cada boot.
   - Impacto: riesgo de datos no deseados en producción y credenciales iniciales inseguras.

3. **Secretos hardcodeados en `docker-compose.yaml`**
   - Causa: `DATABASE_URL`, `POSTGRES_PASSWORD`, `JWT_SECRET`, `ADMIN_INITIAL_PASSWORD` estaban en claro.
   - Impacto: riesgo de seguridad y mala práctica para autodeploy.

4. **Base de datos expuesta por puerto público**
   - Causa: `5432:5432` publicado en host.
   - Impacto: superficie de ataque innecesaria en despliegue administrado.

## 2) Correcciones aplicadas

### Dockerfile
- Se cambió a instalación completa para generar Prisma y luego poda de dependencias:
  - `npm ci`
  - `npm run prisma:generate && npm prune --omit=dev`
- Se eliminó `seed` del comando de arranque:
  - Antes: `npm run prisma:migrate && npm run seed && node src/server.js`
  - Ahora: `npm run prisma:migrate && node src/server.js`

### docker-compose.yaml
- Se movieron secretos a variables de entorno de plataforma.
- Se parametrizó `DATABASE_URL` con variables de Postgres.
- Se cambió `restart: always` por `restart: unless-stopped`.
- Se eliminó exposición pública del puerto de `db`.
- Se mantuvo `healthcheck` y `depends_on` con condición de servicio saludable.

### Archivo de ejemplo de entorno
- Nuevo: `.env.compose.example`
- Incluye las variables mínimas requeridas para correr Compose localmente o en Coolify.

## 3) Variables requeridas en Coolify

Configura estas variables en el servicio del stack:

- `POSTGRES_USER` (ej: `postgres`)
- `POSTGRES_PASSWORD` (obligatoria)
- `POSTGRES_DB` (ej: `xyonempleados_db`)
- `JWT_SECRET` (obligatoria, alta entropía)
- `ADMIN_INITIAL_PASSWORD` (obligatoria, robusta)
- `ADMIN_EMAIL` (opcional; default `admin@xyonempleados.com`)
- `APP_PORT` (opcional; default `3000`)
- `FRONTEND_URL` (opcional, recomendado si usas dominio propio)

## 4) Configuración recomendada de Coolify

1. Crear recurso tipo **Docker Compose** apuntando al repositorio.
2. Seleccionar el archivo `docker-compose.yaml`.
3. Definir variables anteriores en **Environment Variables**.
4. Habilitar **Auto Deploy** por push a rama principal.
5. Verificar que la app publique el puerto `3000` (interno) y health endpoint:
   - `GET /api/health`

## 5) Checklist de validación post-deploy

- [ ] La app responde en `/api/health` con `status: ok`.
- [ ] Migraciones ejecutadas sin error en logs (`prisma:migrate`).
- [ ] Usuario admin inicial se crea correctamente (solo primera vez).
- [ ] Login admin funcional.
- [ ] Carga de archivos persiste entre reinicios (`uploads` volume).
- [ ] Base de datos no expuesta públicamente.

## 6) Notas operativas

- En este entorno local no hay CLI de Docker instalada, por lo que la validación fue estática de configuración.
- El build de frontend sí quedó validado correctamente (`npm run build` OK).

## 7) Recovery: "password authentication failed" con volumen existente

Síntoma típico en logs:
- `PostgreSQL Database directory appears to contain a database; Skipping initialization`
- `FATAL: password authentication failed for user "postgres"`

Causa:
- Al existir volumen persistente, Postgres **no** reaplica `POSTGRES_PASSWORD`.
- El backend intenta conectar con credenciales nuevas (o `DATABASE_URL` diferente) y falla.

## 8) Modo 100% automático (implementado)

El stack ahora arranca con estas garantías automáticas:

1. Servicio `db-credentials-init` genera una contraseña aleatoria una sola vez.
2. La contraseña se persiste en volumen `db_auth`.
3. `db` usa `POSTGRES_PASSWORD_FILE` leyendo ese archivo.
4. `app` construye `DATABASE_URL` en runtime leyendo el mismo archivo.
5. `app` reintenta `prisma:migrate` hasta que la DB acepte autenticación.

Resultado:
- Sin gestión manual de `DATABASE_URL`/`POSTGRES_PASSWORD` en despliegues nuevos.
- Sin desincronización de credenciales entre `app` y `db`.

### Importante para tu caso actual (volumen legacy ya creado)

Si el volumen `postgres_data` ya existe con contraseña histórica desconocida, hay una única acción inicial:

- **Opción recomendada**: eliminar `postgres_data` si puedes perder datos (entorno nuevo/testing), y redeploy.
- **Si NO puedes perder datos**: restaurar temporalmente credenciales antiguas para arrancar y migrar a este modo automático.

Después de esa única corrección inicial, el modo automático mantiene las credenciales sincronizadas sin intervención manual.

### Opción A (recomendada, sin pérdida de datos): usar la contraseña real del volumen

1. En Coolify, edita variables del stack para que:
   - `POSTGRES_PASSWORD` = contraseña original del volumen
   - `DATABASE_URL` use exactamente esa contraseña
2. Redeploy.

### Opción B (si no recuerdas la contraseña): resetear password dentro del contenedor DB

Ejecuta en terminal del contenedor `db`:

```bash
psql -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD 'NUEVA_PASSWORD_SEGURA';"
```

Luego actualiza en Coolify:
- `POSTGRES_PASSWORD=NUEVA_PASSWORD_SEGURA`
- `DATABASE_URL=postgresql://postgres:NUEVA_PASSWORD_SEGURA@db:5432/xyonempleados_db`

Y redeploy.

### Opción C (destructiva): reinicializar DB

Solo si quieres empezar desde cero:
- borrar volumen persistente de Postgres en Coolify
- redeploy con nuevas variables

Esto elimina todos los datos.
