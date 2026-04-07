'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ChairSessions', {
      id:          { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      horaInicio:  { type: Sequelize.DATE, allowNull: false },
      horaFin:     { type: Sequelize.DATE, allowNull: true },
      estado:      { type: Sequelize.STRING, defaultValue: 'activa' },
      notas:       { type: Sequelize.TEXT, allowNull: true },
      patientId:   {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Patients', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      chairId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Chairs', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ChairSessions');
  }
};
