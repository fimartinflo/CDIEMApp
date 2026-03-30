const { Sequelize } = require('sequelize');
const path = require('path');

// Soporta dos modos de conexión:
//
// 1. LOCAL (por defecto) — SQLite en archivo local:
//    DB_DIALECT no definido o "sqlite"
//    DB_PATH opcional (default: raíz del repo)
//
// 2. CLOUD — PostgreSQL gratuito (Neon / Supabase / Aiven):
//    DB_DIALECT=postgres
//    DATABASE_URL=postgresql://user:pass@host:5432/dbname
//    Ver backend/.env.example para instrucciones completas.

const dialect = process.env.DB_DIALECT || 'sqlite';

let sequelize;

if (dialect === 'postgres') {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false }
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
