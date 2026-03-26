const express = require('express');
const router = express.Router();
const chairController = require('../controllers/chairController');
const authMiddleware = require('../middleware/auth');
const allowRoles = require('../middleware/roles');

// Todas las rutas de sillones requieren auth + rol clínico
router.use(authMiddleware);
router.use(allowRoles('admin', 'enfermera'));

// Crear sillón (admin y enfermera)
router.post('/', chairController.createChair);

// Actualizar sillón (admin y enfermera)
router.put('/:id', chairController.updateChair);

// Eliminar sillón — borrado lógico (admin y enfermera)
// El registro del sillón se mantiene en BD para que los informes históricos sigan funcionando
router.delete('/:id', chairController.deleteChair);

// Reiniciar sillón a disponible (admin y enfermera)
router.post('/:id/reset', chairController.resetChair);

module.exports = router;
