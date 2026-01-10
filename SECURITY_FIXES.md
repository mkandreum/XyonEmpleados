# 🔧 CORRECCIONES DE SEGURIDAD CRÍTICAS - IMPLEMENTACIÓN

Este documento contiene las correcciones de código para las 5 vulnerabilidades CRÍTICAS identificadas en la auditoría.

## 1. Corregir CORS

**Archivo**: `backend/src/server.js`

**Reemplazar línea 41**:
```javascript
// ANTES (INSEGURO):
app.use(cors()); // Configure this restrictively in production!

// DESPUÉS (SEGURO):
app.use(cors({
    origin: process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400 // 24 horas
}));
```

**Añadir a `.env` en Coolify**:
```bash
FRONTEND_URL=https://tudominio.com
```

---

## 2. Corregir JWT Secret

**Archivo**: `backend/src/middleware/auth.js`

**Reemplazar líneas 1-2**:
```javascript
// ANTES (INSEGURO):
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

// DESPUÉS (SEGURO):
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('❌ FATAL ERROR: JWT_SECRET environment variable is not set');
    console.error('Generate one with: openssl rand -base64 64');
    process.exit(1);
}
```

**Archivo**: `backend/src/controllers/authController.js`

**Reemplazar línea 5**:
```javascript
// ANTES (INSEGURO):
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// DESPUÉS (SEGURO):
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('❌ FATAL ERROR: JWT_SECRET environment variable is not set');
    console.error('Generate one with: openssl rand -base64 64');
    process.exit(1);
}
```

**Generar JWT_SECRET seguro**:
```bash
openssl rand -base64 64
```

**Añadir a `.env` en Coolify**:
```bash
JWT_SECRET=<pegar el resultado del comando anterior>
```

---

## 3. Corregir Contraseña de Admin

**Archivo**: `backend/src/server.js`

**Reemplazar función `ensureAdminExists` (líneas 74-103)**:
```javascript
async function ensureAdminExists() {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@xyonempleados.com';
        const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;

        if (!adminPassword) {
            console.error('❌ FATAL ERROR: ADMIN_INITIAL_PASSWORD environment variable is not set');
            console.error('This is required for initial admin user creation');
            process.exit(1);
        }

        // Check if admin exists first to NOT reset password
        const existingAdmin = await prisma.user.findUnique({
            where: { email: adminEmail }
        });

        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash(adminPassword, 12); // Aumentado de 10 a 12 rounds
            await prisma.user.create({
                data: {
                    email: adminEmail,
                    name: 'Admin User',
                    password: hashedPassword,
                    role: 'ADMIN',
                    department: 'IT',
                    position: 'System Administrator',
                    joinDate: new Date(),
                }
            });
            console.log('✓ Admin user created successfully');
            console.warn('⚠️  IMPORTANT: Change the admin password immediately after first login!');
        } else {
            console.log('✓ Admin user already exists');
        }
    } catch (error) {
        console.error('Error ensuring admin exists:', error);
        process.exit(1); // Salir si falla la creación del admin
    }
}
```

**Generar contraseña segura**:
```bash
openssl rand -base64 32
```

**Añadir a `.env` en Coolify**:
```bash
ADMIN_EMAIL=admin@tuempresa.com
ADMIN_INITIAL_PASSWORD=<pegar contraseña generada>
```

**⚠️ IMPORTANTE**: Cambiar esta contraseña inmediatamente después del primer login.

---

## 4. Corregir CSP (Content Security Policy)

**Archivo**: `backend/src/server.js`

**Reemplazar configuración de Helmet (líneas 14-26)**:
```javascript
// Security Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https://ui-avatars.com", "blob:"],
            connectSrc: ["'self'"],
            // CORREGIDO: Eliminado 'unsafe-inline' y 'unsafe-eval'
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"]
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
app.disable('x-powered-by');
```

**Nota**: Si Vite requiere inline scripts en desarrollo, añadir:
```javascript
const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(helmet({
    // ... resto de configuración
    contentSecurityPolicy: isDevelopment ? false : {
        directives: {
            // ... directivas seguras
        }
    }
}));
```

---

## 5. Proteger Endpoint de Settings

**Archivo**: `backend/src/routes.js`

**Opción A - Proteger el endpoint existente (línea 24)**:
```javascript
// ANTES (INSEGURO):
router.get('/admin/settings', adminController.getSettings); // Public for logo loading

// DESPUÉS (SEGURO):
router.get('/admin/settings', authenticateToken, adminController.getSettings);
```

**Opción B - Crear endpoint público separado solo para logo (RECOMENDADO)**:

