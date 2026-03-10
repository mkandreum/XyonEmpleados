# 📋 PLAN DE MEJORAS GENERAL - XyonEmpleados
**Fecha:** 10 de marzo de 2026  
**Objetivo:** Resolver problemas críticos y mejorar la lógica general de la aplicación

---

## 🔴 PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. **PROBLEMA: Horas Médicas muestra "1 día" en lugar de horas**

**Causa raíz:**
- En `Vacations.tsx`, el formulario tiene campos `durationMode` y `hours`, pero NO se utilizan correctamente
- La función `handleCreate` SIEMPRE calcula días usando `calculateBusinessDays()` o `calculateNaturalDays()`
- El campo `hours` solo se envía si `lessThanOneDay` es true, pero no hay UI para activar este modo para SICK_LEAVE
- El tipo SICK_LEAVE debería ser basado en HORAS, no en días

**Solución:**
```typescript
// Vacations.tsx - líneas 150-180
// CAMBIAR LA LÓGICA:
if (formData.type === 'SICK_LEAVE') {
    // Para horas médicas, trabajar con HORAS
    if (!formData.hours || parseInt(formData.hours) <= 0) {
        showAlert('Debes especificar las horas para Horas Médicas', 'error');
        return;
    }
    // Enviar solo hours, no days
    await vacationService.create({
        startDate: formData.startDate,
        endDate: formData.startDate, // Mismo día
        days: 0, // No días
        hours: parseInt(formData.hours),
        type: 'SICK_LEAVE',
        ...
    });
} else {
    // Para otros tipos, calcular días normalmente
    let daysCalculated = ...
}
```

**Cambios necesarios:**
1. ✅ Modificar UI del formulario para mostrar input de horas cuando `type === 'SICK_LEAVE'`
2. ✅ Modificar lógica de validación para SICK_LEAVE
3. ✅ Modificar lógica de creación para enviar hours en lugar de days
4. ✅ Verificar que el backend en `benefitsController.js` maneje correctamente sickLeaveDays como HORAS

---

### 2. **PROBLEMA: Calendario de Asistencia confuso (no está clara la lógica de fichados OK/NO OK)**

**Causa raíz:**
- Los badges de color no son suficientemente descriptivos
- La leyenda no es prominente
- No hay tooltips explicativos
- Los estados "tarde", "salida temprana", etc. no son visuales

**Solución:**
```typescript
// Calendar.tsx - Mejorar el getDayBadge() y la visualización
// 1. Añadir tooltips descriptivos
// 2. Hacer la leyenda más visible y con ejemplos
// 3. Añadir iconos a los diferentes estados
// 4. Mejorar el detalle al hacer click en un día
```

**Cambios necesarios:**
1. ✅ Añadir sección de "Cómo leer el calendario" con ejemplos visuales
2. ✅ Mejorar los tooltips en cada día
3. ✅ Añadir iconos/emojis para estados (✅ OK, ⚠️ Tarde, ❌ Falta)
4. ✅ Hacer el panel de detalle más claro y visible
5. ✅ Añadir resumen mensual con estadísticas visuales

---

### 3. **PROBLEMA: Fichaje a las 10h asigna turno 15-23 en lugar de 9-18**

**Causa raíz:**
- La función `selectClosestShift()` busca el turno más cercano por `horaEntrada`
- Matemáticamente, 10h debería estar más cerca de 9h que de 15h
- **POSIBLES CAUSAS:**
  a) Los turnos no están configurados correctamente en la BD (activeDays, horaEntrada)
  b) Hay un turno con horaEntrada más cercana a 10h que no se ve
  c) La tolerancia está causando problemas
  d) El orden de evaluación de turnos es incorrecto

**Solución:**
```javascript
// shiftAssignmentService.js
// MEJORAR la lógica de selectClosestShift:
function selectClosestShift(shifts, fichajeDate) {
    // 1. Filtrar turnos activos del día
    const activeShifts = shifts.filter(shift =>
        shift.activeDays && shift.activeDays.split(',').includes(dayName)
    );
    
    // 2. Para turnos con horario partido, usar detectTurno primero
    //    para determinar si es MAÑANA o TARDE
    
    // 3. Si hay turno con horario partido y la hora está en rango,
    //    usar ese turno
    
    // 4. Si no, buscar el más cercano pero con límite de ±2 horas
    //    para evitar asignaciones incorrectas
    
    // 5. Logging detallado para debug
}
```

