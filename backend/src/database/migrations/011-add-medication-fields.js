/**
 * @file 011-add-medication-fields.js
 * @description Agrega tres campos farmaceuticos al modelo Medication,
 * requeridos por la hoja "Hora Sillon" y "Descripcion" del Excel COP:
 *   - codigoInterno:   codigo interno CDIEM para identificar el producto
 *   - principioActivo: molecula/droga activa del medicamento
 *   - laboratorio:     fabricante o laboratorio distribuidor
 *
 * Todos son opcionales (allowNull: true) para no romper registros existentes.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Medications', 'codigoInterno', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn('Medications', 'principioActivo', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn('Medications', 'laboratorio', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Medications', 'codigoInterno');
    await queryInterface.removeColumn('Medications', 'principioActivo');
    await queryInterface.removeColumn('Medications', 'laboratorio');
  },
};
