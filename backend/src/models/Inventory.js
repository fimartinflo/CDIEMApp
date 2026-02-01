const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Inventory = sequelize.define('Inventory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  unidad: {
    type: DataTypes.STRING(20),
    defaultValue: 'unidad'
  },
  fechaExpiracion: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  proveedor: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  codigoProveedor: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  ubicacion: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  minimoStock: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    validate: {
      min: 0
    }
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  hooks: {
    beforeSave: (inventory) => {
      // Verificar si está por debajo del stock mínimo
      if (inventory.cantidad < inventory.minimoStock) {
        console.warn(`⚠️ Alerta: ${inventory.nombre} está por debajo del stock mínimo`);
      }
    }
  }
});

// Método para verificar si está por vencer (30 días)
Inventory.prototype.porVencer = function() {
  if (!this.fechaExpiracion) return false;
  const hoy = new Date();
  const expiracion = new Date(this.fechaExpiracion);
  const diasRestantes = Math.ceil((expiracion - hoy) / (1000 * 60 * 60 * 24));
  return diasRestantes <= 30 && diasRestantes > 0;
};

// Método para verificar si está vencido
Inventory.prototype.vencido = function() {
  if (!this.fechaExpiracion) return false;
  const hoy = new Date();
  const expiracion = new Date(this.fechaExpiracion);
  return expiracion < hoy;
};

module.exports = Inventory;