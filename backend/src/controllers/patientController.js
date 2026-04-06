/**
 * patientController.js — Controlador de pacientes
 *
 * Gestiona el ciclo de vida completo de los registros de pacientes:
 * búsqueda, creación, lectura, actualización, borrado lógico y exportación.
 *
 * Validación de identidad chilena:
 *  - Si tipoIdentificacion === 'rut', se valida el RUT con el algoritmo módulo-11
 *  - Si tipoIdentificacion === 'pasaporte', se acepta cualquier string no vacío
 *
 * Borrado lógico: DELETE no elimina el registro, lo marca como estado='inactivo'.
 * Esto preserva el historial clínico (ChairSessions, Visits) del paciente.
 */
const { Op } = require('sequelize');
const Patient  = require('../models/Patient');
const Visit    = require('../models/Visit');
const logAudit = require('../utils/audit');

/**
 * Valida un RUT chileno usando el algoritmo módulo-11.
 *
 * Algoritmo:
 *  1. Limpiar puntos y guión → "12345678-9" → "123456789"
 *  2. Separar cuerpo (todos menos último dígito) y dígito verificador (DV)
 *  3. Multiplicar cada dígito del cuerpo por la secuencia [2,3,4,5,6,7,2,3,...]
 *     recorriendo de derecha a izquierda
 *  4. Sumar los productos y calcular 11 - (suma % 11)
 *  5. Si el resultado es 11 → DV='0'; si es 10 → DV='k'; si no → DV=resultado
 *  6. Comparar con el dígito verificador provisto
 *
 * @param {string} rut  - RUT con o sin puntos y guión (ej. "12.345.678-9" o "123456789")
 * @returns {boolean}   - true si el RUT es válido
 */
function validateRUT(rut) {
  if (!rut) return false;
  const cleaned = rut.replace(/[.\-]/g, '').toLowerCase();
  if (cleaned.length < 2) return false;
  const body = cleaned.slice(0, -1);
  const dv   = cleaned.slice(-1);
  let sum = 0;
  let multiplier = 2; // La secuencia es 2-7, reinicia en 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? '0' : remainder === 10 ? 'k' : String(remainder);
  return dv === expected;
}

const patientController = {

  /**
   * GET /api/patients/search?query=&tipo=
   * Búsqueda de pacientes por nombre, RUT o pasaporte.
   * Usada principalmente por el autocompletar de PatientSearch.js.
   * Limitada a 20 resultados para rendimiento.
   *
   * @query {string} query - Texto a buscar (nombre, RUT parcial o número de pasaporte)
   * @query {string} [tipo] - 'rut' | 'pasaporte' para filtrar por tipo de documento
   */
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

      // Registrar en auditoría quién creó al paciente y con qué nombre
      await logAudit({ req, accion: 'CREAR_PACIENTE', entidad: 'Patient',
        entidadId: patient.id, detalles: { nombreCompleto: patient.nombreCompleto } });

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

      await logAudit({ req, accion: 'ACTUALIZAR_PACIENTE', entidad: 'Patient',
        entidadId: patient.id, detalles: { nombreCompleto: patient.nombreCompleto } });

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

      await logAudit({ req, accion: 'DESACTIVAR_PACIENTE', entidad: 'Patient',
        entidadId: patient.id, detalles: { nombreCompleto: patient.nombreCompleto } });

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
  },

  // GET /api/patients/export — exportar todos los pacientes como CSV
  exportPatients: async (req, res, next) => {
    try {
      const patients = await Patient.findAll({ order: [['nombreCompleto', 'ASC']] });

      const header = ['ID', 'Nombre Completo', 'Tipo Identificación', 'RUT', 'Pasaporte',
        'Fecha Nacimiento', 'Teléfono', 'Email', 'Estado', 'Fecha Registro'];

      const rows = patients.map(p => [
        p.id,
        `"${(p.nombreCompleto || '').replace(/"/g, '""')}"`,
        p.tipoIdentificacion || '',
        p.rut || '',
        p.pasaporte || '',
        p.fechaNacimiento || '',
        p.telefono || '',
        p.email || '',
        p.estado || '',
        p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-CL') : ''
      ]);

      // BOM UTF-8 para compatibilidad con Excel en español
      const bom = '\uFEFF';
      const csv = bom + [header.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="pacientes_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = patientController;
