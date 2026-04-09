/**
 * @file backup.js
 * @description Utilidad de backup automático de la base de datos SQLite.
 *
 * Copia database.sqlite a backups/backup_YYYYMMDD_HHMMSS.sqlite y conserva
 * solo los últimos MAX_BACKUPS archivos (por defecto 7).
 *
 * Uso:
 *   const { runBackup } = require('./utils/backup');
 *   await runBackup(); // llamar al arrancar el servidor
 *
 * No lanza excepciones — los errores se loguean y el servidor sigue iniciando.
 * Solo opera cuando DB_DIALECT es 'sqlite' (o no está definido).
 */

const fs   = require('fs');
const path = require('path');

const DB_PATH      = path.join(__dirname, '../../../database.sqlite');
const BACKUP_DIR   = path.join(__dirname, '../../../backups');
const MAX_BACKUPS  = parseInt(process.env.BACKUP_MAX || '7', 10);

/**
 * Formatea una fecha como YYYYMMDD_HHMMSS para el nombre del archivo.
 * @param {Date} d
 * @returns {string}
 */
const formatStamp = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_` +
         `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

/**
 * Realiza una copia de database.sqlite en la carpeta backups/.
 * Elimina los backups más antiguos si se supera MAX_BACKUPS.
 *
 * @returns {Promise<void>}
 */
const runBackup = async () => {
  // Solo activo en modo SQLite local
  if (process.env.DB_DIALECT && process.env.DB_DIALECT !== 'sqlite') return;

  if (!fs.existsSync(DB_PATH)) {
    console.log('ℹ️  Backup omitido: database.sqlite no existe aún.');
    return;
  }

  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const stamp      = formatStamp(new Date());
    const destFile   = path.join(BACKUP_DIR, `backup_${stamp}.sqlite`);

    fs.copyFileSync(DB_PATH, destFile);
    console.log(`✅ Backup creado: backups/backup_${stamp}.sqlite`);

    // Purgar backups antiguos — conservar solo los últimos MAX_BACKUPS
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup_') && f.endsWith('.sqlite'))
      .sort(); // orden lexicográfico = orden cronológico con este formato

    if (files.length > MAX_BACKUPS) {
      const toDelete = files.slice(0, files.length - MAX_BACKUPS);
      toDelete.forEach(f => {
        fs.unlinkSync(path.join(BACKUP_DIR, f));
        console.log(`🗑️  Backup antiguo eliminado: ${f}`);
      });
    }
  } catch (err) {
    // No relanzar — el servidor debe iniciar aunque el backup falle
    console.error('⚠️  Error al crear backup:', err.message);
  }
};

module.exports = { runBackup };
