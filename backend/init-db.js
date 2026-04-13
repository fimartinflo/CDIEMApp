/**
 * init-db.js — Inicializa la base de datos y carga datos de prueba
 *
 * Uso normal (crea tablas nuevas, no borra datos existentes):
 *   node init-db.js
 *
 * Reset completo (borra todo y vuelve a crear, solo para desarrollo):
 *   node init-db.js --force
 */

const { sequelize, Chair, Medication, User } = require('./src/models');
const { migrate } = require('./src/database/migrate');

const FORCE = process.argv.includes('--force');

(async () => {
  try {
    console.log('[INFO] Inicializando base de datos...');

    if (FORCE) {
      // Borra todas las tablas y el registro de migraciones — solo para desarrollo
      console.log('[WARN] Modo --force: eliminando tablas existentes...');
      await sequelize.drop();
      // Elimina el historial de migraciones para que todas se apliquen de nuevo
      try {
        await sequelize.query('DROP TABLE IF EXISTS "SequelizeMeta"');
      } catch (_) { /* ignorar si no existe */ }
      console.log('[INFO] Tablas eliminadas');
    }

    // Aplica migraciones pendientes (crea las tablas que falten)
    await migrate();

    // ── Seed: usuarios del sistema ──────────────────────────────────────────
    const userCount = await User.count();
    if (userCount === 0) {
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
      ], { individualHooks: true }); // individualHooks activa el hash bcrypt
      console.log('[OK] Usuarios creados');
    } else {
      console.log(`[INFO] Usuarios ya existentes (${userCount}) — omitiendo seed`);
    }

    // ── Seed: sillones ──────────────────────────────────────────────────────
    const chairCount = await Chair.count();
    if (chairCount === 0) {
      await Chair.bulkCreate([
        { numero: 'S1', nombre: 'Sillón 1', ubicacion: 'Sala A', estado: 'disponible', activo: true },
        { numero: 'S2', nombre: 'Sillón 2', ubicacion: 'Sala A', estado: 'disponible', activo: true },
        { numero: 'S3', nombre: 'Sillón 3', ubicacion: 'Sala B', estado: 'disponible', activo: true },
        { numero: 'S4', nombre: 'Sillón 4', ubicacion: 'Sala B', estado: 'mantenimiento', activo: true }
      ]);
      console.log('[OK] Sillones creados');
    } else {
      console.log(`[INFO] Sillones ya existentes (${chairCount}) — omitiendo seed`);
    }

    // ── Seed: medicamentos ──────────────────────────────────────────────────
    const medCount = await Medication.count();
    if (medCount === 0) {
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
      console.log('[OK] Medicamentos creados');
    } else {
      console.log(`[INFO] Medicamentos ya existentes (${medCount}) — omitiendo seed`);
    }

    console.log('');
    console.log('[OK] Base de datos inicializada correctamente');
    console.log('');
    console.log('Usuarios disponibles:');
    console.log('  admin          / admin123      (rol: admin — acceso completo)');
    console.log('  enfermera      / enfermera123  (rol: enfermera — clínico, sin reportes)');
    console.log('  administracion / admin2024     (rol: administracion — solo reportes)');
    process.exit(0);

  } catch (err) {
    console.error('[ERROR] Error inicializando la base de datos:', err);
    process.exit(1);
  }
})();
