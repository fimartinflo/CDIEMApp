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
│   │   │   ├── Inventory.js     # Modelo legacy, actualmente no usado
│   │   │   ├── index.js         # Importa todos los modelos + define asociaciones
│   │   │   └── associations.js  # Obsoleto (asociaciones unificadas en index.js)
│   │   ├── controllers/
│   │   │   ├── patientController.js
│   │   │   ├── chairController.js   # Solo CRUD (no sesiones)
│   │   │   ├── authController.js
│   │   │   └── inventoryController.js  # Usa modelo Medication
│   │   ├── routes/
│   │   │   ├── patientRoutes.js
│   │   │   ├── chairRoutes.js       # Solo CRUD (POST/, PUT/:id, DELETE/:id, POST/:id/reset)
│   │   │   ├── inventoryRoutes.js
│   │   │   └── authRoutes.js
│   │   ├── middleware/
│   │   │   ├── auth.js          # Verificación JWT (default + named export)
│   │   │   ├── roles.js         # Control de acceso por rol
│   │   │   └── errorHandler.js  # Manejo centralizado de errores
│   │   └── utils/
│   │       └── response.js      # success(res, message, data, status) / error(res, message, code, status)
│   ├── init-db.js               # Script de inicialización y seed (incluye usuarios)
│   ├── test-api.js              # Suite de 67 tests de integración
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── App.js               # Componente raíz con rutas
    │   ├── index.js             # Entry point React
    │   ├── components/
    │   │   ├── Layout.js        # Wrapper principal de layout
    │   │   ├── PatientForm.js   # Formulario de pacientes (campo estado en modo edición)
    │   │   ├── PatientSearch.js # Búsqueda de pacientes
    │   │   └── PrivateRoute.js  # Protección de rutas
    │   ├── pages/
    │   │   ├── Login.js
    │   │   ├── Dashboard.js     # Métricas reales del backend
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
- **Config:** `backend/src/config/database.js` — exporta instancia directamente (`module.exports = sequelize`)
- **Init/Seed:** `node backend/init-db.js`

### Modelos y Relaciones

```
Patient     (1:N) → ChairSession   (FK: patientId)
Chair       (1:N) → ChairSession   (FK: chairId)
ChairSession (1:N) → SessionMedication (FK: sessionId)
Medication  (1:N) → SessionMedication (FK: medicationId)
Patient     (1:N) → Visit          (FK: pacienteId, as: 'visitas')
Chair       (1:N) → Visit          (FK: chairId, as: 'visitasSillon')
```

**IMPORTANTE:** `database.js` exporta `module.exports = sequelize` (sin objeto).
Al importar en modelos: `const sequelize = require('../config/database')` (NO `const { sequelize } = ...`).

---

## Arquitectura del Backend

### Patrón de rutas dual (sillones)

Las rutas de sillones usan un patrón mixto intencional:

- **`chairRoutes.js`** → solo CRUD básico: `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:id/reset`
- **`app.js` inline** → operaciones de sesión clínica: `GET /`, `POST /:id/assign`, `POST /:id/release`, `POST /:id/medications`, `GET /:id/medications`, `GET /live`, `GET /:id/history`

Las operaciones de sesión requieren transacciones complejas con múltiples modelos (Chair + ChairSession + Patient + Medication + SessionMedication), por lo que se mantienen inline en app.js.

Las demás rutas (`patientRoutes`, `inventoryRoutes`, `authRoutes`) usan el patrón controller estándar.

### `response.js` — Firma de funciones

```js
success(res, message, data = null, status = 200)
error(res, message, code, status = 400)
```

**CRÍTICO:** El segundo argumento de `success()` es el mensaje (string), NO los datos.
Correcto: `success(res, 'Operación exitosa', { ... })`
Incorrecto: `success(res, { ... }, 'Mensaje')` ← esto manda datos en campo `message`

### Auth middleware

