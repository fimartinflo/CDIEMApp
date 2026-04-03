'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Chairs', {
      id:        { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      numero:    { type: Sequelize.STRING, allowNull: false, unique: true },
      nombre:    { type: Sequelize.STRING, allowNull: false },
      ubicacion: { type: Sequelize.STRING, allowNull: true },
      estado:    { type: Sequelize.STRING, defaultValue: 'disponible' },
      activo:    { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Chairs');
  }
};
