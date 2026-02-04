const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SessionMedication = sequelize.define('SessionMedication', {
  cantidadAdministrada: { type: DataTypes.INTEGER, allowNull: false },
  horaAdministracion: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

module.exports = SessionMedication;
