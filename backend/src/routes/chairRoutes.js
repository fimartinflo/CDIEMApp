const express = require('express');
const router = express.Router();
const chairController = require('../controllers/chairController');
const authMiddleware = require('../middleware/auth');
const allowRoles = require('../middleware/roles');

// Todas las rutas de sillones requieren auth + rol clínico
router.use(authMiddleware);
router.use(allowRoles('admin', 'enfermera'));

// Crear sillón (solo admin)
router.post('/', allowRoles('admin'), chairController.createChair);

// Actualizar sillón (admin y enfermera pueden actualizar)
router.put('/:id', chairController.updateChair);

// Eliminar sillón (borrado lógico, solo admin)
router.delete('/:id', allowRoles('admin'), chairController.deleteChair);

// Reiniciar sillón a disponible (solo admin)
router.post('/:id/reset', allowRoles('admin'), chairController.resetChair);

module.exports = router;