**Cambios necesarios:**
1. ✅ Mejorar `selectClosestShift()` con límite de diferencia máxima (ej: 2 horas)
2. ✅ Integrar `detectTurno()` para turnos partidos
3. ✅ Añadir logging detallado para debug
4. ✅ Añadir UI de feedback al usuario mostrando qué turno se asignó y por qué
5. ✅ Permitir al usuario corregir el turno asignado si es incorrecto

---

### 4. **PROBLEMA: Gestión de Equipo (Manager) - Todos desplegados, pantalla infinita**

**Causa raíz:**
- En `TeamRequests.tsx`, las solicitudes se agrupan por usuario
- Cada grupo de usuario muestra TODAS sus solicitudes expandidas
- No hay mecanismo de colapso/expansión
- En mobile, ocupa demasiado espacio

**Solución:**
```typescript
// TeamRequests.tsx
// IMPLEMENTAR sistema de acordión:
const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

// Por defecto, solo mostrar usuarios con solicitudes PENDING_MANAGER
useEffect(() => {
    const pendingUsers = new Set(
        requests
            .filter(r => r.status === 'PENDING_MANAGER')
            .map(r => r.user?.id)
    );
    setExpandedUsers(pendingUsers);
}, [requests]);

// UI con accordión
<div onClick={() => toggleUserExpanded(userId)}>
    <h3>{user.name} {expandedUsers.has(userId) ? '▼' : '▶'}</h3>
</div>
{expandedUsers.has(userId) && (
    <div>...solicitudes...</div>
)}
```

**Cambios necesarios:**
1. ✅ Añadir estado de expansión por usuario
2. ✅ Por defecto, expandir solo usuarios con solicitudes pendientes
3. ✅ Añadir botones de "Expandir todo" / "Colapsar todo"
4. ✅ Mejorar diseño mobile con cards compactas
5. ✅ Añadir vista de "Solo pendientes" como filtro

---

## 🟡 MEJORAS DE LÓGICA GENERAL RECOMENDADAS

### A. **Validación y Feedback**

**Problemas actuales:**
- Errores genéricos ("Error al crear solicitud")
- No se valida disponibilidad de horas/días antes de enviar
- No hay confirmación visual de acciones exitosas

**Mejoras:**
1. ✅ Validación en tiempo real de disponibilidad
2. ✅ Mensajes de error específicos con sugerencias
3. ✅ Confirmaciones visuales con animaciones
4. ✅ Preview de solicitud antes de enviar

---

### B. **Consistencia de Datos**

**Problemas actuales:**
- Los días/horas se manejan inconsistentemente
- SICK_LEAVE se llama "Horas Médicas" pero trabaja con días
- MEDICAL_LEAVE es diferente de SICK_LEAVE pero no está claro

**Mejoras:**
1. ✅ Unificar nomenclatura:
   - `SICK_LEAVE` → Horas Médicas (HORAS)
   - `MEDICAL_LEAVE` → Baja Médica (DÍAS)
2. ✅ Crear enum/constants para tipos de ausencia
3. ✅ Documentar claramente qué es cada tipo
4. ✅ Añadir tooltips explicativos en el UI

---

### C. **UX Mobile**

**Problemas actuales:**
- Muchas tablas no responsive
- Texto pequeño en mobile
- Botones difíciles de pulsar
- Modales ocupan toda la pantalla

**Mejoras:**
1. ✅ Convertir tablas a cards en mobile
2. ✅ Aumentar tamaño de botones y touch targets
3. ✅ Mejorar modales con bottom sheets en mobile
4. ✅ Añadir gestos (swipe, etc.)

---

### D. **Performance**

**Problemas actuales:**
- Se cargan todos los datos del mes completo
- No hay paginación en listas largas
- Re-renders innecesarios

**Mejoras:**
1. ✅ Implementar lazy loading
2. ✅ Paginación en listas largas
3. ✅ Memoización con useMemo/useCallback
4. ✅ Virtual scrolling para listas

---

### E. **Notificaciones y Actualizaciones en Tiempo Real**

