# 🔒 AUDITORÍA DE SEGURIDAD - XyonEmpleados
**Fecha**: 2026-01-10  
**Estado**: PRE-PRODUCCIÓN  
**Nivel de Riesgo General**: ⚠️ **ALTO** - Requiere correcciones inmediatas

---

## 🚨 VULNERABILIDADES CRÍTICAS (Prioridad 1 - URGENTE)

### 1. ⛔ CORS Completamente Abierto
**Ubicación**: `backend/src/server.js:41`  
**Riesgo**: CRÍTICO  
**Descripción**: CORS está configurado sin restricciones, permitiendo peticiones desde cualquier origen.

```javascript
app.use(cors()); // ❌ PELIGROSO - Acepta peticiones de CUALQUIER dominio
```

**Impacto**:
- Cualquier sitio web malicioso puede hacer peticiones a tu API
- Robo de tokens JWT desde otros dominios
- Ataques CSRF (Cross-Site Request Forgery)
- Exposición de datos sensibles de empleados

**Solución Requerida**:
```javascript
app.use(cors({
    origin: process.env.FRONTEND_URL || 'https://tudominio.com',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

### 2. ⛔ JWT Secret Débil con Fallback Inseguro
**Ubicación**: 
- `backend/src/middleware/auth.js:2`
- `backend/src/controllers/authController.js:5`

**Riesgo**: CRÍTICO  
**Descripción**: Uso de secrets por defecto débiles si no se configura variable de entorno.

```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key'; // ❌ PELIGROSO
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';  // ❌ PELIGROSO
```

**Impacto**:
- Si se despliega sin configurar JWT_SECRET, usa un valor conocido públicamente
- Atacante puede generar tokens válidos
- Acceso total a cualquier cuenta de usuario
- Compromiso completo del sistema

**Solución Requerida**:
```javascript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET no configurado');
    process.exit(1);
}
```

---

### 3. ⛔ Contraseña de Admin Hardcodeada
**Ubicación**: `backend/src/server.js:84`  
**Riesgo**: CRÍTICO  
**Descripción**: Contraseña de administrador predecible y hardcodeada en el código.

```javascript
const hashedPassword = await bcrypt.hash('admin_password_123', 10); // ❌ CONOCIDA
```

**Impacto**:
- Contraseña visible en el repositorio Git
- Acceso de administrador garantizado para cualquiera que vea el código
- Compromiso total del sistema

**Solución Requerida**:
```javascript
const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
if (!adminPassword) {
    console.error('❌ FATAL: ADMIN_INITIAL_PASSWORD no configurado');
    process.exit(1);
}
const hashedPassword = await bcrypt.hash(adminPassword, 10);
```

---

### 4. ⛔ CSP Permite 'unsafe-inline' y 'unsafe-eval'
**Ubicación**: `backend/src/server.js:21`  
**Riesgo**: ALTO  
**Descripción**: Content Security Policy permite ejecución de scripts inline.

```javascript
scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // ❌ Permite XSS
```

**Impacto**:
- Vulnerabilidad a ataques XSS (Cross-Site Scripting)
- Inyección de código JavaScript malicioso
- Robo de tokens y credenciales

**Solución Requerida**:
```javascript
scriptSrc: ["'self'"],
// Si Vite requiere inline, usar nonces o hashes específicos
```

---

### 5. ⛔ Endpoint de Settings Público
**Ubicación**: `backend/src/routes.js:24`  
**Riesgo**: ALTO  
**Descripción**: Endpoint de configuración accesible sin autenticación.

```javascript
router.get('/admin/settings', adminController.getSettings); // ❌ Sin auth
```

**Impacto**:
- Exposición de configuración interna del sistema
- Posible filtración de información sensible
- Reconocimiento para ataques dirigidos

**Solución Requerida**:
```javascript
router.get('/admin/settings', authenticateToken, adminController.getSettings);
// O crear endpoint público separado solo para logo
router.get('/public/logo', publicController.getLogo);
```

---

## ⚠️ VULNERABILIDADES ALTAS (Prioridad 2 - Importante)

### 6. ⚠️ Rate Limiting Muy Permisivo
**Ubicación**: `backend/src/server.js:32`  
**Riesgo**: ALTO  
**Descripción**: Límite de 500 peticiones por 15 minutos es muy alto.

```javascript
max: 500, // ⚠️ Muy permisivo para ataques de fuerza bruta
```

**Impacto**:
- Ataques de fuerza bruta en login (500 intentos cada 15 min)
- Posible DoS por abuso de recursos
- 500 intentos = suficiente para crackear contraseñas débiles

**Solución Requerida**:
```javascript
// Rate limiter general
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // Reducir a 100
    message: 'Demasiadas peticiones, intenta de nuevo más tarde'
});

