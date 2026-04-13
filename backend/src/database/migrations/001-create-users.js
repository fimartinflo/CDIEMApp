'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      id:        { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      username:  { type: Sequelize.STRING(50), allowNull: false, unique: true },
      password:  { type: Sequelize.STRING, allowNull: false },
      email:     { type: Sequelize.STRING(100), allowNull: false, unique: true },
      role:      { type: Sequelize.STRING, allowNull: false, defaultValue: 'enfermera' },
      fullName:  { type: Sequelize.STRING(100), allowNull: false },
      isActive:  { type: Sequelize.BOOLEAN, defaultValue: true },
      lastLogin: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Users');
  }
};
