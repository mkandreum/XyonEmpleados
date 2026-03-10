# 🚀 DEPLOYMENT GUIDE - XyonEmpleados en Coolify

## 📋 Resumen de Cambios - Marzo 2026

Este documento describe todas las migraciones de base de datos que se ejecutarán automáticamente en el despliegue en Coolify.

---

## ✅ Migraciones Automáticas

Al hacer deploy en Coolify, el sistema ejecutará automáticamente **3 migraciones**:

### 1️⃣ `rename_sick_leave_to_hours.sql`
**Objetivo:** Renombrar campo para claridad nomenclatura

```sql
-- Renombra DepartmentBenefits.sickLeaveDays → sickLeaveHours
-- Renombra UserBenefitsBalance.sickLeaveDaysUsed → sickLeaveHoursUsed
-- (Almacena HORAS, no días)
```

**Afecta:**
- Tabla: `DepartmentBenefits`
- Tabla: `UserBenefitsBalance`
- Controlador: `benefitsController.js`
- Frontend: `pages/admin/Benefits.tsx`, `pages/Vacations.tsx`, `pages/Absences.tsx`

---

### 2️⃣ `unify_schedule_models.sql`
**Objetivo:** Unificar dos modelos de horarios en conflicto

```sql
-- Migra datos de DepartmentSchedule (legacy) → DepartmentShift (nuevo)
-- DepartmentSchedule keeps schedule* fields per-day
-- DepartmentShift gets scheduleOverrides JSON format
-- Mantiene tabla legacy para compatibilidad (crear índices para performance)
```

**Antes:** ❌ Inconsistencia - DepartmentSchedule vs DepartmentShift
**Después:** ✅ Un único modelo - DepartmentShift con `activeDays` CSV y `scheduleOverrides` JSON

**Cambios en código:**
- `scheduleController.js` - Completamente reescrito
- `fichajeController.js` - 4 referencias de DepartmentSchedule → DepartmentShift
- `server.js` - Función de recordatorios ahora usa DepartmentShift

---

### 3️⃣ `add_shift_reminder_email.sql`
**Objetivo:** Agregar toggle para recordatorios de fichaje

```sql
-- Agrega columna: User.shiftReminderEmail (BOOLEAN, default: true)
-- Permite a usuarios activar/desactivar emails 30min antes del turno
```

**Cómo funciona:**
1. Usuario habilita en Perfil → Notificaciones → Recordatorio de Fichaje
2. Cron job cada 5 minutos verifica turnos activos
3. 30 min antes de entrada: envía email + in-app notification + push

**Afecta:**
- Tabla: `User`
- Frontend: `pages/Profile.tsx` - nuevo toggle
- Backend: `server.js` - función `sendShiftReminderEmails()`
- Backend: `authController.js` - nuevo campo en updateProfile

---

## 🔄 Proceso Automático de Despliegue en Coolify

### Paso 1: Configurar en Coolify

En tu proyecto Coolify, asegúrate de:

1. **Variables de Entorno:**
   ```env
   DATABASE_URL=postgresql://user:password@host:port/database
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=tu_secret_aqui
   ENCRYPTION_KEY=base64_de_32_bytes
   # ... otras variables
   ```

2. **Build Command:**
   ```bash
   npm run build
   ```

3. **Start Command:**
   ```bash
   npm start
   ```

### Paso 2: Qué Sucede Automáticamente

Cuando hagas el deploy con los comandos arriba:

```
Usuario hace PUSH a repositorio
           ↓
Coolify detecta cambios
           ↓
npm install                          # Instala dependencias
           ↓
npm run build                        # Ejecuta:
   ├─ npm run prisma:generate      # Genera Prisma Client
   ├─ npm run prisma:migrate       # 🔑 EJECUTA MIGRACIONES
   └─ echo Build complete
           ↓
npm start                            # Inicia servidor
   ├─ npm run prisma:migrate       # ⚠️ Intenta migraciones nuevamente (idempotent)
   └─ node src/server.js           # Servidor corriendo
           ↓
✅ Sistema listo
```

---

## ✨ Principales Características Nuevas

### 1. Email Recordatorio de Fichaje (30 min antes)
- **Activación:** Perfil → Notificaciones → "Recordatorio de Fichaje" [TOGGLE]
- **Frecuencia:** Cron cada 5 minutos, activa 30 min antes de turno
- **Contenido:** "Tienes [Turno] en 30 minutos. Tu entrada está configurada para las [hora]"
- **Entrega:** Email + Push + In-app notification

### 2. Horarios Unificados (DepartmentShift)
- **Campos nuevos:** `activeDays` (CSV), `scheduleOverrides` (JSON date-based)
- **Elimina duplicación:** Legacy `DepartmentSchedule` (aún existe para compatibilidad)
- **APIs:** 
  - `GET /api/department-schedules/:department` - Obtener turnos
  - `POST /api/department-schedules` - Crear/actualizar
  - `DELETE /api/department-schedules/:id` - Eliminar

### 3. Nomenclatura Clarificada
- `sickLeaveDays` → `sickLeaveHours` (almacena **horas**, no días)
- Actualizado en DB, backend, frontend, tipos TypeScript

---

## 📊 Estado de Implementación

```
✅ #1  - Rename sickLeaveDays → sickLeaveHours
✅ #2  - Unify schedule models
✅ #3  - Manager department validation
✅ #4  - Centralized notification service
✅ #5  - Race condition in balance fixed
✅ #6  - Fichaje sequence validation
✅ #7  - Legal vacation proration
✅ #8  - GPS validation
✅ #9  - Password policy enforced
✅ #10 - Admin deletion protection
✅ #11 - Email template validation
✅ #12 - Invitation code expiration
✅ #13 - N+1 query optimization
✅ #14 - UX improvements
✅ #15 - SMTP password encryption
✅ #16 - Audit logging

🎁 BONUS: Email reminder 30 min before shift
```

---

## ⚠️ Notas Importantes

### Antes del Deploy

1. **Backup de Base de Datos:**
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Verificar DATABASE_URL:**
   - Debe apuntar a tu PostgreSQL en producción
   - Debe tener permisos para ALTER TABLE

3. **ENCRYPTION_KEY (si usaste SMTP encryption):**
   - Base64 de 32 bytes
   - Generar: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
   - Guardar en variables de entorno

### Después del Deploy

1. **Verificar Migraciones:**
   ```bash
   npx prisma migrate status
   ```

2. **Verificar Campos Nuevos:**
   - Acceso a Perfil → debe ver toggle de Recordatorio
   - Datos en DB → `SELECT shiftReminderEmail FROM "User" LIMIT 1;`

3. **Monitorear Logs:**
   - Buscar: `✅ Shift reminder sent to`
   - Buscar: `Error in sendShiftReminderEmails`

---

## 🔧 Rollback (Si Fuese Necesario)

Si algo falla, tienes opciones:

### Opción 1: Rollback Manual
```bash
# En Coolify, ejecutar:
npx prisma migrate resolve --rolled-back unify_schedule_models
npx prisma migrate rollback --skip-generate
```

### Opción 2: Restore desde Backup
```bash
psql $DATABASE_URL < backup_20260310_120000.sql
```

---

## 📞 Soporte

Si encuentras errores:

1. **Revisar logs de Coolify**
2. **Ejecutar `npx prisma migrate status`** para ver estado
3. **Verificar DATABASE_URL** está correcto
4. **Contactar soporte** con logs

---

**Última actualización:** 10 de Marzo, 2026  
**Versión del Sistema:** 1.5.0  
**Cambios totales implementados:** 16 issues críticos + 1 feature (email reminders)
