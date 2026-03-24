const sequelize = require('../config/database');

const Patient = require('./Patient');
const Chair = require('./Chair');
const ChairSession = require('./ChairSession');
const Medication = require('./Medication');
const SessionMedication = require('./SessionMedication');
const User = require('./User');
const Visit = require('./Visit');
const Inventory = require('./Inventory');

// === Asociaciones ChairSession (flujo de sillón) ===
Patient.hasMany(ChairSession, { foreignKey: 'patientId' });
ChairSession.belongsTo(Patient, { foreignKey: 'patientId' });

Chair.hasMany(ChairSession, { foreignKey: 'chairId' });
ChairSession.belongsTo(Chair, { foreignKey: 'chairId' });

ChairSession.hasMany(SessionMedication, { foreignKey: 'sessionId' });
SessionMedication.belongsTo(ChairSession, { foreignKey: 'sessionId' });

Medication.hasMany(SessionMedication, { foreignKey: 'medicationId' });
SessionMedication.belongsTo(Medication, { foreignKey: 'medicationId' });

// === Asociaciones Visitas (historial clínico) ===
Patient.hasMany(Visit, { foreignKey: 'pacienteId', as: 'visitas' });
Visit.belongsTo(Patient, { foreignKey: 'pacienteId', as: 'paciente' });

Chair.hasMany(Visit, { foreignKey: 'chairId', as: 'visitasSillon' });
Visit.belongsTo(Chair, { foreignKey: 'chairId', as: 'sillon' });

module.exports = {
  sequelize,
  Patient,
  Chair,
  ChairSession,
  Medication,
  SessionMedication,
  User,
  Visit,
  Inventory
};
