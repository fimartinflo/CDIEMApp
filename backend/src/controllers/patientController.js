const { Op } = require('sequelize');
const Patient = require('../models/Patient');
const Visit = require('../models/Visit');

// Validación de RUT chileno (standalone, no requiere instancia del modelo)
function validateRUT(rut) {
  if (!rut) return false;
  const cleaned = rut.replace(/[.\-]/g, '').toLowerCase();
  if (cleaned.length < 2) return false;
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? '0' : remainder === 10 ? 'k' : String(remainder);
  return dv === expected;
}

const patientController = {
  // Búsqueda avanzada de pacientes
  searchPatients: async (req, res, next) => {
    try {
      const { query, tipo } = req.query;

      let where = {};

      if (query) {
        const searchConditions = [];

        if (!query.includes(' ')) {
          searchConditions.push({ nombreCompleto: { [Op.like]: `%${query}%` } });
        } else {
          const parts = query.split(' ');
          searchConditions.push({ nombreCompleto: { [Op.like]: `%${parts[0]}%${parts[1] || ''}%` } });
        }

        const cleanRUT = query.replace(/\./g, '').replace('-', '');
        searchConditions.push({ rut: { [Op.like]: `%${cleanRUT}%` } });
        searchConditions.push({ pasaporte: { [Op.like]: `%${query}%` } });

        where = { [Op.or]: searchConditions };
      }

      if (tipo) {
        where.tipoIdentificacion = tipo;
      }

      const patients = await Patient.findAll({
        where,
        limit: 20,
        order: [['nombreCompleto', 'ASC']]
      });

      res.json({ success: true, data: patients });
    } catch (error) {
      next(error);
    }
  },

  // Obtener todos los pacientes con paginación
  getAllPatients: async (req, res, next) => {
    try {
      const { page = 1, limit = 10, estado } = req.query;
      const offset = (page - 1) * limit;

      const where = {};
      if (estado) where.estado = estado;

      const { count, rows } = await Patient.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']],
        include: [{
          model: Visit,
          as: 'visitas',
          limit: 1,
          order: [['fechaVisita', 'DESC']]
        }]
      });

      // Frontend espera data=array y pagination a nivel raíz
      res.json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Crear nuevo paciente
  createPatient: async (req, res, next) => {
    try {
      const patientData = req.body;

      if (patientData.tipoIdentificacion === 'rut') {
        if (!patientData.rut || !validateRUT(patientData.rut)) {
          return res.status(400).json({
            success: false,
            message: 'RUT chileno inválido'
          });
        }
      }

      const patient = await Patient.create(patientData);

      res.status(201).json({
        success: true,
        message: 'Paciente creado exitosamente',
        data: patient
      });
    } catch (error) {
      next(error);
    }
  },

  // Obtener paciente por ID con sus visitas
  getPatientById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const patient = await Patient.findByPk(id, {
        include: [{
          model: Visit,
          as: 'visitas',
          order: [['fechaVisita', 'DESC']]
        }]
      });

      if (!patient) {
        return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
      }

      res.json({ success: true, data: patient });
    } catch (error) {
      next(error);
    }
  },

  // Actualizar paciente
  updatePatient: async (req, res, next) => {
    try {
      const { id } = req.params;
      const patientData = req.body;

      const patient = await Patient.findByPk(id);

      if (!patient) {
        return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
      }

      if (patientData.tipoIdentificacion === 'rut') {
        if (!patientData.rut || !validateRUT(patientData.rut)) {
          return res.status(400).json({
            success: false,
            message: 'RUT chileno inválido'
          });
        }
      }

      await patient.update(patientData);

      res.json({
        success: true,
        message: 'Paciente actualizado exitosamente',
        data: patient
      });
    } catch (error) {
      next(error);
    }
  },

  // Desactivar paciente (borrado lógico)
  deletePatient: async (req, res, next) => {
    try {
      const { id } = req.params;
      const patient = await Patient.findByPk(id);

      if (!patient) {
        return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
      }

      await patient.update({ estado: 'inactivo' });

      res.json({ success: true, message: 'Paciente desactivado exitosamente' });
    } catch (error) {
      next(error);
    }
  },

  // Agendar visita para paciente
  scheduleVisit: async (req, res, next) => {
    try {
      const { id } = req.params;
      // Acepta tanto fechaVisita/tipoVisita (formato backend) como fecha/tipo (formato frontend)
      const { fechaVisita, fecha, tipoVisita, tipo, notas } = req.body;
      const visitDate = fechaVisita || fecha;
      const visitType = tipoVisita || tipo || 'consulta';

      const patient = await Patient.findByPk(id);

      if (!patient) {
        return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
      }

      const lastVisit = await Visit.findOne({
        where: { pacienteId: id },
        order: [['numeroVisita', 'DESC']]
      });

      const nextVisitNumber = lastVisit ? lastVisit.numeroVisita + 1 : 1;

      const visit = await Visit.create({
        pacienteId: id,
        numeroVisita: nextVisitNumber,
        fechaVisita: visitDate,
        tipoVisita: visitType,
        notas,
        estado: 'programada'
      });

      res.status(201).json({
        success: true,
        message: 'Visita agendada exitosamente',
        data: visit
      });
    } catch (error) {
      next(error);
    }
  },

  // Obtener próximas visitas
  getUpcomingVisits: async (req, res, next) => {
    try {
      const visits = await Visit.findAll({
        where: {
          fechaVisita: { [Op.gte]: new Date() },
          estado: 'programada'
        },
        include: [{
          model: Patient,
          as: 'paciente',
          attributes: ['id', 'nombreCompleto', 'rut', 'pasaporte']
        }],
        order: [['fechaVisita', 'ASC']],
        limit: 50
      });

      res.json({ success: true, data: visits });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = patientController;
