# 🚀 Auto-Deploy Migrations Guide

## ✅ Estado Actual

Todas las migraciones están configuradas para ejecutarse **automáticamente** en Coolify.

### Lo que sucede en el deploy:

```bash
# Tu Coolify ejecutará estos pasos automáticamente:

1. npm install
   ↓
2. npm run build
   ├─ npm run prisma:generate   # Genera cliente Prisma
   └─ npm run prisma:migrate    # 🔑 EJECUTA MIGRACIONES
   ↓
3. npm start
   └─ node src/server.js        # Servidor activo
```

---

## 📋 Migraciones Implementadas

### ✅ 1. `rename_sick_leave_to_hours.sql`
- **Renombra:** `sickLeaveDays` → `sickLeaveHours`  
- **Renombra:** `sickLeaveDaysUsed` → `sickLeaveHoursUsed`
- **Tablas:** `DepartmentBenefits`, `UserBenefitsBalance`
- **Sincronización:** Backend + Frontend ya actualizados

### ✅ 2. `unify_schedule_models.sql`
- **Migra:** `DepartmentSchedule` (legacy) → `DepartmentShift` (nuevo)
- **Conversión:** Per-day schedules a JSON `scheduleOverrides`
- **Sincronización:** Controllers reescritos, DepartmentSchedule aún existe por compatibilidad

### ✅ 3. `add_shift_reminder_email.sql`
- **Agrega:** `User.shiftReminderEmail` (BOOLEAN, default: true)
- **Función:** Toggle en Perfil para recordatorios de fichaje 30 min antes
- **Sincronización:** Frontend + Backend + Cron jobs listos

---

## 🔧 Requisitos en Coolify

Antes de hacer el deploy, asegúrate de que en Coolify tienes configurado:

### Variables de Entorno Requeridas:
```env
DATABASE_URL=postgresql://user:password@host:5432/database_name
NODE_ENV=production
JWT_SECRET=tu_jwt_secret_aqui
ENCRYPTION_KEY=base64_de_32_bytes_aqui
PORT=3000
```

### Comandos en Coolify:
- **Build:** `npm run build`
- **Start:** `npm start`

### Puerto:
- **Puerto:** 3000 (o el configurado en `PORT`)

---

## 📊 Verificación Post-Deploy

Después de desplegar, verifica que todo funcione:

### 1. Migraciones Completadas:
```bash
# Desde terminal en Coolify:
npx prisma migrate status
# Debe mostrar: ✓ All migrations have been applied
```

### 2. Nuevos Campos en BD:
```bash
# Verificar sickLeaveHours:
SELECT "sickLeaveHours" FROM "DepartmentBenefits" LIMIT 1;

# Verificar DepartmentShift:
SELECT * FROM "DepartmentShift" LIMIT 1;

# Verificar shiftReminderEmail:
SELECT "shiftReminderEmail" FROM "User" LIMIT 1;
```

### 3. Funcionalidades en Frontend:
- [ ] Acceso a Perfil → Notificaciones → Toggle "Recordatorio de Fichaje"
- [ ] Admin → Beneficios → "Horas Médicas" (antes era "Días Médicos")
- [ ] Vacaciones → Horas médicas mostradas correctamente

### 4. Logs del Servidor:
```
# Buscar estos logs para confirmar que todo funciona:
✅ Shift reminder sent to...
🔄 Running pending database migrations...
✅ All migrations completed successfully!
```

---

## 🎯 Flujo de Email de Recordatorio

```
1. Usuario habilita en Perfil
   ↓
2. Cada 5 min, cron job chequea turnos activos
   ↓
3. 30 min antes de entrada:
   ├─ Email enviado
   ├─ Push notification enviada
   └─ In-app notification creada
   ↓
4. Usuario recibe: "Tienes [Turno] en 30 minutos"
```

---

## ❌ Solución de Problemas

### Error: "Migration `xyz` failed"
1. Verificar DATABASE_URL está correcto
2. Verificar usuario de DB tiene permisos ALTER TABLE
3. Revisar logs: `npm run prisma:migrate` manual

### Error: "shiftReminderEmail column not found"
1. Confirmar migración `add_shift_reminder_email` fue aplicada
2. Ejecutar: `npx prisma migrate status`

### Todo es lento después de deploy
1. Ejecutar: `REINDEX TABLE "DepartmentShift";`
2. Analizar: `ANALYSE;`

---

## 📞 Checklist Pre-Deploy

- [ ] DATABASE_URL configurada en Coolify
- [ ] ENCRYPTION_KEY generada y configurada
- [ ] Backup de base de datos realizado
- [ ] Verificado que no hay transacciones abiertas
- [ ] Horario de mantenimiento (reducir usuarios activos)

## ✅ Checklist Post-Deploy

- [ ] `npx prisma migrate status` muestra todo OK
- [ ] Toggle de recordatorio aparece en perfil
- [ ] "Horas Médicas" se muestra en admin/beneficios
- [ ] No hay errores en logs de servidor
- [ ] Un usuario puede activar/desactivar recordatorio

---

## 🎁 Bonus: Nuevas Features

### Email Recordatorio (30 min antes)
- Activable por usuario en Perfil
- Envía email + push + in-app
- Cron job cada 5 minutos
- Evita duplicados

### Horarios Unificados
- Un único modelo `DepartmentShift`
- `activeDays` para especificar qué días trabaja
- `scheduleOverrides` para excepciones por fecha

### Nombres Clarificados
- `sickLeaveDays` → `sickLeaveHours` (era confuso)

---

**Creado:** 10 de Marzo, 2026  
**Versión:** 1.5.0+migrations  
**Estado:** ✅ Listo para producción
