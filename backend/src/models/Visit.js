const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Visit = sequelize.define('Visit', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  pacienteId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Patients', key: 'id' }
  },
  chairId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Nullable: visitas programadas aún no tienen sillón asignado
    references: { model: 'Chairs', key: 'id' }
  },
  numeroVisita: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  fechaVisita: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  tipoVisita: {
    type: DataTypes.STRING,
    defaultValue: 'tratamiento'
  },
  estado: {
    type: DataTypes.STRING,
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

module.exports = Visit;
