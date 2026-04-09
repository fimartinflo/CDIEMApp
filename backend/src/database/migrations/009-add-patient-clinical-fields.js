/**
 * @file 009-add-patient-clinical-fields.js
 * @description Agrega campos clínicos oncológicos al modelo Patient:
 *   - diagnostico: tipo de cáncer / diagnóstico oncológico
 *   - protocoloTratamiento: protocolo aplicado (ej. FOLFOX, AC-T)
 *   - alergias: alergias a medicamentos conocidas
 *
 * Todos son opcionales (nullable) para no romper registros existentes.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Patients', 'diagnostico', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('Patients', 'protocoloTratamiento', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('Patients', 'alergias', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Patients', 'diagnostico');
    await queryInterface.removeColumn('Patients', 'protocoloTratamiento');
    await queryInterface.removeColumn('Patients', 'alergias');
  }
};
