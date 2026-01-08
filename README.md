# Portal del Empleado - Grupo Velilla

Plataforma integral de gestión de Recursos Humanos diseñada para modernizar y simplificar la interacción entre la empresa y los empleados. Este portal ofrece una experiencia de usuario premium, centralizando la gestión de vacaciones, nóminas, comunicados y trámites administrativos.

<div align="center">
  <h3>🚀 Gestión de RRHH Simplificada y Moderna</h3>
</div>

## 🌟 Características Principales

### 👤 Portal del Empleado
- **Dashboard Personal**: Resumen visual de días de vacaciones pendientes, próximas ausencias y acceso rápido a noticias.
- **Gestión de Vacaciones**: 
  - Solicitud intuitiva de días de descanso.
  - Visualización del estado de solicitudes (Pendiente/Aprobado/Rechazado).
  - Contador en tiempo real de días disponibles y gastados.
- **Mis Nóminas**: Acceso seguro, visualización y descarga de nóminas mensuales en formato PDF.
- **Comunicación Interna**: Muro de noticias corporativas, eventos próximos y documentación de beneficios.
- **Perfil de Usuario**: Gestión autónoma de información personal, contacto de emergencia y seguridad (cambio de contraseña).

### 🛡️ Panel de Administración
- **Dashboard de Control**: Métricas clave de la organización (total empleados, solicitudes pendientes, usuarios activos).
- **Gestión de Usuarios**: 
  - Alta, baja y modificación de empleados.
  - Asignación de roles y permisos (Empleado, Manager, Admin).
- **Control de Vacaciones**: Flujo centralizado para aprobar o rechazar solicitudes de vacaciones del equipo.
- **Gestión de Contenidos**: CMS integrado para publicar y editar Noticias y Eventos corporativos.
- **Gestión de Nóminas**: Herramienta para la carga y asignación de documentos de nómina a los empleados.

## 🛠️ Stack Tecnológico

El proyecto utiliza una arquitectura moderna y robusta:

### Frontend
- **Core**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/) (Build tool de alto rendimiento).
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/) (Diseño responsive, utilidad-first).
- **Componentes UI**: Sistema de diseño propio con iconos de [Lucide React](https://lucide.dev/).
- **Feedback**: Sistema de Modales personalizado (sin alertas nativas).
- **Visualización**: Gráficos con [Recharts](https://recharts.org/).

### Backend
- **Servidor**: Node.js + Express.
- **ORM**: [Prisma](https://www.prisma.io/) (Tipo-seguro y moderno).
- **Base de Datos**: Compatible con SQLite (Dev) y PostgreSQL (Prod).
- **Seguridad**: Autenticación vía JWT y encriptación de contraseñas con Bcrypt.

## 🚀 Instalación y Despliegue

### Requisitos Previos
- Node.js v18 o superior.
- NPM o Yarn.

### Ejecución Local

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/mkandreum/PortalEmp.git
   cd PortalEmp
   ```

2. **Instalar dependencias**:
   ```bash
   # Instalar dependencias del frontend y raíz
   npm install

   # Instalar dependencias del backend
   cd backend
   npm install
   cd ..
   ```

3. **Configurar Base de Datos**:
   Es necesario inicializar la base de datos y generar el cliente de Prisma.
   ```bash
   cd backend
   npx prisma generate
   npx prisma db push
   npx prisma db seed  # Carga datos iniciales (Usuario Admin)
   cd ..
   ```

4. **Iniciar la Aplicación**:
   Ejecuta tanto el cliente como el servidor en paralelo.
   ```bash
   npm run dev
   ```
   El portal estará disponible en `http://localhost:5173`.

## 📦 Despliegue con Docker

El proyecto está contenerizado para facilitar su despliegue en cualquier entorno (VPS, Coolify, Portainer).

```bash
docker-compose up --build -d
```

## 🔐 Credenciales (Entorno de Desarrollo)
Si se ejecuta el seed de base de datos, se crean los siguientes usuarios por defecto:

| Rol | Email | Contraseña |
|-----|-------|------------|
| **Admin** | `admin@velilla.com` | `admin123` |
| **Manager** | `manager@velilla.com` | `user123` |
| **Empleado** | `empleado@velilla.com` | `user123` |

---
© 2024 Grupo Velilla - Portal del Empleado
