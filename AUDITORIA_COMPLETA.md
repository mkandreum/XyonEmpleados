# 📋 AUDITORÍA COMPLETA - XYONEMPLEADOS HR PORTAL
**Fecha:** 10 de Marzo, 2026  
**Versión del Sistema:** 1.5.0  
**Objetivo:** Identificar incoherencias, bugs y áreas de mejora para posicionar la aplicación como producto comercial profesional

---

## 🎯 RESUMEN EJECUTIVO

### Estado General del Sistema
✅ **Fortalezas:**
- Arquitectura sólida (React + Node.js + Prisma + PostgreSQL)
- Sistema de roles bien implementado (ADMIN, MANAGER, EMPLOYEE)
- Flujo de aprobación de vacaciones robusto (PENDING_MANAGER → PENDING_ADMIN → APPROVED)
- Sistema de fichajes con detección inteligente de turnos
- Panel de administración completo (backoffice)
- Notificaciones en tiempo real + Push Notifications
- Sistema de templates de email personalizable

⚠️ **Debilidades Críticas Encontradas:** 31 incoherencias identificadas
🔴 **Prioridad Alta:** 12 problemas
🟡 **Prioridad Media:** 11 problemas
🟢 **Prioridad Baja:** 8 problemas

---

## 🔴 PROBLEMAS CRÍTICOS (PRIORIDAD ALTA)

### 1. **INCOHERENCIA EN CÁLCULO DE BENEFICIOS: "sickLeaveDays" almacena HORAS**

**📍 Ubicación:**
- `backend/prisma/schema.prisma` - DepartmentBenefits.sickLeaveDays (Int)
- `backend/src/controllers/benefitsController.js` - líneas 190-200
- `pages/admin/Benefits.tsx` - etiqueta "Horas Médicas" pero campo "sickLeaveDays"

**Problema:**
El campo `sickLeaveDays` debería llamarse `sickLeaveHours` porque almacena **horas** no días. Esto causa confusión en toda la aplicación.

```typescript
// ❌ INCORRECTO (estado actual)
DepartmentBenefits {
  sickLeaveDays: 24 // ¿Son días o horas?
}

// ✅ CORRECTO (debería ser)
DepartmentBenefits {
  sickLeaveHours: 24 // Claramente son horas
}
```

**Impacto:**
- Confusión para desarrolladores
- Errores de interpretación en reportes
- Riesgo de bugs futuros en cálculos

**Solución:**
```sql
-- Migración Prisma necesaria
ALTER TABLE "DepartmentBenefits" 
  RENAME COLUMN "sickLeaveDays" TO "sickLeaveHours";

ALTER TABLE "UserBenefitsBalance" 
  RENAME COLUMN "sickLeaveDaysUsed" TO "sickLeaveHoursUsed";
```

**Esfuerzo:** 2-3 horas | **Impacto Comercial:** Alto (credibilidad técnica)

---

### 2. **DOBLE MODELO DE HORARIOS: DepartmentSchedule vs DepartmentShift**

**📍 Ubicación:**
- `backend/prisma/schema.prisma` - líneas 245 (DepartmentSchedule) y 218 (DepartmentShift)
- `backend/src/services/shiftAssignmentService.js`
- `backend/src/controllers/scheduleController.js`

**Problema:**
Existen **DOS modelos** para gestionar horarios de departamentos:
1. **DepartmentSchedule** (legacy) - con horarios por día (scheduleLunes, scheduleMartes...)
2. **DepartmentShift** (nuevo) - con activeDays CSV y scheduleOverrides JSON

El comentario dice "// Legacy: solo para compatibilidad temporal" pero **ambos están en uso activo**.

**Consecuencias:**
- Los managers pueden configurar horarios en DepartmentSchedule
- Los fichajes se evalúan con DepartmentShift
- **Datos inconsistentes:** si cambio el horario en Settings, los fichajes no se actualizan correctamente

**Caso de Uso Roto:**
```javascript
// Admin configura en Settings (usa DepartmentSchedule)
await scheduleService.update({
  department: 'IT',
  horaEntrada: '09:00',
  horaSalida: '18:00'
});

// Empleado ficha (usa selectClosestShift con DepartmentShift)
const shifts = await prisma.departmentShift.findMany({ 
  where: { department: 'IT' } 
});
// ❌ No encuentra el horario actualizado porque está en otra tabla
```

**Solución:**
1. **Opción A (Rápida):** Migrar todos los DepartmentSchedule a DepartmentShift y deprecar el modelo antiguo
2. **Opción B (Completa):** Unificar en un único modelo `WorkSchedule` con mejor diseño

**Esfuerzo:** 8-12 horas | **Impacto Comercial:** Muy Alto (funcionalidad core rota)

---

### 3. **FILTRO DE ROLES INCONSISTENTE: Managers ven datos de otros departamentos**

**📍 Ubicación:**
- `backend/src/routes.js` - línea 186 (GET /manager/team-members)
- `backend/src/controllers/vacationController.js` - getTeamVacations

**Problema:**
El endpoint `/manager/team-members` filtra por `department` correctamente:
```javascript
const members = await prisma.user.findMany({
  where: { department, role: { not: 'ADMIN' } }
});
```

Pero en `getTeamVacations` (línea 156) filtra por `status` y luego por `department` en la relación:
```javascript
where: {
  status: { in: ['PENDING_MANAGER', 'PENDING_ADMIN', 'APPROVED'] },
  user: { department: manager.department }
}
```

**Pero falta verificación en:**
- `/manager/fichajes/week` - línea 573
- `/manager/late-notifications/sent` - lateNotificationController.js línea 215

**Caso de Explotación:**
Un manager malicioso puede llamar `GET /api/fichajes/week?department=RRHH` y ver fichajes de otro departamento si no hay validación del token.

**Solución:**
Middleware centralizado para managers:
```javascript
// backend/src/middleware/auth.js
exports.validateManagerDepartment = async (req, res, next) => {
  const managerId = req.user.userId;
  const requestedDept = req.params.department || req.query.department;
  
  const manager = await prisma.user.findUnique({
    where: { id: managerId },
    select: { department: true, role: true }
  });
  
  if (manager.role !== 'ADMIN' && manager.department !== requestedDept) {
    return res.status(403).json({ error: 'No autorizado para este departamento' });
  }
  
  next();
};
```

**Esfuerzo:** 4 horas | **Impacto Comercial:** Crítico (seguridad)

---

