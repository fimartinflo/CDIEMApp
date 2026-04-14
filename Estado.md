# Estado del Proyecto — CDIEMApp

> Documento de referencia rápida. Se actualiza al final de cada sesión de trabajo.
> Para documentación completa ver `README.md`. Para contexto del asistente ver `CLAUDE.md`.

---

## Estado General

| Item | Estado |
|------|--------|
| Backend (API + BD) | Completo y operativo |
| Frontend (interfaz) | Completo y operativo |
| Tests de integración (backend) | 93/93 pasando |
| Tests de interfaz (frontend) | 49/49 pasando |
| Deploy local Windows | Listo (instalar.bat / iniciar.bat) |
| Listo para demo | SI |

*Ultima actualizacion: 2026-04-14*

---

## Instalacion en el computador del usuario

### Requisito previo

Instalar **Node.js 20 LTS** desde https://nodejs.org  
Marcar "Add to PATH" durante la instalacion. Reiniciar el equipo tras instalar.

### Primera vez

```
1. Copiar la carpeta CDIEMApp al equipo (pendrive, red local, etc.)
2. Doble clic en  instalar.bat
   - Instala dependencias del servidor
   - Instala dependencias de la interfaz
   - Compila la interfaz React (2-3 minutos)
   - Crea la base de datos con datos de prueba
3. Al ver "Instalacion completada" ya esta listo.
```

### Uso diario

```
1. Doble clic en  iniciar.bat
2. Abrir el navegador en  http://localhost:3001
3. Para cerrar: doble clic en  detener.bat  o cerrar la ventana del terminal
```

### Backup manual

```
Doble clic en  backup.bat
Guarda una copia de la base de datos en la carpeta  backups/
Se conservan las ultimas 7 copias automaticamente.
```

### Credenciales iniciales

| Usuario | Contrasena | Rol | Acceso |
|---------|-----------|-----|--------|
| admin | admin123 | Administrador | Todo el sistema |
| enfermera | enfermera123 | Enfermera | Pacientes, sillones, inventario (lectura) |
| administracion | admin2024 | Administracion | Inventario, reportes |

**Cambiar estas contrasenas antes de usar en produccion** (modulo Usuarios, solo admin).

---

## Modulos implementados

| Modulo | Roles con acceso | Estado |
|--------|-----------------|--------|
| Login | Todos | Completo |
| Dashboard | Todos | Completo |
| Pacientes | admin, enfermera | Completo |
| Sillones | admin, enfermera | Completo |
| Inventario | admin, enfermera (lectura), administracion | Completo |
| Reportes | admin, administracion | Completo (*) |
| Usuarios | admin | Completo |
| Auditoria | admin | Completo |
| Busqueda global | Todos | Completo |

(*) El boton "Exportar Excel" requiere Python + libreria `cop` instalados en el equipo.
    El boton "Enviar por Email" requiere configuracion SMTP en `backend/.env`.
    Ambos fallan con mensaje claro si no estan disponibles; el resto del modulo funciona.

---

## Funcionalidades destacadas por modulo

**Pacientes**
- CRUD completo con validacion de RUT chileno
- Busqueda en tiempo real por nombre, RUT o pasaporte
- Campos clinicos: diagnostico, protocolo de tratamiento, alergias
- Exportacion CSV compatible con Excel en espanol
- Historial de sesiones con duracion en HH:MM:SS
- Gestion de visitas con vista calendario y lista (editar / cancelar)

**Sillones**
- Estado en tiempo real (polling cada 30 segundos)
- Flujo clinico: asignar paciente → administrar medicamentos → liberar
- Contador de duracion de sesion en vivo (HH:MM:SS)
- Notas clinicas al liberar el sillon
- Resumen de sesion imprimible con medicamentos y costos
- Alerta visual cuando el stock de un medicamento queda en nivel critico

**Inventario**
- Alertas de stock bajo y medicamentos por vencer o vencidos
- Categorias farmacologicas con filtro
- Indicador de ultimo uso por medicamento
- Control de escritura por rol (lectura: enfermera; escritura: admin y administracion)

**Reportes**
- Seleccion de periodo, tabla expandible por paciente
- Exportacion Excel (CSV con BOM para Excel en espanol)
- Impresion funcional de informe individual
- Envio por email (requiere SMTP configurado)

**Seguridad**
- JWT con expiracion de 8 horas
- Rate limiting en login: 10 intentos por IP cada 15 minutos
- Control de acceso por rol en backend y frontend
- Notificacion de sesion expirada al volver al login
- Log de auditoria de todas las acciones relevantes

---

## Limitaciones conocidas

| Limitacion | Impacto | Solucion disponible |
|-----------|---------|-------------------|
| SQLite es de un solo usuario | No soporta multiples equipos accediendo a la vez | Migrar a Supabase/PostgreSQL (ya implementado en el codigo) |
| Sin HTTPS | Trafico sin cifrar | Agregar Nginx + certificado SSL |
| JWT secret por defecto | Riesgo de seguridad en produccion | Cambiar en `backend/.env` antes de ir a produccion |
| Backup manual | Riesgo de perdida de datos | Programar `backup.bat` con el Programador de Tareas de Windows |
| Reportes Excel requiere Python | Funcionalidad parcialmente limitada | Instalar Python 3 + `pip install cop` en el equipo servidor |
| Sin adjuntos de documentos | No se pueden subir PDFs ni imagenes de pacientes | Implementacion futura |
| Sin recordatorios automaticos | Las visitas no notifican al paciente | Implementacion futura |

