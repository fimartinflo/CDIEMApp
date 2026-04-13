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

- Gestión completa de pacientes (CRUD + búsqueda debounced + exportación CSV + campos clínicos)
- Gestión de sillones de atención con estado en tiempo real (polling cada 30s)
- Asignación de pacientes a sillones y registro de sesiones clínicas
- Notas clínicas al liberar sillón + resumen de sesión imprimible con medicamentos y costos
- Administración de medicamentos por sesión (con descuento de stock automático + alertas de stock crítico)
- Control de inventario con alertas de stock bajo, vencimiento, categorías farmacológicas e indicador de último uso
- Programación de visitas con calendario visual, edición y cancelación
- Búsqueda global en barra superior (pacientes + medicamentos simultáneamente)
- Dashboard con métricas del sistema en tiempo real (tarjetas con degradado de color por categoría)
- Módulo de Reportes con costos por sesión, exportación Excel y envío por email
- Gestión de usuarios (solo admin): crear, editar, activar/desactivar, reset de contraseña
- Log de auditoría con filtros y paginación (admin)
- Autenticación JWT con roles diferenciados (admin / enfermera / administracion)
- Login sin credenciales visibles en pantalla (documentadas solo en este README)
- Rate limiting en login: 10 intentos / 15 min por IP
- Backup automático de SQLite al iniciar el servidor (rotación a 7 copias)
- Compresión gzip en todas las respuestas del backend
- Persistencia local con SQLite (sin conexión a internet requerida)
- Soporte multi-BD: SQLite (local) / PostgreSQL via Supabase / Turso libSQL (edge)

---

## Estructura del Proyecto

```
CDIEMApp/
├── CLAUDE.md                    # Contexto del proyecto para el asistente IA
├── README.md
├── .gitignore
├── nginx.conf.example           # Plantilla Nginx para producción
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
│   ├── ecosystem.config.js      # Configuración PM2 para producción
│   ├── .env.example             # Template de variables de entorno
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── App.js
    │   ├── components/          # Layout, PatientForm, PatientSearch, PrivateRoute
    │   ├── pages/               # Login, Dashboard, Patients, Chairs, Inventory, Reports, Users
    │   └── services/            # api.js (Axios), authService, patientService, etc.
    ├── .env.example             # Template de variables de entorno
    └── package.json
```

---

## Credenciales de Acceso

| Usuario | Contraseña | Rol | Acceso |
|---------|-----------|-----|--------|
| `admin` | `admin123` | Administrador | Acceso completo a todos los módulos |
| `enfermera` | `enfermera123` | Enfermera | Pacientes, Sillones, Inventario (solo lectura) |
| `administracion` | `admin2024` | Administración | Inventario (lectura + escritura) + Reportes |

> Si las credenciales dejan de funcionar (ej. BD corrompida), ejecutar:
> ```bash
> node backend/reset-passwords.js
> ```

---

## Ejecución Local (Desarrollo)

No requiere ningún archivo `.env` — todos los valores tienen fallback automático a `localhost`.

### 1. Clonar el repositorio

```bash
git clone https://github.com/fimartinflo/CDIEMApp.git
cd CDIEMApp
```

### 2. Instalar dependencias del backend e inicializar la BD

```bash
cd backend
npm install
npm run init-db
```

`init-db` crea las tablas y los datos iniciales:
- 3 usuarios: admin, enfermera, administracion
- 4 sillones (S1–S4, uno en mantenimiento)
- 3 medicamentos de ejemplo con precios en CLP

### 3. Levantar el backend

```bash
npm run dev       # Desarrollo con nodemon (auto-restart al guardar)
# o
npm start         # Sin auto-restart
```

El servidor queda disponible en `http://localhost:3001`.

### 4. Instalar dependencias del frontend y levantarlo

En una segunda terminal:

```bash
cd frontend
npm install
npm start
```

La aplicación queda disponible en `http://localhost:3000`.

### 5. Verificar que funciona

Abrir `http://localhost:3000` e iniciar sesión con `admin` / `admin123`.

---

## Deploy a Producción

### Arquitectura objetivo

