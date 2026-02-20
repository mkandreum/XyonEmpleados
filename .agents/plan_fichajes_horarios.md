# 📋 Plan de Implementación — Fichajes y Horarios

## Resumen de las 4 Funcionalidades

| # | Funcionalidad | Resumen del análisis |
|---|---|---|
| 1 | **Ajustar fichajes desde el historial** con botón "Ajustar fichaje" + aprobación del manager | NO existe. El historial actual (`FichajeButton.tsx`) solo muestra los fichajes del día, sin opción de editar/ajustar. No hay modelo de "solicitud de ajuste" ni endpoint backend. |
| 2 | **Ajustar fichajes correctos e incorrectos en la vista de calendario** | PARCIAL. El `Calendar.tsx` muestra badges de estado (correcto/incidencia/no fichado) pero no permite **ajustar** nada. Es solo visual. |
| 3 | **Horario modificable por semana desde admin con horarios personalizados según el día** | NO existe. El `DepartmentSchedule` actual define UN solo horario por departamento (fijo). No soporta horarios diferentes por día de la semana ni por semana. |
| 4 | **Horario inteligente** que según la hora de fichaje asigne automáticamente el horario | NO existe. Actualmente la asignación de horario es por departamento de forma fija. No hay lógica de "auto-detección" de turno. |

---

## 🔧 FUNCIONALIDAD 1: Ajustar Fichajes con Aprobación del Manager

### Estado actual
- El empleado ve sus fichajes en `FichajeButton.tsx` (solo del día actual) y en `Calendar.tsx` (mes completo, solo lectura).
- No existe ningún mecanismo para que un empleado solicite un ajuste de hora de fichaje.
- No hay flujo de aprobación para ajustes.

### Qué hay que crear

#### 1.1 Backend — Modelo Prisma
```prisma
enum FichajeAdjustmentStatus {
  PENDING
  APPROVED
  REJECTED
}

model FichajeAdjustment {
  id              String                   @id @default(uuid())
  fichajeId       String
  fichaje         Fichaje                  @relation(fields: [fichajeId], references: [id])
  userId          String
  user            User                     @relation("UserAdjustments", fields: [userId], references: [id])
  managerId       String?
  manager         User?                    @relation("ManagerAdjustments", fields: [managerId], references: [id])
  
  // Datos del ajuste
  originalTimestamp  DateTime              // Hora original del fichaje
  requestedTimestamp DateTime              // Hora propuesta por el empleado
  reason             String    @db.Text    // Motivo del ajuste
  
  status          FichajeAdjustmentStatus  @default(PENDING)
  rejectionReason String?
  
  resolvedAt      DateTime?
  createdAt       DateTime                 @default(now())
  updatedAt       DateTime                 @updatedAt
  
  @@index([userId, status])
  @@index([managerId, status])
}
```

Relaciones a añadir:
- En `User`: `fichajeAdjustmentsRequested FichajeAdjustment[] @relation("UserAdjustments")` y `fichajeAdjustmentsManaged FichajeAdjustment[] @relation("ManagerAdjustments")`
- En `Fichaje`: `adjustments FichajeAdjustment[]`

#### 1.2 Backend — Controller `fichajeAdjustmentController.js`
Endpoints:
| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| POST | `/api/fichaje-adjustments` | EMPLOYEE, MANAGER | Crear solicitud de ajuste |
| GET | `/api/fichaje-adjustments` | EMPLOYEE | Mis solicitudes |
| GET | `/api/fichaje-adjustments/pending` | MANAGER | Solicitudes pendientes de mi equipo |
| PATCH | `/api/fichaje-adjustments/:id/approve` | MANAGER | Aprobar (modifica el timestamp del fichaje original) |
| PATCH | `/api/fichaje-adjustments/:id/reject` | MANAGER | Rechazar con motivo |

Lógica de aprobación:
1. Al aprobar, actualizar `fichaje.timestamp` al `requestedTimestamp`.
2. Crear notificación al empleado informando del resultado.
3. Recalcular métricas del día (horas trabajadas, isLate, etc.)

#### 1.3 Frontend — api.ts
```ts
export const fichajeAdjustmentService = {
  create: (data: { fichajeId: string; requestedTimestamp: string; reason: string }) => ...,
  getMyRequests: () => ...,
  getPending: () => ...,    // para managers
  approve: (id: string) => ...,
  reject: (id: string, reason: string) => ...,
};
```