// Rate limiter estricto para login
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // Solo 5 intentos de login
    skipSuccessfulRequests: true
});

app.use('/api/auth/login', authLimiter);
app.use('/api', generalLimiter);
```

---

### 7. ⚠️ Sin Validación de Entrada en Múltiples Endpoints
**Ubicación**: Múltiples controladores  
**Riesgo**: ALTO  
**Descripción**: No hay validación de entrada con bibliotecas como Joi o Zod.

**Impacto**:
- Inyección SQL (aunque Prisma protege parcialmente)
- NoSQL Injection
- Datos malformados en la base de datos
- Posibles crashes de aplicación

**Solución Requerida**:
```javascript
const Joi = require('joi');

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
});

exports.login = async (req, res) => {
    const { error } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    // ... resto del código
};
```

---

### 8. ⚠️ Falta de Protección CSRF
**Ubicación**: Global  
**Riesgo**: ALTO  
**Descripción**: No hay tokens CSRF implementados.

**Impacto**:
- Ataques CSRF que ejecutan acciones en nombre del usuario
- Modificación no autorizada de datos
- Eliminación de registros

**Solución Requerida**:
```javascript
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

// Aplicar a rutas que modifican datos
router.post('/api/*', csrfProtection);
router.put('/api/*', csrfProtection);
router.delete('/api/*', csrfProtection);
```

---

### 9. ⚠️ Tokens JWT Sin Refresh Token
**Ubicación**: `backend/src/controllers/authController.js`  
**Riesgo**: MEDIO-ALTO  
**Descripción**: Tokens con expiración de 1 día sin mecanismo de refresh.

```javascript
expiresIn: '1d' // ⚠️ Muy largo sin refresh token
```

**Impacto**:
- Si un token es robado, es válido por 24 horas completas
- No hay forma de revocar tokens comprometidos
- Sesiones muy largas aumentan ventana de ataque

**Solución Requerida**:
```javascript
// Access token corto
const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
// Refresh token largo
const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
// Guardar refresh token en DB con posibilidad de revocación
```

---

### 10. ⚠️ Logging Insuficiente de Eventos de Seguridad
**Ubicación**: Global  
**Riesgo**: MEDIO  
**Descripción**: No hay logging de intentos de acceso fallidos, cambios de permisos, etc.

**Impacto**:
- Imposible detectar ataques en curso
- No hay auditoría de acciones sensibles
- Dificulta investigación post-incidente

**Solución Requerida**:
```javascript
const winston = require('winston');

const securityLogger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'security.log' })
    ]
});

