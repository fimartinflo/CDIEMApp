/**
 * @file app.js
 * @description Entry point del servidor Express para CDIEMApp.
 *
 * Este archivo cumple dos responsabilidades principales:
 *
 * 1. CONFIGURACIÓN DEL SERVIDOR
 *    - Registra todos los middlewares globales (compression, CORS, JSON, logger).
 *    - Monta los routers de dominio (/api/auth, /api/patients, /api/inventory, /api/chairs CRUD).
 *    - Registra el 404 genérico y el errorHandler centralizado al final.
 *    - Inicia el servidor HTTP en el puerto configurado.
 *
 * 2. ENDPOINTS DE SESIÓN CLÍNICA (inline, NO en chairRoutes)
 *    Las operaciones clínicas de sillón se definen aquí directamente porque
 *    requieren transacciones que cruzan múltiples modelos (Chair + ChairSession +
 *    Patient + Medication + SessionMedication). Centralizarlas en app.js evita
 *    inyectar múltiples modelos en un controller separado.
 *
 *    Endpoints inline de sillones:
 *      GET  /api/chairs                  — lista sillones con sesión activa embebida
 *      POST /api/chairs/:id/assign       — asigna paciente (crea ChairSession activa)
 *      POST /api/chairs/:id/release      — libera sillón (cierra sesión, restaura estados)
 *      POST /api/chairs/:id/medications  — administra medicamento (descuenta stock)
 *      GET  /api/chairs/:id/medications  — medicamentos de la sesión activa
 *      GET  /api/chairs/live             — estado en vivo de todos los sillones
 *      GET  /api/chairs/:id/history      — historial paginado de sesiones del sillón
 *
 *    Endpoints inline de pacientes:
 *      GET  /api/patients/:id/history    — historial clínico del paciente
 *
 *    Endpoints generales:
 *      GET  /api/dashboard               — métricas clínicas en tiempo real
 *      GET  /health                      — health check con estado de BD
 *      GET  /                            — información general de la API
 *
 * @module app
 */

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const { Op } = require('sequelize');
require('dotenv').config();

const app = express();

const { success, error } = require('./utils/response');
const errorHandler = require('./middleware/errorHandler');
const auth = require('./middleware/auth');
const allowRoles = require('./middleware/roles');

// Importar todos los modelos Sequelize con sus asociaciones ya definidas.
// sequelize: instancia de conexión para transacciones y consultas raw.
// Los demás son los modelos ORM usados en los endpoints inline de sesión clínica.
const {
  sequelize,
  Chair,
  Patient,
  ChairSession,
  Medication,
  SessionMedication
} = require('./models');

// === Importar rutas ===
const authRoutes    = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const chairRoutes   = require('./routes/chairRoutes');
const reportRoutes  = require('./routes/reportRoutes');
const auditRoutes   = require('./routes/auditRoutes');
const logAudit      = require('./utils/audit');
const { runBackup } = require('./utils/backup');

// === Conectar BD ===
// Se ejecuta una vez al iniciar el servidor. sequelize.sync() crea las tablas que
// no existan según los modelos definidos — no elimina datos existentes.
// Las migraciones formales (umzug) se aplican con `node init-db.js`.
(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('[OK] Conectado y sincronizado con SQLite correctamente');
  } catch (err) {
    console.error('[ERROR] Error conectando/sincronizando la BD:', err);
  }
})();

// === Middleware global ===
// compression() — gzip/deflate sobre las respuestas JSON; reduce ancho de banda en producción.
// Debe registrarse ANTES de CORS para que se aplique a todas las respuestas.
app.use(compression());
// CORS — permite peticiones del frontend (por defecto http://localhost:3000).
// Configurable vía CORS_ORIGIN en .env para producción.
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// express.json() — parsea el body de las peticiones con Content-Type: application/json.
app.use(express.json());