#### 1.4 Frontend — Componentes
- **Botón "Ajustar Fichaje"** en el historial de fichajes del día (`FichajeButton.tsx`) → abre modal.
- **Modal `AdjustFichajeModal.tsx`**: Selector de hora nueva + campo de motivo. Preselecciona la hora original.
- **Vista en `Calendar.tsx`**: Al tocar un día, si tiene fichajes, mostrar botón "Solicitar Ajuste" junto al detalle.
- **Panel Manager** (`pages/manager/`) → nueva sección o tab "Solicitudes de Ajuste" con lista de pendientes + botones Aprobar/Rechazar.

#### 1.5 Types
```ts
export enum FichajeAdjustmentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface FichajeAdjustment {
  id: string;
  fichajeId: string;
  fichaje?: Fichaje;
  userId: string;
  user?: User;
  managerId?: string;
  manager?: User;
  originalTimestamp: string;
  requestedTimestamp: string;
  reason: string;
  status: FichajeAdjustmentStatus;
  rejectionReason?: string;
  resolvedAt?: string;
  createdAt: string;
}
```

---

## 🔧 FUNCIONALIDAD 2: Ajustar Fichajes Correctos e Incorrectos en Vista de Calendario

### Estado actual
- `Calendar.tsx` muestra badges (✓ Correcto, ! Incidencia, ✗ No fichado, vacaciones, etc.)
- Al tocar un día solo se muestra el badge de resumen y las horas.
- NO muestra los fichajes individuales ni permite interacción.

### Qué hay que hacer

#### 2.1 Mejorar el panel de detalle del día seleccionado
El panel actual (`selectedDay`) solo muestra:
```
🟢 Fichado correcto (7.5h)
```

Debe mostrar:
```
📅 Jueves, 20 de febrero
────────────────────────
Fichajes:
  → Entrada  09:02  ✓
  ← Salida   14:01  ✓
  → Entrada  15:05  ⚠ (5 min tarde)
  ← Salida   18:30  ✓

Total: 8.25h | Estado: Incidencia

[Solicitar Ajuste]  (solo si hay incidencias)
```

#### 2.2 Cambios en `Calendar.tsx`
1. **Cargar fichajes individuales en `fichajeDays`**: Ya se tienen en `FichajeDayStats.fichajes[]` pero no se renderizan.
2. **Expandir el panel de detalle**:
   - Mostrar cada fichaje individual con hora, tipo (entrada/salida) e indicador visual (correcto/tarde/temprano).
   - Mostrar el desglose de horas por turno (mañana/tarde).
3. **Añadir botón "Solicitar Ajuste"** que abre el `AdjustFichajeModal` (reutilizar componente de Func 1).
4. **Colorear fichajes incorrectos** en rojo/naranja dentro del panel.

#### 2.3 Mejoras visuales
- Fichajes correctos: fondo verde suave, icono ✓
- Fichajes con incidencia: fondo naranja/rojo, icono ⚠
- Fichajes incompletos: indicar "Falta salida" o "Falta entrada" en gris

---

## 🔧 FUNCIONALIDAD 3: Horario Modificable por Semana con Horarios Personalizados por Día

### Estado actual
- `DepartmentSchedule` tiene un ÚNICO horario por departamento: `horaEntrada`, `horaSalida`, `horaEntradaTarde`, `horaSalidaMañana`.
- No soporta variaciones por día de la semana.
- No soporta semanas específicas (ej: semana 1 horario A, semana 2 horario B).
- El frontend `ScheduleSettings.tsx` solo permite editar un bloque de horarios fijo por departamento.

### Qué hay que crear

#### 3.1 Backend — Nuevo modelo Prisma
```prisma
model WeeklySchedule {
  id              String   @id @default(uuid())
  department      String
  departmentSchedule DepartmentSchedule @relation(fields: [department], references: [department])
  
  // Semana a la que aplica (null = horario por defecto)
  weekNumber      Int?     // Número de semana ISO (1-53), null = default
  year            Int?     // Año, null = recurrente
  
  // Horarios por día (JSON con estructura para cada día)
  monday          Json?    // { horaEntrada: "09:00", horaSalida: "18:00" }
  tuesday         Json?
  wednesday       Json?
  thursday        Json?
  friday          Json?
  saturday        Json?
  sunday          Json?
  
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([department, weekNumber, year])
  @@index([department, isActive])
}
```

**Alternativa más simple** (recomendada): Añadir campos al `DepartmentSchedule` existente.

```prisma
model DepartmentSchedule {
  // ... campos existentes ...
  
  // NUEVO: Horarios por día de la semana (JSON)
  // Si es null, se usa el horario general (horaEntrada/horaSalida)
  // Formato: { "horaEntrada": "09:00", "horaSalida": "14:00" }
  scheduleLunes    Json?
  scheduleMartes   Json?
  scheduleMiercoles Json?
  scheduleJueves   Json?
  scheduleViernes  Json?
  scheduleSabado   Json?
  scheduleDomingo  Json?
}
```

