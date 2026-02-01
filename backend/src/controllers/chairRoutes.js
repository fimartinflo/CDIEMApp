const express = require('express');
const router = express.Router();
const chairController = require('../controllers/chairController');
const { authMiddleware } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas CRUD básicas
router.get('/', chairController.getAllChairs);
router.get('/:id', chairController.getChairHistory);
router.post('/', chairController.createChair);
router.put('/:id', chairController.updateChair);
router.delete('/:id', chairController.deleteChair);

// Rutas específicas
router.post('/:id/assign', chairController.assignPatient);
router.post('/:id/release', chairController.releaseChair);

module.exports = router;