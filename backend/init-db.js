const { syncDatabase } = require('./src/config/database');
const User = require('./src/models/User');

const initializeDatabase = async () => {
  try {
    console.log('🔄 Inicializando base de datos...');
    
    // Sincronizar modelos
    await syncDatabase(true); // true para reinicializar
    
    // Crear usuarios por defecto
    const defaultUsers = [
      {
        username: 'admin',
        password: 'admin123',
        email: 'admin@dentalclinic.com',
        fullName: 'Administrador Principal',
        role: 'admin'
      },
      {
        username: 'doctor',
        password: 'doctor123',
        email: 'doctor@dentalclinic.com',
        fullName: 'Dr. Juan Pérez',
        role: 'doctor'
      },
      {
        username: 'asistente',
        password: 'asistente123',
        email: 'asistente@dentalclinic.com',
        fullName: 'María González',
        role: 'asistente'
      }
    ];

    for (const userData of defaultUsers) {
      const userExists = await User.findOne({ where: { username: userData.username } });
      if (!userExists) {
        await User.create(userData);
        console.log(`✅ Usuario ${userData.username} creado`);
      }
    }

    console.log('✅ Base de datos inicializada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    process.exit(1);
  }
};

initializeDatabase();