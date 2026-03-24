# CLAUDE.md — Contexto del Proyecto CDIEMApp

> Este archivo es la fuente de verdad para el asistente Claude. Actualizar siempre que haya cambios relevantes en arquitectura, dependencias, modelos o flujos.

---

## Descripción del Proyecto

**CDIEMApp** es un sistema de gestión clínica para un centro oncológico.
Permite administrar pacientes, sillas de tratamiento y medicamentos, con funcionamiento offline y persistencia local.

**Autor:** Felipe Martínez Flores

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + Express v5.2.1 |
| Frontend | React v19.2.4 |
| Base de datos | SQLite3 (local, offline-first) |
| ORM | Sequelize v6.37.7 |
| Autenticación | JWT (jsonwebtoken v9.0.3) + bcryptjs v3.0.3 |
| UI | Material-UI (MUI) v7.3.7 |
| HTTP Client | Axios v1.13.4 |
| Routing | React Router v7.13.0 |
| Fechas | date-fns v4.1.0 |

---

## Estructura de Directorios

```
CDIEMApp/
├── CLAUDE.md                    # Este archivo
├── README.md                    # Documentación del proyecto
├── .gitignore
├── database.sqlite              # Base de datos (git-ignorada)
│
├── backend/
│   ├── src/
│   │   ├── app.js               # Entry point del servidor Express
│   │   ├── config/
│   │   │   └── database.js      # Configuración SQLite/Sequelize
│   │   ├── models/              # Modelos Sequelize
│   │   │   ├── Patient.js
│   │   │   ├── Chair.js
│   │   │   ├── ChairSession.js
│   │   │   ├── Medication.js
│   │   │   ├── SessionMedication.js
│   │   │   ├── User.js
│   │   │   ├── Visit.js
│   │   │   ├── Inventory.js
│   │   │   ├── index.js         # Importa todos los modelos
│   │   │   └── associations.js  # Relaciones entre modelos
│   │   ├── controllers/
│   │   │   ├── patientController.js
│   │   │   ├── chairController.js
│   │   │   ├── authController.js
│   │   │   └── inventoryController.js
│   │   ├── routes/
│   │   │   ├── patientRoutes.js
│   │   │   ├── chairRoutes.js
│   │   │   ├── inventoryRoutes.js
│   │   │   └── authRoutes.js
│   │   ├── middleware/
│   │   │   ├── auth.js          # Verificación JWT
│   │   │   ├── roles.js         # Control de acceso por rol
│   │   │   └── errorHandler.js  # Manejo centralizado de errores
│   │   └── utils/
│   │       └── response.js      # Utilidades de respuesta (success/error)
│   ├── init-db.js               # Script de inicialización y seed
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── App.js               # Componente raíz con rutas
    │   ├── index.js             # Entry point React
    │   ├── components/
    │   │   ├── Layout.js        # Wrapper principal de layout
    │   │   ├── PatientForm.js   # Formulario de pacientes
    │   │   ├── PatientSearch.js # Búsqueda de pacientes
    │   │   └── PrivateRoute.js  # Protección de rutas
    │   ├── pages/
    │   │   ├── Login.js
    │   │   ├── Dashboard.js
    │   │   ├── Patients.js
    │   │   ├── Chairs.js
    │   │   └── Inventory.js
    │   └── services/
    │       ├── api.js           # Instancia Axios + interceptores JWT
    │       ├── authService.js
    │       ├── patientService.js
    │       ├── chairService.js
    │       └── inventoryService.js
    └── package.json
```

---

## Base de Datos

- **Motor:** SQLite3, archivo en `database.sqlite` (raíz del repo, git-ignorado)
- **ORM:** Sequelize
- **Config:** `backend/src/config/database.js`
- **Init/Seed:** `node backend/init-db.js`

### Modelos y Relaciones

```
Patient (1:N) → ChairSession
Chair   (1:N) → ChairSession
ChairSession (1:N) → SessionMedication
Medication   (1:N) → SessionMedication
Patient (1:N) → Visit
```

---

## API REST (Backend — puerto 3001)

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Login, retorna JWT |

**Usuarios de prueba hardcodeados en `app.js`:**
- `admin` / `admin123` → rol `admin`
- `doctor` / `doctor123` → rol `doctor`

**JWT Secret:** `cdiem_secret_dev` (o variable de entorno)
**Token:** almacenado en `localStorage` en el frontend

### Pacientes
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/patients` | Listar (con paginación) |
| POST | `/api/patients` | Crear paciente |
| GET | `/api/patients/search` | Búsqueda/autocomplete |
| POST | `/api/patients/:id/schedule-visit` | Agendar visita |
| GET | `/api/patients/upcoming-visits` | Visitas próximas |

### Sillas
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/chairs` | Listar sillas |
| POST | `/api/chairs` | Crear silla |
| POST | `/api/chairs/:id/assign` | Asignar paciente |
| POST | `/api/chairs/:id/medications` | Administrar medicamento |
| GET | `/api/chairs/:id/medications` | Ver medicamentos de sesión |
| POST | `/api/chairs/:id/release` | Liberar paciente |

### Inventario
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/inventory` | Listar medicamentos |
| POST | `/api/inventory` | Agregar medicamento |

### Utilidades
- `GET /health` — Health check
- `GET /` — Info del servidor

---

## Scripts Disponibles

### Backend
```bash
npm start        # Producción: node src/app.js
npm run dev      # Desarrollo con nodemon
npm run init-db  # Inicializar BD con datos de prueba
```

### Frontend
```bash
npm start        # Dev server en puerto 3000
npm run build    # Build de producción
npm test         # Tests en modo watch
```

---

## Middleware y Seguridad

- **auth.js** — Verifica JWT en cada request protegido
- **roles.js** — `allowRoles(...roles)` para control de acceso
- **errorHandler.js** — Captura errores globales
- **CORS** — Habilitado para `http://localhost:3000`
- **Validación RUT** — Implementada en `patientController.js`

---

## Frontend — Detalles Clave

- **Tema MUI** — Colores personalizados (healthcare/oncología)
- **Interceptores Axios** (`services/api.js`):
  - Inyección automática del JWT en headers
  - Redirect a `/login` en errores 401
- **PrivateRoute** — Protege rutas que requieren autenticación
- **Date pickers** — `@mui/x-date-pickers` + `date-fns`

---

## Git

- **Rama de desarrollo activa:** `claude/create-claude-md-Anb2b`
- **Repositorio remoto:** `fimartinflo/cdiemapp`
- **Archivos git-ignorados relevantes:** `node_modules/`, `database.sqlite`, `.env`, `*.log`

---

## Estado Actual y Próximos Pasos

### Completado
- Estructura monorepo backend/frontend
- Modelos Sequelize con relaciones
- CRUD de pacientes, sillas, inventario
- Autenticación JWT con roles
- UI con MUI, rutas protegidas

### Pendiente / En desarrollo
- Completar migración de inventario a SQLite
- Integración completa frontend-backend
- Sistema avanzado de roles y permisos
- Historia clínica del paciente
- Reportes de uso y consumo
- Tests backend (infraestructura no configurada aún)
- Migración futura a base de datos online (PostgreSQL/MySQL)

---

*Última actualización: 2026-03-24*
