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
  chairId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Chairs',
      key: 'id'
    }
  },
  numeroVisita: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  fechaVisita: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  tipoVisita: {
    type: DataTypes.ENUM('consulta', 'tratamiento', 'control'),
    defaultValue: 'tratamiento'
  },
  estado: {
    type: DataTypes.ENUM('programada', 'en_progreso', 'completada', 'cancelada'),
    defaultValue: 'completada'
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  medicamentosAdministrados: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON con medicamentos administrados en esta visita',
    get() {
      const rawValue = this.getDataValue('medicamentosAdministrados');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('medicamentosAdministrados', JSON.stringify(value || []));
    }
  }
});

// Definir asociaciones
Visit.associate = function(models) {
  Visit.belongsTo(models.Patient, {
    foreignKey: 'pacienteId',
    as: 'paciente'
  });
  
  Visit.belongsTo(models.Chair, {
    foreignKey: 'chairId',
    as: 'sillon'
  });
};

module.exports = Visit;