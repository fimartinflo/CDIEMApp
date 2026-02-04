const { Op } = require('sequelize');
const Chair = require('../models/Chair');
const Patient = require('../models/Patient');
const Visit = require('../models/Visit');

const chairController = {
  // Obtener todos los sillones
  getAllChairs: async (req, res, next) => {
    try {
      const chairs = await Chair.findAll({
        include: [{
          model: Patient,
          as: 'pacienteActual',
          attributes: ['id', 'nombreCompleto', 'rut', 'edad']
        }],
        order: [['numero', 'ASC']]
      });
      
      res.json({
        success: true,
        data: chairs
      });
    } catch (error) {
      next(error);
    }
  },

  // Crear nuevo sillón
  createChair: async (req, res, next) => {
    try {
      const chair = await Chair.create(req.body);
      res.status(201).json({
        success: true,
        message: 'Sillón creado exitosamente',
        data: chair
      });
    } catch (error) {
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors.map(e => e.message)
        });
      }
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          message: 'El número de sillón ya existe',
          errors: ['Ya existe un sillón con ese número']
        });
      }
      next(error);
    }
  },

  // Actualizar sillón
  updateChair: async (req, res, next) => {
    try {
      const { id } = req.params;
      const chair = await Chair.findByPk(id);
      
      if (!chair) {
        return res.status(404).json({
          success: false,
          message: 'Sillón no encontrado'
        });
      }
      
      await chair.update(req.body);
      
      res.json({
        success: true,
        message: 'Sillón actualizado exitosamente',
        data: chair
      });
    } catch (error) {
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors.map(e => e.message)
        });
      }
      next(error);
    }
  },

  // Eliminar sillón (borrado lógico)
  deleteChair: async (req, res, next) => {
    try {
      const { id } = req.params;
      const chair = await Chair.findByPk(id);
      
      if (!chair) {
        return res.status(404).json({
          success: false,
          message: 'Sillón no encontrado'
        });
      }
      
      // Verificar si el sillón está ocupado
      if (chair.estado === 'ocupado') {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar un sillón ocupado'
        });
      }
      
      // Borrado lógico en lugar de físico
      await chair.update({ 
        activo: false,
        estado: 'deshabilitado'
      });
      
      res.json({
        success: true,
        message: 'Sillón deshabilitado exitosamente'
      });
    } catch (error) {
      next(error);
    }
  },

  // Asignar paciente a sillón
  assignPatient: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { pacienteId, medicamentos, notas } = req.body;
      
      const chair = await Chair.findByPk(id);
      if (!chair) {
        return res.status(404).json({
          success: false,
          message: 'Sillón no encontrado'
        });
      }
      
      // Verificar si el sillón está disponible
      if (chair.estado === 'ocupado') {
        return res.status(400).json({
          success: false,
          message: 'El sillón ya está ocupado'
        });
      }
      
      // Verificar paciente
      const patient = await Patient.findByPk(pacienteId);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Paciente no encontrado'
        });
      }
      
      // Verificar que el paciente no esté ya en otro sillón
      const pacienteEnOtroSillon = await Chair.findOne({
        where: {
          pacienteActualId: pacienteId,
          estado: 'ocupado'
        }
      });
      
      if (pacienteEnOtroSillon) {
        return res.status(400).json({
          success: false,
          message: `El paciente ya está asignado al sillón ${pacienteEnOtroSillon.numero}`,
          data: { sillonId: pacienteEnOtroSillon.id }
        });
      }
      
      // Actualizar sillón
      await chair.update({
        estado: 'ocupado',
        pacienteActualId: pacienteId,
        horaInicio: new Date(),
        medicamentosAdministrados: JSON.stringify(medicamentos || []),
        notas: notas || `Paciente asignado: ${patient.nombreCompleto}`
      });
      
      // Actualizar estado del paciente
      await patient.update({ estado: 'en_tratamiento' });
      
      res.json({
        success: true,
        message: 'Paciente asignado al sillón exitosamente',
        data: {
          chair,
          patient: {
            id: patient.id,
            nombreCompleto: patient.nombreCompleto,
            rut: patient.rut
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Liberar sillón
  releaseChair: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { notas } = req.body;
      
      const chair = await Chair.findByPk(id, {
        include: [{
          model: Patient,
          as: 'pacienteActual'
        }]
      });
      
      if (!chair) {
        return res.status(404).json({
          success: false,
          message: 'Sillón no encontrado'
        });
      }
      
      // Verificar si el sillón está ocupado
      if (chair.estado !== 'ocupado') {
        return res.status(400).json({
          success: false,
          message: 'El sillón no está ocupado'
        });
      }
      
      // Calcular tiempo de atención
      const horaInicio = new Date(chair.horaInicio);
      const horaFin = new Date();
      const duracionMinutos = Math.round((horaFin - horaInicio) / (1000 * 60));
      
      // Crear registro de visita si hay paciente asignado
      if (chair.pacienteActual) {
        const numeroVisita = chair.pacienteActual.numeroVisita + 1;
        
        // Crear registro de visita
        await Visit.create({
          pacienteId: chair.pacienteActualId,
          chairId: chair.id,
          numeroVisita: numeroVisita,
          fechaVisita: horaFin,
          tipoVisita: 'tratamiento',
          estado: 'completada',
          notas: notas || `Tratamiento completado en sillón ${chair.numero}. Duración: ${duracionMinutos} minutos`,
          medicamentosAdministrados: chair.medicamentosAdministrados
        });
        
        // Actualizar número de visita del paciente
        await chair.pacienteActual.update({ 
          numeroVisita,
          proximaVisita: req.body.proximaVisita || null
        });
      }
      
      // Guardar datos del paciente antes de liberar
      const pacienteLiberado = chair.pacienteActual ? {
        id: chair.pacienteActual.id,
        nombreCompleto: chair.pacienteActual.nombreCompleto,
        rut: chair.pacienteActual.rut
      } : null;
      
      // Actualizar sillón
      await chair.update({
        estado: 'disponible',
        pacienteActualId: null,
        horaFin: horaFin,
        notas: notas || `Liberado. Duración: ${duracionMinutos} minutos`,
        medicamentosAdministrados: null
      });
      
      res.json({
        success: true,
        message: 'Sillón liberado exitosamente',
        data: {
          duracionMinutos,
          horaInicio,
          horaFin,
          pacienteLiberado
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Obtener historial del sillón
  getChairHistory: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Obtener información del sillón
      const chair = await Chair.findByPk(id, {
        include: [{
          model: Patient,
          as: 'pacienteActual',
          attributes: ['id', 'nombreCompleto', 'rut']
        }]
      });
      
      if (!chair) {
        return res.status(404).json({
          success: false,
          message: 'Sillón no encontrado'
        });
      }
      
      // Obtener historial de visitas de este sillón
      const visitas = await Visit.findAll({
        where: { chairId: id },
        include: [{
          model: Patient,
          as: 'paciente',
          attributes: ['id', 'nombreCompleto', 'rut']
        }],
        order: [['fechaVisita', 'DESC']],
        limit: 50 // Limitar a las últimas 50 visitas
      });
      
      res.json({
        success: true,
        data: {
          sillón: {
            id: chair.id,
            numero: chair.numero,
            nombre: chair.nombre,
            ubicacion: chair.ubicacion,
            estado: chair.estado,
            pacienteActual: chair.pacienteActual
          },
          historial: visitas
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Obtener sillones disponibles
  getAvailableChairs: async (req, res, next) => {
    try {
      const chairs = await Chair.findAll({
        where: {
          estado: 'disponible',
          activo: true
        },
        order: [['numero', 'ASC']]
      });
      
      res.json({
        success: true,
        data: chairs
      });
    } catch (error) {
      next(error);
    }
  },

  // Obtener sillones ocupados
  getOccupiedChairs: async (req, res, next) => {
    try {
      const chairs = await Chair.findAll({
        where: {
          estado: 'ocupado'
        },
        include: [{
          model: Patient,
          as: 'pacienteActual',
          attributes: ['id', 'nombreCompleto', 'rut', 'edad']
        }],
        order: [['horaInicio', 'ASC']]
      });
      
      res.json({
        success: true,
        data: chairs
      });
    } catch (error) {
      next(error);
    }
  },

  // Reiniciar sillón (para mantenimiento)
  resetChair: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const chair = await Chair.findByPk(id);
      if (!chair) {
        return res.status(404).json({
          success: false,
          message: 'Sillón no encontrado'
        });
      }
      
      await chair.update({
        estado: 'disponible',
        pacienteActualId: null,
        horaInicio: null,
        horaFin: null,
        medicamentosAdministrados: null,
        notas: 'Reiniciado por el sistema'
      });
      
      res.json({
        success: true,
        message: 'Sillón reiniciado exitosamente',
        data: chair
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = chairController;