---

## Pendiente — Proximas mejoras

### Alta prioridad

- [ ] **Cambiar credenciales por defecto** antes de entregar al cliente
- [ ] **Programar backup automatico** con el Programador de Tareas de Windows (ejecutar `backup.bat` diariamente)
- [ ] **Configurar JWT_SECRET** en `backend/.env` con un string seguro aleatorio

### Mejoras de producto (por orden de valor)

- [ ] **Dashboard con graficos** — `recharts`: sesiones por dia (ultimos 7) + medicamentos mas administrados
- [ ] **Exportacion PDF nativa** — reemplazar `window.print()` por `jsPDF` + `html2canvas`
- [ ] **Recordatorios de visita** — email/SMS automatico 24h antes de la visita (requiere SMTP o Twilio)
- [ ] **Adjuntos en paciente** — subir y ver PDFs de examenes, consentimientos, ordenes medicas
- [ ] **2FA para administrador** — TOTP (Google Authenticator) como segundo factor
- [ ] **Migracion a red local** — activar Supabase/PostgreSQL para que multiples equipos compartan datos

### Tecnico / infraestructura

- [ ] **HTTPS** — Nginx + certificado Let's Encrypt si el servidor es accesible desde fuera de la clinica
- [ ] **Integracion FONASA/ISAPRE** — validacion automatica de prevision del paciente
- [ ] **App movil** — PWA o React Native para uso desde tablet durante la ronda clinica

---

## Migracion local a la nube (cuando llegue el momento)

El codigo para el traspaso ya esta escrito. Solo se necesitan credenciales externas.

### Lo que el asistente necesita para ejecutarlo

| Que necesita | Quien lo provee |
|---|---|
| `DATABASE_URL` de Supabase o PostgreSQL | El usuario, desde el dashboard del proveedor |
| Confirmacion explicita antes de copiar datos reales | El usuario |
| Acceso al servidor con el SQLite activo | Ya disponible en este entorno |
| Codigo nuevo | Nada — ya esta todo escrito |

**Como obtener el DATABASE_URL en Supabase:**
Crear cuenta en supabase.com (plan gratuito disponible) → Project Settings → Database → Connection string → URI

### Pasos que ejecutara el asistente

```
1. Backup del SQLite antes de tocar nada
2. Verificar integridad: conteo de registros por tabla
3. Crear estructura en la nube:
      DB_DIALECT=postgres DATABASE_URL="..." node backend/init-db.js
4. Verificar que todas las migraciones se aplicaron
5. Copiar los datos:
      DATABASE_URL="..." node backend/scripts/sqlite-to-postgres.js
6. Verificar que los conteos coincidan entre SQLite y PostgreSQL
7. Actualizar backend/.env con las credenciales de produccion
8. Reiniciar el servidor apuntando a la nube
9. Smoke test: login, crear registro de prueba, verificar en dashboard de Supabase
```

### Consideraciones de seguridad de datos

- El SQLite original **no se borra** durante el traspaso — queda como respaldo
- El asistente pedira confirmacion explicita antes del paso 5 si hay datos clinicos reales
- Nunca usar `--force` en produccion ni en el SQLite con datos reales
- Hacer `backup.bat` justo antes de iniciar el proceso

### Por que los datos no se pierden al actualizar codigo

- Las migraciones son numeradas (001 al 010 actuales). Cada nueva funcion agrega un archivo nuevo (011, 012, etc.)
- `node init-db.js` sin `--force` es idempotente: solo aplica migraciones pendientes, nunca toca registros existentes
- Las columnas nuevas se agregan con valor por defecto (null o el definido), los registros existentes no se modifican
- El unico riesgo real es el error humano: usar `--force` en el momento equivocado

---

## Archivos clave del proyecto

```
CDIEMApp/
├── instalar.bat          — Instalacion inicial (ejecutar una sola vez)
├── iniciar.bat           — Iniciar el servidor
├── detener.bat           — Detener el servidor
├── backup.bat            — Copia de seguridad manual de la BD
├── Estado.md             — Este archivo
├── README.md             — Documentacion completa del sistema
├── backend/
│   ├── src/app.js        — Servidor Express (punto de entrada)
│   ├── init-db.js        — Inicializar / resetear la base de datos
│   ├── test-api.js       — Suite de 93 tests de integracion
│   └── database.sqlite   — Base de datos local (NO incluida en git)
└── frontend/
    ├── build/            — Interfaz compilada (generada por instalar.bat)
    └── src/              — Codigo fuente React
```

---

## Historial de sesiones

| Fecha | Cambios realizados |
|-------|--------------------|
| 2026-04-07 | Estructura inicial, modelos, auth JWT, CRUD pacientes/sillones/inventario |
| 2026-04-08 | Reportes, gestion de usuarios, auditoria, rate limiting, sesion expirada |
| 2026-04-09 | Campos clinicos (G1-G8), backup automatico, busqueda global, calendario visitas |
| 2026-04-10 | Resumen de sesion imprimible, alertas de stock en sillones, ultimo uso inventario |
| 2026-04-11 | Tests E2E Playwright, scripts Windows deploy, compresion gzip, health check mejorado |
| 2026-04-12 | Export CSV pacientes, paginacion historial chairs, dashboard rediseno (tarjetas degradado) |
| 2026-04-13 | Eliminacion de emojis del codigo, comentarios JSDoc en archivos clave, screenshots del sistema |
| 2026-04-14 | Este archivo creado |
