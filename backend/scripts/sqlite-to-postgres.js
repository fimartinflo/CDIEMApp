/**
 * sqlite-to-postgres.js — Migra datos de SQLite local a PostgreSQL (Supabase)
 *
 * Copia todos los registros de la base de datos SQLite local hacia la base
 * de datos PostgreSQL configurada en DATABASE_URL.
 *
 * Orden de inserción respeta las dependencias FK:
 *   Users → Patients → Chairs → Medications →
 *   ChairSessions → SessionMedications → Visits → AuditLogs
 *
 * Uso:
 *   # Asegurarse de tener un .env con ambas conexiones configuradas,
 *   # o pasar las variables directamente:
 *   DATABASE_URL="postgresql://..." node scripts/sqlite-to-postgres.js
 *
 *   # Para forzar sobreescritura aunque el destino tenga datos:
 *   DATABASE_URL="postgresql://..." node scripts/sqlite-to-postgres.js --force
 *
 * IMPORTANTE: Este script NO borra datos del destino por defecto.
 * Con --force trunca todas las tablas del destino antes de insertar.
 * Usar --force solo en bases de datos vacías o de prueba.
 */

'use strict';

require('dotenv').config();
const path  = require('path');
const { Sequelize } = require('sequelize');

const FORCE = process.argv.includes('--force');

// ─── Fuente: SQLite local ────────────────────────────────────────────────────

const srcPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '../../database.sqlite');

const src = new Sequelize({
  dialect: 'sqlite',
  storage: srcPath,
  logging: false,
});

// ─── Destino: PostgreSQL / Supabase ─────────────────────────────────────────

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌  DATABASE_URL no definida.');
  console.error('    Ejemplo: DATABASE_URL="postgresql://postgres.[ref]:[pass]@[host]:6543/postgres" node scripts/sqlite-to-postgres.js');
  process.exit(1);
}

const dst = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
  logging: false,
});

// ─── Tablas en orden FK-safe ─────────────────────────────────────────────────

/**
 * Lista de tablas en el orden correcto para respetar FK constraints.
 * El orden inverso se usa para truncar (para respetar las dependencias).
 */
