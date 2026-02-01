const Patient = require('./Patient');
const Visit = require('./Visit');
const Chair = require('./Chair');
const Inventory = require('./Inventory');

// Relación Paciente - Visitas (1:N)
Patient.hasMany(Visit, {
  foreignKey: 'pacienteId',
  as: 'visitas'
});
Visit.belongsTo(Patient, {
  foreignKey: 'pacienteId',
  as: 'paciente'
});

// Relación Visita - Sillones (N:1)
Visit.belongsTo(Chair, {
  foreignKey: 'sillonId',
  as: 'sillon'
});
Chair.hasMany(Visit, {
  foreignKey: 'sillonId',
  as: 'visitas'
});

module.exports = {
  Patient,
  Visit,
  Chair,
  Inventory
};