// Logger de peticiones — imprime método, ruta y hora local en cada request.
// Útil para depuración en desarrollo; en producción se puede reemplazar por morgan.
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.path}`);
  next();
});

// === Servir frontend compilado (modo local Windows sin internet) ===
// Si existe el build de React en frontend/build/, se sirve como archivos estáticos.
// Esto permite que un solo proceso Node atienda tanto la API como la UI.
const frontendBuild = path.join(__dirname, '../../frontend/build');
app.use(express.static(frontendBuild));

// === Rutas de información ===
// Ruta raíz — devuelve información básica de la API sin requerir autenticación.
// Útil para verificar que el servidor está en línea.
app.get('/', (req, res) => {
  res.json({
    message: 'API CDIEM - Centro Oncológico',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      auth: '/api/auth',
      patients: '/api/patients',
      chairs: '/api/chairs',
      inventory: '/api/inventory',
      dashboard: '/api/dashboard'
    }
  });
});

/**
 * GET /health
 * Health check del servidor — no requiere autenticación.
 *
 * Verifica la conectividad con la base de datos mediante sequelize.authenticate()
 * y devuelve información del entorno. Si la BD falla, el status devuelto es
 * 'degraded' (el servidor HTTP sigue respondiendo).
 *
 * Respuesta:
 *   { status, timestamp, uptime, version, node, database: { status, dialect } }
 */
app.get('/health', async (req, res) => {
  let dbStatus = 'ok';
  try {
    await sequelize.authenticate();
  } catch {
    dbStatus = 'error';
  }
  const dialect = process.env.DB_DIALECT || 'sqlite';
  res.json({
    status: dbStatus === 'ok' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || '1.0.0',
    node: process.version,
    database: { status: dbStatus, dialect }
  });
});

// ==================== MONTAR RUTAS ====================
// authRoutes maneja: POST /login, POST /register, GET /profile, PUT /change-password
// También incluye gestión de usuarios (CRUD de usuarios, toggle-active, reset-password) — solo admin.
app.use('/api/auth', authRoutes);

// patientRoutes maneja: GET /, POST /, GET /:id, PUT /:id, DELETE /:id, GET /search, GET /upcoming-visits, POST /:id/schedule-visit
// NOTA: GET /:id/history se define más abajo inline porque requiere ChairSession y Medication.
app.use('/api/patients', patientRoutes);

// inventoryRoutes maneja: GET /, POST /, GET /:id, PUT /:id, DELETE /:id, GET /alerts, PUT /:id/quantity
// Usa el modelo Medication (no el modelo legacy Inventory).
app.use('/api/inventory', inventoryRoutes);

// chairRoutes maneja solo CRUD básico: POST /, PUT /:id, DELETE /:id, POST /:id/reset
// Las operaciones de sesión clínica (assign, release, medications, live, history)
// se definen inline a continuación porque cruzan múltiples modelos con transacciones.
app.use('/api/chairs', chairRoutes);

// reportRoutes: GET /, GET /patient/:id, POST /email
// Genera informes clínicos en Excel/CSV mediante subproceso Python (cop library).
app.use('/api/reports', reportRoutes);

// auditRoutes: GET /api/audit (admin only)
app.use('/api/audit', auditRoutes);

// ==================== BÚSQUEDA GLOBAL ====================
/**
 * GET /api/search?q=texto
 * Busca simultáneamente en pacientes y medicamentos.
 * Devuelve hasta 5 resultados de cada tipo, agrupados.
 */
app.get('/api/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return success(res, 'Búsqueda', { pacientes: [], medicamentos: [] });
    }
    const trimmed = q.trim();
    const term = `%${trimmed}%`;
    // Normalizar RUT: quitar puntos y guión para buscar igual que searchPatients
    const cleanRUT = trimmed.replace(/\./g, '').replace('-', '');

    const [pacientes, medicamentos] = await Promise.all([
      Patient.findAll({
        where: {
          [Op.or]: [
            { nombreCompleto: { [Op.like]: term } },
            { rut: { [Op.like]: `%${cleanRUT}%` } },
            { pasaporte: { [Op.like]: term } }
          ]
        },
        attributes: ['id', 'nombreCompleto', 'rut', 'pasaporte', 'tipoIdentificacion', 'estado'],
        limit: 5,
        order: [['nombreCompleto', 'ASC']]
      }),
      Medication.findAll({
        where: {
          nombre: { [Op.like]: term },
          activo: true
        },
        attributes: ['id', 'nombre', 'cantidad', 'unidad', 'categoria'],
        limit: 5,
        order: [['nombre', 'ASC']]
      })
    ]);

    success(res, 'Búsqueda', { pacientes, medicamentos });
  } catch (err) {
    console.error('[ERROR] Error en busqueda global:', err);
    error(res, 'Error en búsqueda', 'SEARCH_ERROR', 500);
  }
});

// ==================== SILLONES: LISTADO CON ESTADO DE SESIÓN ====================
/**
 * GET /api/chairs
 * Devuelve todos los sillones activos, cada uno enriquecido con la información
 * de su sesión clínica activa (si existe).
 *
 * Usa un LEFT JOIN implícito (required: false) contra ChairSession para que
 * los sillones sin sesión activa también aparezcan en el resultado.
 *
 * Respuesta por sillón:
 *   { id, numero, nombre, ubicacion, estado, activo,
 *     pacienteActual, pacienteActualId, horaInicio, sessionId }
 *
 * pacienteActual / pacienteActualId / horaInicio / sessionId serán null
 * si el sillón no tiene sesión activa.
 */
app.get('/api/chairs', auth, async (req, res) => {
  try {
    const chairs = await Chair.findAll({
      where: { activo: true },
      include: [{
        model: ChairSession,
        where: { estado: 'activa' },
        required: false,  // LEFT JOIN: incluye sillones sin sesión activa
        include: [{ model: Patient, attributes: ['id', 'nombreCompleto', 'rut'] }]
      }],
      order: [['numero', 'ASC']]
    });

    // Aplanar la estructura Sequelize en un objeto simple para el frontend.
    // chair.ChairSessions[0] es la sesión activa (puede ser undefined si no hay ninguna).
    const result = chairs.map(chair => {
      const session = chair.ChairSessions?.[0];
      return {
        id: chair.id,
        numero: chair.numero,
        nombre: chair.nombre,
        ubicacion: chair.ubicacion,
        estado: chair.estado,
        activo: chair.activo,
        pacienteActual: session?.Patient?.nombreCompleto || null,
        pacienteActualId: session?.patientId || null,
        horaInicio: session?.horaInicio || null,
        sessionId: session?.id || null
      };
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[ERROR] Error obteniendo sillones:', err);
    return error(res, 'Error obteniendo sillones', 'CHAIRS_FETCH_FAILED', 500);
  }
});

// ==================== SILLONES: OPERACIONES DE SESIÓN ====================

// Asignar paciente a sillón
app.post('/api/chairs/:id/assign', auth, allowRoles('admin', 'enfermera'), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { pacienteId } = req.body;

    const chair = await Chair.findByPk(id, { transaction });

    if (!chair || !chair.activo) {
      await transaction.rollback();
      return error(res, 'Sillón no encontrado', 'CHAIR_NOT_FOUND', 404);
    }

    if (chair.estado === 'mantenimiento') {
      await transaction.rollback();
      return error(res, 'El sillón está en mantenimiento', 'CHAIR_IN_MAINTENANCE', 400);
    }

    if (chair.estado !== 'disponible') {
      await transaction.rollback();
      return error(res, 'El sillón no está disponible', 'CHAIR_NOT_AVAILABLE', 400);
    }

    const patient = await Patient.findByPk(pacienteId, { transaction });

    if (!patient) {
      await transaction.rollback();
      return error(res, 'Paciente no encontrado', 'PATIENT_NOT_FOUND', 404);
    }

    if (patient.estado !== 'activo') {
      await transaction.rollback();
      return error(res, 'El paciente no está activo', 'PATIENT_INACTIVE', 400);
    }

    // Verificar que el paciente no esté ya en otra sesión activa
    const activePatientSession = await ChairSession.findOne({
      where: { patientId: patient.id, estado: 'activa' },
      transaction
    });

    if (activePatientSession) {
      await transaction.rollback();
      return error(res, 'El paciente ya tiene una sesión activa en otro sillón', 'PATIENT_ALREADY_ASSIGNED', 400);
    }

    // Verificar que el sillón no tenga sesión activa
    const activeChairSession = await ChairSession.findOne({
      where: { chairId: chair.id, estado: 'activa' },
      transaction
    });

    if (activeChairSession) {
      await transaction.rollback();
      return error(res, 'El sillón ya tiene una sesión activa', 'CHAIR_ALREADY_OCCUPIED', 400);
    }

    // Crear sesión
    const session = await ChairSession.create({
      chairId: chair.id,
      patientId: patient.id,
      horaInicio: new Date(),
      estado: 'activa'
    }, { transaction });

    // Actualizar estado del sillón y del paciente
    await chair.update({ estado: 'ocupado' }, { transaction });
    await patient.update({ estado: 'en_tratamiento' }, { transaction });

    await transaction.commit();

    await logAudit({ req, accion: 'ASIGNAR_SILLON', entidad: 'ChairSession',
      entidadId: session.id, detalles: { sillon: chair.numero, paciente: patient.nombreCompleto } });

    return success(res, 'Paciente asignado al sillón exitosamente', { chair, session, patient: { id: patient.id, nombreCompleto: patient.nombreCompleto } });

  } catch (err) {
    await transaction.rollback();
    console.error('[ERROR] Error asignando sillon:', err);
    return error(res, 'Error interno del servidor', 'ASSIGNMENT_FAILED', 500);
  }
});

// Liberar sillón
app.post('/api/chairs/:id/release', auth, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    const chair = await Chair.findByPk(id, { transaction });
    if (!chair) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Sillón no encontrado' });
    }

    const session = await ChairSession.findOne({
      where: { chairId: chair.id, estado: 'activa' },
      include: [{ model: Patient }],
      transaction
    });

    if (!session) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'No hay sesión activa en este sillón' });
    }

    const horaFin = new Date();
    const duracionSegundos = Math.round((horaFin - new Date(session.horaInicio)) / 1000);
    const duracionMin = Math.floor(duracionSegundos / 60);

    // Notas clínicas: usar las del body o auto-generadas si no vienen
    const { notas } = req.body;
    const notasFinales = notas?.trim()
      ? `${notas.trim()} — Duración: ${duracionMin} min`
      : `Atención completada. Duración: ${duracionMin} minutos`;

    // Cerrar sesión
    await session.update({
      horaFin,
      estado: 'finalizada',
      notas: notasFinales
    }, { transaction });

    // Liberar sillón y actualizar estado del paciente
    await chair.update({ estado: 'disponible' }, { transaction });

    if (session.Patient) {
      await session.Patient.update({ estado: 'activo' }, { transaction });
    }

    await transaction.commit();

    // Obtener medicamentos administrados durante la sesión (post-commit, datos visibles)
    const sessionMeds = await SessionMedication.findAll({
      where: { sessionId: session.id },
      include: [{ model: Medication, attributes: ['nombre', 'unidad'] }]
    });
    const medicamentos = sessionMeds.map(sm => ({
      nombre: sm.Medication?.nombre || 'Desconocido',
      cantidad: sm.cantidadAdministrada,
      unidad: sm.Medication?.unidad || 'unidad',
      precioUnitario: sm.precioUnitario || 0,
      hora: sm.horaAdministracion || sm.createdAt
    }));

    await logAudit({ req, accion: 'LIBERAR_SILLON', entidad: 'ChairSession',
      entidadId: session.id, detalles: { duracionSegundos, paciente: session.Patient?.nombreCompleto } });

    res.json({
      success: true,
      message: 'Sillón liberado exitosamente',
      data: {
        duracionSegundos,
        horaInicio: session.horaInicio,
        horaFin,
        paciente: session.Patient?.nombreCompleto || null,
        notas: notasFinales,
        medicamentos
      }
    });

  } catch (err) {
    await transaction.rollback();
    console.error('[ERROR] Error liberando sillon:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Administrar medicamento en sesión activa
app.post('/api/chairs/:id/medications', auth, allowRoles('admin', 'enfermera'), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { medicationId, cantidad } = req.body;

    if (!medicationId || !cantidad || cantidad <= 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Debe indicar medicamento y cantidad válida' });
    }

    const chair = await Chair.findByPk(id, { transaction });
    if (!chair) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Sillón no encontrado' });
    }

    const session = await ChairSession.findOne({
      where: { chairId: chair.id, estado: 'activa' },
      transaction
    });

    if (!session) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'El sillón no tiene una sesión activa' });
    }

    const medication = await Medication.findByPk(medicationId, { transaction });
    if (!medication || !medication.activo) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Medicamento no encontrado' });
    }

    if (medication.cantidad < cantidad) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: `Stock insuficiente. Disponible: ${medication.cantidad}` });
    }

    // Descontar stock
    await medication.update({ cantidad: medication.cantidad - cantidad }, { transaction });

    const alertaStock = (medication.cantidad - cantidad) <= medication.minimoStock;

    // Registrar administración (captura precio actual para facturación histórica)
    const registro = await SessionMedication.create({
      sessionId: session.id,
      medicationId: medication.id,
      cantidadAdministrada: cantidad,
      precioUnitario: medication.precio || 0
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Medicamento administrado exitosamente',
      data: {
        sessionId: session.id,
        medicamento: medication.nombre,
        cantidadAdministrada: cantidad,
        stockRestante: medication.cantidad - cantidad,
        alertaStock,
        registro
      }
    });

  } catch (err) {
    await transaction.rollback();
    console.error('[ERROR] Error administrando medicamento:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Obtener medicamentos de sesión activa de un sillón
app.get('/api/chairs/:id/medications', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const session = await ChairSession.findOne({
      where: { chairId: id, estado: 'activa' },
      include: [{
        model: SessionMedication,
        include: [Medication]
      }]
    });

    if (!session) {
      return res.json({ success: true, data: [] });
    }

    const medicamentos = session.SessionMedications.map(sm => ({
      id: sm.id,
      nombre: sm.Medication.nombre,
      cantidad: sm.cantidadAdministrada,
      hora: sm.createdAt
    }));

    res.json({ success: true, data: medicamentos });

  } catch (err) {
    console.error('[ERROR] Error obteniendo medicamentos:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// ==================== DASHBOARD CLÍNICO ====================
app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const totalPacientes = await Patient.count();
    const pacientesActivos = await Patient.count({ where: { estado: 'activo' } });
    const sillonesDisponibles = await Chair.count({ where: { estado: 'disponible' } });
    const sillonesOcupados = await Chair.count({ where: { estado: 'ocupado' } });
    const sillonesMantenimiento = await Chair.count({ where: { estado: 'mantenimiento' } });
    const sesionesActivas = await ChairSession.count({ where: { estado: 'activa' } });

    const medicamentosCriticos = await Medication.findAll({
      where: sequelize.where(
        sequelize.col('cantidad'),
        '<=',
        sequelize.col('minimoStock')
      )
    });

    return res.json({
      success: true,
      data: {
        pacientes: { total: totalPacientes, activos: pacientesActivos },
        sillones: {
          disponibles: sillonesDisponibles,
          ocupados: sillonesOcupados,
          mantenimiento: sillonesMantenimiento
        },
        sesionesActivas,
        medicamentosCriticos
      }
    });

  } catch (err) {
    console.error('[ERROR] Error obteniendo dashboard:', err);
    return error(res, 'Error obteniendo dashboard', 'DASHBOARD_FETCH_FAILED', 500);
  }
});

// ==================== ESTADO EN VIVO DE SILLONES ====================
app.get('/api/chairs/live', auth, async (req, res) => {
  try {
    const chairs = await Chair.findAll({
      where: { activo: true },
      include: [{
        model: ChairSession,
        where: { estado: 'activa' },
        required: false,
        include: [
          { model: Patient },
          { model: SessionMedication, include: [Medication] }
        ]
      }]
    });

    const result = chairs.map(chair => {
      const session = chair.ChairSessions?.[0];
      return {
        id: chair.id,
        numero: chair.numero,
        nombre: chair.nombre,
        estado: chair.estado,
        ubicacion: chair.ubicacion,
        paciente: session ? {
          id: session.Patient.id,
          nombre: session.Patient.nombreCompleto,
          horaInicio: session.horaInicio
        } : null,
        medicamentos: session
          ? session.SessionMedications.map(sm => ({
              nombre: sm.Medication.nombre,
              cantidad: sm.cantidadAdministrada
            }))
          : []
      };
    });

    return res.json({ success: true, data: result });

  } catch (err) {
    console.error('[ERROR] Error obteniendo estado en vivo:', err);
    return error(res, 'Error obteniendo estado en vivo', 'CHAIRS_LIVE_FAILED', 500);
  }
});

// ==================== HISTORIAL CLÍNICO POR PACIENTE ====================
app.get('/api/patients/:id/history', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const sessions = await ChairSession.findAll({
      where: { patientId: id },
      include: [
        { model: Chair },
        { model: SessionMedication, include: [Medication] }
      ],
      order: [['horaInicio', 'DESC']]
    });

    const history = sessions.map(session => {
      const duracionSegundos = session.horaFin
        ? Math.round((new Date(session.horaFin) - new Date(session.horaInicio)) / 1000)
        : null;
      return {
        sessionId: session.id,
        estado: session.estado,
        silla: session.Chair?.nombre,
        horaInicio: session.horaInicio,
        horaFin: session.horaFin,
        duracionSegundos,
        medicamentos: session.SessionMedications.map(sm => ({
          nombre: sm.Medication.nombre,
          cantidad: sm.cantidadAdministrada
        }))
      };
    });

    return res.json({ success: true, data: history });

  } catch (err) {
    console.error('[ERROR] Error obteniendo historial clinico:', err);
    return error(res, 'Error obteniendo historial clínico', 'PATIENT_HISTORY_FAILED', 500);
  }
});

// ==================== HISTORIAL POR SILLÓN (con paginación) ====================
app.get('/api/chairs/:id/history', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const { count, rows: sessions } = await ChairSession.findAndCountAll({
      where: { chairId: id },
      include: [
        { model: Patient },
        { model: SessionMedication, include: [Medication] }
      ],
      order: [['horaInicio', 'DESC']],
      limit,
      offset
    });

    const history = sessions.map(session => {
      const duracionSegundos = session.horaFin
        ? Math.round((new Date(session.horaFin) - new Date(session.horaInicio)) / 1000)
        : null;
      return {
        sessionId: session.id,
        estado: session.estado,
        paciente: session.Patient?.nombreCompleto,
        horaInicio: session.horaInicio,
        horaFin: session.horaFin,
        duracionSegundos,
        medicamentos: session.SessionMedications.map(sm => ({
          nombre: sm.Medication.nombre,
          cantidad: sm.cantidadAdministrada
        }))
      };
    });

    return res.json({
      success: true,
      data: history,
      pagination: { total: count, page, pages: Math.ceil(count / limit), limit }
    });

  } catch (err) {
    console.error('[ERROR] Error obteniendo historial del sillon:', err);
    return error(res, 'Error obteniendo historial del sillón', 'CHAIR_HISTORY_FAILED', 500);
  }
});

// ==================== 404 y ERROR HANDLER ====================
app.get('/__test', (req, res) => {
  res.json({ ok: true });
});

// Catch-all para React Router (modo local): cualquier ruta que no sea /api ni /health
// devuelve el index.html del build para que React Router maneje la navegación.
// Express v5 requiere wildcard con nombre: /*path (no '*' a secas).
app.get('/*path', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/health' || req.path === '/__test') {
    return next();
  }
  const indexPath = path.join(frontendBuild, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) next(); // si el build no existe, continúa al 404
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

app.use(errorHandler);

// ==================== INICIAR SERVIDOR ====================
const PORT = process.env.PORT || 3001;

// Backup automático de SQLite al arrancar (no bloquea el inicio)
runBackup().catch(() => {});

app.listen(PORT, () => {
  console.log(`
  Servidor CDIEM corriendo en puerto ${PORT}
  URL: http://localhost:${PORT}

  Auth:       POST /api/auth/login
  Pacientes:  GET/POST /api/patients
  Sillones:   GET/POST /api/chairs
  Inventario: GET/POST /api/inventory
  Dashboard:  GET /api/dashboard
  `);
});

module.exports = app;
