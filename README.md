<div align="center">

# 👥 XyonEmpleados

**Sistema de gestión de empleados y RRHH**

*Un producto de [Xyon Platforms](https://github.com/mkandreum)*

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)

</div>

---

## ¿Qué es XyonEmpleados?

XyonEmpleados es una plataforma de gestión de empleados diseñada para empresas y pymes. Centraliza la administración del personal, control de presencia y organización de equipos en una sola herramienta web, lista para desplegar en infraestructura propia.

## ✨ Funcionalidades

- **Gestión completa de empleados**: alta, baja y modificación de fichas
- **Control de presencia y fichaje**
- **Organización por departamentos y equipos**
- **Panel de administración** con roles diferenciados
- **Despliegue self-hosted** compatible con Coolify y Docker

## 🛠️ Stack técnico

| Capa | Tecnología |
|------|----------|
| Frontend | React + TypeScript + Vite |
| Backend | Node.js + TypeScript |
| Despliegue | Docker + Coolify |

## 🚀 Instalación

```bash
git clone https://github.com/mkandreum/XyonEmpleados.git
cd XyonEmpleados
cp .env.example .env
docker-compose up -d
```

### Desarrollo local

```bash
npm install
npm run dev
```

## 🗄️ Base de datos: migración automática (Coolify)

No hace falta acceso directo a la base de datos. En cada arranque del contenedor, `backend/prisma/runMigrations.js`:

1. Espera a que PostgreSQL esté listo y toma un bloqueo, para que solo un contenedor migre a la vez.
2. Si hay cambios pendientes, hace antes una **copia con `pg_dump`** en el volumen `uploads/backups` (no se sirve por web; se conservan las 5 últimas). Si la copia falla, **no toca nada**.
3. Aplica los `.sql` pendientes de `backend/prisma/migrations/` por orden de nombre y los registra en la tabla `_AppMigrations`.
4. Sincroniza con `schema.prisma` **solo de forma aditiva**: crea tablas, columnas, índices y claves que falten. Nunca borra, renombra ni cambia tipos; esas diferencias se avisan en el log para hacerlas con un `.sql` revisado.

Si la migración falla 10 veces seguidas, el contenedor no arranca el servidor y Coolify marca el despliegue como fallido. El estado (última migración, pendientes y copias) se ve en **Panel de administración → Base de datos**.

**Nuevas migraciones:** añade un `.sql` idempotente (`IF NOT EXISTS`, bloques `DO $$ … $$`) con prefijo numérico, por ejemplo `006_mi_cambio.sql`.

**Variables opcionales:** `MIGRATION_BACKUPS_KEEP` (5), `MIGRATION_BACKUPS_DIR`, `MIGRATE_WITHOUT_BACKUP=1` (no recomendado), `MIGRATION_SKIP_SCHEMA_SYNC=1`.

**Restaurar una copia** desde la terminal del contenedor `app` en Coolify:

```sh
ls -lh /app/uploads/backups
pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" /app/uploads/backups/pre-migrate-AAAAMMDD-HHMMSS.dump
```

## 🏢 Xyon Platforms

XyonEmpleados es un producto desarrollado y mantenido por **Xyon Platforms**, empresa especializada en soluciones digitales para negocios locales y pymes.

> © Xyon Platforms — Todos los derechos reservados
