# API XyonEmpleados (para clientes web y Android)

Base: `https://<host>/api`. JSON salvo subidas (multipart). Cabecera de auth: `Authorization: Bearer <JWT>`.

## Autenticacion
- `POST /auth/login` `{email, password}` -> `{token, user}`. JWT HS256, validez 1 dia. No hay refresh token: al caducar, volver a hacer login.
- El token NO va en cookies. En Android: guardarlo en EncryptedSharedPreferences / Keystore, nunca en claro.
- Errores de auth: `401 NO_TOKEN`, `401 INVALID_TOKEN` (usuario borrado), `403 TOKEN_EXPIRED`, `403 INVALID_TOKEN`. Tratar todos como "volver a login".
- Rol, departamento y estado `active` se releen de la BD en cada peticion (un cambio de rol aplica al instante).
- Usuario desactivado: `POST /auth/login` con credenciales correctas -> `403 {code:'ACCOUNT_DISABLED'}`; con un token ya emitido -> `401 ACCOUNT_DISABLED`. Tratar como "volver a login" y avisar al usuario.
- Politica de contrasena (register/change/reset/alta admin): >= 12 caracteres, mayuscula, minuscula, numero y simbolo.
- Rate limit: login/register 5 intentos fallidos/15 min por IP; forgot/reset 10/hora; global 1000/15 min. Respuesta 429 `{error}`.
- CORS: las peticiones sin cabecera `Origin` (apps nativas) se aceptan; los navegadores deben coincidir con `FRONTEND_URL` (lista separada por comas).

## Roles
`EMPLOYEE`, `MANAGER` (limitado a su departamento), `ADMIN`.

## Publicos (sin token)
| Metodo | Ruta | Notas |
|---|---|---|
| GET | /health, /version | |
| POST | /auth/register | requiere `invitationCode` |
| POST | /auth/login | |
| POST | /auth/forgot-password `{email}` | respuesta generica |
| POST | /auth/reset-password `{token,email,newPassword}` | |
| GET | /public/logo | logo, nombre empresa, departamentos |
| GET | /events, /holidays/next | |

## Autenticados (cualquier rol)
| Metodo | Ruta | Notas |
|---|---|---|
| GET/PUT | /users/profile | PUT: phone, address, emergencyContact, avatarUrl (solo `/uploads/public/...` o `https://`), shiftReminderEmail |
| POST | /users/change-password | `{currentPassword,newPassword}` |
| GET | /payrolls; PUT /payrolls/:id/signed `{signedPdfUrl}`; GET /payrolls/:id/download | solo propias; `signedPdfUrl` = URL devuelta por /upload/payroll |
| GET/POST | /vacations; PATCH /vacations/:id/justification | `justificationUrl` debe ser `/api/files/justifications/<tuUserId>-...` (resultado de /upload/justification) |
| GET | /news | |
| GET, PUT, DELETE | /notifications, /notifications/:id/read, /notifications/read-all, /notifications/:id | propias |
| POST/GET | /fichajes, /fichajes/current, /fichajes/history | ADMIN puede pasar `userId` en history |
| GET | /fichajes/report?month&year&userId&department | CSV mensual. EMPLOYEE: siempre el propio. MANAGER: `userId` de su departamento o `department=<el suyo>` (todo el departamento en un CSV); otro departamento/usuario ajeno -> 403. ADMIN: cualquiera |
| GET | /schedule-overrides?department&userId&from&to | excepciones de horario por dia (ver abajo). EMPLOYEE: solo las propias / de su dpto |
| GET | /fichajes/week/:userId, /fichajes/month/:userId | propio; MANAGER solo su departamento; ADMIN todos |
| GET | /department-schedules/:department(/resolved), /department-shifts/:department, /benefits/department/:department | solo departamento propio (ADMIN cualquiera) |
| GET | /benefits/user | |
| GET | /user-shift-assignments?userId&month&year | propio; MANAGER su dpto; ADMIN todos |
| POST/GET | /late-notifications..., /fichaje-adjustments (crear / mis solicitudes) | |
| GET | /dashboard-layouts/active | |
| GET/POST/DELETE | /push/public-key, /push/subscriptions | |
| GET | /files/:type/:filename | type = payrolls o justifications; propietario, MANAGER (justificantes de su dpto) o ADMIN. Requiere Bearer (usar OkHttp con cabecera, no URL directa) |
| POST | /upload/justification (campo multipart `justifications`), /upload/avatar (campo `avatars`) | jpg/png (avatar), jpg/png/pdf (justificante); max 10 MB. El nombre de fichero puede ir SIN extension: la extension se deriva de los magic bytes (el nombre/extension del cliente nunca se usa; mimetype `image/jpeg`, `image/png`, `application/pdf` u `application/octet-stream`) |
| DELETE | /upload/file `{fileUrl}` | solo ficheros subidos por uno mismo (ADMIN cualquiera) |

Respuesta de subida: `{success,url,filename,originalname,size}`. Ficheros publicos (`/uploads/public/...`) se sirven sin auth; los privados solo via `/api/files/...`.