### 4. **NOTIFICACIONES DUPLICADAS: createNotification + sendTemplateEmail**

**📍 Ubicación:**
- `backend/src/controllers/vacationController.js` - líneas 67-71 (createVacation)
- `backend/src/controllers/adminController.js` - líneas 229-238 (updateVacationStatus)
- `backend/src/controllers/lateNotificationController.js` - líneas 88-99

**Problema:**
Cuando se aprueba una solicitud, se envían **DOS notificaciones**:
1. Una notificación in-app con `createNotification()`
2. Un email con `sendTemplateEmail()`

Pero la lógica está **duplicada en múltiples controladores** sin centralización.

**Ejemplo actual:**
```javascript
// En adminController.js
await createNotification(userId, 'Actualización de Solicitud', '...');
await sendTemplateEmail(user.email, 'REQUEST_APPROVED', {...});

// En vacationController.js (manager aprueba)
await createNotification(userId, 'Solicitud Actualizada', '...');
// ❌ NO envía email aquí (inconsistencia)

// En lateNotificationController.js
await createNotification(userId, 'Aviso de llegada tarde', '...');
await sendTemplateEmail(user.email, 'LATE_ARRIVAL', {...});
```

**Consecuencias:**
- Usuario recibe notificación in-app pero NO email en algunos flujos
- Manager aprueba → Usuario NO recibe email (solo cuando Admin aprueba)
- Código duplicado en 4+ lugares

**Solución:**
Servicio centralizado:
```javascript
// backend/src/services/notificationService.js
exports.notifyUser = async (userId, type, data) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  const templates = {
    'VACATION_APPROVED': {
      title: 'Solicitud Aprobada',
      message: `Tu solicitud de ${data.type} ha sido aprobada`,
      emailTemplate: 'REQUEST_APPROVED'
    },
    'VACATION_REJECTED': { /*...*/ },
    'LATE_ARRIVAL': { /*...*/ }
  };
  
  const template = templates[type];
  
  // In-app notification
  await createNotification(userId, template.title, template.message);
  
  // Email notification
  if (template.emailTemplate) {
    await sendTemplateEmail(user.email, template.emailTemplate, data);
  }
  
  // Push notification (already integrated in createNotification)
};
```

**Esfuerzo:** 6 horas | **Impacto Comercial:** Alto (UX inconsistente)

---

### 5. **BALANCE DE VACACIONES CALCULADO INCORRECTAMENTE (Race Condition)**

**📍 Ubicación:**
- `backend/src/controllers/benefitsController.js` - líneas 98-120

**Problema:**
El endpoint `GET /api/benefits/user-balance` hace **cálculo bajo demanda** de los días usados:
```javascript
const approvedVacations = await prisma.vacationRequest.findMany({
  where: { userId, status: 'APPROVED', type: 'VACATION' }
});

const calculatedVacationDaysUsed = approvedVacations.reduce(
  (acc, curr) => acc + (curr.days || 0), 
  0
);
```

**Pero luego actualiza la DB:**
```javascript
if (balance.vacationDaysUsed !== calculatedVacationDaysUsed) {
  await prisma.userBenefitsBalance.update({
    where: { userId },
    data: { vacationDaysUsed: calculatedVacationDaysUsed }
  });
}
```

**Problemas:**
1. **Race condition:** Si dos requests llaman a `getUserBalance()` simultáneamente, pueden sobrescribirse
2. **Cálculo slow:** Cada request hace un `findMany` + `reduce` (N+1 problem)
3. **Inconsistencia:** El balance en DB puede estar desincronizado

**Caso de Fallo:**
```
1. Admin aprueba solicitud → actualiza balance a 10 días
2. Usuario llama GET /benefits/balance → calcula 8 días, actualiza DB
3. Balance incorrecto persistido
```

**Solución:**
Actualizar balance **solo cuando se aprueba/rechaza** la solicitud:
```javascript
// En adminController.updateVacationStatus (línea 191)
if (status === 'APPROVED') {
  await updateUserBalanceLogic(
    vacation.userId, 
    vacation.type, 
    vacation.days, 
    vacation.hours
  );
}
```

Y en `getUserBalance` **solo leer**, NO escribir:
```javascript
exports.getUserBenefitsBalance = async (req, res) => {
  const balance = await prisma.userBenefitsBalance.findUnique({...});
  // ✅ Solo leer, no calcular ni actualizar
  res.json(balance);
};
```

**Esfuerzo:** 3-4 horas | **Impacto Comercial:** Crítico (datos incorrectos)

---

### 6. **VALIDACIÓN DE FICHAJES: Secuencia SALIDA-ENTRADA permitida**

**📍 Ubicación:**
- `backend/src/utils/fichajeUtils.js` - función `validateFichajeSequence` (línea 254)

**Problema:**
La función valida que no haya dos ENTRADAS o dos SALIDAS consecutivas:
```javascript
for (let i = 0; i < sorted.length - 1; i++) {
  if (sorted[i].tipo === sorted[i + 1].tipo) {
    return { valid: false, error: '...' };
  }
}
return { valid: true };
```

**Pero NO valida:**
1. **Primer fichaje debe ser ENTRADA** (puede empezar con SALIDA)
2. **Último fichaje debe ser SALIDA** (puede terminar día sin salida)

**Caso de Explotación:**
```javascript
// Usuario hace trampa:
POST /fichajes { tipo: 'SALIDA' } // 08:00 (sin entrada previa)
POST /fichajes { tipo: 'ENTRADA' } // 08:01
POST /fichajes { tipo: 'SALIDA' } // 18:00
// Resultado: 10 horas trabajadas pero llegó a las 08:01
```

**Solución:**
```javascript
function validateFichajeSequence(fichajes) {
  if (fichajes.length === 0) return { valid: true };
  
  const sorted = [...fichajes].sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );
  
  // ✅ Validar primer fichaje
  if (sorted[0].tipo !== 'ENTRADA') {
    return { 
      valid: false, 
      error: 'El primer fichaje del día debe ser una ENTRADA' 
    };
  }
  
  // ✅ Validar último fichaje
  if (sorted.length % 2 !== 0) {
    return { 
      valid: false, 
      error: 'Debes cerrar el día con una SALIDA' 
    };
  }
  
  // Validar secuencia alternada
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].tipo === sorted[i + 1].tipo) {
      return { valid: false, error: 'No puedes tener dos fichajes seguidos del mismo tipo' };
    }
  }
  
  return { valid: true };
}
```

