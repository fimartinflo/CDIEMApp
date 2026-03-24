const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

const { success, error } = require('./utils/response');
const errorHandler = require('./middleware/errorHandler');
const auth = require('./middleware/auth');
const allowRoles = require('./middleware/roles');

const {
  sequelize,
  Chair,
  Patient,
  ChairSession,
  Medication,
  SessionMedication
} = require('./models');

// === Importar rutas ===
const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const chairRoutes = require('./routes/chairRoutes');

// === Conectar BD ===
(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('✅ Conectado y sincronizado con SQLite correctamente');
  } catch (err) {
    console.error('❌ Error conectando/sincronizando la BD:', err);
  }
})();

// === Middleware global ===
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.path}`);
  next();
});

// === Rutas de información ===
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

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ==================== MONTAR RUTAS ====================
// authRoutes maneja: POST /login, POST /register, GET /profile, PUT /change-password
app.use('/api/auth', authRoutes);

// patientRoutes maneja: GET /, POST /, GET /:id, PUT /:id, DELETE /:id, GET /search, GET /upcoming-visits, POST /:id/schedule-visit
app.use('/api/patients', patientRoutes);

// inventoryRoutes maneja: GET /, POST /, GET /:id, PUT /:id, DELETE /:id, GET /alerts, PUT /:id/quantity
app.use('/api/inventory', inventoryRoutes);

// chairRoutes maneja solo CRUD: POST /, PUT /:id, DELETE /:id, POST /:id/reset
// Las operaciones de sesión (assign, release, medications) quedan inline abajo
app.use('/api/chairs', chairRoutes);

// ==================== SILLONES: LISTADO CON ESTADO DE SESIÓN ====================
// GET /api/chairs retorna sillones con info del paciente actual via ChairSession
app.get('/api/chairs', auth, async (req, res) => {
  try {
    const chairs = await Chair.findAll({
      where: { activo: true },
      include: [{
        model: ChairSession,
        where: { estado: 'activa' },
        required: false,
        include: [{ model: Patient, attributes: ['id', 'nombreCompleto', 'rut'] }]
      }],
      order: [['numero', 'ASC']]
    });

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

    return success(res, { items: result, total: result.length });
  } catch (err) {
    console.error('❌ Error obteniendo sillones:', err);
    return error(res, 'Error obteniendo sillones', 'CHAIRS_FETCH_FAILED', 500);
  }
});

// ==================== SILLONES: OPERACIONES DE SESIÓN ====================

// Asignar paciente a sillón
app.post('/api/chairs/:id/assign', auth, allowRoles('admin', 'doctor'), async (req, res) => {
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

    return success(res, { chair, session, patient: { id: patient.id, nombreCompleto: patient.nombreCompleto } }, 'Paciente asignado al sillón exitosamente');

  } catch (err) {
    await transaction.rollback();
    console.error('❌ Error asignando sillón:', err);
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
    const duracionMinutos = Math.round((horaFin - new Date(session.horaInicio)) / 60000);

    // Cerrar sesión
    await session.update({
      horaFin,
      estado: 'finalizada',
      notas: `Atención completada. Duración: ${duracionMinutos} minutos`
    }, { transaction });

    // Liberar sillón y actualizar estado del paciente
    await chair.update({ estado: 'disponible' }, { transaction });

    if (session.Patient) {
      await session.Patient.update({ estado: 'activo' }, { transaction });
    }

    await transaction.commit();

    res.json({
      success: true,
      message: 'Sillón liberado exitosamente',
      data: {
        duracionMinutos,
        horaInicio: session.horaInicio,
        horaFin,
        paciente: session.Patient?.nombreCompleto || null
      }
    });

  } catch (err) {
    await transaction.rollback();
    console.error('❌ Error liberando sillón:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Administrar medicamento en sesión activa
app.post('/api/chairs/:id/medications', auth, allowRoles('admin', 'doctor'), async (req, res) => {
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

    // Registrar administración
    const registro = await SessionMedication.create({
      sessionId: session.id,
      medicationId: medication.id,
      cantidadAdministrada: cantidad
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
    console.error('❌ Error administrando medicamento:', err);
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
    console.error('❌ Error obteniendo medicamentos:', err);
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

    return success(res, {
      pacientes: { total: totalPacientes, activos: pacientesActivos },
      sillones: {
        disponibles: sillonesDisponibles,
        ocupados: sillonesOcupados,
        mantenimiento: sillonesMantenimiento
      },
      sesionesActivas,
      medicamentosCriticos
    });

  } catch (err) {
    console.error('❌ Error obteniendo dashboard:', err);
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

    return success(res, result);

  } catch (err) {
    console.error('❌ Error obteniendo estado en vivo:', err);
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
      const duracionMinutos = session.horaFin
        ? Math.round((new Date(session.horaFin) - new Date(session.horaInicio)) / 60000)
        : null;
      return {
        sessionId: session.id,
        estado: session.estado,
        silla: session.Chair?.nombre,
        horaInicio: session.horaInicio,
        horaFin: session.horaFin,
        duracionMinutos,
        medicamentos: session.SessionMedications.map(sm => ({
          nombre: sm.Medication.nombre,
          cantidad: sm.cantidadAdministrada
        }))
      };
    });

    return success(res, history);

  } catch (err) {
    console.error('❌ Error obteniendo historial clínico:', err);
    return error(res, 'Error obteniendo historial clínico', 'PATIENT_HISTORY_FAILED', 500);
  }
});

// ==================== HISTORIAL POR SILLÓN ====================
app.get('/api/chairs/:id/history', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const sessions = await ChairSession.findAll({
      where: { chairId: id },
      include: [
        { model: Patient },
        { model: SessionMedication, include: [Medication] }
      ],
      order: [['horaInicio', 'DESC']]
    });

    const history = sessions.map(session => {
      const duracionMinutos = session.horaFin
        ? Math.round((new Date(session.horaFin) - new Date(session.horaInicio)) / 60000)
        : null;
      return {
        sessionId: session.id,
        estado: session.estado,
        paciente: session.Patient?.nombreCompleto,
        horaInicio: session.horaInicio,
        horaFin: session.horaFin,
        duracionMinutos,
        medicamentos: session.SessionMedications.map(sm => ({
          nombre: sm.Medication.nombre,
          cantidad: sm.cantidadAdministrada
        }))
      };
    });

    return success(res, history);

  } catch (err) {
    console.error('❌ Error obteniendo historial del sillón:', err);
    return error(res, 'Error obteniendo historial del sillón', 'CHAIR_HISTORY_FAILED', 500);
  }
});

// ==================== 404 y ERROR HANDLER ====================
app.get('/__test', (req, res) => {
  res.json({ ok: true });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

app.use(errorHandler);

// ==================== INICIAR SERVIDOR ====================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
  🚀 Servidor CDIEM corriendo en puerto ${PORT}
  🌐 URL: http://localhost:${PORT}

  🔐 Auth:       POST /api/auth/login
  👥 Pacientes:  GET/POST /api/patients
  🪑 Sillones:   GET/POST /api/chairs
  💊 Inventario: GET/POST /api/inventory
  📊 Dashboard:  GET /api/dashboard
  `);
});

module.exports = app;
