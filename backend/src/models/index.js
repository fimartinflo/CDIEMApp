/**
 * models/index.js — Punto de entrada de todos los modelos Sequelize.
 *
 * Importa cada modelo y define las asociaciones entre ellos.
 * Debe ser el único lugar donde se configuran las relaciones FK para evitar
 * definiciones duplicadas o circulares.
 *
 * Patron de asociacion usado:
 *   hasMany / belongsTo con foreignKey explicito para claridad.
 *   Las opciones `as` solo se definen cuando hay multiples asociaciones
 *   entre los mismos modelos (ej. Chair <-> Visit).
 *
 * Exporta todos los modelos mas la instancia `sequelize` para que los
 * controllers y scripts puedan acceder a transacciones y queries raw.
 */
const sequelize = require('../config/database');

const Patient          = require('./Patient');
const Chair            = require('./Chair');
const ChairSession     = require('./ChairSession');
const Medication       = require('./Medication');
const SessionMedication = require('./SessionMedication');
const User             = require('./User');
const Visit            = require('./Visit');
const Inventory        = require('./Inventory');
const AuditLog         = require('./AuditLog');

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
  Inventory,
  AuditLog
};
