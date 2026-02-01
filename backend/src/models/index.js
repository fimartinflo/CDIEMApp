const { sequelize } = require('../config/database');

const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida');
    
    // Sincronizar modelos (crear tablas si no existen)
    await sequelize.sync({ alter: true });
    console.log('✅ Base de datos sincronizada');
    
    return true;
  } catch (error) {
    console.error('❌ Error al sincronizar base de datos:', error);
    return false;
  }
};

module.exports = { sequelize, syncDatabase };