const express = require('express');
const router = express.Router();
const chairController = require('../controllers/chairController');
const authMiddleware = require('../middleware/auth');
const allowRoles = require('../middleware/roles');

// Todas las rutas de sillones requieren autenticación
router.use(authMiddleware);

// Crear sillón (solo admin)
router.post('/', allowRoles('admin'), chairController.createChair);

// Actualizar sillón
router.put('/:id', chairController.updateChair);

// Eliminar sillón (borrado lógico, solo admin)
router.delete('/:id', allowRoles('admin'), chairController.deleteChair);

// Reiniciar sillón a disponible (solo admin)
router.post('/:id/reset', allowRoles('admin'), chairController.resetChair);

module.exports = router;
