/**
 * auditRoutes.js — Rutas del log de auditoría
 *
 * Todas las rutas requieren autenticación JWT y rol admin.
 * El log de auditoría es de solo lectura desde la API.
 */
const express         = require('express');
const router          = express.Router();
const auditController = require('../controllers/auditController');
const { authMiddleware } = require('../middleware/auth');
const allowRoles      = require('../middleware/roles');

// GET /api/audit — Listar historial de acciones (solo admin)
router.get('/', authMiddleware, allowRoles('admin'), auditController.listLogs);

module.exports = router;
