/**
 * utils/audit.js — Utilidad de registro de auditoría
 *
 * Expone logAudit(), función no-bloqueante que persiste una entrada
 * en AuditLogs después de cada operación crítica del sistema.
 *
 * Principio de diseño: si el registro de auditoría falla, la
 * operación principal NO se revierte. La auditoría es secundaria —
 * un fallo aquí no debe degradar la experiencia del usuario.
 *
 * Uso típico (dentro de un controller, tras operación exitosa):
 *   await logAudit({ req, accion: 'CREAR_PACIENTE', entidad: 'Patient',
 *                    entidadId: paciente.id, detalles: { nombre: paciente.nombreCompleto } });
 */

const AuditLog = require('../models/AuditLog');

/**
 * Registra una acción en el log de auditoría.
 *
 * @param {object}  opts
 * @param {object}  opts.req           - Request de Express (para extraer usuario e IP)
 * @param {string}  opts.accion        - Código de la acción (ej. 'CREAR_PACIENTE')
 * @param {string}  opts.entidad       - Nombre del modelo afectado (ej. 'Patient')
 * @param {number}  [opts.entidadId]   - ID del registro afectado (null si no aplica)
 * @param {object}  [opts.detalles]    - Datos adicionales a registrar como JSON
 */
async function logAudit({ req, accion, entidad, entidadId = null, detalles = null }) {
  try {
    const usuario = req?.user;

    // Preferir X-Forwarded-For en entornos con proxy/nginx, fallback a req.ip directo
    const ip = req?.headers?.['x-forwarded-for']?.split(',')[0].trim()
              || req?.ip
              || null;

    await AuditLog.create({
      accion,
      entidad,
      entidadId,
      usuarioId:     usuario?.id       || null,
      usuarioNombre: usuario?.username || null,
      // Serializar detalles a JSON solo si se proveen
      detalles:      detalles ? JSON.stringify(detalles) : null,
      ip
    });
  } catch (err) {
    // Log en consola pero nunca propagar — la auditoría no debe bloquear operaciones clínicas
    console.error('⚠️  audit.js: fallo al registrar entrada (no crítico):', err.message);
  }
}

module.exports = logAudit;
