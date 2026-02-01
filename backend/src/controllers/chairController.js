const { Op } = require('sequelize');
const Chair = require('../models/Chair');
const Patient = require('../models/Patient');

const chairController = {
  // Obtener todos los sillones
  getAllChairs: async (req, res, next) => {
    try {
      const chairs = await Chair.findAll({
        include: [{
          model: Patient,
          as: 'pacienteActual',
          attributes: ['id', 'nombreCompleto']
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
      next(error);
    }
  },

  // Eliminar sillón
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
      
      await chair.destroy();
      
      res.json({
        success: true,
        message: 'Sillón eliminado exitosamente'
      });
    } catch (error) {
      next(error);
    }
  },

  // Asignar paciente a sillón
  assignPatient: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { pacienteId, medicamentos } = req.body;
      
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
      
      // Actualizar sillón
      await chair.update({
        estado: 'ocupado',
        pacienteActualId: pacienteId,
        horaInicio: new Date(),
        medicamentosAdministrados: JSON.stringify(medicamentos || [])
      });
      
      res.json({
        success: true,
        message: 'Paciente asignado al sillón exitosamente',
        data: chair
      });
    } catch (error) {
      next(error);
    }
  },

  // Liberar sillón
  releaseChair: async (req, res, next) => {
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
      
      // Actualizar sillón
      await chair.update({
        estado: 'disponible',
        pacienteActualId: null,
        horaFin: horaFin,
        notas: `Atención completada. Duración: ${duracionMinutos} minutos`
      });
      
      res.json({
        success: true,
        message: 'Sillón liberado exitosamente',
        data: {
          duracionMinutos,
          horaInicio,
          horaFin
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
      const chair = await Chair.findByPk(id, {
        include: [{
          model: require('../models/Visit'),
          as: 'visitas',
          include: [{
            model: Patient,
            as: 'paciente'
          }]
        }]
      });
      
      if (!chair) {
        return res.status(404).json({
          success: false,
          message: 'Sillón no encontrado'
        });
      }
      
      res.json({
        success: true,
        data: chair
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = chairController;