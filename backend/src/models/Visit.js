const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Visit = sequelize.define('Visit', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  pacienteId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Patients',
      key: 'id'
    }
  },
  numeroVisita: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  fechaVisita: {
    type: DataTypes.DATE,
    allowNull: false
  },
  tipoVisita: {
    type: DataTypes.ENUM('consulta', 'tratamiento', 'control'),
    defaultValue: 'consulta'
  },
  estado: {
    type: DataTypes.ENUM('programada', 'en_progreso', 'completada', 'cancelada'),
    defaultValue: 'programada'
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  medicamentosAdministrados: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON con medicamentos administrados en esta visita'
  }
});

module.exports = Visit;