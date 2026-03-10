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