const TABLES = [
  'Users',
  'Patients',
  'Chairs',
  'Medications',
  'ChairSessions',
  'SessionMedications',
  'Visits',
  'AuditLogs',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Trunca una tabla en PostgreSQL y reinicia su secuencia de auto-increment.
 * Usa TRUNCATE ... RESTART IDENTITY CASCADE para limpiar en cascada.
 * @param {Sequelize} db
 * @param {string} table
 */
async function truncateTable(db, table) {
  await db.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
}

/**
 * Reinicia la secuencia de auto-increment de una tabla en PostgreSQL al
 * valor correcto después de insertar datos con IDs explícitos.
 * @param {Sequelize} db
 * @param {string} table
 */
async function resetSequence(db, table) {
  try {
    await db.query(`
      SELECT setval(
        pg_get_serial_sequence('"${table}"', 'id'),
        COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1,
        false
      )
    `);
  } catch (err) {
    // Algunas tablas pueden no tener secuencia (ej. sin PK serial) — ignorar
    console.warn(`  ⚠️  No se pudo resetear secuencia de ${table}: ${err.message}`);
  }
}

/**
 * Lee todos los registros de una tabla en SQLite.
 * @param {Sequelize} db
 * @param {string} table
 * @returns {Promise<Object[]>}
 */
async function readAll(db, table) {
  const [rows] = await db.query(`SELECT * FROM "${table}"`);
  return rows;
}

/**
 * Inserta filas en PostgreSQL respetando los campos tal como vienen de SQLite.
 * Usa ON CONFLICT DO NOTHING para ser idempotente si no se usa --force.
 * @param {Sequelize} db
 * @param {string} table
 * @param {Object[]} rows
 */
async function insertRows(db, table, rows) {
  if (rows.length === 0) return;

  const columns = Object.keys(rows[0]);
  const colList  = columns.map(c => `"${c}"`).join(', ');

  // Insertar en lotes de 100 para no sobrecargar el pool
  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);

    const placeholders = batch.map((_, rowIdx) => {
      const vals = columns.map((_, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`);
      return `(${vals.join(', ')})`;
    }).join(', ');

    const values = batch.flatMap(row =>
      columns.map(col => {
        const val = row[col];
        // SQLite guarda BOOLEAN como 0/1 — convertir para PostgreSQL
        if (col === 'isActive' || col === 'activo') return val === 1 ? true : val === 0 ? false : val;
        return val;
      })
    );

    await db.query(
      `INSERT INTO "${table}" (${colList}) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
      { bind: values }
    );
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log('');
  console.log('🔄  CDIEMApp — Migración SQLite → PostgreSQL (Supabase)');
  console.log('────────────────────────────────────────────────────────');
  console.log(`📂  Fuente  : ${srcPath}`);
  console.log(`☁️   Destino : ${databaseUrl.replace(/:[^:@]+@/, ':***@')}`);
  console.log(`🔧  Modo    : ${FORCE ? '--force (truncar destino antes)' : 'idempotente (ON CONFLICT DO NOTHING)'}`);
  console.log('');

  try {
    // Verificar conexiones
    await src.authenticate();
    console.log('✅  Conexión SQLite OK');
    await dst.authenticate();
    console.log('✅  Conexión PostgreSQL OK');
    console.log('');

    // Asegurarse de que las tablas existen en destino
    // (correr init-db primero si no existen)
    const [dstTables] = await dst.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `);
    const dstTableNames = dstTables.map(r => r.tablename);
    const missingTables = TABLES.filter(t => !dstTableNames.includes(t));
    if (missingTables.length > 0) {
      console.error(`❌  Faltan tablas en destino: ${missingTables.join(', ')}`);
      console.error('    Ejecuta primero: DB_DIALECT=postgres DATABASE_URL="..." node init-db.js');
      process.exit(1);
    }

    // Contar registros en destino para advertir si hay datos
    if (!FORCE) {
      for (const table of TABLES) {
        const [[{ count }]] = await dst.query(`SELECT COUNT(*) as count FROM "${table}"`);
        if (parseInt(count) > 0) {
          console.warn(`⚠️  La tabla ${table} ya tiene ${count} registros en destino.`);
          console.warn('   Se omitirán duplicados (ON CONFLICT DO NOTHING).');
          console.warn('   Usa --force para truncar y reinsertar todo.');
        }
      }
      console.log('');
    }

    // Truncar en orden inverso si --force
    if (FORCE) {
      console.log('🗑️  Truncando tablas en destino (orden inverso)...');
      for (const table of [...TABLES].reverse()) {
        await truncateTable(dst, table);
        process.stdout.write(`   ✓ ${table}\n`);
      }
      console.log('');
    }

    // Migrar tabla por tabla
    let totalRows = 0;
    console.log('📤  Migrando datos...');
    for (const table of TABLES) {
      const rows = await readAll(src, table);
      if (rows.length === 0) {
        console.log(`   ⏭️  ${table.padEnd(22)} — vacía, omitida`);
        continue;
      }
      await insertRows(dst, table, rows);
      await resetSequence(dst, table);
      console.log(`   ✅  ${table.padEnd(22)} — ${rows.length} registro(s)`);
      totalRows += rows.length;
    }

    console.log('');
    console.log(`🎉  Migración completada — ${totalRows} registros transferidos`);
    console.log('');
    console.log('Próximos pasos:');
    console.log('  1. Verificar datos en Supabase Dashboard → Table Editor');
    console.log('  2. Arrancar el servidor con DB_DIALECT=postgres DATABASE_URL="..." npm start');
    console.log('');

  } catch (err) {
    console.error('\n❌  Error durante la migración:', err.message);
    if (err.original) console.error('   Detalle:', err.original.message);
    process.exit(1);
  } finally {
    await src.close();
    await dst.close();
  }
})();
