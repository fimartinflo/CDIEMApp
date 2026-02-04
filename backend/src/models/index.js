const sequelize = require('../config/database');

const Patient = require('./Patient');
const Chair = require('./Chair');
const ChairSession = require('./ChairSession.js');
const Medication = require('./Medication');
const SessionMedication = require('./SessionMedication');

// Relaciones
Patient.hasMany(ChairSession, { foreignKey: 'patientId' });
ChairSession.belongsTo(Patient, { foreignKey: 'patientId' });

Chair.hasMany(ChairSession, { foreignKey: 'chairId' });
ChairSession.belongsTo(Chair, { foreignKey: 'chairId' });

ChairSession.hasMany(SessionMedication, { foreignKey: 'sessionId' });
SessionMedication.belongsTo(ChairSession, { foreignKey: 'sessionId' });

Medication.hasMany(SessionMedication, { foreignKey: 'medicationId' });
SessionMedication.belongsTo(Medication, { foreignKey: 'medicationId' });

module.exports = {
  sequelize,
  Patient,
  Chair,
  ChairSession,
  Medication,
  SessionMedication
};
