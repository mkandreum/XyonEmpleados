# Portal del Empleado Corporativo (HR Portal)

Plataforma integral y adaptable de gestión de Recursos Humanos, diseñada para centralizar y modernizar la interacción entre la empresa y sus colaboradores. Este sistema ofrece una solución *white-label* personalizable, permitiendo gestionar vacaciones, nóminas, comunicados internos y perfiles de usuario de manera eficiente y segura.

<div align="center">
  <h3>🚀 Solución Enterprise para Gestión de Talento y Administración</h3>
</div>

## 🌟 Características Principales

### 👤 Portal del Empleado
- **Dashboard Personalizable**: Vista unificada de días libres, ausencias y comunicados relevantes.
- **Gestión de Ausencias y Vacaciones**: 
  - Solicitud de días de descanso con validación automática de días disponibles.
  - Seguimiento de estado en tiempo real (Pendiente/Aprobado/Rechazado).
- **Mis Documentos**: Acceso seguro a nóminas, contratos y certificados (PDF).
- **Comunicación Interna**: Muro de noticias corporativas y calendario de eventos.
- **Autogestión**: Actualización de perfil personal y datos de contacto.

### 🛡️ Panel de Administración (Backoffice)
- **Dashboard Analítico**: KPIs de RRHH en tiempo real.
- **Gestión de Usuarios Multi-Rol**: Admisión de empleados, managers y administradores con control de acceso granular (RBAC).
- **Flujos de Aprobación**: Sistema centralizado para validar solicitudes de vacaciones.
- **CMS de Contenidos**: Publicación de noticias y eventos segmentados.
- **Gestión Documental**: Carga masiva o individual de nóminas y documentos laborales.

## 🛠️ Stack Tecnológico

Arquitectura moderna diseñada para escalabilidad y fácil mantenimiento:

### Frontend
- **React 18** + **Vite**: Rendimiento óptimo y experiencia de desarrollo ágil.
- **Tailwind CSS**: Estilos personalizables y diseño *mobile-first*.
- **Arquitectura de Componentes**: UI modular y reutilizable.
- **Feedback System**: Interfaz reactiva con notificaciones modales integradas.

### Backend
- **Node.js**: Servidor ligero y escalable.
- **Prisma ORM**: Capa de datos agnóstica (compatible con PostgreSQL, MySQL, SQLite).
- **Seguridad**: Autenticación JWT y protección de endpoints sensibles.

## 🚀 Despliegue e Instalación

### Requisitos
- Node.js v18+
- Docker (Opcional, recomendado para producción)

### Puesta en Marcha Local

1. **Clonar el proyecto**:
   ```bash
   git clone https://github.com/tu-organizacion/hr-portal.git
   cd hr-portal
   ```

2. **Instalación de Dependencias**:
   ```bash
   npm install && cd backend && npm install && cd ..
   ```

3. **Configuración de Base de Datos**:
   ```bash
   cd backend
   npx prisma generate
   npx prisma db push
   npx prisma db seed # Inicializa datos base
   cd ..
   ```

4. **Ejecutar**:
   ```bash
   npm run dev
   ```
   Acceso: `http://localhost:5173`

## 📦 Despliegue Dockerizado

El sistema está listo para desplegarse como microservicios:

```bash
docker-compose up --build -d
```

## 🔐 Usuarios de Prueba (Seed)

| Rol | Email | Contraseña |
|-----|-------|------------|
| **Admin** | `admin@empresa.com` | `admin123` |
| **Manager** | `manager@empresa.com` | `user123` |
| **Empleado** | `empleado@empresa.com` | `user123` |

---
**Adaptable a cualquier identidad corporativa.**