**Esfuerzo:** 2 horas | **Impacto Comercial:** Alto (integridad de datos)

---

### 7. **PRORATEO DE VACACIONES: Cálculo incorrecto para empleados nuevos**

**📍 Ubicación:**
- `backend/src/controllers/benefitsController.js` - líneas 137-148

**Problema:**
El cálculo de prorateo usa `diffDays / totalDaysInYear`:
```javascript
const joinDate = new Date(user.joinDate);
const startOfYear = new Date(currentYear, 0, 1);
const endOfYear = new Date(currentYear, 11, 31);

let daysActive = (endOfYear - joinDate) / (1000 * 60 * 60 * 24) + 1;
const totalDaysInYear = (endOfYear - startOfYear) / (1000 * 60 * 60 * 24) + 1;

const ratio = Math.min(1, Math.max(0, daysActive / totalDaysInYear));
vacationEntitlement = Math.round(deptBenefitsData.vacationDays * ratio);
```

**Problemas:**
1. **No considera año bisiesto** (2024 tiene 366 días, no 365)
2. **Redondeo puede dar 0 días** si el empleado entra el 31 de diciembre
3. **No hay días mínimos** garantizados por ley (España: mínimo 2.5 días/mes proporcional)

**Caso de Fallo:**
```javascript
// Empleado entra el 1 de diciembre (30 días activos)
daysActive = 30
totalDaysInYear = 365
ratio = 30/365 = 0.082
vacationEntitlement = Math.round(22 * 0.082) = Math.round(1.8) = 2 días

// ⚠️ Legalmente debería tener: (22 días anuales / 12 meses) * 1 mes = 1.83 ≈ 2 días
// Pero si entra el 20 de diciembre (11 días):
ratio = 11/365 = 0.03
vacationEntitlement = Math.round(22 * 0.03) = Math.round(0.66) = 1 día
// ❌ Debería tener al menos 1 día (0.5 meses * 2.5 días/mes)
```

**Solución según Estatuto de los Trabajadores (España):**
```javascript
// Calcular meses completos trabajados + días adicionales
const joinDate = new Date(user.joinDate);
const today = new Date();

const monthsWorked = (today.getFullYear() - joinDate.getFullYear()) * 12 
                    + (today.getMonth() - joinDate.getMonth());

const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
const daysWorkedInPartialMonth = today.getDate() - joinDate.getDate();
const partialMonthRatio = daysWorkedInPartialMonth / daysInCurrentMonth;

const totalMonthsEquivalent = monthsWorked + partialMonthRatio;

// Mínimo legal: 2.5 días por mes (30 días anuales / 12)
const vacationEntitlement = Math.max(
  1, // Al menos 1 día si trabajó cualquier tiempo
  Math.round((deptBenefitsData.vacationDays / 12) * totalMonthsEquivalent)
);
```

**Esfuerzo:** 4 horas + testing legal | **Impacto Comercial:** Crítico (cumplimiento legal)

---

### 8. **FICHAJES: Falta validación de geolocalización (GPS) para prevenir fraude**

**📍 Ubicación:**
- `backend/prisma/schema.prisma` - líneas 195-197 (campos latitude, longitude, accuracy existen)
- `backend/src/controllers/fichajeController.js` - NO valida coordenadas

**Problema:**
El schema tiene campos para geolocalización:
```prisma
model Fichaje {
  // ...
  latitude    Float?
  longitude   Float?
  accuracy    Float?
}
```

**Pero el endpoint `POST /fichajes` NO los valida ni requiere:**
```javascript
exports.createFichaje = async (req, res) => {
  const { tipo } = req.body;
  // ❌ No valida location
  
  const fichaje = await tx.fichaje.create({
    data: {
      userId, tipo, timestamp: now, department: user.department
      // ❌ latitude, longitude NO guardados
    }
  });
};
```

**Consecuencias:**
- Empleado puede fichar desde cualquier ubicación (casa, playa, extranjero)
- No hay validación de rango (ej: dentro de 500m de la oficina)
- Funcionalidad GPS implementada a medias

**Solución:**
```javascript
// 1. Frontend: Capturar GPS
const handleClockIn = async () => {
  const location = await getCurrentPosition();
  
  await fichajeService.create('ENTRADA', {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy
  });
};

// 2. Backend: Validar rango
exports.createFichaje = async (req, res) => {
  const { tipo, latitude, longitude, accuracy } = req.body;
  
  // Obtener ubicación de la oficina del departamento
  const officeLocation = await prisma.globalSettings.findUnique({
    where: { key: `officeLocation_${user.department}` }
  });
  
  if (officeLocation) {
    const distance = calculateDistance(
      latitude, longitude,
      officeLocation.lat, officeLocation.lng
    );
    
    const maxDistance = 500; // metros
    if (distance > maxDistance) {
      return res.status(400).json({
        error: `Debes estar cerca de la oficina para fichar (distancia: ${Math.round(distance)}m)`
      });
    }
  }
  
  const fichaje = await tx.fichaje.create({
    data: { userId, tipo, timestamp, department, latitude, longitude, accuracy }
  });
};
```

**Esfuerzo:** 8 horas | **Impacto Comercial:** Alto (prevención fraude)

---

### 9. **CONTRASEÑAS: No hay política de complejidad mínima**

**📍 Ubicación:**
- `backend/src/middleware/validation.js` - registerSchema
- `backend/src/controllers/authController.js` - register, changePassword

**Problema:**
La validación de contraseña es muy débil:
```javascript
const registerSchema = Joi.object({
  password: Joi.string().min(6).required()
  // ❌ Solo valida longitud mínima de 6 caracteres
});
```

**Contraseñas permitidas actualmente:**
- `123456` ✅
- `password` ✅
- `aaaaaa` ✅
- Todas sin mayúsculas, números o caracteres especiales

**Solución:**
```javascript
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .required()
  .messages({
    'string.pattern.base': 'La contraseña debe contener al menos: 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial (@$!%*?&)',
    'string.min': 'La contraseña debe tener al menos 8 caracteres'
  });

const registerSchema = Joi.object({
  password: passwordSchema,
  // ...
});
```

**Plus:** Comprobar contraseñas comprometidas con API de HaveIBeenPwned:
```javascript
const checkPasswordCompromised = async (password) => {
  const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = sha1.substring(0, 5);
  const suffix = sha1.substring(5);
  
  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  const hashes = await response.text();
  
  return hashes.includes(suffix);
};
```

