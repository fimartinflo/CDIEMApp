'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Patients', {
      id:                  { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nombreCompleto:      { type: Sequelize.STRING, allowNull: false },
      tipoIdentificacion:  { type: Sequelize.STRING, defaultValue: 'rut' },
      rut:                 { type: Sequelize.STRING, unique: true, allowNull: true },
      pasaporte:           { type: Sequelize.STRING, allowNull: true },
      fechaNacimiento:     { type: Sequelize.DATEONLY, allowNull: true },
      prevision:           { type: Sequelize.STRING, allowNull: true },
      telefono:            { type: Sequelize.STRING, allowNull: true },
      correo:              { type: Sequelize.STRING, allowNull: true },
      genero:              { type: Sequelize.STRING, allowNull: true },
      direccion:           { type: Sequelize.STRING, allowNull: true },
      estado:              { type: Sequelize.STRING, defaultValue: 'activo' },
      createdAt:           { type: Sequelize.DATE, allowNull: false },
      updatedAt:           { type: Sequelize.DATE, allowNull: false }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Patients');
  }
};