## MANAGER o ADMIN
- GET /manager/team-vacations, /manager/team-members; PATCH /manager/vacations/:id/approve|reject (solo solicitudes `PENDING_MANAGER` de su dpto; no las propias al aprobar)
- GET /fichajes/department/:dept/week (MANAGER solo su dpto)
- GET /team/week?department&weekStart=YYYY-MM-DD: vista semanal del equipo. MANAGER solo su dpto (403 `DEPARTMENT_FORBIDDEN` si pide otro; por defecto el suyo); ADMIN debe indicar `department`. `weekStart` = cualquier fecha, se normaliza al lunes (def. semana actual). Respuesta: `{department, weekStart, weekEnd, days[7], shifts, members:[{user:{id,name,email,position,avatarUrl,active}, totalHours, days:[{date, fichajes[], hours, isComplete, isLate, isEarlyDeparture, validationMessage, schedule, vacations[], absences[], shift, override}]}]}`
- Edicion directa de fichajes (MANAGER solo usuarios de su dpto y nunca los propios; ADMIN cualquiera). Siempre `reason` (3-500 car.), auditado y se notifica al empleado. Validacion: `timestamp` ISO no futuro, alternancia ENTRADA/SALIDA empezando por ENTRADA, sin solapes ni horas iguales en el dia. Un dia puede quedar abierto (`dayClosed:false`) para crear la pareja en dos pasos.
  - POST /fichajes/manual `{userId, tipo, timestamp, reason}` -> 201 fichaje + `dayClosed`
  - PUT /fichajes/manual/:id `{tipo?, timestamp?, reason}`
  - DELETE /fichajes/manual/:id `{reason}` (o `?reason=`)
- PUT /schedule-overrides `{date:'YYYY-MM-DD', userId? | department?, dayOff? | horaEntrada?/horaSalida? (HH:mm)/toleranciaMinutos?, note?}` (upsert; con `userId` aplica a ese usuario y prevalece sobre la del departamento; MANAGER solo su dpto); DELETE /schedule-overrides/:id. La excepcion se aplica en /fichajes/week|month, informe, department/week, team/week (retrasos/salidas anticipadas, dia libre) y en el turno asignado al fichar.
- POST /user-shift-assignments (MANAGER solo usuarios de su dpto)
- GET /fichaje-adjustments/pending|all; PATCH /fichaje-adjustments/:id/approve|reject

## Solo ADMIN
/admin/stats, /admin/users (GET, POST, PUT /:id, DELETE /:id, POST /bulk, POST /import, PATCH|PUT /:id/active), /admin/vacations (+ PUT /:id/status con APPROVED|REJECTED), /admin/settings (GET/PUT; `smtpPass` se devuelve como `********`, reenviar ese valor = no cambiar), /admin/invites, /admin/office-locations/:department, /admin/email-templates, /admin/news, /admin/payrolls, /admin/events, /admin/benefits, /department-schedules (GET todos, POST, DELETE), /department-shifts (POST/PUT/DELETE), /dashboard-layouts (CRUD), /upload/logo|payroll|news.

### Usuarios activos/inactivos (ADMIN)
- Todos los listados de usuarios (`GET /admin/users`, `/manager/team-members`, `/users/profile`, login) devuelven `active` (boolean, def. true).
- `PATCH|PUT /admin/users/:id/active` `{active:boolean}` -> usuario. No se puede desactivar uno mismo ni al ultimo admin activo. `PUT /admin/users/:id` tambien acepta `active`.
- Inactivo: sin login, tokens invalidos al instante, sin recordatorios de turno, notificaciones ni avisos de llegada tarde; fichajes/vacaciones/nominas se conservan. Aparece en vistas de historial (`active:false`).

### Importacion masiva (ADMIN)
`POST /admin/users/import` `{users:[{name,email,role?,department?,position?,joinDate?}] | csv:"name,email,role,department,position,joinDate\n...", dryRun?:false, sendInvites?:true}`. Maximo 300 filas (cuerpo JSON max 100 kb). Las columnas `password` se ignoran: cada usuario nuevo recibe una contrasena aleatoria desconocida y un enlace de alta (/reset-password, valido 72 h) por email. `dryRun:true` solo valida. Respuesta: `{dryRun, summary:{total,created,wouldCreate,skipped,errors,invitesSent}, results:[{row,email,status:'CREATED'|'WOULD_CREATE'|'SKIPPED'|'ERROR',error,inviteSent,userId?}]}`. `POST /admin/users/bulk` (web) usa el mismo nucleo y mantiene `{message,results:{success,failed,errors[]}}` (+ `rows`).

## Cambios (octubre 2026, ronda de mejoras)

| Método | Ruta | Auth | Notas |
|---|---|---|---|
| DELETE | `/api/vacations/:id` | Usuario (propietario) | Cancela una solicitud propia en `PENDING*`. 404 si no es tuya, 409 si ya está decidida. |
| GET | `/api/vacations/overlap?startDate&endDate` | Usuario | Compañeros activos del mismo departamento ausentes (aprobado o pendiente) en el rango. Devuelve `{ count, people: [{ name, approved }] }`, nunca el tipo de ausencia. Rango máx. 366 días. |
| GET | `/api/fichajes/month/:userId?year&month` | Igual que antes | `year`/`month` (1-12) opcionales; por defecto el mes actual. |
| GET | `/api/fichajes/current` | Usuario | Nuevo campo `missingExit`: última entrada de un día anterior sin salida (o `null`). `turno.label` añadido (antes solo `turno.turno`). |
| POST | `/api/vacations` | Usuario | **El servidor recalcula `days`**: VACATION = días laborables; otros tipos = naturales si el cliente envió el recuento natural, si no laborables. `days: 0` + `hours > 0` = solicitud por horas (un solo día). |

Validación de contraseñas (registro, cambio, restablecer): mínimo 12 caracteres con mayúscula, minúscula, número y **cualquier** símbolo. Mensajes en español.

Informes CSV: las celdas se sanean contra inyección de fórmulas (`=`, `+`, `-`, `@`) y se eliminan `;` y saltos de línea dentro de los valores.
