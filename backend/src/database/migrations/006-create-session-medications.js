'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SessionMedications', {
      id:                    { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      cantidadAdministrada:  { type: Sequelize.INTEGER, allowNull: false },
      precioUnitario:        { type: Sequelize.INTEGER, defaultValue: 0 },
      horaAdministracion:    { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      sessionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'ChairSessions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      medicationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Medications', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('SessionMedications');
  }
};
