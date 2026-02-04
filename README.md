# CDIEMApp

Sistema de gestión clínica para un centro oncológico, enfocado en la administración de pacientes, sillones de atención y medicamentos, con funcionamiento **offline** y persistencia local mediante **SQLite**. Se tiene pensado para update a BD online profesional

---

## Características principales

- Gestión de pacientes
- Gestión de sillones de atención
- Asignación de pacientes a sillones
- Registro de sesiones clínicas
- Administración de medicamentos por sesión
- Control de inventario
- Persistencia local con SQLite
- Backend desarrollado en Node.js + Express
- ORM Sequelize

---

## Tecnologías utilizadas

### Backend
- Node.js
- Express
- Sequelize
- SQLite
- Nodemon (desarrollo)

### Frontend
- Pendiente (HTML / CSS / JavaScript o React)

---

## Estructura del proyecto

CDIEMApp/
├── backend/
│ ├── src/
│ │ ├── app.js # Servidor Express
│ │ ├── models/ # Modelos Sequelize
│ │ └── routes/ # (opcional, futuro)
│ ├── init-db.js # Inicializador de base de datos
│ ├── package.json
│ └── database.sqlite # Base de datos local (NO se versiona)
├── frontend/ # Pendiente
├── .gitignore
└── README.md



---

## Requisitos previos

- Node.js v18 o superior
- npm

---

## ▶Instalación y ejecución

### 1) Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/CDIEMApp.git
cd CDIEMApp/backend

2) Instalar dependencias
npm install

3) Instalar dependencias
npm run init-db

Esto crea:

    a) sillones

    b) medicamentos

4) Levanta Servidor
npm run dev
    a) Disponible en local: http://localhost:3001



Flujo de pruebas (Postman)

Orden correcto para pruebas manuales

Crear paciente
POST /api/patients

Ver sillones
GET /api/chairs

Asignar paciente a sillón
POST /api/chairs/:id/assign

Administrar medicamento
POST /api/chairs/:id/medications

Ver medicamentos del sillón
GET /api/chairs/:id/medications

Liberar sillón
POST /api/chairs/:id/release



Consideraciones importantes

    a) Después de ejecutar init-db, los pacientes deben crearse nuevamente

    b) Los medicamentos solo pueden administrarse si existe una sesión activa

    c) Un sillón no puede ser usado por más de un paciente a la vez

    d) El proyecto está en fase de desarrollo



Próximos pasos

 Migrar inventario completamente a SQLite

 Conectar frontend

 Autenticación con JWT

 Roles y permisos

 Historial clínico por paciente

 Reportes de uso y consumo


Autor

Proyecto desarrollado por Felipe Martínez Flores
Enfocado en soluciones clínicas offline escalables.