```
Internet → Dominio (DNS apunta al VPS)
         → VPS Ubuntu 22.04
           ├── Nginx (puerto 80 → redirect HTTPS, puerto 443 con SSL)
           │   ├── /        → sirve /var/www/cdiem/frontend/build (estático)
           │   └── /api     → proxy a http://localhost:3001
           └── PM2 → Node.js backend en puerto 3001
                    └── SQLite en /var/www/cdiem/backend/database.sqlite
```

### Prerrequisitos

- VPS con Ubuntu 22.04 LTS (mínimo 1 vCPU, 1GB RAM)
  - Opciones económicas: Hetzner Cloud CX22 (~€4/mes), DigitalOcean (~$6/mes)
- Un dominio con un registro A apuntando a la IP del VPS
- Acceso SSH al servidor

---

### Paso 1 — Preparar el servidor

```bash
# Conectar al VPS
ssh root@IP_DEL_VPS

# Actualizar el sistema
apt update && apt upgrade -y

# Instalar Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Instalar Nginx
apt install -y nginx

# Instalar PM2 (gestor de procesos para Node.js)
npm install -g pm2

# Instalar Certbot (certificados SSL gratuitos de Let's Encrypt)
apt install -y certbot python3-certbot-nginx

# Crear directorio de logs para el backend
mkdir -p /var/log/cdiem
```

### Paso 2 — Subir el código

```bash
# Desde el servidor, clonar el repositorio
git clone https://github.com/fimartinflo/CDIEMApp.git /var/www/cdiem
cd /var/www/cdiem
```

> Alternativa: copiar desde tu máquina con `scp -r ./CDIEMApp root@IP_DEL_VPS:/var/www/cdiem`

### Paso 3 — Configurar variables de entorno del backend

```bash
cd /var/www/cdiem/backend
cp .env.example .env
nano .env
```

Editar con los valores reales:

```env
PORT=3001
JWT_SECRET=pon_aqui_un_secret_muy_largo_y_aleatorio_minimo_32_caracteres
CORS_ORIGIN=https://tu-dominio.cl
NODE_ENV=production

# Opcional: configurar para envío de reportes por email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-correo@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx
SMTP_FROM=noreply@tu-dominio.cl
```

> **JWT_SECRET**: genera uno seguro con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### Paso 4 — Instalar dependencias e inicializar la BD del backend

```bash
npm install
node init-db.js
# Debe mostrar: "Base de datos inicializada correctamente"
```

### Paso 5 — Configurar variables de entorno del frontend

```bash
cd /var/www/cdiem/frontend
cp .env.example .env.production
nano .env.production
```

Contenido:

```env
REACT_APP_API_URL=https://tu-dominio.cl/api
```

### Paso 6 — Compilar el frontend

```bash
npm install
npm run build
# El build queda en /var/www/cdiem/frontend/build/
```

### Paso 7 — Configurar Nginx

```bash
# Copiar la plantilla incluida en el repositorio
cp /var/www/cdiem/nginx.conf.example /etc/nginx/sites-available/cdiem

# Editar y reemplazar "tu-dominio.cl" por tu dominio real
nano /etc/nginx/sites-available/cdiem

# Activar el sitio
ln -s /etc/nginx/sites-available/cdiem /etc/nginx/sites-enabled/

# Verificar configuración y recargar
nginx -t && systemctl reload nginx
```

### Paso 8 — Obtener certificado SSL (HTTPS gratuito)

```bash
certbot --nginx -d tu-dominio.cl -d www.tu-dominio.cl
# Certbot modifica la configuración de Nginx automáticamente
# El certificado se renueva solo cada 90 días
```

### Paso 9 — Levantar el backend con PM2

```bash
cd /var/www/cdiem/backend

# Iniciar el proceso
pm2 start ecosystem.config.js --env production

# Guardar configuración para que persista tras reinicios del servidor
pm2 save

# Registrar PM2 como servicio del sistema (ejecutar el comando que indique la salida)
pm2 startup
```

### Paso 10 — Verificar que todo funciona

```bash
# Health check del backend
curl https://tu-dominio.cl/health
# Debe responder: {"status":"healthy",...}

# Ver estado de los procesos PM2
pm2 status

# Ver logs en tiempo real
pm2 logs cdiem-backend
```

Luego abrir `https://tu-dominio.cl` en el navegador y hacer login con `admin` / `admin123`.