**Esfuerzo:** 2 horas | **Impacto Comercial:** Medio (seguridad estándar)

---

### 10. **ROLES: Admin puede eliminarse a sí mismo (último admin)**

**📍 Ubicación:**
- `backend/src/controllers/adminController.js` - deleteUser (línea ~100)

**Problema:**
Un admin puede eliminar su propia cuenta sin validar si es el **último admin**:
```javascript
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  
  await prisma.user.delete({ where: { id } });
  // ❌ No valida si es el último admin
  
  res.json({ message: 'User deleted' });
};
```

**Caso de Desastre:**
```
1. Sistema tiene 1 solo admin
2. Admin se auto-elimina accidentalmente
3. ❌ Sistema queda sin administradores
4. ❌ No hay forma de recuperar acceso (excepto DB manual)
```

**Solución:**
```javascript
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  
  const userToDelete = await prisma.user.findUnique({
    where: { id },
    select: { role: true }
  });
  
  if (userToDelete.role === 'ADMIN') {
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' }
    });
    
    if (adminCount <= 1) {
      return res.status(400).json({
        error: 'No puedes eliminar el último administrador del sistema. Crea otro admin primero.'
      });
    }
  }
  
  // Verificar que no se auto-elimine
  if (id === req.user.userId) {
    return res.status(400).json({
      error: 'No puedes eliminar tu propia cuenta. Contacta con otro administrador.'
    });
  }
  
  await prisma.user.delete({ where: { id } });
  res.json({ message: 'Usuario eliminado correctamente' });
};
```

**Esfuerzo:** 1 hora | **Impacto Comercial:** Medio (seguridad básica)

---

### 11. **EMAIL TEMPLATES: Variables no documentadas causan confusión**

**📍 Ubicación:**
- `backend/src/services/emailTemplateService.js` - líneas 48-140
- `components/EmailTemplateEditor.tsx` - interfaz de edición

**Problema:**
Las plantillas de email usan variables como `{{employeeName}}`, pero:
1. **No hay documentación** de qué variables son válidas para cada template
2. **No hay validación** de que todas las variables requeridas estén presentes
3. **frontendbackend usan nombres diferentes** en algunos casos

**Ejemplo actual:**
```javascript
// Backend envía:
await sendTemplateEmail(email, 'REQUEST_APPROVED', {
  employeeName: user.name,
  requestType: 'Vacaciones',
  startDate: '15/01/2026',
  endDate: '20/01/2026',
  days: '5'
});

// Pero template podría usar:
"Hola {{userName}}, tu solicitud de {{type}} ha sido aprobada"
// ❌ userName y type no existen → email vacío
```

**Solución:**
1. Crear un registro de variables por tipo de template:
```javascript
// backend/src/services/emailTemplateService.js
const TEMPLATE_SCHEMAS = {
  'LATE_ARRIVAL': {
    requiredVars: ['employeeName', 'managerName', 'date', 'time'],
    optionalVars: [],
    description: 'Notificación de llegada tarde enviada al empleado'
  },
  'REQUEST_APPROVED': {
    requiredVars: ['employeeName', 'requestType', 'startDate', 'endDate', 'days'],
    optionalVars: ['reason'],
    description: 'Confirmación de aprobación de solicitud'
  },
  // ...
};

const validateTemplateVariables = (type, variables) => {
  const schema = TEMPLATE_SCHEMAS[type];
  const missingVars = schema.requiredVars.filter(v => !variables[v]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required variables for ${type}: ${missingVars.join(', ')}`);
  }
};
```

2. Mostrar variables disponibles en el editor (como tooltip):
```tsx
// components/EmailTemplateEditor.tsx
<div className="variable-helper">
  <h4>Variables disponibles para {template.type}:</h4>
  <ul>
    {TEMPLATE_SCHEMAS[template.type].requiredVars.map(v => (
      <li key={v}>
        <code>{{'{{'}{v}{'}}'}}}</code> <span className="required">*</span>
        <p>{variableDescriptions[v]}</p>
      </li>
    ))}
  </ul>
</div>
```

**Esfuerzo:** 3-4 horas | **Impacto Comercial:** Medio (usabilidad)

---

### 12. **INVITACIÓN CODES: No hay expiración automática**

**📍 Ubicación:**
- `backend/prisma/schema.prisma` - InvitationCode.expiresAt (DateTime?)
- `backend/src/controllers/authController.js` - register (línea 85-95)

**Problema:**
El modelo tiene campo `expiresAt` opcional:
```prisma
model InvitationCode {
  expiresAt DateTime?
  // ...
}
```

**Pero la validación NO lo verifica:**
```javascript
const invite = await prisma.invitationCode.findUnique({
  where: { code: invitationCode }
});

if (!invite) {
  return res.status(400).json({ error: 'Código de invitación inválido' });
}

if (invite.isUsed) {
  return res.status(400).json({ error: 'Código ya utilizado' });
}

// ❌ NO valida expiresAt
```

**Solución:**
```javascript
const invite = await prisma.invitationCode.findUnique({
  where: { code: invitationCode }
});

if (!invite) {
  return res.status(400).json({ error: 'Código de invitación inválido' });
}

if (invite.isUsed) {
  return res.status(400).json({ error: 'Código ya utilizado' });
}

// ✅ Validar expiración
if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
  return res.status(400).json({ 
    error: 'Código de invitación expirado. Solicita uno nuevo al administrador.' 
  });
}
```

**Además:** Implementar limpieza automática:
```javascript
// backend/src/server.js
const cleanExpiredInvites = async () => {
  const deleted = await prisma.invitationCode.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
      isUsed: false
    }
  });
  console.log(`🗑️ Cleaned ${deleted.count} expired invitation codes`);
};

// Ejecutar cada 24 horas
setInterval(cleanExpiredInvites, 24 * 60 * 60 * 1000);
```

**Esfuerzo:** 1-2 horas | **Impacto Comercial:** Bajo (feature incompleta)

---

## 🟡 PROBLEMAS DE PRIORIDAD MEDIA

### 13. **PERFORMANCE: N+1 Query en getTeamVacations**

**📍 Ubicación:**
- `backend/src/controllers/vacationController.js` - líneas 151-175

**Problema:**
```javascript
const teamRequests = await prisma.vacationRequest.findMany({
  where: {
    status: { in: ['PENDING_MANAGER', 'PENDING_ADMIN', 'APPROVED'] },
    user: { department: manager.department }
  },
  include: {
    user: { select: { id: true, name: true, email: true, position: true } }
  },
  orderBy: { createdAt: 'desc' }
});