#### 3.2 Backend — Modificar `scheduleController.js`
- Actualizar `upsertSchedule` para aceptar horarios por día.
- Crear helper `getScheduleForDay(department, date)` que devuelve el horario correcto para un día específico.

#### 3.3 Backend — Modificar `fichajeUtils.js`
- `isLateArrival()` y `isEarlyDeparture()` deben consultar el horario del día específico, no el general.
- `groupFichajesByDay()` debe recibir el mapa de horarios por día.

#### 3.4 Frontend — Modificar `ScheduleSettings.tsx`
Rediseñar para permitir:
1. **Vista general**: Horario por defecto del departamento (como ahora).
2. **Vista por día**: Grid de 7 columnas (L-D) donde cada celda puede tener horario personalizado o heredar del general.
3. **Toggle por día**: "Usar horario general" / "Personalizar".

Ejemplo de interfaz:
```
┌──────────────────────────────────────────────────────────┐
│ Departamento: IT                                         │
│ Horario General: 09:00 - 18:00  |  Tolerancia: 10 min   │
├──────┬──────┬──────┬──────┬──────┬──────┬──────┐         │
│  Lun │  Mar │  Mié │  Jue │  Vie │  Sáb │  Dom │         │
│09:00 │09:00 │09:00 │09:00 │08:00 │  --  │  --  │         │
│18:00 │18:00 │18:00 │18:00 │15:00 │  --  │  --  │         │
│ [=]  │ [=]  │ [=]  │ [=]  │ [✎] │ [--] │ [--] │         │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┘         │
│ [=] = Usa horario general  [✎] = Personalizado           │
└──────────────────────────────────────────────────────────┘
```

---

## 🔧 FUNCIONALIDAD 4: Horario Inteligente (Auto-asignación de Turno)

### Estado actual
- La comparación se hace siempre con el MISMO horario fijo del departamento.
- Si un empleado ficha a las 9:00, se compara con `horaEntrada` (ej: 09:00).
- Si ficha a las 15:00, se compara con `horaEntradaTarde` (si existe).
- La lógica usa la regla simple de "si la hora >= 12, usar horario de tarde".

### Qué hay que crear

#### 4.1 Backend — Nuevo servicio `smartScheduleService.js`
Lógica:
1. Cuando se crea un fichaje de ENTRADA, el sistema detecta en qué "rango" de horario encaja.
2. Si el departamento tiene horarios por día (Func 3), buscar el horario del día actual.
3. Si hay múltiples turnos posibles, encontrar el más cercano a la hora de fichaje.

```js
/**
 * Determina qué horario/turno corresponde según la hora de fichaje.
 * 
 * @param {Date} fichajeTime - Hora del fichaje
 * @param {Object} schedule - Horario del departamento (puede tener horarios por día)
 * @param {Date} date - Fecha del fichaje (para buscar horario del día)
 * @returns {{ turno: 'MAÑANA'|'TARDE', expectedEntry: string, expectedExit: string }}
 */
function detectTurno(fichajeTime, schedule, date) {
    const dayOfWeek = date.getDay(); // 0=Dom, 1=Lun...
    const daySchedule = getDaySchedule(schedule, dayOfWeek);
    
    if (!daySchedule) return null; // Día libre
    
    const fichajeMinutes = fichajeTime.getHours() * 60 + fichajeTime.getMinutes();
    
    // Si hay horario partido, determinar si es turno de mañana o tarde
    if (daySchedule.horaEntradaTarde) {
        const [entradaH, entradaM] = daySchedule.horaEntrada.split(':').map(Number);
        const [entradaTardeH, entradaTardeM] = daySchedule.horaEntradaTarde.split(':').map(Number);
        
        const midpoint = ((entradaH * 60 + entradaM) + (entradaTardeH * 60 + entradaTardeM)) / 2;
        
        if (fichajeMinutes < midpoint) {
            return { turno: 'MAÑANA', expectedEntry: daySchedule.horaEntrada, expectedExit: daySchedule.horaSalidaMañana };
        } else {
            return { turno: 'TARDE', expectedEntry: daySchedule.horaEntradaTarde, expectedExit: daySchedule.horaSalida };
        }
    }
    
    // Jornada continua
    return { turno: 'COMPLETA', expectedEntry: daySchedule.horaEntrada, expectedExit: daySchedule.horaSalida };
}
```

