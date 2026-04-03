'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Medications', {
      id:              { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nombre:          { type: Sequelize.STRING, allowNull: false },
      descripcion:     { type: Sequelize.STRING, allowNull: true },
      cantidad:        { type: Sequelize.INTEGER, defaultValue: 0 },
      unidad:          { type: Sequelize.STRING, defaultValue: 'unidad' },
      precio:          { type: Sequelize.INTEGER, defaultValue: 0 },
      fechaExpiracion: { type: Sequelize.DATEONLY, allowNull: true },
      proveedor:       { type: Sequelize.STRING, allowNull: true },
      minimoStock:     { type: Sequelize.INTEGER, defaultValue: 10 },
      activo:          { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt:       { type: Sequelize.DATE, allowNull: false },
      updatedAt:       { type: Sequelize.DATE, allowNull: false }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Medications');
  }
};