// ✅ BIEN: usa include (1 query con JOIN)
```

Pero en otros endpoints hay N+1:
```javascript
// En fichajeController.getWeekSummary (línea 599)
const users = await prisma.user.findMany({ where: { department: dept } });

for (const user of users) {
  const fichajes = await prisma.fichaje.findMany({ 
    where: { userId: user.id, timestamp: { gte: startOfWeek, lt: endOfWeek } }
  });
  // ❌ N+1: 1 query por usuario
}
```

**Solución:**
```javascript
const users = await prisma.user.findMany({
  where: { department: dept },
  include: {
    fichajes: {
      where: {
        timestamp: { gte: startOfWeek, lt: endOfWeek }
      }
    }
  }
});
// ✅ 1 solo query con JOIN
```

**Esfuerzo:** 2-3 horas | **Impacto:** Performance (lentitud con muchos usuarios)

---

### 14. **FICHAJES: Tolerancia configurable pero no se aplica consistentemente**

**📍 Ubicación:**
- `backend/prisma/schema.prisma` - DepartmentShift.toleranciaMinutos
- `backend/src/utils/fichajeUtils.js` - isLateArrival (línea 36)

**Problema:**
El campo `toleranciaMinutos` existe pero:
1. En `isLateArrival()` se usa correctamente
2. En `selectClosestShift()` se usa para matching
3. **NO se aplica en validaciones de horario partido** (línea 182-193)

```javascript
// Horario partido: HARDCODED tolerance
const FLEX_PAUSA = 5; // margen extra solo para la pausa de comida
// ❌ Debería usar daySchedule.toleranciaMinutos
```

**Solución:**
Usar `toleranciaMinutos` en todas las validaciones y permitir configurar por departamento.

**Esfuerzo:** 2 horas | **Impacto:** UX inconsistente

---

### 15. **UI: Fechas mostradas en formato inconsistente (es-ES vs ISO)**

**📍 Ubicación:**
- `pages/Vacations.tsx` - usa `toLocaleDateString('es-ES')`
- `pages/admin/Vacations.tsx` - usa custom `formatDate()`
- `pages/Calendar.tsx` - usa varios formatos

**Problema:**
```tsx
// En un lugar:
{new Date(vacation.startDate).toLocaleDateString('es-ES')}
// Output: "15/01/2026"

// En otro:
{formatDate(vacation.startDate)}
// Output: "15-01-2026"

// En otro:
{new Date(vacation.startDate).toLocaleDateString('es-ES', { 
  day: '2-digit', month: '2-digit', year: 'numeric' 
})}
// Output: "15/01/2026"
```

**Solución:**
Crear utilidad centralizada:
```typescript
// utils/dateUtils.ts
export const formatDate = (date: string | Date, format: 'short' | 'long' | 'input' = 'short') => {
  const d = new Date(date);
  
  switch (format) {
    case 'short':
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
      // "15 ene 2026"
    
    case 'long':
      return d.toLocaleDateString('es-ES', { 
        day: 'numeric', month: 'long', year: 'numeric' 
      });
      // "15 de enero de 2026"
    
    case 'input':
      return d.toISOString().split('T')[0];
      // "2026-01-15" (para inputs HTML5)
  }
};
```

**Esfuerzo:** 3 horas | **Impacto:** UX profesional

---

### 16. **REGISTER: Usuario puede elegir su departamento (riesgo de escalación)**

**📍 Ubicación:**
- `pages/Register.tsx` - líneas 30-35
- `backend/src/controllers/authController.js` - register

**Problema:**
En el formulario de registro, el usuario **elige su departamento** de un dropdown:
```tsx
const departmentOptions = Array.isArray(settings.departments) 
  ? settings.departments 
  : ['IT', 'HR', 'Sales', 'Marketing', 'General'];

useEffect(() => {
  if (!departmentOptions.includes(formData.department)) {
    setFormData(prev => ({ ...prev, department: departmentOptions[0] || 'General' }));
  }
}, [departmentOptions, formData.department]);
```

**Riesgo:**
1. Usuario puede elegir "RRHH" y acceder a información sensible si hay filtrado débil
2. No se valida que el código de invitación esté asociado a un departamento específico

**Solución:**
El código de invitación debería especificar el departamento:
```javascript
// Admin genera código con departamento fijo
POST /api/admin/invite-codes
{
  "department": "IT",
  "expiresAt": "2026-02-01T00:00:00Z"
}

// Al registrarse, el departamento viene del código:
exports.register = async (req, res) => {
  const invite = await prisma.invitationCode.findUnique({...});
  
  const user = await prisma.user.create({
    data: {
      // ...
      department: invite.department, // ✅ No puede elegir
      role: 'EMPLOYEE' // SiempreEmployee al registrarse
    }
  });
};
```

**Esfuerzo:** 4 horas | **Impacto:** Seguridad media

---

### 17. **PUSH NOTIFICATIONS: No hay fallback si el navegador no soporta**

**📍 Ubicación:**
- `services/pushClient.ts` - subscribeToPush
- `public/push-sw.js` - service worker

**Problema:**
```typescript
export const subscribeToPush = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported');
    return;
    // ❌ Solo console.warn, no hay UI feedback
  }
  // ...
};
```

**Consecuencias:**
- Usuario no sabe por qué no recibe notificaciones push
- No hay opción de "avísame por email en su lugar"

**Solución:**
```typescript
export const subscribeToPush = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    // ✅ Mostrar banner informativo
    toast.info('Tu navegador no soporta notificaciones push. Recibirás notificaciones por email.');
    
    // ✅ Activar "email fallback" en backend
    await api.patch('/users/profile', { 
      emailNotificationsEnabled: true 
    });
    
    return false;
  }
  // ...
};
```

**Esfuerzo:** 2 horas | **Impacto:** UX mejorada

---

### 18. **DEPARTAMENTOS: No se pueden eliminar (solo crear)**

**📍 Ubicación:**
- `pages/admin/Settings.tsx` - gestión de departamentos
- `backend/src/controllers/adminController.js` - no hay endpoint DELETE

**Problema:**
Admin puede **crear** departamentos nuevos pero NO eliminarlos:
```tsx
const handleAddDepartment = async () => {
  await adminService.updateSetting('DEPARTMENTS', JSON.stringify(updatedDepts));
  // ✅ Puede añadir
};

