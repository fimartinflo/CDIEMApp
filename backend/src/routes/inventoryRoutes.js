const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authMiddleware } = require('../middleware/auth');
const allowRoles = require('../middleware/roles');

// Requieren auth + rol clínico (admin o enfermera)
router.use(authMiddleware);
router.use(allowRoles('admin', 'enfermera'));

// IMPORTANTE: rutas específicas antes de rutas con parámetros
router.get('/alerts', inventoryController.getAlerts);
router.get('/', inventoryController.getAllItems);
router.get('/:id', inventoryController.getItemById);
router.post('/', inventoryController.createItem);
router.put('/:id/quantity', inventoryController.updateQuantity);
router.put('/:id', inventoryController.updateItem);
router.delete('/:id', inventoryController.deleteItem);

module.exports = router;