**Problemas actuales:**
- Usuario no sabe si su solicitud fue procesada
- Manager no ve actualizaciones en tiempo real
- No hay indicadores de "última actualización"

**Mejoras:**
1. ✅ Indicador de "última actualización hace X minutos"
2. ✅ Botón de "Refrescar" visible
3. ✅ Notificaciones push más descriptivas
4. ✅ Badges de notificaciones no leídas

---

### F. **Reportes y Exportaciones**

**Problemas actuales:**
- PDF de asistencia es básico
- No hay opción de exportar a Excel
- No hay resúmenes mensuales/anuales

**Mejoras:**
1. ✅ Mejorar PDF con gráficos
2. ✅ Añadir export a Excel/CSV
3. ✅ Dashboard con resumen mensual/anual
4. ✅ Gráficos de tendencias

---

### G. **Gestión de Horarios y Turnos**

**Problemas actuales:**
- No hay UI para ver qué turnos están disponibles
- Usuario no puede ver su horario asignado fácilmente
- No hay vista semanal clara

**Mejoras:**
1. ✅ Vista de "Mi horario semanal" clara
2. ✅ Calendario con turnos asignados visibles
3. ✅ Notificación cuando cambia el turno
4. ✅ Posibilidad de solicitar cambio de turno

---

## 📊 PRIORIZACIÓN

### 🔥 CRÍTICO (Hacer YA):
1. Problema #1: Horas Médicas (afecta solicitudes)
2. Problema #3: Asignación incorrecta de turnos (afecta fichajes)

### ⚠️ IMPORTANTE (Hacer esta semana):
3. Problema #4: UI Manager Team Requests (UX)
4. Problema #2: Claridad del calendario (UX)

### 📈 MEJORAS (Hacer cuando sea posible):
5. Validación y Feedback mejorado
6. Consistencia de datos
7. UX Mobile
8. Performance
9. Notificaciones
10. Reportes

---

## 🛠️ PLAN DE IMPLEMENTACIÓN

### FASE 1: Arreglos Críticos (1-2 días)
- [ ] Fix: Horas Médicas
- [ ] Fix: Asignación de turnos
- [ ] Test exhaustivo de ambos fixes

### FASE 2: Mejoras UX (2-3 días)
- [ ] Mejorar UI Manager Team Requests (acordión)
- [ ] Mejorar claridad del calendario
- [ ] Mejorar feedback de validaciones

### FASE 3: Mejoras Generales (1 semana)
- [ ] Consistencia de datos
- [ ] UX Mobile mejorado
- [ ] Performance optimizations
- [ ] Notificaciones mejoradas

### FASE 4: Features Avanzados (cuando sea viable)
- [ ] Reportes mejorados
- [ ] Dashboard con analytics
- [ ] Gestión avanzada de turnos

---

## 🎯 MÉTRICAS DE ÉXITO

- ✅ Horas médicas se muestran en horas, no días
- ✅ Fichajes asignan el turno correcto en >95% de casos
- ✅ Manager puede ver todo su equipo en una pantalla (con scroll mínimo)
- ✅ Usuarios entienden el estado de su asistencia sin ayuda
- ✅ Tiempo de respuesta de UI < 200ms
- ✅ 0 errores críticos reportados

---

## 📝 NOTAS TÉCNICAS

### Archivos Clave a Modificar:
- `pages/Vacations.tsx` (horas médicas)
- `backend/src/services/shiftAssignmentService.js` (turnos)
- `backend/src/controllers/fichajeController.js` (turnos)
- `pages/manager/TeamRequests.tsx` (UI manager)
- `pages/Calendar.tsx` (claridad calendario)
- `components/TeamCalendarView.tsx` (calendario equipo)

### Consideraciones:
- ⚠️ Algunos cambios requieren migración de datos
- ⚠️ Testing exhaustivo necesario antes de deploy
- ⚠️ Documentar bien los cambios para usuarios
- ⚠️ Considerar backward compatibility

---

**CONCLUSIÓN:**  
Este plan aborda los 4 problemas críticos reportados y propone 7 áreas de mejora general. La implementación debe ser incremental, priorizando los fixes críticos primero y luego las mejoras de UX y features avanzados.
