const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SessionMedication = sequelize.define('SessionMedication', {
  cantidadAdministrada: { type: DataTypes.INTEGER, allowNull: false },
  precioUnitario: { type: DataTypes.INTEGER, defaultValue: 0 }, // precio al momento de administrar
  horaAdministracion: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

module.exports = SessionMedication;
