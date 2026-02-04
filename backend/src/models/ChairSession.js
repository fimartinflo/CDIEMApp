const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChairSession = sequelize.define('ChairSession', {
  horaInicio: { type: DataTypes.DATE, allowNull: false },
  horaFin: DataTypes.DATE,
  estado: { type: DataTypes.STRING, defaultValue: 'activa' },
  notas: DataTypes.TEXT
});

module.exports = ChairSession;
