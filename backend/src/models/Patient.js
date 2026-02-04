const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Patient = sequelize.define('Patient', {
  nombreCompleto: { type: DataTypes.STRING, allowNull: false },
  tipoIdentificacion: { type: DataTypes.STRING, defaultValue: 'rut' },
  rut: { type: DataTypes.STRING, unique: true },
  pasaporte: DataTypes.STRING,
  fechaNacimiento: DataTypes.DATEONLY,
  prevision: DataTypes.STRING,
  telefono: DataTypes.STRING,
  correo: DataTypes.STRING,
  genero: DataTypes.STRING,
  direccion: DataTypes.STRING,
  estado: { type: DataTypes.STRING, defaultValue: 'activo' }
});

module.exports = Patient;