// Loggear eventos críticos
securityLogger.info('Login attempt', { email, ip, success: false });
securityLogger.warn('Unauthorized access attempt', { userId, resource });
```

---

## 📋 VULNERABILIDADES MEDIAS (Prioridad 3 - Recomendado)

### 11. 📋 Sin Protección Contra Path Traversal en Uploads
**Ubicación**: `backend/src/controllers/fileController.js:26`  
**Riesgo**: MEDIO  
**Descripción**: Validación básica pero podría mejorarse.

**Solución**:
```javascript
const sanitizedFilename = path.basename(filename); // Eliminar directorios
if (sanitizedFilename !== filename) {
    return res.status(400).json({ error: 'Invalid filename' });
}
```

---

### 12. 📋 Falta de Encabezados de Seguridad Adicionales
**Ubicación**: `backend/src/server.js`  
**Riesgo**: MEDIO  

**Solución**:
```javascript
app.use(helmet({
    // ... configuración actual
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
```

---

### 13. 📋 Sin Límite de Tamaño de Archivo por Tipo
**Ubicación**: `backend/src/controllers/uploadController.js:62`  
**Riesgo**: MEDIO  

**Solución**:
```javascript
const upload = multer({
    storage: storage,
    limits: { 
        fileSize: (req, file, cb) => {
            const limits = {
                'payrolls': 5 * 1024 * 1024,  // 5MB para PDFs
                'avatars': 2 * 1024 * 1024,    // 2MB para avatares
                'news': 3 * 1024 * 1024        // 3MB para noticias
            };
            return limits[file.fieldname] || 10 * 1024 * 1024;
        }
    },
    fileFilter: fileFilter
});
```

---

### 14. 📋 Passwords Sin Requisitos de Complejidad
**Ubicación**: Frontend y Backend  
**Riesgo**: MEDIO  

**Solución**:
```javascript
const passwordSchema = Joi.string()
    .min(12)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
        'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character'
    });
```

---

### 15. 📋 Sin Protección Contra Enumeración de Usuarios
**Ubicación**: `backend/src/controllers/authController.js`  
**Riesgo**: BAJO-MEDIO  

**Solución**:
```javascript
// Usar mismo mensaje para usuario no existe y contraseña incorrecta
if (!user || !isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
}
```

---

## 🔐 RECOMENDACIONES DE CONFIGURACIÓN

### Variables de Entorno Requeridas (Coolify)

```bash
# CRÍTICO - Configurar en Coolify
JWT_SECRET=<generar con: openssl rand -base64 64>
ADMIN_INITIAL_PASSWORD=<contraseña fuerte única>
DATABASE_URL=postgresql://user:pass@host:5432/db
FRONTEND_URL=https://tudominio.com

# RECOMENDADO
NODE_ENV=production
REFRESH_TOKEN_SECRET=<generar con: openssl rand -base64 64>
ENCRYPTION_KEY=<generar con: openssl rand -base64 32>
```

### Configuración de Coolify

1. **Variables de Entorno**: Configurar TODAS las variables críticas
2. **Backups Automáticos**: Configurar backup diario de volumen `uploads` y base de datos
3. **SSL/TLS**: Asegurar que Coolify tiene certificado SSL válido
4. **Firewall**: Limitar acceso solo a puertos necesarios (80, 443)
5. **Logs**: Configurar retención de logs de al menos 30 días

---

## 📊 RESUMEN DE PRIORIDADES

| Prioridad | Vulnerabilidades | Tiempo Estimado | Impacto |
|-----------|------------------|-----------------|---------|
| **P1 - CRÍTICO** | 5 vulnerabilidades | 4-6 horas | Sistema comprometido |
| **P2 - ALTO** | 5 vulnerabilidades | 6-8 horas | Datos en riesgo |
| **P3 - MEDIO** | 5 vulnerabilidades | 4-6 horas | Mejora general |

**Total**: 15 vulnerabilidades identificadas  
**Tiempo total estimado**: 14-20 horas de trabajo

---

## ✅ CHECKLIST PRE-PRODUCCIÓN

### Antes de Desplegar:
- [ ] Configurar CORS restrictivo con dominio específico
- [ ] Generar y configurar JWT_SECRET fuerte en Coolify
- [ ] Generar y configurar ADMIN_INITIAL_PASSWORD en Coolify
- [ ] Eliminar 'unsafe-inline' y 'unsafe-eval' de CSP
- [ ] Proteger endpoint /admin/settings con autenticación
- [ ] Implementar rate limiting estricto en /auth/login
- [ ] Añadir validación de entrada con Joi/Zod
- [ ] Implementar sistema de refresh tokens
- [ ] Configurar logging de seguridad
- [ ] Implementar requisitos de contraseña fuerte
- [ ] Configurar backups automáticos en Coolify
- [ ] Verificar certificado SSL activo
- [ ] Cambiar contraseña de admin después del primer login
- [ ] Revisar y eliminar usuarios de prueba
- [ ] Configurar monitoreo de errores (Sentry, etc.)

### Después de Desplegar:
- [ ] Verificar que CORS funciona correctamente
- [ ] Probar login con rate limiting
- [ ] Verificar que archivos privados requieren autenticación
- [ ] Monitorear logs de seguridad primeras 24h
- [ ] Realizar prueba de penetración básica
- [ ] Documentar procedimientos de respuesta a incidentes

---

## 🚨 ACCIÓN INMEDIATA REQUERIDA

**NO DESPLEGAR A PRODUCCIÓN** hasta corregir al menos las 5 vulnerabilidades CRÍTICAS (P1).

El sistema actual tiene múltiples vectores de ataque que permitirían:
- Acceso no autorizado a datos de empleados
- Robo de nóminas y documentos privados
- Modificación de registros de vacaciones y fichajes
- Compromiso total del sistema

**Tiempo mínimo requerido antes de producción**: 4-6 horas para P1  
**Recomendado**: 14-20 horas para P1 + P2 + P3

---

## 📞 CONTACTO Y SOPORTE

Para implementar estas correcciones, se recomienda:
1. Priorizar vulnerabilidades P1 (CRÍTICO)
2. Implementar P2 (ALTO) antes de manejar datos reales
3. Planificar P3 (MEDIO) en próxima iteración

**Fecha de revisión**: Después de implementar correcciones P1 y P2
