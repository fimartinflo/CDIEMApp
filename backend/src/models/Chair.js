const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Chair = sequelize.define('Chair', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  numero: {
    type: DataTypes.STRING(10),
    unique: true,
    allowNull: false
  },
  nombre: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  ubicacion: {
    type: DataTypes.STRING(100)
  },
  estado: {
    type: DataTypes.ENUM('disponible', 'ocupado', 'mantenimiento', 'deshabilitado'),
    defaultValue: 'disponible'
  },
  pacienteActualId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Patients',
      key: 'id'
    }
  },
  horaInicio: {
    type: DataTypes.DATE,
    allowNull: true
  },
  horaFin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  medicamentosAdministrados: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON con medicamentos administrados en este sillón'
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

module.exports = Chair;