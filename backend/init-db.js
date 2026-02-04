const {
  sequelize,
  Chair,
  Medication
} = require('./src/models');

(async () => {
  try {
    console.log('🗄️ Inicializando base de datos...');

    // 1️⃣ Sincronizar modelos (desarrollo)
    await sequelize.sync({ force: true });

    console.log('✅ Tablas recreadas');

    // 2️⃣ Crear sillones
    await Chair.bulkCreate([
      {
        numero: 'S1',
        nombre: 'Sillón 1',
        ubicacion: 'Sala A',
        estado: 'disponible',
        activo: true
      },
      {
        numero: 'S2',
        nombre: 'Sillón 2',
        ubicacion: 'Sala A',
        estado: 'disponible',
        activo: true
      },
      {
        numero: 'S3',
        nombre: 'Sillón 3',
        ubicacion: 'Sala B',
        estado: 'disponible',
        activo: true
      },
      {
        numero: 'S4',
        nombre: 'Sillón 4',
        ubicacion: 'Sala B',
        estado: 'mantenimiento',
        activo: true
      }
    ]);

    console.log('🪑 Sillones creados');

    // 3️⃣ Crear medicamentos
    await Medication.bulkCreate([
      {
        nombre: 'Medicamento A',
        descripcion: 'Para tratamiento oncológico X',
        cantidad: 10,
        unidad: 'unidad',
        minimoStock: 5,
        activo: true
      },
      {
        nombre: 'Medicamento B',
        descripcion: 'Para tratamiento oncológico Y',
        cantidad: 5,
        unidad: 'unidad',
        minimoStock: 10,
        activo: true
      },
      {
        nombre: 'Suero fisiológico',
        descripcion: 'Solución salina',
        cantidad: 20,
        unidad: 'bolsa',
        minimoStock: 5,
        activo: true
      }
    ]);

    console.log('💊 Medicamentos creados');

    console.log('🎉 Base de datos inicializada correctamente');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error inicializando la base de datos:', error);
    process.exit(1);
  }
})();