`auth.js` exporta la función de dos formas para compatibilidad:
```js
module.exports = authMiddleware;               // const auth = require('./middleware/auth')
module.exports.authMiddleware = authMiddleware; // const { authMiddleware } = require('./middleware/auth')
```

---

## API REST (Backend — puerto 3001)

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Login → retorna JWT |
| POST | `/api/auth/register` | Registrar usuario |
| GET | `/api/auth/profile` | Perfil del usuario autenticado |
| PUT | `/api/auth/change-password` | Cambiar contraseña |

**Usuarios (seed en init-db.js, contraseñas hasheadas con bcrypt):**
- `admin` / `admin123` → rol `admin` (acceso completo)
- `enfermera` / `enfermera123` → rol `enfermera` (pacientes + sillones + inventario lectura)
- `administracion` / `admin2024` → rol `administracion` (inventario + reportes)

**JWT Secret:** `process.env.JWT_SECRET || 'cdiem_secret_dev'`
**Expiración:** 8 horas
**Token:** almacenado en `localStorage['token']`

### Pacientes
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/patients` | Listar (params: page, limit, estado) |
| POST | `/api/patients` | Crear paciente |
| GET | `/api/patients/:id` | Obtener por ID (incluye visitas) |
| PUT | `/api/patients/:id` | Actualizar paciente |
| DELETE | `/api/patients/:id` | Desactivar (borrado lógico → estado: inactivo) |
| GET | `/api/patients/search` | Búsqueda por nombre/RUT/pasaporte |
| POST | `/api/patients/:id/schedule-visit` | Agendar visita |
| GET | `/api/patients/upcoming-visits` | Próximas visitas programadas |
| GET | `/api/patients/:id/history` | Historial de sesiones clínicas |

**Respuesta paginada:** `{ success, data: [], pagination: { total, page, pages, limit } }`

### Sillones
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/chairs` | Listar con estado de sesión activa |
| POST | `/api/chairs` | Crear sillón (admin + enfermera) |
| PUT | `/api/chairs/:id` | Actualizar sillón (admin + enfermera) |
| DELETE | `/api/chairs/:id` | Desactivar sillón — borrado lógico (admin + enfermera) |
| POST | `/api/chairs/:id/reset` | Resetear a disponible (admin + enfermera) |
| POST | `/api/chairs/:id/assign` | Asignar paciente (crea ChairSession activa) |
| POST | `/api/chairs/:id/release` | Liberar sillón (cierra sesión) |
| POST | `/api/chairs/:id/medications` | Administrar medicamento (descuenta stock) |
| GET | `/api/chairs/:id/medications` | Medicamentos administrados en sesión activa |
| GET | `/api/chairs/live` | Estado en vivo de todos los sillones |
| GET | `/api/chairs/:id/history` | Historial de sesiones del sillón |

**Formato de respuesta `GET /api/chairs`:**
```json
{
  "id": 1, "numero": "S1", "nombre": "Sillón 1", "ubicacion": "Sala A",
  "estado": "ocupado", "activo": true,
  "pacienteActual": "Juan Pérez o null",
  "pacienteActualId": 5,
  "horaInicio": "2026-03-24T10:30:00.000Z",
  "sessionId": 12
}
```

**Estados de sillón:** `disponible` | `ocupado` | `mantenimiento`
**Estados de ChairSession:** `activa` | `finalizada`

### Inventario
| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | `/api/inventory` | admin + enfermera + administracion | Listar medicamentos |
| GET | `/api/inventory/alerts` | admin + enfermera + administracion | Stock crítico y por vencer |
| GET | `/api/inventory/:id` | admin + enfermera + administracion | Obtener por ID |
| POST | `/api/inventory` | admin + administracion | Crear medicamento |
| PUT | `/api/inventory/:id/quantity` | admin + administracion | Actualizar stock |
| PUT | `/api/inventory/:id` | admin + administracion | Actualizar medicamento |
| DELETE | `/api/inventory/:id` | admin + administracion | Eliminar (borrado lógico) |