// ❌ No hay función para eliminar
```

**Riesgo:**
- Departamentos obsoletos quedan en la lista
- Dropdown de selección crece sin control
- No se valida que el departamento tenga 0 usuarios antes de eliminar

**Solución:**
```typescript
const handleDeleteDepartment = async (deptName: string) => {
  // Validar que no haya usuarios
  const usersInDept = await adminService.getUsersByDepartment(deptName);
  
  if (usersInDept.length > 0) {
    alert(`No puedes eliminar ${deptName} porque tiene ${usersInDept.length} usuarios asignados`);
    return;
  }
  
  // Validar que no haya horarios configurados
  const schedules = await scheduleService.getByDepartment(deptName);
  if (schedules.length > 0) {
    if (!confirm(`${deptName} tiene horarios configurados. ¿Eliminar de todos modos?`)) {
      return;
    }
  }
  
  // Eliminar
  const updated = departments.filter(d => d !== deptName);
  await adminService.updateSetting('DEPARTMENTS', JSON.stringify(updated));
};
```

**Esfuerzo:** 3 horas | **Impacto:** Usabilidad

---

### 19. **SMTP: Configuración en texto plano (sin cifrado)**

**📍 Ubicación:**
- `backend/prisma/schema.prisma` - GlobalSettings.value (String)
- `pages/admin/Settings.tsx` - input type="text" para password

**Problema:**
La contraseña SMTP se guarda en texto plano en la DB:
```javascript
const settings = await prisma.globalSettings.findMany({
  where{ key: { in: ['smtpPass'] } }
});
// settings[0].value = "mi_password_123" // ❌ Texto plano
```

**Riesgo:**
- Cualquiera con acceso a la DB puede ver la contraseña SMTP
- Backup de DB expone credenciales
- Logs pueden contener el valor

**Solución:**
Cifrar con AES-256:
```javascript
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const IV_LENGTH = 16;

const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decrypt = (text) => {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encrypted = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString();
};

// Al guardar:
await prisma.globalSettings.upsert({
  where: { key: 'smtpPass' },
  update: { value: encrypt(password) },
  create: { key: 'smtpPass', value: encrypt(password) }
});

// Al leer:
const pass = decrypt(settings.smtpPass);
```

**Esfuerzo:** 4 horas | **Impacto:** Seguridad importante

---

### 20. **DARK MODE: No persiste entre sesiones**

**📍 Ubicación:**
- `context/ThemeContext.tsx` - usa `useState` sin localStorage

**Problema:**
```tsx
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  // ❌ No persiste, vuelve a 'light' al recargar
};
```

**Solución:**
```tsx
const [theme, setTheme] = useState<'light' | 'dark'>(() => {
  const saved = localStorage.getItem('theme');
  return (saved === 'dark' ? 'dark' : 'light');
});

useEffect(() => {
  localStorage.setItem('theme', theme);
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}, [theme]);
```

**Esfuerzo:** 30 minutos | **Impacto:** UX básica

---

### 21. **FICHAJES ADJUSTMENT: Manager puede aprobar su propio ajuste**

**📍 Ubicación:**
- `backend/src/controllers/fichajeAdjustmentController.js` - approve (línea 39)

**Problema:**
```javascript
exports.approve = async (req, res) => {
  const managerId = req.user.userId;
  
  const adjustment = await prisma.fichajeAdjustment.update({
    where: { id },
    data: { 
      status: 'APPROVED',
      managerId, // ❌ Manager firma pero puede ser el mismo usuario
      resolvedAt: new Date()
    }
  });
};
```

**Caso de Fraude:**
```
1. Manager crea fichaje adjustment para sí mismo
2. Manager (con rol) aprueba su propio ajuste
3. ✅ Ajuste aprobado sin revisión externa
```

**Solución:**
```javascript
exports.approve = async (req, res) => {
  const managerId = req.user.userId;
  const { id } = req.params;
  
  const adjustment = await prisma.fichajeAdjustment.findUnique({
    where: { id },
    include: { user: true }
  });
  
  // ✅ Validar que no sea el mismo usuario
  if (adjustment.userId === managerId) {
    return res.status(403).json({
      error: 'No puedes aprobar tus propios ajustes de fichaje. Contacta con otro manager o admin.'
    });
  }
  
  // ✅ Validar que sea del mismo departamento
  if (adjustment.user.department !== req.user.department && req.user.role !== 'ADMIN') {
    return res.status(403).json({
      error: 'No puedes aprobar ajustes de otros departamentos'
    });
  }
  
  await prisma.fichajeAdjustment.update({...});
};
```

**Esfuerzo:** 1 hora | **Impacto:** Integridad de datos

---

### 22. **PAYROLLS: No hay auditoría de descargas**

**📍 Ubicación:**
- `backend/src/controllers/payrollController.js` - downloadPayroll

**Problema:**
```javascript
exports.downloadPayroll = async (req, res) => {
  const { id } = req.params;
  
  const payroll = await prisma.payroll.findUnique({ where: { id } });
  
  // Enviar archivo
  res.download(payroll.pdfUrl);
  // ❌ No se registra quién descargó ni cuándo
};
```

**Consecuencias:**
- No hay trazabilidad
- Imposible auditar accesos a documentos sensibles
- No se puede detectar descargas masivas sospechosas

**Solución:**
Crear tabla de auditoría:
```prisma
model AuditLog {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  action      String   // 'PAYROLL_DOWNLOAD', 'USER_CREATED', 'VACATION_APPROVED'
  resourceType String  // 'PAYROLL', 'USER', 'VACATION'
  resourceId  String
  metadata    Json?    // Datos adicionales (IP, user agent, etc.)
  timestamp   DateTime @default(now())
  
  @@index([userId, action])
  @@index([resourceType, resourceId])
}
```

```javascript
exports.downloadPayroll = async (req, res) => {
  const { id } = req.params;
  
  const payroll = await prisma.payroll.findUnique({ where: { id } });
  
  // ✅ Registrar auditoría
  await prisma.auditLog.create({
    data: {
      userId: req.user.userId,
      action: 'PAYROLL_DOWNLOAD',
      resourceType: 'PAYROLL',
      resourceId: id,
      metadata: {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        timestamp: new Date().toISOString()
      }
    }
  });
  
  res.download(payroll.pdfUrl);
};
```

**Esfuerzo:** 6 horas | **Impacto:** Compliance (GDPR, auditorías)

---

### 23. **VACATION TYPES: "OTHER" no tiene validación de subtype**

**📍 Ubicación:**
- `pages/Vacations.tsx` - handleCreate (línea 136)
- `backend/src/controllers/vacationController.js` - createVacation

**Problema:**
```tsx
if (formData.type === 'OTHER' && !formData.subtype) {
  showAlert('Por favor selecciona un motivo específico', 'warning');
  return;
}
```

✅ Frontend valida, pero **backend NO**:
```javascript
const request = await prisma.vacationRequest.create({
  data: {
    // ...
    type,
    subtype: req.body.subtype || null, // ❌ Permite null para type='OTHER'
  }
});
```

**Solución:**
```javascript
// backend/src/middleware/validation.js
const vacationRequestSchema = Joi.object({
  type: Joi.string().valid('VACATION', 'PERSONAL', 'SICK_LEAVE', 'MEDICAL_LEAVE', 'OVERTIME', 'OTHER').required(),
  
  subtype: Joi.when('type', {
    is: 'OTHER',
    then: Joi.string().required().messages({
      'any.required': 'Debes especificar un motivo cuando el tipo es "Otros Permisos"'
    }),
    otherwise: Joi.string().optional().allow('', null)
  }),
  
  // ...
});
```

**Esfuerzo:** 1 hora | **Impacto:** Validación de datos

---

## 🟢 PROBLEMAS DE PRIORIDAD BAJA (MEJORAS OPCIONALES)

### 24. **UI: Loading states genéricos (no hay skeleton screens)**

**📍 Todas las páginas** - usan `{loading && <div>Cargando...</div>}`

**Problema:**
```tsx
{isLoading ? (
  <div className="text-center py-8">Cargando...</div>
) : (
  <div>{/* Contenido */}</div>
)}
```

**Mejora:**
Usar skeleton screens para mejor UX:
```tsx
{isLoading ? (
  <div className="space-y-4">
    <div className="animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
      <div className="h-32 bg-slate-200 rounded"></div>
    </div>
  </div>
) : (
  <div>{/* Contenido */}</div>
)}
```

**Esfuerzo:** 4 horas | **Impacto:** UX profesional

---

### 25. **PERFORMANCE: No hay compresión de respuestas HTTP**

**📍 Ubicación:**
- `backend/src/server.js` - configuración Express

**Problema:**
```javascript
const express = require('express');
const app = express();

