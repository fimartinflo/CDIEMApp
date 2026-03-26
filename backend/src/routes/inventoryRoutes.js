const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authMiddleware } = require('../middleware/auth');
const allowRoles = require('../middleware/roles');

// Todas las rutas requieren auth + al menos rol clínico
router.use(authMiddleware);
router.use(allowRoles('admin', 'enfermera'));

// Lectura: admin y enfermera
router.get('/alerts', inventoryController.getAlerts);
router.get('/', inventoryController.getAllItems);
router.get('/:id', inventoryController.getItemById);

// Escritura: solo admin
router.post('/', allowRoles('admin'), inventoryController.createItem);
router.put('/:id/quantity', allowRoles('admin'), inventoryController.updateQuantity);
router.put('/:id', allowRoles('admin'), inventoryController.updateItem);
router.delete('/:id', allowRoles('admin'), inventoryController.deleteItem);

module.exports = router;
