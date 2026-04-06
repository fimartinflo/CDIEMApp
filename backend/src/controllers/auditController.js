/**
 * auditController.js — Controlador del log de auditoría
 *
 * Expone el historial de acciones del sistema para el rol admin.
 * Soporta paginación y filtros por acción, entidad y usuario.
 *
 * Endpoints:
 *   GET /api/audit  — Listar entradas (admin only)
 */

const AuditLog = require('../models/AuditLog');

const auditController = {

  /**
   * GET /api/audit
   * Retorna el historial de auditoría con paginación descendente (más reciente primero).
   *
   * @query {number} [page=1]       Página solicitada
   * @query {number} [limit=50]     Registros por página (máx. 100)
   * @query {string} [accion]       Filtrar por código de acción exacto
   * @query {string} [entidad]      Filtrar por nombre de entidad exacto
   * @query {number} [usuarioId]    Filtrar por ID de usuario
   *
   * @response {{ success, data: AuditLog[], pagination }}
   */
  listLogs: async (req, res, next) => {
    try {
      const page   = Math.max(1, parseInt(req.query.page)  || 1);
      const limit  = Math.min(100, parseInt(req.query.limit) || 50);
      const offset = (page - 1) * limit;

      // Construir cláusula WHERE dinámicamente con los filtros presentes en la query
      const where = {};
      if (req.query.accion)    where.accion    = req.query.accion;
      if (req.query.entidad)   where.entidad   = req.query.entidad;
      if (req.query.usuarioId) where.usuarioId = parseInt(req.query.usuarioId);

      const { count, rows } = await AuditLog.findAndCountAll({
        where,
        order:  [['createdAt', 'DESC']], // Más reciente primero
        limit,
        offset
      });

      res.json({
        success: true,
        data:    rows,
        pagination: {
          total: count,
          page,
          pages: Math.ceil(count / limit),
          limit
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = auditController;