app.use(express.json());
// ❌ No usa compression middleware
```

**Solución:**
```javascript
const compression = require('compression');

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6 // Balance entre velocidad y compresión
}));
```

**Esfuerzo:** 30 minutos | **Impacto:** Performance (payload 60-80% más pequeño)

---

### 26. **LOGS: No hay rotación automática (logs crecen indefinidamente)**

**📍 Ubicación:**
- `backend/src/server.js` - usa `console.log()`

**Problema:**
Todos los logs van a stdout sin gestión:
```javascript
console.log('Server running on port', PORT);
console.error('Error:', error);
```

Si se despliega con PM2/Docker, archivos de log crecen sin límite.

**Solución:**
Usar Winston con rotación:
```javascript
const winston = require('winston');
require('winston-daily-rotate-file');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d' // Mantener 14 días
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

module.exports = logger;
```

**Esfuerzo:** 2 horas | **Impacto:** DevOps (gestión logs)

---

### 27. **TESTING: No hay tests automatizados**

**Problema:**
No hay carpetas `__tests__/` ni archivos `.test.ts/.test.js` en el proyecto.

**Riesgo:**
- Regresiones no detectadas
- Dificulta refactoring
- No se puede validar funcionamiento de features críticas

**Solución:**
Implementar tests para funciones críticas:
```javascript
// backend/src/utils/__tests__/fichajeUtils.test.js
const { calculateWorkedHours, isLateArrival } = require('../fichajeUtils');

