'use strict';

/**
 * migrate.js — Runner de migraciones con umzug
 *
 * Uso programático:
 *   const { migrate, migrateUndo } = require('./src/database/migrate');
 *   await migrate();         // aplica migraciones pendientes
 *   await migrateUndo();     // revierte la última migración
 *
 * Uso desde CLI:
 *   node src/database/migrate.js           # aplica pendientes
 *   node src/database/migrate.js --undo    # revierte la última
 *   node src/database/migrate.js --status  # lista el estado
 */

const path = require('path');
const { Umzug, SequelizeStorage } = require('umzug');
const sequelize = require('../config/database');

const umzug = new Umzug({
  migrations: {
    // path.join usa backslashes en Windows; glob requiere forward slashes.
    glob: path.join(__dirname, 'migrations', '*.js').replace(/\\/g, '/'),
    resolve: ({ name, path: migPath, context }) => {
      const migration = require(migPath);
      return {
        name,
        up:   () => migration.up(context, sequelize.constructor),
        down: () => migration.down(context, sequelize.constructor)
      };
    }
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console
});

/**
 * Aplica todas las migraciones pendientes.
 */
async function migrate() {
  const pending = await umzug.pending();
  if (pending.length === 0) {
    console.log('[OK] Base de datos al dia — sin migraciones pendientes');
    return;
  }
  console.log(`[INFO] Aplicando ${pending.length} migracion(es)...`);
  await umzug.up();
  console.log('[OK] Migraciones aplicadas correctamente');
}

/**
 * Revierte la última migración aplicada.
 */
async function migrateUndo() {
  await umzug.down();
  console.log('[OK] Ultima migracion revertida');
}

/**
 * Muestra el estado de cada migración.
 */
async function status() {
  const executed = await umzug.executed();
  const pending  = await umzug.pending();
  console.log('\n[INFO] Estado de migraciones:');
  executed.forEach(m => console.log(`  [aplicada]  ${m.name}`));
  pending.forEach(m  => console.log(`  [pendiente] ${m.name}`));
  console.log('');
}

module.exports = { migrate, migrateUndo, status };

// Ejecución directa: node src/database/migrate.js [--undo|--status]
if (require.main === module) {
  const arg = process.argv[2];
  const fn  = arg === '--undo'   ? migrateUndo
            : arg === '--status' ? status
            : migrate;

  fn()
    .then(() => process.exit(0))
    .catch(err => { console.error('[ERROR] Error en migracion:', err); process.exit(1); });
}
