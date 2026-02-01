const { Op } = require('sequelize');
const Inventory = require('../models/Inventory');

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
      
      await item.update({
        cantidad: nuevaCantidad
      });
      
      res.json({
        success: true,
        message: `Stock ${tipo === 'entrada' ? 'aumentado' : 'reducido'} exitosamente`,
        data: {
          cantidadAnterior: item.cantidad,
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