describe('Fichaje Utils', () => {
  describe('calculateWorkedHours', () => {
    it('should calculate 8 hours for full workday', () => {
      const fichajes = [
        { tipo: 'ENTRADA', timestamp: new Date('2026-03-10T09:00:00') },
        { tipo: 'SALIDA', timestamp: new Date('2026-03-10T17:00:00') }
      ];
      
      expect(calculateWorkedHours(fichajes)).toBe(8);
    });
    
    it('should handle split schedule (horario partido)', () => {
      const fichajes = [
        { tipo: 'ENTRADA', timestamp: new Date('2026-03-10T09:00:00') },
        { tipo: 'SALIDA', timestamp: new Date('2026-03-10T13:00:00') },
        { tipo: 'ENTRADA', timestamp: new Date('2026-03-10T15:00:00') },
        { tipo: 'SALIDA', timestamp: new Date('2026-03-10T19:00:00') }
      ];
      
      expect(calculateWorkedHours(fichajes)).toBe(8);
    });
  });
});
```

**Esfuerzo:** 20-30 horas (tests completos) | **Impacto:** Calidad de código

---

### 28. **MOBILE: No hay PWA manifest completo**

**📍 Ubicación:**
- Falta `manifest.json` en public/

**Problema:**
La app tiene service worker (`public/push-sw.js`) pero no manifiesto PWA completo.

**Solución:**
```json
// public/manifest.json
{
  "name": "Xyon Empleados - Portal RRHH",
  "short_name": "Xyon HR",
  "description": "Portal de empleados para gestión de RRHH",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Esfuerzo:** 2 horas | **Impacto:** UX móvil (instalable)

---

### 29. **ACCESSIBILITY: Falta soporte para lectores de pantalla**

**Problema:**
Componentes no tienen atributos ARIA:
```tsx
<button onClick={handleAction}>
  <Trash size={18} />
</button>
// ❌ No tiene aria-label, lector de pantalla dice "button"
```

**Solución:**
```tsx
<button 
  onClick={handleAction}
  aria-label="Eliminar usuario"
  title="Eliminar usuario"
>
  <Trash size={18} />
</button>
```

**Plus:** Navegación por teclado (Tab, Enter, Esc):
```tsx
<Modal isOpen={isOpen} onClose={onClose}>
  <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <h2 id="modal-title">{title}</h2>
    {/* ... */}
  </div>
</Modal>
```

**Esfuerzo:** 8-10 horas | **Impacto:** Compliance (WCAG 2.1)

---

### 30. **DOCS: Falta documentación de API (Swagger/OpenAPI)**

**📍 Ubicación:**
- No hay archivo `openapi.yaml` ni Swagger UI

**Problema:**
Frontend developers necesitan consultar el código del backend para saber qué endpoints usar.

**Solución:**
Implementar Swagger:
```javascript
// backend/src/server.js
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
```

```json
// backend/src/swagger.json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Xyon Empleados API",
    "version": "1.5.0"
  },
  "paths": {
    "/api/auth/login": {
      "post": {
        "summary": "Login de usuario",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "email": { "type": "string" },
                  "password": { "type": "string" }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Esfuerzo:** 12 horas | **Impacto:** Developer Experience

---

### 31. **DOCKER: docker-compose.yaml usa versión deprecated**

**📍 Ubicación:**
- `docker-compose.yaml` - primera línea

**Problema:**
```yaml
version: '3.8' # Deprecated desde Docker Compose v2
```

Docker Compose v2 no requiere la clave `version`.

**Solución:**
```yaml
# docker-compose.yaml (sin version)
services:
  db:
    image: postgres:15
    # ...
```

**Esfuerzo:** 5 minutos | **Impacto:** Modernización

---

## 📊 ANÁLISIS DE IMPACTO COMERCIAL

### Matriz de Priorización

| Problema | Prioridad | Esfuerzo | ROI | Impacto Vendibilidad |
|----------|-----------|----------|-----|---------------------|
| #1 sickLeaveDays nomenclatura | 🔴 Alta | 2-3h | Alto | ⭐⭐⭐ Credibilidad técnica |
| #2 Doble modelo horarios | 🔴 Alta | 8-12h | Muy Alto | ⭐⭐⭐⭐⭐ Feature core roto |
| #3 Filtro roles inconsistente | 🔴 Alta | 4h | Crítico | ⭐⭐⭐⭐⭐ Seguridad |
| #5 Balance race condition | 🔴 Alta | 3-4h | Crítico | ⭐⭐⭐⭐ Datos incorrectos |
| #7 Prorateo vacaciones | 🔴 Alta | 4h | Crítico | ⭐⭐⭐⭐⭐ Cumplimiento legal |
| #8 GPS validación | 🔴 Alta | 8h | Alto | ⭐⭐⭐⭐ Prevención fraude |

**Recomendación Sprint 1 (40 horas):**
1. #3 - Filtro roles (4h) → Seguridad crítica
2. #5 - Balance race condition (4h) → Datos correctos
3. #7 - Prorateo vacaciones (4h) → Legal
4. #1 - Renombrar sickLeaveDays (3h) → Claridad
5. #2 - Unificar modelos horarios (12h) → Feature core
6. #9 - Política contraseñas (2h) → Seguridad básica
7. #10 - Protección último admin (1h) → Seguridad
8. Testing crítico (10h)

**Sprint 2 (30 horas):**
- #8 - GPS validación (8h)
- #4 - Centralizar notificaciones (6h)
- #19 - Cifrado SMTP (4h)
- #22 - Auditoría descargas (6h)
- Documentación Swagger (6h)

---

## 🎁 BONUS: FEATURES PARA AUMENTAR VENDIBILIDAD

### 1. **Dashboard Analítico Avanzado**
- Gráficos de asistencia mensual/anual
- Predicción de ausencias (ML básico)
- Exportar reportes a Excel/PDF
- **Esfuerzo:** 20 horas | **Valor Comercial:** +30% precio

### 2. **Integración con APIs Externas**
- Microsoft Azure AD / Google Workspace (SSO)
- Slack/Teams (notificaciones)
- Calendarios (Google Calendar, Outlook)
- **Esfuerzo:** 30 horas | **Valor Comercial:** +40% precio

### 3. **App Móvil Nativa (React Native)**
- Fichaje con GPS + foto selfie
- Notificaciones push nativas
- Offline mode
- **Esfuerzo:** 200 horas | **Valor Comercial:** +100% precio

### 4. **Sistema de Evaluación de Desempeño**
- Reviews 360°
- OKRs/KPIs
- One-on-ones programados
- **Esfuerzo:** 80 horas | **Valor Comercial:** +50% precio

### 5. **Módulo de Formación**
- Cursos online
- Certificados
- Seguimiento de horas de formación
- **Esfuerzo:** 60 horas | **Valor Comercial:** +35% precio

---

## 🏁 CONCLUSIONES Y RECOMENDACIONES

### Estado Actual
✅ La aplicación es **funcional** y cubre necesidades básicas de RRHH  
⚠️ Tiene **31 incoherencias** que afectan credibilidad y seguridad  
🔴 **12 problemas críticos** deben resolverse antes de comercializar

### Roadmap Sugerido

**Fase 1: Estabilización (80 horas - 2 sprints)**
- Resolver 12 problemas de prioridad alta
- Implementar tests para features críticas
- Documentar API con Swagger

**Fase 2: Profesionalización (60 horas - 1.5 sprints)**
- Resolver problemas de prioridad media
- Mejorar UX/UI (dark mode, skeleton screens)
- Auditoría de seguridad externa

**Fase 3: Diferenciación (120 horas - 3 sprints)**
- Implementar 2-3 features bonus
- Dashboard analítico avanzado
- Integración SSO con Azure AD

### ROI Estimado

**Inversión total:** ~260 horas (1.5-2 meses con equipo de 2 devs)

**Retorno:**
- **Precio actual estimado:** €5,000-8,000/año por empresa (50-100 empleados)
- **Precio post-mejoras:** €12,000-20,000/año por empresa (más features + confianza)
- **Margen de mejora:** +150-200% en precio de venta

**Posicionamiento:**
- Herramientas básicas (Factorial, Sesame): €2-5/empleado/mes
- **Xyon (post-auditoría):** €8-12/empleado/mes (justificado por features avanzadas)
- Suites enterprise (SAP SuccessFactors): €15-30/empleado/mes

---

## 📞 SIGUIENTE PASOS INMEDIATOS

1. **Priorizar Sprint 1** con problemas #3, #5, #7 (seguridad + legal)
2. **Crear branch** `audit/fixes-sprint-1`
3. **Asignar recursos:** 2 desarrolladores full-time
4. **Configurar CI/CD** con tests automatizados
5. **Contratar auditoría de seguridad externa** (€2,000-3,000)

---

**Fecha de Auditoría:** 10 de Marzo, 2026  
**Auditor:** Asistente IA Especializado en Arquitectura de Sistemas  
**Próxima Revisión:** Tras Sprint 1 (estimado 15 de Abril, 2026)
