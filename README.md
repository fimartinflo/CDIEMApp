# CDIEMApp — Sistema de Gestión Clínica Oncológica

Sistema de gestión clínica para un centro oncológico. Permite administrar pacientes, sillones de tratamiento y medicamentos, con funcionamiento **offline-first** y persistencia local mediante **SQLite**.

**Autor:** Felipe Martínez Flores

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + Express v5.2.1 |
| Frontend | React v19.2.4 |
| Base de datos | SQLite3 (local, offline-first) |
| ORM | Sequelize v6.37.7 |
| Autenticación | JWT + bcryptjs |
| UI | Material-UI (MUI) v7.3.7 |
| HTTP Client | Axios v1.13.4 |
| Routing | React Router v7.13.0 |

---

## Características Principales

- Gestión completa de pacientes (CRUD + búsqueda por nombre/RUT/pasaporte)
- Gestión de sillones de atención con estado en tiempo real
- Asignación de pacientes a sillones y registro de sesiones clínicas
- Administración de medicamentos por sesión (con descuento de stock automático)
- Control de inventario con alertas de stock bajo y vencimiento
- Dashboard con métricas del sistema en tiempo real
- Autenticación JWT con roles (admin / doctor)
- Persistencia local con SQLite (sin conexión a internet requerida)

---

## Estructura del Proyecto

```
CDIEMApp/
├── CLAUDE.md                    # Contexto del proyecto para el asistente IA
├── README.md
├── .gitignore
├── database.sqlite              # Base de datos local (git-ignorada)
│
├── backend/
│   ├── src/
│   │   ├── app.js               # Entry point Express
│   │   ├── config/database.js   # Configuración SQLite/Sequelize
│   │   ├── models/              # Modelos Sequelize (Patient, Chair, Medication, etc.)
│   │   ├── controllers/         # Lógica de negocio
│   │   ├── routes/              # Rutas API
│   │   ├── middleware/          # Auth JWT, roles, error handler
│   │   └── utils/response.js    # Helpers de respuesta estandarizada
│   ├── init-db.js               # Script de inicialización y seed
│   ├── reset-passwords.js       # Script de recuperación de credenciales
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── App.js
    │   ├── components/          # Layout, PatientForm, PatientSearch, PrivateRoute
    │   ├── pages/               # Login, Dashboard, Patients, Chairs, Inventory
    │   └── services/            # api.js (Axios), authService, patientService, etc.
    └── package.json
```

---

## Requisitos Previos

- Node.js v18 o superior
- npm

---

## Instalación y Ejecución

### 1. Clonar el repositorio

```bash
git clone https://github.com/fimartinflo/CDIEMApp.git
cd CDIEMApp
```

### 2. Instalar dependencias del backend

```bash
cd backend
npm install
```

### 3. Inicializar la base de datos

```bash
npm run init-db
```

Esto crea las tablas y los datos iniciales:
- Usuarios: `admin` / `admin123` y `doctor` / `doctor123`
- 4 sillones (S1–S4)
- 3 medicamentos de ejemplo

### 4. Levantar el backend

```bash
npm run dev       # Desarrollo (nodemon, auto-restart)
# o
npm start         # Producción
```

El servidor queda disponible en `http://localhost:3001`.

### 5. Instalar dependencias del frontend

```bash
cd ../frontend
npm install
```

### 6. Levantar el frontend

```bash
npm start
```

La aplicación queda disponible en `http://localhost:3000`.

---

## Credenciales de Acceso

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin` | `admin123` | Administrador |
| `doctor` | `doctor123` | Doctor |

> Si las credenciales dejan de funcionar (ej. BD corrompida), ejecutar:
> ```bash
> node backend/reset-passwords.js
> ```

---

## API REST (puerto 3001)

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Login → retorna JWT |
| GET | `/api/auth/profile` | Perfil del usuario autenticado |
| PUT | `/api/auth/change-password` | Cambiar contraseña |

### Pacientes
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/patients` | Listar con paginación |
| POST | `/api/patients` | Crear paciente |
| GET | `/api/patients/:id` | Obtener por ID |
| PUT | `/api/patients/:id` | Actualizar |
| DELETE | `/api/patients/:id` | Desactivar (borrado lógico) |
| GET | `/api/patients/search` | Búsqueda por nombre/RUT/pasaporte |
| GET | `/api/patients/:id/history` | Historial de sesiones clínicas |

### Sillones
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/chairs` | Listar con estado de sesión activa |
| POST | `/api/chairs/:id/assign` | Asignar paciente (crea sesión) |
| POST | `/api/chairs/:id/release` | Liberar sillón (cierra sesión) |
| POST | `/api/chairs/:id/medications` | Administrar medicamento |
| GET | `/api/chairs/live` | Estado en vivo de todos los sillones |
| GET | `/api/chairs/:id/history` | Historial de sesiones |

### Inventario
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/inventory` | Listar medicamentos |
| POST | `/api/inventory` | Crear medicamento |
| GET | `/api/inventory/alerts` | Stock crítico y próximos a vencer |
| PUT | `/api/inventory/:id/quantity` | Actualizar stock |
| DELETE | `/api/inventory/:id` | Eliminar (borrado lógico) |

### Utilidades
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/dashboard` | Métricas del sistema |
| GET | `/health` | Health check |

---

## Flujo Clínico Principal

```
1. Login → JWT almacenado en localStorage
2. Dashboard → métricas del sistema en tiempo real
3. Pacientes → CRUD completo + búsqueda debounced
4. Inventario → gestión de medicamentos (stock, alertas)
5. Sillones:
   a. Sillón disponible → "Asignar Paciente" → crea sesión activa
   b. Sesión activa → administrar medicamentos (descuenta stock)
   c. "Liberar Sillón" → cierra sesión, sillón vuelve a disponible
6. Historial → sesiones por paciente o por sillón
```

---

## Scripts Disponibles

### Backend
```bash
npm start         # Producción
npm run dev       # Desarrollo con nodemon
npm run init-db   # Inicializar BD con datos de prueba
npm test          # 67 tests de integración
```

### Frontend
```bash
npm start         # Dev server en puerto 3000
npm run build     # Build de producción
```

---

## Pendiente / Próximos Pasos

- Tests de frontend
- Selector de medicamentos del inventario al asignar sillón (actualmente texto libre)
- Polling en tiempo real para estado de sillones
- UI diferenciada por rol (admin vs doctor)
- Variables de entorno para API_URL
- Migraciones Sequelize en lugar de `sync()`
- Migración futura a base de datos online (PostgreSQL/MySQL)