### Paso 11 — Configurar backups automáticos de la BD (recomendado)

```bash
# Crear directorio de backups
mkdir -p /var/backups/cdiem

# Programar backup diario a las 2am
crontab -e
# Agregar esta línea:
0 2 * * * cp /var/www/cdiem/backend/database.sqlite /var/backups/cdiem/db-$(date +\%Y\%m\%d).sqlite
```

---

### Actualizar la aplicación en producción

Cuando haya cambios en el repositorio:

```bash
cd /var/www/cdiem

# Traer los cambios
git pull

# Si hay cambios en el backend
cd backend && npm install

# Si hay cambios en el frontend, recompilar
cd ../frontend && npm install && npm run build

# Reiniciar el backend
pm2 restart cdiem-backend
```

---

## API REST (puerto 3001)

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Login → retorna JWT *(rate limit: 10 req/15 min)* |
| GET | `/api/auth/profile` | Perfil del usuario autenticado |
| PUT | `/api/auth/change-password` | Cambiar contraseña |

### Gestión de Usuarios *(admin only)*
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/auth/users` | Listar todos los usuarios |
| POST | `/api/auth/users` | Crear usuario |
| PUT | `/api/auth/users/:id` | Actualizar nombre/email/rol |
| PUT | `/api/auth/users/:id/toggle-active` | Activar / desactivar |
| PUT | `/api/auth/users/:id/reset-password` | Resetear contraseña |

### Pacientes *(admin + enfermera)*
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/patients` | Listar con paginación |
| POST | `/api/patients` | Crear paciente |
| GET | `/api/patients/:id` | Obtener por ID |
| PUT | `/api/patients/:id` | Actualizar |
| DELETE | `/api/patients/:id` | Desactivar (borrado lógico) |
| GET | `/api/patients/search` | Búsqueda por nombre/RUT/pasaporte |
| GET | `/api/patients/export` | Exportar CSV (BOM, compatible Excel) |
| GET | `/api/patients/:id/history` | Historial de sesiones clínicas |
| POST | `/api/patients/:id/schedule-visit` | Agendar visita |
| GET | `/api/patients/upcoming-visits` | Próximas visitas programadas |
| PUT | `/api/patients/:id/visits/:visitId` | Editar visita |
| DELETE | `/api/patients/:id/visits/:visitId` | Cancelar visita (borrado lógico) |

### Sillones *(admin + enfermera)*
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/chairs` | Listar con estado de sesión activa |
| POST | `/api/chairs/:id/assign` | Asignar paciente (crea sesión) |
| POST | `/api/chairs/:id/release` | Liberar sillón (cierra sesión) |
| POST | `/api/chairs/:id/medications` | Administrar medicamento |
| GET | `/api/chairs/live` | Estado en vivo de todos los sillones |
| GET | `/api/chairs/:id/history` | Historial de sesiones *(paginado: ?page=&limit=)* |

### Inventario
| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | `/api/inventory` | admin + enfermera + administracion | Listar medicamentos |
| GET | `/api/inventory/alerts` | admin + enfermera + administracion | Stock crítico y próximos a vencer |
| POST | `/api/inventory` | admin + administracion | Crear medicamento |
| PUT | `/api/inventory/:id/quantity` | admin + administracion | Actualizar stock |
| PUT | `/api/inventory/:id` | admin + administracion | Editar medicamento |
| DELETE | `/api/inventory/:id` | admin + administracion | Eliminar (borrado lógico) |

### Reportes *(admin + administracion)*
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/reports` | Reporte por período (startDate, endDate) |
| GET | `/api/reports/patient/:id` | Informe individual de paciente |
| POST | `/api/reports/email` | Enviar reporte por email |

### Auditoría *(admin only)*
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/audit` | Log de auditoría con filtros y paginación |

### Utilidades
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/dashboard` | Métricas del sistema |
| GET | `/api/search?q=` | Búsqueda global (pacientes + medicamentos) |
| GET | `/health` | Health check (DB status, uptime, dialect, Node version) |

---

## Flujo Clínico Principal

