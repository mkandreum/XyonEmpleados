# Auditoria de seguridad - XyonEmpleados

Fecha: 2026-10-09. Alcance: backend (Express/Prisma), Docker, dependencias y revision superficial del frontend.
Estado: C = corregido, P = parcial, A = accion manual requerida, N = no corregido.
Los numeros de linea cambian con las correcciones, por eso se indica fichero y funcion.

| # | Sev. | Hallazgo | Ubicacion | Estado |
|---|---|---|---|---|
| 1 | Critica | `backend/.env` (DATABASE_URL con password de Postgres) versionado en git (commit 996208e) y copiado a la imagen Docker | backend/.env, Dockerfile (`COPY backend/`), .dockerignore | C: `git rm --cached`, .gitignore y .dockerignore (`**/.env`). **A: rotar la password de Postgres y purgar el historial (git filter-repo/BFG)** |
| 2 | Critica | Borrado arbitrario de ficheros: `DELETE /upload/file` abierto a cualquier usuario, con rama "legacy" `path.join(__dirname,'../../',filepath)` y `../` | uploadController.deleteFile | C: solo /api/files y /uploads/public, `path.resolve` + comprobacion de prefijo, solo propietario o ADMIN |
| 3 | Alta | Acceso a nominas/justificantes ajenos: `signedPdfUrl` y `justificationUrl` aceptaban cualquier cadena y fileController autorizaba con `contains: filename` | payrollController.uploadSignedPayroll, vacationController, fileController.getFile | C: ficheros privados con prefijo `<userId>-`, `isOwnedPrivateFileUrl` (utils/safeUrl.js), coincidencia exacta |
| 4 | Alta | IDOR: cualquier MANAGER leia fichajes de cualquier usuario (`/fichajes/week\|month/:userId`) | fichajeController.getWeek/getMonth | C: MANAGER limitado a su departamento |
| 5 | Alta | IDOR: `GET /user-shift-assignments?userId=` para cualquier usuario; MANAGER asignaba turnos a cualquiera; lectura de horarios/beneficios de cualquier departamento | userShiftAssignmentController, routes.js | C |
| 6 | Alta | JWT sin algoritmo fijado; rol en token valido 24 h tras cambio de rol o borrado del usuario | middleware/auth.js | C: HS256, rol/departamento releidos de BD, usuario inexistente => 401. P: sin revocacion al cambiar la contrasena (token vive <= 1 dia) |
| 7 | Alta | Clave de cifrado SMTP por defecto publica en el codigo; `smtpPass` (cifrado) devuelto por GET /admin/settings | utils/encryptionUtils.js, adminController.getSettings, emailService.getTransporter | C: clave desde ENCRYPTION_KEY o derivada de JWT_SECRET (descifrado con la clave antigua como fallback), valor enmascarado, y migracion automatica a cifrado de la password en texto plano al primer uso. **A: definir ENCRYPTION_KEY (si se hace despues de la migracion, volver a guardar SMTP)** |
| 8 | Alta | Contrasena `default123` en importacion masiva; alta de usuarios admin sin validacion y bcrypt 10 | adminController.importUsers/createUser | C: aleatoria, bcrypt 12, Joi (adminCreateUserSchema) |
| 9 | Alta | Dependencias vulnerables (express/qs, proxy-addr, nodemailer inyeccion SMTP/CRLF, react-router...) | package.json (raiz y backend) | C: `npm audit fix`, nodemailer ^10.0.16, uuid (sin uso) eliminado. Restan solo herramientas de desarrollo (braces/nodemon, postcss-selector-parser) |
| 10 | Media | Un `new PrismaClient()` por peticion en ~30 sitios (agotamiento de conexiones, DoS) | controllers, routes.js | C: cliente compartido src/lib/prisma.js |
| 11 | Media | Subidas: SVG permitido en logos (XSS almacenado), solo se confiaba en mimetype/extension | uploadController | C: SVG eliminado, magic bytes, CSP + nosniff en /uploads/public, nombre `<userId>-...` |
| 12 | Media | Spam de emails: forgot-password solo limitado en fallos; el 500 por fallo SMTP delataba cuentas | routes.js, authController.forgotPassword, server.js | C: `passwordResetLimiter` 10/h por IP real + `passwordResetEmailLimiter` 3/15 min por email (el IP de origen rota, la cuenta no) + cooldown de 10 min sin reenvio; error de email silenciado |
| 13 | Media | Enumeracion de usuarios por timing en login; hash del reset token en respuestas de login/registro/perfil | authController | C |
| 14 | Media | TLS SMTP con `rejectUnauthorized:false` | services/emailService.js | C (verifica por defecto; `SMTP_TLS_INSECURE=true` para autofirmados) |
| 15 | Media | HTML injection en emails (nombres/motivos sin escapar) | emailTemplateService.replaceVariables | C |
| 16 | Media | Degradar al ultimo admin; estados y roles sin validar; ajustes con tipos arbitrarios; aprobacion de manager sin comprobar estado ni autoaprobacion | adminController, vacationController | C |
| 17 | Media | `avatarUrl` arbitrario (esquemas javascript:/data:) | authController.updateProfile, admin | C |
| 18 | Media | Docker: contenedor como root, sin `no-new-privileges`, ENCRYPTION_KEY/VAPID no propagados, JWT corto aceptado, `npm install` no determinista | Dockerfile, docker-compose.yaml | C: `su-exec node`, cap_drop ALL, no-new-privileges, JWT >= 32, `npm ci` |
| 19 | Media | CORS: sin `FRONTEND_URL` se permite cualquier origen con `credentials:true`; solo un origen | server.js | P: `credentials:false`, lista de origenes. **A: definir FRONTEND_URL en produccion** |
| 20 | Baja | Sin manejador global de errores; morgan `dev` en produccion; limite JSON 10 kb rompia la importacion masiva | server.js | C |
| 21 | Baja | La BD (compose) arranca temporalmente con `pg_hba trust all` para sincronizar la password | docker-compose.yaml (servicio db) | N: red interna de compose, ventana corta; mejor eliminar el hack |
| 22 | Baja | `Clear-Site-Data: "cache"` en cada pagina SPA (rendimiento); logs verbosos | server.js, controllers | N |
| 23 | Info | JWT en `localStorage` del frontend (expuesto a XSS) | frontend (context/, services/api.ts) | N: fuera de alcance; mitigado por CSP y escape de React. Android: usar Keystore |
| 24 | Info | SQL injection: no encontrada; el unico `$queryRaw` (statsController) es plantilla etiquetada sin entrada de usuario. Sin `eval`/`exec` en backend | statsController | OK |
| 25 | Info | Sin refresh tokens ni bloqueo de cuenta por usuario (solo por IP) | auth | N: recomendable para la app Android |

## Acciones pendientes del propietario
1. Rotar la password de Postgres (estuvo en git) y purgar el historial; usar un `JWT_SECRET` aleatorio de >= 32 caracteres.
2. Definir `ENCRYPTION_KEY`, `FRONTEND_URL` y (opcional) VAPID en el entorno; volver a guardar la contrasena SMTP.
3. Los ficheros privados subidos antes de este cambio no tienen prefijo de usuario: se siguen sirviendo y las nominas ya vinculadas funcionan, pero un empleado no podra vincularlos de nuevo como justificante.
