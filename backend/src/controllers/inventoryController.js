/**
 * inventoryController.js — Controlador de inventario de medicamentos
 *
 * NOTA DE NAMING: "Inventory" en las variables es el modelo Medication.
 * El inventario NO usa un modelo propio (Inventory.js existe pero es legacy).
 * Se usa Medication porque es el modelo que integra con ChairSession
 * y SessionMedication para el flujo clínico de sillones.
 *
 * Alertas automáticas:
 *  - Stock bajo: cantidad <= minimoStock
 *  - Por vencer: fechaExpiracion en los próximos 30 días
 *  - Vencido: fechaExpiracion < hoy
 *
 * Control de acceso (definido en inventoryRoutes.js):
 *  - Lectura: admin + enfermera + administracion
 *  - Escritura (crear/editar/eliminar/stock): admin + administracion
 */
const { Op }    = require('sequelize');
// Usa el modelo Medication que es el que integra con el flujo de sillones/sesiones
const Inventory = require('../models/Medication');
const logAudit  = require('../utils/audit');

const inventoryController = {
  // Obtener todos los medicamentos
  getAllItems: async (req, res, next) => {
    try {
      const { search, expiringSoon, lowStock } = req.query;
      
      let where = {};
      
      // Búsqueda por nombre
      if (search) {
        where.nombre = { [Op.like]: `%${search}%` };
      }
      
      // Filtrar por pronto a vencer
      if (expiringSoon === 'true') {
        where.fechaExpiracion = {
          [Op.between]: [
            new Date(),
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
          ]
        };
      }
      
      // Filtrar por bajo stock
      if (lowStock === 'true') {
        where.cantidad = {
          [Op.lte]: require('sequelize').col('minimoStock')
        };
      }
      
      const items = await Inventory.findAll({
        where,
        order: [
          ['fechaExpiracion', 'ASC NULLS LAST'],
          ['nombre', 'ASC']
        ]
      });
      
      res.json({
        success: true,
        data: items
      });
    } catch (error) {
      next(error);
    }
  },

  // Obtener medicamento por ID
  getItemById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Inventory.findByPk(id);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Medicamento no encontrado'
        });
      }
      
      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      next(error);
    }
  },

  // Crear nuevo medicamento
  createItem: async (req, res, next) => {
    try {
      const item = await Inventory.create(req.body);

      await logAudit({ req, accion: 'CREAR_MEDICAMENTO', entidad: 'Medication',
        entidadId: item.id, detalles: { nombre: item.nombre, cantidad: item.cantidad } });

      res.status(201).json({
        success: true,
        message: 'Medicamento creado exitosamente',
        data: item
      });
    } catch (error) {
      next(error);
    }
  },

  // Actualizar medicamento
  updateItem: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Inventory.findByPk(id);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Medicamento no encontrado'
        });
      }
      
      await item.update(req.body);

      await logAudit({ req, accion: 'ACTUALIZAR_MEDICAMENTO', entidad: 'Medication',
        entidadId: item.id, detalles: { nombre: item.nombre } });

      res.json({
        success: true,
        message: 'Medicamento actualizado exitosamente',
        data: item
      });
    } catch (error) {
      next(error);
    }
  },

  // Eliminar medicamento
  deleteItem: async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await Inventory.findByPk(id);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Medicamento no encontrado'
        });
      }
      
      await item.destroy();

      await logAudit({ req, accion: 'ELIMINAR_MEDICAMENTO', entidad: 'Medication',
        entidadId: item.id, detalles: { nombre: item.nombre } });

      res.json({
        success: true,
        message: 'Medicamento eliminado exitosamente'
      });
    } catch (error) {
      next(error);
    }
  },

  // Actualizar cantidad (entrada/salida)
  updateQuantity: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { cantidad, tipo, motivo } = req.body; // tipo: 'entrada' o 'salida'
      
      const item = await Inventory.findByPk(id);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Medicamento no encontrado'
        });
      }
      
      let nuevaCantidad = item.cantidad;
      
      if (tipo === 'entrada') {
        nuevaCantidad += cantidad;
      } else if (tipo === 'salida') {
        if (cantidad > item.cantidad) {
          return res.status(400).json({
            success: false,
            message: 'No hay suficiente stock'
          });
        }
        nuevaCantidad -= cantidad;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Tipo inválido. Use "entrada" o "salida"'
        });
      }
      
      const cantidadAnterior = item.cantidad;
      await item.update({ cantidad: nuevaCantidad });

      await logAudit({ req, accion: `STOCK_${tipo.toUpperCase()}`, entidad: 'Medication',
        entidadId: item.id, detalles: { nombre: item.nombre, cantidadAnterior, cantidadNueva: nuevaCantidad, motivo } });

      res.json({
        success: true,
        message: `Stock ${tipo === 'entrada' ? 'aumentado' : 'reducido'} exitosamente`,
        data: {
          cantidadAnterior,
          cantidadNueva: nuevaCantidad,
          motivo
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Obtener alertas
  getAlerts: async (req, res, next) => {
    try {
      const items = await Inventory.findAll();
      
      const alerts = {
        bajoStock: items.filter(item => item.cantidad <= item.minimoStock),
        porVencer: items.filter(item => {
          if (!item.fechaExpiracion) return false;
          const hoy = new Date();
          const expiracion = new Date(item.fechaExpiracion);
          const diasRestantes = Math.ceil((expiracion - hoy) / (1000 * 60 * 60 * 24));
          return diasRestantes <= 30 && diasRestantes > 0;
        }),
        vencidos: items.filter(item => {
          if (!item.fechaExpiracion) return false;
          const hoy = new Date();
          const expiracion = new Date(item.fechaExpiracion);
          return expiracion < hoy;
        })
      };
      
      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = inventoryController;