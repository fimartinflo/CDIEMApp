'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Visits', {
      id:                       { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      pacienteId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Patients', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      chairId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Chairs', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      numeroVisita:             { type: Sequelize.INTEGER, defaultValue: 1 },
      fechaVisita:              { type: Sequelize.DATE, allowNull: false },
      tipoVisita:               { type: Sequelize.STRING, defaultValue: 'tratamiento' },
      estado:                   { type: Sequelize.STRING, defaultValue: 'completada' },
      notas:                    { type: Sequelize.TEXT, allowNull: true },
      medicamentosAdministrados:{ type: Sequelize.TEXT, allowNull: true },
      createdAt:                { type: Sequelize.DATE, allowNull: false },
      updatedAt:                { type: Sequelize.DATE, allowNull: false }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Visits');
  }
};
