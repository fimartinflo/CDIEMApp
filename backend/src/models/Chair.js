const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Chair = sequelize.define('Chair', {
  numero: { type: DataTypes.STRING, unique: true, allowNull: false },
  nombre: { type: DataTypes.STRING, allowNull: false },
  ubicacion: DataTypes.STRING,
  estado: { type: DataTypes.STRING, defaultValue: 'disponible' },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true }
});

module.exports = Chair;
