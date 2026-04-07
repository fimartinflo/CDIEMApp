const { Sequelize } = require('sequelize');
const path = require('path');

// Soporta tres modos de conexión:
//
// 1. LOCAL (por defecto) — SQLite en archivo local:
//    DB_DIALECT no definido o "sqlite"
//    DB_PATH opcional (default: raíz del repo)
//
// 2. TURSO — libSQL remoto (Turso cloud):
//    DB_DIALECT=turso
//    TURSO_URL=libsql://nombre-org.aws-us-east-2.turso.io
//    TURSO_AUTH_TOKEN=<token JWT desde Turso Dashboard>
//
// 3. CLOUD — PostgreSQL gratuito (Neon / Supabase / Aiven):
//    DB_DIALECT=postgres
//    DATABASE_URL=postgresql://user:pass@host:5432/dbname
//    Ver backend/.env.example para instrucciones completas.

const dialect = process.env.DB_DIALECT || 'sqlite';

let sequelize;

if (dialect === 'turso') {
  const libsql = require('@libsql/sqlite3');
  const url = process.env.TURSO_URL;
  const token = process.env.TURSO_AUTH_TOKEN;

  if (!url) throw new Error('DB_DIALECT=turso requiere TURSO_URL en las variables de entorno');

  const storage = token ? `${url}?authToken=${token}` : url;

  sequelize = new Sequelize({
    dialect: 'sqlite',
    dialectModule: libsql,
    storage,
    logging: false,
    pool: { max: 1 }   // libsql maneja una conexión por instancia
  });
} else if (dialect === 'postgres') {
  // Supabase / cualquier PostgreSQL cloud
  // DATABASE_URL formato: postgresql://postgres.[ref]:[password]@[host]:[port]/postgres
  //
  // Supabase ofrece dos endpoints:
  //   - Direct connection  (port 5432): máx ~60 conexiones simultáneas en free tier
  //   - Transaction pooler (port 6543): sin límite práctico, recomendado para Node.js
  //
  // Usar el Transaction Pooler (puerto 6543) para evitar "too many connections".
  // Obtenerlo en: Supabase Dashboard → Project Settings → Database → Connection pooling

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DB_DIALECT=postgres requiere DATABASE_URL en las variables de entorno');

  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false   // necesario para certificados de Supabase / Neon / Aiven
      }
    },
    // Pool conservador para Supabase free tier (max 60 conexiones directas)
    // Si usas el Transaction Pooler de Supabase puedes subir max a 10-20
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,  // ms máx para obtener conexión del pool
      idle: 10000      // ms antes de liberar conexión inactiva
    },
    logging: false
  });
} else {
  const storagePath = process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.join(__dirname, '../../../database.sqlite');

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: storagePath,
    logging: false
  });
}

module.exports = sequelize;
