const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Medication = sequelize.define('Medication', {
  nombre: { type: DataTypes.STRING, allowNull: false },
  descripcion: DataTypes.STRING,
  cantidad: { type: DataTypes.INTEGER, defaultValue: 0 },
  unidad: { type: DataTypes.STRING, defaultValue: 'unidad' },
  fechaExpiracion: DataTypes.DATEONLY,
  proveedor: DataTypes.STRING,
  minimoStock: { type: DataTypes.INTEGER, defaultValue: 10 },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true }
});

module.exports = Medication;