Añadir ANTES de la línea 21:
```javascript
// Public endpoint solo para obtener el logo
router.get('/public/logo', async (req, res) => {
    try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        const logoSetting = await prisma.globalSettings.findUnique({
            where: { key: 'logoUrl' }
        });
        
        res.json({ 
            logoUrl: logoSetting?.value || '/default-logo.png' 
        });
    } catch (error) {
        console.error('Error fetching logo:', error);
        res.status(500).json({ error: 'Failed to fetch logo' });
    }
});
```

Y proteger el endpoint completo:
```javascript
router.get('/admin/settings', authenticateToken, isAdmin, adminController.getSettings);
```

**Actualizar Frontend** (si usas Opción B):

Buscar en el frontend donde se llama a `/api/admin/settings` solo para el logo y cambiar a `/api/public/logo`.

---

## 6. BONUS: Rate Limiting Estricto para Login

**Archivo**: `backend/src/server.js`

**Añadir después de la línea 38 (después del rate limiter general)**:
```javascript
// Rate limiter estricto para autenticación
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Solo 5 intentos
    skipSuccessfulRequests: true, // No contar logins exitosos
    message: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos',
    standardHeaders: true,
    legacyHeaders: false,
});
```

**Aplicar en routes.js (línea 22-23)**:
```javascript
// Importar al inicio del archivo
const { authLimiter } = require('./server'); // O exportarlo desde server.js

// Aplicar a rutas de auth
router.post('/auth/register', authLimiter, authController.register);
router.post('/auth/login', authLimiter, authController.login);
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Paso 1: Actualizar Código
- [ ] Corregir CORS en `server.js`
- [ ] Corregir JWT Secret en `middleware/auth.js`
- [ ] Corregir JWT Secret en `controllers/authController.js`
- [ ] Corregir contraseña admin en `server.js`
- [ ] Corregir CSP en `server.js`
- [ ] Proteger endpoint settings en `routes.js`
- [ ] (Opcional) Añadir rate limiting estricto

### Paso 2: Configurar Variables de Entorno en Coolify
```bash
# CRÍTICO - Configurar TODAS estas variables
NODE_ENV=production
FRONTEND_URL=https://tudominio.com
JWT_SECRET=<generar con: openssl rand -base64 64>
ADMIN_EMAIL=admin@tuempresa.com
ADMIN_INITIAL_PASSWORD=<generar con: openssl rand -base64 32>
DATABASE_URL=postgresql://user:pass@host:5432/db
```

### Paso 3: Commit y Push
```bash
git add -A
git commit -m "Security: Fix critical vulnerabilities (CORS, JWT, Admin password, CSP, Settings endpoint)"
git push origin main
```

### Paso 4: Desplegar en Coolify
1. Coolify detectará los cambios automáticamente
2. Verificar que todas las variables de entorno están configuradas
3. Desplegar

### Paso 5: Verificación Post-Despliegue
- [ ] Verificar que el login funciona
- [ ] Verificar que CORS bloquea orígenes no autorizados
- [ ] Cambiar contraseña de admin inmediatamente
- [ ] Verificar que archivos privados requieren autenticación
- [ ] Monitorear logs por 24 horas

---

## ⚠️ ADVERTENCIAS

1. **CSP Estricto**: Si eliminas `unsafe-inline` y `unsafe-eval`, Vite podría no funcionar en desarrollo. Usa la configuración condicional mostrada arriba.

2. **CORS**: Asegúrate de que `FRONTEND_URL` coincide EXACTAMENTE con tu dominio (incluyendo https://).

3. **JWT_SECRET**: Una vez configurado en producción, NO lo cambies o invalidarás todas las sesiones.

4. **Admin Password**: Cámbiala INMEDIATAMENTE después del primer login.

5. **Testing**: Prueba TODAS estas correcciones en un entorno de staging antes de producción.

---

## 🆘 ROLLBACK EN CASO DE PROBLEMAS

Si algo falla después del despliegue:

```bash
# Volver a la versión anterior
git revert HEAD
git push origin main

# O hacer rollback en Coolify desde la interfaz web
```

---

## 📞 PRÓXIMOS PASOS

Después de implementar estas correcciones CRÍTICAS:

1. Implementar correcciones de Prioridad 2 (ALTO)
2. Añadir validación de entrada con Joi
3. Implementar sistema de refresh tokens
4. Configurar logging de seguridad
5. Realizar prueba de penetración

**Tiempo estimado para P1**: 4-6 horas  
**Fecha objetivo**: Antes de poner en producción