**NOTA:** El endpoint `/api/inventory` usa el modelo `Medication` (no `Inventory`).
El mismo modelo `Medication` se usa en `SessionMedication` para el flujo de sillones.

### Utilidades
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/dashboard` | Métricas: pacientes, sillones, sesiones activas, medicamentos críticos |
| GET | `/health` | Health check |
| GET | `/` | Info del servidor |

---

## Scripts Disponibles

### Backend
```bash
npm start        # Producción: node src/app.js
npm run dev      # Desarrollo con nodemon (auto-restart)
npm run init-db  # Inicializar BD con datos de prueba
node test-full.mjs  # 63 tests de integración (requiere BD limpia + servidor en :3001)
```

### Frontend
```bash
npm install      # Instalar dependencias
npm start        # Dev server en puerto 3000
npm run build    # Build de producción
```

---

## Middleware y Seguridad

- **auth.js** — Verifica JWT en cada request protegido
- **roles.js** — `allowRoles(...roles)` para control de acceso por rol
- **errorHandler.js** — Captura errores globales, registrado al final de app.js
- **CORS** — `process.env.CORS_ORIGIN || 'http://localhost:3000'`
- **Validación RUT** — Algoritmo módulo-11 chileno implementado en:
  - Backend: función standalone `validateRUT()` en `patientController.js`
  - Frontend: `patientService.validateRUT()` y `patientService.formatRUT()`

---

## Frontend — Detalles Clave

### Servicios
- **`api.js`** — Axios con baseURL dinámica: `process.env.REACT_APP_API_URL || 'http://localhost:3001/api'`
  - Inyecta token JWT automáticamente: `Authorization: Bearer <token>`
  - Redirige a `/login` en errores 401, **excepto** si el request es a `/auth/login`
    (evita loop de recarga cuando las credenciales son incorrectas)
- **`patientService.js`** — CRUD + `validateRUT()` + `formatRUT()` locales
- **`chairService.js`** — CRUD + `assignPatient(id, patientId, medicamentos)` + `releaseChair(id)`
- **`inventoryService.js`** — CRUD completo + `updateQuantity(id, cantidad, tipo, motivo)`

### Páginas
- **`Dashboard.js`** — Consume `GET /api/dashboard`, filtra tarjetas de acceso rápido según rol del usuario
- **`Patients.js`** — Búsqueda debounced (500ms) por nombre/RUT/pasaporte, paginación, filtro por estado, historial clínico con duración en HH:MM:SS
- **`Chairs.js`** — Cards por sillón, asignación de paciente activo, chip `en_tratamiento`, duración HH:MM:SS en vivo, CRUD separado de botones clínicos
- **`Inventory.js`** — Tabla con indicadores visuales: ⚠️ stock bajo, chip "Vencido"/"Por vencer"; botones de escritura visibles solo para `admin` y `administracion`
- **`Reports.js`** — Selección de período, tabla expandible por paciente, exportación Excel (CSV con BOM para Excel español), diálogo de informe individual con impresión funcional

### Componentes
- **`PatientForm.js`** — Formulario reutilizable (crear/editar)
  - En modo creación: `estado: 'activo'` por defecto
  - En modo edición: selector de estado deshabilitado cuando `estado === 'en_tratamiento'` (el estado lo gestiona el flujo clínico)
  - Validación RUT en tiempo real con feedback visual
- **`PrivateRoute.js`** — Protege rutas que requieren autenticación

### Tema MUI
- Colores healthcare/oncología: azul `#1976d2`, verde `#2e7d32`, naranja `#ed6c02`

---

## Git

- **Rama de desarrollo activa:** `claude/create-claude-md-Anb2b`
- **Repositorio remoto:** `fimartinflo/cdiemapp`
- **Archivos git-ignorados relevantes:** `node_modules/`, `database.sqlite`, `.env`, `*.log`

