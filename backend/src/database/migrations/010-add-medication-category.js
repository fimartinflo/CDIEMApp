/**
 * @file 010-add-medication-category.js
 * @description Agrega columna `categoria` al modelo Medication.
 *
 * Categorías previstas en oncología:
 *   'quimioterapia' | 'premedicacion' | 'antieméticos' | 'soporte' | 'general'
 *
 * DEFAULT 'general' para no romper registros existentes.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Medications', 'categoria', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'general'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Medications', 'categoria');
  }
};
