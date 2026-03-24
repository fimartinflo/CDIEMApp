const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authMiddleware } = require('../middleware/auth');

// Todas las rutas de inventario requieren autenticación
router.use(authMiddleware);

// IMPORTANTE: rutas específicas antes de rutas con parámetros
router.get('/alerts', inventoryController.getAlerts);
router.get('/', inventoryController.getAllItems);
router.get('/:id', inventoryController.getItemById);
router.post('/', inventoryController.createItem);
// /:id/quantity antes de /:id para evitar conflicto
router.put('/:id/quantity', inventoryController.updateQuantity);
router.put('/:id', inventoryController.updateItem);
router.delete('/:id', inventoryController.deleteItem);

module.exports = router;