```
1. Login → JWT almacenado en localStorage, menú según rol
2. Dashboard → métricas del sistema en tiempo real
3. Pacientes → CRUD + búsqueda debounced + visitas (calendario/lista) + campos clínicos
4. Inventario → medicamentos con categoría, stock, alertas, último uso
5. Sillones (actualización automática cada 30s):
   a. Sillón disponible → "Asignar Paciente" → selector de pacientes activos
      (opcional: agregar medicamentos al momento de asignar)
   b. Sesión activa → "+ Medicamento" → selector del inventario (descuenta stock)
      (alerta naranja si stock queda en nivel crítico)
   c. "Liberar Sillón" → notas clínicas → resumen imprimible con medicamentos/costos
6. Reportes → seleccionar período → ver costos por paciente/medicamento
   → exportar Excel (CSV) o enviar por email
7. Búsqueda global → barra en AppBar busca pacientes y medicamentos simultáneamente
```

---

## Scripts Disponibles

### Backend
```bash
npm start              # Producción (node src/app.js)
npm run dev            # Desarrollo con nodemon (auto-restart)
npm run init-db        # Inicializar BD con migraciones + datos de prueba
npm run init-db:force  # Reset completo (solo desarrollo)
npm run migrate        # Aplicar migraciones pendientes
npm run migrate:status # Ver estado de migraciones
node test-api.js       # Suite de 93 tests de integración (requiere BD limpia)
```

### Frontend
```bash
npm start              # Dev server en puerto 3000
npm run build          # Build de producción (output: build/)
```

---

## Solución de Problemas

| Problema | Solución |
|---------|---------|
| No puedo hacer login | Ejecutar `node backend/reset-passwords.js` |
| Backend no inicia | Verificar con `pm2 logs cdiem-backend` o `node backend/src/app.js` |
| Frontend no conecta con backend | Verificar que `REACT_APP_API_URL` apunta al backend correcto |
| Nginx muestra 502 Bad Gateway | El backend no está corriendo — ejecutar `pm2 start` |
| Certificado SSL vencido | Ejecutar `certbot renew` (normalmente es automático) |

---

## Implementado

- Roles diferenciados: admin, enfermera, administracion
- Menú filtrado por rol — cada usuario ve solo sus módulos
- Rutas protegidas por rol en frontend y backend
- Gestión de usuarios (admin): crear, editar, activar/desactivar, reset contraseña
- Rate limiting en login: 10 intentos / 15 min por IP
- Aviso de sesión expirada (Snackbar en Login.js)
- Exportación CSV de pacientes (BOM UTF-8, compatible Excel español)
- Health check mejorado: DB status, dialect, uptime, Node version
- Compresión gzip en todas las respuestas
- Historial de sillón paginado (?page=&limit=)
- Selector de medicamentos del inventario al asignar sillón
- Polling en tiempo real para estado de sillones (cada 30s)
- Variables de entorno para API_URL y CORS
- Módulo de Reportes con costos, exportación Excel y envío por email
- Log de auditoría con filtros y paginación (admin only)
- Tests E2E con Playwright (login, dashboard, chairs)
- Suite de 93 tests de integración backend + 49 tests frontend
- Migraciones Sequelize con umzug (10 migraciones)
- Soporte multi-BD: SQLite (local) / PostgreSQL via Supabase / Turso libSQL (edge)
- Campos clínicos en paciente: diagnóstico, protocolo de tratamiento, alergias
- Notas clínicas al liberar sillón + resumen de sesión imprimible
- Gestión completa de visitas: agendar, editar, cancelar + vista calendario
- Categoría de medicamentos (quimioterapia, premedicación, antieméticos, soporte, general)
- Indicador "Último uso" en inventario
- Alertas de stock crítico al administrar medicamentos en sillones
- Backup automático de SQLite al iniciar (rotación a 7 copias)
- Búsqueda global en barra superior (pacientes + medicamentos)
- Dashboard con tarjetas de métricas en degradado de color (azul/verde/naranja/teal)
- Login limpio — sin credenciales visibles en pantalla

## Pendiente / Próximos Pasos

- Dashboard con gráficos (recharts: AreaChart sesiones por día + BarChart top medicamentos)
- Exportación PDF nativa (jsPDF + html2canvas para Reports.js)
- 2FA/TOTP para rol admin (Google Authenticator)
