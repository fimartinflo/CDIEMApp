const {
  sequelize,
  Chair,
  Medication,
  User
} = require('./src/models');

(async () => {
  try {
    console.log('🗄️ Inicializando base de datos...');

    // Sincronizar modelos (fuerza recreación de tablas en desarrollo)
    await sequelize.sync({ force: true });
    console.log('✅ Tablas recreadas');

    // Crear usuarios del sistema
    await User.bulkCreate([
      {
        username: 'admin',
        password: 'admin123',
        email: 'admin@cdiem.cl',
        fullName: 'Administrador CDIEM',
        role: 'admin',
        isActive: true
      },
      {
        username: 'enfermera',
        password: 'enfermera123',
        email: 'enfermera@cdiem.cl',
        fullName: 'Enfermera CDIEM',
        role: 'enfermera',
        isActive: true
      },
      {
        username: 'administracion',
        password: 'admin2024',
        email: 'administracion@cdiem.cl',
        fullName: 'Administración CDIEM',
        role: 'administracion',
        isActive: true
      }
    ], { individualHooks: true }); // individualHooks activa el hash bcrypt por usuario
    console.log('👤 Usuarios creados');

    // Crear sillones
    await Chair.bulkCreate([
      { numero: 'S1', nombre: 'Sillón 1', ubicacion: 'Sala A', estado: 'disponible', activo: true },
      { numero: 'S2', nombre: 'Sillón 2', ubicacion: 'Sala A', estado: 'disponible', activo: true },
      { numero: 'S3', nombre: 'Sillón 3', ubicacion: 'Sala B', estado: 'disponible', activo: true },
      { numero: 'S4', nombre: 'Sillón 4', ubicacion: 'Sala B', estado: 'mantenimiento', activo: true }
    ]);
    console.log('🪑 Sillones creados');

    // Crear medicamentos (precio en CLP)
    await Medication.bulkCreate([
      {
        nombre: 'Medicamento A',
        descripcion: 'Para tratamiento oncológico X',
        cantidad: 10,
        unidad: 'unidad',
        precio: 45000,
        minimoStock: 5,
        activo: true
      },
      {
        nombre: 'Medicamento B',
        descripcion: 'Para tratamiento oncológico Y',
        cantidad: 5,
        unidad: 'unidad',
        precio: 78000,
        minimoStock: 10,
        activo: true
      },
      {
        nombre: 'Suero fisiológico',
        descripcion: 'Solución salina 0.9%',
        cantidad: 20,
        unidad: 'bolsa',
        precio: 3500,
        minimoStock: 5,
        activo: true
      }
    ]);
    console.log('💊 Medicamentos creados');

    console.log('🎉 Base de datos inicializada correctamente');
    console.log('');
    console.log('Usuarios disponibles:');
    console.log('  admin         / admin123      (rol: admin — acceso completo)');
    console.log('  enfermera     / enfermera123  (rol: enfermera — clínico, sin reportes)');
    console.log('  administracion / admin2024    (rol: administracion — solo reportes)');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error inicializando la base de datos:', err);
    process.exit(1);
  }
})();