#### 4.2 Modificar `fichajeUtils.js`
- `isLateArrival()` y `isEarlyDeparture()` deben usar `detectTurno()` en lugar de la lógica hardcodeada de "si hora >= 12".
- Esto es un refactor del código actual en las líneas 52-56 de `fichajeUtils.js`.

#### 4.3 Modificar `fichajeController.js`
- En `createFichaje()`: tras crear el fichaje, detectar el turno automáticamente y adjuntar la info al response.
- Opcionalmente, almacenar el turno detectado en el fichaje para referencia futura.

#### 4.4 Frontend — Feedback visual
En `FichajeButton.tsx`, tras fichar, mostrar:
```
✓ Entrada registrada — Turno de Mañana (09:00 - 14:00)
```

---

## 📋 Orden de Implementación Recomendado

### Fase 1: Fundamentos (Funcionalidad 3 + 4) [COMPLETADO]
> Primero los horarios, luego lo demás se construye encima.

1. [x] **3A**: Actualizar schema Prisma con horarios por día
2. [x] **3B**: Migrar base de datos
3. [x] **3C**: Actualizar `scheduleController.js` 
4. [x] **3D**: Crear `smartScheduleService.js` (Func 4)
5. [x] **3E**: Refactorizar `fichajeUtils.js` para usar horarios por día
6. [x] **3F**: Actualizar frontend `ScheduleSettings.tsx`
7. [x] **3G**: Actualizar `api.ts` con tipos y servicios nuevos ScheduleSettings

### Fase 2: Ajustes de Fichajes (Funcionalidad 1) [COMPLETADO]
8. [x] **1A**: Crear modelo `FichajeAdjustment` en Prisma + migración
9. [x] **1B**: Crear `fichajeAdjustmentController.js` con todos los endpoints
10. [x] **1C**: Registrar rutas en `routes.js`
11. [x] **1D**: Crear `AdjustFichajeModal.tsx`
12. [x] **1E**: Añadir botón "Ajustar" en `FichajeButton.tsx`
13. [x] **1F**: Crear sección de aprobaciones en panel Manager
14. [x] **1G**: Añadir tipos y servicios en `types.ts` y `api.ts`

### Fase 3: Vista de Calendario Mejorada (Funcionalidad 2) [COMPLETADO]
15. [x] **2A**: Expandir panel de detalle en `Calendar.tsx`
16. [x] **2B**: Integrar botón "Solicitar Ajuste" en el calendario
17. [x] **2C**: Mejoras visuales y indicadores

### Fase 4: Feedback Inteligente (Funcionalidad 4 - UI) [COMPLETADO]
18. [x] **4A**: Mostrar turno detectado en `FichajeButton.tsx`
19. [x] **4B**: Testing y ajustes

---

## 📁 Archivos a Crear
| Archivo | Descripción |
|---------|-------------|
| `backend/src/controllers/fichajeAdjustmentController.js` | Controller de ajustes de fichajes |
| `backend/src/services/smartScheduleService.js` | Servicio de detección inteligente de turno |
| `components/AdjustFichajeModal.tsx` | Modal para solicitar ajuste de fichaje |
| `pages/manager/FichajeAdjustments.tsx` | Panel de aprobación de ajustes (manager) |

## 📁 Archivos a Modificar
| Archivo | Cambios |
|---------|---------|
| `backend/prisma/schema.prisma` | Nuevos modelos + campos por día |
| `backend/src/routes.js` | Nuevas rutas de ajustes |
| `backend/src/utils/fichajeUtils.js` | Refactorizar para horarios por día |
| `backend/src/controllers/fichajeController.js` | Integrar detección de turno |
| `backend/src/controllers/scheduleController.js` | Soportar horarios por día |
| `services/api.ts` | Nuevos servicios |
| `types.ts` | Nuevos tipos/interfaces |
| `components/FichajeButton.tsx` | Botón ajustar + feedback de turno |
| `components/ScheduleSettings.tsx` | Grid de horarios por día |
| `pages/Calendar.tsx` | Panel detalle expandido + botón ajustar |
| `App.tsx` | Nueva ruta manager/fichaje-adjustments |

---

## ⚠️ Consideraciones Técnicas
1. **Migración de BD**: Los horarios por día son nullable, por lo que la migración es backward-compatible.
2. **Notificaciones**: Crear notificación al empleado cuando su ajuste es aprobado/rechazado.
3. **Seguridad**: Solo el propio empleado puede solicitar ajuste de sus fichajes. Solo el manager de su departamento puede aprobar/rechazar.
4. **Performance**: Añadir índices en los nuevos modelos para consultas frecuentes.