---

## Estado Actual

### Completado

- ✅ Arquitectura backend completa: modelos, controladores, rutas, middleware
- ✅ Auth JWT con bcrypt; 3 roles: `admin`, `enfermera`, `administracion`
- ✅ Control de acceso por rol en backend (`allowRoles`) y frontend (botones/rutas condicionales)
- ✅ **Permisos de inventario:** enfermera (lectura), administracion (lectura + escritura), admin (todo)
- ✅ **Permisos de sillones CRUD:** admin + enfermera (la operación clínica también)
- ✅ Dashboard filtra tarjetas de acceso rápido según rol
- ✅ PatientForm: selector de estado deshabilitado cuando `en_tratamiento`
- ✅ Chairs: botones clínicos y CRUD separados visualmente; duración en HH:MM:SS; chip `en_tratamiento`
- ✅ Duración de sesiones en HH:MM:SS en todos los módulos (backend devuelve `duracionSegundos`)
- ✅ Reports: exportación Excel, impresión funcional con `visibility` CSS (fix MUI Dialog portal)
- ✅ Polling de sillones cada 30s
- ✅ Variables de entorno para API_URL y CORS
- ✅ Scripts de producción: `ecosystem.config.js` (PM2), `nginx.conf.example`
- ✅ `reset-passwords.js`: recuperación de credenciales sin borrar datos
- ✅ Suite de 63 tests de integración — 63/63 pasando
- ✅ **32 tests frontend** (Jest + RTL): Login, Dashboard, Patients, Chairs, Inventory — 32/32 pasando
- ✅ **RUT edge case fix**: `createPatient`/`updatePatient` rechazan RUT vacío con `tipoIdentificacion='rut'`
- ✅ **Refresco silencioso de sillones**: `silentLoadChairs()` actualiza sin spinner tras acciones
- ✅ **MUI confirm dialogs**: `window.confirm()` reemplazado en Chairs.js e Inventory.js
- ✅ **PYTHON_BIN configurable**: `process.env.PYTHON_BIN || 'python3'` en reportController.js
- ✅ **Timeout proceso Python**: `PYTHON_TIMEOUT_MS` (default 60s), mata el proceso con `SIGTERM`

### Variables de Entorno (producción)

**Backend (`backend/.env`):**
```
PORT=3001
JWT_SECRET=<secret_seguro_min_32_chars>
CORS_ORIGIN=https://tu-dominio.cl
NODE_ENV=production

# Proceso Python para COP Excel (opcionales — defaults razonables)
# PYTHON_BIN=python3
# PYTHON_TIMEOUT_MS=60000
```

**Frontend (`frontend/.env.production`):**
```
REACT_APP_API_URL=https://tu-dominio.cl/api
```

### Pendiente
- Migraciones Sequelize en lugar de `sync()`
- Migración futura a base de datos online (PostgreSQL/MySQL)

---

## Flujo Clínico Principal

```
1. Login → JWT almacenado en localStorage
2. Dashboard → métricas del sistema en tiempo real
3. Pacientes → CRUD completo + búsqueda debounced + agendar visita
4. Inventario → gestión de medicamentos (stock, alertas de vencimiento)
5. Sillones:
   a. Sillón disponible → "Asignar Paciente" → crea ChairSession activa
      (paciente pasa a estado 'en_tratamiento')
   b. ChairSession activa → POST /chairs/:id/medications
      (descuenta stock del inventario, registra en SessionMedication)
   c. "Liberar Sillón" → cierra ChairSession (estado: finalizada)
      (paciente vuelve a 'activo', sillón vuelve a 'disponible')
6. Historial → GET /patients/:id/history o GET /chairs/:id/history
```

---

*Última actualización: 2026-03-30 — Tests frontend (32/32), fix RUT edge case, silent refresh sillones, MUI confirm dialogs, PYTHON_BIN/PYTHON_TIMEOUT_MS configurables*
